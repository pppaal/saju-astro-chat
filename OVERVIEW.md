# System Overview

Last audited: 2026-06-15 (Asia/Hong_Kong)

## Current Stack

- Web and API: Next.js App Router + TypeScript (`src/app`, `src/lib`)
- Database: Prisma + PostgreSQL (`prisma/schema.prisma`)
- AI: Claude via the Anthropic Messages API, called over raw HTTP (`fetch`) from
  Next.js API routes and streamed over SSE — no `@anthropic-ai/sdk`, no separate
  Python backend

## Runtime Topology

```text
Browser
  -> Next.js UI (App Router, server + client components)
  -> Next.js API routes
      -> Prisma / PostgreSQL
      -> Upstash Redis (cache + rate limit, with in-memory fallback)
      -> Claude (Anthropic Messages API over HTTP)
      -> Product outputs
          - deterministic Saju + astrology facts
          - calendar guidance (server-rendered)
          - SSE counselor / compatibility / tarot responses
```

## Destiny Stack In The Current System

There is no monolithic "destiny core". The system is built from two deterministic
calculation cores, a fact layer, a cross/fusion layer, and per-surface presenters.

Computation order for a request:

- `Birth data -> Saju core + Astrology core -> Facts -> Cross/fusion -> Surface presenter -> (optional) Claude prose`

Main entry points:

- Saju core: `src/lib/saju/saju.ts` (`calculateSajuData`)
- Astrology core: `src/lib/astrology/foundation/astrologyService.ts` (`calculateNatalChart`)
- Deterministic facts: `src/lib/destiny/sajuFacts.ts` (`collectSajuFacts`), `src/lib/destiny/astroFacts.ts` (`collectAstroFacts`)
- Saju ↔ astrology fusion: `src/lib/cross/crossInterpret.ts` (`lookupCross`, `crossMeaning`, `rankActiveCrosses`)
- Calendar engine: `src/lib/calendar-engine/index.ts` (`buildCalendar`) over `src/lib/calendar-engine/context/build.ts` (`buildNatalContext`)
- Destiny counselor context: `src/lib/destiny/counselorContext.ts` (`buildDestinyContext`), cached by `src/lib/destiny/counselorContextCache.ts` (`ensureCounselorContext`)
- Compatibility report: `src/lib/compatibility/compatReport.ts` (`buildCompatReport`)
- Report summary: `src/lib/report/local-report-generator.ts` (`generateChartSummary`)
- LLM streaming: `src/lib/llm/claude.ts` (`callClaude`, `callClaudeStream`) and `src/lib/llm/claudeSSE.ts` (`streamClaudeAsSSE`)

## Role Split

- Saju core: structural flow, element balance, long-cycle (대운/세운/월운/일진) pressure.
- Astrology core: natal chart, transits, returns, progressions, timing windows.
- Facts + cross layer: turn both cores into structured, deterministic facts and
  fuse them into shared meanings (`SAJU_ASTRO_MAPPINGS`).
- Calendar / counselor / compatibility / report: presentation only. They format,
  shape tone, and (for conversational surfaces) hand the facts to Claude for prose.

This split keeps surfaces from re-judging the same input differently: the same
birth data yields the same deterministic facts everywhere.

## Product Surfaces

### Calendar

- Server page: `src/app/calendar/page.tsx`
- Tier assembly: `src/app/calendar/assembleTiers.ts`
- Engine: `src/lib/calendar-engine/index.ts` (`buildCalendar`)

The calendar is rendered server-side from `buildCalendar` output (day/month/hour
tiers). There is no dedicated `/api/calendar` route.

### Destiny counselor

- API route: `src/app/api/counselor/realtime/route.ts` (POST, SSE)
- Context preload: `src/app/api/counselor/warm/route.ts`
- Session persistence: `src/app/api/counselor/session/{save,load,list}/route.ts`
- Prompt: `src/lib/prompts/destinyCounselorPrompt.ts` (`buildDestinyCounselorPrompt`)

The counselor builds (and caches) a stable + daily context via
`ensureCounselorContext`, assembles the system prompt, then streams Claude over
SSE. Billed per message; failed/empty streams auto-refund the charged credit.

### Compatibility counselor

- API route: `src/app/api/compatibility/counselor/route.ts` (POST, SSE)
- Result recovery: `src/app/api/compatibility/counselor/result/route.ts` (GET)
- Builders: `compatSajuFacts.ts`, `compatAstroFacts.ts`, `compatReport.ts`
- Prompt: `src/lib/prompts/compatibilityCounselorPrompt.ts`

### Tarot

- API route: `src/app/api/tarot/interpret-stream/route.ts` (POST, SSE)
- Result recovery: `src/app/api/tarot/interpret-stream/result/route.ts` (GET)

Long-form surfaces (compatibility, tarot) use
`src/lib/llm/claudeWithContinuation.ts` (`streamClaudeWithContinuation`) to
auto-continue when the model hits `max_tokens`.

## LLM Models

- Default: `claude-haiku-4-5-20251001` (fast, cheap path)
- Premium / long-form: `claude-sonnet-4-5-20250929`
- Prompt caching: system prompt + stable user context are cached (ephemeral, ~1h TTL)

## Verifying The Current State

Run against the same revision rather than trusting any cached snapshot:

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # vitest run (full suite)
```

The destiny release gate is `npm run ops:destiny:release`
(`typecheck` + `test:destiny:release`). See `docs/TESTING_AND_GUARDRAILS.md`
for the full set of CI gates and determinism goldens. (Note: some older
`scripts/ops/qa-*.ts` scripts still import the removed destiny-matrix engine and
do not run — they are not part of any gate.)

## Key Runtime Flags

- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_FAIL_CLOSED` (deny when Redis is down; recommended for multi-instance)

See `.env.example` for the full list.

## Removed / Superseded

The following were part of an older "destiny-matrix" engine and have been removed.
Docs that referenced them have been rewritten or archived:

- `src/lib/destiny-matrix/*` (`runDestinyCore`, `buildCoreEnvelope`, `canonical`,
  `adapters`, `nextGenPipeline`, `counselorEvidence`, etc.)
- GraphRAG evidence (`graphRagEvidence`)
- Premium/themed AI report service (`ai-report/aiReportService`) and PDF report generation
- Routes `/api/calendar`, `/api/destiny-map`, `/api/destiny-matrix`

## Reading Order For Engineers

1. `README.md`
2. `docs/DESTINY_ENGINE_ARCHITECTURE.md`
3. `docs/CALCULATION_SPEC.md`
4. `docs/TESTING_AND_GUARDRAILS.md`
