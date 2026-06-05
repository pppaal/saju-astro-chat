# Audit Fusion (SAJU × ASTRO)

## 3.1 Is this true fusion?

**Yes (metric + time + explainability fusion exists in code).**

Evidence:

- Multi-layer mapping tables are explicit (10 layers): `src/lib/destiny-matrix/data/layer1-element-core.ts` ... `layer10-extrapoint-element.ts`.
- Engine consumes both SAJU and ASTRO inputs in same scoring graph (`src/lib/destiny-matrix/engine.ts`, layer computations around lines referenced by `computeLayer*` usage).
- Alignment term explicitly penalizes SAJU/ASTRO disagreement:
  - `alignment = 1 - |saju - astro|` (`src/lib/destiny-matrix/alignment.ts:3`).
- Time overlap is computed from SAJU timing + ASTRO transit/progression signals and clamped:
  - `timeOverlapWeight` in `[1.0, 1.3]` (`src/lib/destiny-matrix/timeOverlap.ts:100`–`:104`).
- Final adjusted score blends base score + alignment + overlap:
  - `baseFinalNorm * (0.85 + 0.15 * alignment) * timeOverlapWeight` (`src/lib/destiny-matrix/engine.ts:547`–`:550`).
- Explainability fields are first-class output schema:
  - `drivers`, `cautions`, `domainScores`, `overlapTimeline` (`src/lib/destiny-matrix/types.ts:357` onward; returned in `engine.ts:606` onward).

## 3.2 Mapping / Alignment / Time Overlap

### Mapping layers (examples)

- Layer1: element-core grid (`layer1-element-core.ts`).
- Layer2: 십신 ↔ planet matrix (`layer2-sibsin-planet.ts`).
- Layer3: 십신 ↔ house matrix (`layer3-sibsin-house.ts`).
- Layer4: timing overlay from luck/transit cycles (`layer4-timing-overlay.ts`).
- Layer5: branch relation ↔ aspect matrix (`layer5-relation-aspect.ts`).
- Layer6/7: twelve-stage + advanced progression/harmonics integration.
- Layer8/9/10: 신살-planet, asteroid-house, extra points.

### Time overlap & timeline determinism

- Monthly timeline uses deterministic hash (`stableHash`) + fixed 12-month generation (`src/lib/destiny-matrix/monthlyTimeline.ts:20`, `:95` onward).
- Domain timelines derived deterministically from base timeline + domain intensity (`monthlyTimeline.ts:125` onward).

## 3.3 Property Tests (executed)

Executed:

- `tests/lib/destiny-matrix/fusion-properties-regression.test.ts` (5 passed)

Checked properties:

- Alignment monotonicity (gap↑ => alignment↓).
- Overlap weight clamped and monotonic with stronger signals.
- `finalScoreAdjusted` changes with overlap/timing signals.
- Timeline deterministic + month order stable.
- Drivers/cautions/domain scores deterministic for same input.

## 3.4 Fusion Maturity Scorecard (0–5)

| Category         | Score | Evidence                                                                       |
| ---------------- | ----: | ------------------------------------------------------------------------------ |
| Retrieval fusion |   2.5 | Fusion is mostly metric/data-layered, not retrieval-level in TS matrix engine. |
| Metric fusion    |   4.5 | Explicit formulas and bounded normalization.                                   |
| Time fusion      |   4.2 | Overlap + monthly timeline + domain timeline integrated.                       |
| Explainability   |   4.0 | Drivers/cautions/domain/timeline fields present in output schema.              |
| Test coverage    |   3.5 | Good property tests exist; still limited external-oracle checks.               |

## 3.5 Where Uniqueness Lives (code-based)

- 10-layer deterministic mapping assets + scoring pipeline.
- Alignment/time-overlap adjusted scoring instead of flat averaging.
- Built-in explainability outputs tied to scoring internals.
- Reusable output structure for report/calendar/counselor downstream.

## 3.6 Main Risks

1. Hand-authored mapping tables can drift semantically without strict review.
2. Formula weights are heuristic; need calibrated eval set to prevent overfitting copy tone.
3. Some layer signals can be sparse, reducing explainability depth for edge users.
4. Non-UTF terminal environments can obscure Korean labels during debugging.
