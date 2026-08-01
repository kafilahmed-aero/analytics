const logger = require('../utils/logger');
const MonitoringSessionModel = require('../models/monitoringSession.model');
const sessionRegistry = require('./activeSignalManager.service');

class SessionHydrationService {
  /**
   * Startup Hydration Engine:
   * Restores active MonitoringSessions from Analytics MongoDB monitoringsessions collection
   * BEFORE price monitoring or HTTP server starts listening.
   */
  async hydrateRegistryOnBoot() {
    logger.info('[SessionHydrationService] Starting registry startup hydration sequence...');
    sessionRegistry.hydrationComplete = false;

    try {
      // Query MongoDB for all non-terminal active sessions
      const activeStatuses = ['REGISTERED', 'HYDRATED', 'WAITING_PRICE', 'MONITORING'];
      const docs = await MonitoringSessionModel.find({ status: { $in: activeStatuses } }).lean();

      logger.info(`[SessionHydrationService] Found ${docs.length} active sessions in MongoDB monitoringsessions collection.`);

      let hydratedCount = 0;
      for (const doc of docs) {
        // Reconstruct session object
        const sessionData = {
          sessionId: doc.sessionId,
          signalId: doc.signalId,
          messageKey: doc.messageKey,
          pair: doc.pair,
          channel: doc.channel,
          direction: doc.direction,
          entryPrice: doc.entryPrice,
          fixedLotSize: doc.fixedLotSize || 0.01,

          originalTpList: doc.originalTpList || [],
          tpQueue: doc.tpQueue || [],
          activeTpPointer: doc.activeTpPointer || 0,

          slQueue: doc.slQueue || [],
          activeSlPointer: doc.activeSlPointer || 0,

          status: doc.status || 'HYDRATED',

          dollarTotals: doc.dollarTotals || { grossProfit: 0, grossLoss: 0, netPnL: 0 },

          milestoneHistory: doc.milestoneHistory || [],
          createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
          receivedAt: doc.receivedAt ? doc.receivedAt.toISOString() : new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          lastTickPrice: doc.lastTickPrice || null,

          isDirty: false,
          isHydrated: true,
        };

        sessionRegistry.registerHydratedSession(sessionData);
        hydratedCount++;
      }

      sessionRegistry.hydrationComplete = true;
      logger.info(`[SessionHydrationService] Startup hydration COMPLETE. Successfully hydrated and indexed ${hydratedCount} sessions.`);
      return { success: true, count: hydratedCount };
    } catch (error) {
      logger.error(`[SessionHydrationService] Startup hydration ERROR: ${error.message}`, error);
      sessionRegistry.hydrationComplete = true; // Unblock to allow clean boot degradation
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SessionHydrationService();
