const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/channels', analyticsController.getChannelAnalytics);
router.get('/pairs', analyticsController.getPairAnalytics);
router.get('/summary', analyticsController.getOverallSummary);
router.post('/reset', analyticsController.resetAnalytics);

router.post('/backup', analyticsController.createBackupSnapshot);
router.get('/backup', analyticsController.getBackupSnapshot);
router.post('/restore', analyticsController.restoreBackupSnapshot);

module.exports = router;
