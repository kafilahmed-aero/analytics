const express = require('express');
const fxDeskProController = require('../controllers/fxdeskpro.controller');

const router = express.Router();

router.post('/test-connection', fxDeskProController.testConnection);
router.get('/health', fxDeskProController.getHealthStatus);
router.get('/signals/active', fxDeskProController.getActiveSignals);

module.exports = router;
