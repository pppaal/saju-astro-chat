# Calculation Spec: Deterministic Saju + Astrology Pipeline

Last audited: 2026-06-15 (Asia/Hong_Kong)

> Historical note: the `src/lib/destiny-matrix`
> "Raw Input -> Feature -> Rule -> Pattern -> Scenario -> Verdict -> Evaluation"
> matrix core and its GraphRAG sidecar were removed around 2026-06-05. The
> `tokenCompiler` / `ontology` / `activationEngine` / `ruleEngine` /
> `scenarioEngine` / `decisionEngine` / `evaluationSuite` / `inputVerdictAudit`
> layers, the snapshot input contract, and the `/api/calendar`,
> `/api/destiny-map`, `/api/destiny-matrix` routes no longer exist. This spec
> is code-derived from the calculation pipeline that actually ships.

This document describes the deterministic calculation layers only: the Saju
core, the Astrology core, the fact collectors, cross fusion, and the calendar
engine signal model. Everything here is computed without an LLM. The LLM
surfaces (counselor, compatibility, tarot) are documented in
`DESTINY_ENGINE_ARCHITECTURE.md`.

## 1. Saju core

### Entry point

`src/lib/saju/saju.ts`

```
calculateSajuData(
  birthDate: string,           // 'YYYY-MM-DD'
  birthTime: string,           // 'HH:MM' (AM/PM and bare-hour forms normalized)
  gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar',
  timezone: string,
  lunarLeap?: boolean,         // only meaningful when calendarType === 'lunar'
  longitude?: number,          // true-solar-time (LMT) correction
): CalculateSajuDataResult
```

Lunar input is converted to solar first; the result is LRU-cached on the full
argument tuple.

### Output: `CalculateSajuDataResult` (`src/lib/saju/types.ts`)

- `yearPillar` / `monthPillar` / `dayPillar` / `timePillar` (legacy flat) and
  `pillars: { year, month, day, time }` (nested) — each a `PillarData`.
- `daeWoon: { startAge, isForward, current, list }`.
- `unse: { daeun[], annual[], monthly[] }`.
- `fiveElements: { wood, fire, earth, metal, water }`.

### Analysis helpers (re-exported from `src/lib/saju/index.ts`)

- `analyzeStrength` (`tonggeun.ts`) — body strength / 통근 rooting.
- `determineGeokguk` (`geokguk.ts`) — structure (격국).
- `determineYongsin` (`yongsin.ts`) — useful god (용신).
- `getTwelveStagesForPillars` and `annotateShinsal` (`shinsal.ts`) — 12 stages
  and shinsal annotation.
- `analyzeRelations` (`relations.ts`) — branch relations (형충회합).
- `getDaeunCycles` / `getAnnualCycles` / `getMonthlyCycles` /
  `getIljinCalendar` (`unse.ts`) — luck cycles.

Supporting data/util: `constants.ts`, `tonggeun.ts`, `dayPillar.ts`,
`cycles.ts`, `johuYongsin.ts`.

## 2. Astrology core

### Entry point

`src/lib/astrology/foundation/astrologyService.ts`

```
calculateNatalChart(input): Promise<NatalChartData>
toChart(natal): Chart
```

`NatalChartData` carries `planets` (name, sign, house, longitude, retrograde),
ascendant/MC, and houses.

### Supporting modules

- Aspects: `aspects.ts` (`findNatalAspects`, etc.).
- Houses: `houses.ts`. Extra points: `extraPoints.ts`. Dignities: `dignities.ts`.

### Advanced techniques (sibling files)

- `calculateSecondaryProgressions` (`progressions.ts`)
- `calculateSolarReturn` / `calculateLunarReturn` (`returns.ts`)
- `calculateComposite` (`composite.ts`)
- `calculateSynastry` (`synastry.ts`)
- Plus profections, zodiacal releasing, eclipses, fixed stars, midpoints,
  arabic parts, almuten figuris.

## 3. Fact collectors (the SSOT)

The fact collectors are the single processing point that all surfaces read
from. They return raw structured JSON; no text formatting, no LLM.

### `collectSajuFacts` (`src/lib/destiny/sajuFacts.ts`)

Input `SajuFactsInput`: `birthDate`, `birthTime`, `gender`, `timezone?`,
`longitude?`, `calendarType?`, `lunarLeap?`.

Output `SajuFacts`:

- `pillars` — `year`/`month`/`day`/`time` facts.
- `dayMaster` — `{ name, element, yinYang, rooted }` (`rooted` = 통근).
- `fiveElements` — `{ wood, fire, earth, metal, water }`.
- `strength` — simplified `신강` / `신약` label (empty if it cannot be computed).
- `geokguk` — structure label or `null`.
- `yongsin` — `YongsinResult` or `null`.
- `relations` — branch relations (형충회합).
- `gwansalHonjap` — 관살혼잡 flag (정관 + 편관 together).
- `daeun` — `{ current, list }`.
- `johuYongsin` — seasonal-balance auxiliary yongsin or `null`.
- `gongmang` — void branches (空亡).
- `_raw` — original `calculateSajuData` result (escape hatch for callers, e.g.
  the calendar context builder, that need the raw shape).

