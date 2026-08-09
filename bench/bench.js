"use strict";

/**
 * Benchmark: abakojs vs currency.js vs dinero.js v2 vs decimal.js
 *
 * Run:  node bench/bench.js
 *
 * Measures ops/sec for the most common operations using a simple high-resolution
 * timer loop. No external benchmark framework required.
 */

const {
  sum,
  add,
  subtract,
  multiply,
  value,
  percent,
  compare,
  recipes,
} = require("../index");
const currency = require("currency.js");
const {
  dinero,
  add: dAdd,
  subtract: dSubtract,
  multiply: dMultiply,
  allocate: dAllocate,
  toSnapshot,
} = require("dinero.js");
const Decimal = require("decimal.js");
const Big = require("big.js");

Big.DP = 2; // decimal places
Big.RM = 2; // ROUND_HALF_EVEN (match abakojs default)

// ─── helpers ────────────────────────────────────────────────────────────────

const ITERATIONS = 500_000;
const USD = { code: "USD", base: 10, exponent: 2 };

function bench(label, fn) {
  // warmup
  for (let i = 0; i < 1000; i++) fn();

  const start = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const end = process.hrtime.bigint();

  const ms = Number(end - start) / 1e6;
  const opsPerSec = Math.round((ITERATIONS / ms) * 1000);
  return { label, ms: ms.toFixed(1), opsPerSec };
}

function printTable(title, results) {
  const maxOps = Math.max(...results.map((r) => r.opsPerSec));
  const baseline = results[0].opsPerSec;

  console.log(`\n${"─".repeat(72)}`);
  console.log(` ${title}`);
  console.log(`${"─".repeat(72)}`);
  console.log(
    ` ${"Library".padEnd(28)} ${"ops/sec".padStart(14)} ${"vs baseline".padStart(14)} ${"bar"}`,
  );
  console.log(`${"─".repeat(72)}`);

  for (const r of results) {
    const ratio = (r.opsPerSec / baseline).toFixed(2);
    const bar = "█".repeat(Math.round((r.opsPerSec / maxOps) * 30));
    const sign =
      ratio >= 1
        ? `+${((ratio - 1) * 100).toFixed(0)}%`
        : `${((ratio - 1) * 100).toFixed(0)}%`;
    const ratioStr = ratio === "1.00" ? "baseline" : sign;
    console.log(
      ` ${r.label.padEnd(28)} ${String(r.opsPerSec.toLocaleString()).padStart(14)} ${ratioStr.padStart(14)} ${bar}`,
    );
  }
}

// ─── ADDITION ───────────────────────────────────────────────────────────────

const addResults = [
  bench("abakojs", () => add(0.1, 0.2)),
  bench("currency.js", () => currency(0.1).add(0.2).value),
  bench("decimal.js", () => new Decimal("0.1").plus("0.2").toDecimalPlaces(2).toNumber()),
  bench("big.js", () => new Big("0.1").plus("0.2").round(2).toNumber()),
  bench("dinero.js v2", () => {
    const a = dinero({ amount: 10, currency: USD });
    const b = dinero({ amount: 20, currency: USD });
    return toSnapshot(dAdd(a, b)).amount;
  }),
  bench("Native JS (unsafe)", () => Math.round((0.1 + 0.2) * 100) / 100),
];

printTable("ADDITION  add(0.1, 0.2) → 0.3", addResults);

// ─── SUBTRACTION ────────────────────────────────────────────────────────────

const subtractResults = [
  bench("abakojs", () => subtract(1.01, 0.99)),
  bench("currency.js", () => currency(1.01).subtract(0.99).value),
  bench("decimal.js", () => new Decimal("1.01").minus("0.99").toDecimalPlaces(2).toNumber()),
  bench("dinero.js v2", () => {
    const a = dinero({ amount: 101, currency: USD });
    const b = dinero({ amount: 99, currency: USD });
    return toSnapshot(dSubtract(a, b)).amount;
  }),
  bench("Native JS (unsafe)", () => Math.round((1.01 - 0.99) * 100) / 100),
];

printTable("SUBTRACTION  subtract(1.01, 0.99) → 0.02", subtractResults);

// ─── MULTIPLICATION ─────────────────────────────────────────────────────────

const multiplyResults = [
  bench("abakojs", () => multiply(165, 1.4)),
  bench("currency.js", () => currency(165).multiply(1.4).value),
  bench("decimal.js", () => new Decimal("165").mul("1.40").toDecimalPlaces(2).toNumber()),
  bench("big.js", () => new Big("165").times("1.40").round(2).toNumber()),
  bench("dinero.js v2", () => {
    const a = dinero({ amount: 16500, currency: USD });
    return toSnapshot(dMultiply(a, 1.4)).amount;
  }),
  bench("Native JS (unsafe)", () => Math.round(165 * 1.4 * 100) / 100),
];

printTable("MULTIPLICATION  multiply(165, 1.40) → 231", multiplyResults);

// ─── ROUNDING / VALUE ────────────────────────────────────────────────────────

const roundResults = [
  bench("abakojs  value()", () => value(10.2506)),
  bench("currency.js", () => currency(10.2506).value),
  bench("decimal.js  toDecimalPlaces", () => new Decimal("10.2506").toDecimalPlaces(2).toNumber()),
  bench("big.js  round(2)", () => new Big("10.2506").round(2).toNumber()),
  bench("Native Math.round", () => Math.round(10.2506 * 100) / 100),
];

