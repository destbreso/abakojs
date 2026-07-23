"use strict";

const { ArgumentError } = require("./errors");
const {
  RoundingMode,
  setDefaultRounding,
  getDefaultRounding,
  resolveRounding,
  parseDecimal,
  roundTo,
  addDec,
  subDec,
  mulDec,
  divDec,
  cmpDec,
  decToNumber,
  decToMinorUnits,
  pow10,
} = require("./decimal");

const HUNDRED = { coef: 100n, scale: 0 };
const ZERO = { coef: 0n, scale: 0 };

/** True when a parsed decimal represents an exact integer. */
function isIntegerDec(dec) {
  return dec.scale === 0 || dec.coef % pow10(dec.scale) === 0n;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Round `amount` to `decimals` places (default 2) using `rounding`
 * (default: the module default, HALF_EVEN). Returns NaN for invalid input.
 */
function value(amount, decimals = 2, rounding) {
  const d = parseDecimal(amount);
  if (d === null) return NaN;
  return decToNumber(roundTo(d, decimals, resolveRounding(rounding)));
}

/**
 * Compare two amounts after rounding both to `decimals`.
 * @returns {-1|0|1|number} NaN if either input is invalid.
 */
function compare(lhAmount, rhAmount, decimals = 2, rounding) {
  const a = parseDecimal(lhAmount);
  const b = parseDecimal(rhAmount);
  if (a === null || b === null) return NaN;
  const m = resolveRounding(rounding);
  return cmpDec(roundTo(a, decimals, m), roundTo(b, decimals, m));
}

/** Integer minor units at `atomicNumber` scale (default 2 → cents). NaN if invalid. */
function atom(amount, atomicNumber = 2, rounding) {
  const d = parseDecimal(amount);
  if (d === null) return NaN;
  return decToMinorUnits(d, atomicNumber, rounding);
}

/** Alias for atom(amount, 2). */
function toCents(amount) {
  return atom(amount, 2);
}

/**
 * Integer minor units at `atomicNumber` scale as an exact BigInt (internal use,
 * e.g. partition). Returns null for invalid input.
 */
function atomBig(amount, atomicNumber = 2, rounding) {
  const d = parseDecimal(amount);
  if (d === null) return null;
  return roundTo(d, atomicNumber, resolveRounding(rounding)).coef;
}

/** Convert integer cents back to an amount. Throws on negative / non-integer. */
function cents2Amount(cents) {
  const d = parseDecimal(cents);
  if (d === null) return NaN;
  if (d.coef < 0n || !isIntegerDec(d)) {
    throw new ArgumentError("cents must be positive integer");
  }
  return decToNumber(divDec(d, HUNDRED, 2, RoundingMode.HALF_EVEN));
}

/** Apply an fx/multiplication factor. NaN if either input is invalid. */
function fx(amount, factor, decimals = 2, rounding) {
  const a = parseDecimal(amount);
  const f = parseDecimal(factor);
  if (a === null || f === null) return NaN;
  return decToNumber(roundTo(mulDec(a, f), decimals, resolveRounding(rounding)));
}

/**
 * Pull an optional trailing options object ({ decimals, rounding }) off a
 * variadic argument list. Mutates `list` (pops the options object if present).
 */
function takeOptions(list) {
  let decimals = 2;
  let rounding;
  if (list.length > 0) {
    const last = list[list.length - 1];
    if (last !== null && typeof last === "object" && !Array.isArray(last)) {
      list.pop();
      if (typeof last.decimals === "number") decimals = last.decimals;
      if (last.rounding !== undefined) rounding = last.rounding;
    }
  }
  return { decimals, rounding };
}

/** Aggregate any number of amounts (variadic, array, or spread). NaN if any invalid. */
function sum(...amount) {
  const list = [...amount];
  const { decimals, rounding } = takeOptions(list);
  if (list.length === 0) return NaN;
  if (list.length === 1 && Array.isArray(list[0])) {
    return sum(...list[0], { decimals, rounding });
  }

  let acc = ZERO;
  for (const item of list) {
    if (Array.isArray(item)) return NaN;
    const d = parseDecimal(item);
    if (d === null) return NaN;
    acc = addDec(acc, d);
  }
  return decToNumber(roundTo(acc, decimals, resolveRounding(rounding)));
}

/** Add two amounts exactly. NaN if either is invalid. */
function add(x, y, decimals = 2, rounding) {
  const a = parseDecimal(x);
  const b = parseDecimal(y);
  if (a === null || b === null) return NaN;
  return decToNumber(roundTo(addDec(a, b), decimals, resolveRounding(rounding)));
}

/** Subtract y from x exactly. NaN if either is invalid. */
function subtract(x, y, decimals = 2, rounding) {
  const a = parseDecimal(x);
  const b = parseDecimal(y);
  if (a === null || b === null) return NaN;
  return decToNumber(roundTo(subDec(a, b), decimals, resolveRounding(rounding)));
}

/** p% of amount. Throws for negative p (a percentage of an amount is non-negative here). */
function percent(amount, p, decimals = 2, rounding) {
  if (p < 0) throw new ArgumentError("p must be positive (%)");
  if (p === 0) return 0;
  const a = parseDecimal(amount);
  const pp = parseDecimal(p);
  if (a === null || pp === null) return NaN;
  return decToNumber(
    divDec(mulDec(a, pp), HUNDRED, decimals, resolveRounding(rounding)),
  );
}

/** Multiply amount by factor (default 1). NaN if invalid. */
function multiply(amount, factor = 1, decimals = 2, rounding) {
  return fx(amount, factor, decimals, rounding);
}

/** Divide amount by divisor (default 1), exact long division. Throws on divide-by-zero. */
function divide(amount, factor = 1, decimals = 2, rounding) {
  const a = parseDecimal(amount);
  if (a === null) return NaN;
  const f = parseDecimal(factor);
  if (f === null) return NaN;
  if (f.coef === 0n) throw new ArgumentError("cant divide by zero");
  return decToNumber(divDec(a, f, decimals, resolveRounding(rounding)));
}

// ─── Guards & helpers ─────────────────────────────────────────────────────────

function isValid(amount) {
  return parseDecimal(amount) !== null;
}
function isZero(amount, decimals = 2, rounding) {
  return value(amount, decimals, rounding) === 0;
}
function isPositive(amount, decimals = 2, rounding) {
  return value(amount, decimals, rounding) > 0;
}
function isNegative(amount, decimals = 2, rounding) {
  return value(amount, decimals, rounding) < 0;
}
function abs(amount, decimals = 2, rounding) {
  return Math.abs(value(amount, decimals, rounding));
}

function minmax(kind, amounts) {
  const args = [...amounts];
  const { decimals, rounding } = takeOptions(args);
  const flat = args.flat();
  if (flat.length === 0) return NaN;
  const m = resolveRounding(rounding);
  let best = null;
  for (const a of flat) {
    const d = parseDecimal(a);
    if (d === null) return NaN;
    const r = roundTo(d, decimals, m);
    if (best === null) best = r;
    else {
      const c = cmpDec(r, best);
      if ((kind === "min" && c < 0) || (kind === "max" && c > 0)) best = r;
    }
  }
  return decToNumber(best);
}
function min(...amounts) {
  return minmax("min", amounts);
}
function max(...amounts) {
  return minmax("max", amounts);
}

function equal(lh, rh, decimals = 2, rounding) {
  return compare(lh, rh, decimals, rounding) === 0;
}
function greaterThan(lh, rh, decimals = 2, rounding) {
  return compare(lh, rh, decimals, rounding) === 1;
}
function greaterThanOrEqual(lh, rh, decimals = 2, rounding) {
  const c = compare(lh, rh, decimals, rounding);
  return c === 0 || c === 1;
}
function lessThan(lh, rh, decimals = 2, rounding) {
  return compare(lh, rh, decimals, rounding) === -1;
}
function lessThanOrEqual(lh, rh, decimals = 2, rounding) {
  const c = compare(lh, rh, decimals, rounding);
  return c === 0 || c === -1;
}

module.exports = {
  // rounding config
  RoundingMode,
  setDefaultRounding,
  getDefaultRounding,
  // core
  value,
  compare,
  atom,
  atomBig,
  toCents,
  cents2Amount,
  fx,
  sum,
  add,
  subtract,
  percent,
  multiply,
  divide,
  // guards / helpers
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
};
