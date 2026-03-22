# DestinyPal

Last audited: 2026-03-17 (Asia/Hong_Kong)

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

Measured with `npm run docs:stats` on 2026-02-15 (Asia/Seoul):

- API routes: `145`
- App pages: `83`
- Component files: `594`
- Prisma models: `42`
- Test files (`*.test|*.spec`): `1073`
- Markdown docs: `154`
- `.env.example` variables: `79`

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

## Current QA Baseline

Destiny engine and product sync checks as of 2026-03-17:

- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`
  - `PASS=10 WARN=0 FAIL=0`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`
  - `PASS=42 WARN=0 FAIL=0`
- Core quality status:
  - `core_quality_warning_count=0`
  - `core_quality_pass=1`

## Documentation Map

Start with:

- `docs/README.md`: canonical documentation hub
- `docs/DESTINY_MATRIX.md`: current destiny engine architecture and service wiring
- `docs/RAG_AND_GRAPHRAG.md`: GraphRAG role, domains, and evidence flow
- `docs/TESTING_AND_GUARDRAILS.md`: required checks and destiny QA scripts
- `docs/CALCULATION_SPEC.md`: code-derived current calculation spec for the modern pipeline

API route audit baseline from `npm run audit:api`:

- Total routes: `145`
- Uses middleware/guards: `136` (93.8%)
- Validation signals: `113` (77.9%)
- Rate limited: `129` (89.0%)