### `collectAstroFacts` (`src/lib/destiny/astroFacts.ts`)

Input `AstroFactsInput`: `birthDate`, `birthTime`, `latitude`, `longitude`,
`timezone`, `birthTimeUnknown?`, `birthCityUnknown?`, `includeHellenistic?`.

Output `AstroFacts | null` (async; `null` on calculation failure):

- `natal` — `{ planets, ascendant, mc, placeUnreliable }`. Each planet carries
  sign, house, longitude, retrograde, dignity.
- `aspects` — `{ strong, mid }` split by orb (0-2 deg / 2-5 deg), major types only.
- `profection` — `{ age, activatedHouse, activatedSign, lordOfYear,
lordPlacement }` or `null`.
- When `includeHellenistic` is set: the richer Hellenistic dataset
  (Chiron/Lilith, arabic lots, zodiacal releasing, 5-tier dignities, almuten
  figuris, minor aspects).

`placeUnreliable` is set when birth time or birth city is unknown. Downstream
surfaces must not cite house / ASC / MC / timing when it is true.

## 4. Cross fusion

The Saju ↔ astrology correspondence dictionary is
`src/lib/calendar-engine/data/saju-astro-mapping.ts`:

- `SAJU_ASTRO_MAPPINGS: CrossMapping[]` pairs a saju key (a ten-god or shinsal
  name: `정관`, `도화`, `역마`, ...) with one planet (`Sun`..`Pluto`), and carries a
  grade, a mapping polarity and ko/en meanings.
- `lookupCrossMapping(sajuKey, astroKey)` is the index lookup (the Day tier's
  hour crossings in `src/lib/calendar-view/toHourCrossings.ts` use it).
- Grade A is a direct East/West correspondence whose two sides act in the same
  polarity direction. Grade B is a supporting correspondence: outer-planet decade
  rows and fast-planet nuance rows. Both grades are emitted; there is no grade
  filter, only the layer band below.
- A mapping sign must be reachable under the fixed parent polarities. Shinsal
  polarity is fixed (`SHINSAL_POLARITY`: 도화 +1, 역마 0, 건록 +2, 양인 −2,
  천을귀인 +3), so a row against it can never get agreeing parents and is retired
  (도화 × Mars −1).
- `crossOnly` rows are calendar coverage only. The report's one-planet-per-key
  mapping (`src/lib/report/natalCrossShared.ts`) skips them.

The calendar post-pass `extractCrossActivations`
(`src/lib/calendar-engine/extractors/cross-activation.ts`) pairs co-active
signals:

- **Parents.** Saju: the ten-god of `saju-pillar` (대운, 세운, 월운, 일진) and
  `saju-hour` signals, and the shinsal name of `saju-shinsal` /
  `saju-shinsal-activation` signals. Derived lines (element flow, 지장간 통근) are
  not keys. Astro: `evidence.planets[0]` of a planet moving in the sky. Excluded:
  eclipses (the key would be the affected natal point), profection and zodiacal
  releasing (time lords), planetary hours (the Chaldean hour ruler), and solar
  arc, secondary progressions and the progressed Moon, including the progressed
  lunar return milestone (symbolic directions).
- **Window.** The intersection of the two parent windows. The peak is the
  midpoint of the parent peaks, or the window centre if that falls outside.
- **Layer.** The narrowest parent layer
  (`instant < hourly < daily < monthly < yearly < decadal`), because the window
  is the intersection. A cross with a 시진 parent stays `hourly`, so it stays out
  of `TONE_LAYERS`. A `decadal` cross needs a 대운 parent and a decade-scale astro
  parent.
- **Band.** `CROSS_LAYER_BAND` lists the layers in which each planet may cross.
  The cross layer (above) is checked against it, and a pair outside the band is
  dropped.
- **Polarity** (`combinePolarity`). The mapping sign is kept only when the
  parents agree with it: both carry it, or one carries it and the other is 0.
  A parent of the opposite sign, or two neutral parents, gives 0, and the meaning
  is replaced by the neutral "cancel out" copy. A neutral mapping (0) always gives
  0 and keeps its own meaning. The magnitude is the mapping's; a parent only
  contributes its sign.
- **Weight.** `saju.weight × astro.weight × 0.6`, clamped to [0, 1].
- **Dedup.** Candidates with the same (pair, layer, window) keep the strongest.
  After cell bucketing, `dedupeCrossSignals` keeps one cross per (cell, name,
  layer), ranked by |polarity| × weight, then weight, then id.
- **Id.** `cross.{saju}-x-{astro}.{layer}:{startDay}~{endDay}`.

