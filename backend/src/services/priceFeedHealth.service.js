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
      const marketTimeMs = new Date(marketTime).getTime();
      const marketAgeSec = !isNaN(marketTimeMs) ? (now - marketTimeMs) / 1000 : 0;

      if (this.lastMarketTime === marketTime) {
        this.sameTimestampPollCount++;
        // If market timestamp remains unchanged across 5 consecutive polls or market timestamp > 5 mins old, market is CLOSED
        if (this.sameTimestampPollCount >= 5 || marketAgeSec > 300) {
          this.marketStatus = 'CLOSED';
        }
      } else {
        this.sameTimestampPollCount = 0;
        this.lastMarketTime = marketTime;
        if (marketAgeSec > 300) {
          this.marketStatus = 'CLOSED';
        } else {
          this.marketStatus = 'OPEN';
        }
      }
    } else {
      // Keep existing status if marketTime not provided on this tick unless unitialized
      if (this.marketStatus === 'UNKNOWN') {
        this.marketStatus = 'OPEN';
      }
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
    const now = Date.now();
    const secondsSinceLastTick = this.lastTickReceived
      ? Math.round((now - new Date(this.lastTickReceived).getTime()) / 1000)
      : null;

    if (secondsSinceLastTick !== null && secondsSinceLastTick >= 15) {
      this.marketStatus = 'STALE_FEED';
    } else if (this.lastMarketTime) {
      const marketTimeMs = new Date(this.lastMarketTime).getTime();
      if (!isNaN(marketTimeMs) && (now - marketTimeMs) > 300000) { // 5 minutes old
        this.marketStatus = 'CLOSED';
      }
    }

    const isHealthy = this.connectionState === 'CONNECTED' && secondsSinceLastTick !== null && secondsSinceLastTick < 15 && this.marketStatus === 'OPEN';

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
