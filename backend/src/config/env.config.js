const dotenv = require('dotenv');
const path = require('path');
const logger = require('../utils/logger');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const validateEnv = () => {
  const requiredVars = [
    { name: 'PORT', value: process.env.PORT, default: '5000' },
    { name: 'NODE_ENV', value: process.env.NODE_ENV, default: 'development' },
    { name: 'MONGODB_URI', value: process.env.MONGODB_URI, default: 'mongodb://localhost:27017/analytics' },
    { name: 'CORS_ORIGIN', value: process.env.CORS_ORIGIN, default: 'http://localhost:5173' },
    { name: 'FX_DESK_PRO_BASE_URL', value: process.env.FX_DESK_PRO_BASE_URL, default: 'http://localhost:4000' },
  ];

  const missing = [];
  requiredVars.forEach((v) => {
    if (!v.value) {
      logger.warn(`[EnvConfig] Missing env var: ${v.name}. Falling back to default: "${v.default}"`);
    }
  });

  logger.info('[EnvConfig] Environment configuration validation complete');
};

const envConfig = Object.freeze({
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  fxDeskProBaseUrl: process.env.FX_DESK_PRO_BASE_URL || 'http://localhost:4000',
  fxDeskProTimeoutMs: parseInt(process.env.FX_DESK_PRO_TIMEOUT_MS || '5000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  validateEnv,
});

module.exports = envConfig;
