# Calculation Spec: 1-Person Themed Report (Saju + Astrology + Cross + Timing)

This spec is code-derived for the current repo path and covers the actual pipeline used by `src/app/api/destiny-matrix/ai-report/route.ts` for 1-person report generation.

## Scope and Entrypoints

- Main API entrypoint: `src/app/api/destiny-matrix/ai-report/route.ts:680` (`POST`)
- Matrix calculator: `src/lib/destiny-matrix/engine.ts:693` (`calculateDestinyMatrix`)
- Base narrative report generator: `src/lib/destiny-matrix/interpreter/report-generator.ts:81` (`FusionReportGenerator.generateReport`)
- AI comprehensive report generator: `src/lib/destiny-matrix/ai-report/aiReportService.ts:501` (`generateAIPremiumReport`)
- AI themed report generator: `src/lib/destiny-matrix/ai-report/aiReportService.ts:1166` (`generateThemedReport`)
- AI timing report generator: `src/lib/destiny-matrix/ai-report/aiReportService.ts:892` (`generateTimingReport`)
- GraphRAG cross builder: `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:505` (`buildGraphRAGEvidence`)
- Deterministic core/coverage: `src/lib/destiny-matrix/ai-report/deterministicCore.ts:247` (`buildDeterministicCore`)

---

## A) Inputs (User/Profile) and Defaults

### Raw accepted profile-like fields

- `birthDate`, `birthTime`, `birthCity`, `timezone`, `latitude`, `longitude`, `gender`, `lang/locale` via request body.
- Matrix input schema allows `profileContext` with:
  - `birthDate`, `birthTime`, `birthCity`, `timezone`, `latitude`, `longitude`, `houseSystem`, `analysisAt`.
  - Source: `src/lib/destiny-matrix/types.ts:438`, `src/lib/destiny-matrix/validation.ts:393`.

### Default/fallback behavior actually implemented

- `gender` for Saju:
  - only `f`/`female` => `female`; all else => `male`.
  - `src/app/api/destiny-matrix/ai-report/route.ts:145`
- Saju auto-derive requires `birthDate`; if missing, no Saju auto-derivation.
  - `src/app/api/destiny-matrix/ai-report/route.ts:297`
- Saju `birthTime` fallback: `12:00`.
  - `src/app/api/destiny-matrix/ai-report/route.ts:302`
- Saju `timezone` fallback: `Asia/Seoul`.
  - `src/app/api/destiny-matrix/ai-report/route.ts:303`
- Astrology auto-derive requires both `birthDate` and `birthTime`; if either missing, astrology auto-derivation is skipped.
  - `src/app/api/destiny-matrix/ai-report/route.ts:387`
- Astrology geolocation/timezone fallback:
  - `latitude=37.5665`, `longitude=126.978`, `timezone=Asia/Seoul`.
  - `src/app/api/destiny-matrix/ai-report/route.ts:395`
- `currentDateIso` fallback:
  - from request `currentDateIso`, else `analysisAt` date, else server today.
  - `src/app/api/destiny-matrix/ai-report/route.ts:791`

### Note on `birthPlace`

- There is no direct `birthPlace` field consumption in this route.
- Effective place inputs are `birthCity` (context only) + `latitude/longitude` for astrology calculations.

---

## B) Saju Calculations

### What is computed

- 4 pillars (year/month/day/time), dayMaster, five-elements count, daeun list/current, unse annual/monthly.
- Entry: `calculateSajuData` in `src/lib/Saju/saju.ts:163`.
- Advanced Saju (`strength/geokguk/yongsin`) computed when missing:
  - `analyzeAdvancedSaju` in `src/lib/Saju/astrologyengine.ts:530`.

### Daeun/Saeun/Wolun/Iljin inclusion

- Daeun:
  - If derived Saju exists: use derived current daeun stem/branch/age.
  - Else fallback from age decade (stem/branch cyclical fallback) in `buildAutoDaeunTiming`.
  - `src/app/api/destiny-matrix/ai-report/route.ts:255`
- Seun/Wolun/Iljin:
  - Always auto-built with `buildTimingData` (simple approximate formulas, comments indicate approximation).
  - `src/app/api/destiny-matrix/ai-report/route.ts:633`
- Request `timingData` can override auto values per cycle (`daeun|seun|wolun|iljin`) via merge.
  - `src/app/api/destiny-matrix/ai-report/route.ts:484`

