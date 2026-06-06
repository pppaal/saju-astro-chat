# Destiny Matrix Input/Cross Map (Saju + Astrology)

Last updated: 2026-03-11

## 1) Matrix role

- Matrix is the calculation core.
- It receives `MatrixCalculationInput` and computes 10 layer cell outputs.
- Interpretation and narrative are handled outside the matrix core (`core/*`, `ai-report/*`, service adapters).

Code:

- Input schema: `src/lib/destiny-matrix/types.ts` (`MatrixCalculationInput`)
- 10-layer calculator: `src/lib/destiny-matrix/engine.ts` (`calculateLayer1..10`)
- Core envelope: `src/lib/destiny-matrix/core/buildCoreEnvelope.ts`

## 2) Actual input data used (Saju + Astrology)

Reference: `MatrixCalculationInput` in `src/lib/destiny-matrix/types.ts`.

Primary data-source files:

- Saju compute entry: `src/lib/saju/saju.ts`
- Saju shinsal/twelve-stage helpers: `src/lib/saju/shinsal.ts`
- Saju advanced analyzer (geokguk/yongsin derivation path): `src/lib/saju/astrologyengine.ts`
- Astrology core entry: `src/lib/astrology/index.ts`
- Astrology foundation modules: `src/lib/astrology/foundation/*`
- Route-level matrix input assembly:
  - `src/app/api/destiny-matrix/route.ts`
  - `src/app/api/calendar/route.ts`
  - `src/app/api/destiny-map/chat-stream/route.ts`
  - `src/app/api/destiny-matrix/ai-report/route.ts`

### Saju-side keys

- `dayMasterElement`
- `pillarElements`
- `sibsinDistribution`
- `twelveStages`
- `relations`
- `geokguk`
- `yongsin`
- `currentDaeunElement`
- `currentSaeunElement`
- `currentWolunElement`
- `currentIljinElement`
- `currentIljinDate`
- `shinsalList`

### Astrology-side keys

- `dominantWesternElement`
- `planetHouses`
- `planetSigns`
- `aspects`
- `activeTransits`
- `astroTimingIndex`
- `asteroidHouses`
- `extraPointSigns`
- `advancedAstroSignals`:
  - `solarReturn`
  - `lunarReturn`
  - `progressions`
  - `draconic`
  - `harmonics`
  - `fixedStars`
  - `eclipses`
  - `midpoints`
  - `asteroids`
  - `extraPoints`

### Snapshot/grounding keys

- `sajuSnapshot`
- `astrologySnapshot`
- `crossSnapshot`

## 3) Key-level cross map (which layers use which keys)

Source of truth:

- `src/lib/destiny-matrix/inputCross.ts` (`CROSS_KEY_RULES`)

Columns:

- `used_in_layers[]`: used directly in layer calculations
- `used_in_signals_only`: used in signal/coverage synthesis only
- `used_in_direct_scoring`: directly contributes to summary/core scoring

| key                    | used_in_layers | signals_only | direct_scoring |
| ---------------------- | -------------: | -----------: | -------------: |
| dayMasterElement       |       [1,9,10] |        false |           true |
| pillarElements         |            [1] |        false |           true |
| sibsinDistribution     |       [2,3,10] |        false |           true |
| twelveStages           |            [6] |        false |           true |
| relations              |            [5] |        false |           true |
| geokguk                |            [7] |        false |           true |
| yongsin                |            [7] |        false |           true |
| currentDaeunElement    |            [4] |        false |           true |
| currentSaeunElement    |            [4] |        false |           true |
| currentWolunElement    |            [4] |        false |           true |
| currentIljinElement    |            [4] |        false |           true |
| currentIljinDate       |            [4] |         true |          false |
| shinsalList            |            [8] |        false |           true |
| dominantWesternElement |            [1] |        false |           true |
| planetHouses           |      [2,3,6,8] |        false |           true |
| planetSigns            |             [] |         true |          false |
| aspects                |            [5] |        false |           true |
| activeTransits         |            [4] |        false |           true |
| astroTimingIndex       |             [] |         true |          false |
| asteroidHouses         |            [9] |        false |           true |
| extraPointSigns        |           [10] |        false |           true |
| advancedAstroSignals   |            [7] |         true |           true |
| sajuSnapshot           |             [] |         true |          false |
| astrologySnapshot      |             [] |         true |          false |
| crossSnapshot          |             [] |         true |          false |

## 4) Layer definitions (cross points)

Code: `src/lib/destiny-matrix/engine.ts`

- L1 `calculateLayer1`: `dayMaster/pillars` x `dominantWesternElement`
- L2 `calculateLayer2`: `sibsinDistribution` x `planetHouses(planets)`
- L3 `calculateLayer3`: `sibsinDistribution` x `planetHouses(houses)`
- L4 `calculateLayer4`: `daeun/saeun/wolun/ilun` x `activeTransits`
- L5 `calculateLayer5`: `relations` x `aspects` (orb/angle adjustment included)
- L6 `calculateLayer6`: `twelveStages` x `planetHouses`
- L7 `calculateLayer7`: `geokguk/yongsin` x progression types (filtered by `advancedAstroSignals`)
- L8 `calculateLayer8`: `shinsalList` x `planetHouses`
- L9 `calculateLayer9`: `asteroidHouses` x house plus asteroid x `dayMasterElement`
- L10 `calculateLayer10`: `extraPointSigns` x `dayMasterElement` plus extra point x `sibsinDistribution`

## 5) Service routes that build matrix input

- Matrix API: `src/app/api/destiny-matrix/route.ts`
- Calendar API: `src/app/api/calendar/route.ts`
- Counselor API: `src/app/api/destiny-map/chat-stream/route.ts`
- Premium AI Report API: `src/app/api/destiny-matrix/ai-report/route.ts`

## 6) Missing/completeness enforcement

Code: `src/lib/destiny-matrix/inputCross.ts`

- `ensureMatrixInputCrossCompleteness(input)`
  - Forces `shinsalList`, `activeTransits` to arrays
  - Forces `asteroidHouses`, `extraPointSigns` to objects
  - Forces `advancedAstroSignals` to full 10-key boolean map

- `buildServiceInputCrossAudit(input, service)`
  - Returns per key:
    - `used_in_layers`
    - `used_in_signals_only`
    - `used_in_direct_scoring`
    - `missing_service_routes`

- `listMissingCrossKeysForService(audit, service)`
  - Returns missing keys for the target service

## 7) Runtime response fields to inspect

- Matrix API response:
  - `matrixInputCrossAudit`
  - `summary.matrixInputCrossMissing`

- Calendar API response:
  - `matrixInputCoverage.cross.inputCrossAudit`
  - `matrixInputCoverage.cross.inputCrossMissing`

- Counselor snapshot:
  - `inputCrossMissing`

## 8) Current status

- Matrix remains calculation-only.
- Cross and missing-data validation are handled in adapters/routes.
- Per-key coverage (`used_in_layers[]`, `signals_only`, `direct_scoring`, `missing_service_routes[]`) is tracked via `inputCross.ts`.
