# Docs Index

Last audited: 2026-06-15 (Asia/Hong_Kong)

## Core Docs

| Document                                                             | Covers                                                            | Audience                    | Last audited |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------- | ------------ |
| `README.md`                                                          | Repo overview, architecture, quality engineering                  | All engineers               | 2026-06-15   |
| `BUILD_INSTRUCTIONS.md`                                              | Prereqs, env setup, DB, build/test, deployment, troubleshooting   | Developers, DevOps          | 2026-04-01   |
| `OVERVIEW.md`                                                        | Architecture and runtime topology                                 | Engineers, architects       | 2026-06-15   |
| `docs/SECURITY_AUDIT_REPORT.md`                                      | Historical 2026-02 audit (current posture: `API_AUDIT_REPORT.md`) | Security, backend engineers | 2026-02-15   |
| `ROADMAP.md`                                                         | Technical planning priorities                                     | Engineering leadership      | 2026-06-15   |
| `docs/UNICORN_STRATEGY.md`                                           | Long-range product strategy (non-normative)                       | Product leadership          | 2026-02-15   |
| `docs/archive/root-history/PROJECT_IMPROVEMENT_STATUS_2026-02-03.md` | Historical checkpoint, de-authorized                              | Maintainers                 | 2026-02-15   |

## Canonical Destiny Docs

| Document                         | Covers                                                                   | Audience                     | Last audited |
| -------------------------------- | ------------------------------------------------------------------------ | ---------------------------- | ------------ |
| `docs/README.md`                 | Docs hub and canonical vs archive guidance                               | All engineers                | 2026-04-01   |
| `docs/REPO_STRUCTURE.md`         | Repo boundaries and storage policy for source vs generated output        | Maintainers, all engineers   | 2026-05-17   |
| `docs/DESTINY_MATRIX.md`         | Current destiny architecture (saju/astro cores → facts → surfaces)       | Product/backend engineers    | 2026-06-15   |
| `docs/RAG_AND_GRAPHRAG.md`       | **Removed feature** — historical pointer only (GraphRAG deleted)         | AI/backend engineers         | 2026-06-15   |
| `docs/CALCULATION_SPEC.md`       | Deterministic calculation pipeline (saju/astro/cross/calendar)           | Backend/AI engineers         | 2026-06-15   |
| `docs/운흐름.md`                 | 운흐름(사주×점성 타이밍 캘린더) 단일 출처 — 데이터·5층·해석·라벨·v2 통합 | Product/backend/AI engineers | 2026-06-06   |
| `docs/DESTINY_LOGGING.md`        | Current logging stack (logger + metrics; UserInteraction dormant)        | Backend/product engineers    | 2026-06-15   |
| `docs/TESTING_AND_GUARDRAILS.md` | Required checks, CI gates, determinism goldens, release gate             | All engineers                | 2026-06-15   |
| `docs/PDF_REPORTING.md`          | **Removed feature** — historical pointer only (PDF report deleted)       | Backend/reporting engineers  | 2026-06-15   |
| `docs/RUNBOOK.md`                | Operational runbook                                                      | On-call, platform engineers  | 2026-04-01   |

## Cross-Layer / Fortune Engine Docs

| Document                              | Covers                                                               | Audience             | Last audited |
| ------------------------------------- | -------------------------------------------------------------------- | -------------------- | ------------ |
| `docs/DESTINY_ENGINE_ARCHITECTURE.md` | End-to-end pipeline (input → saju → astro → facts → cross → surface) | Backend/AI engineers | 2026-06-15   |
| `docs/AUDIT_SAJU.md`                  | Saju calculation audit                                               | Backend engineers    | 2026-03-11   |
| `docs/AUDIT_ASTRO.md`                 | Astrology calculation audit                                          | Backend engineers    | 2026-03-11   |
| `docs/SOLAR_TIME_CONVENTION.md`       | True solar time policy and boundary handling                         | Backend engineers    | 2026-03-11   |

## Generated And Audit Docs

| Document                   | Covers                                       | Audience                   | Last audited |
| -------------------------- | -------------------------------------------- | -------------------------- | ------------ |
| `docs/API_AUDIT_REPORT.md` | Generated API inventory and security signals | Backend/security engineers | 2026-04-01   |

