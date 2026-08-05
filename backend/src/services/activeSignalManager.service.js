const logger = require('../utils/logger');
const analyticsEvents = require('../events/analyticsEvents');
const analyticsEngine = require('./analyticsEngine.service');
const sessionPersistence = require('./sessionPersistence.service');
const { normalizeSignal } = require('./signalNormalizer.service');
const { calculateDerivedStopLosses, calculatePipDistance } = require('../utils/pipCalculator');

// Analytics V2 is permanently XAUUSD-only
const SUPPORTED_PAIR = 'XAUUSD';

// Allowed FSM State Transition Matrix
const ALLOWED_FSM_TRANSITIONS = {
  CREATED: new Set(['VALIDATED']),
  VALIDATED: new Set(['REGISTERED']),
  REGISTERED: new Set(['HYDRATED', 'WAITING_PRICE']),
  HYDRATED: new Set(['WAITING_PRICE']),
  WAITING_PRICE: new Set(['MONITORING']),
  MONITORING: new Set(['COMPLETED_FULL_TP', 'COMPLETED_ORIGINAL_SL', 'CANCELLED', 'EXPIRED']),
  COMPLETED_FULL_TP: new Set(['EVICTED']),
  COMPLETED_ORIGINAL_SL: new Set(['EVICTED']),
  CANCELLED: new Set(['EVICTED']),
  EXPIRED: new Set(['EVICTED']),
  EVICTED: new Set([]),
};

class SessionRegistry {
  constructor() {
    this.bootTimestamp = Date.now();

    // Primary In-Memory Store: Map<sessionId, MonitoringSession>
    this.sessions = new Map();

    // Fast O(1) Lookup Index Maps
    this.signalIdIndex = new Map();   // Map<signalId, sessionId>
    this.messageKeyIndex = new Map();  // Map<messageKey, sessionId>
    this.pairIndex = new Map();        // Map<pair, Set<sessionId>> (XAUUSD only)
    this.channelIndex = new Map();     // Map<channel, Set<sessionId>>

    this.processedKeys = new Set();
    this.hydrationComplete = false;

    logger.info(`[SessionRegistry] Initialized XAUUSD-Only Registry with boot watermark: ${new Date(this.bootTimestamp).toISOString()}`);
  }

  generateSessionId(signalId) {
    return `SESS_${signalId}`;
  }

  canTransition(currentStatus, targetStatus) {
    const allowedTargets = ALLOWED_FSM_TRANSITIONS[currentStatus];
    return allowedTargets ? allowedTargets.has(targetStatus) : false;
  }

  buildTpQueue(rawTps = []) {
    const validTps = rawTps.map((tp) => parseFloat(tp)).filter((tp) => !isNaN(tp) && tp > 0);
    if (validTps.length === 0) return [];

    let selectedTps = [];
    if (validTps.length >= 5) {
      // 5 TP rule: TP1, TP2, TP3, and the last TP in target list is monitored as Full TP (TP4 is NEVER monitored)
      const lastIdx = validTps.length - 1;
      selectedTps = [
        { level: 1, price: validTps[0], isFullTp: false },
        { level: 2, price: validTps[1], isFullTp: false },
        { level: 3, price: validTps[2], isFullTp: false },
        { level: validTps.length, price: validTps[lastIdx], isFullTp: true },
      ];
    } else {
      const capped = validTps.slice(0, 4);
      const lastIdx = capped.length - 1;
      selectedTps = capped.map((price, idx) => ({
        level: idx + 1,
        price,
        isFullTp: idx === lastIdx,
      }));
    }

    return selectedTps;
  }

