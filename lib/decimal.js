"use strict";

/**
 * Exact decimal engine for abakojs.
 *
 * A decimal is represented as { coef: bigint (signed), scale: number >= 0 }
 * with value === coef / 10n ** BigInt(scale). All arithmetic is done in BigInt,
 * so there is no IEEE-754 float in the hot path.
 *
 * The anti-bug boundary is PARSING: a JS number is converted with `n.toString()`
 * first, which yields the shortest round-tripping decimal (String(0.29) === "0.29",
 * not "0.2899999..."). We parse that exact decimal string. We never do arithmetic
 * on the raw float. Strings are parsed at full precision.
 */

const NEG_ZERO_SENTINEL = "-0";

// ─── Rounding modes ──────────────────────────────────────────────────────────

const RoundingMode = Object.freeze({
  /** Round half to even (banker's). Default. Unbiased over many roundings. */
  HALF_EVEN: "HALF_EVEN",
  /** Round half away from zero (0.5 -> 1, -0.5 -> -1). */
  HALF_UP: "HALF_UP",
  /** Round half toward zero (0.5 -> 0, -0.5 -> 0). */
  HALF_DOWN: "HALF_DOWN",
  /** Round away from zero (ceil of magnitude). This is what abakojs v2 did. */
  UP: "UP",
  /** Round toward zero (truncate). */
  DOWN: "DOWN",
  /** Round toward +Infinity. */
  CEIL: "CEIL",
  /** Round toward -Infinity. */
  FLOOR: "FLOOR",
});

let defaultRounding = RoundingMode.HALF_EVEN;

function setDefaultRounding(mode) {
  if (!Object.prototype.hasOwnProperty.call(RoundingMode, mode)) {
    throw new RangeError(`unknown rounding mode: ${String(mode)}`);
  }
  defaultRounding = mode;
}

function getDefaultRounding() {
  return defaultRounding;
}

function resolveRounding(mode) {
  if (mode === undefined || mode === null) return defaultRounding;
  if (!Object.prototype.hasOwnProperty.call(RoundingMode, mode)) {
    throw new RangeError(`unknown rounding mode: ${String(mode)}`);
  }
  return mode;
}

// ─── Powers of ten (memoised BigInt) ─────────────────────────────────────────

const POW10 = [1n];
function pow10(n) {
  if (n < 0) throw new RangeError("pow10: negative exponent");
  for (let i = POW10.length; i <= n; i++) POW10[i] = POW10[i - 1] * 10n;
  return POW10[n];
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

const DECIMAL_RE = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/**
 * Parse a number|string|bigint into an exact decimal, or return null if invalid.
 * @returns {{coef: bigint, scale: number} | null}
 */
function parseDecimal(input) {
  if (typeof input === "bigint") return { coef: input, scale: 0 };

  let str;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    // Shortest round-tripping decimal — the "intended" value, no float junk.
    str = input.toString();
  } else if (typeof input === "string") {
    str = input.trim();
    if (str === "") return null;
  } else {
    return null; // null, undefined, boolean, object, array, symbol
  }

  const m = DECIMAL_RE.exec(str);
  if (!m) return null;

  const sign = m[1] === "-" ? -1n : 1n;
  const intPart = m[2] || "";
  const fracPart = m[3] || "";
  const exp = m[4] ? parseInt(m[4], 10) : 0;

  if (intPart === "" && fracPart === "") return null; // "", ".", "e5", "+"

  // digits = intPart concat fracPart, scale = fracPart.length - exp
  const digits = intPart + fracPart;
  let scale = fracPart.length - exp;

  // Strip nothing here; BigInt handles leading zeros. Empty digits -> 0.
  let coef = digits === "" ? 0n : sign * BigInt(digits);

  // Normalise negative scale (e.g. "1e3" -> coef*1000, scale 0).
  if (scale < 0) {
    coef *= pow10(-scale);
    scale = 0;
  }
  return { coef, scale };
}

// ─── Rescale / round to a target scale ───────────────────────────────────────

/**
 * Decide whether to increment the truncated magnitude `q` when dropping a
 * non-zero remainder `r` out of `divisor`, under rounding `mode`. `neg` is the
 * sign of the value. Shared by roundTo and divDec.
 * @returns {boolean}
 */
function bumpMagnitude(mode, r, divisor, q, neg) {
  const twiceR = r * 2n;
  switch (mode) {
    case RoundingMode.DOWN:
      return false;
    case RoundingMode.UP:
      return true;
    case RoundingMode.CEIL:
      return !neg;
    case RoundingMode.FLOOR:
      return neg;
    case RoundingMode.HALF_UP:
      return twiceR >= divisor;
    case RoundingMode.HALF_DOWN:
      return twiceR > divisor;
    case RoundingMode.HALF_EVEN:
    default:
      if (twiceR !== divisor) return twiceR > divisor;
      return q % 2n === 1n; // tie -> round to even
  }
}

