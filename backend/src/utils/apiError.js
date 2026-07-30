const HTTP_STATUS = require('../constants/httpStatusCodes');

class ApiError extends Error {
  constructor(
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message = 'Internal Server Error',
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
