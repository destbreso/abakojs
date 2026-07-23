"use strict";

const {
  sum,
  value,
  percent,
  atomBig,
  cents2Amount,
} = require("./arithmetic");
const {
  parseDecimal,
  pow10,
  addDec,
  subDec,
  mulDec,
  divDec,
  decToNumber,
  resolveRounding,
} = require("./decimal");
const { ArgumentError } = require("./errors");

const HUNDRED = { coef: 100n, scale: 0 };

/**
 * amount * (100 ± p) / 100, rounded once to 2 decimals. Single rounding of the
 * final amount (matches the classic `amount * (1 ± p/100)` semantics) so results
 * do not drift from a rounded-intermediate.
 */
function scaleByPercent(amount, p, sign) {
  const a = parseDecimal(amount);
  const pp = parseDecimal(p);
  if (a === null || pp === null) return NaN;
  const factor = sign > 0 ? addDec(HUNDRED, pp) : subDec(HUNDRED, pp);
  return decToNumber(divDec(mulDec(a, factor), HUNDRED, 2, resolveRounding()));
}

const PARTS_ERROR = "partsArg must be a positive integer or an array with a partition of 100";
const RATIOS_ERROR = "ratios must be a non-empty array of non-negative numbers summing to > 0";

/**
 * Distribute `totalUnits` (a signed BigInt of minor units) across `weights`
 * (BigInt integers over a shared `denom`). Largest-remainder method: floor each
 * ideal share, then hand out the leftover units to the first parts. Exact: the
 * parts always sum back to `totalUnits`.
 * @returns {bigint[]}
 */
function distribute(totalUnits, weights, denom) {
  const neg = totalUnits < 0n;
  const mag = neg ? -totalUnits : totalUnits;
  const floors = weights.map((w) => (mag * w) / denom);
  const distributed = floors.reduce((s, f) => s + f, 0n);
  let residuo = Number(mag - distributed); // in [0, nParts)
  const counts = floors.map((f) => {
    if (residuo > 0) {
      residuo -= 1;
      return f + 1n;
    }
    return f;
  });
  return neg ? counts.map((c) => -c) : counts;
}

/** Parse a weight list to BigInts over a shared denom (their exact sum). */
function scaleWeights(list, errMsg) {
  const decs = list.map((w) => parseDecimal(w));
  if (decs.some((w) => w === null || w.coef < 0n)) throw new ArgumentError(errMsg);
  const sMax = decs.reduce((s, w) => Math.max(s, w.scale), 0);
  const scaled = decs.map((w) => w.coef * pow10(sMax - w.scale));
  const denom = scaled.reduce((s, w) => s + w, 0n);
  return { scaled, denom, sMax };
}

/** Signed minor-unit BigInt -> amount (cents2Amount rejects negatives, so split the sign). */
function unitsToAmount(c) {
  const neg = c < 0n;
  const amt = cents2Amount(Number(neg ? -c : c));
  return neg ? -amt : amt;
}

/**
 * Split `amount` into N equal parts or by percentage weights (which must sum to 100).
 * Works in exact integer minor units, so the parts always sum back to `amount`:
 * no cent is lost or duplicated. Remainder units go to the first parts (stable),
 * preserving historical ordering (e.g. split(1, 3) → [0.34, 0.33, 0.33]).
 */
function partition(amount, ...partsArgs) {
  let partsArg;
  if (partsArgs.length === 0) partsArg = 1;
  else if (partsArgs.length === 1) [partsArg] = partsArgs;
  else partsArg = partsArgs;

  const totalUnits = atomBig(amount, 2);
  if (totalUnits === null) return NaN;

  let counts;
  if (!Array.isArray(partsArg) && Number.isInteger(partsArg)) {
    if (partsArg <= 0) throw new ArgumentError(PARTS_ERROR);
    const weights = new Array(partsArg).fill(1n);
    counts = distribute(totalUnits, weights, BigInt(partsArg));
  } else if (Array.isArray(partsArg)) {
    const { scaled, denom, sMax } = scaleWeights(partsArg, PARTS_ERROR);
    if (denom !== 100n * pow10(sMax)) throw new ArgumentError(PARTS_ERROR);
    counts = distribute(totalUnits, scaled, denom);
  } else {
    throw new ArgumentError(PARTS_ERROR);
  }

  return counts.map(unitsToAmount);
}

/**
 * Allocate `amount` across arbitrary positive `ratios` (they need NOT sum to 100
 * or to 1). The accounting/finance allocation primitive: distribute proportionally
 * with no cent lost. `allocate(1000, [7, 3]) → [700, 300]`, `allocate(100, [1,1,1])
 * → [33.34, 33.33, 33.33]`.
 */
function allocate(amount, ratios) {
  if (!Array.isArray(ratios) || ratios.length === 0) throw new ArgumentError(RATIOS_ERROR);
  const totalUnits = atomBig(amount, 2);
  if (totalUnits === null) return NaN;
  const { scaled, denom } = scaleWeights(ratios, RATIOS_ERROR);
  if (denom <= 0n) throw new ArgumentError(RATIOS_ERROR);
  const counts = distribute(totalUnits, scaled, denom);
  return counts.map(unitsToAmount);
}

// ─── Percentage / fee / discount recipes (all exact) ──────────────────────────

const addPercent = (amount, p) => scaleByPercent(amount, p, +1);
const deductPercent = (amount, p) => scaleByPercent(amount, p, -1);
const maxFee = (amount, p, fee) => Math.max(percent(amount, p), value(fee));
const addMaxFee = (amount, p, fee) => sum(amount, maxFee(amount, p, fee));
const addFees = (amount, p, fee) => sum(addPercent(amount, p), fee);
const deductMaxFee = (amount, p, fee) => sum(amount, -maxFee(amount, p, fee));
const deductFees = (amount, p, fee) => sum(deductPercent(amount, p), -value(fee));

// ─── Tax-inclusive / tax-exclusive (VAT) recipes ──────────────────────────────

/** Gross (tax-inclusive) from a net (tax-exclusive) amount: net + p% tax. */
const grossFromNet = (net, p) => addPercent(net, p);

/** Net (tax-exclusive) from a gross (tax-inclusive) amount: gross / (1 + p/100). */
function netFromGross(gross, p) {
  const g = parseDecimal(gross);
  const pp = parseDecimal(p);
  if (g === null || pp === null) return NaN;
  const denom = addDec(HUNDRED, pp);
  return decToNumber(divDec(mulDec(g, HUNDRED), denom, 2, resolveRounding()));
}

/** The tax portion contained in a gross (tax-inclusive) amount. */
const taxFromGross = (gross, p) => sum(gross, -netFromGross(gross, p));

module.exports = {
  partition,
  allocate,
  // New names (preferred)
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
  // Deprecated aliases (kept for backward compatibility)
  applyDiscount: (amount, p) => deductPercent(amount, p),
  applyTax: (amount, p) => addPercent(amount, p),
  maxTax: (amount, p, fee) => maxFee(amount, p, fee),
  applyMaxTax: (amount, p, fee) => addMaxFee(amount, p, fee),
  applySumTax: (amount, p, fee) => addFees(amount, p, fee),
  applyMaxDiscount: (amount, p, fee) => deductMaxFee(amount, p, fee),
  applySumDiscount: (amount, p, fee) => deductFees(amount, p, fee),
};
