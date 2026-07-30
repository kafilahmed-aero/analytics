const app = require('./app');
const envConfig = require('./config/env.config');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const analyticsEngine = require('./services/analyticsEngine.service');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  // Validate Environment Variables on boot
  envConfig.validateEnv();

  // Connect to MongoDB database
  await connectDatabase();

  // Hydrate AnalyticsEngine in-memory live state from database
  await analyticsEngine.hydrateFromDatabase();

  // Start Express HTTP Server
  server = app.listen(envConfig.port, () => {
    logger.info(`Server listening on port ${envConfig.port} [${envConfig.nodeEnv}]`);
  });
};

// Graceful shutdown helper:
// Order: 1. Stop HTTP -> 2. Flush dirty analytics -> 3. Disconnect DB -> 4. Exit 0
const shutdownGracefully = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);

  if (server) {
    // 1. Stop accepting HTTP requests
    server.close(async () => {
      logger.info('[Shutdown 1/3] HTTP server closed');

      // 2. Flush dirty analytics records to database
      try {
        const flushResult = await analyticsEngine.flushDirtyAnalytics();
        logger.info(`[Shutdown 2/3] Flushed pending dirty analytics:`, flushResult);
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
