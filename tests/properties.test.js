"use strict";

/**
 * Property / invariant tests.
 *
 * Correctness is cross-validated against decimal.js (an independent, widely-used
 * arbitrary-precision library) configured for ROUND_HALF_EVEN: the same mode
 * abakojs uses by default. Thousands of random string inputs are fed to BOTH
 * and required to match exactly. This is the real proof of engine correctness;
 * the example-based tests in currency.js are documentation.
 */

const Decimal = require("decimal.js");
const money = require("../index");

const { RoundingMode } = money;

Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_EVEN });

// ─── deterministic RNG (mulberry32) ──────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randDecimalString(rnd, { maxInt = 6, maxFrac = 9, allowNeg = true } = {}) {
  const sign = allowNeg && rnd() < 0.5 ? "-" : "";
  const intLen = 1 + Math.floor(rnd() * maxInt);
  const fracLen = Math.floor(rnd() * (maxFrac + 1));
  let intPart = "";
  for (let i = 0; i < intLen; i++) intPart += Math.floor(rnd() * 10);
  intPart = String(BigInt(intPart)); // strip leading zeros
  let fracPart = "";
  for (let i = 0; i < fracLen; i++) fracPart += Math.floor(rnd() * 10);
  const s = fracPart ? `${intPart}.${fracPart}` : intPart;
  return sign && s !== "0" ? sign + s : s;
}

// normalize -0 → 0 for comparison
const norm = (n) => (n === 0 ? 0 : n);

describe("engine correctness vs decimal.js oracle (HALF_EVEN)", () => {
  const rnd = mulberry32(0xc0ffee);
  const D = (s) => new Decimal(s);
  const N = 4000;

  test(`value() matches oracle across ${N} cases`, () => {
    for (let i = 0; i < N; i++) {
      const x = randDecimalString(rnd);
      const d = Math.floor(rnd() * 9);
      const got = money.value(x, d);
      const exp = D(x).toDecimalPlaces(d, Decimal.ROUND_HALF_EVEN).toNumber();
      expect(norm(got)).toBe(norm(exp));
    }
  });

  test(`add()/subtract() match oracle across ${N} cases`, () => {
    for (let i = 0; i < N; i++) {
      const x = randDecimalString(rnd);
      const y = randDecimalString(rnd);
      const d = Math.floor(rnd() * 6);
      expect(norm(money.add(x, y, d))).toBe(
        norm(D(x).plus(D(y)).toDecimalPlaces(d, Decimal.ROUND_HALF_EVEN).toNumber()),
      );
      expect(norm(money.subtract(x, y, d))).toBe(
        norm(D(x).minus(D(y)).toDecimalPlaces(d, Decimal.ROUND_HALF_EVEN).toNumber()),
      );
    }
  });

  // The oracle above never leaves six integer digits, so for a long time it
  // could not see the question the precision ceiling is about: it never visited
  // a magnitude where a double stops resolving a cent. An oracle that cannot
  // reach a claim cannot check it, and the README's ceiling was wrong for
  // exactly as long as that was true. This block walks the decade below the
  // documented 2-decimal limit, where the answers must still be exact.
  test(`add()/subtract() match oracle at ledger magnitudes across ${N} cases`, () => {
    const CEILING = 2 ** 46; // $70,368,744,177,664, see tests/precision.test.js
    for (let i = 0; i < N; i++) {
      const x = randDecimalString(rnd, { maxInt: 13, maxFrac: 2, allowNeg: false });
      const y = randDecimalString(rnd, { maxInt: 4, maxFrac: 2, allowNeg: false });
      if (D(x).plus(D(y)).abs().toNumber() >= CEILING) continue;
      expect(norm(money.add(x, y, 2))).toBe(
        norm(D(x).plus(D(y)).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber()),
      );
      expect(norm(money.subtract(x, y, 2))).toBe(
        norm(D(x).minus(D(y)).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber()),
      );
    }
  });

  test(`multiply() matches oracle across ${N} cases`, () => {
    for (let i = 0; i < N; i++) {
      const x = randDecimalString(rnd, { maxInt: 4, maxFrac: 6 });
      const y = randDecimalString(rnd, { maxInt: 3, maxFrac: 6 });
      const d = Math.floor(rnd() * 6);
      expect(norm(money.multiply(x, y, d))).toBe(
        norm(D(x).times(D(y)).toDecimalPlaces(d, Decimal.ROUND_HALF_EVEN).toNumber()),
      );
    }
  });

  test(`divide() matches oracle across ${N} cases`, () => {
    for (let i = 0; i < N; i++) {
      const x = randDecimalString(rnd, { maxInt: 5, maxFrac: 6 });
      let y = randDecimalString(rnd, { maxInt: 3, maxFrac: 4 });
      if (D(y).isZero()) y = "1";
      const d = Math.floor(rnd() * 8);
      expect(norm(money.divide(x, y, d))).toBe(
        norm(D(x).div(D(y)).toDecimalPlaces(d, Decimal.ROUND_HALF_EVEN).toNumber()),
      );
    }
  });

  test(`percent() matches oracle across ${N} cases`, () => {
    for (let i = 0; i < N; i++) {
      const x = randDecimalString(rnd, { maxInt: 5, maxFrac: 6 });
      const p = randDecimalString(rnd, { maxInt: 3, maxFrac: 4, allowNeg: false });
      const d = Math.floor(rnd() * 6);
      expect(norm(money.percent(x, p, d))).toBe(
        norm(D(x).times(D(p)).div(100).toDecimalPlaces(d, Decimal.ROUND_HALF_EVEN)
          .toNumber()),
      );
    }
  });

  test("all rounding modes match oracle", () => {
    const map = {
      [RoundingMode.HALF_EVEN]: Decimal.ROUND_HALF_EVEN,
      [RoundingMode.HALF_UP]: Decimal.ROUND_HALF_UP,
      [RoundingMode.HALF_DOWN]: Decimal.ROUND_HALF_DOWN,
      [RoundingMode.UP]: Decimal.ROUND_UP,
      [RoundingMode.DOWN]: Decimal.ROUND_DOWN,
      [RoundingMode.CEIL]: Decimal.ROUND_CEIL,
      [RoundingMode.FLOOR]: Decimal.ROUND_FLOOR,
    };
    for (const [ours, theirs] of Object.entries(map)) {
      for (let i = 0; i < 800; i++) {
        const x = randDecimalString(rnd);
        const d = Math.floor(rnd() * 6);
        expect(norm(money.value(x, d, ours))).toBe(
          norm(D(x).toDecimalPlaces(d, theirs).toNumber()),
        );
      }
    }
  });
});

