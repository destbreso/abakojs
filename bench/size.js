"use strict";

/**
 * Bundle-size benchmark (minified + gzipped) — the metric that matters for install cost.
 *
 * Each library is bundled with esbuild (bundle + minify + tree-shake) exactly as an app
 * would ship it, then gzipped with zlib. We measure the "full public API" of each lib
 * (referencing the whole namespace so tree-shaking cannot drop code), which is the fair
 * apples-to-apples number. For tree-shakeable libs a note is printed.
 *
 * Run:  node bench/size.js
 */

const esbuild = require("esbuild");
const zlib = require("zlib");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// entry source per library — reference the API so nothing is tree-shaken away
const targets = [
  {
    name: "abakojs",
    entry: `import * as m from ${JSON.stringify(path.join(ROOT, "index.mjs"))};
            globalThis.__sink = m;`,
    note: "full API (engine + arithmetic + recipes + format + convert)",
  },
  {
    name: "abakojs (core)",
    entry: `import * as a from ${JSON.stringify(path.join(ROOT, "lib/arithmetic.js"))};
            import * as r from ${JSON.stringify(path.join(ROOT, "lib/recipes.js"))};
            globalThis.__sink = { a, r };`,
    note: "engine + arithmetic + recipes (no Intl formatter/convert)",
  },
  {
    name: "currency.js",
    entry: `import currency from "currency.js"; globalThis.__sink = currency;`,
    note: "full API",
  },
  {
    name: "big.js",
    entry: `import Big from "big.js"; globalThis.__sink = Big;`,
    note: "full API",
  },
  {
    name: "decimal.js",
    entry: `import Decimal from "decimal.js"; globalThis.__sink = Decimal;`,
    note: "full API",
  },
  {
    name: "dinero.js v2",
    entry: `import * as d from "dinero.js"; globalThis.__sink = d;`,
    note: "full API (tree-shakeable: real usage is smaller)",
  },
  {
    name: "dinero.js v2 (typical)",
    entry: `import { dinero, add, subtract, multiply, allocate, toSnapshot, toUnits } from "dinero.js";
            globalThis.__sink = { dinero, add, subtract, multiply, allocate, toSnapshot, toUnits };`,
    note: "7 core fns only (no currency table)",
  },
];

async function measure(t) {
  const result = await esbuild.build({
    stdin: {
      contents: t.entry,
      resolveDir: ROOT,
      loader: "js",
    },
    bundle: true,
    minify: true,
    treeShaking: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    write: false,
    legalComments: "none",
    logLevel: "silent",
  });
  const min = Buffer.from(result.outputFiles[0].contents);
  const gz = zlib.gzipSync(min, { level: 9 });
  return { min: min.length, gz: gz.length };
}

(async () => {
  const rows = [];
  for (const t of targets) {
    try {
      const r = await measure(t);
      rows.push({ name: t.name, ...r, note: t.note });
    } catch (e) {
      rows.push({ name: t.name, min: NaN, gz: NaN, note: `error: ${e.message.split("\n")[0]}` });
    }
  }

  rows.sort((a, b) => (a.gz || Infinity) - (b.gz || Infinity));
  const kb = (n) => (Number.isFinite(n) ? `${(n / 1024).toFixed(1)} KB` : "—");

  console.log(`\n${"─".repeat(78)}`);
  console.log(" Bundle size — minified + gzipped (lower is better)");
  console.log(`${"─".repeat(78)}`);
  console.log(
    ` ${"Library".padEnd(24)} ${"min".padStart(9)} ${"min+gzip".padStart(10)}  note`,
  );
  console.log(`${"─".repeat(78)}`);
  for (const r of rows) {
    console.log(
      ` ${r.name.padEnd(24)} ${kb(r.min).padStart(9)} ${kb(r.gz).padStart(10)}  ${r.note}`,
    );
  }
  console.log(`${"─".repeat(78)}\n`);
})();
