# Documentation Hub

Last audited: 2026-04-01 (Asia/Hong_Kong)

This is the canonical documentation hub for the active codebase.

Latest re-audit: 2026-04-01. Canonical docs were refreshed to match the current repo snapshot, API audit, and current destiny QA results.

## Start Here

- `../README.md`: repo overview, current destiny-engine status, QA baseline
- `../BUILD_INSTRUCTIONS.md`: setup, env, migrations, deployment, troubleshooting
- `../OVERVIEW.md`: architecture and runtime topology
- `REPO_STRUCTURE.md`: repo boundaries for source, tests, reports, and generated artifacts
- `SECURITY_AUDIT_REPORT.md`: current API security posture and open items
- `UNICORN_STRATEGY.md`: non-normative long-range product strategy

## Destiny Engine And AI

- `DESTINY_MATRIX.md`: current deterministic destiny engine, adapters, and service role split
- `RAG_AND_GRAPHRAG.md`: GraphRAG role, domains, evidence bundles, and diagnostics
- `CALCULATION_SPEC.md`: code-derived current calculation spec for the modern pipeline
- `CALENDAR_LANGUAGE_GUIDE.md`: canonical calendar wording, labels, and user-facing copy rules
- `DESTINY_LOGGING.md`: runtime event schema and logging strategy for destiny surfaces
- `PDF_REPORTING.md`: report pipeline details

## Operations And QA

- `RUNBOOK.md`: operational runbook
- `TESTING_AND_GUARDRAILS.md`: required checks, destiny QA scripts, and release gates
- `PROJECT_QUALITY_REVIEW_2026-03-16.md`: product quality review with current addendum

## Audit Outputs

- `DOCS_INDEX.md`: documentation map by audience and purpose
- `DOCS_AUDIT_REPORT_2026-04-01.md`: latest documentation re-audit and verification snapshot
- `DOCS_AUDIT_REPORT_2026-02-15.md`: previous documentation re-audit report
- `API_AUDIT_REPORT.md`: generated API route audit (`npm run audit:api`)

## Canonical vs Historical

- Canonical docs: root operational docs and `docs/*.md` except `docs/archive/*`
- Historical references: `docs/archive/*`, historical audits, and frozen checkpoint reports
- Root historical writeups that used to clutter the repo root now live under `docs/archive/root-history/`

Historical documents remain useful for traceability, but they are not the source of truth for the current destiny engine or service behavior.
