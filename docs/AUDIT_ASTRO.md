# Audit ASTRO

## 2.1 Entrypoints

Primary runtime path:

- API: `src/app/api/astrology/route.ts:45` (`POST`) validates request and builds chart outputs.
- Engine: `src/lib/astrology/foundation/astrologyService.ts:53` (`calculateNatalChart`).

Core dependencies:

- Swiss Ephemeris loading via `src/lib/astrology/foundation/ephe.ts`.
- Julian conversion in `src/lib/astrology/foundation/shared.ts:57` (`natalToJD`).

## 2.2 Correctness + Determinism Evidence

### Input/time conversion

- Local datetime -> timezone-aware dayjs -> UTC -> JD (`src/lib/astrology/foundation/shared.ts:57`–`src/lib/astrology/foundation/shared.ts:103`).
- Invalid datetime components are explicitly rejected (`src/lib/astrology/foundation/shared.ts:61`).

### Natal chart generation

- Planet longitudes from `swe_calc_ut` (`src/lib/astrology/foundation/astrologyService.ts:80`).
- House cusps/ASC/MC from `calcHouses` (`src/lib/astrology/foundation/astrologyService.ts:59`).
- Default house system currently fixed to Placidus in natal path (`src/lib/astrology/foundation/astrologyService.ts:59`, meta at `:124`).

### Invariants in code

- Angle normalization utilities used widely (`normalize360`, `shortestAngle`).
- House inference handles wrap-around (`src/lib/astrology/foundation/houses.ts:38`).
- Aspect scoring/orb logic deterministic (`src/lib/astrology/foundation/aspects.ts` around orb/weights section).

## 2.3 Golden Tests

Executed:

- `tests/lib/astrology/foundation/determinism-golden.test.ts` (6 passed)

Assertions covered:

- Repeated natal computation is stable.
- Planet longitudes remain in `[0,360)`.
- Houses are valid and deterministic.
- Natal aspects are stable and non-duplicated by reverse pair.

## 2.4 Astro Correctness Confidence

**Score: 4.0 / 5**

Why:

- Deterministic core appears solid and tests pass.
- Swiss ephemeris-backed calculations and validation logic are explicit.
- Confidence reduced by limited external-oracle comparisons and broad advanced-feature surface.

## 2.5 Top 10 Risks

1. **Ephemeris/runtime dependency risk**: if `swisseph` load/path fails, engine unavailable.
2. **House-system mismatch risk**: many paths assume Placidus by default.
3. **Timezone ambiguity** near DST transitions despite validation.
4. **Performance cost** for repeated `swe_calc_ut` and advanced modules under high QPS.
5. **Inconsistent token/rate behavior in tests** suggests middleware-contract drift in some API suites.
6. **Advanced module sprawl** (asteroids/eclipses/harmonics/rectification) increases regression surface.
7. **Weak contract tests on progression/transit window boundaries** for month edges.
8. **No unified deterministic fixtures shared across advanced routes**.
9. **Potential fallback behavior differences** between dev/prod env for supporting infra.
10. **Coverage fragmentation**: broad code area, relatively low focused test density in many advanced endpoints.

## 2.6 Minimal Guardrail Additions Recommended

- Add 5 fixed test vectors that assert selected planet longitudes to fixed precision.
- Add progression/transit boundary tests around month/year edges.
- Add a startup smoke check that validates ephemeris availability and fails fast.
