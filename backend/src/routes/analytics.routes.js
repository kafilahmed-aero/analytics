const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/channels', analyticsController.getChannelAnalytics);
router.get('/pairs', analyticsController.getPairAnalytics);
router.get('/summary', analyticsController.getOverallSummary);

module.exports = router;
