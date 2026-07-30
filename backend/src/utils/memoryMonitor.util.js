const logger = require('./logger');

const RSS_WARNING_THRESHOLD_MB = 350;

/**
 * Returns current memory usage metrics in megabytes (MB).
 */
const getMemoryMetrics = () => {
  const mem = process.memoryUsage();
  return {
    rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
  };
};

/**
 * Checks memory footprint and emits warning if RSS exceeds threshold.
 * Does NOT terminate the process.
 */
const checkMemoryUsage = () => {
  const { rssMB, heapUsedMB } = getMemoryMetrics();
  if (rssMB > RSS_WARNING_THRESHOLD_MB) {
    logger.warn(`[MemoryMonitor] High memory usage detected: RSS=${rssMB}MB (Threshold=${RSS_WARNING_THRESHOLD_MB}MB), HeapUsed=${heapUsedMB}MB`);
  }
  return { rssMB, heapUsedMB };
};

module.exports = {
  getMemoryMetrics,
  checkMemoryUsage,
};