printTable("ROUNDING  value(10.2506) → 10.26", roundResults);

// ─── PARTITION ──────────────────────────────────────────────────────────────

const partitionResults = [
  bench("abakojs  partition", () => recipes.partition(1, 3)),
  bench("currency.js  distribute", () => currency(1)
    .distribute(3)
    .map((c) => c.value)),
  bench("dinero.js v2  allocate", () => {
    const a = dinero({ amount: 100, currency: USD });
    const parts = dAllocate(a, [1, 1, 1]);
    return parts.map((p) => toSnapshot(p).amount);
  }),
  bench("Native JS manual", () => {
    const total = 1;
    const parts = 3;
    const base = Math.round((total / parts) * 100) / 100;
    return Array.from({ length: parts }, () => base);
    // (does NOT guarantee sum = total — that's the bug this library solves)
  }),
];

printTable("PARTITION  partition(1, 3) → [0.34, 0.33, 0.33]", partitionResults);

// ─── AGGREGATE (SUM) ─────────────────────────────────────────────────────────

const amounts = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

const sumResults = [
  bench("abakojs  sum()", () => sum(amounts)),
  bench(
    "currency.js reduce",
    () => amounts.reduce((acc, n) => currency(acc).add(n), currency(0)).value,
  ),
  bench("decimal.js reduce", () => amounts
    .reduce((acc, n) => acc.plus(n), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber()),
  bench("Native Array.reduce (unsafe)", () => amounts.reduce((a, b) => a + b, 0)),
];

printTable("AGGREGATE  sum([0.1…1.0]) — 10 items", sumResults);

// ─── PERCENT ─────────────────────────────────────────────────────────────────

const percentResults = [
  bench("abakojs  percent()", () => percent(524.25, 8.75)),
  bench("currency.js", () => currency(524.25).multiply(8.75).divide(100).value),
  bench("decimal.js", () => new Decimal("524.25").mul("8.75").div(100).toDecimalPlaces(2)
    .toNumber()),
  bench("Native JS (unsafe)", () => Math.round(524.25 * 8.75) / 100),
];

printTable("PERCENT  percent(524.25, 8.75) → 45.88", percentResults);

// ─── CRYPTO PRECISION (8 DECIMALS) ──────────────────────────────────────────

const cryptoAddResults = [
  bench("abakojs  add(,,8)", () => sum(0.12345678, 0.00000001, { decimals: 8 })),
  bench(
    "currency.js  precision:8",
    () => currency(0.12345678, { precision: 8 }).add(0.00000001).value,
  ),
  bench("decimal.js  toDP(8)", () => new Decimal("0.12345678").plus("0.00000001").toDecimalPlaces(8).toNumber()),
  bench("dinero.js v2  (exp:8)", () => {
    const BTC = { code: "BTC", base: 10, exponent: 8 };
    const a = dinero({ amount: 12345678, currency: BTC });
    const b = dinero({ amount: 1, currency: BTC });
    return toSnapshot(dAdd(a, b)).amount;
  }),
];

printTable(
  "CRYPTO ADD  add(0.12345678, 0.00000001) → 8 decimals",
  cryptoAddResults,
);

const cryptoCompareResults = [
  bench("abakojs  compare(,,8)", () => compare(0.12345678, 0.12345679, 8)),
  bench("currency.js  precision:8", () => {
    const a = currency(0.12345678, { precision: 8 });
    const b = currency(0.12345679, { precision: 8 });
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  }),
  bench("decimal.js  comparedTo", () => new Decimal("0.12345678").comparedTo("0.12345679")),
];

printTable(
  "CRYPTO COMPARE  compare(0.12345678, 0.12345679) → 8 decimals",
  cryptoCompareResults,
);

// ─── FORMAT ──────────────────────────────────────────────────────────────────

const { format, convert } = require("../index");

const formatResults = [
  bench("abakojs  format()", () => format(1234.56, "USD", "en-US")),
  bench("currency.js  format()", () => currency(1234.56, { symbol: "$" }).format()),
  bench("Intl.NumberFormat (raw)", () => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(1234.56)),
];

printTable("FORMAT  format(1234.56, 'USD') → '$1,234.56'", formatResults);

// ─── CONVERT ─────────────────────────────────────────────────────────────────

const fxRates = { USD: 1, EUR: 0.92, GBP: 0.79 };

const convertResults = [
  bench("abakojs  convert()", () => convert(100, "USD", "EUR", fxRates)),
  bench("manual fx() + lookup", () => {
    const rate = fxRates.EUR / fxRates.USD;
    return Math.round(100 * rate * 100) / 100;
  }),
];

printTable("CONVERT  convert(100, 'USD', 'EUR') → 92", convertResults);

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(72)}`);
console.log(" Summary");
console.log(`${"═".repeat(72)}`);
console.log(` Iterations per test : ${ITERATIONS.toLocaleString()}`);
console.log(` Node.js             : ${process.version}`);
console.log(` Platform            : ${process.platform} ${process.arch}`);
console.log(`${"═".repeat(72)}\n`);
