/**
 * Utility to parse entry price from FX Desk Pro signals.
 * Handles single numeric values, ranges like "4170-4174", "4170 to 4174", "4170/4174",
 * and special formats like "4165.4164" (where a dot separates two integers representing a range).
 */
const parseEntryPrice = (entryVal) => {
  if (entryVal === null || entryVal === undefined) return NaN;

  const str = String(entryVal).trim();
  if (!str) return NaN;

  // 1. Check for format like "4165.4164" (range written as integer.integer)
  // To avoid matching legitimate decimals like "2000.5", we check that the decimal portion
  // is of similar length/magnitude as the integer portion (e.g. at least 3 digits each)
  // and the difference between num1 and num2 is less than 100.
  const dotPattern = /^(\d{3,})\.(\d{3,})$/;
  const dotMatch = str.match(dotPattern);
  if (dotMatch) {
    const num1 = parseFloat(dotMatch[1]);
    const num2 = parseFloat(dotMatch[2]);
    if (!isNaN(num1) && !isNaN(num2) && Math.abs(num1 - num2) < 100) {
      return Number(((num1 + num2) / 2).toFixed(4));
    }
  }

  // 2. Split by common range delimiters: '-', 'to', '/', '_', or spaces separating numbers
  const parts = str.split(/\s*(?:-|to|\/|_)\s*/i);
  if (parts.length === 2) {
    const num1 = parseFloat(parts[0]);
    const num2 = parseFloat(parts[1]);
    if (!isNaN(num1) && !isNaN(num2)) {
      return Number(((num1 + num2) / 2).toFixed(4));
    }
  }

  // 3. Fallback: Parse single decimal number
  return parseFloat(str);
};

module.exports = { parseEntryPrice };