<!-- gen:cross-doctrine -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**Source:** [`cross-activation.ts`](../src/lib/calendar-engine/extractors/cross-activation.ts) `crossPolarityTruthTable()` (the table the truth-table test reads) and [`saju-astro-mapping.ts`](../src/lib/calendar-engine/data/saju-astro-mapping.ts).

#### Pair polarity (sign of `combinePolarity`)

**Mapping +**

|        | astro + | astro 0 | astro − |
| ------ | ------- | ------- | ------- |
| saju + | +       | +       | 0       |
| saju 0 | +       | 0       | 0       |
| saju − | 0       | 0       | 0       |

**Mapping −**

|        | astro + | astro 0 | astro − |
| ------ | ------- | ------- | ------- |
| saju + | 0       | 0       | 0       |
| saju 0 | 0       | 0       | −       |
| saju − | 0       | −       | −       |

**Mapping 0**

|        | astro + | astro 0 | astro − |
| ------ | ------- | ------- | ------- |
| saju + | 0       | 0       | 0       |
| saju 0 | 0       | 0       | 0       |
| saju − | 0       | 0       | 0       |

#### Layer band (`CROSS_LAYER_BAND`, checked at the narrowest parent layer)

| Planet    | Cross layers                   |
| --------- | ------------------------------ |
| `Moon`    | `hourly`, `daily`              |
| `Sun`     | `hourly`, `daily`, `monthly`   |
| `Mercury` | `hourly`, `daily`, `monthly`   |
| `Venus`   | `hourly`, `daily`, `monthly`   |
| `Mars`    | `hourly`, `daily`, `monthly`   |
| `Jupiter` | `monthly`, `yearly`, `decadal` |
| `Saturn`  | `yearly`, `decadal`            |
| `Uranus`  | `decadal`                      |
| `Neptune` | `decadal`                      |
| `Pluto`   | `decadal`                      |

Mappings: 57 (A 27 · B 30); every grade is emitted, gated only by the band.

<!-- /gen:cross-doctrine -->

Natal cross synthesis for the report: `src/lib/report/natalCross.ts`.

## 5. Calendar engine signal model

### Pipeline

`src/lib/calendar-engine/index.ts` -> `buildCalendar(natal, range, options):
Promise<CalendarCell[]>`:

1. `buildNatalContext()` (`context/build.ts`) builds the `NatalContext`,
   reusing `collectSajuFacts()` via the `_raw` escape hatch.
2. ~25 extractors in `extractors/` (`saju-*`, `astro-*`) run in parallel and
   produce `ActiveSignal[]`.
3. The `cross-activation` post-pass synthesizes Saju x Astrology co-active
   pairs from `SAJU_ASTRO_MAPPINGS` (grades A and B, gated by
   `CROSS_LAYER_BAND`; §4).
4. Signals are grouped into cells; derivers compute scores, salience, and
   patterns.

### Inputs

- `natal: NatalContext` (from `buildNatalContext`).
- `range: CalendarRange` — `{ start, end, granularity: 'day' | 'hour' }`
  (`'hour'` is the expensive mode).
- `options: CalendarBuildOptions` — `enabledExtractors?`, `enablePatterns?`,
  `includeEvidence?`.

### `ActiveSignal` (`src/lib/calendar-engine/types.ts`)

- `id` — unique key (e.g. `saju.shinsal.도화.2026-05-15`).
- `source`, `kind`, `name`, `korean?`, `english?`.
- `polarity` — -3..+3 fortune intensity.
- `layer` — time scale; `active` — `ActiveWindow`.
- `weight` — 0..1 (layer weight x intrinsic strength).
- `evidence` — `SignalEvidence` (module name + raw detail for debugging).

### `CalendarCell`

- `datetime` (ISO), `signals` (all active signals at that point).
- `derivedScore` — 0..100 favorability (polarity-weighted sum).
- `salience` — how notable the day is (rare x strong), orthogonal to
  favorability; computed relative to the build chunk population.
- `matchedPatterns` — `SignalPattern[]` (named signal combinations).
- `topReasons` / `cautions` (KO) and `topReasonsEn` / `cautionsEn` (EN).

### Rendering

Server-rendered only: `src/app/calendar/page.tsx` ->
`src/app/calendar/assembleTiers.ts` (`assembleTiers`) consumes
`CalendarCell[]` and assembles lifetime/decade/year/month/day tiers. There is
no `/api/calendar` route.

## 6. Data-reliability rule

When birth time or birth city is unknown, `collectAstroFacts` / the natal
context set `placeUnreliable = true`. Every downstream surface (counselor
context, calendar, report) must suppress house / ASC / MC / hour-pillar /
iljin-window claims in that case, because the engine would otherwise fall back
to a midnight/Seoul default and produce plausible-but-wrong houses.

## 7. Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run ops:destiny:release` (typecheck + the integrated-report release
  tests)
