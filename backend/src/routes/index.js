const express = require('express');
const healthRoutes = require('./health.routes');
const fxDeskProRoutes = require('./fxdeskpro.routes');
const activeSignalRoutes = require('./activeSignal.routes');
const analyticsRoutes = require('./analytics.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/fxdeskpro', fxDeskProRoutes);
router.use('/signals', activeSignalRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;