### If daeun missing

- Auto fallback daeun is synthesized from age and cyclical stem/branch; not left empty unless upstream fails unexpectedly.
- Strict completeness gate blocks AI report if `timingData.daeun` is missing.
  - `src/app/api/destiny-matrix/ai-report/route.ts:514`, `:817`

### Saju scoring/signals used for report text

- Matrix layers use Saju fields directly (`dayMasterElement`, `sibsinDistribution`, `twelveStages`, `relations`, `geokguk`, `yongsin`, `currentDaeunElement`, `currentSaeunElement`, `shinsalList`).
  - Input type: `src/lib/destiny-matrix/types.ts:392`
- No separate “Saju-only narrative scorer” in AI report path; Saju contributes through matrix cell scores, topInsights, GraphRAG evidence, deterministic coverage.

### Saju signals table

| signal name               | computed from                                        | where in code                                       | used in narrative? (Y/N)                 | notes/thresholds                                                    |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| 4 pillars                 | solar/lunar birth date-time + timezone + solar terms | `src/lib/Saju/saju.ts:230`                          | Y                                        | Used via `sajuSnapshot` and derived matrix inputs                   |
| dayMaster                 | day pillar stem                                      | `src/lib/Saju/saju.ts:287`                          | Y                                        | Required schema key (`dayMasterElement`)                            |
| fiveElements count        | stems+branches of 4 pillars                          | `src/lib/Saju/saju.ts:436`                          | Y                                        | Exposed in snapshot; indirect in narrative                          |
| sibsinDistribution (auto) | pillar heavenly/earthly stem sibsin counts           | `src/app/api/destiny-matrix/ai-report/route.ts:153` | Y                                        | Auto-filled only if missing                                         |
| geokguk (auto)            | `analyzeAdvancedSaju().geokguk`                      | `src/app/api/destiny-matrix/ai-report/route.ts:328` | Y                                        | Alias-mapped to matrix enum                                         |
| yongsin (auto)            | `analyzeAdvancedSaju().yongsin.primary`              | `src/app/api/destiny-matrix/ai-report/route.ts:344` | Y                                        | Used in matrix and deterministic decision                           |
| daeun list/current        | month pillar + direction + term delta                | `src/lib/Saju/saju.ts:325`                          | Y                                        | Current daeun element inferred for matrix/timing                    |
| annual unse               | yearly ganji progression                             | `src/lib/Saju/saju.ts:462`                          | Y                                        | Snapshot/timing prompt grounding                                    |
| monthly unse              | monthly progression                                  | `src/lib/Saju/saju.ts:481`                          | Y                                        | Snapshot/timing prompt grounding                                    |
| iljin calendar util       | JDN per day                                          | `src/lib/Saju/saju.ts:612`                          | Computed but mostly unused in this route | Used by util consumers; route uses `buildTimingData` approx instead |
| relations                 | request-provided only                                | `src/lib/destiny-matrix/types.ts:398`               | Y                                        | **Not auto-derived in route**                                       |
| shinsalList               | request-provided only                                | `src/lib/destiny-matrix/types.ts:405`               | Y                                        | **Not auto-derived in route**                                       |
| twelveStages              | request-provided only                                | `src/lib/destiny-matrix/types.ts:397`               | Y                                        | **Not auto-derived in route**                                       |
| saeun element auto        | first annual cycle element -> map                    | `src/app/api/destiny-matrix/ai-report/route.ts:349` | Y                                        | Sets `currentSaeunElement` if missing                               |
| daeun element auto        | derived current daeun stem -> element map            | `src/app/api/destiny-matrix/ai-report/route.ts:354` | Y                                        | Sets `currentDaeunElement` if missing                               |

---

## C) Astrology Calculations

### Chart method/reference

- Engine: Swiss Ephemeris (`swisseph` via `getSwisseph()`)
  - `src/lib/astrology/foundation/astrologyService.ts:53`
- House system default: `Placidus` from calculation standards.
  - `src/lib/config/calculationStandards.ts:13`
- Natal reference time: request birth datetime (`year/month/date/hour/minute`) + timezone + lat/lon.
  - `src/lib/astrology/foundation/astrologyService.ts:52`

### What is computed

