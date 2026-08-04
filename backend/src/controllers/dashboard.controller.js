const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const analyticsEngine = require('../services/analyticsEngine.service');
const priceFeedHealthMonitor = require('../services/priceFeedHealth.service');
const processChannelQuery = require('../utils/dashboardQuery.util');

const getDashboardSummary = asyncHandler(async (req, res) => {
  const summaryData = analyticsEngine.getOverallSummary();
  const feedHealth = priceFeedHealthMonitor.getHealthSummary();

  const data = {
    serverStatus: 'online',
    uptime: `${Math.floor(process.uptime())}s`,
    marketStatus: feedHealth.marketStatus,
    lastMarketPrice: feedHealth.lastMarketPrice,
    lastMarketTime: feedHealth.lastMarketTime,
    feedHealth,
    ...summaryData,
  };

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, data, 'Dashboard summary retrieved successfully'));
});

const getDashboardChannels = asyncHandler(async (req, res) => {
  const rawAnalytics = analyticsEngine.getChannelAnalytics(req.query);
  
  // Filter out verification/test channels from the live dashboard (Option A)
  const TEST_KEYWORDS = ['VERIFY', 'TEST', 'DEMO', 'PROD_VERIFY', 'PROD_ALERTS'];
  const filteredChannels = (rawAnalytics.channels || []).filter(
    (chan) => !TEST_KEYWORDS.some((kw) => String(chan.channel || '').toUpperCase().includes(kw))
  );

  const processed = processChannelQuery(filteredChannels, req.query);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, processed, 'Dashboard channel analytics retrieved successfully'));
});

module.exports = {
  getDashboardSummary,
  getDashboardChannels,
};
