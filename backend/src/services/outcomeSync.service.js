const logger = require('../utils/logger');

/**
 * DEPRECATED IN ANALYTICS V2 PHASE 1
 * OutcomeSyncService is retained only for backward compatibility references.
 * Analytics V2 operates an Independent Monitoring Session Engine and does not poll completed outcomes.
 */
class OutcomeSyncService {
  constructor() {
    this.lastCursor = '';
    this.processedKeys = new Set();
  }

  setLastCursor(cursor) {
    this.lastCursor = cursor;
  }

  getLastCursor() {
    return this.lastCursor;
  }

  start() {
    logger.info('[OutcomeSyncService] DEPRECATED: Outcome sync loop is disabled in Analytics V2.');
  }

  stop() {
    logger.info('[OutcomeSyncService] DEPRECATED: Outcome sync loop stopped.');
  }

  async syncOutcomes() {
    // No-op in Analytics V2
    return;
  }
}

module.exports = new OutcomeSyncService();
