// Type definitions for abakojs
// Zero-dependency monetary arithmetic · ESM + CJS · TypeScript ready

export declare class ArgumentError extends Error {
  constructor(message: string);
  name: "ArgumentError";
}

// ─── Rounding ───────────────────────────────────────────────────────────────

/** Rounding mode names. Default is HALF_EVEN (banker's). */
export type RoundingMode =
  | "HALF_EVEN"
  | "HALF_UP"
  | "HALF_DOWN"
  | "UP"
  | "DOWN"
  | "CEIL"
  | "FLOOR";

/** Rounding-mode constants (use these instead of raw strings). */
export declare const RoundingMode: {
  readonly HALF_EVEN: "HALF_EVEN";
  readonly HALF_UP: "HALF_UP";
  readonly HALF_DOWN: "HALF_DOWN";
  readonly UP: "UP";
  readonly DOWN: "DOWN";
  readonly CEIL: "CEIL";
  readonly FLOOR: "FLOOR";
};

/** Set the process-wide default rounding mode (default: HALF_EVEN). */
export declare function setDefaultRounding(mode: RoundingMode): void;

/** Get the current default rounding mode. */
export declare function getDefaultRounding(): RoundingMode;

// ─── Fluent chain (optional convenience) ────────────────────────────────────

/** A fluent, immutable pipeline over a plain number. `.value` unwraps it. */
export interface Chain {
  /** The current plain-number value. */
  readonly value: number;
  valueOf(): number;
  done(): number;
  add(y: number | string): Chain;
  subtract(y: number | string): Chain;
  multiply(factor: number): Chain;
  divide(divisor: number): Chain;
  fx(rate: number): Chain;
  addPercent(p: number): Chain;
  deductPercent(p: number): Chain;
  addFees(p: number, fee: number): Chain;
  deductFees(p: number, fee: number): Chain;
  addMaxFee(p: number, fee: number): Chain;
  deductMaxFee(p: number, fee: number): Chain;
  grossFromNet(p: number): Chain;
  netFromGross(p: number): Chain;
  taxFromGross(p: number): Chain;
  /** Terminal: allocate across ratios → number[]. */
  allocate(ratios: number[]): number[];
  /** Terminal: split into parts → number[]. */
  split(...parts: Array<number | number[]>): number[];
  /** Terminal: format as a currency string. */
  format(currencyCode?: string, locale?: string, options?: Intl.NumberFormatOptions): string;
}

/**
 * Start a fluent pipeline over `amount`. Convenience only: the whole library
 * works on plain numbers without it, and you are never forced into a wrapper.
 */
export declare function chain(
  amount: number | string,
  decimals?: number,
  rounding?: RoundingMode,
): Chain;

// ─── Core arithmetic ────────────────────────────────────────────────────────

/**
 * Rounds `amount` to `decimals` places (default 2) using `rounding`
 * (default: the module default, HALF_EVEN). Returns NaN for non-numeric inputs.
 */
