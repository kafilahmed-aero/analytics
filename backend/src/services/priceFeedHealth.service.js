const logger = require('../utils/logger');

class PriceFeedHealthMonitor {
  constructor() {
    this.lastTickReceived = null;
    this.lastMarketTime = null;
    this.lastMarketPrice = null;
    this.connectionState = 'DISCONNECTED'; // CONNECTED | DISCONNECTED | DEGRADED
    this.marketStatus = 'UNKNOWN'; // OPEN | CLOSED | STALE_FEED
    this.reconnectCount = 0;
    this.currentLatencyMs = 0;
    this.heartbeatFailures = 0;
    this.totalTicksReceived = 0;
    this.sameTimestampPollCount = 0;
  }

  recordTick(timestamp, marketTime = null, price = null) {
    const now = Date.now();
    const tickTime = new Date(timestamp).getTime();
    this.currentLatencyMs = Math.max(0, now - (isNaN(tickTime) ? now : tickTime));
    this.lastTickReceived = new Date(now).toISOString();
    this.connectionState = 'CONNECTED';
    this.heartbeatFailures = 0;
    this.totalTicksReceived++;

    if (price !== null && !isNaN(price)) {
      this.lastMarketPrice = price;
    }

    if (marketTime) {
      if (this.lastMarketTime === marketTime) {
        this.sameTimestampPollCount++;
        // If market timestamp remains unchanged across 5 consecutive polls, market is CLOSED (weekend/holiday)
        if (this.sameTimestampPollCount >= 5) {
          this.marketStatus = 'CLOSED';
        }
      } else {
        this.sameTimestampPollCount = 0;
        this.lastMarketTime = marketTime;
        this.marketStatus = 'OPEN';
      }
    } else {
      this.marketStatus = 'OPEN';
    }
  }

  recordDisconnect() {
    this.connectionState = 'DISCONNECTED';
    this.marketStatus = 'STALE_FEED';
    this.reconnectCount++;
    logger.warn(`[PriceFeedHealth] Connection lost. Reconnect count: ${this.reconnectCount}`);
  }

  recordHeartbeatFailure() {
    this.heartbeatFailures++;
    if (this.heartbeatFailures >= 3) {
      this.connectionState = 'DEGRADED';
      this.marketStatus = 'STALE_FEED';
      logger.warn(`[PriceFeedHealth] Connection state DEGRADED after ${this.heartbeatFailures} failed heartbeats.`);
    }
  }

  getHealthSummary() {
    const secondsSinceLastTick = this.lastTickReceived
      ? Math.round((Date.now() - new Date(this.lastTickReceived).getTime()) / 1000)
      : null;

    if (secondsSinceLastTick !== null && secondsSinceLastTick >= 15) {
      this.marketStatus = 'STALE_FEED';
    }

    const isHealthy = this.connectionState === 'CONNECTED' && secondsSinceLastTick !== null && secondsSinceLastTick < 15;

    return {
      connectionState: this.connectionState,
      marketStatus: this.marketStatus,
      lastMarketPrice: this.lastMarketPrice,
      lastMarketTime: this.lastMarketTime,
      lastTickReceived: this.lastTickReceived,
      secondsSinceLastTick,
      reconnectCount: this.reconnectCount,
      currentLatencyMs: this.currentLatencyMs,
      totalTicksReceived: this.totalTicksReceived,
      isHealthy,
    };
  }
}

module.exports = new PriceFeedHealthMonitor();
