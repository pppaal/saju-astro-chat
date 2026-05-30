# 캘린더 v2 일원화 — 갭 분석 (마이그레이션 단계 1)

> 목적: 구 `calculateYearlyImportantDates`(destiny-map 계열, "v3" 점수)가 만드는
> `YearlyImportantDate` 필드를, calendar-engine **v2** `CalendarCell` 만으로 재생산
> 하려면 무엇이 비는지 1:1로 확정한다. 이 표가 `cellsToYearlyDates()` 어댑터의
> 명세서가 된다.

## 0. 두 모델의 본질

| | 구 (yearlyDates) | v2 (calendar-engine) |
|---|---|---|
| 단위 | `YearlyImportantDate` (날짜당 1개, 365개) | `CalendarCell` (day/hour 셀) |
| 점수 | `score`(v3 blend) + `displayScore`(v2 주입) | `derivedScore` (polarity 가중합, 0~100) |
| 테마 | `EventCategory[]` (7종) | `themeScores` (5종, 0~100) |
| 등급 | `grade` 0~5 (`scoreToGrade`) | 없음 — 점수만 |
| 근거 | factorKeys / recommendationKeys (i18n 키) | `signals[]`(layer·polarity·evidence) + `topReasons`/`cautions` |
| 서사 | titleKey/descKey (룰 + 점수밴드) | `matchedPatterns`(headline/action) + `interpretation` + ganji |

핵심: **현재 응답은 하이브리드** — 구가 골격(grade/categories/title/factors)을 만들고,
v2가 그 위에 displayScore·themeScores·matchedPatterns·engineSignals·monthlyInterpretation을
덧입힌다. 단계 1은 v2가 **골격까지 스스로** 만들 수 있게 만드는 것(라우트는 안 바꿈).

## 1. 필드별 갭 표

테마 키 매핑(고정):

```
v2 themeScores   love   money   career   health   growth
구 EventCategory  love   wealth  career   health   (없음)   + travel · study · general(v2에 없음)
```

| 구 `YearlyImportantDate` 필드 | v2 원천 | 갭 | 난이도 |
|---|---|---|---|
| `date` | `cell.datetime` slice(10) | — | 자명 |
| `score` / `displayScore` | `cell.derivedScore` | — (이미 주입 경로 존재) | 자명 |
| `grade` | `scoreToGrade(derivedScore)` | **함수 호출만** — scoreToGrade 이미 존재 | 낮음 |
| `ganzhi` | `computeDayStem/Branch(date)` | 헬퍼 이미 있음 | 낮음 |
| `transitSunSign` | astroProfile.sunSign(요청 단)·또는 transit | 요청 컨텍스트에서 | 낮음 |
| `categories` | `themeScores` 상위 테마 → EventCategory | **매핑 필요**: money→wealth, growth/ travel/study/general 손실 보정 규칙 | 중간 |
| `themeScores` | `cell.themeScores` | — (이미 부착) | 자명 |
| `matchedPatterns` | `cell.matchedPatterns` | — (이미 부착) | 자명 |
| `sajuFactorKeys` / `astroFactorKeys` | `cell.signals` where source=saju/astro | 신호명→표시 텍스트 (topReasons 재사용 가능) | 중간 |
| `recommendationKeys` / `warningKeys` | `matchedPatterns.action` + `topReasons`/`cautions` | 조립 + 점수밴드 카운슬링 보존 | **높음** |
| `titleKey` / `description` | `matchedPatterns.headline` + `interpretation` + ganji | 조립 (대부분 v2에 원료 있음) | **높음** |
| `crossVerified` / `confidence` / `crossAgreementPercent` / `crossCheck` | `signals` source 분포 + `convergence.bothSystems` | **새 공식 필요** — v2는 bothSystems(불리언)만, %·confidence 없음 | **높음** |
| `scoreBreakdown`(sajuAxis/astroAxis/axisAgreement) | `signals` polarity를 source별 합산 | **축 분해 신설** (원료는 signals에 있음) | 중간 |
| `longCycleContext`(daeun/sewoon/wolwoon/iljin + sibsin) | layer=decadal/yearly/monthly/daily 신호 evidence(sibsin·pillars) | 조립 — 데이터는 신호에 있음 | 중간 |
| `cycleInteractions`(충/합/형) | `saju-hyeongchung` extractor 신호 | 조립 | 중간 |
| `dailyGanjiNarrative` | ganji + sibsin (route가 이미 생성) | — | 자명 |

