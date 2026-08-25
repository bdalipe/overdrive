# Performance formulas (draft — work in progress)

> **Status:** Early draft for Phase 3. Do not implement locked balance from this document until formulas are reviewed and `formula_version` is set.

## Scope

- Aggregate **performance rating** (0–1000+) and **class** (A, B, C, D, …) from traditional car stats.
- Input stats: 0–60, top speed, handling, drive type, tyre type, weight (respecting Unavailable / N/A).
- Weights derived from the **trackset** in the database (per-track stat importance for winning).

## Track stat weights (examples only)

| Track type | 0-60 | Top speed | Handling | Weight |
|------------|------|-----------|----------|--------|
| Drag strip | 100 | 75 | 0 | 40 |
| Slalom | 45 | 0 | 100 | 80 |

## Track modifiers (examples only)

- **Drag + rain:** 4wd bonus to acceleration/top speed; rwd/fwd penalty; slick penalty.
- **Circuit + dirt/snow:** 4wd and off-road tyre bonus; rwd/fwd and slick penalty.

## Performance class hierarchy (draft)

Numeric **rating** maps to **performance_class** via fixed bands (inclusive lower bound unless noted):

| Class | Label | Rating range |
|-------|-------|----------------|
| **P** | Proto | 1000 and above |
| **S** | — | 900 – 999 |
| **A** | — | 800 – 899 |
| **B** | — | 700 – 799 |
| **C** | — | 600 – 699 |
| **D** | — | 500 – 599 |
| **E** | — | 400 – 499 |
| **F** | — | 399 or below |

Implementation: `band_map(rating)` in `performance-calculator-service.js` returns single letter (`P`, `S`, `A`, …, `F`). On the composed card (Phase 2 overlay, **off** until this engine fills values), show **RP** at the bottom-left (rating number + “RP”, with drop shadow; class letter may sit with the same block). Bands are draft — adjust only with `formula_version` bump and bulk recalc.

```js
// Draft — illustrative only
function bandMap(rating) {
  if (rating >= 1000) return 'P';
  if (rating >= 900) return 'S';
  if (rating >= 800) return 'A';
  if (rating >= 700) return 'B';
  if (rating >= 600) return 'C';
  if (rating >= 500) return 'D';
  if (rating >= 400) return 'E';
  return 'F';
}
```

## Open questions (workshop)

- [ ] Normalization curve per stat (linear vs diminishing returns)
- [ ] Global weight derivation algorithm from trackset
- [x] Class band thresholds — **draft table above** (P/S/A/B/C/D/E/F)
- [ ] How N/A stats participate in calculation
- [ ] Whether modifiers affect calculator rating or only live races
- [ ] Recalc strategy when a single track is added vs full rebalance

## Versioning

When formulas are finalized, record `formula_version` on `performance_weight_snapshots` and each `cars.performance` update.
