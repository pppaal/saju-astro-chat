# System Overview

## Current Stack

- Web/API: Next.js App Router + TypeScript (`src/app`, `src/lib`)
- Database: Prisma + PostgreSQL (`prisma/schema.prisma`)
- AI backend: Python Flask-style service entry (`backend_ai/main.py`)
- Retrieval: Chroma-backed GraphRAG/cross pipelines (`backend_ai/app/rag`)

## Runtime Architecture

```text
Browser
  -> Next.js App Router UI
  -> Next.js API routes
      -> Prisma/PostgreSQL
      -> Python backend_ai (RAG, cross reasoning, streaming)
          -> Chroma collections
              - saju_astro_graph_nodes_v1
              - saju_astro_cross_v1
      -> Outputs
          - streaming counselor responses
          - deterministic destiny-matrix summaries
          - 10-page PDF reports
```

## Data Assets

- Graph/cross source data: `backend_ai/data/graph/*`
  - Notable groups: `saju`, `astro`, `cross_analysis`, `cross_system_mapping.json`
- Chroma storage: `backend_ai/data/chromadb`
- Report output examples: `out/` (generated artifacts)

## Retrieval Model

- Graph collection: `saju_astro_graph_nodes_v1`
  - Domain filter: `domain = saju_astro`
- Cross collection: `saju_astro_cross_v1`
  - Domain filter: `domain = saju_astro_cross`
- Cross summaries (`backend_ai/app/rag/cross_store.py`):
  - rank -> group by axis/theme -> output 1-3 summaries
  - include evidence pairs (`saju_refs`, `astro_refs`)
  - backfill refs from graph hits when missing

## Key Runtime Flags

- `USE_CHROMADB`: enable Chroma retrieval path
- `EXCLUDE_NON_SAJU_ASTRO`: restrict to saju/astro retrieval, skip unrelated corpora
- `RAG_TRACE`: emit detailed retrieval trace logs
- `AI_BACKEND_URL`: Next.js -> Python backend base URL
- `DEMO_TOKEN`: required for token-protected `/demo` and `/api/demo/*`
- `SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_EMAIL`: support contact fallback chain

## Destiny Matrix Integration

- Deterministic engine in `src/lib/destiny-matrix` (10 layers).
- Public page route: `/destiny-map/matrix`
- Redirect guard: `/destiny-matrix` -> `/destiny-map/matrix`
- Counselor integration: matrix snapshot prepended in `src/app/api/destiny-map/chat-stream/route.ts`.
- PDF integration: matrix snapshot + layer bar chart in `scripts/generate_life_report_pdf.py` and `backend_ai/reporting/saju_astro_life_report.py`.

## Demo/SEO Guardrails

- Demo routes are token-protected and return `404` on invalid token.
- Middleware bypasses additional checks for `/demo` and `/api/demo` paths; route handlers enforce token validation.
- Robots excludes `/demo/` via `src/app/robots.ts`.

## Canonical Diagnostic

- `scripts/self_check.py` is the canonical PASS/WARN/FAIL health + leak + quality diagnostic.