## 2. v2가 이미 더 가진 것 (구에 없음 — 마이그레이션의 이득)

- `themeScores` 5테마 0~100 바 — 이미 augment
- `matchedPatterns` (명명된 신호 조합 + headline/action) — 이미 augment
- `engineSignals` (hourly 레이어) — 이미 augment
- `monthlyInterpretation` (narrative + themeBreakdown + convergence) — 이미 top-level
- **`lifetimePivots` (인생 전체 층)** — `deriveLifetimePivots`, matcher monthly scope에서 생성되나 **아직 응답에 미노출**
- 6개 레이어 전체 신호(decadal→hourly) — 현재 hourly만 응답에 부착

## 3. 어댑터 설계 결정 (확정 필요)

`cellsToYearlyDates(cells, natal, ctx, locale)` 가 위 표를 채운다. 세 군데 설계 판단:

### D1. 교차검증 %·confidence 공식
구는 saju축·astro축 정렬도로 `crossAgreementPercent`(0~100)와 `confidence`를 만든다.
v2엔 `bothSystems`(불리언)만 있음. 선택:
- **(a) 신호 source 분포 기반 신설** — 그날 활성 신호의 saju polarity 합 vs astro polarity 합의 부호/크기 일치도를 %로. (권장 — v2 신호에서 직접 도출, 결정적)
- (b) 구 `crossCheck` 계산 로직을 yearlyDates에서 추출해 그대로 재사용 (동등성↑, 결합도↑)

### D2. categories 매핑 (5테마 → 7카테고리)
- money→wealth, career→career, love→love, health→health 고정.
- `growth` → ? (study? general?) / `travel`·`study`·`general` 은 v2 테마에 없음.
- **(권장)** growth→study, 그리고 임계 미달 시 general 폴백. travel은 당분간 미생성(구에서도 희소).

### D3. title/description·recommendations/warnings
- **(권장)** v2 `interpretation`(monthly) + `matchedPatterns.headline/action` + ganji + 점수밴드
  카운슬링을 조립. 구의 점수밴드 카운슬링 로직(`buildDayDescriptionSuffix`)은 점수 의존이라
  v2 derivedScore로 그대로 재사용 가능 → 추출해 공유.

## 4. 검증 전략

단계 0 골든(`migration-baseline.json`)이 **점수·등급 분포 + categories + 커버리지**를 고정.
어댑터 산출을 구 출력과 **분포 비교**(정확 일치 X — 텍스트는 다를 수 있음):
- `grade` 분포(0~5 히스토그램) ±오차 허용
- `displayScore` 날짜별 동일(이미 v2 주입이라 일치해야 함)
- `categories` 다수결 도메인 일치율 측정
- 커버리지(themeScores/patterns/signals) = 365/365 유지

## 5. 단계 1 구현 중 발견 — 현재 하이브리드의 월별 점수 불일치 ⚠️

어댑터(`cellsToYearlyDates`)를 단계 0 골든과 대조하다 확인한 **현재 프로덕션 동작**:

> 라우트는 v2 `derivedScore` 를 **"오늘" 기준 ±1달(prescoreMonths)만** displayScore 로
> 쓰고, **나머지 9달은 구 v3 blend 점수**를 displayScore 로 쓴다.

골든(생성일 2026-05-30) 대조 결과 — 어댑터(전 달 v2) vs 골든:

```
2026-04:30/30  2026-05:31/31  2026-06:30/30   ← v2 였던 달: 100% 일치
그 외 9달: ~0/31                                ← v3 였던 달: 의도적 변경
```

즉 사용자는 **현재월 ±1만 진짜 v2 점수**를 보고, 다른 달을 클릭하면 **낡은 v3 점수**를
본다(점수↔서사 출처가 달라 미묘한 불일치). 어댑터는 12달 전부 v2 라 이 불일치를
없앤다 — **이것이 마이그레이션의 핵심 이득 중 하나**. 단계 2 라우트 전환 시 prescore
±1달 분기를 제거하고 전 달 어댑터로 일원화한다.

검증 전략(§4) 보정: 골든 strict 동등성은 **prescore 윈도우(현재월 ±1) 3달에만** 적용.
나머지 9달의 점수 변화는 "의도된 개선"으로, 단계 2에서 전/후 분포를 비교·문서화한다.

---
*단계 1 어댑터는 라우트를 바꾸지 않는 순수 추가(additive). 라우트 전환은 단계 2.*
