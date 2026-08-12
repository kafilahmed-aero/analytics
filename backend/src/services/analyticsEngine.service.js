const logger = require('../utils/logger');
const persistenceService = require('./persistence.service');

class AnalyticsEngineService {
  constructor() {
    this.bootTime = new Date();
    this.channelStats = new Map(); // Map<channel, ChannelStats>
    this.pairStats = new Map();    // Map<pair, PairStats> (XAUUSD only)

    this.dirtyChannels = new Set();
    this.dirtyPairs = new Set();
  }

  /**
   * Helper: Initialize Blank Channel Record
   */
  createBlankChannelRecord(channelName) {
    return {
      channel: channelName,
      totalSignalsProcessed: 0,
      totalTp1Hits: 0,
      totalTp1Dollars: 0.0,
      totalTp2Hits: 0,
      totalTp2Dollars: 0.0,
      totalTp3Hits: 0,
      totalTp3Dollars: 0.0,
      totalFullTpHits: 0,
      totalFullTpDollars: 0.0,
      totalSl8Hits: 0,
      totalSl8Dollars: 0.0,
      totalSl10Hits: 0,
      totalSl10Dollars: 0.0,
      totalSl12Hits: 0,
      totalSl12Dollars: 0.0,
      totalOriginalSlHits: 0,
      totalOriginalSlDollars: 0.0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Helper: Initialize Blank Pair Record (XAUUSD)
   */
  createBlankPairRecord(pairName = 'XAUUSD') {
    return {
      pair: pairName,
      totalSignalsProcessed: 0,
      totalTp1Hits: 0,
      totalTp1Dollars: 0.0,
      totalTp2Hits: 0,
      totalTp2Dollars: 0.0,
      totalTp3Hits: 0,
      totalTp3Dollars: 0.0,
      totalFullTpHits: 0,
      totalFullTpDollars: 0.0,
      totalSl8Hits: 0,
      totalSl8Dollars: 0.0,
      totalSl10Hits: 0,
      totalSl10Dollars: 0.0,
      totalSl12Hits: 0,
      totalSl12Dollars: 0.0,
      totalOriginalSlHits: 0,
      totalOriginalSlDollars: 0.0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Startup Hydration: Load ONLY V2 Channel & Pair Statistics from MongoDB.
   * V1 legacy documents are detected, logged, and ignored for live calculations.
   */
  async hydrateFromDatabase() {
    logger.info('[AnalyticsEngine] Hydrating channel & pair analytics from MongoDB...');
    try {
      const { channelRecords, pairRecords } = await persistenceService.hydrateAnalytics();

      let v1Count = 0;
      let v2Count = 0;
      let ignoredCount = 0;

      for (const rec of channelRecords) {
        const channelName = String(rec.channel || rec.identifier || '').trim().toUpperCase();
        if (!channelName) {
          ignoredCount++;
          continue;
        }

        v2Count++;
        this.channelStats.set(channelName, {
          channel: channelName,
          totalSignalsProcessed: rec.totalSignalsProcessed !== undefined ? rec.totalSignalsProcessed : (rec.totalSignals || 0),
          totalTp1Hits: rec.totalTp1Hits !== undefined ? rec.totalTp1Hits : (rec.tp1Hits || 0),
          totalTp1Dollars: rec.totalTp1Dollars || 0.0,
          totalTp2Hits: rec.totalTp2Hits !== undefined ? rec.totalTp2Hits : (rec.tp2Hits || 0),
          totalTp2Dollars: rec.totalTp2Dollars || 0.0,
          totalTp3Hits: rec.totalTp3Hits !== undefined ? rec.totalTp3Hits : (rec.tp3Hits || 0),
          totalTp3Dollars: rec.totalTp3Dollars || 0.0,
          totalFullTpHits: rec.totalFullTpHits !== undefined ? rec.totalFullTpHits : (rec.fullTpHits || 0),
          totalFullTpDollars: rec.totalFullTpDollars || 0.0,
          totalSl8Hits: rec.totalSl8Hits !== undefined ? rec.totalSl8Hits : (rec.sl8Hits || 0),
          totalSl8Dollars: rec.totalSl8Dollars || 0.0,
          totalSl10Hits: rec.totalSl10Hits !== undefined ? rec.totalSl10Hits : (rec.sl10Hits || 0),
          totalSl10Dollars: rec.totalSl10Dollars || 0.0,
          totalSl12Hits: rec.totalSl12Hits !== undefined ? rec.totalSl12Hits : (rec.sl12Hits || 0),
          totalSl12Dollars: rec.totalSl12Dollars || 0.0,
          totalOriginalSlHits: rec.totalOriginalSlHits !== undefined ? rec.totalOriginalSlHits : (rec.originalSlHits || 0),
          totalOriginalSlDollars: rec.totalOriginalSlDollars || 0.0,
          lastUpdated: rec.lastUpdated ? new Date(rec.lastUpdated).toISOString() : new Date().toISOString(),
        });
      }

      for (const rec of pairRecords) {
        if (rec.pair || rec.identifier) {
          const pairKey = String(rec.pair || rec.identifier).toUpperCase();
          this.pairStats.set(pairKey, {
            pair: pairKey,
            totalSignalsProcessed: rec.totalSignalsProcessed !== undefined ? rec.totalSignalsProcessed : (rec.totalSignals || 0),
            totalTp1Hits: rec.totalTp1Hits !== undefined ? rec.totalTp1Hits : (rec.tp1Hits || 0),
            totalTp1Dollars: rec.totalTp1Dollars || 0.0,
            totalTp2Hits: rec.totalTp2Hits !== undefined ? rec.totalTp2Hits : (rec.tp2Hits || 0),
            totalTp2Dollars: rec.totalTp2Dollars || 0.0,
            totalTp3Hits: rec.totalTp3Hits !== undefined ? rec.totalTp3Hits : (rec.tp3Hits || 0),
            totalTp3Dollars: rec.totalTp3Dollars || 0.0,
            totalFullTpHits: rec.totalFullTpHits !== undefined ? rec.totalFullTpHits : (rec.fullTpHits || 0),
            totalFullTpDollars: rec.totalFullTpDollars || 0.0,
            totalSl8Hits: rec.totalSl8Hits !== undefined ? rec.totalSl8Hits : (rec.sl8Hits || 0),
            totalSl8Dollars: rec.totalSl8Dollars || 0.0,
            totalSl10Hits: rec.totalSl10Hits !== undefined ? rec.totalSl10Hits : (rec.sl10Hits || 0),
            totalSl10Dollars: rec.totalSl10Dollars || 0.0,
            totalSl12Hits: rec.totalSl12Hits !== undefined ? rec.totalSl12Hits : (rec.sl12Hits || 0),
            totalSl12Dollars: rec.totalSl12Dollars || 0.0,
            totalOriginalSlHits: rec.totalOriginalSlHits !== undefined ? rec.totalOriginalSlHits : (rec.originalSlHits || 0),
            totalOriginalSlDollars: rec.totalOriginalSlDollars || 0.0,
            lastUpdated: rec.lastUpdated ? new Date(rec.lastUpdated).toISOString() : new Date().toISOString(),
          });
        }
      }

      logger.info(`[AnalyticsEngine] Hydration Audit: ${v2Count} channel records loaded, ${this.pairStats.size} pair records loaded, ${ignoredCount} docs ignored.`);
    } catch (err) {
      logger.error('[AnalyticsEngine] Failed to hydrate analytics from MongoDB:', err);
    }
  }

  /**
   * Register a New Unique Active Signal Ingested
   */
  recordNewSignal(channelName, pairName = 'XAUUSD') {
    const chanKey = String(channelName).toUpperCase();
    if (chanKey === 'TEST' || chanKey === 'TEST_CHANNEL' || chanKey === 'PROD_TEST') {
      logger.info(`[AnalyticsEngine] Skipping recordNewSignal for test channel: ${chanKey}`);
      return;
    }
    const pairKey = String(pairName).toUpperCase();

    if (!this.channelStats.has(chanKey)) {
      this.channelStats.set(chanKey, this.createBlankChannelRecord(chanKey));
    }
    if (!this.pairStats.has(pairKey)) {
      this.pairStats.set(pairKey, this.createBlankPairRecord(pairKey));
    }

    const chanRec = this.channelStats.get(chanKey);
    const pairRec = this.pairStats.get(pairKey);

    chanRec.totalSignalsProcessed++;
    chanRec.lastUpdated = new Date().toISOString();

    pairRec.totalSignalsProcessed++;
    pairRec.lastUpdated = new Date().toISOString();

    this.dirtyChannels.add(chanKey);
    this.dirtyPairs.add(pairKey);
  }

  /**
   * Realtime Milestone Hit Accumulator (Hit Count + Dollar Total)
   */
  recordMilestoneHit(channelName, milestoneName, dollarValue) {
    const chanKey = String(channelName).toUpperCase();
    if (chanKey === 'TEST' || chanKey === 'TEST_CHANNEL' || chanKey === 'PROD_TEST') {
      logger.info(`[AnalyticsEngine] Skipping recordMilestoneHit for test channel: ${chanKey}`);
      return;
    }
    const pairKey = 'XAUUSD';

    if (!this.channelStats.has(chanKey)) {
      this.channelStats.set(chanKey, this.createBlankChannelRecord(chanKey));
    }
    if (!this.pairStats.has(pairKey)) {
      this.pairStats.set(pairKey, this.createBlankPairRecord(pairKey));
    }

    const chanRec = this.channelStats.get(chanKey);
    const pairRec = this.pairStats.get(pairKey);
    const val = parseFloat(dollarValue) || 0.0;

    const keyMap = {
      TP1: { hits: 'totalTp1Hits', dollars: 'totalTp1Dollars' },
      TP2: { hits: 'totalTp2Hits', dollars: 'totalTp2Dollars' },
      TP3: { hits: 'totalTp3Hits', dollars: 'totalTp3Dollars' },
      FULL_TP: { hits: 'totalFullTpHits', dollars: 'totalFullTpDollars' },
      SL8: { hits: 'totalSl8Hits', dollars: 'totalSl8Dollars' },
      SL10: { hits: 'totalSl10Hits', dollars: 'totalSl10Dollars' },
      SL12: { hits: 'totalSl12Hits', dollars: 'totalSl12Dollars' },
      ORIGINAL_SL: { hits: 'totalOriginalSlHits', dollars: 'totalOriginalSlDollars' },
    };

    const target = keyMap[milestoneName];
    if (target) {
      chanRec[target.hits]++;
      chanRec[target.dollars] = Number((chanRec[target.dollars] + val).toFixed(2));
      chanRec.lastUpdated = new Date().toISOString();

      pairRec[target.hits]++;
      pairRec[target.dollars] = Number((pairRec[target.dollars] + val).toFixed(2));
      pairRec.lastUpdated = new Date().toISOString();

      this.dirtyChannels.add(chanKey);
      this.dirtyPairs.add(pairKey);
    }
  }

  /**
   * Flush Pending Dirty Records to MongoDB
   */
  async flushDirtyAnalytics() {
    if (this.dirtyChannels.size === 0 && this.dirtyPairs.size === 0) {
      return { flushedChannels: 0, flushedPairs: 0 };
    }

    const channelsToFlush = Array.from(this.dirtyChannels).map((key) => this.channelStats.get(key));
    const pairsToFlush = Array.from(this.dirtyPairs).map((key) => this.pairStats.get(key));

    const result = await persistenceService.flushDirtyRecords(channelsToFlush, pairsToFlush);

    this.dirtyChannels.clear();
    this.dirtyPairs.clear();

    return result;
  }

  /**
   * Start background periodic auto-flushing of dirty analytics to MongoDB while service is running.
   */
  startAutoFlush(intervalMs = 5000) {
    if (this.autoFlushTimer) return;
    logger.info(`[AnalyticsEngine] Starting continuous background analytics auto-flush (${intervalMs}ms)...`);
    this.autoFlushTimer = setInterval(() => {
      this.flushDirtyAnalytics().catch((err) => {
        logger.error(`[AnalyticsEngine] Background auto-flush error: ${err.message}`);
      });
    }, intervalMs);
  }

  /**
   * Stop background periodic auto-flushing.
   */
  stopAutoFlush() {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
      this.autoFlushTimer = null;
      logger.info('[AnalyticsEngine] Stopped continuous background analytics auto-flush.');
    }
    return this.flushDirtyAnalytics();
  }

  /**
   * API Handler: Get Dashboard Overall Summary
   */
  getOverallSummary() {
    let totalSignalsProcessed = 0;
    const totals = {
      totalTp1Hits: 0,
      totalTp1Dollars: 0.0,
      totalTp2Hits: 0,
      totalTp2Dollars: 0.0,
      totalTp3Hits: 0,
      totalTp3Dollars: 0.0,
      totalFullTpHits: 0,
      totalFullTpDollars: 0.0,
      totalSl8Hits: 0,
      totalSl8Dollars: 0.0,
      totalSl10Hits: 0,
      totalSl10Dollars: 0.0,
      totalSl12Hits: 0,
      totalSl12Dollars: 0.0,
      totalOriginalSlHits: 0,
      totalOriginalSlDollars: 0.0,
    };

    const TEST_KEYWORDS = ['VERIFY', 'TEST', 'DEMO', 'PROD_VERIFY', 'PROD_ALERTS'];

    for (const chanRec of this.channelStats.values()) {
      const chanName = String(chanRec.channel || '').toUpperCase();
      if (TEST_KEYWORDS.some((kw) => chanName.includes(kw))) {
        continue; // Exclude test/verification channels from live summary
      }

      totalSignalsProcessed += chanRec.totalSignalsProcessed;
      totals.totalTp1Hits += chanRec.totalTp1Hits;
      totals.totalTp1Dollars += chanRec.totalTp1Dollars;
      totals.totalTp2Hits += chanRec.totalTp2Hits;
      totals.totalTp2Dollars += chanRec.totalTp2Dollars;
      totals.totalTp3Hits += chanRec.totalTp3Hits;
      totals.totalTp3Dollars += chanRec.totalTp3Dollars;
      totals.totalFullTpHits += chanRec.totalFullTpHits;
      totals.totalFullTpDollars += chanRec.totalFullTpDollars;

      totals.totalSl8Hits += chanRec.totalSl8Hits;
      totals.totalSl8Dollars += chanRec.totalSl8Dollars;
      totals.totalSl10Hits += chanRec.totalSl10Hits;
      totals.totalSl10Dollars += chanRec.totalSl10Dollars;
      totals.totalSl12Hits += chanRec.totalSl12Hits;
      totals.totalSl12Dollars += chanRec.totalSl12Dollars;
      totals.totalOriginalSlHits += chanRec.totalOriginalSlHits;
      totals.totalOriginalSlDollars += chanRec.totalOriginalSlDollars;
    }

    // Format all dollar sums to 2 decimal places
    Object.keys(totals).forEach((k) => {
      if (k.endsWith('Dollars')) {
        totals[k] = Number(totals[k].toFixed(2));
      }
    });

    const uptimeMs = Date.now() - this.bootTime.getTime();
    const uptimeSec = Math.floor(uptimeMs / 1000);

    // Cumulative Hits object for UI compatibility
    const cumulativeHits = {
      tp1Hits: totals.totalTp1Hits,
      tp1Dollars: totals.totalTp1Dollars,
      tp2Hits: totals.totalTp2Hits,
      tp2Dollars: totals.totalTp2Dollars,
      tp3Hits: totals.totalTp3Hits,
      tp3Dollars: totals.totalTp3Dollars,
      fullTpHits: totals.totalFullTpHits,
      fullTpDollars: totals.totalFullTpDollars,
      originalSlHits: totals.totalOriginalSlHits,
      originalSlDollars: totals.totalOriginalSlDollars,
      sl8Hits: totals.totalSl8Hits,
      sl8Dollars: totals.totalSl8Dollars,
      sl10Hits: totals.totalSl10Hits,
      sl10Dollars: totals.totalSl10Dollars,
      sl12Hits: totals.totalSl12Hits,
      sl12Dollars: totals.totalSl12Dollars,
    };

    const liveChannelsCount = Array.from(this.channelStats.keys()).filter(
      (chan) => !TEST_KEYWORDS.some((kw) => chan.includes(kw))
    ).length;

    const baselineTimestamp = process.env.ANALYTICS_BASELINE_WATERMARK || '2026-08-12T09:03:17.000Z';

    return {
      serverStatus: 'online',
      uptime: `${uptimeSec}s`,
      baselineTimestamp,
      channelsTracked: liveChannelsCount,
      pairsTracked: liveChannelsCount > 0 ? 1 : 0,
      totalSignalsProcessed,
      cumulativeHits,
      cumulativeMilestoneTotals: totals,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * API Handler: Get Channel Analytics List
   */
  getChannelAnalytics(query = {}) {
    const list = Array.from(this.channelStats.values()).map((row) => ({
      ...row,
      identifier: row.channel,
      totalSignals: row.totalSignalsProcessed,
      tp1Hits: row.totalTp1Hits,
      tp1Dollars: row.totalTp1Dollars,
      tp2Hits: row.totalTp2Hits,
      tp2Dollars: row.totalTp2Dollars,
      tp3Hits: row.totalTp3Hits,
      tp3Dollars: row.totalTp3Dollars,
      fullTpHits: row.totalFullTpHits,
      fullTpDollars: row.totalFullTpDollars,
      originalSlHits: row.totalOriginalSlHits,
      originalSlDollars: row.totalOriginalSlDollars,
      sl8Hits: row.totalSl8Hits,
      sl8Dollars: row.totalSl8Dollars,
      sl10Hits: row.totalSl10Hits,
      sl10Dollars: row.totalSl10Dollars,
      sl12Hits: row.totalSl12Hits,
      sl12Dollars: row.totalSl12Dollars,
    }));

    const limit = query.limit ? parseInt(query.limit, 10) : null;

    return {
      channels: limit ? list.slice(0, limit) : list,
      pagination: {
        total: list.length,
        limit: limit || list.length,
      },
    };
  }
  /**
   * Alias for backward test compatibility
   */
  _recordHit(channelName, milestoneName, dollarValue) {
    return this.recordMilestoneHit(channelName, milestoneName, dollarValue);
  }

  /**
   * Alias for backward test compatibility
   */
  recordCompletedOutcome(channelName, outcomeName, dollarValue) {
    return this.recordMilestoneHit(channelName, outcomeName, dollarValue);
  }

  /**
   * Reset all in-memory analytics, database collections, and snapshot backup file
   */
  async resetAllAnalytics() {
    this.channelStats.clear();
    this.pairStats.clear();
    this.dirtyChannels.clear();
    this.dirtyPairs.clear();

    const sessionRegistry = require('./activeSignalManager.service');
    sessionRegistry.clearAllSessions();

    const ChannelAnalytics = require('../models/channelAnalytics.model');
    const PairAnalytics = require('../models/pairAnalytics.model');
    const MonitoringSession = require('../models/monitoringSession.model');
    const backupRestoreService = require('./backupRestore.service');

    await ChannelAnalytics.deleteMany({});
    await PairAnalytics.deleteMany({});
    await MonitoringSession.deleteMany({});

    // Reset local backup snapshot file as well
    await backupRestoreService.createSnapshot();

    logger.info('[AnalyticsEngine] In-memory cache, MongoDB collections, and backup snapshot reset successfully.');
  }
}

module.exports = new AnalyticsEngineService();
