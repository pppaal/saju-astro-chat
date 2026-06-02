# 캘린더(프리미엄) — 엔진 구조 · 카드 내용 · 표시 설계 정리

> 목적: 엔진은 그대로 두고, **같은 데이터가 화면에서 4~5번 겹쳐 보이는 UI 중복**을 어떻게
> 정리할지 설계하기 위한 문서. (코드는 아직 수정하지 않음 — 설계 단계)
>
> 결론 한 줄: **계산(엔진)은 멀쩡함. 표현(UI)만 정리하면 됨.**

---

## 0. TL;DR

- 엔진 진입점은 `buildInterpretation()` 하나. 데이터 원자는 **3종**뿐: ① 영역 점수 ② 날짜 ③ 흐름.
- "큰 날(bothSystems 수렴일)" **한 덩어리**가 한 화면에서 **4~5번** 그려지는 게 중복의 90%.
- 해법: **"한 개념 = 한 집(주인)"** — 데이터마다 전담 카드를 딱 하나씩.

---

## 1. 엔진이 만들어내는 것 (출력 데이터 모델)

진입점: `buildInterpretation()` — `src/lib/calendar-engine/interpretation/matcher.ts:34`
타입: `Interpretation` (= `monthlyInterpretation`) — `src/lib/calendar-engine/interpretation/types.ts:94`

실제 "데이터 원자"는 3종류뿐:

| 원자 | 엔진 필드 | 의미 | 계산 위치 |
|---|---|---|---|
| **① 영역 점수** | `themeScores` / `themeRanking` / `themeBreakdown` | 연애·돈·일·건강·성장 5개 점수 + 순위 + 기여 신호 | `derivers/themeScores.ts:45`, `derivers/themeBreakdown.ts:88`, `matcher.ts:370` |
| **② 날짜** | `keyEvents`(best/window/avoid) · `convergence.keyDays`(큰 날) · per-day `scoreBreakdown` | "어느 날이 좋고/나쁘고/큰가" | `derivers/keyEvents.ts:23`, `derivers/convergence.ts:121` |
| **③ 흐름** | per-day `score` 곡선 | 시간에 따른 점수 변화 | (per-day score) |

추가 필드: `monthComparison`(전월 대비), `lifetimePivots`(인생 전환점, 년 전용).

### 1-1. "큰 날(convergence.keyDays)"의 정체 — 가장 중요

- 계산: `deriveConvergence()` — `src/lib/calendar-engine/derivers/convergence.ts:121`
- `bothSystems: true` ⟺ **사주도 무겁고 점성도 무거운 날** (둘 다 강한 신호 동시 발화).
  - 무거움 판정: `convergence-heavy.ts` 의 `isHeavyAstro()`(느린 행성/식/각contact 등) + `isHeavySaju()`(형충/용신 활성 등).
  - `bothSystems = (astroHeavy > 0) && (sajuHeavy > 0)` — convergence.ts:156
- `meaning`: 그 날 테마 top2 + 톤으로 **자동 생성된 한 줄**. 예) "연애·성장 영역에 기회가 열리는 날". (LLM 아님, 규칙 기반)
- **월(topN=5)과 년(topN=8)이 같은 함수**에서 나옴. 범위만 다름.
  - 년: `year-convergence.ts:77` → `deriveConvergence(cells, 8, lang)`

### 1-2. per-day 축 합치 (scoreBreakdown)

- `ImportantDate.scoreBreakdown` — `src/components/calendar/types.ts:44`
- `sajuAxis` / `astroAxis` (0~100), `axisAgreement: 'aligned' | 'mixed' | 'opposed'`
- 이건 destiny-matrix/v3 쪽에서 채워지는 값(점성·사주 방향이 얼마나 같은가).
- 주의: 엔진 convergence의 `bothSystems`(신호 "무거움" 존재)와 `axisAgreement`(방향 일치)는 **별개 개념**.

### 1-3. 데이터 흐름 (API → 응답)

`src/app/api/calendar/route.ts:146`
1. 생일 → 사주/점성 계산 → NatalContext
2. 12개월 셀 prescore (cell-cache)
3. 셀 → `ImportantDate[]` (365일)
4. 대상 월에 `buildInterpretation()` → `monthlyInterpretation`(narrative + 위 모든 파생 필드)
5. 응답: `monthlyInterpretation`(현재 월) + `allDates`(365일)

→ **데이터는 한 번만, 올바르게 계산됨.** 중복 계산/로직 오류 없음.

---

## 2. 지금 UI가 보여주는 것 (카드 인벤토리)

### 월간: `MonthDashboard.tsx`
렌더 순서: PremiumHero → MonthComparisonLine → MonthInsights → CrossInsightCard → FlowChart

