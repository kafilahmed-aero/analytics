const logger = require('../utils/logger');
const analyticsEvents = require('../events/analyticsEvents');
const priceFeedHealthMonitor = require('./priceFeedHealth.service');

class TickDispatcher {
  constructor() {
    this.lastProcessedSequence = 0;
    this.lastTickTime = null;
    this.totalTicksProcessed = 0;
    this.supportedSymbol = 'XAUUSD';
    
    // Lazy requirement to avoid circular dependency
    this.monitoringEngine = null;
  }

  setMonitoringEngine(engine) {
    this.monitoringEngine = engine;
  }

  /**
   * Validate & Dispatch Price Tick
   */
  processTick(rawTick) {
    if (!rawTick) {
      return { success: false, reason: 'null_tick_payload' };
    }

    const symbol = String(rawTick.symbol || '').toUpperCase();
    const price = parseFloat(rawTick.price || rawTick.mid || rawTick.bid || rawTick.ask);
    const sequence = parseInt(rawTick.sequence || Date.now(), 10);
    const timestamp = rawTick.timestamp || new Date().toISOString();

    // 1. Schema Validation (XAUUSD-Only)
    if (symbol !== this.supportedSymbol) {
      return { success: false, reason: 'unsupported_symbol_ignored', symbol };
    }

    if (isNaN(price) || price <= 0) {
      logger.warn(`[TickDispatcher] Dropped invalid price tick for ${symbol}: price=${rawTick.price}`);
      return { success: false, reason: 'invalid_price' };
    }

    // 2. Monotonic Sequence Ordering Check
    if (sequence <= this.lastProcessedSequence && this.lastProcessedSequence > 0) {
      logger.debug(`[TickDispatcher] Dropped out-of-order sequence tick ${sequence} (last was ${this.lastProcessedSequence})`);
      return { success: false, reason: 'out_of_order_sequence', sequence };
    }

    const normalizedTick = {
      symbol: this.supportedSymbol,
      price,
      sequence,
      timestamp,
    };

    // 3. Update Health Monitor
    const marketTimestamp = rawTick.marketTimestamp || rawTick.marketTime || null;
    priceFeedHealthMonitor.recordTick(timestamp, marketTimestamp, price);
    this.lastProcessedSequence = sequence;
    this.lastTickTime = timestamp;
    this.totalTicksProcessed++;

    // 4. Dispatch Normalized Tick to Milestone Monitoring Engine
    if (this.monitoringEngine) {
      this.monitoringEngine.evaluatePriceTick(normalizedTick);
    }

    // 5. Emit Event
    analyticsEvents.emit('TICK_DISPATCHED', normalizedTick);

    return { success: true, tick: normalizedTick };
  }
}

module.exports = new TickDispatcher();
