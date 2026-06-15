# Destiny Stack

Last audited: 2026-06-15 (Asia/Hong_Kong)

> Historical note: an earlier `src/lib/destiny-matrix` "10-layer matrix /
> rule / scenario / verdict" engine and its GraphRAG sidecar were removed
> around 2026-06-05. None of that code exists anymore. This document
> describes the current stack as it actually ships.

## What It Is

The destiny stack is a deterministic fact + fusion pipeline that feeds a
streaming LLM counselor. There is no monolithic "core" engine. Instead the
work is split into small, separately testable modules:

1. Deterministic Saju + Astrology calculation (raw structured facts).
2. Cross fusion (Saju ↔ Astrology correspondence lookup).
3. A calendar engine that turns facts into time-windowed signals.
4. Context builders that assemble the facts into a prompt.
5. An LLM layer (`callClaude` / SSE streaming) that produces the answer.

Nothing in the stack invents meaning outside the deterministic layers; the
LLM only narrates the structured context it is handed.

## Module Map

### Deterministic facts

- `src/lib/destiny/sajuFacts.ts` -> `collectSajuFacts()` — runs
  `calculateSajuData()` and returns raw structured Saju facts (pillars,
  strength label, geokguk, yongsin, etc.). No text formatting.
- `src/lib/destiny/astroFacts.ts` -> `collectAstroFacts()` — runs
  `calculateNatalChart()` and returns raw structured natal/timing facts.
  Async, returns `null` on failure.

### Cross fusion

- `src/lib/cross/crossInterpret.ts` -> `lookupCross()`, `crossMeaning()`,
  `rankActiveCrosses()`. Looks up Saju↔Astrology correspondences in the
  mapping table and ranks the active ones.

### Compatibility

- `src/lib/compatibility/compatSajuFacts.ts` -> `collectCompatSajuFacts()` and
  `src/lib/compatibility/compatAstroFacts.ts` -> `collectCompatAstroFacts()`
  collect the two-person facts.
- `src/lib/compatibility/compatReport.ts` -> `buildCompatReport()` fuses the
  synastry view with the saju synastry facts (`calculateSynastry` underneath).
- `src/lib/compatibility/sajuSynastryFormatter.ts` formats the saju synastry
  block.

### Calendar engine

- `src/lib/calendar-engine/index.ts` -> `buildCalendar(natal, range,
options): Promise<CalendarCell[]>`.
- `src/lib/calendar-engine/context/build.ts` -> `buildNatalContext()` builds
  the `NatalContext` the engine consumes.
- Around 25 extractors live in `src/lib/calendar-engine/extractors/`
  (`saju-*`, `astro-*`, and a `cross-activation` post-pass).
- Saju↔Astrology correspondence data: `src/lib/calendar-engine/data/saju-astro-mapping.ts`
  (`SAJU_ASTRO_MAPPINGS`, A/B/C grades, ko/en meanings).
- The calendar is rendered server-side at `src/app/calendar/page.tsx` via
  `src/app/calendar/assembleTiers.ts`. There is no `/api/calendar` route.

### Counselor context

- `src/lib/destiny/counselorContext.ts` -> `buildDestinyContext(birth, now,
locale, displayTz?): Promise<{ stable, daily }>` assembles the natal
  ("stable") and timing ("daily") prompt sections.
- `src/lib/destiny/counselorContextCache.ts` -> `ensureCounselorContext()`
  caches both halves in Redis (stable keyed by birth fingerprint, daily
  keyed additionally by local date).

### LLM

- `src/lib/llm/claude.ts` -> `callClaude()`, `callClaudeStream()`,
  `isClaudeAvailable()`.
- `src/lib/llm/claudeSSE.ts` -> `streamClaudeAsSSE()`.
- `src/lib/llm/claudeWithContinuation.ts` -> `streamClaudeWithContinuation()`
  (auto-continues when `maxTokens` is hit).
- Default model `claude-haiku-4-5-20251001`; premium/long-form
  `claude-sonnet-4-5-20250929`. Prompt caching uses ephemeral (~1h) blocks.

### Prompts

- `src/lib/prompts/destinyCounselorPrompt.ts` -> `buildDestinyCounselorPrompt(lang)`.
- `src/lib/prompts/compatibilityCounselorPrompt.ts` -> `buildCompatibilityCounselorPrompt(lang)`.

## Service Wiring

### Counselor

- Route: `src/app/api/counselor/realtime/route.ts` (POST, SSE). Billed
  1 credit per message. Flow: auth + rate-limit + credit pre-check ->
  `ensureCounselorContext()` -> `buildDestinyCounselorPrompt()` ->
  `streamClaudeAsSSE()`. Credit is consumed just before the stream starts and
  refunded once on failure.
- `src/app/api/counselor/warm/route.ts` pre-warms the context cache under the
  same key when the user enters the chat.
- Session persistence: `src/app/api/counselor/session/{save,load,list}/route.ts`.
- Recovery (in case the SSE stream drops): `src/app/api/counselor/realtime/result/route.ts`.

### Compatibility counselor

- Route: `src/app/api/compatibility/counselor/route.ts` (POST, SSE). Collects
  compat saju/astro facts -> `buildCompatibilityCounselorPrompt()` ->
  `streamClaudeAsSSE()`, with credit consume + refund-once like the destiny
  counselor. Recovery: `src/app/api/compatibility/counselor/result/route.ts` (GET).

### Tarot

- Route: `src/app/api/tarot/interpret-stream/route.ts` (POST, SSE), with
  recovery at `src/app/api/tarot/interpret-stream/result/route.ts`.

### Calendar

- Rendered server-side via `src/app/calendar/page.tsx` ->
  `assembleTiers()`. `assembleTiers` consumes `CalendarCell[]` produced by
  `buildCalendar()` and assembles lifetime/decade/year/month/day tiers using
  the calendar-engine derivers.

### Report

- `src/lib/report/local-report-generator.ts` -> `generateChartSummary()`.
- `src/lib/report/natalCross.ts` provides natal Saju↔Astrology cross
  synthesis helpers.
- Integrated report page: `src/app/(main)/integrated-report/page.tsx` ->
  `buildReportContext()`.

## Verification

There are no destiny-specific QA scripts referenced by this stack anymore.
Verify changes with:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run ops:destiny:release` (typecheck + the integrated-report release
  tests)
