/**
 * Internal utility to compute 8, 10, and 12 pip Stop Loss offsets.
 * Standard currency pairs (EURUSD, GBPUSD, etc.) use 0.0001 per pip.
 * JPY currency pairs (USDJPY, EURJPY, etc.) use 0.01 per pip.
 */

const isJpyPair = (symbol = '') => {
  return symbol.toUpperCase().includes('JPY');
};

const getPipSize = (symbol = '') => {
  return isJpyPair(symbol) ? 0.01 : 0.0001;
};

const calculateDerivedStopLosses = (symbol, direction, entryPrice) => {
  const price = parseFloat(entryPrice);
  if (isNaN(price)) {
    throw new Error(`Invalid entry price for pip calculation: ${entryPrice}`);
  }

  const pipSize = getPipSize(symbol);
  const isBuy = String(direction).toUpperCase() === 'BUY';

  // For BUY: SL is below entry. For SELL: SL is above entry.
  const multiplier = isBuy ? -1 : 1;

  const derivedSl8 = Number((price + multiplier * 8 * pipSize).toFixed(isJpyPair(symbol) ? 3 : 5));
  const derivedSl10 = Number((price + multiplier * 10 * pipSize).toFixed(isJpyPair(symbol) ? 3 : 5));
  const derivedSl12 = Number((price + multiplier * 12 * pipSize).toFixed(isJpyPair(symbol) ? 3 : 5));

  return {
    derivedSl8,
    derivedSl10,
    derivedSl12,
  };
};

module.exports = {
  isJpyPair,
  getPipSize,
  calculateDerivedStopLosses,
};