  buildAdaptiveSlQueue(direction, entryPrice, originalSl) {
    const entry = parseFloat(entryPrice);
    const origSl = parseFloat(originalSl);

    if (isNaN(entry) || isNaN(origSl) || entry <= 0 || origSl <= 0) {
      return [];
    }

    const origSlPipDistance = calculatePipDistance(entry, origSl);
    const { derivedSl8, derivedSl10, derivedSl12 } = calculateDerivedStopLosses(direction, entry);

    const queue = [];

    if (origSlPipDistance >= 8 && derivedSl8 > 0) {
      queue.push({ name: 'SL8', price: derivedSl8, pipDistance: 8, isTerminal: false });
    }
    if (origSlPipDistance >= 10 && derivedSl10 > 0) {
      queue.push({ name: 'SL10', price: derivedSl10, pipDistance: 10, isTerminal: false });
    }
    if (origSlPipDistance >= 12 && derivedSl12 > 0) {
      queue.push({ name: 'SL12', price: derivedSl12, pipDistance: 12, isTerminal: false });
    }

    queue.push({
      name: 'ORIGINAL_SL',
      price: origSl,
      pipDistance: Math.round(origSlPipDistance),
      isTerminal: true,
    });

    return queue;
  }

  processRawSignal(rawSignal) {
    // SessionRegistry operates on canonical signals (normalizes raw inputs)
    const signal = normalizeSignal(rawSignal);
    if (!signal || !signal.id) {
      logger.warn('[SessionRegistry] Validation Stage 1 Failed: Malformed payload (missing id)');
      return { success: false, reason: 'malformed_payload' };
    }

    const signalId = String(signal.id);
    const pair = String(signal.pair || '').toUpperCase();
    const direction = String(signal.direction || '').toUpperCase();
    const entryPrice = parseFloat(signal.entryPrice);
    const originalSl = parseFloat(signal.originalSl);

    if (!pair || !direction || isNaN(entryPrice) || isNaN(originalSl) || originalSl <= 0 || !Array.isArray(signal.targets) || signal.targets.length === 0) {
      logger.warn(`[SessionRegistry] Validation Stage 1 Failed: Missing required trading fields, TP targets, or SL on signal ${signalId}`);
      return { success: false, reason: 'missing_tp_or_sl', signalId };
    }

    if (pair !== SUPPORTED_PAIR) {
      logger.warn(`[SessionRegistry] Validation Stage 2 Failed: Non-XAUUSD pair [${pair}] rejected on signal ${signalId}`);
      return { success: false, reason: 'unsupported_pair_non_xauusd', signalId };
    }

    const sessionId = this.generateSessionId(signalId);
    const channel = String(signal.channel || 'UNKNOWN').toUpperCase();
    const messageId = signal.messageId || signalId;
    const messageKey = `${channel}:${messageId}`;

    if (this.signalIdIndex.has(signalId) || this.messageKeyIndex.has(messageKey) || this.processedKeys.has(sessionId)) {
      logger.debug(`[SessionRegistry] Validation Stage 3 Ignored: Duplicate signal ${signalId}`);
      return { success: false, reason: 'duplicate_signal_ignored', signalId };
    }

    const status = String(signal.status || '').toUpperCase();
    const signalCreatedAtMs = new Date(signal.createdAt || Date.now()).getTime();

    // FX Desk Pro is single source of truth for ACTIVE signals.
    // If status = ACTIVE, accept or restore monitoring because it is an ACTIVE production signal.
    // Historical CLOSED/TP/SL signals created before boot watermark are rejected.
    const isActiveSignal = status === 'ACTIVE';
    const isHistorical = signalCreatedAtMs < this.bootTimestamp;

    if (isHistorical && !isActiveSignal) {
      logger.debug(`[SessionRegistry] Validation Stage 4 Ignored: Historical closed signal ${signalId}`);
      return { success: false, reason: 'historical_signal_ignored', signalId };
    }

    const rawTps = [];
    rawTps.push(...(signal.targets || []));

    const tpQueue = this.buildTpQueue(rawTps);
    const slQueue = this.buildAdaptiveSlQueue(direction, entryPrice, originalSl);

    if (tpQueue.length === 0 || slQueue.length === 0) {
      logger.warn(`[SessionRegistry] Validation Stage 5 Failed: Could not construct valid TP/SL queues for signal ${signalId}`);
      return { success: false, reason: 'invalid_tp_sl_queue', signalId };
    }

    const fixedLotSize = parseFloat(signal.fixedLotSize || 0.01);

    const session = {
      sessionId,
      signalId,
      messageKey,
      pair: SUPPORTED_PAIR,
      channel,
      direction,
      entryPrice,
      fixedLotSize: isNaN(fixedLotSize) || fixedLotSize <= 0 ? 0.01 : fixedLotSize,

      originalTpList: rawTps.map((t) => parseFloat(t)),
      tpQueue,
      activeTpPointer: 0,

      slQueue,
      activeSlPointer: 0,

      status: 'REGISTERED',

      // Recorded Flags to prevent duplicate milestone recording
      recordedFlags: {
        tp1Recorded: false,
        tp2Recorded: false,
        tp3Recorded: false,
        fullTpRecorded: false,
        sl8Recorded: false,
        sl10Recorded: false,
        sl12Recorded: false,
        originalSlRecorded: false,
      },

      // Independent Milestone Dollar Values
      milestoneDollars: {
        tp1Dollar: 0.0,
        tp2Dollar: 0.0,
        tp3Dollar: 0.0,
        fullTpDollar: 0.0,
        sl8Dollar: 0.0,
        sl10Dollar: 0.0,
        sl12Dollar: 0.0,
        originalSlDollar: 0.0,
      },

      milestoneHistory: [],
      createdAt: new Date(signalCreatedAtMs).toISOString(),
      receivedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastTickPrice: null,

      isDirty: true,
      isHydrated: false,
    };

    this.sessions.set(sessionId, session);
    this.signalIdIndex.set(signalId, sessionId);
    this.messageKeyIndex.set(messageKey, sessionId);

    if (!this.pairIndex.has(SUPPORTED_PAIR)) this.pairIndex.set(SUPPORTED_PAIR, new Set());
    this.pairIndex.get(SUPPORTED_PAIR).add(sessionId);

    if (!this.channelIndex.has(channel)) this.channelIndex.set(channel, new Set());
    this.channelIndex.get(channel).add(sessionId);

    this.processedKeys.add(sessionId);

    session.status = 'WAITING_PRICE';

    // Increment totalSignalsProcessed ONLY when a unique new session is successfully instantiated
    analyticsEngine.recordNewSignal(channel, SUPPORTED_PAIR);
    sessionPersistence.markDirty(session);

    logger.info(`[SessionRegistry] Instantiated XAUUSD MonitoringSession ${sessionId} (${direction} @ ${entryPrice}, LotSize: ${session.fixedLotSize})`);

    analyticsEvents.emit('SESSION_CREATED', {
      sessionId,
      signalId,
      channel,
      pair: SUPPORTED_PAIR,
      direction,
      entryPrice,
    });

    this.checkMemoryThresholds();

    return { success: true, session };
  }

