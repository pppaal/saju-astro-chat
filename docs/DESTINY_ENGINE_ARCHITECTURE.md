# Destiny Engine Architecture

Last audited: 2026-06-15 (Asia/Hong_Kong)

> Historical note: an earlier `src/lib/destiny-matrix` engine (the
> "Feature -> Rule -> Pattern -> Scenario -> Verdict -> Evaluation" matrix
> core, `runDestinyCore`, canonical/adapter layers, typed snapshots, the
> GraphRAG sidecar, and the premium themed AI report) was removed around
> 2026-06-05. None of that code exists anymore. The routes `/api/destiny-map`,
> `/api/destiny-matrix`, and `/api/calendar` were removed with it. This
> document describes the architecture that actually ships today.

## 1. System overview

There is no monolithic "core" engine. The destiny stack is a set of small,
separately testable deterministic modules that feed streaming LLM surfaces:

1. Deterministic calculation — Saju core and Astrology core produce raw
   structured facts.
2. Cross fusion — Saju <-> Astrology correspondences are looked up and ranked.
3. Calendar engine — facts become time-windowed signals, cells, and patterns.
4. Context builders — facts/signals are assembled into prompt text.
5. LLM layer — Claude narrates the structured context (counselor, compatibility,
   tarot) and produces the streamed answer.

The deterministic layers own all meaning. The LLM only narrates the structured
context it is handed; it does not compute astrology or saju.

## 2. Deterministic calculation

### Saju core

- Entry: `src/lib/saju/saju.ts` -> `calculateSajuData(birthDate, birthTime,
gender, calendarType, timezone, lunarLeap?, longitude?)`. Returns
  `CalculateSajuDataResult` (four pillars, `daeWoon`, `unse`, `fiveElements`,
  etc.). Internally LRU-cached.
- Barrel `src/lib/saju/index.ts` re-exports the analysis helpers:
  `analyzeStrength` (`tonggeun.ts`), `determineGeokguk` (`geokguk.ts`),
  `determineYongsin` (`yongsin.ts`), `getTwelveStagesForPillars` and
  `annotateShinsal` (`shinsal.ts`), `analyzeRelations` (`relations.ts`), and
  the cycle helpers `getDaeunCycles` / `getAnnualCycles` / `getMonthlyCycles` /
  `getIljinCalendar` (`unse.ts`).
- Supporting data/util: `constants.ts`, `tonggeun.ts`, `dayPillar.ts`,
  `cycles.ts`, `johuYongsin.ts`.

### Astrology core

- Entry: `src/lib/astrology/foundation/astrologyService.ts` ->
  `calculateNatalChart(input): Promise<NatalChartData>` and
  `toChart(natal): Chart`.
- Aspects: `aspects.ts` (`findNatalAspects`, etc.). Houses: `houses.ts`.
  Extra points: `extraPoints.ts`. Dignities: `dignities.ts`.
- Advanced techniques live in sibling files:
  `calculateSecondaryProgressions` (`progressions.ts`),
  `calculateSolarReturn` / `calculateLunarReturn` (`returns.ts`),
  `calculateComposite` (`composite.ts`), `calculateSynastry` (`synastry.ts`),
  plus profections, zodiacal releasing, eclipses, fixed stars, midpoints,
  arabic parts, almuten figuris.

## 3. Deterministic facts (the SSOT)

The fact collectors are the single source of truth that downstream surfaces
read from. They return raw structured JSON with no text formatting.

- `src/lib/destiny/sajuFacts.ts` -> `collectSajuFacts(input): SajuFacts`.
  Runs `calculateSajuData()` and flattens it into `SajuFacts`: `pillars`,
  `dayMaster` (with `rooted`/통근), `fiveElements`, `strength` (신강/신약 label),
  `geokguk`, `yongsin`, `relations`, `gwansalHonjap`, `daeun`, `johuYongsin`,
  `gongmang`, plus a `_raw` escape hatch carrying the original
  `calculateSajuData` result.
- `src/lib/destiny/astroFacts.ts` -> `collectAstroFacts(input, now?):
Promise<AstroFacts | null>`. Runs `calculateNatalChart()` and returns
  `natal` (planets, ascendant, mc, `placeUnreliable`), `aspects` split into
  `strong` (orb 0-2 deg) / `mid` (orb 2-5 deg), `profection`, and (when
  `includeHellenistic` is set) the richer Hellenistic dataset. Returns `null`
  on failure.

`placeUnreliable` (driven by `birthTimeUnknown` / `birthCityUnknown`) is the
defense-in-depth flag that stops downstream surfaces citing house/ASC/MC when
the chart cannot be trusted.

## 4. Cross fusion

- `src/lib/cross/crossInterpret.ts` -> `lookupCross(saju, astro)`,
  `crossMeaning(saju, astro, lang)`, `rankActiveCrosses(...)`. Looks up
  Saju <-> Astrology correspondences and ranks the active ones.
- The correspondence dictionary used by the calendar engine lives at
  `src/lib/calendar-engine/data/saju-astro-mapping.ts` (`SAJU_ASTRO_MAPPINGS`,
  `CrossMapping` with A/B/C grade and ko/en meanings). It maps a saju side key
  (ten-god or shinsal name) to a single planet name.
- Natal cross synthesis for the report lives at
  `src/lib/report/natalCross.ts`.

## 5. Calendar engine

- Entry: `src/lib/calendar-engine/index.ts` -> `buildCalendar(natal, range,
options): Promise<CalendarCell[]>`.
- `src/lib/calendar-engine/context/build.ts` -> `buildNatalContext(input,
preComputed?)` builds the `NatalContext` the engine consumes. It reuses
  `collectSajuFacts()` (via the `_raw` escape hatch) so all raw saju goes
  through the same fact processor.
