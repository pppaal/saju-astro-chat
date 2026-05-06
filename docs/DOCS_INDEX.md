# Docs Index

Last audited: 2026-05-06 (Asia/Hong_Kong)

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
| `docs/RUNBOOK.md`                           | Operational runbook                                               | On-call, platform engineers     | 2026-04-01   |

## Cross-Layer / Fortune Engine Docs

| Document                                | Covers                                                            | Audience                   | Last audited |
| --------------------------------------- | ----------------------------------------------------------------- | -------------------------- | ------------ |
| `docs/DESTINY_ENGINE_ARCHITECTURE.md`   | End-to-end pipeline (input → saju → astro → matrix → service)     | Backend/AI engineers       | 2026-04-01   |
| `docs/CROSS_RULES_SPEC.md`              | Auto-generated rule spec (205 rules + 10 meta) — source of truth  | Backend/AI engineers       | 2026-05-06   |
| `docs/CROSS_RULES_ROADMAP.md`           | Cross-rules priorities (P0~P4) + release hygiene discipline       | Backend/AI engineers       | 2026-05-06   |
| `docs/AUDIT_FUSION.md`                  | Saju × Astro fusion verification + maturity scorecard             | Backend/AI engineers       | 2026-03-11   |
| `docs/AUDIT_SAJU.md`                    | Saju calculation audit                                            | Backend engineers          | 2026-03-11   |
| `docs/AUDIT_ASTRO.md`                   | Astrology calculation audit                                       | Backend engineers          | 2026-03-11   |
| `docs/AUDIT_TAROT_GRAPHRAG.md`          | Tarot GraphRAG audit                                              | AI engineers               | 2026-03-11   |
| `docs/AUDIT_REPO_MAP.md`                | Repo-wide audit map                                               | Maintainers                | 2026-03-11   |
| `docs/SOLAR_TIME_CONVENTION.md`         | True solar time policy and boundary handling                      | Backend engineers          | 2026-03-11   |

## Generated And Audit Docs

| Document                               | Covers                                       | Audience                   | Last audited |
| -------------------------------------- | -------------------------------------------- | -------------------------- | ------------ |
| `docs/API_AUDIT_REPORT.md`             | Generated API inventory and security signals | Backend/security engineers | 2026-04-01   |
| `docs/MATRIX_DATA_CROSS_MAP.md`        | Matrix data cross-map reference              | Destiny-engine maintainers | 2026-02-15   |
| `docs/MATRIX_DATA_CROSS_MAP.json`      | Machine-readable matrix data cross map       | Destiny-engine maintainers | 2026-02-15   |
| `docs/DEAD_CODE_TRIAGE.md`             | knip output triage — clusters of dead files/exports requiring decision | Maintainers       | 2026-05-06   |

## Operations / Cost / UX Docs

| Document                                            | Covers                                            | Audience                  | Last audited |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------- | ------------ |
| `docs/AI_COST_MONITORING.md`                        | LLM cost tracking and budget gates                | Backend/SRE               | 2026-03-11   |
| `docs/COUNSELOR_SESSION_SAVE_RACE_RUNBOOK.md`       | Counselor session save race condition runbook     | On-call/backend           | 2026-03-11   |
| `docs/CREDIT_ERROR_MESSAGES.md`                     | Credit-related error copy contract                | Frontend/product          | 2026-03-11   |
| `docs/CALENDAR_GRADE_STRUCTURE_FOR_GPT.md`          | Calendar grade structure prompt reference         | AI engineers              | 2026-03-11   |
| `docs/A_GRADE_CHECKLIST.md`                         | "A-grade" release readiness checklist             | Engineering leadership    | 2026-03-11   |
| `docs/UNICORN_SCORECARD.md`                         | Strategy scorecard (paired with UNICORN_STRATEGY) | Product leadership        | 2026-03-11   |
| `docs/TYPECHECK_OPS.md`                             | Typecheck hotspots and zero-error plan            | All engineers             | 2026-03-11   |
| `docs/DEPLOYMENT.md`                                | Deployment notes                                  | DevOps                    | 2026-03-11   |
| `docs/CEO_TECH_GLOSSARY.md`                         | Non-technical glossary for product reviews        | Product/leadership        | 2026-03-11   |

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
- Last full verification snapshot dates from 2026-04-01 — **stale**, re-run before next release:
  - `python scripts/self_check.py` -> `PASS` (as of 2026-04-01)
  - `npm run docs:check-links` -> pass (as of 2026-04-01)
  - `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both` -> blocked by a parse error in `src/lib/destiny-matrix/ai-report/aiReportService.ts` (as of 2026-04-01)
  - `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both` -> overall `PASS=21 WARN=13 FAIL=8` (as of 2026-04-01)
- 2026-05-06 partial audit: `CROSS_RULES_SPEC.md` regenerated (205 rules + 10 meta); `npx knip` triage in `DEAD_CODE_TRIAGE.md`; 3 dead files removed from `src/lib/fortune/cross-rules/`.

## Archive Guidance

- `docs/archive/*` and moved historical writeups remain for traceability.
- Root historical engineering writeups were consolidated under `docs/archive/root-history/`.
- Treat archive docs as historical context, not current operational truth.
