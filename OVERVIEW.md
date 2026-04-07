# System Overview

Last audited: 2026-04-01 (Asia/Hong_Kong)

## Current Stack

- Web and API: Next.js App Router + TypeScript (`src/app`, `src/lib`)
- Database: Prisma + PostgreSQL (`prisma/schema.prisma`)
- AI backend: Python service (`backend_ai/main.py` -> `backend_ai/app/app.py`)
- Retrieval substrate: Chroma-backed GraphRAG and cross-reasoning pipelines (`backend_ai/app/rag`)

## Runtime Topology

```text
Browser
  -> Next.js UI
  -> Next.js API routes
      -> Prisma/PostgreSQL
      -> Python backend_ai
          -> Chroma collections
              - saju_astro_graph_nodes_v1
              - saju_astro_cross_v1
      -> Product outputs
          - SSE chat and counselor responses
          - deterministic destiny-core outputs
          - calendar guidance payloads
          - premium reports and PDF assets
```

## Destiny Stack In The Current System

The destiny stack is now a core-first system, not just a matrix calculator.

Runtime order:

- `Raw Input -> Feature -> Rule -> Pattern -> Scenario -> Verdict -> Evaluation`

Main entrypoints:

- Core judgment: `src/lib/destiny-matrix/core/runDestinyCore.ts`
- Evidence and audit sidecar: `src/lib/destiny-matrix/core/nextGenPipeline.ts`
- GraphRAG evidence builder: `src/lib/destiny-matrix/ai-report/graphRagEvidence.ts`
- Service adapters:
  - `adaptCoreToCalendar(...)`
  - `adaptCoreToCounselor(...)`
  - `adaptCoreToReport(...)`

## Role Split

Current production rule:

- Core: judgment
- GraphRAG: evidence alignment and support
- Calendar / Counselor / Report: presentation

This split is important because it prevents service routes from re-judging the same input in different ways.

## Product Surfaces Using The Destiny Core

### Calendar

- `src/app/api/calendar/route.ts`
- `src/app/api/calendar/action-plan/route.ts`

Calendar uses canonical core output for summary, cautions, recommended actions, and action-plan views.

### Counselor

- `src/app/api/destiny-map/chat-stream/route.ts`
- `src/lib/destiny-matrix/counselorEvidence.ts`

Counselor builds a canonical evidence packet first, then uses GraphRAG and other context as support.

### Report

- `src/lib/destiny-matrix/ai-report/aiReportService.ts`
- `src/app/api/destiny-matrix/ai-report/route.ts`

Premium report generation now uses `reportCore` first and GraphRAG as evidence support.

## Diagnostics And QA

Canonical diagnostics:

- `python scripts/self_check.py`
- `python scripts/self_check.py --runtime-evidence`
- `npx tsx scripts/ops/trace-destinypal-pipeline.ts`
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`

Current verification snapshot on 2026-04-01:

- `python scripts/self_check.py`: overall `PASS`
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`:
  - blocked by a parse error in `src/lib/destiny-matrix/ai-report/aiReportService.ts`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`:
  - overall `PASS=21 WARN=13 FAIL=8`
  - `ko`: `PASS=5 WARN=8 FAIL=8`
  - `en`: `PASS=16 WARN=5 FAIL=0`

## Key Runtime Flags

- `USE_CHROMADB`
- `EXCLUDE_NON_SAJU_ASTRO`
- `RAG_TRACE`
- `AI_BACKEND_URL`
- `DEMO_TOKEN`
- `SUPPORT_EMAIL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

## Demo And SEO Guardrails

- Demo pages and APIs are token-gated (`src/lib/demo/requireDemoToken.ts`)
- Invalid or missing demo token returns `404`
- Robots disallow `/demo/` (`src/app/robots.ts`)

## Reading Order For Engineers

If you need the current truth for the destiny stack, read in this order:

1. `README.md`
2. `docs/DESTINY_MATRIX.md`
3. `docs/RAG_AND_GRAPHRAG.md`
4. `docs/TESTING_AND_GUARDRAILS.md`
5. `docs/CALCULATION_SPEC.md`
