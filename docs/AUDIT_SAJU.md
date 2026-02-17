# SAJU Engine Audit

Date: 2026-02-17

## Scope + Evidence

- Entrypoint reviewed: `src/lib/Saju/saju.ts` (`calculateSajuData`)
- Related modules reviewed: `src/lib/Saju/unse.ts`, `src/lib/Saju/yongsin.ts`, `src/lib/Saju/sibsinAnalysis.ts`, `src/lib/Saju/johuYongsin.ts`
- Deterministic tests run:
  - `tests/lib/Saju/determinism-golden.test.ts` (PASS, 6 tests)

## 1.1 Entrypoints / Input / Output

- Primary API: `calculateSajuData(birthDate, birthTime, gender, calendarType, timezone, lunarLeap?)`
- Normalization observed:
  - lunar->solar conversion via `korean-lunar-calendar`
  - timezone-aware parse via `date-fns-tz` `toDate`
  - safe time parser (`parseHourMinute`) with clamps
- Output schema includes:
  - 4 pillars (`yearPillar`, `monthPillar`, `dayPillar`, `timePillar`)
  - `dayMaster`, `fiveElements`, `daeWoon`, `unse`

## 1.2 Correctness / Determinism Findings

- Determinism: strong
  - pure arithmetic for day pillar via JDN (`jdn + 49` mod 10/12)
  - deterministic month/year boundaries using `getSolarTermKST`
  - deterministic Daeun step pattern and start-age rule (`days/3`, `round`)
  - in-memory cache key is normalized and stable
- Timezone/day-boundary handling: partially robust
  - uses timezone conversion + solar terms
  - still sensitive to DST/timezone input quality and ambiguous local times
- Core derived signal checks
  - ?? mapping implemented (`getSibseong`, plus `sibsinAnalysis.ts`)
  - ?? totals computed from 8 stem/branch slots
  - ?? logic exists as rule stack (`yongsin.ts` + `johuYongsin.ts` DB)
  - ??/??/?? present (`daeWoon` in `saju.ts`; cycle helpers in `unse.ts`)

## 1.3 Golden Tests Added/Validated

- `tests/lib/Saju/determinism-golden.test.ts`
  - 5 fixed birth cases with expected intermediate outputs (year/month/day/time pillar + dayMaster + daeun start/dir)
  - invariant checks:
    - repeated run equality
    - daeun list length 10 and +10-year step pattern
    - five-element total count invariant (8)

## SAJU Correctness Confidence

- Score: **3.8 / 5**
- Rationale:
  - Strong deterministic implementation and explicit rule surfaces
  - Confidence reduced by lack of external oracle cross-validation and DST/locale edge-case coverage depth

## Top 10 Risks / Edge Cases

1. DST ambiguity around local midnight not explicitly regression-tested.
2. Solar term dependency quality (`getSolarTermKST`) is assumed; no contract test for missing/incorrect table rows.
3. Hardcoded Daeun rounding policy (`round`) may differ from lineage-specific expectations.
4. Hour-branch boundary windows (e.g., 23:30 split) can mismatch other schools.
5. Missing birth time fallback may over-confidently infer time pillar.
6. Leap-day and lunar-leap combinations need explicit fixture coverage.
7. Timezone alias variations (`Asia/Seoul` vs legacy identifiers) not stress-tested.
8. In-memory cache (process-local) can diverge across horizontally scaled workers.
9. No explicit property tests for yongsin stability under equal-strength ties.
10. Error handling rethrows with message text; operationally okay but coarse for debugging provenance.

## Minimal Changes Implemented in This Audit

- No SAJU algorithmic change applied.
- Added/validated deterministic golden tests as regression guardrails.
