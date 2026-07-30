const rateLimit = require('express-rate-limit');
const HTTP_STATUS = require('../constants/httpStatusCodes');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
  },
});

module.exports = apiRateLimiter;
