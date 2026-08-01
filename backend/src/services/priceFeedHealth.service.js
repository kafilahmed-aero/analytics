const logger = require('../utils/logger');

class PriceFeedHealthMonitor {
  constructor() {
    this.lastTickReceived = null;
    this.connectionState = 'DISCONNECTED'; // CONNECTED | DISCONNECTED | DEGRADED
    this.reconnectCount = 0;
    this.currentLatencyMs = 0;
    this.heartbeatFailures = 0;
    this.totalTicksReceived = 0;
  }

  recordTick(timestamp) {
    const now = Date.now();
    const tickTime = new Date(timestamp).getTime();
    this.currentLatencyMs = Math.max(0, now - (isNaN(tickTime) ? now : tickTime));
    this.lastTickReceived = new Date(now).toISOString();
    this.connectionState = 'CONNECTED';
    this.heartbeatFailures = 0;
    this.totalTicksReceived++;
  }

  recordDisconnect() {
    this.connectionState = 'DISCONNECTED';
    this.reconnectCount++;
    logger.warn(`[PriceFeedHealth] Connection lost. Reconnect count: ${this.reconnectCount}`);
  }

  recordHeartbeatFailure() {
    this.heartbeatFailures++;
    if (this.heartbeatFailures >= 3) {
      this.connectionState = 'DEGRADED';
      logger.warn(`[PriceFeedHealth] Connection state DEGRADED after ${this.heartbeatFailures} failed heartbeats.`);
    }
  }

  getHealthSummary() {
    const secondsSinceLastTick = this.lastTickReceived
      ? Math.round((Date.now() - new Date(this.lastTickReceived).getTime()) / 1000)
      : null;

    const isHealthy = this.connectionState === 'CONNECTED' && secondsSinceLastTick !== null && secondsSinceLastTick < 15;

    return {
      connectionState: this.connectionState,
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
