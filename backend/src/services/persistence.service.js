const logger = require('../utils/logger');
const ChannelAnalytics = require('../models/channelAnalytics.model');
const PairAnalytics = require('../models/pairAnalytics.model');
const MonitoringSession = require('../models/monitoringSession.model');

class PersistenceService {
  /**
   * Startup Hydration: Load ChannelAnalytics & PairAnalytics from MongoDB
   */
  async hydrateAnalytics() {
    logger.info('[PersistenceService] Reading channel & pair analytics from MongoDB...');
    try {
      const channelRecords = await ChannelAnalytics.find().lean();
      const pairRecords = await PairAnalytics.find().lean();

      return {
        channelRecords,
        pairRecords,
      };
    } catch (err) {
      logger.error('[PersistenceService] Error loading records from MongoDB:', err.message);
      return { channelRecords: [], pairRecords: [] };
    }
  }

  /**
   * Flush Pending Channel & Pair Records to MongoDB via Atomic Bulk Write
   */
  async flushDirtyRecords(channelRecords = [], pairRecords = []) {
    let flushedChannels = 0;
    let flushedPairs = 0;

    try {
      if (channelRecords.length > 0) {
        const channelOps = channelRecords.map((rec) => ({
          updateOne: {
            filter: { channel: rec.channel },
            update: { $set: rec },
            upsert: true,
          },
        }));

        const chanResult = await ChannelAnalytics.bulkWrite(channelOps);
        flushedChannels = chanResult.upsertedCount + chanResult.modifiedCount;
      }

      if (pairRecords.length > 0) {
        const pairOps = pairRecords.map((rec) => ({
          updateOne: {
            filter: { pair: rec.pair },
            update: { $set: rec },
            upsert: true,
          },
        }));

        const pairResult = await PairAnalytics.bulkWrite(pairOps);
        flushedPairs = pairResult.upsertedCount + pairResult.modifiedCount;
      }

      logger.debug(`[PersistenceService] Atomic bulkWrite completed: ${flushedChannels} channels, ${flushedPairs} pairs flushed.`);
      return { flushedChannels, flushedPairs };
    } catch (err) {
      logger.error('[PersistenceService] Atomic bulkWrite flush ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Flush Pending Dirty Monitoring Sessions to MongoDB via Atomic Bulk Write
   */
  async flushDirtySessions(sessionRecords = []) {
    if (!sessionRecords || sessionRecords.length === 0) return { flushedSessions: 0 };

    try {
      const sessionOps = sessionRecords.map((sess) => ({
        updateOne: {
          filter: { sessionId: sess.sessionId },
          update: { $set: sess },
          upsert: true,
        },
      }));

      const result = await MonitoringSession.bulkWrite(sessionOps);
      const flushedSessions = result.upsertedCount + result.modifiedCount;
      logger.debug(`[PersistenceService] Flushed ${flushedSessions} dirty monitoring sessions to MongoDB.`);
      return { flushedSessions };
    } catch (err) {
      logger.error('[PersistenceService] Session bulkWrite flush ERROR:', err.message);
      throw err;
    }
  }
}

module.exports = new PersistenceService();
