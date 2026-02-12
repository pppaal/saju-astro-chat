# Tarot Audit Quality (Updated)

## Scope

- branch: `fix/tarot-audit-fixes`
- goal: audit findings 3개(coverage/deck/router)를 재현 가능한 방식으로 수정

## Before / After

| Metric                  | Before |  After | Evidence                                                                       |
| ----------------------- | -----: | -----: | ------------------------------------------------------------------------------ |
| coverage missing combos |    208 |      0 | `artifacts/coverage_report.json`, `artifacts/coverage_report_after.json`       |
| router anomaly rate     | 0.0500 | 0.0000 | `artifacts/router_eval_report.json`, `artifacts/router_eval_report_after.json` |
| deck validation         |   FAIL |   PASS | `artifacts/deck_validation_report.md`                                          |
| e2e evidence pass rate  | 1.0000 | 1.0000 | `artifacts/e2e_smoke_report.json`                                              |

## What Changed

1. Deck validation fix

- `scripts/tarot_deck_validate.py` 경로 검증 로직 수정 (`public/images/...` 기준)
- 실제 런타임 경로와 validator 기준을 일치시켜 false FAIL 제거

2. Coverage backfill automation

- `scripts/tarot_backfill_missing_facets.py` 추가
- 입력:
- `backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl`
- `artifacts/coverage_report.json`의 `missing_combos`
- 출력:
- `backend_ai/data/tarot_corpus/tarot_corpus_v1_1.jsonl`
- backfill 규칙:
- 결정적 `doc_id` (`make_doc_id` 규칙 유지)
- 필수 메타 완비
- `auto_generated: true` 플래그 추가
- `source: auto_backfill_from_coverage`, `version: v1.1`

3. Router guardrail + low-confidence

- `backend_ai/services/tarot_service.py`의 `detect_tarot_topic`에 가드레일 추가
- money 질의가 career로 새는 케이스 보정
- 재회/연락 질의 보정
- low confidence(<0.35) 시 안전 fallback + `clarify_prompt` 반환
- `scripts/tarot_router_eval.py`에 anomaly top5 패턴 집계 추가

4. CI gate 강화

- `.github/workflows/tarot-audit-gate.yml` 업데이트
- before coverage -> backfill -> lint -> after coverage -> router/e2e/deck -> threshold check
- `scripts/tarot_audit_threshold_check.py` 추가
- `missing_combo_count == 0`, `router_anomaly_rate <= 0.01`, `deck PASS`, `e2e failures == 0` 강제

## Router Anomaly Patterns (Before Fix)

- 수정 전 anomaly top pattern은 money 질의가 career 테마로 라우팅되는 케이스였음.
- 대표 패턴:

1. `money query not routed to money domain`
2. `contact/reconciliation query routed to career`
3. `career query routed to love`
4. `theme not in spread catalog` (희소)
5. `spread outside theme catalog` (희소)

## Repro Commands

```bash
python scripts/tarot_coverage_audit.py --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl --output-json artifacts/coverage_report.json --output-md artifacts/coverage_report.md
python scripts/tarot_backfill_missing_facets.py --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1.jsonl --coverage-report-path artifacts/coverage_report.json --output-path backend_ai/data/tarot_corpus/tarot_corpus_v1_1.jsonl --version v1.1
python scripts/tarot_lint.py --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1_1.jsonl
python scripts/tarot_coverage_audit.py --corpus-path backend_ai/data/tarot_corpus/tarot_corpus_v1_1.jsonl --min-text-len 300 --output-json artifacts/coverage_report_after.json --output-md artifacts/coverage_report_after.md
python scripts/tarot_router_eval.py --input-path data/eval/searchbox_queries.jsonl --output-md artifacts/router_eval_report_after.md --output-json artifacts/router_eval_report_after.json
python scripts/tarot_deck_validate.py --output-md artifacts/deck_validation_report.md
python scripts/tarot_audit_threshold_check.py --coverage-report artifacts/coverage_report_after.json --router-report artifacts/router_eval_report_after.json --e2e-report artifacts/e2e_smoke_report.json --deck-report-md artifacts/deck_validation_report.md --max-missing 0 --max-router-anomaly-rate 0.01
```

## Notes

- backfill 문서는 `auto_generated: true`이므로 추후 수동 검수/수정 대상임.
- 현재 audit duplicate 계산은 `min-text-len=300` 기준으로 운영함(기존 규칙 유지).

## Minimal Follow-up Review Workflow

1. `auto_generated=true` 문서만 필터
2. 카드별 우선순위(트래픽 높은 도메인부터)로 수동 수정
3. 수정 후 `lint -> coverage -> eval` 재실행
