"use strict";

const A = require("./arithmetic");
const R = require("./recipes");
const C = require("./currency");

/**
 * Optional fluent pipeline over a plain number. Every step returns a new chain
 * (immutable); `.value` / `.done()` / coercion give the plain number back.
 *
 * This is a convenience ONLY: the whole library works on plain numbers without
 * it. Unlike currency.js / dinero, you are never forced into a wrapper type.
 *
 *   chain(46.44).deductPercent(5).addPercent(21).value        // 53.39
 *   chain(121).netFromGross(21).value                          // 100
 *   chain(1000000.05).allocate([50, 30, 20])                   // terminal → array
 */
function chain(amount, decimals = 2, rounding) {
  const step = (n) => ({
    value: n,
    valueOf: () => n,
    done: () => n,
    // arithmetic
    add: (y) => step(A.add(n, y, decimals, rounding)),
    subtract: (y) => step(A.subtract(n, y, decimals, rounding)),
    multiply: (f) => step(A.multiply(n, f, decimals, rounding)),
    divide: (d) => step(A.divide(n, d, decimals, rounding)),
    fx: (rate) => step(A.fx(n, rate, decimals, rounding)),
    // percentage / fee / discount recipes
    addPercent: (p) => step(R.addPercent(n, p)),
    deductPercent: (p) => step(R.deductPercent(n, p)),
    addFees: (p, fee) => step(R.addFees(n, p, fee)),
    deductFees: (p, fee) => step(R.deductFees(n, p, fee)),
    addMaxFee: (p, fee) => step(R.addMaxFee(n, p, fee)),
    deductMaxFee: (p, fee) => step(R.deductMaxFee(n, p, fee)),
    // VAT
    grossFromNet: (p) => step(R.grossFromNet(n, p)),
    netFromGross: (p) => step(R.netFromGross(n, p)),
    taxFromGross: (p) => step(R.taxFromGross(n, p)),
    // terminals
    allocate: (ratios) => R.allocate(n, ratios),
    split: (...parts) => R.partition(n, ...parts),
    format: (code, locale, opts) => C.format(n, code, locale, opts),
  });
  return step(A.value(amount, decimals, rounding));
}

module.exports = { chain };