/**
 * Round a decimal to `targetScale` decimal places using `mode`.
 * @returns {{coef: bigint, scale: number}}
 */
function roundTo(dec, targetScale, mode) {
  const { coef, scale } = dec;
  if (scale === targetScale) return { coef, scale };
  if (scale < targetScale) {
    return { coef: coef * pow10(targetScale - scale), scale: targetScale };
  }

  const divisor = pow10(scale - targetScale);
  const neg = coef < 0n;
  const a = neg ? -coef : coef;
  let q = a / divisor;
  const r = a % divisor;

  if (r !== 0n && bumpMagnitude(mode, r, divisor, q, neg)) q += 1n;

  return { coef: neg ? -q : q, scale: targetScale };
}

// ─── Arithmetic ──────────────────────────────────────────────────────────────

function alignScales(a, b) {
  if (a.scale === b.scale) return [a.coef, b.coef, a.scale];
  if (a.scale > b.scale) {
    return [a.coef, b.coef * pow10(a.scale - b.scale), a.scale];
  }
  return [a.coef * pow10(b.scale - a.scale), b.coef, b.scale];
}

function addDec(a, b) {
  const [ca, cb, scale] = alignScales(a, b);
  return { coef: ca + cb, scale };
}

function subDec(a, b) {
  const [ca, cb, scale] = alignScales(a, b);
  return { coef: ca - cb, scale };
}

function mulDec(a, b) {
  return { coef: a.coef * b.coef, scale: a.scale + b.scale };
}

/**
 * Divide a / b to `targetScale` decimals with rounding `mode`.
 * @returns {{coef: bigint, scale: number}}  (throws on divide-by-zero — caller guards)
 */
function divDec(a, b, targetScale, mode) {
  if (b.coef === 0n) throw new RangeError("division by zero");
  // value = (a.coef / 10^a.scale) / (b.coef / 10^b.scale)
  //       = (a.coef * 10^b.scale) / (b.coef * 10^a.scale)
  // Scale numerator by 10^targetScale, integer-divide, keep remainder for rounding.
  const num = a.coef * pow10(b.scale) * pow10(targetScale);
  const den = b.coef * pow10(a.scale);
  const negResult = num < 0n !== den < 0n;
  const an = num < 0n ? -num : num;
  const ad = den < 0n ? -den : den;
  let q = an / ad;
  const r = an % ad;

  if (r !== 0n && bumpMagnitude(mode, r, ad, q, negResult)) q += 1n;

  return { coef: negResult ? -q : q, scale: targetScale };
}

function cmpDec(a, b) {
  const [ca, cb] = alignScales(a, b);
  if (ca < cb) return -1;
  if (ca > cb) return 1;
  return 0;
}

function isZeroDec(dec) {
  return dec.coef === 0n;
}

function negateDec(dec) {
  return { coef: -dec.coef, scale: dec.scale };
}

function absDec(dec) {
  return { coef: dec.coef < 0n ? -dec.coef : dec.coef, scale: dec.scale };
}

// ─── Output ──────────────────────────────────────────────────────────────────

/**
 * Exact decimal string. Never lossy.
 * @returns {string}
 */
function decToString(dec) {
  const { coef, scale } = dec;
  if (scale === 0) return coef.toString();
  const neg = coef < 0n;
  let digits = (neg ? -coef : coef).toString();
  if (digits.length <= scale) digits = "0".repeat(scale - digits.length + 1) + digits;
  const cut = digits.length - scale;
  let out = `${digits.slice(0, cut)}.${digits.slice(cut)}`;
  // trim trailing zeros in the fractional part, then a dangling dot
  out = out.replace(/0+$/, "").replace(/\.$/, "");
  return neg ? `-${out}` : out;
}

/**
 * Convert to a JS number. Exact while the integer coefficient stays within
 * Number.MAX_SAFE_INTEGER; beyond that, Number() is lossy by definition.
 * @returns {number}
 */
function decToNumber(dec) {
  return Number(decToString(dec));
}

/** Minor units (integer) at a given scale, as a JS number. cents() uses scale 2. */
function decToMinorUnits(dec, minorScale, mode) {
  const r = roundTo(dec, minorScale, resolveRounding(mode));
  return Number(r.coef);
}

module.exports = {
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
  isZeroDec,
  negateDec,
  absDec,
  decToString,
  decToNumber,
  decToMinorUnits,
  pow10,
  NEG_ZERO_SENTINEL,
};
