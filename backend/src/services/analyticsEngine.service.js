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
        const isV2 = rec.channel !== undefined && String(rec.channel).trim() !== '';
        const isV1 = !isV2 && rec.identifier !== undefined;

        if (isV1) {
          v1Count++;
          // Preserve V1 documents in MongoDB for historical purposes only; ignore for live V2 calculations
          continue;
        }

        if (!isV2) {
          ignoredCount++;
          continue;
        }

        v2Count++;
        const channelName = String(rec.channel).toUpperCase();

        this.channelStats.set(channelName, {
          channel: channelName,
          totalSignalsProcessed: rec.totalSignalsProcessed || 0,
          totalTp1Hits: rec.totalTp1Hits || 0,
          totalTp1Dollars: rec.totalTp1Dollars || 0.0,
          totalTp2Hits: rec.totalTp2Hits || 0,
          totalTp2Dollars: rec.totalTp2Dollars || 0.0,
          totalTp3Hits: rec.totalTp3Hits || 0,
          totalTp3Dollars: rec.totalTp3Dollars || 0.0,
          totalFullTpHits: rec.totalFullTpHits || 0,
          totalFullTpDollars: rec.totalFullTpDollars || 0.0,
          totalSl8Hits: rec.totalSl8Hits || 0,
          totalSl8Dollars: rec.totalSl8Dollars || 0.0,
          totalSl10Hits: rec.totalSl10Hits || 0,
          totalSl10Dollars: rec.totalSl10Dollars || 0.0,
          totalSl12Hits: rec.totalSl12Hits || 0,
          totalSl12Dollars: rec.totalSl12Dollars || 0.0,
          totalOriginalSlHits: rec.totalOriginalSlHits || 0,
          totalOriginalSlDollars: rec.totalOriginalSlDollars || 0.0,
          lastUpdated: rec.lastUpdated ? new Date(rec.lastUpdated).toISOString() : new Date().toISOString(),
        });
      }

      for (const rec of pairRecords) {
        if (rec.pair) {
          this.pairStats.set(rec.pair, {
            pair: rec.pair,
            totalSignalsProcessed: rec.totalSignalsProcessed || 0,
            totalTp1Hits: rec.totalTp1Hits || 0,
            totalTp1Dollars: rec.totalTp1Dollars || 0.0,
            totalTp2Hits: rec.totalTp2Hits || 0,
            totalTp2Dollars: rec.totalTp2Dollars || 0.0,
            totalTp3Hits: rec.totalTp3Hits || 0,
            totalTp3Dollars: rec.totalTp3Dollars || 0.0,
            totalFullTpHits: rec.totalFullTpHits || 0,
            totalFullTpDollars: rec.totalFullTpDollars || 0.0,
            totalSl8Hits: rec.totalSl8Hits || 0,
            totalSl8Dollars: rec.totalSl8Dollars || 0.0,
            totalSl10Hits: rec.totalSl10Hits || 0,
            totalSl10Dollars: rec.totalSl10Dollars || 0.0,
            totalSl12Hits: rec.totalSl12Hits || 0,
            totalSl12Dollars: rec.totalSl12Dollars || 0.0,
            totalOriginalSlHits: rec.totalOriginalSlHits || 0,
            totalOriginalSlDollars: rec.totalOriginalSlDollars || 0.0,
            lastUpdated: rec.lastUpdated ? new Date(rec.lastUpdated).toISOString() : new Date().toISOString(),
          });
        }
      }

      logger.info(`[AnalyticsEngine] Hydration Audit: ${v2Count} V2 active docs loaded, ${v1Count} V1 legacy docs detected & preserved, ${ignoredCount} docs ignored.`);
    } catch (err) {
      logger.error('[AnalyticsEngine] Failed to hydrate analytics from MongoDB:', err);
    }
  }

  /**
   * Register a New Unique Active Signal Ingested
   */
  recordNewSignal(channelName, pairName = 'XAUUSD') {
    const chanKey = String(channelName).toUpperCase();
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

    for (const chanRec of this.channelStats.values()) {
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

    return {
      serverStatus: 'online',
      uptime: `${uptimeSec}s`,
      channelsTracked: this.channelStats.size,
      pairsTracked: 1, // XAUUSD permanently
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

    const limit = parseInt(query.limit, 10) || 50;

    return {
      channels: list.slice(0, limit),
      pagination: {
        total: list.length,
        limit,
      },
    };
  }
}

module.exports = new AnalyticsEngineService();