- Natal planets with sign/degree/house/speed/retrograde + ASC/MC + house cusps.
- Natal aspects (major+minor if includeMinor true in route call).
- Transit chart + major transits (outer planets to inner points) in route for snapshot.
- Secondary progressions, solar return, lunar return in route for astrology snapshot.

### Are active transits used in 1-person report?

- **Computed in astrology snapshot**: yes (`currentTransits.majorTransits`).
- **Mapped into matrix `activeTransits` automatically**: **no**.
- Therefore, transit-dependent matrix Layer4/time-overlap works only if request already provides `activeTransits`.
  - Evidence: route computes `majorTransits` but does not assign `requestBody.activeTransits`.
  - `src/app/api/destiny-matrix/ai-report/route.ts:419`, `:450`

### Astrology scoring/signals used for report text

- Matrix layers use `planetSigns`, `planetHouses`, `aspects`, `dominantWesternElement`, and optional `activeTransits`.
- Aspect score in Layer5 uses orb-adjusted score (`+/-` multiplier vs allowed orb).
  - `src/lib/destiny-matrix/engine.ts:170`

### Astrology signals table

| signal name                           | computed from                                          | where in code                                         | used in narrative? (Y/N)                                       | notes/thresholds                                                        |
| ------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| natal planets (sign/house/retrograde) | Swiss eph + natal JD + houses                          | `src/lib/astrology/foundation/astrologyService.ts:85` | Y                                                              | Auto-fed to `planetSigns/planetHouses` if absent                        |
| ASC/MC/houses                         | Swiss houses calc                                      | `src/lib/astrology/foundation/astrologyService.ts:60` | Y                                                              | House system default Placidus                                           |
| natal aspects                         | `findNatalAspects(...includeMinor=true,maxResults=80)` | `src/app/api/destiny-matrix/ai-report/route.ts:411`   | Y                                                              | Mapped into `aspects` if absent                                         |
| dominantWesternElement                | request field only                                     | `src/lib/destiny-matrix/types.ts:408`                 | Y                                                              | Not auto-derived in route                                               |
| transit chart                         | current ISO + location/timezone                        | `src/lib/astrology/foundation/transit.ts:9`           | Computed but partially used                                    | Stored in astrology snapshot                                            |
| major transits                        | outer->inner filtered transits                         | `src/lib/astrology/foundation/transit.ts:207`         | Computed but unused by matrix unless `activeTransits` provided | Route does not map to `activeTransits`                                  |
| secondary progressions                | natal + target date                                    | `src/app/api/destiny-matrix/ai-report/route.ts:422`   | Y (as snapshot evidence)                                       | Used in prompt grounding via snapshot/GraphRAG                          |
| solar return                          | natal + year                                           | `src/app/api/destiny-matrix/ai-report/route.ts:426`   | Y (snapshot evidence)                                          | Same                                                                    |
| lunar return                          | natal + year/month                                     | `src/app/api/destiny-matrix/ai-report/route.ts:430`   | Y (snapshot evidence)                                          | Same                                                                    |
| aspect orb scoring in matrix          | `actualOrb` vs allowed orb by aspect type              | `src/lib/destiny-matrix/engine.ts:303`                | Y                                                              | <=allowed boosts up to +12%; overflow penalizes to floor 0.7 multiplier |
| asteroid houses                       | request field only                                     | `src/lib/destiny-matrix/types.ts:422`                 | Y                                                              | Not auto-derived in route                                               |
| extraPoint signs                      | request field only                                     | `src/lib/destiny-matrix/types.ts:425`                 | Y                                                              | Not auto-derived in route                                               |

---

## D) Cross / Matrix / GraphRAG

### Matrix summary (overallScore/grade/topInsights)

- Matrix computational summary is built in `calculateSummary` with:
  - `finalScoreAdjusted`, `confidenceScore`, domain scores, overlap timeline.
  - `src/lib/destiny-matrix/engine.ts:504`
- Narrative “topInsights/grade” comes from `FusionReportGenerator.generateReport`:
  - insights from all layers -> weighted -> normalized -> sorted.
  - report overall grade via interpreter score bands.
  - `src/lib/destiny-matrix/interpreter/report-generator.ts:81`

### GraphRAG `crossEvidenceSets (X/T/M)`

