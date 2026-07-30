const fxDeskProService = require('./fxdeskpro.service');
const analyticsEngine = require('./analyticsEngine.service');
const logger = require('../utils/logger');

class OutcomeSyncService {
  constructor() {
    // Opaque cursor token: Analytics NEVER decodes or inspects its structure.
    this.lastCursor = '';
    
    // Set for O(1) deduplication check across incoming completed outcomes
    this.processedKeys = new Set();
    
    this.syncIntervalMs = 15000; // 15 seconds
    this.syncTimer = null;
    this.isSyncing = false;
  }

  /**
   * Start the background outcome synchronization loop.
   */
  start() {
    if (this.syncTimer) return;
    logger.info('[OutcomeSyncService] Starting background completed outcome synchronization loop (15s interval)');
    
    // Trigger initial sync immediately
    this.syncOutcomes();

    this.syncTimer = setInterval(() => {
      this.syncOutcomes();
    }, this.syncIntervalMs);
  }

  /**
   * Stop the background synchronization loop.
   */
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('[OutcomeSyncService] Stopped background outcome sync loop');
    }
  }

  /**
   * Execute one synchronization pass.
   * Requests outcomes from FX Desk Pro passing opaque this.lastCursor,
   * deduplicates, updates AnalyticsEngine, and replaces this.lastCursor with new nextCursor.
   */
  async syncOutcomes() {
    if (this.isSyncing) {
      logger.debug('[OutcomeSyncService] Sync pass already in progress. Skipping cycle.');
      return;
    }

    this.isSyncing = true;

    try {
      const response = await fxDeskProService.fetchCompletedOutcomes(this.lastCursor, 100);
      const payload = response.data || {};
      const outcomes = payload.outcomes || [];
      const nextCursor = payload.nextCursor || '';

      if (outcomes.length > 0) {
        let processedCount = 0;

        for (const outcome of outcomes) {
          const uniqueKey = outcome.messageKey || outcome.signalId || outcome._id;
          if (!uniqueKey) continue;

          // Deduplication Check
          if (this.processedKeys.has(uniqueKey)) {
            continue;
          }

          // Record completed outcome in Analytics Engine
          analyticsEngine.recordCompletedOutcome(outcome);
          this.processedKeys.add(uniqueKey);
          processedCount++;
        }

        logger.info(`[OutcomeSyncService] Processed ${processedCount} new completed outcomes. Updating opaque cursor token.`);
      }

      // Always update opaque cursor if provided by FX Desk Pro
      if (nextCursor) {
        this.lastCursor = nextCursor;
      }
    } catch (err) {
      logger.warn(`[OutcomeSyncService] Sync pass skipped or failed: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }
}

module.exports = new OutcomeSyncService();
