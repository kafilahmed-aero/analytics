const logger = require('../utils/logger');
const sessionRegistry = require('./activeSignalManager.service');
const dollarLedgerService = require('./dollarLedger.service');
const analyticsEngine = require('./analyticsEngine.service');
const analyticsEvents = require('../events/analyticsEvents');
const tickDispatcher = require('./tickDispatcher.service');
const sessionPersistence = require('./sessionPersistence.service');

class MilestoneMonitoringEngine {
  constructor() {
    tickDispatcher.setMonitoringEngine(this);
  }

  /**
   * Evaluate a normalized live price tick against active XAUUSD sessions.
   * - Single Active TP Pointer (Sequential Progression)
   * - Independent SL Milestone Evaluation (Price-Level Driven, Non-Sequential)
   */
  evaluatePriceTick(priceTick) {
    if (!priceTick || isNaN(priceTick.price) || priceTick.price <= 0) {
      return { evaluatedCount: 0, tpCount: 0, slCount: 0, completedCount: 0 };
    }

    const price = parseFloat(priceTick.price);
    const timestamp = priceTick.timestamp || new Date().toISOString();
    const activeSessions = sessionRegistry.getXauusdSessions();

    if (activeSessions.length === 0) {
      return { evaluatedCount: 0, tpCount: 0, slCount: 0, completedCount: 0 };
    }

    let evaluatedCount = 0;
    let tpCount = 0;
    let slCount = 0;
    let completedCount = 0;

    for (const session of activeSessions) {
      if (session.status !== 'WAITING_PRICE' && session.status !== 'MONITORING') {
        continue;
      }

      if (session.status === 'WAITING_PRICE') {
        session.status = 'MONITORING';
        session.isDirty = true;
        sessionPersistence.markDirty(session);
      }
      
      session.lastTickPrice = price;
      evaluatedCount++;

      const isBuy = session.direction === 'BUY';

      // 1. EVALUATE SINGLE ACTIVE TP POINTER (Sequential TP Progression)
      const currentTp = session.tpQueue[session.activeTpPointer];
      if (currentTp) {
        const tpMatures = isBuy ? price >= currentTp.price : price <= currentTp.price;
        if (tpMatures) {
          this.processTpHit(session, currentTp, price, timestamp);
          tpCount++;
        }
      }

      // If session completed on Full TP terminal state, skip SL check for this tick
      if (session.status === 'COMPLETED_FULL_TP') {
        completedCount++;
        continue;
      }

      // 2. EVALUATE INDEPENDENT SL MILESTONES (Price-Level Driven, Non-Sequential)
      // Filter unrecorded SL milestones for this session
      const unrecordedSls = session.slQueue.filter((sl) => {
        const flagKey = sl.name === 'SL8' ? 'sl8Recorded' :
                        sl.name === 'SL10' ? 'sl10Recorded' :
                        sl.name === 'SL12' ? 'sl12Recorded' : 'originalSlRecorded';
        return !session.recordedFlags[flagKey];
      });

      // Sort unrecorded SL milestones in order of proximity to entry price (closest evaluated first)
      unrecordedSls.sort((a, b) => {
        return isBuy ? b.price - a.price : a.price - b.price;
      });

      for (const sl of unrecordedSls) {
        const slMatures = isBuy ? price <= sl.price : price >= sl.price;
        if (slMatures) {
          this.processSlHit(session, sl, price, timestamp);
          slCount++;

          if (session.status === 'COMPLETED_ORIGINAL_SL') {
            completedCount++;
            break; // Terminal condition: Original SL touched, stop further evaluation for this session
          }
        }
      }
    }

    return {
      evaluatedCount,
      tpCount,
      slCount,
      completedCount,
    };
  }