  handleSignalUpdate(updatePayload) {
    if (!updatePayload || !updatePayload.signalId) {
      return { success: false, reason: 'invalid_update_payload' };
    }

    const signalId = String(updatePayload.signalId);
    const sessionId = this.signalIdIndex.get(signalId);

    if (!sessionId || !this.sessions.has(sessionId)) {
      return { success: false, reason: 'session_not_found', signalId };
    }

    const session = this.sessions.get(sessionId);

    if (updatePayload.isCancelled || updatePayload.status === 'CANCELLED') {
      if (this.canTransition(session.status, 'CANCELLED')) {
        session.status = 'CANCELLED';
        session.isDirty = true;
        session.lastUpdated = new Date().toISOString();

        analyticsEvents.emit('SESSION_CANCELLED', {
          sessionId,
          signalId,
          channel: session.channel,
          cancelledAt: session.lastUpdated,
        });

        logger.info(`[SessionRegistry] Session ${sessionId} marked CANCELLED upstream`);
        return { success: true, action: 'cancelled', session };
      }
    }

    if (updatePayload.direction && updatePayload.direction.toUpperCase() !== session.direction) {
      logger.warn(`[SessionRegistry] Direction change attempt forbidden on session ${sessionId}. Marking CANCELLED.`);
      session.status = 'CANCELLED';
      session.isDirty = true;
      session.lastUpdated = new Date().toISOString();
      return { success: false, reason: 'direction_change_forbidden', session };
    }

    if (updatePayload.entryPrice && parseFloat(updatePayload.entryPrice) !== session.entryPrice) {
      session.entryPrice = parseFloat(updatePayload.entryPrice);
      session.isDirty = true;
      logger.info(`[SessionRegistry] Updated entry price for session ${sessionId} to ${session.entryPrice}`);
    }

    if (updatePayload.tps && Array.isArray(updatePayload.tps)) {
      const newTpQueue = this.buildTpQueue(updatePayload.tps);
      if (newTpQueue.length > 0) {
        const hitTps = session.tpQueue.slice(0, session.activeTpPointer);
        const futureTps = newTpQueue.slice(session.activeTpPointer);
        session.tpQueue = [...hitTps, ...futureTps];

        if (session.tpQueue.length > 0) {
          session.tpQueue.forEach((item, idx) => {
            item.isFullTp = idx === session.tpQueue.length - 1;
          });
        }
        session.isDirty = true;
        logger.info(`[SessionRegistry] Rebuilt TP queue for session ${sessionId}`);
      }
    }

    if (updatePayload.originalSl && parseFloat(updatePayload.originalSl) !== session.slQueue[session.slQueue.length - 1]?.price) {
      const newSlQueue = this.buildAdaptiveSlQueue(session.direction, session.entryPrice, updatePayload.originalSl);
      if (newSlQueue.length > 0) {
        session.slQueue = newSlQueue;
        if (session.activeSlPointer >= session.slQueue.length) {
          session.activeSlPointer = session.slQueue.length - 1;
        }
        session.isDirty = true;
        logger.info(`[SessionRegistry] Rebuilt Adaptive SL queue for session ${sessionId}`);
      }
    }

    session.lastUpdated = new Date().toISOString();

    analyticsEvents.emit('SESSION_UPDATED', {
      sessionId,
      signalId,
      updateType: updatePayload.updateType || 'general',
      updatedFields: updatePayload,
    });

    return { success: true, session };
  }

