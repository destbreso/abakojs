// Where the ceiling actually is.
//
//   npm run precision
//
// The README used to print 2^53 cents (about $90,071,992,547,409) as the
// 2-decimal limit, and that exact amount is the counterexample: adding a cent
// to it lands on .02. The mistake was reading "2^53 units" as the limit, which
// would be right only if the units were the doubles. The amount is.
//
// This sweeps both scales against a BigInt oracle and prints the first
// magnitude where a one-unit step stops landing where it should. Run it after
// touching anything in the rounding path, and if a number here moves, the
// README moves with it.

const { add } = require("../index.js");

const unitsOf = (x, d) => BigInt(x.toFixed(d).replace(".", "").replace("-", ""));
const stringOf = (units, d) => {
  const s = units.toString().padStart(d + 1, "0");
  return `${s.slice(0, -d)}.${s.slice(-d)}`;
};

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

const fmt = (n) => n.toLocaleString("en-US");

for (const d of [2, 8]) {
  console.log(`\n${d} decimals`);
  console.log("".padEnd(64, "-"));

  let lastClean = null;
  for (let p = 10; p <= 53; p++) {
    const f = firstFailure(2 ** p, d);
    if (f) {
      console.log(`  breaks at 2^${p} = ${fmt(2 ** p)}`);
      console.log(`    +${f.k} unit gives ${f.got}, should give ${f.want}`);
      break;
    }
    lastClean = p;
  }

  // The binade edge is the answer, so narrow between the last clean power of
  // two and the first broken one rather than trusting the power itself.
  let lo = 2 ** lastClean;
  let hi = 2 ** (lastClean + 1);
  for (let i = 0; i < 64 && hi - lo > 1; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (firstFailure(mid, d)) hi = mid;
    else lo = mid;
  }

  const gap = 2 ** (lastClean - 52);
  console.log(`  last exact  ${fmt(lo)}`);
  console.log(`  first wrong ${fmt(hi)}`);
  console.log(`  the gap between doubles at that magnitude is ${gap}, one unit is ${Number(`1e-${d}`)}`);
  console.log(`  README should say: exact below ${fmt(hi)} (2^${Math.log2(hi)})`);
}

console.log("");
