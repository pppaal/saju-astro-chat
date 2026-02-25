# Deterministic Boundary Compare (10 cases)

- Generated: 2026-02-25T03:00:59.739Z
- Question: 여기로 가는게 맞냐? 맞다면 어떻게 해야 해?

| Case | Note | strict | balanced | aggressive |
| --- | --- | --- | --- | --- |
| C1_full_reference | 기준 케이스(데이터 풍부) | GO(87) | GO(87) | GO(89) |
| C2_low_anchor | 교차 앵커 부족 | DELAY(79) | DELAY(79) | DELAY(81) |
| C3_no_graph | GraphRAG 없음 | DELAY(79) | DELAY(79) | DELAY(81) |
| C4_sparse_aspects | aspect 빈약 | GO(78) | GO(78) | GO(80) |
| C5_no_relations_shinsal | 관계/신살 정보 없음 | GO(79) | GO(79) | GO(81) |
| C6_yongsin_mismatch | 용신-세운 불일치 | DELAY(71) | GO(73) | GO(73) |
| C7_missing_birth_time | 출생시각 누락 | DELAY(79) | DELAY(81) | DELAY(83) |
| C8_no_timing_core | 용신/대운/세운 미제공 | GO(77) | GO(77) | GO(77) |
| C9_sparse_astro | 점성 데이터 희소 | GO(87) | GO(87) | GO(89) |
| C10_combined_risk | 복합 리스크(누락+불일치+경고 집중) | NO(28) | NO(34) | NO(36) |

## Detail (C10_combined_risk)
### strict
- verdict: NO
- score: 28
- blockers: 교차 근거 앵커 부족, 출생시각/날짜 맥락 불완전
- reasons: 세운(수)과 용신(화) 불일치 | 대운 데이터 누락으로 신뢰도 보수 적용 | 주의 신호 4개 감점

### balanced
- verdict: NO
- score: 34
- blockers: 교차 근거 앵커 부족, 출생시각/날짜 맥락 불완전
- reasons: 세운(수)과 용신(화) 불일치 | 대운 데이터 누락으로 신뢰도 보수 적용 | 주의 신호 4개 감점

### aggressive
- verdict: NO
- score: 36
- blockers: 교차 근거 앵커 부족, 출생시각/날짜 맥락 불완전
- reasons: 세운(수)과 용신(화) 불일치 | 대운 데이터 누락으로 신뢰도 보수 적용 | 주의 신호 4개 감점
