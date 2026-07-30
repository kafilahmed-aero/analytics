const ApiError = require('../utils/apiError');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // Handle Mongoose CastError (Invalid ID)
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ${err.path}`;
    error = new ApiError(HTTP_STATUS.BAD_REQUEST, message);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    const message = `Duplicate field value entered: ${fields}`;
    error = new ApiError(HTTP_STATUS.CONFLICT, message);
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    error = new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, errors);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(!envConfig.isProduction && { stack: error.stack }),
  };

  logger.error(`${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