## Operations / Cost / UX Docs

| Document                                      | Covers                                              | Audience               | Last audited |
| --------------------------------------------- | --------------------------------------------------- | ---------------------- | ------------ |
| `docs/AI_COST_MONITORING.md`                  | LLM cost picture (models, tokens, caching, credits) | Backend/SRE            | 2026-06-15   |
| `docs/COUNSELOR_SESSION_SAVE_RACE_RUNBOOK.md` | Counselor session save race condition runbook       | On-call/backend        | 2026-03-11   |
| `docs/CREDIT_ERROR_MESSAGES.md`               | Credit-related error copy contract                  | Frontend/product       | 2026-03-11   |
| `docs/A_GRADE_CHECKLIST.md`                   | "A-grade" release readiness checklist               | Engineering leadership | 2026-03-11   |
| `docs/TYPECHECK_OPS.md`                       | Typecheck hotspots and zero-error plan              | All engineers          | 2026-03-11   |
| `docs/DEPLOYMENT.md`                          | Deployment notes                                    | DevOps                 | 2026-03-11   |
| `docs/CEO_TECH_GLOSSARY.md`                   | Non-technical glossary for product reviews          | Product/leadership     | 2026-03-11   |

## Feature Subsystem Docs

| Document                        | Covers                                                                  | Audience                     | Last audited |
| ------------------------------- | ----------------------------------------------------------------------- | ---------------------------- | ------------ |
| `docs/TAROT_OVERVIEW.md`        | Tarot routes, shared prompt rules, result typography, card asset sizing | Product/backend/AI engineers | 2026-05-17   |
| `docs/EVAL_TAROT_PROMPTS.jsonl` | Routing/safety evaluation cases for tarot prompts                       | AI engineers                 | 2026-05-17   |

## Library Docs

| Document                              | Covers                                     | Audience              | Last audited |
| ------------------------------------- | ------------------------------------------ | --------------------- | ------------ |
| `src/lib/api/README.md`               | API shared library layout and usage policy | Backend/API engineers | 2026-02-15   |
| `src/lib/api/API_POLICY.md`           | API behavior and policy                    | Backend/API engineers | 2026-02-15   |
| `src/lib/api/ERROR_RESPONSE_GUIDE.md` | Error contract details                     | Backend/API engineers | 2026-02-15   |
| `src/lib/api/USAGE_EXAMPLES.md`       | Route implementation examples              | Backend/API engineers | 2026-02-15   |

## Current Operating Notes

- Current destiny release gate (in package.json `ops:destiny:release`) is `typecheck` + `test:destiny:release`. It does **not** invoke `qa-destiny-three-services` (that script was removed in this cleanup — it imported the removed destiny-matrix engine, as did `qa-counselor-questions`; neither was wired to any npm script or workflow).
- 2026-05-18 verification snapshot:
  - `npm run docs:check-links` -> **PASS** (8 markdown files)
  - `npx tsc -p tsconfig.json --noEmit` -> **PASS** (0 errors, after `prisma generate` with any dummy `DATABASE_URL`)
  - `npm run lint` -> **PASS** (0 errors) — recovered from 88 via PR #271 (unused-vars / dead exports cleanup, ~2,100 lines deleted)
  - `npx tsx scripts/ops/qa-counselor-questions.ts --lang=ko` -> **PASS=21 WARN=0 FAIL=0** (en mode not run this round; was `PASS=42` both-langs in 2026-05-06 snapshot)
  - `npx tsx scripts/ops/qa-destiny-three-services.ts` -> **SCRIPT BROKEN**: imports `aiReportService.ts` (`generateAIPremiumReport`, `generateThemedReport`) which PR #245 removed. The 2026-05-06 `PASS=10` claim was unreproducible at the time it was recorded. Follow-up: rewrite against `runDestinyCore` + `adaptCoreTo*` adapters (already used by the rest of the script), or restore minimal entry points.
  - `npm run test:destiny:release` -> **FAIL=16, PASS=72 (7 of 8 files have failures)**. Pre-existing — previous snapshots explicitly noted "`npm test` not run". Failures span `tests/app/api/tarot/interpret/route.test.ts` (auto-repair format expectations), and others. Follow-up: triage by file.
