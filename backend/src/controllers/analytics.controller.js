const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const analyticsEngine = require('../services/analyticsEngine.service');

const getChannelAnalytics = asyncHandler(async (req, res) => {
  const data = analyticsEngine.getChannelAnalytics();
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, data, 'Channel analytics retrieved successfully'));
});

const getPairAnalytics = asyncHandler(async (req, res) => {
  const data = analyticsEngine.getPairAnalytics();
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, data, 'Pair analytics retrieved successfully'));
});

const getOverallSummary = asyncHandler(async (req, res) => {
  const data = analyticsEngine.getOverallSummary();
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, data, 'Overall analytics summary retrieved successfully'));
});

module.exports = {
  getChannelAnalytics,
  getPairAnalytics,
  getOverallSummary,
};