- Around 25 extractors live in `src/lib/calendar-engine/extractors/`
  (`saju-*`, `astro-*`). `buildCalendar` runs them in parallel, flattens
  signals, then runs the `cross-activation` post-pass that synthesizes
  Saju x Astrology co-active pairs from `SAJU_ASTRO_MAPPINGS`.
- Signal model (`src/lib/calendar-engine/types.ts`):
  - `ActiveSignal` — `id`, `source`, `kind`, `name`, ko/en meaning,
    `polarity` (-3..+3), `layer` (time scale), `active` window, `weight`
    (0..1), and `evidence`.
  - `CalendarCell` — a `(datetime)` bucket holding all active signals plus
    derived values: `derivedScore` (0..100 favorability), `salience`
    (how notable the day is, orthogonal to favorability), `matchedPatterns`,
    and `topReasons` / `cautions` (+ `*En`).
- Rendered server-side: `src/app/calendar/page.tsx` ->
  `src/app/calendar/assembleTiers.ts` (`assembleTiers`) consumes
  `CalendarCell[]` and assembles lifetime/decade/year/month/day tiers using
  the calendar-engine derivers. There is **no** `/api/calendar` route.

## 6. Context builders

### Counselor context

- `src/lib/destiny/counselorContext.ts` -> `buildDestinyContext(birth, now,
locale, displayTz?): Promise<DestinyContextSplit>` (`{ stable, daily }`).
  `stable` = birth header + natal saju + natal astrology (cache once per birth
  fingerprint). `daily` = timing (daeun/saeun/transits/profection) + iljin
  window anchored to "today" in the user's timezone (rotates daily).
- `src/lib/destiny/counselorContextCache.ts` -> `ensureCounselorContext(body,
userId, lang): Promise<{ stableContext, dailyContext }>`. Caches both halves
  in Redis — stable keyed by birth fingerprint, daily keyed additionally by
  local date.

### Compatibility facts and report

- `src/lib/compatibility/compatSajuFacts.ts` -> `collectCompatSajuFacts()`.
- `src/lib/compatibility/compatAstroFacts.ts` -> `collectCompatAstroFacts()`.
- `src/lib/compatibility/compatReport.ts` -> `buildCompatReport()` (uses the
  synastry view + saju synastry facts; `calculateSynastry` underneath).
- `src/lib/compatibility/sajuSynastryFormatter.ts` formats the saju synastry
  block for prompts/UI.

### Report context

- `src/lib/report/local-report-generator.ts` -> `generateChartSummary(saju,
astro, lang)` builds the deterministic chart summary text.
- Integrated report page: `src/app/(main)/integrated-report/page.tsx` +
  `buildReportContext.ts`.

## 7. LLM layer

- `src/lib/llm/claude.ts` -> `callClaude()`, `callClaudeStream()`,
  `isClaudeAvailable()`.
- `src/lib/llm/claudeSSE.ts` -> `streamClaudeAsSSE()` (counselor/compatibility
  SSE responses).
- `src/lib/llm/claudeWithContinuation.ts` -> `streamClaudeWithContinuation()`
  (auto-continues when `maxTokens` is hit).
- Models: default `claude-haiku-4-5-20251001`; premium/long-form
  `claude-sonnet-4-5-20250929`. Prompt caching uses ephemeral (~1h) blocks.

### Prompts

- `src/lib/prompts/destinyCounselorPrompt.ts` ->
  `buildDestinyCounselorPrompt(lang)`.
- `src/lib/prompts/compatibilityCounselorPrompt.ts` ->
  `buildCompatibilityCounselorPrompt(lang)`.

## 8. Service wiring (real routes)

### Destiny counselor

- `src/app/api/counselor/realtime/route.ts` (POST, SSE). Billed 1 credit per
  message. Flow: auth + rate-limit + credit pre-check ->
  `ensureCounselorContext()` -> `buildDestinyCounselorPrompt()` ->
  `streamClaudeAsSSE()`. The credit is consumed just before the stream starts
  and refunded once on failure.
- `src/app/api/counselor/warm/route.ts` pre-warms the context cache under the
  same key when the user enters the chat.
- `src/app/api/counselor/realtime/result/route.ts` recovers the answer if the
  SSE stream drops.
- Session persistence: `src/app/api/counselor/session/{save,load,list}/route.ts`.

### Compatibility counselor

- `src/app/api/compatibility/counselor/route.ts` (POST, SSE). Builds compat
  saju/astro facts, then `buildCompatibilityCounselorPrompt()` ->
  `streamClaudeAsSSE()`; credit consume + refund-once like the destiny
  counselor.
- `src/app/api/compatibility/counselor/result/route.ts` (GET) recovers the
  result.

### Tarot

- `src/app/api/tarot/interpret-stream/route.ts` (POST, SSE) +
  `result/route.ts`. Streams Claude token deltas straight through as SSE.

### Calendar

- Server-rendered only via `src/app/calendar/page.tsx` -> `assembleTiers()`.
  No API route.

### Report

- Server-rendered via `src/app/(main)/integrated-report/page.tsx` ->
  `buildReportContext()` -> `generateChartSummary()`. No premium themed AI
  report, no PDF generation.

## 9. Design principles

- Deterministic facts are the single source of truth; the LLM never invents
  saju/astrology values.
- `collectSajuFacts` / `collectAstroFacts` are the funnel — counselor,
  compatibility, calendar, and report all read from the same fact shape rather
  than recomputing.
- Unreliable birth data (`placeUnreliable`) is propagated so surfaces suppress
  house/timing claims they cannot support.

## 10. Verification

There is no destiny-specific QA script in this stack anymore. Verify changes
with:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run ops:destiny:release` (typecheck + the integrated-report release
  tests)
