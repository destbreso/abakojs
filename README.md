# abakojs

Money arithmetic that is exact to the last cent, and still takes plain JavaScript numbers and gives plain numbers back.

---

## What this is

JavaScript has one number type and it is binary floating point. Money is defined in decimal. Those two facts do not fit together, and the mismatch shows up on the first line you write:

```js
// Addition
0.1 + 0.2                // 0.30000000000000004
0.1 + 0.2 + 0.3          // 0.6000000000000001

// Multiplication
0.07 * 3                 // 0.21000000000000002
100 * 0.07               // 7.000000000000001

// Percentages
49.99 * 0.92             // 45.99080000000001   (FX conversion drift)

// Rounding
(1.005).toFixed(2)       // "1.00"  (should be "1.01" under half-up)
```

None of that is a bug. It is IEEE 754 doing exactly what it says it does: `0.1` has no finite binary expansion, so the value you added was never `0.1` to begin with. On an invoice, a checkout, a payout run or a crypto wallet, that residue is real money, and it accumulates over a ledger.

The family of tools that fixes this is **exact decimal arithmetic** (fixed-point arithmetic, in the older name), and in JavaScript it includes big.js, decimal.js, dinero.js and currency.js. abakojs belongs to that family. The shared idea is worth one paragraph, because the rest of this page reads easily once you have it.

Stop storing the amount as a float and store it as an integer coefficient plus a scale: `19.99` is the pair `(1999, 2)`, `0.00000001` is `(1, 8)`. Addition lines up the two scales and adds two integers. Multiplication multiplies the coefficients and adds the scales. Division is long division carried out to the number of places you asked for, keeping the remainder so the last digit can be decided rather than inherited. Nothing rounds in the middle: it rounds once, at the end, under a mode you chose.

abakojs implements that with three commitments:

1. **The engine is exact.** Every value is parsed into a BigInt-backed decimal and all arithmetic runs in integer space. The coefficient is a BigInt, so it does not overflow at any amount, and there is no float in the computation path.
2. **The anti-drift boundary is parsing.** A number is read through `n.toString()`, which yields the shortest round-tripping decimal (`String(0.29) === "0.29"`, never `"0.2899999..."`), so what enters the engine is the number you meant. Strings are parsed at full precision. `0.1 + 0.2` done *inside* abakojs is exact; only pre-corrupted input (float math you did before calling) carries junk in.
3. **Rounding is a decision, not a default you inherit.** Half-even (banker's) unless you say otherwise, per call or globally, across seven modes.

What separates abakojs inside the family is the boundary. The others hand you a value object you must construct and unwrap: `currency(x).value`, `new Decimal(x).toNumber()`, `dinero({ amount, currency })` and then `toDecimal()`. abakojs takes a `number` or a `string` and returns a `number`, so it drops into code that already moves amounts around as numbers.

```js
import { sum, multiply, percent, fx, value } from 'abakojs';

sum(0.1, 0.2)          // 0.3    (0.1 + 0.2 → 0.30000000000000004 natively)
multiply(0.07, 3)      // 0.21   (0.07 * 3 → 0.21000000000000002 natively)
percent(100, 15)       // 15     → 100 + 15 = 115
fx(49.99, 0.92)        // 45.99  (no conversion drift)
value(10.2506)         // 10.25  (rounded correctly, half-even)
```

All functions also accept **strings** and **mixed inputs**, whatever comes back from a form, an API, or a database:

```js
add('0.1', '0.2')              // 0.3
sum('19.99', 4.99, '0.50')     // 25.48
multiply('19.99', '3')         // 59.97
compare('1.99', '2.00')        // -1
```

Because the result comes back as a `number`, the output is exact while the amount fits a double at its minor-unit scale, which is far past any realistic ledger and is spelled out in [Precision and limits](#precision-and-limits).

The engine is checked against decimal.js as an independent oracle: 4,000 random decimal strings per operation for `value`, `add`, `subtract`, `multiply`, `divide` and `percent`, plus 800 more for each of the seven rounding modes, every one required to match exactly. Exhaustive sweeps then assert that `split` never loses a cent, that `cents()` round-trips, and that the default rounding carries no cumulative bias. 644 tests in total.

---

## Install

```bash
npm install abakojs
# pnpm add abakojs
# yarn add abakojs
```

TypeScript types and ESM/CJS builds are included. No `@types` package needed.

---

## Quick Start

```js
// CommonJS
const { sum, value, percent, addPercent, deductPercent, split } = require('abakojs');

// ESM / TypeScript
import { sum, value, percent, addPercent, deductPercent, split } from 'abakojs';
```

```js
value(10.2506)             // 10.25
sum(19.99, 4.99, 0.50)     // 25.48
percent(249.90, 8.5)       // 21.24
addPercent(89.99, 21)      // 108.89  (add 21% VAT)
deductPercent(149.99, 15)  // 127.49  (15% discount)
split(49.99, 3)            // [16.67, 16.66, 16.66]  (exact, no cent lost)
```

---

## Rounding

Money rounding is a policy decision, not a detail, so abakojs makes it explicit.

The default mode is **`HALF_EVEN`** (banker's rounding): halves go to the nearest even digit, so rounding is unbiased over many operations. This is what accounting and finance systems use to avoid the systematic drift that "always round up" or even "always round half-up" introduce at scale.

```js
import { value, RoundingMode, setDefaultRounding } from 'abakojs';

// Default: HALF_EVEN
value(1.005)                         // 1     (tie; the digit kept is 0, already even)
value(2.675)                         // 2.68  (tie; the digit kept is 7, so it goes to 8)

// Per call
value(1.005, 2, RoundingMode.HALF_UP)  // 1.01  (common retail rule)
value(0.101, 2, RoundingMode.CEIL)     // 0.11  (always round up)

// Globally, once, at startup
setDefaultRounding(RoundingMode.HALF_UP);
value(1.005)                         // 1.01
```

Available modes:

| Mode        | Behavior                                     |
|-------------|----------------------------------------------|
| `HALF_EVEN` | Half to nearest even (banker's). **Default** |
| `HALF_UP`   | Half away from zero (`0.5 → 1`, `-0.5 → -1`)  |
| `HALF_DOWN` | Half toward zero                             |
| `UP`        | Away from zero (ceil of magnitude)           |
| `DOWN`      | Toward zero (truncate)                        |
| `CEIL`      | Toward +∞                                     |
| `FLOOR`     | Toward -∞                                     |

Every function that produces a rounded amount (`value`, `add`, `subtract`, `multiply`, `divide`, `fx`, `percent`, `compare`) accepts an optional trailing `rounding` argument. For the variadic functions (`sum`, `min`, `max`) pass it in the options object: `sum(a, b, { rounding: RoundingMode.HALF_UP })`.

---

## Where this earns its place

The shape to look for is money that gets *computed on*, not just displayed: a value that passes through a discount, a tax, a fee, a division, and has to come out the other side agreeing with an invoice. Each case below has a worked example in [Common Use Cases](#common-use-cases).

**Checkout math, where a discount, a tax and a rounding rule compose.** A line-item subtotal, then a 5% coupon, then 21% VAT is three operations, and the naive version rounds after each one, so the total quietly depends on the order you wrote them in. Every percentage recipe here computes `amount * (100 ± p) / 100` and rounds the result once, and `sum` aggregates the line items in one exact pass, so no rounded intermediate is ever fed forward.

**Invoices and platform fees with a floor.** "2.9% plus $0.30" and "2.5% or a $4.99 minimum, whichever is larger" are the fee shapes every marketplace and payment integration ends up writing by hand. They are one call each: `addFees`, `addMaxFee`, and their deducting counterparts.

**Anything that has to sum back to the total.** Splitting a bill three ways, allocating revenue across partners, apportioning a cost across cost centers. The failure is always the same one: a rounded share times N is not the total, so a cent goes missing or gets created. `split` and `allocate` distribute in exact integer minor units by largest remainder, so the parts always add back up. The test suite asserts that exhaustively rather than by example: every amount from `0.00` to `6.00` across 1 to 13 equal parts, and six different weight sets across every amount from `0.00` to `5.00`.

**Tax-inclusive and tax-exclusive amounts.** VAT, GST, and any sales tax quoted gross. `grossFromNet`, `netFromGross` and `taxFromGross` speak the accounting vocabulary directly, and net plus tax returns the gross you started from.

**Amounts that arrive as strings.** Form fields, JSON payloads, and `DECIMAL`/`NUMERIC` columns that the driver hands over as text. The usual first move, `Number(x)`, is where the precision is lost before any library gets a chance at it. Every function here accepts a string and parses it at full precision, so the value enters the arithmetic exactly as written, however many digits it has.

**Scales other than two decimals.** `decimals` is a parameter on every operation: `8` for BTC or ETH, `6` for USDC, `0` for a whole-unit currency. The engine does not privilege cents, so a crypto ledger and a fiat ledger use the same functions.

**Bundles where a dependency has to justify itself.** Zero runtime dependencies, ESM and CJS, 3.4 KB gzipped for the core and 5.1 KB for the full build with formatting, conversion and the chain. That is affordable in a Lambda, an edge function or a browser bundle where decimal.js costs 12.5 KB for a superset you are not using.

**Code that hands money across boundaries that only speak numbers.** React props, a JSON response, a chart library, an ORM write. A value object has to be unwrapped at every one of those, and every unwrap is somewhere to forget. Plain numbers in and out means there is nothing to unwrap.

---

## Ergonomics

abakojs aims to be the most ergonomic money library: the least code, the fewest concepts, no wrapper ceremony. Every other library forces you to wrap each value in an object (`currency(x)`, `new Decimal(x)`, `dinero({ amount, currency })`) and unwrap it again (`.value`, `.toNumber()`, `toDecimal()`). abakojs takes plain numbers and gives plain numbers back.

The same real task, in each library (source characters, and how many wrapper constructions/unwraps you are forced to write, measured by `node bench/ergonomics.js`):

**Allocate `$1,000,000.05` across owners `50/30/20`, no cent lost:**

```js
// abakojs: 40 chars, 0 wrappers
allocate(1000000.05, [50, 30, 20]);                 // [500000.03, 300000.01, 200000.01]

// dinero.js v2: 123 chars, 2 wrappers (amounts must be pre-scaled to integer cents)
const d = dinero({ amount: 100000005, currency: USD });
dAllocate(d, [50, 30, 20]).map((p) => Number(toDecimal(p)));

// currency.js: 419 chars, it has no weighted allocation, so you hand-roll largest-remainder
```

**Take a gross of `$121` (21% VAT) and get net + tax:**

```js
// abakojs: 57 chars, 0 wrappers
const net = netFromGross(121, 21);   // 100
const tax = taxFromGross(121, 21);   // 21

// currency.js: 136 chars, 3 wrappers   ·   decimal.js: 194 chars, 4 wrappers
```

| Task                                   | abakojs | currency.js | decimal.js | dinero.js v2 |
|----------------------------------------|:-------:|:-----------:|:----------:|:------------:|
| Cart → coupon → VAT (chars / wrappers) | **117 / 1** | 141 / 3 | 189 / 3 | 368 / 3 |
| Weighted allocation (chars / wrappers) | **40 / 0**  | 419 / 2 | n/a     | 123 / 2 |
| Net + tax from gross (chars / wrappers)| **57 / 0**  | 136 / 3 | 194 / 4 | n/a     |

For sequential pipelines there is also an optional fluent `chain` (still plain numbers in and out, see below), so you are never *forced* into a wrapper the way the alternatives require.

---

## Benchmarks

### Speed

`node bench/bench.js` (Node 22, Apple M-series, 500k iterations each). Numbers are indicative and vary run to run.

| Operation (ops/sec)     |    abakojs |  currency.js | decimal.js |    big.js | dinero.js v2 |
|-------------------------|-----------:|-------------:|-----------:|----------:|-------------:|
| `add(0.1, 0.2)`         | ~2,900,000 |   ~1,650,000 | ~1,450,000 | ~3,200,000 | ~3,900,000 ¹ |
| `subtract(1.01, 0.99)`  | ~3,900,000 |   ~1,650,000 | ~1,600,000 |      n/a | ~5,150,000 ¹ |
| `multiply(165, 1.40)`   | ~4,300,000 |   ~2,030,000 | ~2,610,000 | ~2,040,000 | ~6,350,000 ¹ |
| `value()` rounding      | **~5,220,000** | ~4,630,000 | ~2,100,000 | ~4,250,000 |        n/a |
| `split / allocate(1,3)` | **~1,450,000** |   ~590,000 |        n/a |      n/a | ~1,410,000 ¹ |
| `sum([10 items])`       | **~600,000** |     ~160,000 |   ~360,000 |      n/a |        n/a |
| `percent(524.25, 8.75)` | **~4,100,000** | ~1,070,000 | ~1,050,000 |      n/a |        n/a |
| `format(1234.56, 'USD')` |    ~62,000 | **~1,220,000** |        n/a |      n/a |        n/a ² |

> ¹ dinero.js v2 operates on integer cents you supply pre-scaled (`dinero({ amount: 10, currency: USD })`), which skips the number-to-decimal step. It is faster on raw pairwise arithmetic but requires wrapper objects and verbose setup for every value.
>
> ² `format` is the one row abakojs loses badly, by about 20x, and it is not an arithmetic result. `format` delegates to `Intl.NumberFormat`, which measures at ~63,000 ops/sec on its own: abakojs is within 3% of the platform primitive it calls. currency.js is fast here because it builds the string by hand and therefore does not do what `Intl` does. If you are formatting in a hot loop, hoist an `Intl.NumberFormat` yourself and format from it, whichever library you use.

**abakojs is faster than currency.js and decimal.js on every arithmetic operation measured here**, and it leads on rounding, aggregation and allocation. big.js and dinero edge it on raw pairwise add and multiply because they work on a bare number or a pre-scaled integer with no money semantics. Against dinero on allocation the two are 1,456,873 against 1,436,920 ops/sec, a 1.4% gap from a single run: that is not a win, it is a tie this harness cannot separate, and calling it either way would need separate processes and a paired sign test rather than one number.

### Size (minified + gzipped)

`node bench/size.js` bundles each library's full public API with esbuild and gzips it (the number that lands in your app).

| Library          |   min | min+gzip | note |
|------------------|------:|---------:|------|
| currency.js      | 2.2 KB |  1.0 KB | float-based; no rounding modes, recipes, or exactness |
| **abakojs (core)** | **8.9 KB** | **3.4 KB** | engine + arithmetic + recipes |
| **abakojs (full)** | **14.4 KB** | **5.1 KB** | + formatting + conversion + chain |
| dinero.js v2     | 18.8 KB |  5.2 KB | tree-shakeable; wrapper objects |
| big.js           |  6.7 KB |  2.9 KB | a decimal type only (no money features) |
| decimal.js       | 31.3 KB | 12.5 KB | arbitrary-precision decimal type |

abakojs is not the single smallest file (currency.js is, at the cost of exactness and features), but it packs the most capability per kilobyte: an exact BigInt engine, seven rounding modes, the full recipe set, formatting and conversion, all in ~5 KB gzipped, smaller than dinero's full build and under half of decimal.js.

### Feature comparison

| Feature                                        |     abakojs      | currency.js | dinero.js v2 | decimal.js |
|------------------------------------------------|:----------------:|:-----------:|:------------:|:----------:|
| Zero runtime dependencies                      |        ✅         |      ✅      |      ✅       |     ✅      |
| Exact (integer/BigInt) computation             |        ✅         |      ❌ (float) |   ✅       |     ✅      |
| Plain-number API (no wrapper objects)          |        ✅         |      ❌      |      ❌       |     ❌      |
| Optional fluent chain                          |        ✅         |      ✅      |      ❌       |     ❌      |
| Configurable rounding modes                    |        ✅         |   partial   |      ✅       |     ✅      |
| Unbiased default (half-even / banker's)        |        ✅         |      ❌      |      ✅       |     ❌      |
| Aggregate `sum` / `total` of N amounts         |        ✅         |      ❌      |      ❌       |     ❌      |
| Fee / discount / tax recipes                   |        ✅         |      ❌      |      ❌       |     ❌      |
| Exact split + `allocate` by ratio              |        ✅         |   split only |     ✅       |     ❌      |
| VAT: gross / net / tax                         |        ✅         |      ❌      |      ❌       |     ❌      |
| FX conversion + currency formatting            |        ✅         |      ✅      |      ✅       |     ❌      |
| Configurable precision (crypto, 8+ decimals)   |        ✅         |      ✅      |      ✅       |     ✅      |
| Arbitrary precision beyond `number` range      |        ❌         |      ❌      |      ✅       |     ✅      |

---

## When not to use this

Both ends, honestly, because a package that only names where it wins is advertising.

**You need precision past what a `number` can carry.** The engine is exact at any size, but the result is handed back as a JS number, so the guarantee ends where the double's safe integer range does. If you work at that boundary, or in a domain where the value must never round-trip through a double at all, use decimal.js or big.js, which keep the value as an object from end to end, or dinero.js v2, which holds the integer minor units you supply. Passing strings in and out of abakojs keeps the *input* exact, but the return type is still a number.

**You want the currency to be part of the type.** abakojs computes on bare numbers, and nothing in it stops you adding a dollar amount to a yen amount: the currency lives in your code, not in the value. If making that mistake impossible is the point, dinero.js v2 carries the currency and its exponent inside the object. That is precisely the guarantee this package does not offer.

**You need math beyond arithmetic.** There is `add`, `subtract`, `multiply`, `divide`, `percent`, comparison, and the money recipes. There are no powers, roots, logarithms or trigonometry. Amortization schedules, compound interest over N periods, IRR and option pricing all need functions that are not here, and decimal.js has them at arbitrary precision.

**Your amounts are already integer minor units and stay that way.** If the money arrives as integer cents, is stored as integer cents, and is only added and subtracted, plain integer arithmetic is already exact below 2⁵³ and a decimal engine buys you nothing. The one thing worth coming back for is division: splitting integer cents three ways still has to put the remainder somewhere, and that is what `allocate` does.

**You are counting bytes and exactness is not the requirement.** currency.js is the smallest thing in this field, 1.0 KB gzipped against this package's 3.4 KB core, and for display-only work at two decimals on small amounts, scaling to an integer with floats mostly agrees with doing it exactly. "Mostly" is the entire distinction. If a discrepancy in the last cent is not a problem you have, the smaller file is a fair trade.

**All you need is formatting.** `Intl.NumberFormat` ships in every runtime and formats currency for free. `format` here is a thin wrapper over it that adds crypto symbols and routes the amount through the rounding engine first. If you are not doing arithmetic, use the platform.

| Your case                                                   | Reach for      |
|-------------------------------------------------------------|----------------|
| Currency-typed money objects, strict money algebra          | dinero.js v2   |
| Amounts beyond the `number` safe range, arbitrary precision | decimal.js, big.js, dinero.js v2 |
| Scientific decimals: powers, roots, logs                    | decimal.js     |
| Display formatting only                                     | `Intl.NumberFormat` |
| Smallest possible file, float-based is acceptable           | currency.js    |

What is left, and what this package is for: decimal money math in ordinary application code, at the amounts real ledgers hold, where the rounding rule should be a decision rather than whatever the language defaults to, and where you would rather not construct and unwrap a value object at every boundary.

---

## Common Use Cases

### E-commerce cart total

```js
import { sum, multiply, deductPercent, addPercent } from 'abakojs';

const items = [
  { price: 19.99, qty: 2 },
  { price: 4.99,  qty: 1 },
  { price: 0.49,  qty: 3 },
];

const subtotal    = sum(items.map(i => multiply(i.price, i.qty)));
// 46.44  (= 39.98 + 4.99 + 1.47), no rounding drift

const afterCoupon = deductPercent(subtotal, 5);   // 44.12  (5% coupon)
const total       = addPercent(afterCoupon, 21);  // 53.39  (21% VAT)
```

### Invoice with fees

```js
import { addFees, addMaxFee, deductFees } from 'abakojs';

// Platform fee: 2.9% + $0.30 flat (Stripe-style)
addFees(49.99, 2.9, 0.30)       // 51.74

// Charge whichever is higher: 2.5% or $4.99 minimum
addMaxFee(149.99, 2.5, 4.99)    // 154.98  ($4.99 wins over 3.75)
addMaxFee(299.99, 2.5, 4.99)    // 307.49  (7.50 wins over $4.99)

// Coupon: 12% off + $2.50 flat discount
deductFees(89.99, 12, 2.50)     // 76.69
```

### Split a bill without losing cents

```js
import { split } from 'abakojs';

split(49.99, 3)               // [16.67, 16.66, 16.66]
split(74.97, [50, 30, 20])    // [37.49, 22.49, 14.99]
split(0.07, [50, 30, 20])     // [0.04, 0.02, 0.01]  (remainder to first)
```

`split` works in exact integer cents, so the parts **always** sum back to the original: no cent is lost or duplicated, for any amount or any weighting.

### Allocate by ratio (accounting allocation)

`allocate` distributes an amount across arbitrary positive **ratios** (they need not sum to 100 or to 1), exactly. This is the accounting "allocation" primitive: revenue shares, cost apportionment, dividing a bill.

```js
import { allocate } from 'abakojs';

allocate(1000, [7, 3])        // [700, 300]         (70% / 30%)
allocate(100, [1, 1, 1])      // [33.34, 33.33, 33.33]
allocate(0.05, [1, 1])        // [0.03, 0.02]       (odd cent to the first)
allocate(100, [3, 2, 1])      // [50.01, 33.33, 16.66]
```

### VAT: gross, net, and tax

Tax-inclusive and tax-exclusive conversions, done exactly, mapped straight to accounting terms.

```js
import { grossFromNet, netFromGross, taxFromGross } from 'abakojs';

grossFromNet(100, 21)   // 121    (net + 21% VAT → gross)
netFromGross(121, 21)   // 100    (strip VAT from a gross amount)
taxFromGross(121, 21)   // 21     (the VAT contained in a gross amount)

netFromGross(100, 21)   // 82.64
taxFromGross(100, 21)   // 17.36  (net + tax === gross, always)
```

### Fluent chain (optional)

For sequential pipelines, `chain` reads left to right and unwraps with `.value` (or `.done()`). It is a convenience only: still plain numbers in and out, and unlike currency.js / dinero you are never *forced* into a wrapper type.

```js
import { chain } from 'abakojs';

chain(46.44).deductPercent(5).addPercent(21).value   // 53.39
chain(121).netFromGross(21).value                    // 100
chain(89.99).addFees(2.9, 0.30).value                // 92.90
chain(1000000.05).allocate([50, 30, 20])             // terminal → [500000.03, 300000.01, 200000.01]
chain(1234.56).format('USD', 'en-US')                // terminal → '$1,234.56'
```

### Currency formatting

```js
import { format } from 'abakojs';

format(1234.56, 'USD', 'en-US')   // '$1,234.56'
format(1234.56, 'USD', 'de-DE')   // '1.234,56 $'  (same amount, German locale)
format(1234.56, 'GBP', 'en-GB')   // '£1,234.56'
format(1234.56, 'JPY', 'ja-JP')   // '￥1,235'      (zero-decimal currency)
format(-19.99, 'USD', 'en-US')    // '-$19.99'
format(0.12345678, 'BTC')         // '₿0.12345678'
```

### Multi-currency conversion

```js
import { convert } from 'abakojs';

const rates = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5 };

convert(100, 'USD', 'EUR', rates)       // 92
convert(100, 'EUR', 'USD', rates)       // 108.7
convert(100, 'EUR', 'GBP', rates)       // 85.87  (cross-rate auto-calculated)
```

### Crypto / high-precision arithmetic

Every function accepts a `decimals` parameter (default `2`). Set it to `8` for BTC, `6` for USDC, or any value.

```js
import { add, subtract, sum, value } from 'abakojs';

value(0.123456789, 8)                          // 0.12345679
add(0.12345678, 0.00000001, 8)                 // 0.12345679
subtract(1, 0.00000001, 8)                     // 0.99999999
sum(0.001, 0.002, 0.003, { decimals: 8 })      // 0.006
```

---

## API Reference

All functions return `NaN` for invalid inputs (`null`, `undefined`, `[]`, `{}`, `true/false`, non-numeric strings) unless otherwise noted. Every rounding uses the current default mode unless a `rounding` argument is given.

### Core

#### `value(amount, decimals?, rounding?)`

Rounds an amount to the specified number of decimal places (default `2`). This is the core of the library: all other functions route through it.

```js
value(10.2506)          // 10.25
value(10.2506, 4)       // 10.2506
value('50.001')         // 50
value(null)             // NaN
```

#### `cents(amount)`

Converts a monetary amount to its **exact** integer cent representation (always an integer, always round-trippable).

```js
cents(0.01)    // 1
cents(3.12)    // 312
cents(0.29)    // 29
cents(0.11001) // 11
```

#### `cents2Amount(cents)`

Converts an integer cent value back to a monetary amount. Throws `ArgumentError` if the input is negative or not an integer.

```js
cents2Amount(157)          // 1.57
cents2Amount(cents(19.99)) // 19.99  (exact round-trip)
cents2Amount(12.5)         // throws ArgumentError
```

#### `fx(amount, fxRate, decimals?, rounding?)`

Applies an exchange rate (or any multiplier) to an amount.

```js
fx(49.99, 1.0847)            // 54.22  (USD → CAD)
fx('99.95', 0.9201)          // 91.96  (string input, USD → EUR)
```

### Arithmetic

#### `sum(...amounts)` / `sum(amounts[])` / `sum(...amounts, { decimals, rounding })`

Aggregates any number of amounts. Accepts variadic arguments, spread arrays, or a single array.

```js
sum(0.1, 0.2)               // 0.3
sum([0.1, 0.2, -0.3])       // 0
sum(0.12345678, 0.00000001, { decimals: 8 })   // 0.12345679
```

#### `add(x, y, decimals?, rounding?)` / `subtract(x, y, decimals?, rounding?)`

```js
add(0.1, 0.2)          // 0.3
add(0.14, 0.28)        // 0.42
subtract(1.01, 0.99)   // 0.02
subtract(0.3, 0.1)     // 0.2
```

#### `multiply(amount, factor, decimals?, rounding?)`

```js
multiply(49.99, 1.21)      // 60.49  (apply 21% markup)
multiply(0.07, 3)          // 0.21
```

#### `divide(amount, divisor, decimals?, rounding?)`

Exact long division. Throws `ArgumentError` on division by zero.

```js
divide(123.45, 2)   // 61.72
divide(74.97, 3)    // 24.99
divide(10, 3)       // 3.33
divide(49.99, 0)    // throws ArgumentError
```

#### `percent(amount, p, decimals?, rounding?)`

Computes `p`% of `amount`. Throws `ArgumentError` for a negative `p`.

```js
percent(249.90, 8.5)    // 21.24
percent(524.25, 8.75)   // 45.87
```

### Comparison

#### `compare(lh, rh, decimals?, rounding?)`

Compares two monetary amounts **after rounding both** to `decimals`. Returns `-1`, `0`, or `1` (`NaN` if either operand is invalid).

```js
compare(19.99, 24.99)    // -1
compare(9.99, 9.990)     //  0
compare('0.10', 0.1)     //  0
```

Because both sides are rounded before comparing, two values that differ only beyond the active decimal place compare equal:

```js
compare(0.001, 0.002)        //  0  (both round to 0.00 at 2 dp)
compare(9.994, 9.999)        // -1  (9.99 vs 10.00 at 2 dp)
compare(9.994, 9.999, 3)     // -1  (9.994 < 9.999 at 3 dp)
```

Also available: `equal`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `min(...amounts)`, `max(...amounts)`, all with the same `(…, decimals?, rounding?)` shape.

### Guards

`isValid(amount)`, `isZero(amount, decimals?)`, `isPositive(amount, decimals?)`, `isNegative(amount, decimals?)`, `abs(amount, decimals?)`.

```js
isValid('10.5')   // true
isValid(NaN)      // false
isZero(0.004)     // true   (rounds to 0.00 at 2 dp)
isPositive(0.01)  // true
abs('-3.14')      // 3.14
```

### Formatting & Conversion

#### `format(amount, currencyCode?, locale?, options?)`

Formats via `Intl.NumberFormat`. Handles ISO 4217 currencies plus BTC, ETH, SAT. Throws `ArgumentError` on non-numeric amount or unsupported currency.

#### `convert(amount, from, to, rates, decimals?)`

Converts between currencies using a rates table mapping codes to a common base. Cross-rates are computed automatically, as `to / from` in double precision, and the resulting factor is then applied exactly. Throws `ArgumentError` if a code is missing from the table or the source rate is zero.

---

## Recipes

Higher-level operations, available as `recipes.*` and as direct named exports.

| Function | Meaning | Example |
|---|---|---|
| `split(amount, parts)` | Split into equal or weighted (sum-to-100) parts, exact | `split(1, 3) → [0.34, 0.33, 0.33]` |
| `allocate(amount, ratios)` | Allocate across arbitrary ratios, exact | `allocate(1000, [7, 3]) → [700, 300]` |
| `addPercent(amount, p)` | Add a percentage | `addPercent(89.99, 21) → 108.89` |
| `deductPercent(amount, p)` | Deduct a percentage | `deductPercent(89.99, 15) → 76.49` |
| `maxFee(amount, p, fee)` | Larger of `p%` or a fixed fee | `maxFee(29.99, 10, 4.99) → 4.99` |
| `addMaxFee(amount, p, fee)` | Add the larger of `p%` or fee | `addMaxFee(29.99, 10, 4.99) → 34.98` |
| `addFees(amount, p, fee)` | Add both `p%` and a fixed fee | `addFees(49.99, 2.9, 0.30) → 51.74` |
| `deductMaxFee(amount, p, fee)` | Deduct the larger of `p%` or fee | `deductMaxFee(149.99, 5, 12) → 137.99` |
| `deductFees(amount, p, fee)` | Deduct both `p%` and a fixed fee | `deductFees(89.99, 12, 2.50) → 76.69` |
| `grossFromNet(net, p)` | Add tax: net → gross (tax-inclusive) | `grossFromNet(100, 21) → 121` |
| `netFromGross(gross, p)` | Strip tax: gross → net (tax-exclusive) | `netFromGross(121, 21) → 100` |
| `taxFromGross(gross, p)` | The tax contained in a gross amount | `taxFromGross(121, 21) → 21` |

`addPercent`/`deductPercent`/etc. round the final amount once (they compute `amount * (100 ± p) / 100` and round the result), so they never drift from a rounded intermediate. `split`/`allocate` distribute in exact integer cents (largest-remainder), so parts always sum back to the total.

The vocabulary maps straight onto accounting practice: **allocation** (apportioning by ratio), **tax-inclusive vs tax-exclusive** amounts (`gross`/`net`), and **banker's rounding** (`HALF_EVEN`, the unbiased default). `total` is an alias of `sum`.

> The older names `applyTax`, `applyDiscount`, `maxTax`, `applyMaxTax`, `applySumTax`, `applyMaxDiscount`, `applySumDiscount`, and `partition` remain as deprecated aliases.

---

## Precision and limits

abakojs computes exactly in BigInt, then returns a JS `number`. The arithmetic is always exact; the ceiling belongs to the return type. A double can only hand back an amount it can represent, and the spacing between neighbouring doubles grows with magnitude, so the limit sits where that spacing exceeds one unit of the last place:

- At 2 decimals: exact below `$70,368,744,177,664` (2⁴⁶), roughly $70 trillion.
- At 8 decimals: exact below `67,108,864` units (2²⁶).

Both are measured rather than reasoned about. `npm run precision` sweeps each scale against a BigInt oracle and prints where the first failure lands, and `test/precision.test.js` pins the ceilings so neither can move without a test going red.

The rule behind those two numbers is worth stating, because the intuitive version of it is wrong. The limit is **not** where the count of minor units reaches 2⁵³. That would be the answer if the units were the doubles, and they are not: the amount is. Inside the binade `[2ᵏ, 2ᵏ⁺¹)` the gap between neighbouring doubles is `2ᵏ⁻⁵²`, so the last magnitude that still resolves one unit of the last place is the largest `k` with `2ᵏ⁻⁵² ≤ 10⁻ᵈ`. Above it the nearest representable neighbour is more than a unit away, and no library returning a `number` can give the right answer, because the right answer is not in the type. At `$92,204,735,266,816`, adding one cent lands on `.02`.

"Exact" here means the returned double reads back as the correct amount at `d` decimals. Beyond these ceilings, reach for a library that returns its own decimal type instead of a `number`: `decimal.js` and `big.js` both do, and [When not to use this](#when-not-to-use-this) says when that is the right call.

There is deliberately **no float fast-path**: a library whose whole purpose is float-avoidance should not sneak floats back into the hot path. The BigInt engine is fast enough (see the benchmarks above).

---

## Migration from v2

v3 is a foundation rewrite. The API surface is unchanged (same function names and signatures, same deprecated aliases), so most code keeps working. The behavioral change is **rounding**:

- **v2 always rounded up (ceil).** `value(0.101)` returned `0.11`, `add(0.14, 0.28)` returned `0.43`. This introduced a systematic upward bias.
- **v3 rounds half-even (banker's) by default.** `value(0.101)` returns `0.10`, `add(0.14, 0.28)` returns `0.42`.

If you depended on the old always-round-up behavior, opt back into it explicitly:

```js
import { setDefaultRounding, RoundingMode } from 'abakojs';
setDefaultRounding(RoundingMode.CEIL);   // reproduce v2 rounding
```

Also fixed in v3 (these were bugs in v2):

- `cents()` now always returns an exact integer. In v2, `cents(1.10)` returned `110.00000000000001` and `cents2Amount(cents(1.10))` threw.
- `split()` now never loses a cent. In v2, `split(0.29, 2)` returned `[0.14, 0.14]` (summing to `0.28`).

New in v3 (all additive): `RoundingMode` / `setDefaultRounding` / `getDefaultRounding` and an optional `rounding` argument on the arithmetic functions; `allocate` (allocation by arbitrary ratio); `grossFromNet` / `netFromGross` / `taxFromGross` (VAT); the optional fluent `chain`; and `total` as an alias of `sum`.

---

## Error Handling

`ArgumentError` is exported for `catch` blocks and `instanceof` checks.

```js
const { ArgumentError, divide } = require('abakojs');

try {
  divide(10, 0);
} catch (e) {
  if (e instanceof ArgumentError) { /* ... */ }
}
```

---

## License

MIT
