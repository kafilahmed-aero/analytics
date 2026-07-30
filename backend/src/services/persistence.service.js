const ChannelAnalytics = require('../models/channelAnalytics.model');
const PairAnalytics = require('../models/pairAnalytics.model');
const logger = require('../utils/logger');

class PersistenceService {
  /**
   * Hydrate in-memory maps from MongoDB collections on server startup.
   */
  async hydrateAnalytics() {
    try {
      const channels = await ChannelAnalytics.find().lean();
      const pairs = await PairAnalytics.find().lean();

      const channelMap = new Map();
      const pairMap = new Map();

      for (const doc of channels) {
        channelMap.set(doc.identifier, {
          identifier: doc.identifier,
          totalSignals: doc.totalSignals || 0,
          tp1Hits: doc.tp1Hits || 0,
          tp2Hits: doc.tp2Hits || 0,
          tp3Hits: doc.tp3Hits || 0,
          fullTpHits: doc.fullTpHits || 0,
          originalSlHits: doc.originalSlHits || 0,
          sl8Hits: doc.sl8Hits || 0,
          sl10Hits: doc.sl10Hits || 0,
          sl12Hits: doc.sl12Hits || 0,
          lastUpdated: doc.lastUpdated ? doc.lastUpdated.toISOString() : new Date().toISOString(),
        });
      }

      for (const doc of pairs) {
        pairMap.set(doc.identifier, {
          identifier: doc.identifier,
          totalSignals: doc.totalSignals || 0,
          tp1Hits: doc.tp1Hits || 0,
          tp2Hits: doc.tp2Hits || 0,
          tp3Hits: doc.tp3Hits || 0,
          fullTpHits: doc.fullTpHits || 0,
          originalSlHits: doc.originalSlHits || 0,
          sl8Hits: doc.sl8Hits || 0,
          sl10Hits: doc.sl10Hits || 0,
          sl12Hits: doc.sl12Hits || 0,
          lastUpdated: doc.lastUpdated ? doc.lastUpdated.toISOString() : new Date().toISOString(),
        });
      }

      logger.info(`[PersistenceService] Successfully hydrated ${channelMap.size} channels and ${pairMap.size} pairs from MongoDB`);
      return { channelMap, pairMap };
    } catch (error) {
      logger.error(`[PersistenceService] Startup hydration error: ${error.message}`);
      return { channelMap: new Map(), pairMap: new Map() };
    }
  }

  /**
   * Flush only dirty records to MongoDB using efficient upsert operations.
   */
  async flushDirtyRecords(dirtyChannelItems = [], dirtyPairItems = []) {
    if (dirtyChannelItems.length === 0 && dirtyPairItems.length === 0) {
      return { flushedChannels: 0, flushedPairs: 0 };
    }

    try {
      const channelPromises = dirtyChannelItems.map((item) =>
        ChannelAnalytics.findOneAndUpdate(
          { identifier: item.identifier },
          { $set: item },
          { upsert: true, new: true }
        )
      );

      const pairPromises = dirtyPairItems.map((item) =>
        PairAnalytics.findOneAndUpdate(
          { identifier: item.identifier },
          { $set: item },
          { upsert: true, new: true }
        )
      );

      await Promise.all([...channelPromises, ...pairPromises]);

      logger.info(`[PersistenceService] Flushed dirty records to database (${dirtyChannelItems.length} channels, ${dirtyPairItems.length} pairs)`);
      return {
        flushedChannels: dirtyChannelItems.length,
        flushedPairs: dirtyPairItems.length,
      };
    } catch (error) {
      logger.error(`[PersistenceService] Flush error: ${error.message}`);
      return { flushedChannels: 0, flushedPairs: 0, error: error.message };
    }
  }
}

module.exports = new PersistenceService();
