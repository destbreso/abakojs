/* eslint-disable max-len */
const arithmetic = require("./lib/arithmetic");
const { ArgumentError } = require("./lib/errors");
const {
  partition,
  allocate,
  applyDiscount,
  applyMaxTax,
  applySumTax,
  applyTax,
  maxTax,
  applyMaxDiscount,
  applySumDiscount,
  addPercent,
  deductPercent,
  maxFee,
  addMaxFee,
  addFees,
  deductMaxFee,
  deductFees,
  grossFromNet,
  netFromGross,
  taxFromGross,
} = require("./lib/recipes");
const {
  format: formatCurrency,
  convert: convertCurrency,
} = require("./lib/currency");
const { chain } = require("./lib/chain");

/**
 * Compute currency value from Number
 * @public
 * @param {(Number|String)} amount numeric value
 * @param {Number} [decimals] integer
 * @returns {Number} Monetary value of amount
 *
 * @example
 * value(10.253) // 10.26
 * value('10.990001',4) // 10.9901
 * value('10.990001') // 11.00
 * value('abcd') // NaN
 * value(null|undefined|any[]|object) // NaN
 */
const value = (amount, decimals = 2, rounding) => arithmetic.value(amount, decimals, rounding);

/**
 * Compute cents value from Number
 * @public
 * @param {Number|String} amount numeric value
 * @returns {Number} Monetary value in cents of amount
 *
 * @example
 *
 * cents(0.01) // 1
 * cents(0.17) // 17
 * cents('3.12') // 312
 * cents(0.11001) // 12
 * cents('abcd') // NaN
 * cents(null|undefined|any[]|object) // NaN
 */
const cents = (amount) => arithmetic.toCents(amount);

/**
 * Compute currency amount from cents
 * @public
 * @param {Number|String} cents numeric value (positive integer)
 * @returns {Number} Monetary value of cents
 *
 * @throws Will throw an error if the argument is negative or not integer.
 * @throws {ArgumentError} cents must be positive integer
 *
 * @example
 *
 * cents2Amount(157) // 1.57
 * cents2Amount('5513') // 55.13
 * cents2Amount(157) // 1.57
 * cents2Amount('abcd') // NaN
 * cents2Amount(null|undefined|any[]|object) // NaN
 * cents2Amount(12.5) // ArgumentError: cents must be positive integer
 * cents2Amount(-25) // ArgumentError: cents must be positive integer
 */
// eslint-disable-next-line no-shadow
const cents2Amount = (cents) => arithmetic.cents2Amount(cents);

/**
 * Apply fx rate to currency amount
 * @public
 * @param {(Number|String)} amount numeric value
 * @param {Number} fxRate number
 * @param {Number=} decimals integer
 * @returns {Number} Monetary value of amount*fxRate
 *
 * @example
 * fx(100, 1.55235) // 155.24
 * fx('100', 0.01) // 1
 * fx(100, 0.0000155235) // 0.01
 * fx(100, 0.0000155235,4) // 0.0016
 */
const fx = (amount, fxRate, decimals = 2, rounding) => arithmetic.fx(amount, fxRate, decimals, rounding);

/**
 * Aggregate amounts
 * @public
 * @param {(number | string | number[] | string[])} amounts numeric values
 * @returns {Number} Monetary value of total amount
 * @example
 *
 * sum(0.1,0.2) // 0.3
 * sum(0.1,0.2,'-0.3') // 0
 * sum([0.1,0.2,-0.3]) // 0
 * sum(...['0.1','0.2','-0.3']) // 0
 * sum(0.12345678, 0.00000001, { decimals: 8 }) // 0.12345679
 * sum('abcd','{a: 1}') // NaN
 */
const sum = (...amounts) => arithmetic.sum(...amounts);

/**
 * Compute an amount fraction from a percent value
 * @public
 * @param {Number} amount base amount value
 * @param {Number} p percent value
 * @param {Number} [decimals] decimal places (default 2)
 * @returns {Number} Monetary value of amount*p/100
 *
 */
