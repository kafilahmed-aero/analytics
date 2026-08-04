const app = require('./app');
const envConfig = require('./config/env.config');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const analyticsEngine = require('./services/analyticsEngine.service');
const sessionHydrationService = require('./services/sessionHydration.service');
const sessionPersistenceService = require('./services/sessionPersistence.service');
const activeSignalIngestionService = require('./services/activeSignalIngestion.service');
const xauusdPriceConsumerService = require('./services/xauusdPriceConsumer.service');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  // 1. Validate Environment Variables on boot
  envConfig.validateEnv();

  // 2. Connect to MongoDB database
  await connectDatabase();

  // 3. Hydrate AnalyticsEngine in-memory live state from database
  await analyticsEngine.hydrateFromDatabase();

  // 4. Hydrate Active Signal Monitoring Sessions BEFORE Express HTTP server starts
  await sessionHydrationService.hydrateRegistryOnBoot();

  // 5. Start Background Persistence Services
  sessionPersistenceService.start(2000);
  analyticsEngine.startAutoFlush(5000);

  // 6. Start Express HTTP Server
  server = app.listen(envConfig.port, () => {
    logger.info(`Server listening on port ${envConfig.port} [${envConfig.nodeEnv}]`);
  });

  // 7. Start Active Signal Polling Bridge from FX Desk Pro ONLY AFTER hydration completes
  activeSignalIngestionService.start();

  // 8. Start Continuous XAUUSD Live Price Consumer
  xauusdPriceConsumerService.start();
};

// Graceful shutdown helper
const shutdownGracefully = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);

  // Stop active signal polling bridge & price consumer
  activeSignalIngestionService.stop();
  xauusdPriceConsumerService.stop();

  // Stop background persistence auto-flushers
  try {
    await sessionPersistenceService.stop();
    await analyticsEngine.stopAutoFlush();
  } catch (err) {
    logger.error('Error stopping persistence services on shutdown:', err.message);
  }

  if (server) {
    // 1. Stop accepting HTTP requests
    server.close(async () => {
      logger.info('[Shutdown 1/3] HTTP server closed');

      // 2. Flush dirty analytics records to database
      try {
        const flushResult = await analyticsEngine.flushDirtyAnalytics();
        logger.info('[Shutdown 2/3] Flushed pending dirty analytics:', flushResult);
      } catch (err) {
        logger.error('[Shutdown 2/3] Error flushing analytics on shutdown:', err.message);
      }

      // 3. Close MongoDB database connection
      await disconnectDatabase();
      logger.info('[Shutdown 3/3] MongoDB connection closed. Exit 0');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  shutdownGracefully('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  shutdownGracefully('unhandledRejection');
});

startServer();
