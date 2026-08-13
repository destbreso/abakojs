"use strict";

/**
 * Ergonomics benchmark: the SAME real-world accounting task, implemented in each
 * library, run to prove they agree, and measured (source characters + library
 * API calls). The code below is real and executes: nothing is hand-waved.
 *
 * Run:  node bench/ergonomics.js
 */

const abako = require("../index");
// module-scope names (competitors likewise reference their module-scope imports)
const {
  sum, multiply, chain, allocate, netFromGross, taxFromGross,
} = abako;
const currency = require("currency.js");
const Decimal = require("decimal.js");
const Big = require("big.js");
const {
  dinero, add: dAdd, multiply: dMul, allocate: dAllocate, toDecimal, transformScale, up,
} = require("dinero.js");

Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN });
Big.DP = 2;
Big.RM = 2;
const USD = { code: "USD", base: 10, exponent: 2 };

// ── metrics: source chars + "ceremony" (forced wrapper constructions/unwraps) ──
function metrics(fnSource) {
  const body = fnSource
    .replace(/^[^{]*\{/, "")
    .replace(/\}\s*$/, "")
    .trim();
  const chars = body.replace(/\s+/g, " ").length;
  // wrapper constructions + unwraps a caller is forced to write
  const ceremony = (
    body.match(/currency\(|new Decimal\(|new Big\(|dinero\(|\.value\b|\.toNumber\(|toDecimal\(|toSnapshot\(|\.intValue\b/g) || []
  ).length;
  return { chars, ceremony };
}

const tasks = [];

// ─── Task 1: cart total → 5% coupon → 21% VAT ────────────────────────────────
const items = [
  { price: 19.99, qty: 2 },
  { price: 4.99, qty: 1 },
  { price: 0.49, qty: 3 },
];

tasks.push({
  title: "Cart of 3 line items → 5% coupon → 21% VAT",
  expected: 53.39,
  impls: {
    abakojs: () => {
      const sub = sum(items.map((i) => multiply(i.price, i.qty)));
      return chain(sub).deductPercent(5).addPercent(21).value;
    },
    "currency.js": () => {
      const sub = items.reduce(
        (a, i) => a.add(currency(i.price).multiply(i.qty)),
        currency(0),
      );
      return sub.multiply(0.95).multiply(1.21).value;
    },
    "decimal.js": () => {
      const sub = items.reduce(
        (a, i) => a.plus(new Decimal(i.price).times(i.qty)),
        new Decimal(0),
      );
      return sub
        .times("0.95").toDecimalPlaces(2)
        .times("1.21").toDecimalPlaces(2)
        .toNumber();
    },
    "dinero.js v2": () => {
      const money = (n) => dinero({ amount: Math.round(n * 100), currency: USD });
      const sub = items.reduce(
        (a, i) => dAdd(a, dMul(money(i.price), i.qty)),
        dinero({ amount: 0, currency: USD }),
      );
      const afterCoupon = dMul(sub, { amount: 95, scale: 2 });
      const withVat = dMul(afterCoupon, { amount: 121, scale: 2 });
      return Number(toDecimal(transformScale(withVat, 2, up)));
    },
  },
});

// ─── Task 2: allocate $1,000,000.05 profit across owners 50/30/20, no cent lost ─
tasks.push({
  title: "Allocate 1000000.05 across owners 50/30/20 (exact)",
  expected: [500000.03, 300000.01, 200000.01],
  impls: {
    abakojs: () => allocate(1000000.05, [50, 30, 20]),
    "dinero.js v2": () => {
      const d = dinero({ amount: 100000005, currency: USD });
      return dAllocate(d, [50, 30, 20]).map((p) => Number(toDecimal(p)));
    },
    "currency.js": () => {
      // currency.distribute splits EQUALLY only; weighted needs manual largest-remainder
      const cents = currency(1000000.05).intValue;
      const weights = [50, 30, 20];
      const wsum = 100;
      const floors = weights.map((w) => Math.floor((cents * w) / wsum));
      let rem = cents - floors.reduce((a, b) => a + b, 0);
      const parts = floors.map((f) => {
        if (rem > 0) { rem -= 1; return f + 1; }
        return f;
      });
      return parts.map((c) => c / 100);
    },
  },
});

// ─── Task 3: extract net + VAT from a gross of 121 at 21% ─────────────────────
tasks.push({
  title: "Net + tax from a gross of 121 at 21% VAT",
  expected: { net: 100, tax: 21 },
  impls: {
    abakojs: () => ({ net: netFromGross(121, 21), tax: taxFromGross(121, 21) }),
    "decimal.js": () => {
      const gross = new Decimal(121);
      const net = gross.div(new Decimal(1.21)).toDecimalPlaces(2);
      const tax = gross.minus(net).toDecimalPlaces(2);
      return { net: net.toNumber(), tax: tax.toNumber() };
    },
    "currency.js": () => {
      const gross = currency(121);
      const net = gross.divide(1.21);
      const tax = gross.subtract(net);
      return { net: net.value, tax: tax.value };
    },
  },
});

// ── run + report ──
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const task of tasks) {
  console.log(`\n${"═".repeat(74)}`);
  console.log(` ${task.title}`);
  console.log(`${"═".repeat(74)}`);
  const rows = [];
  for (const [lib, fn] of Object.entries(task.impls)) {
    let got; let ok;
    try { got = fn(); ok = same(got, task.expected); } catch (e) { got = `ERR ${e.message.split("\n")[0]}`; ok = false; }
    const { chars, ceremony } = metrics(fn.toString());
    rows.push({ lib, chars, ceremony, ok, got });
  }
  rows.sort((a, b) => a.chars - b.chars);
  const min = rows[0].chars;
  console.log(
    ` ${"Library".padEnd(16)} ${"chars".padStart(6)} ${"vs best".padStart(8)} ${"wrappers".padStart(9)}  correct`,
  );
  console.log(`${"─".repeat(74)}`);
  for (const r of rows) {
    const ratio = (r.chars / min).toFixed(1);
    console.log(
      ` ${r.lib.padEnd(16)} ${String(r.chars).padStart(6)} ${`${ratio}x`.padStart(8)} ${String(r.ceremony).padStart(9)}  ${r.ok ? "✓" : `✗ (${JSON.stringify(r.got)})`}`,
    );
  }
}
console.log("");
