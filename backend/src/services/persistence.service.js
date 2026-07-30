const mongoose = require('mongoose');
const ChannelAnalytics = require('../models/channelAnalytics.model');
const PairAnalytics = require('../models/pairAnalytics.model');
const SyncState = require('../models/syncState.model');
const logger = require('../utils/logger');

class PersistenceService {
  /**
   * Hydrate in-memory maps and syncState lastCursor from MongoDB on server startup.
   */
  async hydrateAnalytics() {
    try {
      const channels = await ChannelAnalytics.find().lean();
      const pairs = await PairAnalytics.find().lean();
      const syncDoc = await SyncState.findById('sync_metadata').lean();

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

      const lastCursor = syncDoc && syncDoc.lastCursor ? syncDoc.lastCursor : '';

      logger.info(`[PersistenceService] Hydrated ${channelMap.size} channels, ${pairMap.size} pairs, and lastCursor: "${lastCursor}"`);
      return { channelMap, pairMap, lastCursor };
    } catch (error) {
      logger.error(`[PersistenceService] Startup hydration error: ${error.message}`);
      return { channelMap: new Map(), pairMap: new Map(), lastCursor: '' };
    }
  }

  /**
   * Atomically flush dirty channel/pair metrics AND current opaque lastCursor
   * using a single MongoDB ACID Transaction session when available.
   */
  async flushDirtyRecords(dirtyChannelItems = [], dirtyPairItems = [], lastCursor = '') {
    if (dirtyChannelItems.length === 0 && dirtyPairItems.length === 0 && !lastCursor) {
      return { flushedChannels: 0, flushedPairs: 0 };
    }

    let session = null;
    let useTransaction = false;

    try {
      // Attempt transaction session if supported by deployment (e.g. MongoDB Atlas replica set)
      if (mongoose.connection.readyState === 1 && typeof mongoose.startSession === 'function') {
        try {
          session = await mongoose.startSession();
          if (session && typeof session.startTransaction === 'function') {
            session.startTransaction();
            useTransaction = true;
          }
        } catch (sessErr) {
          logger.debug(`[PersistenceService] Session start notice (fallback mode): ${sessErr.message}`);
          session = null;
          useTransaction = false;
        }
      }

      const sessionOption = useTransaction ? { session } : {};

      // 1. Bulk write dirty channels
      if (dirtyChannelItems.length > 0) {
        const channelOps = dirtyChannelItems.map((item) => ({
          updateOne: {
            filter: { identifier: item.identifier },
            update: { $set: item },
            upsert: true,
          },
        }));
        await ChannelAnalytics.bulkWrite(channelOps, sessionOption);
      }

      // 2. Bulk write dirty pairs
      if (dirtyPairItems.length > 0) {
        const pairOps = dirtyPairItems.map((item) => ({
          updateOne: {
            filter: { identifier: item.identifier },
            update: { $set: item },
            upsert: true,
          },
        }));
        await PairAnalytics.bulkWrite(pairOps, sessionOption);
      }

      // 3. Update syncState lastCursor checkpoint in the same transaction
      if (lastCursor) {
        await SyncState.updateOne(
          { _id: 'sync_metadata' },
          { $set: { lastCursor, lastSyncAt: new Date() } },
          { upsert: true, ...sessionOption }
        );
      }

      // Commit transaction if active
      if (useTransaction && session) {
        await session.commitTransaction();
      }

      logger.info(`[PersistenceService] Atomically flushed dirty records (${dirtyChannelItems.length} channels, lastCursor updated)`);
      return {
        flushedChannels: dirtyChannelItems.length,
        flushedPairs: dirtyPairItems.length,
      };
    } catch (error) {
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          logger.error(`[PersistenceService] Transaction abort error: ${abortErr.message}`);
        }
      }
      logger.error(`[PersistenceService] Flush error: ${error.message}`);
      return { flushedChannels: 0, flushedPairs: 0, error: error.message };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
}

module.exports = new PersistenceService();