- `X*` (aspect sets): built from selected natal aspects + inferred saju domains.
- `T*` (transit sets): built from `input.activeTransits`.
- `M*` (matrix sets): built from `report.topInsights` sources.
- Builder: `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:336`

### overlapScore/orbFitScore formulas

- `orbFitScore`:
  - if orb missing: `0.55`
  - else average over domains of `max(0, 1 - orb/allowedOrb)`.
  - `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:257`
- `allowedOrb`:
  - `baseAspectOrb * DOMAIN_ORB_MULTIPLIER * DOMAIN_ASPECT_ORB_MULTIPLIER * PLANET_PAIR_ORB_MULTIPLIER * PAIR_ASPECT_ORB_MULTIPLIER` with floor `0.8`.
  - `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:247`
- `overlapScore` for aspect sets:
  - `clamp(0.3,0.99, overlapDomains.length/4 + orbFitScore*0.55 + 0.1)`
  - `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:372`

### Which are used in narrative vs debug only

- Used in narrative generation prompt:
  - GraphRAG anchors + selected crossEvidenceSets (`formatGraphRAGEvidenceForPrompt`).
  - Deterministic core prompt block (`buildDeterministicCore(...).promptBlock`).
  - Matrix summary (overall score/grade/top insights/domain scores).
- Debug/metadata mostly:
  - `crossConsistencyAudit` (appended after report generation, not used to generate text).
  - `destinyMatrixEvidenceSummary`, `calculationDetails` (stored/returned metadata).

### Cross/Matrix signals table

| signal name                   | computed from                                 | where in code                                                  | used in narrative? (Y/N)     | notes/thresholds                                        |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| layer1 element core           | dayMaster+pillar vs dominant western element  | `src/lib/destiny-matrix/engine.ts:195`                         | Y                            | Dominant western fallback `earth` if missing            |
| layer2 sibsin-planet          | sibsin keys x planet houses                   | `src/lib/destiny-matrix/engine.ts:216`                         | Y                            | Requires sibsin + planet houses                         |
| layer3 sibsin-house           | sibsin keys x house numbers                   | `src/lib/destiny-matrix/engine.ts:238`                         | Y                            | Dedup per sibsin_house                                  |
| layer4 timing overlay         | `activeTransits` + daeun/saeun element row    | `src/lib/destiny-matrix/engine.ts:262`                         | Y (if activeTransits exists) | If no activeTransits, layer4 empty                      |
| layer5 relation-aspect        | relations x aspects with orb-adjust           | `src/lib/destiny-matrix/engine.ts:289`                         | Y                            | relation kind mapping includes 천간합/충/공망 fallbacks |
| layer6 twelve stage-house     | twelveStages x houses                         | `src/lib/destiny-matrix/engine.ts:327`                         | Y                            | `건록/제왕` skipped                                     |
| layer7 advanced               | geokguk/yongsin rows x progression types      | `src/lib/destiny-matrix/engine.ts:358`                         | Y                            | progression types fixed list                            |
| layer8 shinsal-planet         | shinsal x planets                             | `src/lib/destiny-matrix/engine.ts:405`                         | Y                            | Needs shinsalList                                       |
| layer9 asteroid               | asteroid-house + asteroid-dayMaster element   | `src/lib/destiny-matrix/engine.ts:427`                         | Y                            | Needs asteroidHouses                                    |
| layer10 extra point           | extraPoint-element + extraPoint-sibsin        | `src/lib/destiny-matrix/engine.ts:460`                         | Y                            | Needs extraPointSigns                                   |
| matrix finalScoreAdjusted     | base avg + alignment + time overlap           | `src/lib/destiny-matrix/engine.ts:597`                         | Indirect Y                   | Used in matrix summary context                          |
| fusion topInsights            | weighted/normalized insight ranking           | `src/lib/destiny-matrix/interpreter/insight-generator.ts:99`   | Y                            | Core source for prompts/GraphRAG M-sets                 |
| fusion overall grade          | category weighted score => grade bands        | `src/lib/destiny-matrix/interpreter/report-generator.ts:171`   | Y                            | S/A/B/C/D thresholds                                    |
| GraphRAG X sets               | aspects + saju domain overlap                 | `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:366`     | Y                            | Adds angle/orb/allowed text                             |
| GraphRAG T sets               | `activeTransits`                              | `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:394`     | Y                            | Empty if no activeTransits                              |
| GraphRAG M sets               | `report.topInsights`                          | `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:415`     | Y                            | Up to 6 sets                                            |
| section evidence selection    | section-domain hit + overlap sort             | `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:436`     | Y                            | target set count: comprehensive=6 else 4                |
| deterministic coverage flags  | counts/booleans from matrixInput+report+graph | `src/lib/destiny-matrix/ai-report/deterministicCore.ts:74`     | Y                            | Injected into prompt block                              |
| deterministic binary decision | weighted rule score for GO/DELAY/NO           | `src/lib/destiny-matrix/ai-report/deterministicCore.ts:126`    | Conditional Y                | Enabled only for binary intent                          |
| crossConsistencyAudit score   | post-generation checks C01..C20               | `src/lib/destiny-matrix/ai-report/crossConsistencyAudit.ts:68` | N (generation-time)          | Added to output metadata only                           |

