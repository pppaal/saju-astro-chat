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

`src/lib/cross/crossInterpret.ts`:

- `lookupCross(saju, astro)` — find a `CrossMapping` for a saju key + astro key.
- `crossMeaning(saju, astro, lang)` — the ko/en meaning string.
- `rankActiveCrosses(...)` — rank the active correspondences.

The correspondence dictionary used by the calendar engine is
`src/lib/calendar-engine/data/saju-astro-mapping.ts`:

- `SAJU_ASTRO_MAPPINGS: CrossMapping[]`.
- A saju side key is a ten-god or shinsal name (`정관`, `도화`, `역마`, ...);
  the astro side key is a single planet (`Sun`..`Pluto`).
- Each mapping has a grade `A | B | C` and ko/en meanings. Only A-grade pairs
  are emitted as `cross-activation` signals.
- Pair model in the extractor:
  `pair.polarity = sign(saju.polarity x astro.polarity) x |mapping.polarity|`,
  `pair.weight = saju.weight x astro.weight x 0.6`.

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
   pairs from the A-grade `SAJU_ASTRO_MAPPINGS`.
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
