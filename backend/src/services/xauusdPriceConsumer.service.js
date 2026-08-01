const fxdeskproService = require('./fxdeskpro.service');
const tickDispatcher = require('./tickDispatcher.service');
const logger = require('../utils/logger');

class XauusdPriceConsumerService {
  constructor() {
    this.intervalId = null;
    this.pollIntervalMs = 3000; // 3-second live price polling interval
    this.isRunning = false;
    this.sequence = 0;
  }

  /**
   * Start continuous live XAUUSD price polling bridge
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[XAUUSDPriceConsumer] Starting continuous live XAUUSD price consumer (interval: ${this.pollIntervalMs}ms)...`);

    // Poll immediately on start
    this.pollPrice();

    this.intervalId = setInterval(() => {
      this.pollPrice();
    }, this.pollIntervalMs);
  }

  /**
   * Stop continuous live XAUUSD price polling bridge
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('[XAUUSDPriceConsumer] Stopped continuous live XAUUSD price consumer');
  }

  /**
   * Fetch current live XAUUSD market price from FX Desk Pro and dispatch tick
   */
  async pollPrice() {
    try {
      const healthData = await fxdeskproService.fetchHealth();
      const xauusdPrice = healthData?.data?.feeds?.yahoo?.xauusdPrice || healthData?.feeds?.yahoo?.xauusdPrice;

      if (xauusdPrice && !isNaN(xauusdPrice) && parseFloat(xauusdPrice) > 0) {
        this.sequence++;
        const tick = {
          symbol: 'XAUUSD',
          price: parseFloat(xauusdPrice),
          sequence: this.sequence,
          timestamp: new Date().toISOString(),
        };

        tickDispatcher.processTick(tick);
      }
    } catch (err) {
      logger.warn(`[XAUUSDPriceConsumer] Request failed for live market price: ${err.message}`);
    }
  }
}

module.exports = new XauusdPriceConsumerService();
