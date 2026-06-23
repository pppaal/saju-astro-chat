# SSOT 감사 — 강약/십신/오행/각도/라벨 (Opus)

선언된 SSOT(CONVENTIONS) 대비 **재구현·중복·이탈**을 훑은 결과.

## ✅ 이미 해결

- **강약(§11)** — `computeStrengthScore` 단일 코어로 통일. geokguk·calculateStrengthScore 위임,
  yongsin도 SSOT 점수 기반으로(102/120 차트가 정답값으로 교정). 커밋 `0d2c3ef`.

## ✅ 정본 깨끗(손댈 것 없음)

존엄 테이블 · sign ruler · 십신↔행성 브릿지(SAJU_ASTRO_MAPPINGS) · sign 라벨(signLabels) · 절기 KASI · JIJANGGAN · FIVE_ELEMENT_RELATIONS.

---

## 🔴 십신(十神) 재구현 5곳 — 정본 `core/sibsin.getSibseong` 미사용

| 곳       | 경로                                      | 위험                                                                                                  |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 궁합     | `compatibility/sajuSynastryData.ts`       | **HIGH** — 인라인 2개 + 지지정기表 복제 + **음양을 stem-index 패리티로 따로 도출**(진짜 다를 수 있음) |
| 상담사   | `destiny/counselorContext.ts`             | **HIGH** — 인라인 + 지지정기表 복제 (LLM 컨텍스트로 감)                                               |
| 격국     | `saju/geokguk.ts getSipsung`              | **HIGH** — 인라인, fallback `'비견'` vs SSOT `''` (엣지 동작차)                                       |
| 궁합보조 | `saju/compatibility/dayMasterAnalysis.ts` | MED — 정/역방향 십신 수기 페어링                                                                      |
| 캘린더   | `calendar-engine/derivers/lifePattern.ts` | LOW — 오행 생극表 로컬(십신 아님)                                                                     |

- **수정:** 각 인라인 삭제 → `getSibseong`/`getBranchSibsin` 위임. 대부분 같은 값(동작보존)이나
  **궁합 음양 도출·geokguk fallback은 동작이 바뀔 수 있어** 골든 검증 필요.

## 🔴 sign→오행 맵 3곳 — 값 충돌

- 정본 `saju/elementBridge.SIGN_TO_ASTRO_ELEMENT`(공기→air)
- `report/config/elements.config.ts`: 공기→**metal** ⚠️ **모순** (소비처: saju/constants.ts) → **동작 바뀜, 확인 필요**
- `calendar/constants.ts ZODIAC_TO_ELEMENT`(공기→air, 값은 같음·중복) / `local-report-generator` 위치기반 4번째 사본
- **수정:** elementBridge 하나로. air→metal이 의도였는지 확인 후.

## 🟠 어스펙트 각도 상수 중복 (수학상수, 동작보존)

`astrology/aspects.ts DESIRED_ANGLES` == `astrology/transit.ts TRANSIT_ASPECT_ANGLES` **바이트 동일** →
공용 상수로 export. (orb/weight는 의도적 분리라 유지.)

## 🟡 라벨 중복 (동작보존)

- 행성 라벨 3사본: `planetNames.PLANET_KO` · `report/chartLabels.PLANET_LABEL` · `components/astrology/constants.PLANET_LABELS`
- 별자리 라벨 2사본: `signLabels.SIGN_KO`(정본) · `components/astrology/constants.SIGNS`
- **수정:** 정본 하나에서 derive/re-export.

---

## 권장 그룹

- **A. 동작보존(안전·골든무변경 기대):** 어스펙트 각도 상수, 라벨 dedup, 십신 위임 중 값 동일한 곳(geokguk 제외하고 검증).
- **B. 동작변경(검증·결정 필요):** sign→오행 air→metal 정리, 궁합 음양 도출 통일, geokguk fallback.
- **C. 보류:** (이전) 子時 일주(E1)·조후 우선순위(E6).