const percent = (amount, p, decimals = 2, rounding) => arithmetic.percent(amount, p, decimals, rounding);

/**
 * Difference of two amounts
 *
 * @param {Number} x - amount1
 * @param {Number} y - amount2
 * @param {Number} [decimals] decimal places (default 2)
 * @returns {Number} Monetary value of amount1 - amount2
 *
 * @example
 *
 * subtract(1.01, 0.99) // 0.02
 * subtract(23.42, 19.13) // 4.29
 */

const subtract = (x, y, decimals = 2, rounding) => arithmetic.subtract(x, y, decimals, rounding);

/**
 * add two amounts
 *
 * @param {Number} x - amount1
 * @param {Number} y - amount2
 * @param {Number} [decimals] decimal places (default 2)
 * @returns {Number} Monetary value of amount1 + amount2
 *
 * @example
 *
 * add(0.1, 0.2) // 0.3
 */

const add = (x, y, decimals = 2, rounding) => arithmetic.add(x, y, decimals, rounding);

/**
 * Multiply an amount by a factor
 *
 * @param {(Number|String)} amount numeric value
 * @param {Number=} factor integer
 * @param {Number=} decimals integer
 * @returns {Number} Monetary value of amount*factor
 *
 * @example
 * fx(100, 1.55235) // 155.24
 * fx('100', 0.01) // 1
 * fx(100, 0.0000155235) // 0.01
 * fx(100, 0.0000155235,4) // 0.0016
 *
 */
const multiply = (amount, factor = 1, decimals = 2, rounding) => arithmetic.multiply(amount, factor, decimals, rounding);

/**
 * Divide an amount by a divisor
 *
 * @param {(Number|String)} amount numeric value
 * @param {Number=} divisor integer
 * @param {Number=} decimals integer
 * @returns {Number} Monetary value of amount/factor
 *
 * @throws Will throw an error if the divisor is zero.
 * @throws {ArgumentError} cant divide by zero
 *
 * @example
 * divide(123.451, 1) // 123.46
 * divide(123.45 , 2) // 61.73
 * divide(123.451 , 2) // 61.73
 * divide('123.451' , 2) // 61.73
 * divide(10 , 0) // ArgumentError: cant divide by zero
 * divide('abcd' , 2) // NaN
 * divide(null|undefined|any[]|object , 1) // NaN
 */
const divide = (amount, divisor = 1, decimals = 2, rounding) => arithmetic.divide(amount, divisor, decimals, rounding);

/**
 * Compare two monetary amounts
 * @public
 * @param {(Number|String)} lh left-hand amount
 * @param {(Number|String)} rh right-hand amount
 * @param {Number} [decimals] integer
 * @returns {-1|0|1} -1 if lh < rh, 0 if equal, 1 if lh > rh
 *
 * @example
 * compare(1, 2)    // -1
 * compare(2, 1)    // 1
 * compare(1, 1)    // 0
 * compare(NaN, 1)  // NaN
 */
const compare = (lh, rh, decimals = 2, rounding) => arithmetic.compare(lh, rh, decimals, rounding);

/**
 * Check if a value is a valid numeric monetary amount
 * @public
 * @param {*} amount any value
 * @returns {boolean}
 *
 * @example
 * isValid(1)         // true
 * isValid('10.5')    // true
 * isValid(0)         // true
 * isValid(NaN)       // false
 * isValid(null)      // false
 * isValid(undefined) // false
 * isValid('abc')     // false
 * isValid([])        // false
 * isValid({})        // false
 */
const isValid = (amount) => arithmetic.isValid(amount);

/**
 * Check if monetary value rounds to exactly 0
 * @public
 * @param {(Number|String)} amount numeric value
 * @param {Number} [decimals] decimal places (default 2)
 * @returns {boolean}
 *
 * @example
 * isZero(0)     // true
 * isZero(1)     // false
 * isZero(0.001) // false (rounds up to 0.01)
 */
const isZero = (amount, decimals = 2) => arithmetic.isZero(amount, decimals);

