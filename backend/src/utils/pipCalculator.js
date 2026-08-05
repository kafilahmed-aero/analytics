/**
 * XAUUSD (Gold) Pip Calculator
 * Analytics V2 is permanently XAUUSD-only.
 * 
 * Standard Gold Pip Conventions:
 * - 1 Gold Point = 1 pip ($1.00 price move)
 * - 1 Pip = 1.00 Gold Points ($1.00 price move)
 * - 8 Pips = 8.00 Gold Points
 * - 10 Pips = 10.00 Gold Points
 * - 12 Pips = 12.00 Gold Points
 */

const PIP_SIZE = 1.00;

const calculateDerivedStopLosses = (direction, entryPrice) => {
  const price = parseFloat(entryPrice);
  if (isNaN(price) || price <= 0) {
    throw new Error(`[PipCalculator] Invalid XAUUSD entry price: ${entryPrice}`);
  }

  const isBuy = String(direction).toUpperCase() === 'BUY';
  // For BUY: SL is below entry (-). For SELL: SL is above entry (+).
  const multiplier = isBuy ? -1 : 1;

  const derivedSl8 = Number((price + multiplier * 8 * PIP_SIZE).toFixed(2));
  const derivedSl10 = Number((price + multiplier * 10 * PIP_SIZE).toFixed(2));
  const derivedSl12 = Number((price + multiplier * 12 * PIP_SIZE).toFixed(2));

  return {
    derivedSl8,
    derivedSl10,
    derivedSl12,
  };
};

const calculatePipDistance = (priceA, priceB) => {
  const pA = parseFloat(priceA);
  const pB = parseFloat(priceB);
  if (isNaN(pA) || isNaN(pB)) return 0;
  return Number((Math.abs(pA - pB) / PIP_SIZE).toFixed(1));
};

module.exports = {
  PIP_SIZE,
  calculateDerivedStopLosses,
  calculatePipDistance,
};
