const mongoose = require('mongoose');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger');

const connectDatabase = async () => {
  try {
    const options = {
      autoIndex: !envConfig.isProduction,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(envConfig.mongodbUri, options);
  } catch (error) {
    logger.error(`MongoDB initial connection failure: ${error.message}`);
    // Non-fatal on boot if database is temporarily unavailable; application handles reconnects
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error.message);
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
