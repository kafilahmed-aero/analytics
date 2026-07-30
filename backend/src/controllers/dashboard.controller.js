const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const analyticsEngine = require('../services/analyticsEngine.service');
const processDashboardQuery = require('../utils/dashboardQuery.util');

const getDashboardSummary = asyncHandler(async (req, res) => {
  const summaryData = analyticsEngine.getOverallSummary();
  const data = {
    serverStatus: 'online',
    uptime: `${Math.floor(process.uptime())}s`,
    ...summaryData,
  };

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, data, 'Dashboard summary retrieved successfully'));
});

const getDashboardChannels = asyncHandler(async (req, res) => {
  const rawChannels = analyticsEngine.getChannelAnalytics();
  const processed = processDashboardQuery(rawChannels, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, processed, 'Dashboard channel analytics retrieved successfully'));
});

const getDashboardPairs = asyncHandler(async (req, res) => {
  const rawPairs = analyticsEngine.getPairAnalytics();
  const processed = processDashboardQuery(rawPairs, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, processed, 'Dashboard pair analytics retrieved successfully'));
});

module.exports = {
  getDashboardSummary,
  getDashboardChannels,
  getDashboardPairs,
};
