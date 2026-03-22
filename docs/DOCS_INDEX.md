# Docs Index

Last audited: 2026-03-17 (Asia/Hong_Kong)

## Core Docs

| Document | Covers | Audience | Last audited |
| --- | --- | --- | --- |
| `README.md` | Repo overview, destiny-engine status, QA baseline | All engineers | 2026-03-17 |
| `BUILD_INSTRUCTIONS.md` | Prereqs, env setup, DB, build/test, deployment, troubleshooting | Developers, DevOps | 2026-02-15 |
| `OVERVIEW.md` | Architecture and runtime topology | Engineers, architects | 2026-03-17 |
| `SECURITY_AUDIT_REPORT.md` | Current API security posture and open items | Security, backend engineers | 2026-02-15 |
| `ROADMAP.md` | Technical planning priorities | Engineering leadership | 2026-02-15 |
| `UNICORN_STRATEGY.md` | Long-range product strategy (non-normative) | Product leadership | 2026-02-15 |
| `PROJECT_IMPROVEMENT_STATUS_2026-02-03.md` | Historical checkpoint, de-authorized | Maintainers | 2026-02-15 |

## Canonical Destiny Docs

| Document | Covers | Audience | Last audited |
| --- | --- | --- | --- |
| `docs/README.md` | Docs hub and canonical vs archive guidance | All engineers | 2026-03-17 |
| `docs/DESTINY_MATRIX.md` | Current destiny core architecture, adapters, QA status | Product/backend engineers | 2026-03-17 |
| `docs/RAG_AND_GRAPHRAG.md` | GraphRAG role, evidence model, tracing, and diagnostics | AI/backend engineers | 2026-03-17 |
| `docs/CALCULATION_SPEC.md` | Current calculation pipeline for core/report/calendar/counselor | Backend/AI engineers | 2026-03-17 |
| `docs/CALENDAR_LANGUAGE_GUIDE.md` | Canonical calendar user-facing terminology and copy rules | Product, frontend, AI engineers | 2026-03-17 |
| `docs/DESTINY_LOGGING.md` | Runtime event schema and UserInteraction-based logging plan | Backend/product engineers | 2026-03-17 |
| `docs/TESTING_AND_GUARDRAILS.md` | Required checks, destiny QA scripts, release gates | All engineers | 2026-03-17 |
| `docs/PDF_REPORTING.md` | Report generation flow | Backend/reporting engineers | 2026-02-15 |
| `docs/PROJECT_QUALITY_REVIEW_2026-03-16.md` | Product quality review plus current destiny addendum | Product and engineering leads | 2026-03-17 |
| `docs/RUNBOOK.md` | Operational runbook | On-call, platform engineers | 2026-02-15 |

## Generated And Audit Docs

| Document | Covers | Audience | Last audited |
| --- | --- | --- | --- |
| `docs/API_AUDIT_REPORT.md` | Generated API inventory and security signals | Backend/security engineers | 2026-02-15 |
| `docs/DOCS_AUDIT_REPORT_2026-02-15.md` | Documentation re-audit execution report | Maintainers | 2026-02-15 |
| `docs/MATRIX_DATA_CROSS_MAP.md` | Matrix data cross-map reference | Destiny-engine maintainers | 2026-02-15 |
| `docs/MATRIX_DATA_CROSS_MAP.json` | Machine-readable matrix data cross map | Destiny-engine maintainers | 2026-02-15 |

## Library Docs

| Document | Covers | Audience | Last audited |
| --- | --- | --- | --- |
| `src/lib/api/README.md` | API shared library layout and usage policy | Backend/API engineers | 2026-02-15 |
| `src/lib/api/API_POLICY.md` | API behavior and policy | Backend/API engineers | 2026-02-15 |
| `src/lib/api/ERROR_RESPONSE_GUIDE.md` | Error contract details | Backend/API engineers | 2026-02-15 |
| `src/lib/api/USAGE_EXAMPLES.md` | Route implementation examples | Backend/API engineers | 2026-02-15 |

## Current Operating Notes

- Current destiny release gate is not just type/build health. It also includes:
  - `scripts/ops/qa-destiny-three-services.ts`
  - `scripts/ops/qa-counselor-questions.ts`
- Current known green baseline:
  - 3-service regression `PASS=10 WARN=0 FAIL=0`
  - counselor regression `PASS=42 WARN=0 FAIL=0`
  - `core_quality_warning_count=0`

## Archive Guidance

- `docs/archive/*` and root historical `*_REPORT.md` files remain for traceability.
- Treat archive docs as historical context, not current operational truth.