---

## E) Timing

### Timing sources present

- Saju cycles:
  - Daeun (10-year), Seun (year), Wolun (month), Iljin (day)
  - `TimingData` type: `src/lib/destiny-matrix/ai-report/types.ts:109`
- Astrology transits:
  - Transit chart + major transits computed into astrology snapshot.
  - Matrix timing uses `activeTransits` only if provided.

### Time windows logic

- In AI report path (themed/comprehensive): no deterministic “hour-window generator” for narrative text.
- Timing logic present as:
  - `TimingData` cycle snapshots (daeun/seun/wolun/iljin)
  - matrix overlap timeline (12-month synthetic deterministic timeline based on input signature + overlap model)
    - `src/lib/destiny-matrix/monthlyTimeline.ts:87`
- Timing report (`daily/monthly/yearly`) uses LLM sections with timing data injected; not hardcoded final windows.

### Coverage flags and usage

- Deterministic coverage includes:
  - `hasDaeun`, `hasSaeun`, `activeTransitCount`, `hasCurrentDateIso`, `currentDateIso`.
  - `src/lib/destiny-matrix/ai-report/deterministicCore.ts:12`
- These flags are used in prompt block to force grounding and, for binary intent, affect deterministic decision score.

### Timing signals table

| signal name                 | computed from                                     | where in code                                              | used in narrative? (Y/N)   | notes/thresholds                           |
| --------------------------- | ------------------------------------------------- | ---------------------------------------------------------- | -------------------------- | ------------------------------------------ |
| auto seun/wolun/iljin       | date-based approximate ganji formulas             | `src/app/api/destiny-matrix/ai-report/route.ts:633`        | Y                          | Marked as simple approximation in comments |
| auto daeun                  | derived current daeun else age-decade fallback    | `src/app/api/destiny-matrix/ai-report/route.ts:255`        | Y                          | fallback stem/branch cycles                |
| request timing override     | request timingData merged over auto               | `src/app/api/destiny-matrix/ai-report/route.ts:484`        | Y                          | field-wise override                        |
| timing completeness gate    | missing timing fields list                        | `src/app/api/destiny-matrix/ai-report/route.ts:497`        | Y (generation gate)        | blocks report in strict mode               |
| matrix time overlap         | element overlap + strong transits + layer density | `src/lib/destiny-matrix/timeOverlap.ts:66`                 | Indirect Y                 | weight range 1.0..1.3                      |
| monthly overlap timeline    | deterministic hash+seasonal bumps over 12 months  | `src/lib/destiny-matrix/monthlyTimeline.ts:87`             | Indirect Y                 | used in matrix summary/domain timeline     |
| timing section quality gate | required timing coverage ratios in text           | `src/lib/destiny-matrix/ai-report/aiReportService.ts:628`  | Y (repair loop)            | comprehensive requires timing ratio 1.0    |
| timing report period score  | element bonus + deterministic hash offsets        | `src/lib/destiny-matrix/ai-report/scoreCalculators.ts:109` | Y (timing report metadata) | not used as matrix score                   |

---

## Code Entrypoints + Returned Shapes

### 1) analyzePersona

- Function: `analyzePersona(answers, locale='en')`
- File: `src/lib/persona/analysis.ts:325`
- Used by persona quiz subsystem, **not** by destiny-matrix AI report pipeline.

### 2) Saju analysis