  registerHydratedSession(sessionData) {
    if (!sessionData || !sessionData.sessionId) return;
    const { sessionId, signalId, messageKey, channel } = sessionData;

    sessionData.pair = SUPPORTED_PAIR;
    sessionData.isHydrated = true;
    sessionData.isDirty = false;
    sessionData.status = 'HYDRATED';

    if (!sessionData.recordedFlags) {
      sessionData.recordedFlags = {
        tp1Recorded: false,
        tp2Recorded: false,
        tp3Recorded: false,
        fullTpRecorded: false,
        sl8Recorded: false,
        sl10Recorded: false,
        sl12Recorded: false,
        originalSlRecorded: false,
      };
    }

    if (!sessionData.milestoneDollars) {
      sessionData.milestoneDollars = {
        tp1Dollar: 0.0,
        tp2Dollar: 0.0,
        tp3Dollar: 0.0,
        fullTpDollar: 0.0,
        sl8Dollar: 0.0,
        sl10Dollar: 0.0,
        sl12Dollar: 0.0,
        originalSlDollar: 0.0,
      };
    }

    this.sessions.set(sessionId, sessionData);
    this.signalIdIndex.set(signalId, sessionId);
    this.messageKeyIndex.set(messageKey, sessionId);

    if (!this.pairIndex.has(SUPPORTED_PAIR)) this.pairIndex.set(SUPPORTED_PAIR, new Set());
    this.pairIndex.get(SUPPORTED_PAIR).add(sessionId);

    if (!this.channelIndex.has(channel)) this.channelIndex.set(channel, new Set());
    this.channelIndex.get(channel).add(sessionId);

    this.processedKeys.add(sessionId);

    sessionData.status = 'WAITING_PRICE';
  }

