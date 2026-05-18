# Development Roadmap

Last audited: 2026-05-17 (Asia/Hong_Kong)

This roadmap is a planning document. It is not a source of truth for current implementation status.

## Current Baseline (verified 2026-05-18)

- Core app stack: Next.js + Prisma + `@anthropic-ai/sdk` (Python backend retired 2026-05-06)
- Deterministic matrix engine: `src/lib/destiny-matrix`
- Cross-rules engine: `src/lib/fortune/cross-rules` (205 rules + 10 meta)
- API routes (current): 140 (`npm run audit:api`)
- Docs links: `npm run docs:check-links` -> pass
- Typecheck: `tsc --noEmit` -> 0 errors
- Lint: `npm run lint` -> 0 errors (recovered from 88 via PR #271)
- `qa-counselor-questions --lang=ko`: `PASS=21 WARN=0 FAIL=0`
- `qa-destiny-three-services`: **broken** since PR #245 removed `aiReportService.ts`. Old `PASS=10` baseline unreproducible.
- `test:destiny:release`: **16 of 88 fail** — tracked as follow-up.

## 2026 Priorities

1. Reliability and quality gates

- Keep `lint`, `typecheck`, `build`, and public smoke tests green
- Hold `qa-destiny-three-services` and `qa-counselor-questions` at zero-fail
- Enforce file-size caps on orchestration files (see `docs/CROSS_RULES_ROADMAP.md` release hygiene section)

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
