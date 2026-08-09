# Changelog

## 3.0.1

No change to the engine. Four claims in the README were wrong, and one of them was wrong at the exact number it printed.

**The precision ceiling.** The README said 2 decimals were exact up to about `$90,071,992,547,409`, "2^53 cents". Adding a cent to that exact amount returns `...409.02`. The claim read "2^53 units" as the limit, which would be right if the units were the doubles; the amount is. The real limit is the binade where the gap between neighbouring doubles exceeds one unit of the last place: **below 2^46 = `$70,368,744,177,664`** at 2 decimals, and **below 2^26 = `67,108,864` units** at 8. Both are measured by `npm run precision` and pinned by `tests/precision.test.js`, two-sided: exact just under, demonstrably wrong at the boundary.

Why the suite could not see it is worth recording. The decimal.js oracle generated at most six integer digits, so it never visited a magnitude where the question exists, and an oracle that cannot reach a claim cannot check it. It now also sweeps the decade below the documented ceiling.

**The string escape hatch does not exist.** The README told anyone above the ceiling to "keep them as strings and pass strings in and out", and the feature table offered "strings only" for arbitrary precision. Every function returns a `number` and there is no string-returning path. Both claims are gone, and that reader is now routed to `decimal.js` or `big.js`, which return their own type.

**"Faster on every operation" was disproven by this repo's own benchmark.** `bench/bench.js` measures a `format` case the table omitted, where abakojs is about 20x slower than currency.js. The row is in the table now, with the reason: `format` delegates to `Intl.NumberFormat` and lands within 3% of it, while currency.js builds the string by hand and therefore does not do what `Intl` does.

**A 1.4% margin is not a win.** Allocation against dinero was 1,456,873 to 1,436,920 ops/sec from a single run, and the README called it won outright. It now says the harness cannot separate them.

Also: the ergonomics table branded dinero.js v2's cart result as wrong. It was not. The snippet never called `transformScale` before reading the value, so the wrong answer was mine. Fixed, and dinero now shows correct at 368 characters.

## [3.0.0](https://github.com/destbreso/abakojs/compare/v2.3.2...v3.0.0) (2026-07-23)

Foundation rewrite: abakojs now computes on an exact integer (BigInt) decimal engine instead of floating point. The public API (function names and signatures) is unchanged, so most code keeps working, but rounding results differ (see BREAKING).

### ⚠ BREAKING CHANGES

* **Default rounding is now `HALF_EVEN` (banker's), not always-up (ceil).** v2 rounded every amount up: `value(0.101)` was `0.11`, `add(0.14, 0.28)` was `0.43`. v3 rounds half-even by default: `value(0.101)` is `0.10`, `add(0.14, 0.28)` is `0.42`. To reproduce v2 behavior: `setDefaultRounding(RoundingMode.CEIL)`.

### Bug Fixes

* **cents:** `cents()` now always returns an exact integer. In v2, `cents(1.10)` returned `110.00000000000001` and `cents2Amount(cents(1.10))` threw an `ArgumentError`.
* **split:** `split()` (a.k.a. `partition`) now never loses or duplicates a cent. In v2, `split(0.29, 2)` returned `[0.14, 0.14]` (summing to `0.28`). Parts are distributed in exact integer cents.
* **rounding:** all operations round correctly and without the systematic upward bias v2's ceil introduced.

### Features

* exact BigInt decimal engine (`lib/decimal.js`); no float in the computation path.
* configurable rounding: `RoundingMode` (`HALF_EVEN`, `HALF_UP`, `HALF_DOWN`, `UP`, `DOWN`, `CEIL`, `FLOOR`), `setDefaultRounding`, `getDefaultRounding`, and an optional `rounding` argument on `value`/`add`/`subtract`/`multiply`/`divide`/`fx`/`percent`/`compare` (and via the options object on `sum`/`min`/`max`).
* accounting recipes: `allocate` (distribute across arbitrary ratios, exact), `grossFromNet`/`netFromGross`/`taxFromGross` (VAT tax-inclusive/exclusive), and `total` as an alias of `sum`.
* optional fluent `chain` pipeline (plain numbers in and out; you are never forced into a wrapper type).
* property/invariant test suite cross-validated against decimal.js (thousands of random cases per operation, all rounding modes, split/allocate total-preservation, cents round-trip, zero-bias); benchmarks for speed (`bench/bench.js`), bundle size min+gzip (`bench/size.js`), and ergonomics (`bench/ergonomics.js`).

### [2.3.2](https://github.com/destbreso/abakojs/compare/v2.3.1...v2.3.2) (2026-04-06)

## [2.3.1](https://github.com/destbreso/abakojs/compare/v2.3.0...v2.3.1) (2026-04-06)

## [2.3.0](https://github.com/destbreso/abakojs/compare/v2.2.0...v2.3.0) (2026-04-06)

### Features

* add split as preferred alias for partition ([a9d3b31](https://github.com/destbreso/abakojs/commit/a9d3b31f5698e6c9dea29a47a03b49b73e13f359))

## [2.2.0](https://github.com/destbreso/abakojs/compare/v2.0.4...v2.2.0) (2026-04-06)

### Features

* add benchmarks and size comparison for money-math-recipes ([dfe3277](https://github.com/destbreso/abakojs/commit/dfe3277f9d1906c3e841ec38e6d6dc9f50c341f4))
* add currency formatting and conversion functions with tests ([85cd62d](https://github.com/destbreso/abakojs/commit/85cd62d0c0e1625650b5c95aa09e780b98ec54e3))
* add new arithmetic functions (abs, min, max, equal, comparison operators) and update documentation ([7aac692](https://github.com/destbreso/abakojs/commit/7aac692332e547ce11da974880b60447830ea86c))
* enhance arithmetic functions for precision handling ([7a087a7](https://github.com/destbreso/abakojs/commit/7a087a722c8830fdf8d99aaf94607f4d5ffd8a48))
* rename and deprecate tax and discount functions for clarity and consistency ([6cb7da4](https://github.com/destbreso/abakojs/commit/6cb7da41f6366d10bcaf4b2d3cb456bc2387ad16))
* rename project to abakojs and update references in README.md ([a18f4d5](https://github.com/destbreso/abakojs/commit/a18f4d5d3f78472e55e5a884fe6725debded4441))
* update package.json to reflect new project name and enhanced description ([fdd1a07](https://github.com/destbreso/abakojs/commit/fdd1a07e237915284b2df8de120d7d993faa0aee))
* update project name and repository URL in package.json ([adcee09](https://github.com/destbreso/abakojs/commit/adcee091f940740713cb0b0a150a78355bb40c65))

### Bug Fixes

* correct typo in project description ([d9a3280](https://github.com/destbreso/abakojs/commit/d9a3280720148b9423b7a67a694261623117bc69))
* revert version number to 2.1.0 and update files array in package.json ([7a4ee63](https://github.com/destbreso/abakojs/commit/7a4ee633671b64777f774bd1e37f54a00383051a))

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 2.0.4 - 2023-03-07
### Added
- Changelog
