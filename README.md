# DestinyPal

DestinyPal is a Next.js App Router application for saju/astrology/tarot counseling with a Python AI backend for GraphRAG and cross-domain reasoning.

## Golden Path (10 minutes)

1. Install dependencies.

```bash
npm install
```

2. Create local env file.

```bash
cp .env.example .env.local
```

Set required values only (no secrets in docs): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AI_BACKEND_URL`.  
Optional but recommended for current features: `DEMO_TOKEN`, `SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_EMAIL`.

3. Run Prisma migrations.

```bash
npm run db:migrate
```

4. Start web app.

```bash
npm run dev
```

5. Start Python backend (`backend_ai`).

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

6. Run canonical diagnostics (`PASS` expected).

```bash
cd ..
python scripts/self_check.py
```

7. Generate the fixed 10-page life report PDF.

```bash
python scripts/generate_life_report_pdf.py --out out/life_report.pdf
```

Notes:

- `scripts/generate_life_report_pdf.py` calls `/api/destiny-matrix`; keep the Next.js server running.
- If PDF dependencies are missing, install `reportlab`, `matplotlib`, and `pypdf` in the backend virtualenv.

## What's Unique

- Deterministic **Destiny Matrix** (`src/lib/destiny-matrix`): 10-layer, structured scoring/profile system used in UI, counselor context, and reporting.
- Evidence-first **GraphRAG + cross_store** (`backend_ai/app/rag`):
  - Chroma collections: `saju_astro_graph_nodes_v1`, `saju_astro_cross_v1`
  - Domain filtering for saju/astro-only retrieval
  - Cross summaries grouped by theme/axis with evidence refs and backfill fallback

## Architecture

- Next.js App Router (`src/app`) serves UI + API routes.
- Prisma + PostgreSQL for persistence (`prisma/schema.prisma`).
- Python backend (`backend_ai/main.py`) provides RAG, cross reasoning, and streaming analysis.
- Chroma persistence path: `backend_ai/data/chromadb`.
- Reporting pipeline:
  - Collector: `scripts/generate_life_report_pdf.py`
  - Renderer: `backend_ai/reporting/saju_astro_life_report.py`

See `OVERVIEW.md` for system-level details.

## How To Validate

### Required checks (pre-merge baseline)

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e:smoke:public
npx vitest run tests/i18n/pricing-keys-required.test.ts
python scripts/self_check.py
```

Expected diagnostic outcome: `self_check.py` should end with overall `PASS`.

### Optional checks (broader regression)

```bash
npm test
npm run test:e2e:browser
npm run test:backend
```

Note: the full suites are larger and may include pre-existing failures unrelated to your current change. Treat required checks above as the release gate unless you are actively fixing legacy test debt.

## Canonical Docs

- `README.md` (this file)
- `OVERVIEW.md`
- `docs/README.md`
- `docs/*.md` (runbooks, AI, matrix, reporting, QA guardrails)

Historical reports (`FINAL_*`, `*_REPORT.md`, etc.) are intentionally retained as archival context and are not the source of truth for current operations.
