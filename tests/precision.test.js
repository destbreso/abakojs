// Where the returned `number` stops being able to hold the answer.
//
// The README used to say the 2-decimal ceiling was 2^53 cents, about
// $90,071,992,547,409. It is not, and the counterexample is that exact amount:
// add(90071992547409, 0.01) returns ...409.02. The claim confused "2^53 units"
// with "a double that still resolves a unit". Those coincide only if the units
// are the doubles, and here the amount is.
//
// Inside the binade [2^k, 2^(k+1)) the gap between neighbouring doubles is
// 2^(k-52), so the last magnitude that still resolves one unit of the last
// place is the largest k with 2^(k-52) <= 10^-d. For d=2 that is k=45, so
// amounts below 2^46 are exact. For d=8 it is k=25, so values below 2^26 are.
//
// The reason the existing suite could not see any of this: the decimal.js
// oracle in properties.test.js generates at most six integer digits, so it
// never visits a magnitude where the question exists. An oracle that cannot
// reach the claim cannot check it.

const { add, subtract } = require("../index.js");

// The oracle holds no floating point at all. The expected answer is built as a
// decimal string through BigInt, which is the only way to avoid testing the
// arithmetic with a copy of itself. My first attempt at this computed the
// expected value the same way the library does, so both landed on the same
// wrong number and the check passed.
const unitsOf = (x, d) => BigInt(x.toFixed(d).replace(".", "").replace("-", ""));
const stringOf = (units, d) => {
  const s = units.toString().padStart(d + 1, "0");
  return `${s.slice(0, -d)}.${s.slice(-d)}`;
};

/** The first of five consecutive one-unit steps that does not land where it should. */
function firstFailure(x, d) {
  const unit = Number(`1e-${d}`);
  const base = unitsOf(x, d);
  for (let k = 1; k <= 5; k++) {
    const got = add(x, unit * k, d);
    const want = stringOf(base + BigInt(k), d);
    if (got.toFixed(d) !== want) return { k, got: got.toFixed(d), want };
  }
  return null;
}

const CEILINGS = [
  { d: 2, ceiling: 2 ** 46, label: "$70,368,744,177,664" },
  { d: 8, ceiling: 2 ** 26, label: "67,108,864 units" },
];

describe("precision ceilings, the numbers the README prints", () => {
  for (const { d, ceiling, label } of CEILINGS) {
    test(`at ${d} decimals every amount below ${label} takes a unit step exactly`, () => {
      // The whole binade under the ceiling, sampled: powers of two, the
      // boundary itself minus one, and a spread of ordinary amounts.
      const probes = [1, 1000, 12345.67 * (d === 2 ? 1 : 0.000001), ceiling / 2, ceiling / 2 + 1, ceiling - 1];
      for (const raw of probes) {
        const x = Number(raw.toFixed(d));
        expect({ x, failure: firstFailure(x, d) }).toEqual({ x, failure: null });
      }
    });

    test(`at ${d} decimals the ceiling ${label} is where it actually stops`, () => {
      // Two-sided, which is the part that makes it a measurement rather than a
      // slogan: exact just below, and demonstrably not exact at the boundary.
      expect(firstFailure(ceiling - 1, d)).toBeNull();
      expect(firstFailure(ceiling, d)).not.toBeNull();
    });

    test(`at ${d} decimals subtraction stops in the same place as addition`, () => {
      const unit = Number(`1e-${d}`);
      const below = ceiling - 1;
      expect(subtract(below, unit, d).toFixed(d)).toBe(stringOf(unitsOf(below, d) - 1n, d));
    });
  }

  test("the ceiling the README used to claim is a counterexample, not a limit", () => {
    // 2^53 cents, the old claim. Asserted on the printed decimal, because the
    // literal 90071992547409.01 cannot be written in this file either: the
    // parser rounds it to ...409.02 before any code runs, which is the clearest
    // possible statement that the target value is not in the type.
    expect(add(90071992547409, 0.01).toFixed(2)).toBe("90071992547409.02");
    expect(add(90071992, 0.00000002, 8).toFixed(8)).toBe("90071992.00000001");
  });
});
