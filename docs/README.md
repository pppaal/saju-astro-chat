# Documentation Hub

Last audited: 2026-05-06 (Asia/Hong_Kong)

This is the canonical documentation hub for the active codebase.
(Obsidian vault 로 `docs/` 를 열면 아래 구조가 그래프로 보입니다.)

## 📚 Documentation Map (교리 → 서비스 → 아키텍처 → 레퍼런스)

SSOT 기반 신규 구조. ⚙️ 표시는 코드에서 자동 생성(`npm run docs:sync`).

**🧭 교리 (Doctrine)** — "우리는 이렇게 계산한다"

- [사주 교리](doctrine/saju.md) · [점성 교리](doctrine/astrology.md) · [타로 교리](doctrine/tarot-doctrine.md) · [계산 표준](doctrine/calculation-standards.md) ⚙️

**🎴 서비스 (Services)** — "유저가 받는 것"

- [서비스 인덱스](services/services-index.md) ⚙️ · [운명 상담사](services/destiny-counselor.md) · [타로 상담사](services/tarot.md) · [궁합 상담사](services/compatibility.md)

**🏗️ 아키텍처 (Architecture)**

- [크레딧 & 비용](architecture/credits.md) ⚙️

**📑 레퍼런스 (Reference)**

- [프로젝트 상태판](reference/health-dashboard.md) ⚙️ · [API 라우트 인벤토리](reference/api-routes.md) ⚙️

> 상세 감사/스펙 문서(AUDIT_SAJU, CALCULATION_SPEC, SOLAR_TIME_CONVENTION 등)는
> 각 교리 문서가 링크합니다. 감사 대상별 전체 색인 + 유지보수 로그는 [DOCS_INDEX.md](DOCS_INDEX.md).

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

## Audit Outputs

- `DOCS_INDEX.md`: documentation map by audience and purpose
- `API_AUDIT_REPORT.md`: generated API route audit (`npm run audit:api`)

Past one-shot re-audit reports (`DOCS_AUDIT_REPORT_*.md`, `PROJECT_QUALITY_REVIEW_*.md`,
`REPORT_QA_*.md`) live under `archive/` for traceability.

## Canonical vs Historical

- Canonical docs: root operational docs and `docs/*.md` except `docs/archive/*`
- Historical references: `docs/archive/*`, historical audits, and frozen checkpoint reports
- Root historical writeups that used to clutter the repo root now live under `docs/archive/root-history/`

Historical documents remain useful for traceability, but they are not the source of truth for the current destiny engine or service behavior.
