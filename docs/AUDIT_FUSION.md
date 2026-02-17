# Cross-Fusion (SAJU x Astrology) Audit

Date: 2026-02-17

## Scope + Evidence

- Core reviewed:
  - `src/lib/destiny-matrix/engine.ts`
  - `src/lib/destiny-matrix/alignment.ts`
  - `src/lib/destiny-matrix/timeOverlap.ts`
  - `src/lib/destiny-matrix/domainScoring.ts`
  - `src/lib/destiny-matrix/drivers.ts`
  - `src/lib/destiny-matrix/calendarSignals.ts`
  - `src/lib/destiny-matrix/monthlyTimeline.ts`
- Tests run:
  - `tests/lib/destiny-matrix/fusion-properties-regression.test.ts` (PASS, 5)
  - `tests/lib/destiny-matrix/ai-report-score-determinism.test.ts` (PASS, 5)

## 3.1 Fusion Mechanism (verified)

- Metric fusion exists (not simple concatenation):
  - alignment term: `alignment = clamp01(1 - |saju - astro|)`
  - overlap weight: `timeOverlapWeight` in `[1.0, 1.3]`
  - adjusted score formula in `engine.ts`:
    - `finalScoreAdjustedNorm = clamp01(base * (0.85 + 0.15 * alignment) * timeOverlapWeight)`
- Time fusion:
  - uses current DAEUN/SAEUN + active transit/progression signals and timing density
  - monthly overlap timeline generation and per-domain timeline mapping
- Explainability payload exists in summary:
  - `drivers`, `cautions`, `calendarSignals`, `domainScores`, `overlapTimeline`, `overlapTimelineByDomain`

## 3.2 Property Validation

- Agreement/disagreement behavior: verified by tests
  - saju/astro gap up -> alignment down
- Overlap behavior: verified
  - overlap weight monotonic and clamped in [1.0, 1.3]
- Final score sensitivity: verified
  - `finalScoreAdjusted` changes when overlap/transit signals differ
- Determinism: verified
  - timeline deterministic for fixed `startYearMonth`
  - drivers/cautions/domain scores stable for identical input

## 3.3 Fusion Property Tests

- `tests/lib/destiny-matrix/fusion-properties-regression.test.ts`
  - alignment monotonicity
  - overlap clamp boundaries
  - adjusted score sensitivity
  - deterministic timeline ordering
  - deterministic drivers/cautions/domain scores
- `tests/lib/destiny-matrix/ai-report-score-determinism.test.ts`
  - stable per-period score generation
  - bounded scoring [0..100]

## Fusion Maturity Scorecard (0-5)

- Retrieval fusion (if any): **1.5**
  - no direct retrieval-native fusion in TS engine path
- Metric fusion: **4.3**
  - explicit formula, clamps, contribution decomposition
- Time fusion: **4.0**
  - overlap weighting + monthly timeline integration
- Explainability: **4.1**
  - concrete machine-readable drivers/cautions/signals/domain slices
- Test coverage (fusion properties): **4.0**
  - strong property tests added; broader end-to-end eval still limited

## Where Uniqueness Actually Lives (code evidence)

- 10-layer cross-domain matrix architecture: `engine.ts` + layer data maps
- Alignment + overlap adjusted scoring and confidence synthesis
- Domain/timeline explainability outputs (`domainScores`, `calendarSignals`, timeline fields)
- Not unique by itself: generic LLM text rendering and route wrappers

## Key Risks

1. Many static mapping tables are heuristic; difficult to externally validate objective correctness.
2. Small formula changes can materially shift downstream product outputs.
3. Confidence score is heuristic, not calibrated to observed prediction accuracy.
4. No offline benchmark/eval corpus for historical backtesting in this repo.
5. Full test-suite noise can hide genuine fusion regressions.
