"use strict";

const fs = require("fs");
const path = require("path");

function dirSize(dir) {
  let total = 0;
  function walk(d) {
    try {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        const s = fs.statSync(p);
        if (s.isDirectory()) walk(p);
        else total += s.size;
      }
    } catch (e) {
      /* ignore */
    }
  }
  walk(dir);
  return total;
}

const root = path.join(__dirname, "..");
const nm = path.join(root, "node_modules");

const ownSize =
  fs.statSync(path.join(root, "index.js")).size +
  dirSize(path.join(root, "lib"));

const entries = [
  ["abakojs", ownSize],
  ["currency.js", dirSize(path.join(nm, "currency.js"))],
  ["dinero.js", dirSize(path.join(nm, "dinero.js"))],
  ["decimal.js", dirSize(path.join(nm, "decimal.js"))],
];

console.log("\nPackage source sizes (JS files only):");
for (const [name, bytes] of entries) {
  console.log(
    ` ${name.padEnd(24)} ${(bytes / 1024).toFixed(1).padStart(7)} KB`,
  );
}
