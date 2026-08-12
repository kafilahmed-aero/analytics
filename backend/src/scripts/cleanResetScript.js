const envConfig = require('../config/env.config');
const { connectDatabase, disconnectDatabase } = require('../database/connection');
const analyticsEngine = require('../services/analyticsEngine.service');
const backupRestoreService = require('../services/backupRestore.service');
const logger = require('../utils/logger');

async function runCleanReset() {
  logger.info('[CleanResetScript] Starting clean reset script...');

  try {
    envConfig.validateEnv();
    await connectDatabase();

    logger.info('[CleanResetScript] Resetting in-memory cache, MongoDB Atlas collections, and backup snapshot...');
    await analyticsEngine.resetAllAnalytics();

    logger.info('[CleanResetScript] Creating clean initial backup snapshot baseline...');
    await backupRestoreService.createSnapshot();

    logger.info('[CleanResetScript] CLEAN RESET COMPLETE! Dashboard starts fresh at 2026-08-12 14:33:17 IST baseline.');
  } catch (err) {
    logger.error(`[CleanResetScript] Clean reset failed: ${err.message}`);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

runCleanReset();
