# raw → consumer 분배 명세 (Single Source of Truth)

> raw 사주/점성 데이터에서 4 consumer (운명 LLM / 궁합 LLM / 통합 리포트 / 캘린더·운흐름) 가
> 각각 무엇을 받아야 하는지의 SSOT. consumer 가 자기 분석을 자기 책임으로 호출하는 패턴
> (sajuFacts/astroFacts 정제 + consumer 가 직접 분석 함수 호출).
>
> **v2 (2026-06-06)** — Opus 코드 실측 감사 반영 (v1 의 ~15 셀 오류 수정).

## 마커 범례

- `✅` = 받고 진짜 사용
- `⚠️ dead` = 받지만 화면/출력에 표시 0 (비용만 있고 미사용)
- `-` = 안 받고 안 씀

## 1. raw 자체

### 사주 raw (`calculateSajuData` 출력)

```
pillars (4기둥: year/month/day/time)
├── heavenlyStem (천간): name, element, yin_yang, sibsin
├── earthlyBranch (지지): name, element, yin_yang, sibsin
└── jijanggan (지장간): chogi/junggi/jeonggi each with days

dayMaster (일간 StemBranchInfo)
fiveElements (오행 카운트: wood/fire/earth/metal/water)

daeWoon (대운):
├── startAge, isForward
├── current
└── list[DaeunData]

unse (운기 시간 흐름):
├── daeun  — 대운 ganji list
├── annual — 세운 list
└── monthly — 월운 list
```

**raw 안에 이미 들어있음** (별도 분석 불필요):
- 십신 sibsin (각 기둥의 천간/지지에 다 박힘)
- 대운/세운/월운 timing

### 점성 raw (`calculateNatalChart` 출력 → `toChart` Chart)

```
planets[]   — name, longitude, sign, degree, house, retrograde, speed
ascendant   — PlanetData
mc          — PlanetData
houses[12]  — cusp, formatted (sign 포함)
meta        — jdUT, isoUTC, timeZone, lat, lon, houseSystem
```

## 2. raw → consumer 분배 표 (v2 — 실측 반영)

| 항목 | 종류 | 운명 LLM | 궁합 LLM | 통합 리포트 | 캘린더 (운흐름) |
|---|---|---|---|---|---|
| **사주 raw** | | | | | |
| pillars (4기둥 + 십신 + 지장간) | raw | ✅ | ✅ | ✅ | ✅ |
| dayMaster (일간) | raw | ✅ | ✅ | ✅ | ✅ |
| fiveElements (오행 카운트) | raw | ✅ | ✅ | ✅ | ✅ |
| 대운 list | raw | ✅ | - | ✅ | ✅ |
| 대운 current | raw | ✅ | ✅ | ✅ | ✅ |
| 세운 list (연) | raw | ✅ | - | - | ✅ |
| 월운 list | raw | ✅ | - | - | ✅ |
| 일진 list | raw | ✅ | - | - | ✅ |
| **사주 분석** (raw 위에 추가) | | | | | |
| 격국 (determineGeokguk) | 분석 | ✅ | - | ✅ | ✅ |
| 용신 (determineYongsin) | 분석 | ✅ | - | ✅ | ✅ |
| 12운성 (getTwelveStagesForPillars) | 분석 | ✅ | - | ✅ | ✅ |
| 신살 self (getShinsalHits) | 분석 | ✅ | ✅ | ✅ | ✅ |
| 십신 분포 카운트 (analyzeSibsinComprehensive) | 분석 | ✅ | - | ✅ | ✅ |
| 공망 self (getGongmang) | 분석 | ✅ | - | ✅ | ✅ |
| 본명 합충형 관계 (analyzeRelations) | 분석 | ✅ | - | ✅ | ✅ |
| 조후용신 (getJohuYongsin) | 분석 | - | - | - | - |
| 통근 (sajuFacts.rooted / calculateTonggeun) | 분석 | ✅ | - | - | ✅ |
| 득령 (calculateDeukryeong) | 분석 | - | - | - | ✅ |
| 형충회합 시간 cross (analyzeHyeongchung) | 분석 | ✅ | - | - | ✅ |
| **사주 cross 분석 (궁합 전용)** | | | | | |
| 십성 cross 양방향 (sibsinOf cross) | 분석 | - | ✅ | - | - |
| 지장간 cross (일지 본기 합/충) | 분석 | - | ✅ | - | - |
| 세운 cross (올해↔본명/대운 합/충/형) | 분석 | - | ✅ | - | - |
| 신살 cross (도화/홍염/백호/괴강) | 분석 | - | ✅ | - | - |
| 본명 합/충/형/해/파/삼합/방합 cross | 분석 | - | ✅ | - | - |
| **운기 cross (LLM 운명 전용)** | | | | | |
| unseRelations (세운/월운/일진 ↔ 본명/대운) | 분석 | ✅ | - | - | - |
| **점성 raw** | | | | | |
| planets (10행성 + 노드) | raw | ✅ | ✅ | ✅ | ✅ |
| ASC / MC | raw | ✅ | ✅ | ✅ | ✅ |
| houses (12 cusp) | raw | 부분 | ✅ | ✅ | ✅ |
| **점성 분석** (raw 위에 추가) | | | | | |
| 본명 aspects (orb 5 major) | 분석 | ✅ | ✅ | - | - |
| 본명 aspects (major+minor 풍부) | 분석 | - | - | ✅ | ✅ |
| dignity (단순 per planet) | 분석 | ✅ | - | ✅ | - |
| dignity 5-tier (dignityTiers per planet) | 분석 | - | - | ⚠️ dead | ✅ |
| Chiron / Lilith (extraPoints) | 분석 | ✅ | - | ✅ | ✅ |
| 7 Arabic Lots (calculateArabicLots) | 분석 | - | - | ⚠️ dead | ✅ |
| Zodiacal Releasing (Spirit/Fortune L1) | 분석 | - | - | ⚠️ dead | ✅ |
| Almuten Figuris | 분석 | - | - | ⚠️ dead | ✅ |
| Profection (당해 활성 하우스) | 분석 | ✅ | - | ⚠️ dead | ✅ |
| Transit | 분석 | ✅ | - | - | ✅ |
| Solar Return | 분석 | ✅ | - | - | ✅ |
| Lunar Return | 분석 | ✅ | - | - | ✅ |
| Secondary Progression | 분석 | ✅ | - | - | ✅ |
| Fixed Stars | 분석 | ✅ | - | - | ✅ |
| **점성 cross 분석 (궁합 전용)** | | | | | |
| Synastry aspects (cross) | 분석 | - | ✅ | - | - |
| Composite Chart aspects | 분석 | - | ✅ | - | - |

