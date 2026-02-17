# Astrology Engine Audit

Date: 2026-02-17

## Scope + Evidence

- Entrypoints reviewed:
  - `src/lib/astrology/foundation/astrologyService.ts` (natal)
  - `src/lib/astrology/foundation/transit.ts` (transits)
  - `src/lib/astrology/foundation/progressions.ts` (progressions)
  - `src/lib/astrology/foundation/aspects.ts` (aspect/orb logic)
  - `src/lib/astrology/foundation/ephe.ts` (Swiss Ephemeris loading)
- Deterministic tests run:
  - `tests/lib/astrology/foundation/determinism-golden.test.ts` (PASS, 7 tests)

## 2.1 Entrypoints / Dependencies

- Natal chart API: `calculateNatalChart(input)`
- Transit API: `calculateTransitChart(input)`, `findTransitAspects(...)`
- Progression API: `calculateSecondaryProgressions(...)`, `calculateSolarArc(...)`
- Aspect logic: `findNatalAspects(...)` with orb weighting and deterministic sorting
- Ephemeris: Swiss Ephemeris (`swisseph.swe_calc_ut`) loaded in server context

## 2.2 Determinism + Invariants

Verified by code and tests:

- Longitude normalization / ranges:
  - planet longitudes and house cusps constrained to expected [0, 360) output domain
- Sign-from-longitude continuity:
  - sign + formatted degree generated via shared formatter path
- Aspect determinism:
  - same input chart yields same aspect set and orb values
  - reverse duplicate pair suppression in natal aspect tests
- House system consistency:
  - Placidus default used in natal/transit/progression generation paths
- Missing birth time behavior:
  - explicit fallback behavior is not globally standardized in one place (risk below)

## 2.3 Golden Tests Added/Validated

- `tests/lib/astrology/foundation/determinism-golden.test.ts`
  - 5 fixed natal cases: repeated-run stable longitudes and angles
  - house cusp validity checks
  - natal aspect pair stability/no reverse duplicates
  - transit window boundary determinism (`2026-03-01T00:00:00Z` and `2026-03-31T23:59:59Z` repeated runs)

## Astro Correctness Confidence

- Score: **3.9 / 5**
- Rationale:
  - Strong deterministic core and Swiss Ephemeris usage
  - Confidence reduced by operational dependency on ephemeris files, multiple advanced modules with diverse orb policies, and limited oracle cross-checks

## Top 10 Risks

1. Ephemeris path/runtime availability can break chart generation.
2. Mixed house-system expectations (Placidus default vs user expectations) can create interpretation drift.
3. High-latitude behavior and fallback consistency need stronger contracts.
4. Timezone parsing near DST transitions not deeply regression-tested.
5. Different modules define different orb defaults (potential inconsistency across products).
6. Missing/unknown birth-time handling differs across routes/features.
7. Large advanced calculations (progressions/returns/rectification) may impact latency at scale.
8. Error paths often throw generic internal errors without domain-specific code taxonomy.
9. No cross-engine external oracle test corpus in this repo for planet-by-planet validation.
10. Full-suite instability masks true astro regressions (test signal-to-noise issue).

## Minimal Changes Implemented in This Audit

- Added transit-window deterministic invariant test to `tests/lib/astrology/foundation/determinism-golden.test.ts`.
