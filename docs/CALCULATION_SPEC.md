# Calculation Spec: Deterministic Saju + Astrology Pipeline

Last audited: 2026-11-25 (engine audit E15 doc sync; saju rules in
`src/lib/saju/CONVENTIONS.md`, time rules in `SOLAR_TIME_CONVENTION.md`)

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
  birthDate: string,           // 'YYYY-MM-DD' (civil date in the birth timezone)
  birthTime: string,           // 'HH:MM' (AM/PM and bare-hour forms normalized); '' = unknown
  gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar',
  timezone: string,            // IANA; invalid/empty → CALCULATION_STANDARDS.saju.baseTimezone
  lunarLeap?: boolean,         // only meaningful when calendarType === 'lunar'
  longitude?: number,          // hour pillar only: mean solar time = UT + lon × 4 min;
                               // missing → the zone's reference longitude
  now: Date = new Date(),      // injectable clock for 대운/세운/월운 and age
  opts: { timeUnknown?: boolean } = {},
): CalculateSajuDataResult
```

Lunar input is converted to solar first. The result is LRU-cached on the full
argument tuple plus the birthplace-local date of `now` and the time-unknown flag.
Natal pillars depend only on the birth input; only the timing fields read `now`.

Pillar rules (`src/lib/saju/CONVENTIONS.md` is the canonical text):

- **Birth instant:** `resolveBirthInstant` (RFC 5545: a repeated wall time is the
  first occurrence, a skipped wall time uses the offset before the gap). The
  astrology natal chart (`natalToJD`) uses the same function.
- **Year, month and 대운 start age:** the raw UT birth instant compared with the
  absolute 절입 instant (Swiss Ephemeris table, supported range **1900–2050**;
  `KASI_SOLAR_TERMS` holds 1899–2051 for the boundary lookups). No longitude
  correction (OD-1).
- **Day:** the civil date as entered in the birth timezone, counted by JDN
  (2000-01-01 = 戊午). Not KST midnight, no longitude correction.
- **Hour:** mean solar time, `UT + longitude × 4 min`
  (`meanSolarMinuteOfDay` / `solarTimeCorrectionMinutes`). A missing longitude
  uses the zone's reference longitude (Asia/Seoul = 126.978; other zones from
  tzdata, `zoneReference.generated.ts`). A longitude more than 60° from the zone
  meridian is discarded for the zone reference (OD-14). No equation of time.
- **대운:** direction 양남음녀 순행 / 음남양녀 역행 from the year stem;
  start age = floor(days to the 절입 / 3), minimum 1
  (`CALCULATION_STANDARDS.saju.daeunRounding`). Decade _i_ starts at
  `startAge + 10i` and the sequence never ends; the current 대운 is the one whose
  `[startAge + 10i, startAge + 10i + 10)` range holds the 만 나이 at `now` (civil
  birthday). The list has at least 10 entries and grows to the running decade
  when the 만 나이 is past `startAge + 100` (`daeunAge.daeunListLength`), so no
  surface ever calls a finished decade current. Before the first one
  `daeWoon.current = null` and `daeWoon.preDaeun = { startsAtAge }` (OD-12).
  One SSOT: `saju.resolveDaeunAt` (list + `daeunAge.currentDaeun`), used by
  `calculateSajuData` and `/api/saju`; the Life tier reads the same rule
  (`daeunAge.runningDaeunIndex`).
- **Time unknown** (`opts.timeUnknown` or a blank `birthTime`): the calculation
  anchors at 12:00 only to fix the year, month and day pillars and the 대운. Any
  `birthTime` string passed with `opts.timeUnknown` (or `collectSajuFacts`'s
  `birthTimeUnknown`) is ignored — `'03:00'`, `'23:30'` and `''` give the same
  result. `fiveElements` counts the 6 characters of the three known pillars,
  `timeUnknown = true`, and `timePillar` is a placeholder that no judgment may
  read (삼주 analysis, OD-5).
- **Lunar input** (`calendarType: 'lunar'`): converted with `korean-lunar-calendar`
  (lunar 1000-01-01 … 2050-11-18). A lunar date that does not exist (day 30 of a
  29-day month, a leap month the year does not have) is a validation error at
  the API (`sajuCalculationRequestSchema`, HTTP 422 `VALIDATION_ERROR`) and an
  `InvalidLunarDateError` in the engine.

### Output: `CalculateSajuDataResult` (`src/lib/saju/types.ts`)

- `yearPillar` / `monthPillar` / `dayPillar` / `timePillar` (legacy flat) and
  `pillars: { year, month, day, time }` (nested) — each a `PillarData`.
- `daeWoon: { startAge, isForward, current, preDaeun?, list }` — `current` is
  `null` before the first 대운.
- `unse: { daeun[], annual[] }`. (The raw `unse.monthly` array was removed:
  it labelled every Gregorian month with the following 節-month. 월운 comes from
  `datePillars.getMonthPillarForDate` / `currentUnse`, and `/api/saju` returns
  `wolun` from `unse.getMonthlyCycles`.)
- `fiveElements: { wood, fire, earth, metal, water }` (sums to 8, or 6 when the
  time is unknown).
- `timeUnknown?: boolean`.
- `meta?: { birthUtc, instantKind: 'normal' | 'gap' | 'overlap', civilBirthDate,
timeZone }`.

### Analysis helpers (source modules; production code imports them directly)

- `computeStrengthScore` / `calculateStrengthScore` (`strengthScore.ts`) — the
  strength score SSOT (0–100, 50 = neutral); `strengthBandOf` maps it to the
  five steps (극신강·신강·중화·신약·극신약), `strengthClassOf` to three classes.
- `calculateTonggeun` / `calculateDeukryeong` (`tonggeun.ts`) — 통근 rooting and
  득령 (旺相休囚死) facts for the analyses block. They do not label strength:
  the strength score and its 5-step label come only from `strengthScore.ts`
  (the second algorithm `analyzeStrength` was removed, SDR-07).
- `determineGeokguk` (`geokguk.ts`) — structure (격국), strict 화기격국 via
  `evaluateHwagiGeokguk`.
- `determineYongsin` (`yongsin.ts`) — useful god (용신), consistent with 억부;
  recommended and avoided elements never overlap.
- `getTwelveStagesForPillars` and `annotateShinsal` (`shinsal.ts`) — 12 stages
  and shinsal annotation.
- `analyzeRelations` (`relations.ts`) — 합·충·형·파·해·원진, 삼합·방합 (three
  distinct branches), 형 from `hyeong.isHyeong`.
- `currentDaeun` (`daeunAge.ts`) — current 대운 selection (pure);
  `resolveDaeunAt` (`saju.ts`) — the list long enough for `now` plus the
  current 대운.
- `getAnnualCycles` / `getMonthlyCycles` / `getIljinCalendar` (`unse.ts`) —
  luck cycles. The 대운 list comes only from `calculateSajuData`
  (`unse.getDaeunCycles` was removed in 2026-06).

All of these accept a missing hour pillar (`MaybeTimeless<…>`) and then read the
three known pillars only. Supporting data/util: `constants.ts`, `dayPillar.ts`,
`cycles.ts`, `johuYongsin.ts`, `relationTables.ts`, `hyeong.ts`.

## 2. Astrology core

### Entry point

`src/lib/astrology/foundation/astrologyService.ts`

```
calculateNatalChart(input): Promise<NatalChartData>
toChart(natal): Chart
```

`NatalChartData` carries `planets` (name, sign, house, longitude, retrograde),
ascendant/MC, and houses. The birth instant comes from `natalToJD`, which uses
`resolveBirthInstant` like the saju engine. `isoToJD` treats a trailing `Z` or
`±hh:mm` as an absolute instant and resolves an offset-less wall-clock string
with `resolveBirthInstant` too. Tropical zodiac, true node, no solar-time
correction.

### Supporting modules

- Aspects: `aspects.ts` (`findNatalAspects`, `findAspects` — applying/separating
  from the transit body's speed, the tightest aspect per pair).
- Houses: `houses.ts` — `CALCULATION_STANDARDS.astrology.houseSystem` (Placidus).
  Above the polar circle (|latitude| > 66.56°) Placidus is undefined, so the
  chart falls back to Whole Sign and reports `houseSystem: 'WholeSign'`.
- Extra points and sect: `extraPoints.ts` — `isDiurnalChart` is the sect SSOT
  (day chart = Sun's true altitude > 0° via `swe_azalt`; the house rule is only
  the fallback when the ephemeris cannot answer).
- Dignities: `dignities.ts`.
- Ephemeris: `ephe.ts` checks on the first `getSwisseph()` that the Swiss
  Ephemeris files (not Moshier) are in use and that Chiron computes; a failure is
  logged, not thrown.

### Advanced techniques (sibling files)

- `calculateSecondaryProgressions` (`progressions.ts`)
- `calculateSolarReturn` / `calculateLunarReturn` (`returns.ts`)
- `calculateComposite` (`composite.ts`)
- `calculateSynastry` (`synastry.ts`)
- Profections (`profections.ts`) — whole-sign: the activated sign is the
  ASC sign + age, house = (age mod 12) + 1; Placidus cusps are not read.
- Solar arc (`progressions.ts`) — the true arc λ☉(natal JD + age days) −
  λ☉(natal); no self-aspects.
- Zodiacal releasing (`zodiacalReleasing.ts`) — L1 = years, L2 = 1/12 year,
  L3 = 2.5 days (Valens 30-day month / 12), L4 = 5 hours (OD-11).
- Planetary hours (`electional.ts`) — the planetary day runs from the real local
  sunrise (`swe_rise_trans`); hours before sunrise belong to the previous day's
  ruler; polar days with no sunrise or sunset have none.
- Moon void of course ends at the Moon's real ingress into the next sign.
- Outer milestones (`calendar-engine/lifecycle/outerMilestones.ts`) — Saturn,
  Jupiter and Chiron returns and the waxing outer squares are exact instants
  (scan + bisection, about 1 min).
- Plus eclipses, fixed stars, midpoints, arabic parts, almuten figuris.

## 3. Fact collectors (the SSOT)

The fact collectors are the single processing point that all surfaces read
from. They return raw structured JSON; no text formatting, no LLM.

### `collectSajuFacts` (`src/lib/destiny/sajuFacts.ts`)

Input `SajuFactsInput`: `birthDate`, `birthTime`, `birthTimeUnknown?`, `gender`,
`timezone?` (default `CALCULATION_STANDARDS.saju.baseTimezone`), `longitude?`,
`calendarType?`, `lunarLeap?`, `now?`.

Output `SajuFacts`:

- `pillars` — `year`/`month`/`day` facts, and `time` (`null` when the time is
  unknown).
- `timeUnknown` — three-pillar reading flag.
- `dayMaster` — `{ name, element, yinYang, rooted }` (`rooted` = 통근).
- `fiveElements` — `{ wood, fire, earth, metal, water }`.
- `strength` — three-class `신강` / `중화` / `신약` label from
  `strengthClassOf` (empty if it cannot be computed).
- `geokguk` — structure label or `null`.
- `yongsin` — `YongsinResult` or `null`.
- `relations` — branch relations (형충회합).
- `gwansalHonjap` — 관살혼잡 flag (정관 + 편관 together).
- `daeun` — `{ current, list, preDaeun }` (`current` is `null` before the first
  대운).
- `johuYongsin` — seasonal-balance auxiliary yongsin or `null`.
- `gongmang` — void branches (空亡).
- `_raw` — original `calculateSajuData` result (escape hatch for callers, e.g.
  the calendar context builder, that need the raw shape).

### `collectAstroFacts` (`src/lib/destiny/astroFacts.ts`)

Input `AstroFactsInput`: `birthDate`, `birthTime`, `latitude`, `longitude`,
`timezone`, `birthTimeUnknown?`, `birthCityUnknown?`, `includeHellenistic?`;
second argument `now` (profection age).

Output `AstroFacts | null` (async; `null` on calculation failure):

- `natal` — `{ planets, ascendant, mc, placeUnreliable }`. Each planet carries
  sign, house, longitude, retrograde, dignity. When `placeUnreliable`, planet
  houses, `ascendant` and `mc` are `null`.
- `aspects` — `{ strong, mid }` split by orb (0-2 deg / 2-5 deg), major types only.
- `profection` — `{ age, activatedHouse, activatedSign, lordOfYear,
lordPlacement }` or `null`. When `placeUnreliable`, `activatedHouse`,
  `activatedSign`, `lordOfYear` and `lordPlacement` are `null` (whole-sign counts
  from the ASC sign); only `age` stays.
- When `includeHellenistic` is set: the richer Hellenistic dataset
  (Chiron/Lilith, arabic lots, zodiacal releasing, 5-tier dignities, almuten
  figuris, minor aspects). Sect comes from `isDiurnalChart`. When
  `placeUnreliable`, `maskPlaceDependentHellenistic` empties lots, ZR and the
  almuten, drops aspects to the angles and the aspect-end houses, and sets the
  Chiron/Lilith houses to unknown. When `sectUnreliable` (see §6),
  `maskSectDependentHellenistic` sets `sect: null`, rescores the dignities with
  only the participating triplicity ruler, and empties lots, ZR and the almuten.
- The birth timezone goes through `resolveBirthTimezone`
  (`src/lib/datetime/resolveTimezone.ts`): explicit zone → zone of the birth
  coordinates → `CALCULATION_STANDARDS.saju.baseTimezone` with a warning.

`placeUnreliable` is set when birth time or birth city is unknown. Downstream
surfaces must not cite house / ASC / MC / timing when it is true (§6).

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
- A calendar-only (`crossOnly`) row must be able to fire in some band. Shinsal
  parents are daily, so 천을귀인 × Jupiter (Jupiter crosses from `monthly` up) is
  retired; 건록 × Jupiter stays as the report's representative 건록 mapping.
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
  releasing (time lords), planetary hours (the Chaldean hour ruler), solar
  arc, secondary progressions and the progressed Moon, including the progressed
  lunar return milestone (symbolic directions), and solar and lunar returns
  (cycle periods; they stay standalone astro signals). Real planet returns
  (Jupiter, Saturn, ... lifecycle milestones) remain keys.
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

Mappings: 56 (A 26 · B 30); every grade is emitted, gated only by the band.

<!-- /gen:cross-doctrine -->

Natal cross synthesis for the report: `src/lib/report/natalCross.ts`.
Evaluators follow the element relation: same → resonant, 生 → complement,
剋 → tension (OD-10; this includes the growth axis `evalNorthNode`). Karma and
growth rows carry `karmaAxis` and are not counted in any tone; `tallyCrossRows`
is the one tally that the intro and the tone bar both read.

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

The engine is range-invariant: a 1-day build and a month build give the same
signals for a day, so the Day tier reads its crosses from the month cell.

**Day reason** ("왜 이런 날", `pickDayReasonSignal` in
`src/app/calendar/crossPair.ts`, shared by the Monthly readout and the Daily hero):

- Only cross signals with nonzero polarity whose sign passes the mark gate:
  good/best need +, caution/avoid need −, an unmarked or focus day allows either.
  If nothing passes, there is no reason.
- Daily and instant crosses rank first (+1000). Hourly 시진 crosses get no bonus:
  they lead only when no agreeing daily or instant cross exists, and then compete
  on impact (|polarity| × weight) with monthly and wider crosses.
- Ties keep the first signal in cell order.

`deriveMonthSummary` takes `bestDayKind`: `'next-good'` when the month's best day
has passed and the push day is the next good day, which switches the summary to
the fallback wording.

## 6. Data-reliability rule

**Unknown birth time = three-pillar (삼주) saju** (OD-5, CONVENTIONS §5). The
calculation anchors at 12:00 (`resolveBirthTimeAnchor`) only to fix the year,
month and day pillars. Counts, strength, 용신, 격국, relations, shinsal, 12
stages and luck-cycle relations read the three known pillars; position weights
are renormalised over the present pillars. `collectSajuFacts` returns
`pillars.time = null` and `timeUnknown = true`. `/api/saju` accepts
`birthTimeUnknown: true` or a blank time and then returns `timePillar: null`,
`table.byPillar.time: null`, `timeUnknown: true` and `fiveElements` summing to 6;
a request with a non-blank time and no flag, including `'00:00'`, is a real
birth time. The key-day push builds its natal the same way as the web calendar.

**Unknown birth time or birth city = `placeUnreliable`.** The ASC, MC and houses
of a noon-anchored or default-coordinate chart are fabricated, so everything that
depends on them is dropped:

- `collectAstroFacts`: planet houses, ASC and MC are `null`; the hellenistic
  block is masked (`maskPlaceDependentHellenistic`: lots, ZR and almuten empty,
  no aspects to the angles, no aspect-end houses, Chiron/Lilith house unknown).
- Calendar engine: `buildCalendar` drops `isPlaceDependentSignal` signals
  (house transits, angle contacts, profection, zodiacal releasing, arabic parts,
  and any signal whose target is an angle) before the cross post-pass, and the
  natal context empties lots, ZR and the almuten.
- Calendar view: `toUser`, the lifetime flow and the hour crossings skip the
  rising sign, MC and house personalisation.
- Report: the integrated report hides houses, ASC/MC, lots, almuten and aspect
  houses, and the identity axis gets no almuten winner.
- Counselor context: no house / ASC / MC claims and no profection line.

**Sect is not fabricated either (OD-5).** With an unknown birth time the sect is
`null` everywhere (`astroFacts.hellenistic.sect`, `NatalContext.astro.sect`, the
calendar user card, the report): the noon anchor would make almost every such
chart diurnal. With a known time and an unknown birth city the sect stays (Sun
altitude at the zone reference point) unless `|altitude| < 3°`
(`SECT_HORIZON_MARGIN_DEG`), then it is `null`. A `null` sect means: triplicity
counts only the participating ruler (`triplicityOf(…, null)`), lot and ZR
extractors emit nothing, the report omits the yin-yang cross row (like the social
role row without an MC) and shows no day/night label.

Without coordinates, callers use the birth zone's reference point
(`defaultLatitudeFor` / `defaultLongitudeFor(tz)`), never Seoul's for a
non-Korean zone.

## 7. Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run ops:destiny:release` (typecheck + the real-ephemeris release gate:
  engine goldens, report cross-row pins, calendar digest)
- `npm run docs:sync:check` — the generated blocks in this file (§4 cross
  doctrine) and `docs/doctrine/calculation-standards.md` match the code; it also
  fails when a `CALCULATION_STANDARDS` key has no reader in `src/`.
- Goldens: `tests/golden/*.test.ts` (independent references: astronomy-engine
  solar terms, JDN day pillar, mean solar time, astronomy-engine positions).
