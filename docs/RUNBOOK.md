# Runbook

Last audited: 2026-05-06 (Asia/Hong_Kong)

## Scope

Operational runbook for the Next.js production stack. The previous Python `backend_ai` substrate (Chroma reindex, GraphRAG diagnostics, `self_check.py`) was retired on 2026-05-06 — sections covering those pipelines have been removed.

## Daily Health Checks

```bash
npm run lint
npm run typecheck
npm test
```

Target state: lint/typecheck 0 errors; test suite green. (The older
`scripts/ops/qa-destiny-three-services.ts` and `qa-counselor-questions.ts` scripts
import the removed destiny-matrix engine and no longer run.)

## Release Gate

```bash
npm run ops:destiny:release
```

Runs `typecheck` + `test:destiny:release` (the integrated-report real/render
regression bundle). See `docs/TESTING_AND_GUARDRAILS.md` for the full gate list.

## Database

```bash
npm run db:status     # check Prisma migration status
npm run db:migrate    # apply pending migrations
```

## AI Provider Issues

- Symptom: SSE chat / counselor / report endpoints return fallback or 5xx.
- Check: `ANTHROPIC_API_KEY` is set in the runtime environment.
- Logs: Next.js server stdout — Claude API errors include the upstream status code.

## Post-Deploy Smoke

```bash
npm run typecheck
npm run build
npm run test:e2e:smoke:public
```
