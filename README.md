# DestinyPal

Last audited: 2026-04-08 (Asia/Hong_Kong)

DestinyPal is a Next.js App Router application for saju, astrology, tarot, counseling, calendar guidance, and premium reporting, with a Python backend for GraphRAG and cross-domain reasoning.

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

5. Start Python backend.

```bash
cd backend_ai
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python main.py
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
- `AI_BACKEND_URL`

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

Verified in the current workspace on 2026-04-08:

- `python scripts/self_check.py`
  - overall `PASS`
- `npx tsc -p tsconfig.json --noEmit`
  - passed
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=ko`
  - `PASS=5 WARN=0 FAIL=0`
- targeted regression bundle
  - `226 passed, 1 skipped`
  - includes report, counselor chat-stream, calendar, action-plan, tarot interpret, life-prediction explain-results, premium-reports result page, and engine contract coverage
- `tests/lib/destiny-matrix/ai-report/aiReportService.test.ts`
  - `24 passed, 1 skipped`

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
