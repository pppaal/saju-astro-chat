# Docs Audit Report (2026-04-01)

Last audited: 2026-04-01 (Asia/Hong_Kong)

## Scope

This re-audit updated canonical documentation only.

- Updated: root operational docs and active `docs/*.md` references used as current guidance
- Not rewritten: `docs/archive/*`, historical checkpoint reports, generated report outputs, and frozen retrospective documents

## Commands Run

- `npm run docs:stats`
- `npm run audit:api`
- `python scripts/self_check.py`
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`
- `npm run docs:check-links`

## Findings

### Repo snapshot

- API routes: `140`
- App pages: `82`
- Component files: `608`
- Prisma models: `42`
- Test files: `1157`
- Markdown docs: `327`
- `.env.example` variables: `78`

### API audit

- Total routes: `140`
- Uses middleware/guards: `138` (`98.6%`)
- Has validation signals: `114` (`81.4%`)
- Rate limited: `131` (`93.6%`)
- Missing middleware: `2`
- Missing validation: `4`

### Runtime and QA status

- `python scripts/self_check.py`: `PASS`
- `npm run docs:check-links`: pass
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both`: blocked by a parse error in `src/lib/destiny-matrix/ai-report/aiReportService.ts`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both`: overall `PASS=21 WARN=13 FAIL=8`
- Korean counselor regression currently has all hard failures: `PASS=5 WARN=8 FAIL=8`

## Docs Updated

- `README.md`
- `OVERVIEW.md`
- `ROADMAP.md`
- `BUILD_INSTRUCTIONS.md`
- `docs/README.md`
- `docs/DOCS_INDEX.md`
- `docs/TESTING_AND_GUARDRAILS.md`
- `docs/DESTINY_MATRIX.md`
- `docs/RAG_AND_GRAPHRAG.md`
- `docs/CALCULATION_SPEC.md`
- `docs/PROJECT_QUALITY_REVIEW_2026-03-16.md`
- `docs/RUNBOOK.md`
- `docs/PDF_REPORTING.md`
- `docs/CALENDAR_LANGUAGE_GUIDE.md`
- `docs/DESTINY_LOGGING.md`

## Notes

- `docs/API_AUDIT_REPORT.md` was regenerated during this audit.
- The current verification snapshot reflects the present workspace state, including any uncommitted source changes already in the tree.