/**
 * Check if monetary value is greater than 0
 * @public
 * @param {(Number|String)} amount numeric value
 * @param {Number} [decimals] decimal places (default 2)
 * @returns {boolean}
 *
 * @example
 * isPositive(1)  // true
 * isPositive(0)  // false
 * isPositive(-1) // false
 */
const isPositive = (amount, decimals = 2) => arithmetic.isPositive(amount, decimals);

/**
 * Check if monetary value is less than 0
 * @public
 * @param {(Number|String)} amount numeric value
 * @param {Number} [decimals] decimal places (default 2)
 * @returns {boolean}
 *
 * @example
 * isNegative(-1) // true
 * isNegative(0)  // false
 * isNegative(1)  // false
 */
const isNegative = (amount, decimals = 2) => arithmetic.isNegative(amount, decimals);

/**
 * Returns the absolute (non-negative) monetary value
 * @public
 * @param {(Number|String)} amount numeric value
 * @param {Number} [decimals] integer
 * @returns {Number}
 *
 * @example
 * abs(-10.50) // 10.50
 * abs(10.50)  // 10.50
 * abs(0)      // 0
 */
const abs = (amount, decimals = 2) => arithmetic.abs(amount, decimals);

/**
 * Returns the smallest monetary value from a list of amounts
 * @public
 * @param {(number | string | number[] | string[])} amounts numeric values
 * @returns {Number}
 *
 * @example
 * min(10, 20, 5)    // 5
 * min([10, 20, 5])  // 5
 */
const min = (...amounts) => arithmetic.min(...amounts);

/**
 * Returns the largest monetary value from a list of amounts
 * @public
 * @param {(number | string | number[] | string[])} amounts numeric values
 * @returns {Number}
 *
 * @example
 * max(10, 20, 5)    // 20
 * max([10, 20, 5])  // 20
 */
const max = (...amounts) => arithmetic.max(...amounts);

/**
 * Check if two monetary amounts are equal after rounding
 * @public
 * @param {(Number|String)} lh left-hand amount
 * @param {(Number|String)} rh right-hand amount
 * @param {Number} [decimals] integer
 * @returns {boolean}
 *
 * @example
 * equal(1, 1)       // true
 * equal(0.1, 0.10)  // true
 * equal(1, 2)       // false
 */
const equal = (lh, rh, decimals = 2) => arithmetic.equal(lh, rh, decimals);

/**
 * Check if lh is strictly greater than rh
 * @public
 * @param {(Number|String)} lh left-hand amount
 * @param {(Number|String)} rh right-hand amount
 * @param {Number} [decimals] integer
 * @returns {boolean}
 */
const greaterThan = (lh, rh, decimals = 2) => arithmetic.greaterThan(lh, rh, decimals);

/**
 * Check if lh is greater than or equal to rh
 * @public
 * @param {(Number|String)} lh left-hand amount
 * @param {(Number|String)} rh right-hand amount
 * @param {Number} [decimals] integer
 * @returns {boolean}
 */
const greaterThanOrEqual = (lh, rh, decimals = 2) => arithmetic.greaterThanOrEqual(lh, rh, decimals);

/**
 * Check if lh is strictly less than rh
 * @public
 * @param {(Number|String)} lh left-hand amount
 * @param {(Number|String)} rh right-hand amount
 * @param {Number} [decimals] integer
 * @returns {boolean}
 */
const lessThan = (lh, rh, decimals = 2) => arithmetic.lessThan(lh, rh, decimals);

/**
 * Check if lh is less than or equal to rh
 * @public
 * @param {(Number|String)} lh left-hand amount
 * @param {(Number|String)} rh right-hand amount
 * @param {Number} [decimals] integer
 * @returns {boolean}
 */
const lessThanOrEqual = (lh, rh, decimals = 2) => arithmetic.lessThanOrEqual(lh, rh, decimals);

