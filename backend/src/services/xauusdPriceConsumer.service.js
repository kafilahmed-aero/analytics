const tickDispatcher = require('./tickDispatcher.service');
const priceFeedHealthMonitor = require('./priceFeedHealth.service');
const logger = require('../utils/logger');

/**
 * Independent XAUUSD Market Price Consumer
 * Analytics V2 owns its own independent live XAUUSD market price feed.
 * NO DEPENDENCY ON FX DESK PRO FOR MARKET PRICES.
 */
class XauusdPriceConsumerService {
  constructor() {
    this.intervalId = null;
    this.pollIntervalMs = 3000; // 3-second polling interval
    this.isRunning = false;
    this.sequence = 0;
    this.lastPrice = null;
    this.lastMarketTime = null;

    // Independent primary and secondary market data endpoints (Yahoo Finance Spot Gold / Futures)
    this.endpoints = [
      'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d',
      'https://query2.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d',
      'https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=1m&range=1d',
    ];
  }

  /**
   * Start independent continuous live XAUUSD price consumer
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[XAUUSDPriceConsumer] Starting independent live XAUUSD price consumer (interval: ${this.pollIntervalMs}ms)...`);

    // Poll immediately on startup
    this.pollPrice();

    this.intervalId = setInterval(() => {
      this.pollPrice();
    }, this.pollIntervalMs);
  }

  /**
   * Stop independent continuous live XAUUSD price consumer
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('[XAUUSDPriceConsumer] Stopped independent live XAUUSD price consumer');
  }

  /**
   * Fetch live XAUUSD market price directly from independent market data feeds
   */
  async pollPrice() {
    let lastError = null;

    for (const url of this.endpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const meta = data.chart?.result?.[0]?.meta;
          const price = parseFloat(meta?.regularMarketPrice || meta?.chartPreviousClose);
          const regularMarketTimeSec = meta?.regularMarketTime;
          const marketTimeISO = regularMarketTimeSec ? new Date(regularMarketTimeSec * 1000).toISOString() : null;

          if (!isNaN(price) && price > 0) {
            this.sequence++;
            this.lastPrice = price;
            const timestamp = new Date().toISOString();

            // Track market state (OPEN vs CLOSED) via market time updates
            priceFeedHealthMonitor.recordTick(timestamp, marketTimeISO, price);

            const tick = {
              symbol: 'XAUUSD',
              price,
              sequence: this.sequence,
              timestamp,
              marketTimestamp: marketTimeISO,
              marketStatus: priceFeedHealthMonitor.marketStatus,
            };

            // Dispatch tick to Milestone Monitoring Engine
            tickDispatcher.processTick(tick);
            return;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
      }
    }

    priceFeedHealthMonitor.recordDisconnect();
    logger.warn(`[XAUUSDPriceConsumer] All independent price endpoints failed: ${lastError ? lastError.message : 'Unknown error'}`);
  }
}

module.exports = new XauusdPriceConsumerService();