describe("invariants", () => {
  test("split() always preserves the total (exact cent distribution)", () => {
    for (let n = 1; n <= 13; n++) {
      for (let cents = 0; cents <= 600; cents++) {
        const amt = cents / 100;
        const parts = money.split(amt, n);
        const totalCents = parts.reduce((acc, p) => acc + money.cents(p), 0);
        expect(totalCents).toBe(cents);
      }
    }
  });

  test("split() by weights preserves the total", () => {
    const weightSets = [
      [50, 50],
      [41, 33, 15, 9, 2],
      [33, 41, 9, 2, 15],
      [99, 1],
      [100],
      [25, 25, 25, 25],
    ];
    for (const w of weightSets) {
      for (let cents = 0; cents <= 500; cents++) {
        const amt = cents / 100;
        const parts = money.split(amt, w);
        const totalCents = parts.reduce((acc, p) => acc + money.cents(p), 0);
        expect(totalCents).toBe(cents);
      }
    }
  });

  test("cents() is always an exact integer and round-trips", () => {
    for (let c = 0; c <= 200000; c++) {
      const amt = c / 100;
      const back = money.cents(amt);
      expect(Number.isInteger(back)).toBe(true);
      expect(back).toBe(c);
      expect(money.cents2Amount(back)).toBe(amt);
    }
  });

  test("HALF_EVEN default has zero cumulative bias over a full 4-dp sweep", () => {
    let bias = 0;
    for (let m = 0; m < 200000; m++) {
      const x = m / 10000;
      bias += money.value(x, 2) - x;
    }
    // exactly-zero in theory; allow a hair of float slack in the accumulation
    expect(Math.abs(bias)).toBeLessThan(0.005);
  });
});
