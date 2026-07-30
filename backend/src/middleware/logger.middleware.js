const morgan = require('morgan');
const envConfig = require('../config/env.config');

const format = envConfig.isProduction ? 'combined' : 'dev';

const loggerMiddleware = morgan(format);

module.exports = loggerMiddleware;
