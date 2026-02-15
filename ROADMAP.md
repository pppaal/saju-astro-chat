# Development Roadmap

Last audited: 2026-02-15 (Asia/Seoul)

This roadmap is a planning document. It is not a source of truth for current implementation status.

## Current Baseline (verified)

- Core app stack: Next.js + Prisma + Python AI backend
- Deterministic matrix engine: `src/lib/destiny-matrix`
- Graph retrieval stack: `backend_ai/app/rag`
- API routes (current): 145 (`npm run audit:api`)

## 2026 Priorities

1. Reliability and quality gates

- Keep `lint`, `typecheck`, `build`, and public smoke tests green
- Reduce known failing legacy test debt in targeted suites

2. Security standardization

- Continue middleware/validation coverage for remaining outliers
- Keep webhook, admin, and cron hardening checks automated

3. Cost and performance

- Maintain AI cost tracking and route-level metrics
- Keep stream/SSE performance and caching guardrails

4. Documentation hygiene

- Maintain docs drift checks with `docs:check-links`, `audit:api`, and `docs:stats`

## Notes

- Historical planning details were moved to archive context and should be treated as non-normative.
- For operational guidance, use `README.md`, `BUILD_INSTRUCTIONS.md`, `OVERVIEW.md`, and `docs/README.md`.
