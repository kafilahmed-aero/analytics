const logger = require('../utils/logger');
const persistenceService = require('./persistence.service');

class SessionPersistenceService {
  constructor() { this.dirtySessions = new Map(); this.intervalId = null; this.isFlushing = false; }
  markDirty(session) { if (session && session.sessionId) this.dirtySessions.set(session.sessionId, { ...session }); }
  async flush() {
    if (this.isFlushing || this.dirtySessions.size === 0) return { flushedSessions: 0 };
    this.isFlushing = true;
    const records = Array.from(this.dirtySessions.values());
    try {
      const result = await persistenceService.flushDirtySessions(records);
      records.forEach((record) => this.dirtySessions.delete(record.sessionId));
      return result;
    } finally { this.isFlushing = false; }
  }
  start(intervalMs = 2000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.flush().catch((err) => logger.error(`[SessionPersistence] Flush failed: ${err.message}`)), intervalMs);
  }
  stop() { if (this.intervalId) clearInterval(this.intervalId); this.intervalId = null; return this.flush(); }
}

module.exports = new SessionPersistenceService();
