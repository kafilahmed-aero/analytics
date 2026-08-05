const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const fxDeskProService = require('../services/fxdeskpro.service');
const { parseEntryPrice } = require('../utils/entryParser');

const testConnection = asyncHandler(async (req, res) => {
  const connectionResult = await fxDeskProService.checkConnection();
  const message = connectionResult.connected
    ? 'Successfully connected to FX Desk Pro service'
    : 'Failed to connect to FX Desk Pro service';

  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, connectionResult, message));
});

const getHealthStatus = asyncHandler(async (req, res) => {
  const healthData = await fxDeskProService.fetchHealth();
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, healthData, 'FX Desk Pro health retrieved'));
});

const getActiveSignals = asyncHandler(async (req, res) => {
  const signalsData = await fxDeskProService.fetchActiveSignals();

  if (signalsData) {
    let payload = signalsData.data || signalsData;
    let signals = payload.signals || payload.data || (Array.isArray(payload) ? payload : null);

    if (Array.isArray(signals)) {
      signals.forEach((sig) => {
        if (sig.entry !== undefined) {
          sig.entry = parseEntryPrice(sig.entry);
        }
        if (sig.entryPrice !== undefined) {
          sig.entryPrice = parseEntryPrice(sig.entryPrice);
        }
      });
    }
  }

  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, signalsData, 'Active signals retrieved'));
});

module.exports = {
  testConnection,
  getHealthStatus,
  getActiveSignals,
};
