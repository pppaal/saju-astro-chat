# Development Roadmap

Last audited: 2026-04-01 (Asia/Hong_Kong)

This roadmap is a planning document. It is not a source of truth for current implementation status.

## Current Baseline (verified)

- Core app stack: Next.js + Prisma + Python AI backend
- Deterministic matrix engine: `src/lib/destiny-matrix`
- Graph retrieval stack: `backend_ai/app/rag`
- API routes (current): 140 (`npm run audit:api`)
- Retrieval health: `python scripts/self_check.py` -> `PASS`
- Docs links: `npm run docs:check-links` -> pass
- Current destiny QA blocker: `qa-destiny-three-services` is blocked by a parse error in `src/lib/destiny-matrix/ai-report/aiReportService.ts`
- Current counselor regression state: `PASS=21 WARN=13 FAIL=8` overall, with `ko` still at `FAIL=8`

## 2026 Priorities

1. Reliability and quality gates

- Keep `lint`, `typecheck`, `build`, and public smoke tests green
- Restore `qa-destiny-three-services` execution by clearing the current report-stack parse blocker
- Recover counselor Korean regression failures back to zero-fail status

2. Security standardization

- Continue middleware/validation coverage for remaining outliers
- Keep webhook, admin, and cron hardening checks automated

3. Cost and performance

- Maintain AI cost tracking and route-level metrics
- Keep stream/SSE performance and caching guardrails

4. Documentation hygiene

- Maintain docs drift checks with `docs:check-links`, `audit:api`, and `docs:stats`
- Keep canonical docs aligned to the latest verification snapshot, while leaving historical reports frozen

## Notes

- Historical planning details were moved to archive context and should be treated as non-normative.
- For operational guidance, use `README.md`, `BUILD_INSTRUCTIONS.md`, `OVERVIEW.md`, and `docs/README.md`.
