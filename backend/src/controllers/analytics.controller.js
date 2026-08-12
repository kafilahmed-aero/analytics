const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const HTTP_STATUS = require('../constants/httpStatusCodes');
const analyticsEngine = require('../services/analyticsEngine.service');
const backupRestoreService = require('../services/backupRestore.service');

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

const resetAnalytics = asyncHandler(async (req, res) => {
  await analyticsEngine.resetAllAnalytics();
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, 'All in-memory and database analytics reset successfully'));
});

const createBackupSnapshot = asyncHandler(async (req, res) => {
  const snapshot = await backupRestoreService.createSnapshot();
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, snapshot, 'Backup snapshot generated and saved successfully'));
});

const getBackupSnapshot = asyncHandler(async (req, res) => {
  const snapshot = backupRestoreService.getSnapshotFromFile();
  if (!snapshot) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(new ApiResponse(HTTP_STATUS.NOT_FOUND, null, 'No backup snapshot file found'));
  }
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, snapshot, 'Backup snapshot retrieved successfully'));
});

const restoreBackupSnapshot = asyncHandler(async (req, res) => {
  const snapshotInput = req.body && Object.keys(req.body).length > 0 ? req.body : null;
  const result = await backupRestoreService.restoreFromSnapshot(snapshotInput);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, 'Analytics results restored successfully from snapshot'));
});

module.exports = {
  getChannelAnalytics,
  getPairAnalytics,
  getOverallSummary,
  resetAnalytics,
  createBackupSnapshot,
  getBackupSnapshot,
  restoreBackupSnapshot,
};
