const logger = require('../utils/logger');
const { calculateDerivedStopLosses } = require('../utils/pipCalculator');

class ActiveSignalManager {
  constructor() {
    // Watermark: Ignore any signals created prior to application startup
    this.bootTimestamp = Date.now();
    
    // Primary in-memory store for currently active signals: Map<signalId, ActiveSignal>
    this.activeSignals = new Map();
    
    // Processed registry set for O(1) deduplication check across all received signals
    this.processedSignalIds = new Set();

    logger.info(`[ActiveSignalManager] Initialized with boot watermark: ${new Date(this.bootTimestamp).toISOString()}`);
  }

  /**
   * Process a raw signal payload from FX Desk Pro.
   * Checks watermark filtering, deduplication, and calculates derived SL values.
   */
  processRawSignal(rawSignal) {
    if (!rawSignal || !rawSignal.id) {
      return { success: false, reason: 'invalid_signal_payload' };
    }

    const signalId = String(rawSignal.id);
    const signalCreatedAtMs = new Date(rawSignal.createdAt || Date.now()).getTime();

    // 1. Watermark Check: Ignore historical signals created before server start
    if (signalCreatedAtMs < this.bootTimestamp) {
      logger.debug(`[ActiveSignalManager] Ignored historical signal ${signalId} (created ${new Date(signalCreatedAtMs).toISOString()})`);
      return { success: false, reason: 'historical_signal_ignored', signalId };
    }

    // 2. Deduplication Check: Prevent processing identical signal twice
    if (this.processedSignalIds.has(signalId)) {
      logger.debug(`[ActiveSignalManager] Ignored duplicate signal ${signalId}`);
      return { success: false, reason: 'duplicate_signal_ignored', signalId };
    }

    // 3. Compute Derived Stop Loss levels
    const pair = String(rawSignal.pair || rawSignal.symbol || '').toUpperCase();
    const direction = String(rawSignal.direction || rawSignal.type || '').toUpperCase();
    const entryPrice = parseFloat(rawSignal.entryPrice || rawSignal.entry);
    const originalSl = parseFloat(rawSignal.originalSl || rawSignal.sl);

    const { derivedSl8, derivedSl10, derivedSl12 } = calculateDerivedStopLosses(
      pair,
      direction,
      entryPrice
    );

    const tp1 = parseFloat(rawSignal.tp1 || 0);
    const tp2 = parseFloat(rawSignal.tp2 || 0);
    const tp3 = parseFloat(rawSignal.tp3 || 0);
    const fullTp = parseFloat(rawSignal.fullTp || tp3 || tp2 || tp1);

    // 4. Construct lightweight ActiveSignal state object
    const activeSignal = {
      signalId,
      channel: String(rawSignal.channel || 'UNKNOWN').toUpperCase(),
      pair,
      direction,
      entryPrice,
      tp1,
      tp2,
      tp3,
      fullTp,
      originalSl,
      derivedSl8,
      derivedSl10,
      derivedSl12,
      hitFlags: {
        tp1Hit: false,
        tp2Hit: false,
        tp3Hit: false,
        slHit: false,
        derivedSl8Hit: false,
        derivedSl10Hit: false,
        derivedSl12Hit: false,
      },
      createdAt: new Date(signalCreatedAtMs).toISOString(),
      receivedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    // 5. Save to active signal Map & mark as processed
    this.activeSignals.set(signalId, activeSignal);
    this.processedSignalIds.add(signalId);

    logger.info(`[ActiveSignalManager] Successfully registered active signal ${signalId} (${pair} ${direction} @ ${entryPrice})`);

    return { success: true, signal: activeSignal };
  }

  /**
   * Get list of all currently active signals.
   */
  getActiveSignals() {
    return Array.from(this.activeSignals.values());
  }

  /**
   * Retrieve a specific active signal by ID.
   */
  getSignalById(signalId) {
    return this.activeSignals.get(String(signalId)) || null;
  }

  /**
   * Remove an active signal from memory (design preparation for completion).
   */
  removeActiveSignal(signalId) {
    const id = String(signalId);
    const exists = this.activeSignals.has(id);
    if (exists) {
      this.activeSignals.delete(id);
      logger.info(`[ActiveSignalManager] Removed active signal ${id} from memory`);
    }
    return exists;
  }

  /**
   * Get count of active signals currently in memory.
   */
  getActiveCount() {
    return this.activeSignals.size;
  }
}

module.exports = new ActiveSignalManager();