### 년간: `YearDashboard.tsx`
렌더 순서: PremiumHero → FlowChart → YearInsights → CrossInsightCard → LifeTimeline

| 카드 | 파일 | 보여주는 것 | 출처 |
|---|---|---|---|
| PremiumHero | `shared/PremiumHero.tsx:29` | 기간 라벨 + 점수/등급 + 합치율 칩 + verdict 한 줄 | score, grade, agreementPercent |
| MonthComparisonLine | `MonthDashboard.tsx:170` | 전월 대비 + top3 테마 변화 | `monthComparison` |
| ThemeFocusCard | `shared/MonthInsights.tsx:54` | 5영역 막대 + top테마 기여 신호 | `themeRanking`, `themeBreakdown` |
| KeyDatesCard | `shared/MonthInsights.tsx:118` | best일 / 강한 구간(window) / 피할 날(avoid) | `keyEvents` |
| **BigTurnsCard** | `shared/MonthInsights.tsx:223` | **큰 날 최대 2개 (날짜+meaning+근거칩)** | `convergence.keyDays` (bothSystems&&meaning) |
| YearFocusCard | `shared/YearInsights.tsx:62` | 연 평균 5영역 막대 | `yearlyMonthly[].themes` |
| **YearBigDaysCard** | `shared/YearInsights.tsx:125` | **큰 날 최대 6개 (날짜+meaning+근거)** | `yearlyConvergence.keyDays` |
| **CrossInsightCard** | `shared/CrossInsightCard.tsx:65` | FlowSummary + 사주/점성 2선 차트 + **aligned 스팟** + opposed 스팟 + 최빈 신호 메시지 | scoreBreakdown, evidence.cross, convergenceDays |
| FlowChart | `shared/FlowChart.tsx:92` | 점수 곡선 + best/주의/**convergence 점** | per-day score/type |
| LifeTimeline | `shared/LifeTimeline.tsx:36` | 인생 전환점 타임라인 (년 전용) | `lifetimePivots` |
| BigDaysList | `shared/BigDaysList.tsx:34` | 큰 날 펼침 근거칩 (BigTurns/YearBigDays 내부) | convergence 근거 |

---

## 3. 중복의 실체 — "큰 날" 하나가 5군데

엔진이 만든 **"큰 날(bothSystems 수렴일)" 한 덩어리**가 한 화면에서 4~5번 그려짐:

| # | 어디 | 형태 |
|---|---|---|
| 1 | BigTurnsCard(월) / YearBigDaysCard(년) | 날짜 + meaning + 근거칩 (텍스트) |
| 2 | CrossInsightCard › **aligned 스팟** | 같은 날 상세 카드 (현재 `suppressAlignedSpot`로 숨김 처리됨) |
| 3 | CrossLineChart **emerald 점** | 같은 날 마커 |
| 4 | FlowChart **보라 "convergence" 점** | 같은 날 마커 |
| 5 | FlowSummary "두 흐름 차오르는 구간" | 같은 날 포함 구간 텍스트 |

잔여 중복 2개:
- **점수 흐름**: FlowChart(종합 1선) + CrossLineChart(사주/점성 2선) 두 차트.
- **신호 텍스트**: BigDaysList(근거칩) + CrossingSpot(상세) + MessageBlock(월 최빈 신호) 세 군데.

> 현 상태: 커밋 `5c052e6`에서 `suppressAlignedSpot`로 위 **2번 한 개만** 숨김. 마커·텍스트 중복은 그대로.

---

## 4. 제안 — "한 개념 = 한 집(주인)"

카드를 막 합치는 게 아니라, **데이터마다 전담 카드(주인)를 하나씩** 정해 역할을 분리한다.

| 데이터 | 전담 카드 (유일한 주인) | 다른 카드에서는 |
|---|---|---|
| 큰 정렬일 (aligned · bothSystems) | **BigTurns / YearBigDays** | 텍스트로 안 보임 |
| 엇갈리는 날 (opposed) | **CrossInsight** (BigTurns엔 없는 고유 정보) | — |
| 사주 vs 점성 2선 비교 | **CrossLineChart** | — |
| 종합 점수 곡선 | **FlowChart** | — |
| best / window / avoid | **KeyDates** | — |
| 영역 점수 | **ThemeFocus / YearFocus** | — |

### CrossInsightCard 정체성 재정의
> "BigTurns가 보여주는 '좋게 모이는 날'의 **반대편** — 사주와 점성이 **엇갈리는 날(opposed)** + 두 흐름의 **모양 비교(2선)**"

→ aligned 스팟 제거(이미 함)는 옳은 방향. 거기에:
- **차트 마커 정리**: 같은 큰 날이 FlowChart(보라) + CrossLineChart(emerald) 둘 다 찍힘
  → FlowChart는 **종합 흐름 + best/주의일만**, 큰 날 마커는 빼고 CrossLineChart에 양보. (또는 반대로 한 곳만)
- **MessageBlock**(월 최빈 신호)은 grain이 달라 의미는 있으나 시각적으로 무거우니 경량화.

### 권장 렌더 순서 (월)
PremiumHero → 전월대비 → **영역(ThemeFocus)** → **흐름(FlowChart + KeyDates)** → **BigTurns(좋은 큰 날)** → **CrossInsight(엇갈림 + 2선 비교)**
→ "좋은 날 ↔ 주의 날"을 짝으로 배치.

---

## 5. 작업 범위 옵션 (아직 미확정 — 설계만)

- **A. 마커 중복만**: 카드 구조 유지, FlowChart/CrossLineChart 큰 날 점 이중 표시만 제거. (소)
- **B. 역할 분리(추천)**: A + CrossInsight를 "엇갈림+2선" 전용으로 재정의, MessageBlock 경량화. (중)
- **C. 카드 재구성**: "좋은 큰 날 ↔ 주의 날" 한 섹션으로 묶고 순서 재배치. (대)

---

## 부록: 핵심 파일 레퍼런스

| 항목 | 파일 | 라인 |
|---|---|---|
| 엔진 진입점 | `src/lib/calendar-engine/interpretation/matcher.ts` | 34 |
| Interpretation 타입 | `src/lib/calendar-engine/interpretation/types.ts` | 94 |
| convergence 계산 | `src/lib/calendar-engine/derivers/convergence.ts` | 121 |
| 무거움 판정 | `src/lib/calendar-engine/derivers/convergence-heavy.ts` | 1 |
| themeScores | `src/lib/calendar-engine/derivers/themeScores.ts` | 45 |
| themeBreakdown | `src/lib/calendar-engine/derivers/themeBreakdown.ts` | 88 |
| keyEvents | `src/lib/calendar-engine/derivers/keyEvents.ts` | 23 |
| 년 convergence | `src/lib/calendar-engine/year-convergence.ts` | 77 |
| API 라우트 | `src/app/api/calendar/route.ts` | 146 |
| ImportantDate 타입 | `src/components/calendar/types.ts` | 44 |
| MonthDashboard | `src/components/calendar/premium/MonthDashboard.tsx` | — |
| YearDashboard | `src/components/calendar/premium/YearDashboard.tsx` | — |
| CrossInsightCard | `src/components/calendar/premium/shared/CrossInsightCard.tsx` | 65 |
| MonthInsights(ThemeFocus/KeyDates/BigTurns) | `src/components/calendar/premium/shared/MonthInsights.tsx` | 33 |
| YearInsights(YearFocus/YearBigDays) | `src/components/calendar/premium/shared/YearInsights.tsx` | 34 |
| FlowChart | `src/components/calendar/premium/shared/FlowChart.tsx` | 92 |
| CrossLineChart | `src/components/calendar/premium/shared/CrossLineChart.tsx` | 95 |
| BigDaysList | `src/components/calendar/premium/shared/BigDaysList.tsx` | 34 |
| LifeTimeline | `src/components/calendar/premium/shared/LifeTimeline.tsx` | 36 |

---

# 6. 시간 스케일 전체 — 인생전체 → 년 → 월 → 일 → 시

## 6-1. 현재 상태

최상위 오케스트레이터: `DestinyMatrixPlanner.tsx` (viewMode 상태로 화면 전환)

```
탭:  [📅 년]   [📅 월]   [📊 일]        ← 시(시간)는 탭 없음
       │         │         │
   YearDashboard │     DayInsights
       │         │      └─ 그 안에 24시간 차트(시)
       └ 월 클릭 → MonthDashboard
                   └ 날 클릭 → DayInsights(일+시)
```

| 스케일 | 엔진 | UI | 어떻게 | gap |
|---|---|---|---|---|
| 인생전체 | ✅ `deriveLifetimePivots` (토성회귀~29 / 목성회귀 12·24·36 / 카이런~50 + 대운) | △ 년 화면 안 작은 타임라인 | LifeTimeline 최대 6점 | **전용 화면 없음** |
| 년 | △ 월 12개 평균 (년 룰 0) | ✅ YearDashboard | 점수+12개월 흐름+큰날 | 년 전용 서사 없음 |
| 월 | ✅ 주력(룰 207) | ✅ MonthDashboard | 점수+서사+영역+키날 | 완성 |
| 일 | ✅ 룰 23 | ✅ DayInsights 4카드 | 평결/영역/근거/24h | 완성 |
| 시 | ✅ 24h 신호집계(룰 없음) | ✅ 일 화면 안 | 시간곡선+길흉시간 | **시 전용 진입 없음** |

**핵심 문제**: 엔진은 5단계 다 계산하는데, UI에서 **위쪽(인생전체)·아래쪽(시)이 갇혀 있음.**
- 인생전체 = 년 화면 구석 작은 타임라인. "내 인생 흐름" 메인 화면 없음.
- 시 = 일 화면 안에 파묻힘. 날 클릭 먼저 해야 보임.
- 중간(년↔월↔일)은 탭+드릴다운으로 매끄러움.
- 즉 **"인생전체 → 년" 연결이 끊김.**

## 6-2. 제안 — 줌(zoom) 연속체

탭에 **맨 위 [인생] 추가** → 전 생애부터 시까지 한 줄 줌:

```
[🌍 인생] → [📅 년] → [📅 월] → [📊 일] → (시는 일 안에서 펼침)
  전 생애     12개월     한 달      하루        24시간
 대운/회귀    큰 해들    큰 날들    길흉시간
```
각 단계: 큰 단위 클릭 → 작은 단위로 줌인 (일관).

## 6-3. 화면 와이어프레임

### 탭 바 (공통, 상단 고정)
```
┌─────────────────────────────────────────────┐
│  🌍 인생   📅 2026년   📅 6월   📊 6/2(화)    │   ← 현재 위치 강조, 좌→우 = 큰→작은
└─────────────────────────────────────────────┘
```

### ① 인생 (신규) — LifeTimeline 승격
```
┌─ 인생 전체 흐름 ─────────────────────────── 35세 ─┐
│  "큰 전환의 시기를 지나는 중"                      │
│                                                   │
│  과거 ─────●───────────●═════════◆═══════●──── 미래│
│           29세         36세      [42세]    50세    │
│        토성회귀     목성회귀    천왕성대립  카이런  │
│         (지남)       (지남)    ◀지금     (예정)    │
│                                                   │
│  ◆ 42세 · 2033 — 천왕성 대립 + 대운 전환 겹침      │
│     "삶의 방향을 다시 잡는 큰 매듭"   [이 해 보기▸]│
│  ● 29세 · 2020 — 토성회귀  …                       │
│  ● 50세 · 2041 — 카이런회귀 …                      │
└───────────────────────────────────────────────────┘
       ●=한쪽  ◆=양쪽겹침(큰 전환)  ◀지금=현재 구간
   전환점 클릭 → 그 해(년)로 줌인
```

### ② 년 (기존)
```
┌─ 2026년 ──────────────────────── 72/100  B+ ─┐
│  "성장과 일이 함께 오르는 해"        합치 68% │
│  ▁▂▃▅▆▇▆▅▃▂▃▅  ← 12개월 흐름 (월 클릭→줌인)   │
├─ 올해 큰 날 ──────────────────────────────────┤
│  3/14 연애·성장 기회 / 8/2 일 전환 …          │
├─ 영역 ─ 성장▇ 일▆ 돈▅ 연애▃ 건강▂            │
└───────────────────────────────────────────────┘
```

### ③ 월 (기존, 중복 정리 후)
```
┌─ 6월 ───────────────────────── 70/100  B ─┐
│  "이번 달은 …"            전월대비 ▲+4     │
│  영역바 / 키날(best·구간·피할날)            │
│  ▁▂▅▇▆▃▂▅  ← 일 흐름 (날 클릭→줌인)         │
├─ 좋은 큰 날 (BigTurns) ── 6/14 …            │  ← 정렬일 전담
├─ 엇갈리는 흐름 (CrossInsight) ── 6/21 …     │  ← opposed 전담(중복 제거)
└─────────────────────────────────────────────┘
```

### ④ 일 + 시 (기존)
```
┌─ 6/2 (화) ─────────────────── 64/100  B ─┐
│  평결 + 사주▮▮▮ / 점성▮▮ 축                │
│  영역 5바 + 패턴칩                          │
│  왜? — 일진 서사 + 사주/점성/신살 근거       │
├─ 시간 흐름 (24h) ─────────────────────────┤
│  00 ──▁▂▃▅▆▇▆▅▃▂── 23   ◀지금 14시        │
│  좋은 시: 9~11시  /  피할 시: 19~21시        │
│  지금 하면 좋은 것 · 피할 것                 │
└───────────────────────────────────────────┘
   ← 시(時)는 여기서 펼침 (전술 단위라 위치 맞음)
```

## 6-4. 작업 규모

- 신규: **인생 탭 + LifeTimelineDashboard**(기존 LifeTimeline 데이터 재사용, 전 화면용으로 확대 + 전환점 클릭→년 줌인).
- 기존: 탭 바에 [인생] 추가, viewMode에 `'lifetime'` 추가.
- 엔진: 추가 작업 거의 없음 (`lifetimePivots` 이미 계산됨 — 단, 현재 monthly scope에서만 채워지므로 lifetime 진입 시에도 받도록 데이터 경로만 확인 필요).
