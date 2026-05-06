# Runbook

Last audited: 2026-05-06 (Asia/Hong_Kong)

## Scope

Operational runbook for the Next.js production stack. The previous Python `backend_ai` substrate (Chroma reindex, GraphRAG diagnostics, `self_check.py`) was retired on 2026-05-06 — sections covering those pipelines have been removed.

## Daily Health Checks

```bash
npm run lint
npm run typecheck
npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both
npx tsx scripts/ops/qa-counselor-questions.ts --lang=both
```

Target state: lint/typecheck 0 errors; both QA scripts at zero `FAIL`.

## Release Gate

```bash
npm run ops:destiny:release
```

Runs typecheck + targeted destiny regression bundle + Korean three-service QA.

## PDF Generation Issues

PDFs are now rendered inside Next.js (see `docs/PDF_REPORTING.md`). Common failure modes:

- Korean glyphs blank: jsDelivr font fetch failed at runtime — retry, or mirror Noto CJK to `public/fonts/`.
- Empty payload: upstream `aiReportService` returned partial data — inspect Next.js server logs.

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
