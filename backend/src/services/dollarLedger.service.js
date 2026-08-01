const logger = require('../utils/logger');

/**
 * Independent Milestone Dollar Calculation Model
 * Analytics V2 is permanently XAUUSD-only.
 * 
 * Standard XAUUSD Rate Rules:
 * - Base Lot Size: 0.01 standard lots (stored inside each session.fixedLotSize)
 * - Rate: 1.0 Gold Point = 10 Pips = $1.00 Dollar Value per 0.01 Lot ($0.10 per pip)
 * - Raw Measurement Only: Returns positive dollar magnitude value for each milestone.
 */
class DollarLedgerService {
  constructor() {
    this.defaultLotSize = 0.01;
  }

  /**
   * Calculate Raw Milestone Dollar Value ($)
   * Formula: |TargetPrice - EntryPrice| * $1.00 * (lotSize / 0.01)
   */
  calculateMilestoneDollar(entryPrice, targetPrice, lotSize = 0.01) {
    const entry = parseFloat(entryPrice);
    const target = parseFloat(targetPrice);
    const lot = parseFloat(lotSize) || this.defaultLotSize;

    if (isNaN(entry) || isNaN(target) || entry <= 0 || target <= 0) {
      logger.warn(`[DollarLedger] Invalid price input for milestone dollar calculation: entry=${entryPrice}, target=${targetPrice}`);
      return 0.0;
    }

    const pointDifference = Math.abs(target - entry);
    const dollarValue = Number((pointDifference * 1.0 * (lot / 0.01)).toFixed(2));
    return Math.max(0.0, dollarValue);
  }
}

module.exports = new DollarLedgerService();