- Main Saju calc: `calculateSajuData(...)`
  - File: `src/lib/Saju/saju.ts:163`
  - Returns `CalculateSajuDataResult` with keys including:
    - `yearPillar`, `monthPillar`, `dayPillar`, `timePillar`, `pillars`, `daeWoon`, `unse`, `fiveElements`, `dayMaster` (`src/lib/Saju/saju.ts:522`)
- Advanced Saju: `analyzeAdvancedSaju(...)`
  - File: `src/lib/Saju/astrologyengine.ts:530`
  - Returns `{ strength, geokguk, yongsin }`.

### 3) Astrology analysis

- Natal: `calculateNatalChart(...)` -> `NatalChartData`
  - File: `src/lib/astrology/foundation/astrologyService.ts:52`
  - Keys: `planets`, `ascendant`, `mc`, `houses`, `meta` (`:36`)
- Natal aspects: `findNatalAspects(...)`
  - File: `src/lib/astrology/foundation/aspects.ts:218`
- Transit: `calculateTransitChart(...)`, `findMajorTransits(...)`
  - File: `src/lib/astrology/foundation/transit.ts:9`, `:207`

### 4) Cross builder

- Function: `buildGraphRAGEvidence(input, report, options)`
- File: `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts:505`
- Return shape: `GraphRAGEvidenceBundle`
  - `{ mode, theme?, period?, anchors[] }`
  - anchor keys: `id, section, sajuEvidence, astrologyEvidence, crossConclusion, crossEvidenceSets[]`

### 5) Report generators

- Base fusion report: `FusionReportGenerator.generateReport(...)`
  - File: `src/lib/destiny-matrix/interpreter/report-generator.ts:81`
  - Return `FusionReport` keys:
    - `profile`, `overallScore`, `topInsights`, `domainAnalysis`, `timingAnalysis`, `visualizations`
- AI comprehensive: `generateAIPremiumReport(...)`
  - File: `src/lib/destiny-matrix/ai-report/aiReportService.ts:501`
  - Return `AIPremiumReport` (`src/lib/destiny-matrix/ai-report/reportTypes.ts:13`)
- AI timing: `generateTimingReport(...)`
  - File: `src/lib/destiny-matrix/ai-report/aiReportService.ts:892`
  - Return `TimingAIPremiumReport` (`src/lib/destiny-matrix/ai-report/types.ts:142`)
- AI themed: `generateThemedReport(...)`
  - File: `src/lib/destiny-matrix/ai-report/aiReportService.ts:1166`
  - Return `ThemedAIPremiumReport` (`src/lib/destiny-matrix/ai-report/types.ts:199`)

---

## What the report currently uses (Top 20 actually referenced signals)

The list below is based on fields explicitly injected into prompts (`buildProfileInfo`, `buildMatrixSummary`, GraphRAG prompt, deterministic core prompt, timing/themed prompt builders) and generation flow in `aiReportService.ts`.

1. `dayMasterElement`
2. `geokguk`
3. `yongsin`
4. `sibsinDistribution` (top and full distribution)
5. `shinsalList`
6. `currentDaeunElement`
7. `timingData.daeun` (stem/branch/element/age)
8. `timingData.seun`
9. `timingData.wolun`
10. `timingData.iljin`
11. `planetSigns` (especially Sun/Moon in profile summary)
12. `planetHouses`
13. `aspects` (with angle/orb/allowed in GraphRAG evidence)
14. `dominantWesternElement`
15. `activeTransits` (only if present in matrix input)
16. `matrixReport.overallScore.total`
17. `matrixReport.overallScore.grade`
18. `matrixReport.topInsights` (+source layer evidence)
19. `matrixReport.domainAnalysis` (domain scores)
20. GraphRAG anchors + deterministic coverage/decision block (`hasDaeun`, `hasSaeun`, `hasCurrentDateIso`, graph set counts)

---

## Computed but unused / not computed (important)

- Computed but not auto-used by matrix timing:
  - `astrologySnapshot.currentTransits.majorTransits` (route computes, but does not map to `activeTransits`).
- Not auto-computed in this route (must be provided by caller if desired):
  - `relations`, `twelveStages`, `shinsalList`, `dominantWesternElement`, `asteroidHouses`, `extraPointSigns`.
- Not computed as deterministic text windows in themed/comprehensive report:
  - explicit hourly windows (LLM can describe timing, but hardcoded hour-slot engine is not in this path).
