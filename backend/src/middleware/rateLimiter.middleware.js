const rateLimit = require('express-rate-limit');
const HTTP_STATUS = require('../constants/httpStatusCodes');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 mins per client IP for active dashboard monitoring
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  skip: (req) => {
    // Exclude lightweight health and connection diagnostic endpoints from rate limiting.
    // UptimeRobot and uptime monitors can safely ping /api/health without trigger limits.
    const path = req.originalUrl || req.path || '';
    return (
      path.includes('/api/health') ||
      path.includes('/api/fxdeskpro/test-connection')
    );
  },
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
  },
});

module.exports = apiRateLimiter;
