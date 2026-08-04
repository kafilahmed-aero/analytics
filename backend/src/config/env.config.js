const dotenv = require('dotenv');
const path = require('path');
const logger = require('../utils/logger');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const resolveFxDeskProUrl = () => {
  if (process.env.FX_DESK_PRO_BASE_URL) {
    return process.env.FX_DESK_PRO_BASE_URL.trim();
  }
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    return 'https://fx-desk-pro.onrender.com';
  }
  return 'http://localhost:4000';
};

const validateEnv = () => {
  if (!process.env.INTERNAL_SERVICE_KEY) {
    logger.error('[EnvConfig] CRITICAL: INTERNAL_SERVICE_KEY environment variable is missing.');
    console.error('[ConfigError] CRITICAL: INTERNAL_SERVICE_KEY environment variable is required.');
    process.exit(1);
  }

  const resolvedFxUrl = resolveFxDeskProUrl();

  const requiredVars = [
    { name: 'PORT', value: process.env.PORT, default: '5000' },
    { name: 'NODE_ENV', value: process.env.NODE_ENV, default: 'development' },
    { name: 'MONGODB_URI', value: process.env.MONGODB_URI, default: 'mongodb://localhost:27017/analytics' },
    { name: 'CORS_ORIGIN', value: process.env.CORS_ORIGIN, default: 'http://localhost:5173' },
    { name: 'FX_DESK_PRO_BASE_URL', value: resolvedFxUrl, default: resolvedFxUrl },
  ];

  requiredVars.forEach((v) => {
    if (!v.value) {
      logger.warn(`[EnvConfig] Missing env var: ${v.name}. Falling back to default: "${v.default}"`);
    }
  });

  logger.info(`[EnvConfig] Target FX Desk Pro URL resolved to: "${resolvedFxUrl}"`);
  logger.info('[EnvConfig] Environment configuration validation complete');
};

const envConfig = Object.freeze({
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  fxDeskProBaseUrl: resolveFxDeskProUrl(),
  fxDeskProTimeoutMs: parseInt(process.env.FX_DESK_PRO_TIMEOUT_MS || '5000', 10),
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || '',
  isProduction: process.env.NODE_ENV === 'production',
  validateEnv,
});

module.exports = envConfig;
