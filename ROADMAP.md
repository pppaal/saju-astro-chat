# Development Roadmap

Last audited: 2026-06-15 (Asia/Hong_Kong)

This roadmap is a planning document. It is not a source of truth for current implementation status.

## Current Baseline (measured 2026-06-15)

- Core app stack: Next.js + Prisma + Claude via the Anthropic Messages API over
  raw HTTP (no `@anthropic-ai/sdk`; Python backend retired 2026-05-06)
- Deterministic engine: Saju core (`src/lib/saju`) + astrology core
  (`src/lib/astrology`) + fact/cross layers (`src/lib/destiny`, `src/lib/cross`) +
  calendar engine (`src/lib/calendar-engine`). The old `src/lib/destiny-matrix`
  and `src/lib/fortune/cross-rules` engines were removed in the 2026-06 restructure.
- API routes (current): 76 (`npm run audit:api`); 41 app pages, 24 Prisma models,
  548 test files (`npm run docs:stats`)
- Verify locally with `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run docs:check-links`, and `npm run ops:destiny:release`. See
  `docs/TESTING_AND_GUARDRAILS.md` for the authoritative gate list.

## 2026 Priorities

1. Reliability and quality gates

- Keep `lint`, `typecheck`, `build`, and public smoke tests green
- Hold the determinism goldens and `test:destiny:release` at zero-fail
- Enforce file-size caps on the largest orchestration files (see the biggest
  files under `src/lib/saju` and `src/components/report`)

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