## 3. 핵심 변경 (v1 → v2)

### 운명 LLM 추가 (v1 누락):
- 통근, Fixed Stars, Chiron/Lilith, Secondary Progression, Lunar Return, 형충회합 시간 cross
- unseRelations (운기 cross — 새 행)

### 통합 리포트 ⚠️ dead 표시 (v1 ✅ 였던 것):
- Profection / Arabic Lots / ZR / Almuten — buildNatalContext 가 계산해 넘기지만 IntegratedReport.tsx 표시 0
- dignity 5-tier — 받지만 adapter 가 단순 dignity 재계산 (5-tier 무시)

### 궁합 LLM 정직하게 - 처리 (v1 ✅ 였던 것):
- 격국/용신/12운성/십신분포/공망(self)/본명 관계
- compatSajuFacts.base 에 있지만 route 가 안 읽음
- 합·충·형 cross + 신살 cross + synastry/composite 만 사용

### 신규 카테고리 추가:
- **사주 cross 분석 (궁합 전용)**: 십성/지장간/세운/신살/본명 합충 cross
- **운기 cross (LLM 운명 전용)**: unseRelations
- **점성 cross 분석 (궁합 전용)**: Synastry / Composite

### 조후용신 행:
- 사용처 0 으로 확인 — 모든 consumer "-". `getJohuYongsin` 코드는 있지만 production caller 없음.

## 4. 발견된 비효율 / 후속 결정

### A. 통합 리포트 dead data
**현재**: `buildNatalContext(includeHellenistic:true)` 가 Profection/Lots/ZR/Almuten/5-tier dignity 다 계산해서 넘김. 화면 표시 0.

**옵션**:
1. UI 섹션 추가 — 풍부한 본명 리포트
2. `includeHellenistic:false` — 계산 비용 절약, 단순 리포트
3. 현 상태 유지

### B. dignity 5-tier 비효율
**현재**: 통합 리포트 adapter 가 5-tier 받으면서도 단순 `dignityOf` 재계산 ([adapter.ts:128](src/components/destiny-map/charts/integrated/adapter.ts#L128)).
**결정**: 5-tier 그대로 쓰거나 단순 dignity 만 받기.

### C. 궁합 LLM 추가 분석 (Opus 추천)
**현재**: 합·충·형 표면 신호만. 격국/용신/12운성 등 핵심 사주 분석 미사용.
**옵션**:
1. 격국/용신/12운성/조후 cross 룰 추가 → 결혼·인내·역할 해석 풍부
2. 현 상태 유지 (cross 만으로 충분)

### D. 조후용신 dead
**현재**: 어디서도 안 씀.
**옵션**:
1. 운명 LLM 또는 궁합 LLM 에 도입
2. 코드 dead 처리 (제거)

## 5. 아키텍처 의도

- raw 정제 = `sajuFacts` (collectSajuFacts) + `astroFacts` (collectAstroFacts)
- 모든 consumer 가 같은 facts wrapper 통과 → 동일 source
- **분석은 consumer 가 자기 책임**으로 호출:
  - 운명상담사 → counselorContext 가 `getShinsalHits` / `getTwelveStagesForPillars` 등 직접 호출
  - 통합 리포트 → page.tsx 가 직접 호출 (현재 buildNatalContext 의존)
  - 캘린더 → calendar route / derivers 가 직접 호출 (현재 buildNatalContext 의존)
- `buildNatalContext` 처럼 *모든 분석 한꺼번에* 만드는 fat wrapper 패턴은 폐기 대상

## 6. 검증 상태

- 2026-06-06 v1 작성 (분배 의도 명세)
- 2026-06-06 v2 Opus 코드 실측 감사 반영 — v1 의 ~15 셀 오류 수정
- TODO: A/B/C/D 결정 → implementation 작업

## 7. 참고

- 옛 `buildNatalContext` (src/lib/calendar-engine/context/build.ts) = 통합 리포트 + 캘린더 + 운흐름 의 공통 fat wrapper. 이 표 적용 후 폐기 또는 thin pass-through 로.
- 운명/궁합 LLM 영역은 facts → consumer 패턴 이미 완료 (PR #1208, #1209, #1210, #1211, #1213, #1216).