/**
 * Format a monetary amount as a currency string.
 * Uses Intl.NumberFormat for standard currencies; handles BTC, ETH, SAT manually.
 *
 * @param {(Number|String)} amount numeric value
 * @param {String} [currencyCode='USD'] ISO 4217 currency code or 'BTC'/'ETH'/'SAT'
 * @param {String} [locale] BCP 47 locale (e.g. 'en-US', 'de-DE')
 * @param {Object} [options] extra Intl.NumberFormat options
 * @returns {String} formatted string
 *
 * @throws {ArgumentError} if amount is not numeric or currency code is unsupported
 *
 * @example
 * format(1234.56, 'USD', 'en-US')  // '$1,234.56'
 * format(1234.56, 'EUR', 'de-DE')  // '1.234,56 €'
 * format(0.12345678, 'BTC')        // '₿0.12345678'
 */
const format = (amount, currencyCode, locale, options) => formatCurrency(amount, currencyCode, locale, options);

/**
 * Convert an amount from one currency to another using a rates table.
 * The rates object maps currency codes to their value relative to a common base.
 *
 * @param {(Number|String)} amount numeric value in `from` currency
 * @param {String} from source currency code (e.g. 'USD')
 * @param {String} to target currency code (e.g. 'EUR')
 * @param {Object} rates map of currency codes to rates (same base)
 * @param {Number} [decimals=2] decimal precision for the result
 * @returns {Number} converted amount
 *
 * @throws {ArgumentError} if a currency code is missing from rates or rate is zero
 *
 * @example
 * const rates = { USD: 1, EUR: 0.92, GBP: 0.79 };
 * convert(100, 'USD', 'EUR', rates)       // 92
 * convert(100, 'EUR', 'USD', rates)       // 108.7
 * convert(100, 'USD', 'BTC', rates, 8)    // crypto-precision result
 */
const convert = (amount, from, to, rates, decimals) => convertCurrency(amount, from, to, rates, decimals);

/**
 * @summary Recipes
 * @namespace recipes
 * @public
 */