- 2026-05-06 maintenance: `CROSS_RULES_SPEC.md` regenerated (205 rules + 10 meta); `npx knip` triage in `DEAD_CODE_TRIAGE.md`; 3 dead files removed from `src/lib/fortune/cross-rules/`; **Python `backend_ai` substrate fully retired** — folder, CI workflows, package.json scripts, tests, docker-compose service, and env vars all removed; `AUDIT_TAROT_GRAPHRAG.md`, `AUDIT_REPO_MAP.md`, `audit_tarot_quality.md` archived.
- 2026-05-18 maintenance: lint dead-code cleanup (PR #271) — deleted `destinyAnalyzer.ts`, `healthAnalyzerAdvanced.ts`, cascade-deleted ~30 unused exports across analyzers/utils/types/skeletons.
- 2026-06-05 docs cleanup (phase 1): a source restructure (`src/lib/destiny-matrix` → `src/lib/destiny`/`fusion`/`calendar-engine`) plus feature removals (ICP, dream, `fortune/cross-rules`) left many docs pointing at dead paths. Archived 12 fully-stale docs to `docs/archive/`: `icp_test_spec.md`, `icp_test_audit.md`, `icp_test_copy_v2.md`, `CROSS_RULES_SPEC.md`, `CROSS_RULES_ROADMAP.md`, `MATRIX_DATA_CROSS_MAP.md`(+`.json`), `AUDIT_FUSION.md`, `UNICORN_SCORECARD.md`, `DEAD_CODE_TRIAGE.md`, `I18N_AUDIT.md`, `CALENDAR_GRADE_STRUCTURE_FOR_GPT.md`. Remaining stale docs (README/OVERVIEW/ROADMAP path drift, pricing 3-way mismatch vs `src/lib/config/pricing.ts` = 10/40/100/240/500, TAROT_OVERVIEW couple surface) are flagged for phase 2 (update) — NOT yet fixed.
- 2026-06-06 캘린더 문서 통일: 흩어진 캘린더 문서 4개(`CALENDAR_LANGUAGE_GUIDE`, `calendar-display-design`, `calendar-v2-migration-gap`, `CALENDAR_GRADE_STRUCTURE_FOR_GPT`)를 단일 출처 **`docs/운흐름.md`** 로 통일하고 원본은 archive 이동. 제품/개념명을 destinypal → **운흐름** 으로 정리(코드 경로는 아직 `destinypal/`). 핵심 방향: 의미 매핑 확장이 아니라 **타이밍 수렴**.
- 2026-06-15 docs cleanup (phase 2 — completed): rewrote the docs that still described the removed `src/lib/destiny-matrix` engine so they match the current code (saju/astro deterministic cores → facts → cross fusion → per-surface presenters; Claude over raw HTTP, no `@anthropic-ai/sdk`). Updated `README.md`, `OVERVIEW.md`, `ROADMAP.md`, `docs/DESTINY_MATRIX.md`, `docs/DESTINY_ENGINE_ARCHITECTURE.md`, `docs/CALCULATION_SPEC.md`, `docs/DESTINY_LOGGING.md`, `docs/TESTING_AND_GUARDRAILS.md`, `docs/AI_COST_MONITORING.md`, `docs/RUNBOOK.md`, `docs/운흐름.md`. Rewrote `docs/RAG_AND_GRAPHRAG.md` and `docs/PDF_REPORTING.md` as "removed feature" historical pointers (GraphRAG, PDF/AI premium report, and the `/api/calendar|destiny-map|destiny-matrix` routes are all gone). Flagged `docs/SECURITY_AUDIT_REPORT.md` as a historical 2026-02 snapshot. Refreshed README repo-snapshot numbers via `docs:stats`/`audit:api` (76 routes, 24 models, 548 test files; 90.8% guarded / 75.0% validated / 89.5% rate-limited).

## Archive Guidance

- `docs/archive/*` and moved historical writeups remain for traceability.
- Root historical engineering writeups were consolidated under `docs/archive/root-history/`.
- Treat archive docs as historical context, not current operational truth.
