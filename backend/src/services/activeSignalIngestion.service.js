const fxDeskProService = require('./fxdeskpro.service');
const sessionRegistry = require('./activeSignalManager.service');
const analyticsEngine = require('./analyticsEngine.service');
const logger = require('../utils/logger');

class ActiveSignalIngestionService {
  constructor() {
    this.pollIntervalMs = 15000; // 15 seconds
    this.pollTimer = null;
    this.isPolling = false;
  }

  /**
   * Start periodic active signal polling bridge from FX Desk Pro.
   */
  start() {
    if (this.pollTimer) return;
    logger.info('[ActiveSignalIngestion] Starting active signal polling bridge (15s interval)...');

    // Trigger initial poll pass
    this.pollActiveSignals();

    this.pollTimer = setInterval(() => {
      this.pollActiveSignals();
    }, this.pollIntervalMs);
  }

  /**
   * Stop active signal polling bridge.
   */
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      logger.info('[ActiveSignalIngestion] Stopped active signal polling bridge.');
    }
  }

  /**
   * Execute one active signal polling pass.
   */
  async pollActiveSignals() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const response = await fxDeskProService.fetchActiveSignals();
      const payload = response.data || response || {};
      const signals = payload.signals || payload.data || (Array.isArray(payload) ? payload : []);

      if (Array.isArray(signals) && signals.length > 0) {
        let ingestedCount = 0;

        for (const sig of signals) {
          const pair = String(sig.pair || sig.symbol || '').toUpperCase();
          if (pair !== 'XAUUSD') continue; // XAUUSD-only constraint

          const res = sessionRegistry.processRawSignal(sig);
          if (res.success) {
            analyticsEngine.recordNewSignal(sig.channel, 'XAUUSD');
            ingestedCount++;
          }
        }

        if (ingestedCount > 0) {
          logger.info(`[ActiveSignalIngestion] Ingested ${ingestedCount} new XAUUSD active signals from FX Desk Pro.`);
        }
      }
    } catch (err) {
      logger.warn(`[ActiveSignalIngestion] Polling pass skipped or failed: ${err.message}`);
    } finally {
      this.isPolling = false;
    }
  }
}

module.exports = new ActiveSignalIngestionService();
