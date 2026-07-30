const analyticsEvents = require('../events/analyticsEvents');
const persistenceService = require('./persistence.service');
const logger = require('../utils/logger');

// Constant reserved for future financial analytics calculations
const FIXED_LOT_SIZE = 0.01;

class AnalyticsEngine {
  constructor() {
    this.FIXED_LOT_SIZE = FIXED_LOT_SIZE;
    
    // In-memory cumulative statistics stores: Map<identifier, CumulativeMetrics> (Live Source of Truth)
    this.channelStats = new Map();
    this.pairStats = new Map();

    // Dirty-state persistence sets tracking unpersisted changed keys
    this.dirtyChannels = new Set();
    this.dirtyPairs = new Set();

    this._initializeListeners();
    logger.info('[AnalyticsEngine] Initialized and subscribed to monitoring events');
  }

  /**
   * Hydrate in-memory maps and syncState lastCursor from MongoDB on application startup.
   */
  async hydrateFromDatabase() {
    const outcomeSyncService = require('./outcomeSync.service');
    const { channelMap, pairMap, lastCursor } = await persistenceService.hydrateAnalytics();
    this.channelStats = channelMap;
    this.pairStats = pairMap;
    this.dirtyChannels.clear();
    this.dirtyPairs.clear();

    if (lastCursor) {
      outcomeSyncService.setLastCursor(lastCursor);
    }

    logger.info(`[AnalyticsEngine] Memory live state hydrated (${this.channelStats.size} channels, ${this.pairStats.size} pairs, lastCursor: "${lastCursor}")`);
  }

