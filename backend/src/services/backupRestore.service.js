const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const ChannelAnalytics = require('../models/channelAnalytics.model');
const PairAnalytics = require('../models/pairAnalytics.model');
const MonitoringSession = require('../models/monitoringSession.model');

const BACKUP_DIR = path.join(__dirname, '../../data');
const BACKUP_FILE = path.join(BACKUP_DIR, 'analytics_backup.json');

class BackupRestoreService {
  constructor() {
    this.ensureDataDirectoryExists();
  }

  ensureDataDirectoryExists() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
    } catch (err) {
      logger.error(`[BackupRestoreService] Failed to create data directory: ${err.message}`);
    }
  }

  /**
   * Export all current MongoDB analytics data to a local JSON snapshot file.
   */
  async createSnapshot() {
    try {
      this.ensureDataDirectoryExists();

      const channels = await ChannelAnalytics.find().lean();
      const pairs = await PairAnalytics.find().lean();
      const sessions = await MonitoringSession.find().lean();

      const snapshotData = {
        metadata: {
          version: '2.0.0',
          createdAt: new Date().toISOString(),
          baselineTimestamp: process.env.ANALYTICS_BASELINE_WATERMARK || '2026-08-12T09:03:17.000Z',
          totalChannels: channels.length,
          totalPairs: pairs.length,
          totalSessions: sessions.length,
        },
        channels,
        pairs,
        sessions,
      };

      fs.writeFileSync(BACKUP_FILE, JSON.stringify(snapshotData, null, 2), 'utf8');
      logger.info(
        `[BackupRestoreService] Snapshot saved successfully to ${BACKUP_FILE} (${channels.length} channels, ${pairs.length} pairs, ${sessions.length} sessions).`
      );

      return snapshotData;
    } catch (err) {
      logger.error(`[BackupRestoreService] Error creating backup snapshot: ${err.message}`);
      throw err;
    }
  }

  /**
   * Load snapshot JSON from file.
   */
  getSnapshotFromFile() {
    try {
      if (!fs.existsSync(BACKUP_FILE)) {
        return null;
      }
      const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      logger.error(`[BackupRestoreService] Failed to read snapshot file: ${err.message}`);
      return null;
    }
  }

  /**
   * Restore analytics data into MongoDB Atlas from a provided snapshot or local JSON file.
   */
  async restoreFromSnapshot(snapshotInput = null) {
    try {
      const snapshot = snapshotInput || this.getSnapshotFromFile();

      if (!snapshot) {
        logger.warn('[BackupRestoreService] Restore requested but no snapshot data was found.');
        return { restoredChannels: 0, restoredPairs: 0, restoredSessions: 0 };
      }

      const { channels = [], pairs = [], sessions = [] } = snapshot;

      // 1. Restore Channel Analytics
      if (channels.length > 0) {
        const channelOps = channels.map((c) => {
          const { _id, __v, ...data } = c;
          return {
            updateOne: {
              filter: { channel: data.channel },
              update: { $set: data },
              upsert: true,
            },
          };
        });
        await ChannelAnalytics.bulkWrite(channelOps);
      }

      // 2. Restore Pair Analytics
      if (pairs.length > 0) {
        const pairOps = pairs.map((p) => {
          const { _id, __v, ...data } = p;
          return {
            updateOne: {
              filter: { pair: data.pair },
              update: { $set: data },
              upsert: true,
            },
          };
        });
        await PairAnalytics.bulkWrite(pairOps);
      }

      // 3. Restore Monitoring Sessions
      if (sessions.length > 0) {
        const sessionOps = sessions.map((s) => {
          const { _id, __v, ...data } = s;
          return {
            updateOne: {
              filter: { sessionId: data.sessionId },
              update: { $set: data },
              upsert: true,
            },
          };
        });
        await MonitoringSession.bulkWrite(sessionOps);
      }

      logger.info(
        `[BackupRestoreService] Restored ${channels.length} channels, ${pairs.length} pairs, and ${sessions.length} sessions into MongoDB.`
      );

      // 4. Trigger in-memory rehydration of AnalyticsEngine & SessionRegistry
      const analyticsEngine = require('./analyticsEngine.service');
      const sessionHydrationService = require('./sessionHydration.service');

      await analyticsEngine.hydrateFromDatabase();
      await sessionHydrationService.hydrateRegistryOnBoot();

      return {
        restoredChannels: channels.length,
        restoredPairs: pairs.length,
        restoredSessions: sessions.length,
      };
    } catch (err) {
      logger.error(`[BackupRestoreService] Error restoring snapshot: ${err.message}`);
      throw err;
    }
  }

  /**
   * Boot-time Auto-Restoration Check:
   * If MongoDB database collections are completely empty (e.g. after redeployment or wipe),
   * automatically restore from the local backup snapshot file so no results are lost.
   */
  async checkAndAutoRestoreOnBoot() {
    try {
      const channelCount = await ChannelAnalytics.countDocuments();
      const sessionCount = await MonitoringSession.countDocuments();

      if (channelCount === 0 && sessionCount === 0) {
        logger.info('[BackupRestoreService] MongoDB is empty on boot. Checking for persistent backup snapshot...');
        const fileSnapshot = this.getSnapshotFromFile();
        if (fileSnapshot && (fileSnapshot.channels.length > 0 || fileSnapshot.sessions.length > 0)) {
          logger.info('[BackupRestoreService] Found local backup snapshot! Executing auto-restoration...');
          await this.restoreFromSnapshot(fileSnapshot);
          logger.info('[BackupRestoreService] Auto-restoration on boot completed successfully!');
        } else {
          logger.info('[BackupRestoreService] No non-empty backup snapshot file found. Booting clean.');
        }
      }
    } catch (err) {
      logger.error(`[BackupRestoreService] Auto-restore on boot error: ${err.message}`);
    }
  }
}

module.exports = new BackupRestoreService();
