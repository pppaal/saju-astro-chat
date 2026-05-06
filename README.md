# DestinyPal

Last audited: 2026-05-06 (Asia/Hong_Kong)

DestinyPal is a Next.js App Router application for saju, astrology, tarot, counseling, calendar guidance, and premium reporting. AI calls go through `@anthropic-ai/sdk` directly from Next.js routes.

## Quick Start

1. Install dependencies.

```bash
npm ci
```

2. Create local env file.

```bash
cp .env.example .env.local
```

3. Run database migrations.

```bash
npm run db:migrate
```

4. Start web app.

```bash
npm run dev
```

## Required Environment Variables

Minimum local setup:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `PUBLIC_API_TOKEN`
- `ADMIN_API_TOKEN`
- `CRON_SECRET`
- `ANTHROPIC_API_KEY`

Production also needs Stripe, Redis, and webhook configuration. See `BUILD_INSTRUCTIONS.md` and `.env.example`.

## Repository Snapshot

Measured with `npm run docs:stats` on 2026-04-01:

- API routes: `140`
- App pages: `82`
- Component files: `608`
- Prisma models: `42`
- Test files (`*.test|*.spec`): `1157`
- Markdown docs: `327`
- `.env.example` variables: `78`

## Current Destiny Engine Status

The deterministic destiny stack is now organized as:

- `Raw Input -> Feature -> Rule -> Pattern -> Scenario -> Verdict -> Evaluation`
- Core judgment entry: `src/lib/destiny-matrix/core/runDestinyCore.ts`
- Evidence/audit sidecar: `src/lib/destiny-matrix/core/nextGenPipeline.ts`
- Presentation adapters:
  - `adaptCoreToCalendar(...)`
  - `adaptCoreToCounselor(...)`
  - `adaptCoreToReport(...)`

Role split:

- Core: judgment and timing decisions
- GraphRAG: evidence alignment and cross-source grounding
- Calendar / Counselor / Report: presentation only

Runtime logging strategy:

- Use `UserInteraction` with a normalized destiny metadata envelope
- Shared metadata builder: `src/lib/destiny-matrix/core/logging.ts`

Honest technical assessment:

- This is no longer a prototype or prompt wrapper. It has a real deterministic judgment core, shared service adapters, and product-level QA.
- The strongest technical asset is the common destiny-core surface reused by calendar, counselor, and premium reports.
- The largest remaining weaknesses are output-layer consistency, release hygiene, and keeping orchestration files from growing back.
- Current position: strong builder-grade product and strong portfolio project. Not yet an operationally mature "unicorn-grade" codebase.

## Current QA Snapshot

Verified in the current workspace on 2026-05-06:

- `npx tsc -p tsconfig.json --noEmit`: passed (0 errors)
- `npm run lint`: passed (0 errors)
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`: `PASS=10 WARN=0 FAIL=0`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`: `PASS=42 WARN=0 FAIL=0`
- `npm run docs:check-links`: passed (8 files)

Practical release command:

- `npm run ops:destiny:release`
  - runs `typecheck`
  - runs the targeted destiny regression bundle
  - runs `qa-destiny-three-services` in Korean mode

Important nuance:

- The repo is green on `tsc`, targeted regression suites, and the destiny three-service QA.
- Do not claim "full-suite green" unless the entire Vitest matrix has been rerun in the same revision window.

## Documentation Map

Start with:

- `docs/README.md`: canonical documentation hub
- `docs/DESTINY_MATRIX.md`: current destiny engine architecture and service wiring
- `docs/RAG_AND_GRAPHRAG.md`: GraphRAG role, domains, and evidence flow
- `docs/TESTING_AND_GUARDRAILS.md`: required checks and destiny QA scripts
- `docs/CALCULATION_SPEC.md`: code-derived current calculation spec for the modern pipeline

API route audit snapshot from `npm run audit:api` on 2026-04-01:

- Total routes: `140`
- Uses middleware/guards: `138` (98.6%)
- Validation signals: `114` (81.4%)
- Rate limited: `131` (93.6%)