  getSessionById(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getSessionBySignalId(signalId) {
    const sessionId = this.signalIdIndex.get(String(signalId));
    return sessionId ? this.sessions.get(sessionId) || null : null;
  }

  getXauusdSessions() {
    const set = this.pairIndex.get(SUPPORTED_PAIR);
    if (!set) return [];
    return Array.from(set).map((id) => this.sessions.get(id)).filter(Boolean);
  }

  getSessionsByChannel(channel) {
    const safeChannel = String(channel).toUpperCase();
    const set = this.channelIndex.get(safeChannel);
    if (!set) return [];
    return Array.from(set).map((id) => this.sessions.get(id)).filter(Boolean);
  }

  getAllActiveSessions() {
    return Array.from(this.sessions.values());
  }

  getActiveSignals() {
    return this.getAllActiveSessions();
  }

  getActiveCount() {
    return this.sessions.size;
  }

  evictSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.status !== 'COMPLETED_FULL_TP' && session.status !== 'COMPLETED_ORIGINAL_SL') {
      session.status = 'EVICTED';
    }
    session.lastUpdated = new Date().toISOString();
    session.isDirty = true;
    sessionPersistence.markDirty(session);
    const { signalId, messageKey, channel } = session;

    this.sessions.delete(sessionId);
    this.signalIdIndex.delete(signalId);
    this.messageKeyIndex.delete(messageKey);

    if (this.pairIndex.has(SUPPORTED_PAIR)) {
      this.pairIndex.get(SUPPORTED_PAIR).delete(sessionId);
    }

    if (this.channelIndex.has(channel)) {
      this.channelIndex.get(channel).delete(sessionId);
      if (this.channelIndex.get(channel).size === 0) this.channelIndex.delete(channel);
    }

    logger.info(`[SessionRegistry] Evicted XAUUSD session ${sessionId} from active memory`);

    analyticsEvents.emit('SESSION_EVICTED', { sessionId, evictedAt: new Date().toISOString() });
    return true;
  }

  registerPersistedSessions(sessionDocs = []) {
    sessionDocs.forEach((doc) => {
      if (doc && doc.sessionId) this.processedKeys.add(doc.sessionId);
    });
  }

  checkMemoryThresholds() {
    const activeCount = this.sessions.size;

    if (activeCount > 2000) {
      logger.error(`[SessionRegistry] ALARM CRITICAL: Active XAUUSD sessions (${activeCount}) > 2000 limit. Triggering emergency eviction!`);
      this.evictTerminalSessions();
    } else if (activeCount > 1500) {
      logger.warn(`[SessionRegistry] ALARM WARNING: Active XAUUSD sessions (${activeCount}) exceeded 1500 threshold.`);
    }
  }

  evictTerminalSessions() {
    let evictedCount = 0;
    const terminalStatuses = new Set(['COMPLETED_FULL_TP', 'COMPLETED_ORIGINAL_SL', 'CANCELLED', 'EXPIRED', 'EVICTED']);

    for (const [sessionId, session] of this.sessions.entries()) {
      if (terminalStatuses.has(session.status) && !session.isDirty) {
        this.evictSession(sessionId);
        evictedCount++;
      }
    }

    logger.info(`[SessionRegistry] Emergency LRU Eviction freed ${evictedCount} terminal XAUUSD sessions from memory`);
  }
}

module.exports = new SessionRegistry();
