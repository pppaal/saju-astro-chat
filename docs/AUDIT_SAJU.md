# Audit SAJU

> **Status (2026-11-25, engine audit E15):** this is a point-in-time audit; line
> numbers below are from that time. Since then: the supported range is
> **1900–2050** (the solar-term table was regenerated from Swiss Ephemeris and
> cross-checked against astronomy-engine, risk 1); `toDate` (date-fns-tz) was
> replaced by the RFC 5545 resolver `resolveBirthInstant`, shared with astrology
> (risk 4; date-fns-tz is no longer a dependency); an unknown birth time is a
> three-pillar reading with a noon anchor, covered by
> `tests/lib/destiny/sajuFacts.timeUnknown.test.ts` (risk 3); 대운 start age is
> floor(days / 3), documented in `src/lib/saju/CONVENTIONS.md` §13 (risk 6); and
> independent goldens live in `tests/golden/`. Current rules:
> `src/lib/saju/CONVENTIONS.md` and `docs/CALCULATION_SPEC.md`.

## Scope

- Engine: `src/lib/saju/saju.ts`
- Constants/solar terms: `src/lib/saju/constants.ts`
- API entry: `src/app/api/saju/route.ts`
- Determinism tests: `tests/lib/saju/determinism-golden.test.ts`

## Entrypoints and Schema

- Main compute entry: `calculateSajuData()` in `src/lib/saju/saju.ts:162`.
- API entry validates input and delegates to engine in `src/app/api/saju/route.ts`.
- Output includes:
  - Pillars (year/month/day/time)
  - Day master
  - Five elements
  - Daeun/Seun/Wolun/Iljin derived timing

## Determinism Evidence

- Repeated-run determinism verified by `tests/lib/saju/determinism-golden.test.ts` (6 tests, pass).
- Golden cases assert fixed pillar stems/branches and daeun start/flow for 5 birth cases.
- Invariants checked:
  - Daeun list length and +10 year step pattern
  - Element count sum invariant for base chart extraction

## Correctness Checks (Code Evidence)

- Timezone conversion uses `toDate(..., { timeZone })` in `src/lib/saju/saju.ts:205-206`.
- Supported solar-term year range enforced at `src/lib/saju/constants.ts:119` and called at `src/lib/saju/saju.ts:219`.
- Solar terms resolved from KST table via `getSolarTermKST()` in `src/lib/saju/constants.ts:242`.
- Day pillar uses explicit JDN formula in `src/lib/saju/saju.ts:275-284`.
- Daeun start-age quantization is deterministic in `src/lib/saju/saju.ts:127`.
- Daeun direction and list generation handled in `src/lib/saju/saju.ts:360+` and `src/lib/saju/saju.ts:511+`.
- Sibsin mapping is explicit in `src/lib/saju/saju.ts:37`.

## Strengths

- Strong deterministic core for same inputs.
- Explicit out-of-range guard (1940-2050) avoids silent wrong answers.
- Clear, testable intermediate states (pillars, daeun, five elements).

## Risks / Edge Cases (Top 10)

1. Year support is hard-limited to 1940-2050 (`src/lib/saju/constants.ts:119`), causing hard failures for older/future dates.
2. Quality outside Asia/KST-centric assumptions is less proven (solar-term table is KST-based).
3. Missing birth time fallback quality is not strongly validated in dedicated deterministic tests.
4. DST edge behavior outside Korea needs explicit regression set.
5. Lunar conversion assumptions are not externally oracle-validated in this audit.
6. `daysToDaeunAge()` uses tiered rounding rules; domain validation against external references is not automated.
7. Unicode/mojibake is present in many Korean source literals/comments, increasing maintenance risk.
8. Large legacy test suite noise makes it harder to isolate true regressions quickly.
9. Some advanced interpretation paths have weaker contract-style tests than core pillar derivation.
10. Heavy dependency on static solar-term dataset means correction process needs formal update workflow.

## Confidence Score

- SAJU correctness confidence: **4.0 / 5.0**

Rationale: deterministic behavior and core computations are concrete and tested, but external-oracle parity and timezone edge coverage are not yet exhaustive.
