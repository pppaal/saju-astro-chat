# System Overview

Last audited: 2026-02-15 (Asia/Seoul)

## Current Stack

- Web/API: Next.js App Router + TypeScript (`src/app`, `src/lib`)
- Database: Prisma + PostgreSQL (`prisma/schema.prisma`)
- AI backend: Python service entry (`backend_ai/main.py` -> `backend_ai/app/app.py`)
- Retrieval: Chroma-backed GraphRAG/cross pipelines (`backend_ai/app/rag`)

## Runtime Architecture

```text
Browser
  -> Next.js UI
  -> Next.js API routes
      -> Prisma/PostgreSQL
      -> Python backend_ai (RAG, cross reasoning, streaming)
          -> Chroma collections
              - saju_astro_graph_nodes_v1
              - saju_astro_cross_v1
      -> Outputs
          - SSE chat/counseling responses
          - deterministic destiny-matrix summaries
          - generated PDF reports
```

## Key Runtime Flags

- `USE_CHROMADB`
- `EXCLUDE_NON_SAJU_ASTRO`
- `RAG_TRACE`
- `AI_BACKEND_URL`
- `DEMO_TOKEN`
- `SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_EMAIL`

## Destiny Matrix Integration

- Core engine: `src/lib/destiny-matrix`
- Main API route: `src/app/api/destiny-matrix/route.ts`
- Save/report routes: `src/app/api/destiny-matrix/save/route.ts`, `src/app/api/destiny-matrix/report/route.ts`
- Counselor context usage: `src/app/api/destiny-map/chat-stream/route.ts`

## Demo And SEO Guardrails

- Demo pages and APIs are token-gated (`src/lib/demo/requireDemoToken.ts`)
- Invalid/missing demo token returns `404`
- Robots disallow `/demo/` (`src/app/robots.ts`)

## Canonical Diagnostics

- `python scripts/self_check.py`
- `npm run audit:api`
- `npm run docs:stats`
