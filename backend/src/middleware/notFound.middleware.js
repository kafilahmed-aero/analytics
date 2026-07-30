const ApiError = require('../utils/apiError');
const HTTP_STATUS = require('../constants/httpStatusCodes');

const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    HTTP_STATUS.NOT_FOUND,
    `Route Not Found - ${req.originalUrl}`
  );
  next(error);
};

module.exports = notFoundHandler;