const recipes = {
  /**
   * Split an amount into N equal parts, or by percentage weights.
   * Remainder cents are distributed to the first parts so the total is always exact.
   *
   * @param {(Number|String)} amount numeric value
   * @param {(Number|Number[])} parts integer or percent split (array of percent parts)
   * @returns {Number[]}
   *
   * @throws {ArgumentError} parts must be a positive integer or an array with a partition of 100
   *
   * @example
   * split(1, 2)            // [0.5, 0.5]
   * split(1, 3)            // [0.34, 0.33, 0.33]
   * split(1, [50, 50])     // [0.5, 0.5]
   * split(10, [41,33,15,9,2]) // [4.1, 3.3, 1.5, 0.9, 0.2]
   * split(100, 0)          // ArgumentError
   */
  split: (amount, ...parts) => partition(amount, ...parts),

  /**
   * @deprecated Use `split` instead.
   */
  partition: (amount, ...parts) => partition(amount, ...parts),

  /**
   * Allocate an amount across arbitrary positive ratios (they need not sum to
   * 100 or to 1). Exact: parts always sum back to the amount. The accounting
   * "allocation" primitive.
   *
   * @param {(Number|String)} amount numeric value
   * @param {Number[]} ratios array of non-negative ratios
   * @returns {Number[]}
   *
   * @example
   * allocate(1000, [7, 3])       // [700, 300]
   * allocate(100, [1, 1, 1])     // [33.34, 33.33, 33.33]
   * allocate(0.05, [1, 1])       // [0.03, 0.02]
   */
  allocate: (amount, ratios) => allocate(amount, ratios),

  // ─── New names (preferred) ──────────────────────────────────────────────

  /**
   * Add a percentage surcharge to an amount.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @returns {Number}
   * @example addPercent(100, 10) // 110
   */
  addPercent: (amount, p) => addPercent(amount, p),

  /**
   * Deduct a percentage from an amount.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @returns {Number}
   * @example deductPercent(100, 10) // 90
   */
  deductPercent: (amount, p) => deductPercent(amount, p),

  /**
   * Returns the larger of: p% of amount, or a fixed fee.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @param {Number} fee fixed fee
   * @returns {Number}
   * @example maxFee(100, 10, 20) // 20
   */
  maxFee: (amount, p, fee) => maxFee(amount, p, fee),

  /**
   * Add the larger of p% or fixed fee to the amount.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @param {Number} fee fixed fee
   * @returns {Number}
   * @example addMaxFee(100, 10, 20) // 120
   */
  addMaxFee: (amount, p, fee) => addMaxFee(amount, p, fee),

  /**
   * Add both p% and fixed fee to the amount.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @param {Number} fee fixed fee
   * @returns {Number}
   * @example addFees(100, 10, 20) // 130
   */
  addFees: (amount, p, fee) => addFees(amount, p, fee),

  /**
   * Deduct the larger of p% or fixed fee from the amount.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @param {Number} fee fixed fee
   * @returns {Number}
   * @example deductMaxFee(100, 10, 20) // 80
   */
  deductMaxFee: (amount, p, fee) => deductMaxFee(amount, p, fee),

  /**
   * Deduct both p% and fixed fee from the amount.
   * @param {(Number|String)} amount numeric value
   * @param {Number} p percent value
   * @param {Number} fee fixed fee
   * @returns {Number}
   * @example deductFees(100, 10, 20) // 70
   */
  deductFees: (amount, p, fee) => deductFees(amount, p, fee),

  // ─── Tax-inclusive / tax-exclusive (VAT) ───────────────────────────────

  /**
   * Gross (tax-inclusive) from a net (tax-exclusive) amount.
   * @param {(Number|String)} net numeric value
   * @param {Number} p tax percent
   * @returns {Number}
   * @example grossFromNet(100, 21) // 121
   */
  grossFromNet: (net, p) => grossFromNet(net, p),

  /**
   * Net (tax-exclusive) from a gross (tax-inclusive) amount: gross / (1 + p/100).
   * @param {(Number|String)} gross numeric value
   * @param {Number} p tax percent
   * @returns {Number}
   * @example netFromGross(121, 21) // 100
   */
  netFromGross: (gross, p) => netFromGross(gross, p),

  /**
   * The tax portion contained in a gross (tax-inclusive) amount.
   * @param {(Number|String)} gross numeric value
   * @param {Number} p tax percent
   * @returns {Number}
   * @example taxFromGross(121, 21) // 21
   */
  taxFromGross: (gross, p) => taxFromGross(gross, p),

  // ─── Deprecated (kept for backward compatibility) ──────────────────────

  /**
   * @deprecated Use `maxFee` instead.
   */
  maxTax: (amount, p, fee) => maxTax(amount, p, fee),
  /**
   * @deprecated Use `deductPercent` instead.
   */
  applyDiscount: (amount, p) => applyDiscount(amount, p),
  /**
   * @deprecated Use `addPercent` instead.
   */
  applyTax: (amount, p) => applyTax(amount, p),
  /**
   * @deprecated Use `addMaxFee` instead.
   */
  applyMaxTax: (amount, p, fee) => applyMaxTax(amount, p, fee),
  /**
   * @deprecated Use `addFees` instead.
   */
  applySumTax: (amount, p, fee) => applySumTax(amount, p, fee),
  /**
   * @deprecated Use `deductMaxFee` instead.
   */
  applyMaxDiscount: (amount, p, fee) => applyMaxDiscount(amount, p, fee),
  /**
   * @deprecated Use `deductFees` instead.
   */
  applySumDiscount: (amount, p, fee) => applySumDiscount(amount, p, fee),
};

module.exports = {
  value,
  cents,
  cents2Amount,
  fx,
  sum,
  total: sum,
  percent,
  add,
  subtract,
  multiply,
  divide,
  compare,
  isValid,
  isZero,
  isPositive,
  isNegative,
  abs,
  min,
  max,
  equal,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  format,
  convert,
  chain,
  ArgumentError,
  // rounding configuration
  RoundingMode: arithmetic.RoundingMode,
  setDefaultRounding: arithmetic.setDefaultRounding,
  getDefaultRounding: arithmetic.getDefaultRounding,
  recipes,
  ...recipes,
};
