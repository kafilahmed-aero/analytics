const express = require('express');
const activeSignalController = require('../controllers/activeSignal.controller');

const router = express.Router();

router.get('/active', activeSignalController.getActiveSignals);

module.exports = router;
