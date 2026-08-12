const fxDeskProService = require('./fxdeskpro.service');
const sessionRegistry = require('./activeSignalManager.service');
const payloadContractGuard = require('./payloadContractGuard.service');
const { normalizeSignal } = require('./signalNormalizer.service');
const logger = require('../utils/logger');

// Dynamic Baseline Watermark: Default to 2026-08-12 14:44:03 IST (2026-08-12T09:14:03.000Z)
// All signals created from this moment forward will be processed and tracked.
const DEFAULT_WATERMARK = '2026-08-12T09:14:03.000Z';

class ActiveSignalIngestionService {
  constructor() {
    this.pollIntervalMs = 15000; // 15 seconds
    this.pollTimer = null;
    this.isPolling = false;
    this.watermark = new Date(process.env.ANALYTICS_BASELINE_WATERMARK || DEFAULT_WATERMARK);
  }

  setWatermark(newDate = new Date()) {
    this.watermark = new Date(newDate);
    logger.info(`[ActiveSignalIngestion] Baseline watermark updated to: ${this.watermark.toISOString()}`);
  }

  getWatermark() {
    return this.watermark.toISOString();
  }

  /**
   * Start periodic active signal polling bridge from FX Desk Pro.
   */
  start() {
    if (this.pollTimer) return;
    logger.info(`[ActiveSignalIngestion] Starting active signal polling bridge (15s interval, watermark: ${this.watermark.toISOString()})...`);

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
   * Architecture Flow:
   * FX Desk Pro Payload -> Payload Contract Guard -> Signal Normalizer -> Canonical Signal -> SessionRegistry
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
          // 1. Normalize FX Desk Pro payload to Canonical Analytics Signal model
          const canonicalSignal = normalizeSignal(sig);

          // Only accept signals created AFTER the current watermark timestamp
          const signalCreatedAt = canonicalSignal.createdAt ? new Date(canonicalSignal.createdAt) : new Date();
          if (signalCreatedAt < this.watermark) {
            continue;
          }

          // 2. Guard canonical signal against contract mismatches
          const guardResult = payloadContractGuard.validate(canonicalSignal);
          if (!guardResult.valid) {
            logger.error(`[ActiveSignalIngestion] Dropping payload due to contract mismatch: ${guardResult.error}`);
            continue;
          }

          const pair = String(canonicalSignal.pair || '').toUpperCase();
          if (pair !== 'XAUUSD') continue; // XAUUSD-only constraint

          // 3. Hand off canonical signal to SessionRegistry
          const res = sessionRegistry.processRawSignal(canonicalSignal);
          if (res.success) {
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