  /**
   * Process TP Milestone Hit
   */
  processTpHit(session, tp, hitPrice, timestamp) {
    const level = tp.level;
    const flagKey = level === 1 ? 'tp1Recorded' : level === 2 ? 'tp2Recorded' : level === 3 ? 'tp3Recorded' : 'fullTpRecorded';

    // Deduplication check: Prevent duplicate recording of already processed milestone
    if (session.recordedFlags[flagKey]) {
      if (tp.isFullTp && session.status !== 'COMPLETED_FULL_TP') {
        session.status = 'COMPLETED_FULL_TP';
        sessionRegistry.evictSession(session.sessionId);
      } else {
        session.activeTpPointer++;
      }
      return;
    }

    // Calculate Raw Milestone Dollar Value ($)
    const dollarVal = dollarLedgerService.calculateMilestoneDollar(
      session.entryPrice,
      tp.price,
      session.fixedLotSize
    );

    // Record Milestone Dollar in Session
    const dollarKey = level === 1 ? 'tp1Dollar' : level === 2 ? 'tp2Dollar' : level === 3 ? 'tp3Dollar' : 'fullTpDollar';
    session.milestoneDollars[dollarKey] = dollarVal;
    if (tp.isFullTp) {
      session.milestoneDollars.fullTpDollar = dollarVal;
      session.recordedFlags.fullTpRecorded = true;
    }
    session.recordedFlags[flagKey] = true;

    // Append Complete Immutable Audit Record
    const milestoneName = tp.isFullTp ? 'FULL_TP' : `TP${level}`;
    session.milestoneHistory.push({
      milestone: milestoneName,
      price: hitPrice,
      dollarValue: dollarVal,
      timestamp,
      direction: session.direction,
      signalId: session.signalId,
      channel: session.channel,
    });

    session.isDirty = true;
    session.lastUpdated = timestamp;

    logger.info(`[MonitoringEngine] Session ${session.sessionId} recorded ${milestoneName} @ ${hitPrice} ($${dollarVal})`);

    // Accumulate Milestone in Realtime Analytics Aggregator
    analyticsEngine.recordMilestoneHit(session.channel, milestoneName, dollarVal);

    // Emit Event
    analyticsEvents.emit('TP_POINTER_MOVED', {
      sessionId: session.sessionId,
      signalId: session.signalId,
      channel: session.channel,
      milestone: milestoneName,
      dollarValue: dollarVal,
      isFullTp: tp.isFullTp,
    });

    if (tp.isFullTp) {
      // TERMINAL CONDITION 1: Full TP Hit
      session.status = 'COMPLETED_FULL_TP';
      logger.info(`[MonitoringEngine] Session ${session.sessionId} reached Full TP terminal condition.`);

      analyticsEvents.emit('SESSION_COMPLETED', {
        sessionId: session.sessionId,
        signalId: session.signalId,
        channel: session.channel,
        terminalStatus: 'COMPLETED_FULL_TP',
      });

      sessionRegistry.evictSession(session.sessionId);
    } else {
      // Advance Active TP Pointer ONLY
      session.activeTpPointer++;
    }
  }

  /**
   * Process SL Milestone Hit (Independent Milestone Model)
   */
  processSlHit(session, sl, hitPrice, timestamp) {
    const slName = sl.name;
    const flagKey = slName === 'SL8' ? 'sl8Recorded' : slName === 'SL10' ? 'sl10Recorded' : slName === 'SL12' ? 'sl12Recorded' : 'originalSlRecorded';

    // Deduplication check: Prevent duplicate recording of already processed milestone
    if (session.recordedFlags[flagKey]) {
      if (sl.isTerminal && session.status !== 'COMPLETED_ORIGINAL_SL') {
        session.status = 'COMPLETED_ORIGINAL_SL';
        sessionRegistry.evictSession(session.sessionId);
      }
      return;
    }

    // Calculate Raw Milestone Dollar Value ($)
    const dollarVal = dollarLedgerService.calculateMilestoneDollar(
      session.entryPrice,
      sl.price,
      session.fixedLotSize
    );

    // Record Milestone Dollar in Session
    const dollarKey = slName === 'SL8' ? 'sl8Dollar' : slName === 'SL10' ? 'sl10Dollar' : slName === 'SL12' ? 'sl12Dollar' : 'originalSlDollar';
    session.milestoneDollars[dollarKey] = dollarVal;
    session.recordedFlags[flagKey] = true;

    // Append Complete Immutable Audit Record
    session.milestoneHistory.push({
      milestone: slName,
      price: hitPrice,
      dollarValue: dollarVal,
      timestamp,
      direction: session.direction,
      signalId: session.signalId,
      channel: session.channel,
    });

    session.isDirty = true;
    session.lastUpdated = timestamp;

    logger.info(`[MonitoringEngine] Session ${session.sessionId} recorded ${slName} @ ${hitPrice} ($${dollarVal})`);

    // Accumulate Milestone in Realtime Analytics Aggregator
    analyticsEngine.recordMilestoneHit(session.channel, slName, dollarVal);

    // Emit Event
    analyticsEvents.emit('SL_POINTER_MOVED', {
      sessionId: session.sessionId,
      signalId: session.signalId,
      channel: session.channel,
      milestone: slName,
      dollarValue: dollarVal,
      isTerminal: sl.isTerminal,
    });

    if (sl.isTerminal) {
      // TERMINAL CONDITION 2: Original SL Hit
      session.status = 'COMPLETED_ORIGINAL_SL';
      logger.info(`[MonitoringEngine] Session ${session.sessionId} reached Original SL terminal condition.`);

      analyticsEvents.emit('SESSION_COMPLETED', {
        sessionId: session.sessionId,
        signalId: session.signalId,
        channel: session.channel,
        terminalStatus: 'COMPLETED_ORIGINAL_SL',
      });

      sessionRegistry.evictSession(session.sessionId);
    }
  }

  /**
   * Alias for backward test compatibility
   */
  processPriceTick(tick) {
    return this.evaluatePriceTick(tick);
  }
}

module.exports = new MilestoneMonitoringEngine();
