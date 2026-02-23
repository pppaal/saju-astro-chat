# Documentation Hub

Last audited: 2026-02-15 (Asia/Seoul)

This is the canonical documentation index for the active codebase.

## Start Here

- `../README.md`: onboarding, required checks, and repo snapshot
- `../BUILD_INSTRUCTIONS.md`: setup, env, migrations, deployment, troubleshooting
- `../OVERVIEW.md`: architecture and runtime topology

## Operations And AI

- `RUNBOOK.md`: operational runbook (Chroma safety, reindex, diagnostics)
- `RAG_AND_GRAPHRAG.md`: GraphRAG/cross-store design
- `DESTINY_MATRIX.md`: deterministic destiny-matrix system
- `PDF_REPORTING.md`: report pipeline details

## Product Exposure And QA

- `TESTING_AND_GUARDRAILS.md`: required checks vs full suites

## Audit Outputs

- `DOCS_INDEX.md`: high-level documentation map by audience
- `DOCS_AUDIT_REPORT_2026-02-15.md`: doc re-audit report and command outcomes
- `API_AUDIT_REPORT.md`: generated API route audit (`npm run audit:api`)

## Canonical vs Historical

- Canonical docs: root operational docs and `docs/*.md` (excluding `docs/archive/*`)
- Historical references: root `*_REPORT.md`, `FINAL_*`, and `docs/archive/*`

Historical reports are retained for traceability but are not normative for current implementation.
