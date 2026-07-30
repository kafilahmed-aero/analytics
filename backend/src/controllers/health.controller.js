const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const healthService = require('../services/health.service');

const getHealthStatus = asyncHandler(async (req, res) => {
  const healthData = healthService.getSystemHealth();
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, healthData, 'System health operational'));
});

module.exports = {
  getHealthStatus,
};
