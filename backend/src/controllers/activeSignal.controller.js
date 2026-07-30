const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const activeSignalManager = require('../services/activeSignalManager.service');

const getActiveSignals = asyncHandler(async (req, res) => {
  const activeSignals = activeSignalManager.getActiveSignals();
  const data = {
    count: activeSignalManager.getActiveCount(),
    signals: activeSignals,
  };
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, data, 'Active signals retrieved successfully'));
});

module.exports = {
  getActiveSignals,
};
