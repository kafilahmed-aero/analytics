const mongoose = require('mongoose');
const activeSignalManager = require('./activeSignalManager.service');
const { getMemoryMetrics, checkMemoryUsage } = require('../utils/memoryMonitor.util');

const formatUptime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const getSystemHealth = () => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbConnectionState = mongoose.connection.readyState;
  const dbStatus = dbStateMap[dbConnectionState] || 'unknown';

  // Perform memory check warning
  const memoryUsage = checkMemoryUsage();
  const activeSignalsCount = activeSignalManager.getAllActiveSessions().length;

  return {
    serverStatus: 'online',
    databaseStatus: dbStatus,
    uptime: formatUptime(process.uptime()),
    activeSignalsCount,
    memoryUsage,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  getSystemHealth,
};
