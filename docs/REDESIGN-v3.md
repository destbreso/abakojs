# abakojs v3, the refounding

## Why

v2 markets itself as *"floats are broken for money, use this instead"* but is **built on floats** and reproduces exactly the bug class it warns against, in its flagship features:

| Symptom (v2, verified) | Root cause |
|---|---|
| `add(0.14, 0.28) → 0.43` (should be `0.42`) | `value()` uses `Math.ceil10` → always rounds **up** (ceil), a biased mode, not half-up/half-even |
| `value(0.101) → 0.11`, systematic +$5.38 overcharge summing 1000 prices | same ceil bias |
| `cents2Amount(cents(1.10))` **throws** `ArgumentError` | `toCents` does `value(amount) * 100` in float → `110.00000000000001` |
| `split(0.29, 2) → [0.14, 0.14]` (loses a cent) | `toCents` float bug propagates into the partition remainder logic |

All four trace to **one defect**: the engine is IEEE-754 float.

## Positioning (the defensible niche)

Weekly npm downloads: decimal.js 73M · bignumber.js 51M · big.js 33M · currency.js 865K · dinero.js 461K · abakojs ~3.
The top (arbitrary precision) and middle (money objects) are saturated. The one open, defensible edge:

> **The correctness of integer-based money math, with the ergonomics of plain numbers, plus batteries-included business recipes (fees / discounts / split / tax), zero-dependency and tiny.**

- currency.js, dinero.js, decimal.js **all force wrapper objects**. abakojs stays *number in → number out*.
- None of the big three ship fee/discount/split/tax **recipes**. That is the genuine differentiator.

Target user: *"I want correct money math with plain numbers and ready-made e-commerce/billing recipes, without wrapper objects or a 280 KB decimal lib."*

## Engine architecture

Internal exact decimal: `{ coef: bigint (signed), scale: number ≥ 0 }`, value = `coef / 10^scale`.

- **Parsing is the anti-bug boundary.** `number → n.toString() → parse exactly`. `String(0.29) === "0.29"` (JS emits the shortest round-tripping decimal), so `0.29` becomes `coef=29, scale=2`, never `0.2899…`. String inputs are parsed exactly at full precision. Garbage-in only if the caller already did float math before calling us (unavoidable, correct).
- **All ops in BigInt** (add/sub align scales; mul adds scales; div does long division to target places with remainder for rounding). No float in the hot path.
- **Round once, explicitly**, with a selectable mode.
- **Output** back to `number` via a constructed decimal string + `Number()` (no float divide). Documented safe range: exact while the minor-unit integer stays < 2^53 (≈ $90 trillion at 2 dp, ≈ $90M at 8 dp). Beyond that, `number` output is lossy by definition; a `toString`/exact escape hatch is provided.

## Rounding modes

`RoundingMode`: `HALF_EVEN` (default), `HALF_UP`, `HALF_DOWN`, `UP`, `DOWN`, `CEIL`, `FLOOR`.

- **Default = HALF_EVEN** (banker's): unbiased over many roundings, the finance/accounting standard. This is a **breaking change** from v2's ceil.
- Configurable globally (`setDefaultRounding`) and per call (optional 3rd positional / opts).
- v2 behavior is reproducible with `CEIL` for anyone who depended on it.

## API & compatibility

- Keep every v2 export and signature (incl. deprecated aliases). Add optional rounding config.
- New major **v3** (results change because the default rounding changes). Ship a migration guide.
- Fixes: `cents()` returns exact integers; `split()` exact via largest-remainder with index tie-break (preserves `split(1,3)=[0.34,0.33,0.33]`, fixes `split(0.29,2)=[0.15,0.14]`).

## Phases

1. Exact engine + its own property-tests. ← start here
2. Rewire public API onto the engine; fix cents/split/rounding.
3. Update test suite (retire ceil-artifact expectations) + add invariants (split sum-preservation, cents round-trip, zero-bias).
4. Rewrite README honestly + migration guide.
5. Honest re-benchmark (fast-path the common 2-dp case).

> Package name stays **abakojs** (already on npm under `destbreso`). Local folder name is cosmetic and left as-is.
