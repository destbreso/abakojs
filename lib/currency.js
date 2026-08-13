const { fx, value } = require("./arithmetic");
const { ArgumentError } = require("./errors");

/**
 * Format a monetary amount as a currency string using Intl.NumberFormat.
 *
 * @param {number|string} amount - numeric value
 * @param {string} [currencyCode='USD'] - ISO 4217 currency code (e.g. 'USD', 'EUR', 'BTC')
 * @param {string} [locale] - BCP 47 locale string (e.g. 'en-US', 'de-DE'). Defaults to runtime default.
 * @param {object} [options] - extra Intl.NumberFormat options to merge
 * @returns {string} formatted string
 */
function format(amount, currencyCode = "USD", locale, options = {}) {
  const parsed = parseFloat(amount);
  if (Object.is(parsed, NaN)) throw new ArgumentError("amount must be numeric");

  const code = currencyCode.toUpperCase();

  // Crypto currencies not in ISO 4217, handle manually
  const cryptoCurrencies = {
    BTC: { symbol: "₿", decimals: 8 },
    ETH: { symbol: "Ξ", decimals: 8 },
    SAT: { symbol: "sat", decimals: 0 },
    SATS: { symbol: "sats", decimals: 0 },
  };

  const crypto = cryptoCurrencies[code];
  if (crypto) {
    const rounded = value(parsed, crypto.decimals);
    const formatted = new Intl.NumberFormat(locale || undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: crypto.decimals,
      ...options,
    }).format(rounded);
    return `${crypto.symbol}${formatted}`;
  }

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: code,
      ...options,
    }).format(parsed);
  } catch (e) {
    throw new ArgumentError(`unsupported currency code: ${currencyCode}`);
  }
}

/**
 * Convert an amount from one currency to another using a rates table.
 *
 * The rates object maps currency codes to their value relative to a common base.
 * Example: { USD: 1, EUR: 0.92, GBP: 0.79 } means 1 base unit = 0.92 EUR.
 *
 * @param {number|string} amount - numeric value in `from` currency
 * @param {string} from - source currency code
 * @param {string} to - target currency code
 * @param {object} rates - map of currency codes to exchange rates (same base)
 * @param {number} [decimals=2] - decimal precision for the result
 * @returns {number} converted amount
 */
function convert(amount, from, to, rates, decimals = 2) {
  const parsed = parseFloat(amount);
  if (Object.is(parsed, NaN)) return NaN;

  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  if (fromCode === toCode) return value(parsed, decimals);

  const fromRate = rates[fromCode];
  const toRate = rates[toCode];

  if (fromRate === undefined || fromRate === null) {
    throw new ArgumentError(`missing rate for currency: ${fromCode}`);
  }
  if (toRate === undefined || toRate === null) {
    throw new ArgumentError(`missing rate for currency: ${toCode}`);
  }
  if (fromRate === 0) {
    throw new ArgumentError(`rate for ${fromCode} cannot be zero`);
  }

  const rate = toRate / fromRate;
  return fx(parsed, rate, decimals);
}

module.exports = { format, convert };
