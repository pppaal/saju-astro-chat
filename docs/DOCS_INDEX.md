# Docs Index

Last audited: 2026-04-01 (Asia/Hong_Kong)

## Core Docs

| Document                                                             | Covers                                                          | Audience                    | Last audited |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------- | ------------ |
| `README.md`                                                          | Repo overview, destiny-engine status, QA snapshot               | All engineers               | 2026-04-01   |
| `BUILD_INSTRUCTIONS.md`                                              | Prereqs, env setup, DB, build/test, deployment, troubleshooting | Developers, DevOps          | 2026-04-01   |
| `OVERVIEW.md`                                                        | Architecture and runtime topology                               | Engineers, architects       | 2026-04-01   |
| `docs/SECURITY_AUDIT_REPORT.md`                                      | Current API security posture and open items                     | Security, backend engineers | 2026-02-15   |
| `ROADMAP.md`                                                         | Technical planning priorities                                   | Engineering leadership      | 2026-04-01   |
| `docs/UNICORN_STRATEGY.md`                                           | Long-range product strategy (non-normative)                     | Product leadership          | 2026-02-15   |
| `docs/archive/root-history/PROJECT_IMPROVEMENT_STATUS_2026-02-03.md` | Historical checkpoint, de-authorized                            | Maintainers                 | 2026-02-15   |

## Canonical Destiny Docs

| Document                                    | Covers                                                            | Audience                        | Last audited |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- | ------------ |
| `docs/README.md`                            | Docs hub and canonical vs archive guidance                        | All engineers                   | 2026-04-01   |
| `docs/REPO_STRUCTURE.md`                    | Repo boundaries and storage policy for source vs generated output | Maintainers, all engineers      | 2026-04-01   |
| `docs/DESTINY_MATRIX.md`                    | Current destiny core architecture, adapters, QA status            | Product/backend engineers       | 2026-04-01   |
| `docs/RAG_AND_GRAPHRAG.md`                  | GraphRAG role, evidence model, tracing, and diagnostics           | AI/backend engineers            | 2026-04-01   |
| `docs/CALCULATION_SPEC.md`                  | Current calculation pipeline for core/report/calendar/counselor   | Backend/AI engineers            | 2026-04-01   |
| `docs/CALENDAR_LANGUAGE_GUIDE.md`           | Canonical calendar user-facing terminology and copy rules         | Product, frontend, AI engineers | 2026-04-01   |
| `docs/DESTINY_LOGGING.md`                   | Runtime event schema and UserInteraction-based logging plan       | Backend/product engineers       | 2026-04-01   |
| `docs/TESTING_AND_GUARDRAILS.md`            | Required checks, destiny QA scripts, release gates                | All engineers                   | 2026-04-01   |
| `docs/PDF_REPORTING.md`                     | Report generation flow                                            | Backend/reporting engineers     | 2026-04-01   |
| `docs/PROJECT_QUALITY_REVIEW_2026-03-16.md` | Product quality review plus current destiny addendum              | Product and engineering leads   | 2026-04-01   |
| `docs/RUNBOOK.md`                           | Operational runbook                                               | On-call, platform engineers     | 2026-04-01   |

## Generated And Audit Docs

| Document                               | Covers                                       | Audience                   | Last audited |
| -------------------------------------- | -------------------------------------------- | -------------------------- | ------------ |
| `docs/API_AUDIT_REPORT.md`             | Generated API inventory and security signals | Backend/security engineers | 2026-04-01   |
| `docs/DOCS_AUDIT_REPORT_2026-04-01.md` | Documentation re-audit execution report      | Maintainers                | 2026-04-01   |
| `docs/DOCS_AUDIT_REPORT_2026-02-15.md` | Documentation re-audit execution report      | Maintainers                | 2026-02-15   |
| `docs/MATRIX_DATA_CROSS_MAP.md`        | Matrix data cross-map reference              | Destiny-engine maintainers | 2026-02-15   |
| `docs/MATRIX_DATA_CROSS_MAP.json`      | Machine-readable matrix data cross map       | Destiny-engine maintainers | 2026-02-15   |

## Library Docs

| Document                              | Covers                                     | Audience              | Last audited |
| ------------------------------------- | ------------------------------------------ | --------------------- | ------------ |
| `src/lib/api/README.md`               | API shared library layout and usage policy | Backend/API engineers | 2026-02-15   |
| `src/lib/api/API_POLICY.md`           | API behavior and policy                    | Backend/API engineers | 2026-02-15   |
| `src/lib/api/ERROR_RESPONSE_GUIDE.md` | Error contract details                     | Backend/API engineers | 2026-02-15   |
| `src/lib/api/USAGE_EXAMPLES.md`       | Route implementation examples              | Backend/API engineers | 2026-02-15   |

## Current Operating Notes

- Current destiny release gate is not just type/build health. It also includes:
  - `scripts/ops/qa-destiny-three-services.ts`
  - `scripts/ops/qa-counselor-questions.ts`
- Current verification snapshot on 2026-04-01:
  - `python scripts/self_check.py` -> `PASS`
  - `npm run docs:check-links` -> pass
  - `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both` -> blocked by a parse error in `src/lib/destiny-matrix/ai-report/aiReportService.ts`
  - `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both` -> overall `PASS=21 WARN=13 FAIL=8`

## Archive Guidance

- `docs/archive/*` and moved historical writeups remain for traceability.
- Root historical engineering writeups were consolidated under `docs/archive/root-history/`.
- Treat archive docs as historical context, not current operational truth.
