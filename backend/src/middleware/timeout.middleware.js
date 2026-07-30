const HTTP_STATUS = require('../constants/httpStatusCodes');
const ApiError = require('../utils/apiError');

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Request timeout middleware enforcing 15s limit per HTTP request.
 */
const requestTimeoutMiddleware = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, `Request timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};

module.exports = requestTimeoutMiddleware;