  /**
   * Helper factory creating a clean cumulative metrics state object.
   */
  _createEmptyMetrics(identifier) {
    return {
      identifier: String(identifier).toUpperCase(),
      totalSignals: 0,
      tp1Hits: 0,
      tp2Hits: 0,
      tp3Hits: 0,
      fullTpHits: 0,
      originalSlHits: 0,
      sl8Hits: 0,
      sl10Hits: 0,
      sl12Hits: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Retrieve or create a metrics entry for channel/pair.
   */
  _getOrCreateMetrics(store, key) {
    const safeKey = String(key).toUpperCase();
    if (!store.has(safeKey)) {
      store.set(safeKey, this._createEmptyMetrics(safeKey));
    }
    return store.get(safeKey);
  }

  /**
   * Subscribe to events emitted by MonitoringEngine.
   */
  _initializeListeners() {
    // 1. React to individual hit flag updates
    analyticsEvents.on('hit_updated', ({ channel, pair, hitType }) => {
      this._recordHit(channel, pair, hitType);
    });

    // 2. React to signal completion events
    analyticsEvents.on('signal_completed', ({ channel, pair }) => {
      this._recordCompletion(channel, pair);
    });
  }

  /**
   * Record target hit flag update for channel and pair, marking keys as dirty.
   */
  _recordHit(channel, pair, hitType) {
    const timestamp = new Date().toISOString();
    const hitMap = {
      tp1Hit: 'tp1Hits',
      tp2Hit: 'tp2Hits',
      tp3Hit: 'tp3Hits',
      fullTpHit: 'fullTpHits',
      slHit: 'originalSlHits',
      derivedSl8Hit: 'sl8Hits',
      derivedSl10Hit: 'sl10Hits',
      derivedSl12Hit: 'sl12Hits',
    };

    const counterProp = hitMap[hitType];
    if (!counterProp) return;

    if (channel) {
      const safeChannel = String(channel).toUpperCase();
      const channelMetric = this._getOrCreateMetrics(this.channelStats, safeChannel);
      channelMetric[counterProp] += 1;
      if (hitType === 'tp3Hit') {
        channelMetric.fullTpHits += 1;
      }
      channelMetric.lastUpdated = timestamp;
      this.dirtyChannels.add(safeChannel);
    }

    if (pair) {
      const safePair = String(pair).toUpperCase();
      const pairMetric = this._getOrCreateMetrics(this.pairStats, safePair);
      pairMetric[counterProp] += 1;
      if (hitType === 'tp3Hit') {
        pairMetric.fullTpHits += 1;
      }
      pairMetric.lastUpdated = timestamp;
      this.dirtyPairs.add(safePair);
    }

    logger.info(`[AnalyticsEngine] Incremented ${counterProp} for channel [${channel}] and pair [${pair}]`);
  }

  /**
   * Record signal completion for channel and pair, marking keys as dirty.
   */
  _recordCompletion(channel, pair) {
    const timestamp = new Date().toISOString();

    if (channel) {
      const safeChannel = String(channel).toUpperCase();
      const channelMetric = this._getOrCreateMetrics(this.channelStats, safeChannel);
      channelMetric.totalSignals += 1;
      channelMetric.lastUpdated = timestamp;
      this.dirtyChannels.add(safeChannel);
    }

    if (pair) {
      const safePair = String(pair).toUpperCase();
      const pairMetric = this._getOrCreateMetrics(this.pairStats, safePair);
      pairMetric.totalSignals += 1;
      pairMetric.lastUpdated = timestamp;
      this.dirtyPairs.add(safePair);
    }

    logger.info(`[AnalyticsEngine] Incremented totalSignals for channel [${channel}] and pair [${pair}]`);
  }

  /**
   * Record completed signal outcome payload delivered from FX Desk Pro via integration bridge.
   * Updates channel/pair metrics idempotently and marks keys as dirty.
   */
  recordCompletedOutcome(outcome) {
    if (!outcome) return;
    const channel = outcome.channel || outcome.channelName;
    const pair = outcome.pair || outcome.symbol;
    if (!channel) return;

    const timestamp = new Date().toISOString();
    const safeChannel = String(channel).toUpperCase();
    const channelMetric = this._getOrCreateMetrics(this.channelStats, safeChannel);

    channelMetric.totalSignals += 1;

    const targetHits = outcome.targetHits || {};
    if (targetHits.tp1Hit || outcome.tp1Hit || outcome.status === 'PARTIAL_TP' || outcome.status === 'FULL_TP') {
      channelMetric.tp1Hits += 1;
    }
    if (targetHits.tp2Hit || outcome.tp2Hit || outcome.status === 'FULL_TP') {
      channelMetric.tp2Hits += 1;
    }
    if (targetHits.tp3Hit || outcome.tp3Hit || outcome.status === 'FULL_TP') {
      channelMetric.tp3Hits += 1;
      channelMetric.fullTpHits += 1;
    }
    if (targetHits.slHit || outcome.slHit || outcome.status === 'SL_HIT') {
      channelMetric.originalSlHits += 1;
    }
    if (targetHits.derivedSl8Hit || outcome.derivedSl8Hit) {
      channelMetric.sl8Hits += 1;
    }
    if (targetHits.derivedSl10Hit || outcome.derivedSl10Hit) {
      channelMetric.sl10Hits += 1;
    }
    if (targetHits.derivedSl12Hit || outcome.derivedSl12Hit) {
      channelMetric.sl12Hits += 1;
    }

    channelMetric.lastUpdated = timestamp;
    this.dirtyChannels.add(safeChannel);

    if (pair) {
      const safePair = String(pair).toUpperCase();
      const pairMetric = this._getOrCreateMetrics(this.pairStats, safePair);
      pairMetric.totalSignals += 1;
      if (targetHits.tp1Hit || outcome.tp1Hit || outcome.status === 'PARTIAL_TP' || outcome.status === 'FULL_TP') pairMetric.tp1Hits += 1;
      if (targetHits.tp2Hit || outcome.tp2Hit || outcome.status === 'FULL_TP') pairMetric.tp2Hits += 1;
      if (targetHits.tp3Hit || outcome.tp3Hit || outcome.status === 'FULL_TP') {
        pairMetric.tp3Hits += 1;
        pairMetric.fullTpHits += 1;
      }
      if (targetHits.slHit || outcome.slHit || outcome.status === 'SL_HIT') pairMetric.originalSlHits += 1;
      if (targetHits.derivedSl8Hit || outcome.derivedSl8Hit) pairMetric.sl8Hits += 1;
      if (targetHits.derivedSl10Hit || outcome.derivedSl10Hit) pairMetric.sl10Hits += 1;
      if (targetHits.derivedSl12Hit || outcome.derivedSl12Hit) pairMetric.sl12Hits += 1;
      pairMetric.lastUpdated = timestamp;
      this.dirtyPairs.add(safePair);
    }

    logger.info(`[AnalyticsEngine] Recorded completed outcome for channel [${safeChannel}] (status: ${outcome.status})`);
  }

  /**
   * Flush only dirty records to MongoDB using Atomic Dirty-State Persistence Strategy.
   */
  async flushDirtyAnalytics() {
    const outcomeSyncService = require('./outcomeSync.service');
    const currentCursor = outcomeSyncService.getLastCursor();

    if (this.dirtyChannels.size === 0 && this.dirtyPairs.size === 0 && !currentCursor) {
      return { flushedChannels: 0, flushedPairs: 0 };
    }

    const dirtyChannelItems = Array.from(this.dirtyChannels).map((key) => this.channelStats.get(key)).filter(Boolean);
    const dirtyPairItems = Array.from(this.dirtyPairs).map((key) => this.pairStats.get(key)).filter(Boolean);

    const result = await persistenceService.flushDirtyRecords(dirtyChannelItems, dirtyPairItems, currentCursor);

    // Clear dirty sets after successful flush
    this.dirtyChannels.clear();
    this.dirtyPairs.clear();

    return result;
  }

  /**
   * Get all aggregated channel cumulative statistics (from live in-memory source of truth).
   */
  getChannelAnalytics() {
    return Array.from(this.channelStats.values());
  }

  /**
   * Get all aggregated pair cumulative statistics (from live in-memory source of truth).
   */
  getPairAnalytics() {
    return Array.from(this.pairStats.values());
  }

  /**
   * Get overall cumulative summary across channels and pairs.
   */
  getOverallSummary() {
    let totalSignals = 0;
    let totalTp1 = 0;
    let totalTp2 = 0;
    let totalTp3 = 0;
    let totalFullTp = 0;
    let totalOriginalSl = 0;
    let totalSl8 = 0;
    let totalSl10 = 0;
    let totalSl12 = 0;

    for (const stats of this.channelStats.values()) {
      totalSignals += stats.totalSignals;
      totalTp1 += stats.tp1Hits;
      totalTp2 += stats.tp2Hits;
      totalTp3 += stats.tp3Hits;
      totalFullTp += stats.fullTpHits;
      totalOriginalSl += stats.originalSlHits;
      totalSl8 += stats.sl8Hits;
      totalSl10 += stats.sl10Hits;
      totalSl12 += stats.sl12Hits;
    }

    return {
      channelsTracked: this.channelStats.size,
      pairsTracked: this.pairStats.size,
      totalSignalsProcessed: totalSignals,
      cumulativeHits: {
        tp1Hits: totalTp1,
        tp2Hits: totalTp2,
        tp3Hits: totalTp3,
        fullTpHits: totalFullTp,
        originalSlHits: totalOriginalSl,
        sl8Hits: totalSl8,
        sl10Hits: totalSl10,
        sl12Hits: totalSl12,
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = new AnalyticsEngine();