export declare function value(
  amount: number | string,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/** Converts a monetary amount to integer cents. */
export declare function cents(amount: number | string): number;

/**
 * Converts integer cents back to a monetary amount.
 * @throws {ArgumentError} if value is negative or not an integer
 */
export declare function cents2Amount(cents: number | string): number;

/**
 * Applies a foreign-exchange rate to an amount.
 */
export declare function fx(
  amount: number | string,
  fxRate: number,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/**
 * Adds monetary amounts safely. Accepts spread args or a single array.
 * Pass `{ decimals, rounding }` as the last argument for custom precision/mode.
 */
export declare function sum(
  amounts: Array<number | string>,
  options?: { decimals?: number; rounding?: RoundingMode },
): number;
export declare function sum(
  ...amounts: Array<number | string | { decimals?: number; rounding?: RoundingMode }>
): number;

/** Computes `p`% of `amount`. */
export declare function percent(
  amount: number | string,
  p: number,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/** Adds two monetary amounts. */
export declare function add(
  x: number | string,
  y: number | string,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/** Subtracts `y` from `x`. */
export declare function subtract(
  x: number | string,
  y: number | string,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/** Multiplies `amount` by `factor`. */
export declare function multiply(
  amount: number | string,
  factor?: number,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/**
 * Divides `amount` by `divisor`.
 * @throws {ArgumentError} if divisor is zero
 */
export declare function divide(
  amount: number | string,
  divisor?: number,
  decimals?: number,
  rounding?: RoundingMode,
): number;

/**
 * Compares two monetary values after rounding both to `decimals`.
 * @returns -1 if lh < rh, 0 if equal, 1 if lh > rh. NaN for invalid inputs.
 */
export declare function compare(
  lh: number | string,
  rh: number | string,
  decimals?: number,
  rounding?: RoundingMode,
): -1 | 0 | 1;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if `amount` is a valid numeric value (not NaN, null, undefined, array, object, or boolean). */
export declare function isValid(amount: unknown): boolean;

/** Returns true if the monetary value of `amount` rounds to exactly 0. */
export declare function isZero(
  amount: number | string,
  decimals?: number,
): boolean;

/** Returns true if the monetary value of `amount` is greater than 0. */
export declare function isPositive(
  amount: number | string,
  decimals?: number,
): boolean;

/** Returns true if the monetary value of `amount` is less than 0. */
export declare function isNegative(
  amount: number | string,
  decimals?: number,
): boolean;

/** Returns the absolute (non-negative) monetary value of `amount`. */
export declare function abs(amount: number | string, decimals?: number): number;

/** Returns the smallest monetary value from a list of amounts. Returns NaN if any value is invalid. */
export declare function min(
  ...amounts: Array<number | string | { decimals?: number }>
): number;
export declare function min(
  amounts: Array<number | string>,
  options?: { decimals?: number },
): number;

/** Returns the largest monetary value from a list of amounts. Returns NaN if any value is invalid. */
export declare function max(
  ...amounts: Array<number | string | { decimals?: number }>
): number;
export declare function max(
  amounts: Array<number | string>,
  options?: { decimals?: number },
): number;

/** Returns true if two monetary amounts are equal after rounding. */
export declare function equal(
  lh: number | string,
  rh: number | string,
  decimals?: number,
): boolean;

/** Returns true if lh is strictly greater than rh. */
export declare function greaterThan(
  lh: number | string,
  rh: number | string,
  decimals?: number,
): boolean;

/** Returns true if lh is greater than or equal to rh. */
export declare function greaterThanOrEqual(
  lh: number | string,
  rh: number | string,
  decimals?: number,
): boolean;

/** Returns true if lh is strictly less than rh. */
export declare function lessThan(
  lh: number | string,
  rh: number | string,
  decimals?: number,
): boolean;

/** Returns true if lh is less than or equal to rh. */
export declare function lessThanOrEqual(
  lh: number | string,
  rh: number | string,
  decimals?: number,
): boolean;

// ─── Currency formatting & conversion ───────────────────────────────────────

/**
 * Format a monetary amount as a currency string.
 * Uses `Intl.NumberFormat` for ISO 4217 currencies. Handles BTC, ETH, SAT manually.
 * @throws {ArgumentError} if amount is not numeric or currency code is unsupported
 */
export declare function format(
  amount: number | string,
  currencyCode?: string,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string;

/**
 * Convert an amount from one currency to another using a rates table.
 * The `rates` object maps currency codes to their exchange rate relative to a common base.
 * @throws {ArgumentError} if a currency code is missing from rates or rate is zero
 */
export declare function convert(
  amount: number | string,
  from: string,
  to: string,
  rates: Record<string, number>,
  decimals?: number,
): number;

// ─── Recipes — new names (preferred) ────────────────────────────────────────

/** Add a percentage surcharge to an amount. `addPercent(100, 10) → 110` */
export declare function addPercent(amount: number | string, p: number): number;

/** Deduct a percentage from an amount. `deductPercent(100, 10) → 90` */
export declare function deductPercent(
  amount: number | string,
  p: number,
): number;

/** Returns the larger of: p% of amount, or a fixed fee. `maxFee(100, 10, 20) → 20` */
export declare function maxFee(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** Add the larger of p% or fixed fee to the amount. `addMaxFee(100, 10, 20) → 120` */
export declare function addMaxFee(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** Add both p% and fixed fee to the amount. `addFees(100, 10, 20) → 130` */
export declare function addFees(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** Deduct the larger of p% or fixed fee from the amount. `deductMaxFee(100, 10, 20) → 80` */
export declare function deductMaxFee(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** Deduct both p% and fixed fee from the amount. `deductFees(100, 10, 20) → 70` */
export declare function deductFees(
  amount: number | string,
  p: number,
  fee: number,
): number;

// ─── Recipes — tax-inclusive / tax-exclusive (VAT) ──────────────────────────

/** Gross (tax-inclusive) from a net (tax-exclusive) amount. `grossFromNet(100, 21) → 121` */
export declare function grossFromNet(net: number | string, p: number): number;

/** Net (tax-exclusive) from a gross (tax-inclusive) amount. `netFromGross(121, 21) → 100` */
export declare function netFromGross(gross: number | string, p: number): number;

/** The tax portion contained in a gross (tax-inclusive) amount. `taxFromGross(121, 21) → 21` */
export declare function taxFromGross(gross: number | string, p: number): number;

// ─── Recipes — deprecated (backward compatibility) ──────────────────────────

/** @deprecated Use `maxFee` instead. */
export declare function maxTax(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** @deprecated Use `deductPercent` instead. */
export declare function applyDiscount(
  amount: number | string,
  p: number,
): number;

/** @deprecated Use `addPercent` instead. */
export declare function applyTax(amount: number | string, p: number): number;

/** @deprecated Use `addMaxFee` instead. */
export declare function applyMaxTax(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** @deprecated Use `addFees` instead. */
export declare function applySumTax(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** @deprecated Use `deductMaxFee` instead. */
export declare function applyMaxDiscount(
  amount: number | string,
  p: number,
  fee: number,
): number;

/** @deprecated Use `deductFees` instead. */
export declare function applySumDiscount(
  amount: number | string,
  p: number,
  fee: number,
): number;

/**
 * Splits `amount` into N equal parts, or by percentage weights.
 * Remainder cents are distributed to the first parts so the total is always exact.
 * @throws {ArgumentError} if parts are invalid or percentages don't sum to 100
 */
export declare function split(amount: number | string, parts: number): number[];
export declare function split(
  amount: number | string,
  percentParts: number[],
): number[];
export declare function split(
  amount: number | string,
  first: number,
  ...rest: number[]
): number[];
export declare function split(amount: number | string): number[];

/**
 * Allocate `amount` across arbitrary positive `ratios` (need not sum to 100 or 1).
 * Exact: parts always sum back to the amount. The accounting allocation primitive.
 * @throws {ArgumentError} if ratios is empty, has a negative entry, or sums to 0
 */
export declare function allocate(
  amount: number | string,
  ratios: number[],
): number[];

/** Alias of `sum`: total any number of amounts. */
export declare function total(
  amounts: Array<number | string>,
  options?: { decimals?: number; rounding?: RoundingMode },
): number;
export declare function total(
  ...amounts: Array<number | string | { decimals?: number; rounding?: RoundingMode }>
): number;

/** @deprecated Use `split` instead. */
export declare function partition(
  amount: number | string,
  parts: number,
): number[];
/** @deprecated Use `split` instead. */
export declare function partition(
  amount: number | string,
  percentParts: number[],
): number[];
/** @deprecated Use `split` instead. */
export declare function partition(
  amount: number | string,
  first: number,
  ...rest: number[]
): number[];
/** @deprecated Use `split` instead. */
export declare function partition(amount: number | string): number[];

// ─── Recipes namespace ───────────────────────────────────────────────────────

export declare namespace recipes {
  // ─ New (preferred) ─
  function addPercent(amount: number | string, p: number): number;
  function deductPercent(amount: number | string, p: number): number;
  function maxFee(amount: number | string, p: number, fee: number): number;
  function addMaxFee(amount: number | string, p: number, fee: number): number;
  function addFees(amount: number | string, p: number, fee: number): number;
  function deductMaxFee(
    amount: number | string,
    p: number,
    fee: number,
  ): number;
  function deductFees(amount: number | string, p: number, fee: number): number;
  function grossFromNet(net: number | string, p: number): number;
  function netFromGross(gross: number | string, p: number): number;
  function taxFromGross(gross: number | string, p: number): number;
  // ─ Allocation ─
  function allocate(amount: number | string, ratios: number[]): number[];
  // ─ Deprecated ─
  /** @deprecated */ function maxTax(
    amount: number | string,
    p: number,
    fee: number,
  ): number;
  /** @deprecated */ function applyDiscount(
    amount: number | string,
    p: number,
  ): number;
  /** @deprecated */ function applyTax(
    amount: number | string,
    p: number,
  ): number;
  /** @deprecated */ function applyMaxTax(
    amount: number | string,
    p: number,
    fee: number,
  ): number;
  /** @deprecated */ function applySumTax(
    amount: number | string,
    p: number,
    fee: number,
  ): number;
  /** @deprecated */ function applyMaxDiscount(
    amount: number | string,
    p: number,
    fee: number,
  ): number;
  /** @deprecated */ function applySumDiscount(
    amount: number | string,
    p: number,
    fee: number,
  ): number;
  // ─ Split ─
  function split(amount: number | string, parts: number): number[];
  function split(amount: number | string, percentParts: number[]): number[];
  function split(
    amount: number | string,
    first: number,
    ...rest: number[]
  ): number[];
  function split(amount: number | string): number[];
  // ─ Deprecated ─
  /** @deprecated Use `split` instead. */
  function partition(amount: number | string, parts: number): number[];
  /** @deprecated Use `split` instead. */
  function partition(amount: number | string, percentParts: number[]): number[];
  /** @deprecated Use `split` instead. */
  function partition(
    amount: number | string,
    first: number,
    ...rest: number[]
  ): number[];
  /** @deprecated Use `split` instead. */
  function partition(amount: number | string): number[];
}

// ─── Default export ──────────────────────────────────────────────────────────

declare const money: {
  value: typeof value;
  cents: typeof cents;
  cents2Amount: typeof cents2Amount;
  fx: typeof fx;
  sum: typeof sum;
  total: typeof total;
  percent: typeof percent;
  add: typeof add;
  subtract: typeof subtract;
  multiply: typeof multiply;
  divide: typeof divide;
  compare: typeof compare;
  isValid: typeof isValid;
  isZero: typeof isZero;
  isPositive: typeof isPositive;
  isNegative: typeof isNegative;
  abs: typeof abs;
  min: typeof min;
  max: typeof max;
  equal: typeof equal;
  greaterThan: typeof greaterThan;
  greaterThanOrEqual: typeof greaterThanOrEqual;
  lessThan: typeof lessThan;
  lessThanOrEqual: typeof lessThanOrEqual;
  format: typeof format;
  convert: typeof convert;
  chain: typeof chain;
  ArgumentError: typeof ArgumentError;
  RoundingMode: typeof RoundingMode;
  setDefaultRounding: typeof setDefaultRounding;
  getDefaultRounding: typeof getDefaultRounding;
  recipes: typeof recipes;
  // New names
  addPercent: typeof addPercent;
  deductPercent: typeof deductPercent;
  maxFee: typeof maxFee;
  addMaxFee: typeof addMaxFee;
  addFees: typeof addFees;
  deductMaxFee: typeof deductMaxFee;
  deductFees: typeof deductFees;
  grossFromNet: typeof grossFromNet;
  netFromGross: typeof netFromGross;
  taxFromGross: typeof taxFromGross;
  split: typeof split;
  allocate: typeof allocate;
  // Deprecated names
  maxTax: typeof maxTax;
  applyDiscount: typeof applyDiscount;
  applyTax: typeof applyTax;
  applyMaxTax: typeof applyMaxTax;
  applySumTax: typeof applySumTax;
  applyMaxDiscount: typeof applyMaxDiscount;
  applySumDiscount: typeof applySumDiscount;
  partition: typeof partition;
};

export default money;
