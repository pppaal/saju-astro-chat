# 사주 계산 컨벤션 (Saju Conventions)

이 문서는 **사주 계산 코드가 따르는 학파·관례**를 한 곳에 정리한 단일 출처(SSOT)다.
새 코드를 추가하거나 외부 도구·만세력과 결과가 다를 때, *이 문서가 우리 코드의 정답 기준*이다.

> **한 줄 요약:** 정통 자평파(子平命理) + 절기 기반(입춘=연시작, 12절기=월 전환) + 평균태양시 시진(UT + 경도×4분,
> 경도 미상은 존 기준 경도 — 서울 126.978) + 4길성 중심 신살(참고 수준) + 억부·조후 용신 + 양남음녀 순역행 +
> 글로벌 _만 나이_ 표시.

---

## 적용 범위

이 컨벤션은 다음 코드 묶음 전체에 적용된다:

- `src/lib/saju/*` — 사주 코어 (saju.ts, unse.ts, core/sibsin.ts, shinsal.ts, yongsin.ts, geokguk.ts, strengthScore.ts, daeunAge.ts, cycleRelations.ts, hyeong.ts …)
- `src/lib/calendar-engine/extractors/saju-*` — 캘린더 엔진의 사주 시그널 추출기
- `src/lib/destiny/`, `src/lib/compatibility/` 의 saju 관련 포맷터·해석기

새 사주 모듈을 추가할 때 이 문서와 _다른_ 관례가 필요하면, **별도 모듈로 분리하지 말고** PR로 컨벤션 자체를 갱신한다. 같은 결정이 여러 곳에 흩어지는 게 모든 회귀의 원인이다.

---

## 1. 자시(子時) 처리 — 23:00-01:00 출생

**선택:** 子時는 23:00–01:00 의 한 시진. **야자시(夜子時)/조자시(朝子時) 별도 구분 룰 없음** (정통 자평파).

- **일주(日柱)는 자정(00:00, 민용일 civil day) 경계로 바뀐다.** 따라서
  - 23:00–24:00 출생 → _그날_ 일주 유지 + 子時(時干은 그날 일간에서 도출)
  - 00:00–01:00 출생 → _다음날_ 일주 + 子時
  - 골든 예: `1990-12-31 23:59 KST → 日 庚午 · 時 丙子`, `1991-01-01 00:01 KST → 日 辛未 · 時 戊子`
- 시진 경계는 **평균태양시(= UT + 출생지 경도 × 4분)의 정시 경계** 하나다 — 子 = 23:00–01:00 평균태양시. 서울(126.978°E)은 시계로 子 = 23:32–01:32, 부산(129.08°E)은 23:24–01:24. (시진 경계일 뿐, 일주는 위처럼 민용일 기준.)
- **경도 미상 = 존 기준 경도** (OD-2): `Asia/Seoul` = 126.978 (앱의 서울 기본값과 같아 경도 없는 서울 출생과 서울 기본값 출생이 _구조적으로_ 같은 시주), 그 외 존 = tzdata `zone1970.tab` 대표 도시, `Etc/*` = offset × 15. 존 표준자오선에서 60° 넘게 떨어진 경도(LA 타임존 + 서울 경도 같은 잘못된 짝)는 버리고 존 기준 경도를 쓴다(OD-14).
- 서머타임·KMT(1954-03-21 ~ 1961-08-10, UTC+8:30)는 따로 보정하지 않는다 — 출생 instant 의 실제 UTC offset 이 이미 담고 있고, 평균태양시는 UT 에서 바로 나온다.
- **출생 instant** = [`resolveBirthInstant`](../datetime/resolveBirthInstant.ts) (OD-3, RFC 5545 §3.3.5) — 사주와 점성(`natalToJD`)이 같은 함수를 쓴다. 겹치는 벽시계(서머타임 해제)는 첫 번째 instant, 없는 벽시계(서머타임 시작·표준시 변경 공백)는 공백 _직전_ offset 으로 읽는다. 일주는 이 instant 에서 다시 구하지 않고 **입력한 민용 날짜**다 — 자정에 걸친 공백(1961-08-10 00:15 서울 → 乙亥, 2018-11-04 00:30 상파울루 → 庚子)도 입력한 날의 일주.

**위치:** 시진 경계 [`saju.ts`](./saju.ts) `HOUR_RANGES` + [`timezone.ts`](./timezone.ts) `meanSolarMinuteOfDay`·`solarTimeCorrectionMinutes`(보정 SSOT)·`zoneReferenceLongitude`, 일주 경계는 [`dayPillar.ts`](./dayPillar.ts)(민용일 JDN). 캘린더 시진 신호([`calendar-engine/extractors/saju-hour.ts`](../calendar-engine/extractors/saju-hour.ts) `hourSegmentsForLocalDay`)도 같은 규칙이다 — 같은 `solarTimeCorrectionMinutes` 로 민용일 하루 [00:00, 24:00) 를 시진으로 자르고, 자정을 넘는 子時는 이른·늦은 두 조각으로 나눠 _둘 다 그날 일간_ 의 時干(五鼠遁)을 쓴다(엔진 감사 E9 · X3). 경계는 평균태양시가 홀수 정시를 지나는 _절대 instant_ 이고, 창은 그 instant 의 _그 순간_ offset 으로 옮긴 벽시계다 — 서머타임 전환일에도 하루 내내 맞고(재감사 TP-9), 겹치는 벽시계 분은 출생 instant 와 같이 첫 번째 instant 로 읽어 어느 벽시계 분이든 캘린더 시진 = 본명 시주다. 전환 없는 날은 `hourSegmentsForCivilDay`(보정분 하나)와 같다. Day 화면 시진 줄은 이 실제 창(서울 子 23:32–01:32)을 보여 주고, 상승궁은 그 창 한가운데 순간에서 구한다(재감사 TP-8). 골든: `tests/lib/saju/determinism-golden.test.ts`, `tests/lib/saju/doctrine-dayBoundary.test.ts`, `tests/golden/saju.golden.test.ts` (G10·G12·G24–G26c·G28–G30).

> ✅ **2026-10 수정 — 민용일 분리.** 2026-06-06 에 "네 기둥 모두 보정된 instant
> 기준" 으로 통일한 변경이 일주까지 끌고 와 위 민용일 규칙을 깼다. 경도를 넘기면
> LMT 만큼 일 경계가 밀려 위 골든(`1991-01-01 00:01 → 日 辛未`)이 日 庚午(전날)로
> 나왔다. 영향 폭 = |LMT 보정| — 서울 32분 · 부산 24분 · 인천 33분, 표준자오선
> 동쪽(도쿄 +19분)은 자정 직전. 하루 24~33분 ≈ 출생의 약 2.2%.
>
> 기존 골든이 `longitude` 를 한 번도 넘기지 않아 4개월간 안 잡혔다.
>
> **수정:** [`saju.ts`](./saju.ts) 가 일주만 민용일 `civilY/civilM/civilD` 를 쓴다 —
> 일주는 60갑자 *달력 순환*이고 입춘·절기는 *천문 사건*이라는 구분이다.
> 가드: `tests/lib/saju/doctrine-dayBoundary.test.ts` (경도 × 하루 전수)
>
> ✅ **2026-11 수정 — 진경도 보정은 시주에만 (OD-1, 엔진 감사 E1).** 2026-10 수정은
> "년·월·시는 보정된 `effectiveDateTime` 유지" 였다. 그런데 절입은 _하나의 절대
> instant_ 라서, 보정분만큼 옮긴 시각을 절입 instant 와 비교하면 출생이 절입을
> 건너뛴 것처럼 판정된다 — 서울(lon 126.978, −32분)은 절입 후 2~32분 출생이 전
> 월·전 년(입춘)으로, 도쿄(+19분)는 절입 직전 출생이 다음 월로 뒤집혔고, 대운
> 방향·대운수도 함께 바뀌었다. 답이 timezone 라벨에 의존하기까지 했다(같은 instant
> 2020-02-04T11:00Z · lon 75.99 → Asia/Shanghai 己亥, Asia/Urumqi 庚子).
>
> **지금 규칙:** 시주 lookup 만 평균태양시(`meanSolarMinuteOfDay`)를 쓴다. 년주·월주·
> 대운수는 생 UT 출생 instant(`birthDateTime`)를 절입 instant 와 비교한다(§2·§3·§13·
> §15). 일주와 만 나이 생일은 민용일(§14).
> 가드: `tests/lib/saju/solarTermFrame.test.ts` (1900–2050 전 절기 ±5분),
> `tests/golden/saju.golden.test.ts` (G03·G05·G06·G07·G21·G23·G25·G27)
>
> ✅ **2026-11 수정 — 출생 instant·시각 보정 한 경로 (엔진 감사 E8: F4·ASTRO-7·F7·F2·F3·
> SAJU-2·SAJU-3·SAJU-6·SAJU-9).** 예전엔 경도가 없으면 시주가 별도 규칙을 탔다 — 한국은
> 고정 'LMT +30분' 표(子=23:30–01:30), 손으로 적은 한국 DST 윈도우(1948–51·1987–88 은
> DST 를 뺀 뒤 정시 경계라 KST 기준 LMT 를 잃었다), KMT 분기, 그리고 1월/7월 offset 중
> 작은 쪽을 "표준시"로 잡는 DST 추정(서울 1954-01~03·1961-08~12, 모스크바 2014-11 처럼
> 표준 offset 이 연중 바뀐 해에 가짜 DST 30~60분). 같은 서울 출생이 경도 유무에 따라
> 시주·대운수가 달랐다(1995-06-10 23:31: 경도 없음 庚子 d8, 126.978 辛亥 d9). 사주
> (date-fns-tz)와 점성(dayjs.tz)은 공백·겹침 시각을 서로 다르게 풀었고, dayjs 는 겹침
> offset 을 서버의 현재 DST 상태로 골랐다. **수정:** 위 규칙 하나 — 출생 instant 는
> `resolveBirthInstant`, 시주는 UT + 경도 × 4분(경도 미상은 존 기준 경도), 일주는 입력한
> 민용일. 시각 문자열은 `parseHourMinute` 하나로 읽는다('9:05' ≡ '09:05').

---

## 2. 연주(年柱) 시작 — 입춘(立春)

**선택:** 양력 1/1 아님, 음력 설날도 아님. **입춘 통과 전엔 작년의 사주년.**

**판정 기준 = 생 UT 출생 instant vs 입춘 instant** (OD-1). 입춘은 태양 시황경 315° 에
닿는 하나의 절대 instant 이고, 진경도(평균태양시) 보정은 이 비교에 섞지 않는다(시주
전용, §1). `year` 는 출생지 timezone 의 민용 연도.

```ts
const ipchunUTC = getSolarTermKST(year, 2)
const sajuYear = birthDateTime.getTime() < ipchunUTC.getTime() ? year - 1 : year
```

**위치:** [`saju.ts`](./saju.ts) `calculateSajuData` 의 '연기둥' 블록 (`sajuYear`)

**경계 케이스:** 1985-02-04 06:00 KST 출생은 입춘(06:12 KST) 12분 전 → 사주년 1984년(甲子). [`tests/lib/saju/determinism-golden.test.ts`](../../../tests/lib/saju/determinism-golden.test.ts) 의 boundary cases 가 이 동작을 잠금. 경도를 넘겨도 같다 — 2024-02-04 17:40 서울(입춘 17:27 + 13분, lon 126.978) → 甲辰년 丙寅월, 역행 대운 乙丑부터 (골든 G03).

---

## 3. 월주(月柱) 전환 — 12절기(節氣)

**선택:** 양력 월 아님. **12절기로 월 전환** — 입춘=寅월, 경칩=卯월, 청명=辰월, … 소한=丑월.

- 각 양력 월의 *첫 절기*가 통과해야 그 사주월로 진입
- 통과 전이면 사주월은 _이전 절기-월_
- 통과 여부는 §2 와 같이 **생 UT 출생 instant vs 절입 instant** 로 판정 (경도 보정 미적용)

**위치:** [`saju.ts`](./saju.ts) `calculateSajuData` 의 '월기둥' 블록 (`sajuMonth`·`sajuTermYear`), [`unse.ts:getMonthlyCycles`](./unse.ts) (`useSolarTerms` 플래그)

**기본값:** `CALCULATION_STANDARDS.saju.useSolarTermsForMonthlyCycles = true` ([`config/calculationStandards`](../config/calculationStandards.ts))

### 3.1 캘린더 날짜의 세운·월운 — 절입일 규칙 (재감사 G2)

출생 instant 가 아니라 _날짜_(캘린더 셀, 상담사의 '오늘')에 세운·월운을 붙일 때는 한 규칙이다.

- **날짜 = 출생지 시간대의 민용 날짜.** 캘린더 셀이 그렇고(`loadTierData` 의 오늘 = `getNowInTimezone(출생 tz)`), 창은 그 현지 벽시계에 `Z` 를 붙인 떠 있는 ISO 다(§1 시진과 같은 틀).
- **절입일 규칙 — 節/立春 이 든 그 현지 날이 새 기둥을 받는다.** 날짜 하나는 그날이 _끝날 때_ 걸린 세운·월운을 싣는다(오너 결정 17 기본값). 절입은 하나의 절대 instant(§15)이고, 그 순간을 셀 시간대의 민용 날짜로 읽은 날이 경계다.
- 立春 은 寅월을 여는 節이라 **세운과 월운이 같은 날 함께 바뀐다** — 한 날짜에 세운이 둘이거나, 새 세운에 옛 丑월이 붙지 않는다.
- 예: 立春 2026-02-03T20:01:54Z = 서울 02-04 05:02 → 서울 02-03 은 乙巳년 己丑월, 02-04 부터 丙午년 庚寅월. 같은 순간이 LA 로는 02-03 12:02 → LA 는 02-03 부터 丙午년. 小寒 2025-01-05T02:32Z = LA 01-04 18:32 → LA 01-04 부터 丁丑월. 立冬 2026-11-07 18:52 KST → 서울 11-01~06 은 戊戌월, 11-07 부터 己亥월.
- **대운 창 = 만 나이 생일 경계**(§14): 대운 칸은 시작 나이 민용 생일에 열리고 다음 칸 생일 전날 닫힌다(평년의 2/29 생은 3/1). 1/1·2/4 고정 창은 쓰지 않는다. 첫 대운 전에는 창이 없다.
- **상담사 '오늘'도 같은 규칙** (재감사 G3 · TP-4 · TP-5 · CNS-1). 날짜 D 는 보는 사람의 현지 민용 날짜다(`resolveViewerTimezone` — 보는 사람 tz, 없으면 출생 tz; TP-6 판정대로 유지). 그 날짜의 세운·월운은 `pillarsForLocalDate(D, 출생 tz)` 라 캘린더의 D 셀과 같고, 대운·만 나이·프로펙션·트랜짓·리턴은 출생 tz 의 D 정오(`counselorDayAnchor` — 캘린더 트랜짓 표본과 같은 순간)로 잰다. 예전엔 `Date.UTC(D, 12)` 를 순간으로 써서 절입이 그 뒤에 든 날마다 캘린더와 월운·세운이 갈렸고(2025–2030 節 앞뒤 144일 중 서울 12·LA 57·시드니 4·키리티마티 5일), UTC+12..+14 에선 대운이 생일 하루 전에, 트랜짓이 다음 현지 날 하늘로 바뀌었다. Life '올해' 세운 줄(`assembleLifetime`)도 같은 헬퍼를 읽는다.

**SSOT:** [`calendar-engine/periodPillars.ts`](../calendar-engine/periodPillars.ts) — `pillarsForLocalDate(y, m, d, tz)`(날짜 하나의 세운·월운), `monthWindows`·`yearWindows`(절기월·사주년 창), `daeunWindows`(대운 창, 목록이 범위 끝 만 나이를 못 덮으면 `daeunCellsToCover` 로 잇는다). 간지 산술은 [`datePillars.ts`](./datePillars.ts) `yearPillarOfSajuYear`·`monthPillarOfTerm`. 캘린더 사주 기간 추출기(saju-pillar·twelve-stage·jijanggan·yongsin·johu-yongsin·gongmang·tonggeun·applied-pattern), 월 티어 머리말(`woolun`·`woolunSpans`), 상담사 기간 블록(`counselorContext` → `currentUnse`), Life '올해' 줄이 이것만 읽는다. 예전엔 다섯 추출기가 양력 달마다 15일의 절기월을 1일~말일에 도장했고(1일~절입 전날이 다음 달 월운), 세운·월운 창을 UTC 날짜로 잘라 서반구는 절입 다음 날까지 옛 달, 동반구는 立春 전날에 세운 둘이었으며, 용신·통근 대운은 1/1 에 바뀌었다(재감사 TP-2·TP-3·TP-7). 가드: [`tests/lib/calendar-engine/periodPillars.test.ts`](../../../tests/lib/calendar-engine/periodPillars.test.ts) (서울·LA·시드니·호놀룰루·오클랜드 × 2025–2030 모든 節). 상담사 = 캘린더 셀: [`tests/lib/destiny/counselorCalendarParity.test.ts`](../../../tests/lib/destiny/counselorCalendarParity.test.ts) (서울·LA·시드니·오클랜드·키리티마티 × 2025–2030 모든 節, 대운 생일 경계), 트랜짓: `tests/lib/destiny/counselorTodayTransits.real.node.test.ts`.

---

## 4. 일주(日柱) 자정 — 출생지 timezone 의 민용일

**선택:** 일주는 **출생지 timezone 의 민용일(civil day) 자정**에 바뀐다 — 입력한 출생 날짜 그대로를 Julian Day Number(JDN)로 센다(2000-01-01 = 戊午 기준, 결정적). KST 자정이 아니고, 진경도(평균태양시) 보정도 넣지 않는다(§1, OD-1). 출생 instant 에서 날짜를 다시 읽지도 않는다 — 자정에 걸친 서머타임 공백도 입력한 날의 일주다(§1).

- 예: `1990-06-15 14:30 America/Los_Angeles` → 日 辛亥 (LA 민용일 06-15). 같은 instant 는 KST 로 06-16 06:30 이라 'KST 자정' 규칙이면 壬子 가 된다 — 그 규칙은 쓰지 않는다.
- 경도(`longitude`)는 시주에만 들어간다(§1·§5). 서울 00:00–00:32 출생도 경도와 무관하게 그날 일주.

**위치:** [`saju.ts`](./saju.ts) `calculateSajuData` 의 '일기둥' 블록 (`computeDayPillarIndices(civilY, civilM, civilD)`), [`dayPillar.ts`](./dayPillar.ts) (JDN 계산)

**자정 경계 잠금:** [`determinism-golden.test.ts`](../../../tests/lib/saju/determinism-golden.test.ts) — 1990-12-31 23:59 vs 1991-01-01 00:01 KST 두 케이스, LA 1990-06-15 14:30 → 辛亥. [`doctrine-dayBoundary.test.ts`](../../../tests/lib/saju/doctrine-dayBoundary.test.ts) — 경도 × 하루 전수, 도쿄 23:50·LA 22:00 이 현지 민용일 JDN 과 같음.

> ℹ️ 2026-11 이전 이 절은 'KST 자정 + 선택적 경도 보정'이라고 적혀 있었다. 코드는 2026-10 수정(§1) 이후 줄곧 출생지 민용일이었고, 문서만 남아 있었다(엔진 감사 F6).

---

## 5. 시주(時柱) 경계

**선택:** 위 1번(자시)과 같은 정시 경계를 평균태양시(UT + 경도 × 4분)에 적용한다. 경도 미상은 존 기준 경도(§1, OD-2). 옛 '한국 LMT +30분' 표는 2026-11 삭제(엔진 감사 E8).

- **시간 미상(`birthTimeUnknown=true`) = 삼주(三柱) 분석** (OD-5, 엔진 감사 E7 · SAJU-4 · SD-10). 시주는 판정에 넣지 않는다:
  - `collectSajuFacts({ birthTimeUnknown })` → `facts.pillars.time = null`, `facts.timeUnknown = true`. `calculateSajuData(…, now, { timeUnknown })` 의 `fiveElements` 는 년·월·일 **6글자**이고, `timePillar` 는 정오 앵커로 채운 *자리표시*다(`result.timeUnknown = true`) — 판정·표시에 쓰지 말 것.
  - 오행 개수·강약·용신·격국·관계(합충형파해·원진·공망 hit)·신살·12운성·관살혼잡·통근·십성 개수 모두 **년·월·일 세 기둥**만 본다. 엔진 입력 타입 `MaybeTimeless<…>`(time 이 null/생략)과 순회 헬퍼 `presentPillars`(stemBranchUtils) 하나로 통일.
  - 위치 가중(`strengthScore.POSITION_WEIGHTS`, 오행 점수)은 있는 기둥 합으로 재정규화한다: 0.15/0.30/0.35 ÷ 0.80.
  - 글자 _수_ 합산(강약 코어 §11, 통근력, 병약·통관·종격·특수격·화신 우세 임계)은 재분배하지 않는다. 강약은 시드 고정 실제 생일 1000건에서 무보정 삼주 점수가 같은 날 12시진 평균에 가장 가깝다(평균절대오차 1.6, ×1.25 는 2.6). 개수 임계는 시주를 더해야 늘 뿐이라 삼주에서 성립한 외격은 어느 시주로도 성립한다(모르는 시주로 외격을 만들지 않는 보수 규칙).
  - 화기격국의 인접 합 상대는 월간만 본다(시간 미상).
  - 운(대운·세운·월운·일진)과 본명의 충·합·형 교차도 시주를 뺀다(`currentUnse`·상담사 교차·캘린더 `saju-hyeongchung`·`saju-jijanggan`). 4주 패턴표(`saju-pattern`)는 판정하지 않는다.
  - 점성은 `placeUnreliable`(시각 _또는_ 출생지 미상)로 ASC·MC·하우스와 그 파생(프로펙션, lot·ZR, Almuten, 앵글 대상 어스펙트)을 막는다 — 캘린더는 `buildCalendar` 가 `isPlaceDependentSignal` 신호를 거르고 컨텍스트의 lot·ZR·Almuten 을 비운다(CALCULATION_SPEC §6).
  - 가드: `tests/lib/destiny/sajuFacts.timeUnknown.test.ts`
- **시간 미상 계산 앵커 = 정오(12:00)** — SSOT [`birthTimeAnchor.ts`](./birthTimeAnchor.ts) (`resolveBirthTimeAnchor`/`isBirthTimeUnknown`). 앵커는 **년·월·일주와 대운을 고정하는 데만** 쓴다(삼주 분석의 시주로 쓰지 않는다). **미상이면 넘어온 시각 문자열은 무시한다** — `calculateSajuData(…, { timeUnknown: true })` 와 `collectSajuFacts({ birthTimeUnknown: true })` 는 `'03:00'`·`'23:30'`·`''` 모두 정오로 바꿔 계산한다(재감사 SP-2 · SDR-08: 예전엔 빈 문자열만 바꿔, 1988-07-07 서울 남자 `'03:00'`+미상이 小暑 전으로 떨어져 月 戊午·대운수 1, 정오는 己未·대운수 10). 빈 시각 문자열도 정오로 앵커하고 미상으로 본다 — `calculateSajuData('1988-07-07', '')` 는 예전 00:00 앵커로 月 戊午 였으나 이제 '12:00' 과 같은 己未(엔진 감사 F15). 절입일엔 앵커 시각이 절입 전/후를 갈라 **월주·년주**가 달라진다(자정 앵커는 대개 절입 전) — 서비스마다 앵커가 다르면 같은 사람의 사주가 갈린다. 실제로 궁합/상담사/캘린더 세션 경로가 `'00:00'` 앵커를 써서 통합리포트(정오)와 다른 사주를 내던 버그의 원인. 정오는 ASC/하우스 범위의 중간값이기도 하다. 시간 미상 입력을 엔진(사주·점성)에 넣는 모든 경로는 이 헬퍼를 거칠 것.
  - ℹ️ **2026-10 이후 일주는 앵커와 무관하다** (§1 민용일 분리). 예전엔 자정 앵커가 일주까지 전날로 밀었고 그게 정오 앵커 근거의 절반이었는데, 그 밀림 자체가 버그였다. 남은 근거(절입일 월주·ASC 중간값)로 정오 앵커는 유지한다. 가드: `tests/lib/saju/birthTimeAnchor.test.ts`
- **미상 판정은 tri-state** — 명시 플래그(`birthTimeUnknown`: UserProfile/SavedPerson DB 컬럼, URL `birthTimeUnknown=1|0`·`tu=1|0`, 폼 상태)가 boolean 이면 신뢰한다: `false` + `'00:00'` 은 **실제 자정 출생**(자정 그대로 계산, 시주 유효). 플래그 미보존(레거시 행/링크, NULL)은 `'00:00'`=미상 휴리스틱으로 폴백.

**위치:** [`saju.ts`](./saju.ts) 시기둥 블록·`CalculateSajuOptions`, [`sajuFacts.ts`](../destiny/sajuFacts.ts) 및 호출처

---

## 6. 지장간(地藏干) — 정기·중기·여기 3층

**선택:** 정통 12지지 지장간. 子·卯·酉 = 정기만(왕지 단순화), 午 = 丙(여기)·己(중기)·丁(정기) 3층(왕지지만 己土 중기를 품는 정통 구성), 나머지 8지지 = 3층.

<!-- 이 표는 tests/lib/saju/conventions.docSync.test.ts 가 constants.ts JIJANGGAN 과 대조한다. 코드와 함께 고칠 것. -->

| 지지 | 여기 | 중기 | 정기 | 층수 |
| ---- | ---- | ---- | ---- | ---- |
| 子   | —    | —    | 癸   | 1    |
| 丑   | 癸   | 辛   | 己   | 3    |
| 寅   | 戊   | 丙   | 甲   | 3    |
| 卯   | —    | —    | 乙   | 1    |
| 辰   | 乙   | 癸   | 戊   | 3    |
| 巳   | 戊   | 庚   | 丙   | 3    |
| 午   | 丙   | 己   | 丁   | 3    |
| 未   | 丁   | 乙   | 己   | 3    |
| 申   | 戊   | 壬   | 庚   | 3    |
| 酉   | —    | —    | 辛   | 1    |
| 戌   | 辛   | 丁   | 戊   | 3    |
| 亥   | 戊   | 甲   | 壬   | 3    |

**구성·정기 lookup:** [`constants.ts:JIJANGGAN, JIJANGGAN_ORDERED`](./constants.ts) — 어느 지지가 어떤 천간들을 품는지(정기/중기/여기 라벨)는 _전체 코드 공유 단일 출처_.

**가중치 — 용도별로 의도적으로 다름:**

| 용도                                                                                                                    | 정기 | 중기 | 여기 | 위치                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 캘린더 시그널 (`saju-jijanggan` extractor)                                                                              | 0.70 | 0.50 | 0.35 | [`calendar-engine/extractors/saju-jijanggan.ts`](../calendar-engine/extractors/saju-jijanggan.ts) `JIJANGGAN_LAYER_WEIGHT` |
| 강약·통근 비율 — `calculateElementScores`(오행 비율), `tonggeun.calculateTonggeun`(통근력, 정기=100 정규화 → 100·42·25) | 0.60 | 0.25 | 0.15 | [`strengthScore.ts`](./strengthScore.ts) `JIJANGGAN_WEIGHTS` (export, 복제 금지)                                           |
| 강약 점수 SSOT 통근 항목 — `computeStrengthScore` 의 `tonggeunScore` (점수 단위, 상한 25)                               | 8점  | 5점  | 3점  | [`strengthScore.ts`](./strengthScore.ts) `tonggeunScore`                                                                   |

**왜 다른가:** _의도된 분리_. 캘린더 시그널은 _부드러운 비율_ (정기 ~2× 여기) — 본명-시기 매트릭스에서 본기 뿐 아니라 중기·여기까지 폭넓게 잡아내야 일진 색채가 풍부해진다. 강약·통근 비율은 _가파른 비율_ (정기 ~4× 여기) — 일간 강약 판정은 본기 위주가 정통이고 잔기는 미세 보정 정도로만. 강약 점수 SSOT 의 통근 항목은 비율이 아니라 _점수_(득령 30·통근 25·인성 20… 의 한 칸)라 정수 8/5/3 으로 둔다. 같은 SSOT 의 존재감 항목(인성·비겁·식상·재성·관성)은 지장간 글자를 층과 무관하게 1점씩 센다.

**지장간을 세지 않는 곳:** 용신 병약·통관 판정(`yongsin.countElements`)은 드러난 8글자(천간 4 + 지지 4)만 센다 — 지장간은 강약 점수가 이미 반영한다. 예전의 '정기 +0.5' 는 이 표에 없는 제3의 가중치였다(엔진 감사 F8, 2026-11 제거).

**원칙:** 위 표 외 다른 가중치를 새로 만들지 말 것. *새 값*이 필요해 보이면 표의 행에 합칠 수 있는지 먼저 검토 → 정말 따로 필요하면 이 표에 행을 추가하고 *왜 다른지*를 함께 기록. 가드: `tests/lib/saju/tonggeun.test.ts` (통근 100·42·25).

**구성 정확도:** 학파별로 寅·亥 등의 미세 차이가 있으나, 2026-05 commit 에서 정통 도메인 기준으로 통일 — 변경 시 golden test가 막는다.

---

## 7. 십신(十神) — 정통 음양·오행 cross 10가지

**선택:** 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인 — 일간 vs 다른 천간의 음양·오행 관계.

**SSOT:** [`core/sibsin.ts:getSibseong()`](./core/sibsin.ts) — _유일한 출처_. `saju.ts`, `unse.ts`, `cycleRelations.ts`, `calendar-engine/extractors/*` 전부 여기서만 import.

**원칙:** 십신 매핑은 _이 한 함수에만 박혀 있어야_ 한다. 어디서든 직접 `if (dayMaster.element === ...)` 매핑하는 코드가 보이면 → core/sibsin 으로 통합.

**음양 필수:** `getSibseong` 은 두 인자 모두 `yin_yang`('양'|'음')이 있어야 하고, 없으면 `TypeError` 로 바로 실패한다. 예전 상담사 일진 블록은 `{name, element, yinYang}` 을 `DayMaster` 로 캐스팅해 넘겨, 일간과 같은 음양의 십신(비견·식신·편재·편관·편인)이 전부 반대쪽으로 찍혔다(재감사 TP-1). 일간 객체는 천간 SSOT(`STEMS`)에서 가져온다.

---

## 8. 신살(神煞) — 4길성 중심, 참고 수준

**선택:** **참고 신호**로 사용 (메인 해석 동력이 아님).

| 등급                    | 신살                                |
| ----------------------- | ----------------------------------- |
| classical-noble (4길성) | 천을귀인·천덕귀인·월덕귀인·태극귀인 |
| rok-ma                  | 건록·역마                           |
| dohwa-hwagae            | 도화·화개                           |
| common                  | 그 외 (공망·고진·과숙 …)            |

**위치:** [`calendar-engine/extractors/saju-shinsal.ts`](../calendar-engine/extractors/saju-shinsal.ts) — `SHINSAL_GRADE` / `gradeOf` (`ShinsalGrade`) 단일 출처. `saju-shinsal-activation` 추출기와 `calendar-view` `capShinsalPolarity`(classical-noble 만 ±3)가 이 표를 import 한다 — 복제 금지.

**관련 표 단일 출처:** 도화 위치표는 [`shinsal.ts`](./shinsal.ts) `DOHWA_BY_DAY_BRANCH`(일지 삼합의 년살 자리) 하나다 — `calendar/constants` 의 `DOHWA_BY_YEAR_BRANCH` 는 그 재export 이고 궁합 포맷터도 이 표를 읽는다. 형(刑) 판정은 [`hyeong.ts`](./hyeong.ts) `isHyeong` 하나 — 본명 관계(`relations.ts`), 캘린더 `saju-hyeongchung` 추출기, 띠 운세의 `constants.XING` 이 모두 여기서 파생한다(寅申·丑未 는 충이지 형이 아님). 합·충·파·해·원진·방합 표는 [`relationTables.ts`](./relationTables.ts).

**원칙:** 신살은 본명 사주의 _보조 색채_. 강약·격국·용신 위에 _얹어서_ 톤을 더할 뿐, 신살만으로 판단을 내리지 않는다 (신살파가 아닌 자평파 노선).

### 8.1 개별 신살 규칙 (재감사 G4)

- **천라지망(天羅地網) — 짝 규칙.** 三命通會 論天羅地網: 戌亥爲天羅, 辰巳爲地網. 보이는 기둥(시간 미상이면 년·월·일 삼주)에 戌+亥(천라) 또는 辰+巳(지망)가 _함께_ 있을 때만 성립하고, 짝을 이룬 기둥마다 hit 하나(`detail` = '천라(戌·亥 짝)' / '지망(辰·巳 짝)'). 지지 하나, 같은 지지 둘(戌·戌)은 천라지망이 아니다. 학파 선택: 짝은 어느 두 기둥이든 된다(년·일지 기준 조회보다 조금 넓다, 납음 제한은 쓰지 않는다) — 표본 3,000 차트에서 약 12–15%(예전 지지 하나 규칙은 약 80%). **캘린더 활성:** 시기(일진) 지지가 본명 지지와 짝을 *완성*하는 날 — 본명 戌 이면 亥 일, 본명 辰 이면 巳 일, 본명에 짝이 다 있으면 두 지지 날 모두. 본명 hit 의 anchor 로는 깨우지 않는다(`saju-shinsal-activation`). Life 대운 신살 줄(`lifetimeFlow`)은 본명 hit anchor 만 읽으므로 짝을 가진 차트에서만 천라지망이 나온다.
- **괴강(魁罡) — 일주 학파.** 일주가 庚辰·庚戌·壬辰·壬戌·戊戌 이면 일주 한 칸에만 붙는다. 다른 기둥은 일지와 지지가 같아도 괴강이 아니다(예전엔 丙辰·甲戌·丙戌 년·월·시주에도 붙였다). 아무 기둥이나 그 자체가 괴강 간지면 표시하는 학파(疊疊)는 쓰지 않는다. 캘린더 일진 활성은 그대로 — 괴강 일주에게 일지를 되풀이하는 날.
- **현침(懸針) — 글자 모양 규칙.** 懸針은 서예의 현침수(懸針豎), 바늘처럼 아래로 곧게 내리긋는 획이다. 그 획을 가진 글자 = 천간 甲·辛, 지지 卯·午·申. **임계값(엔진 선택):** 일간이 甲·辛 이고 보이는 지지(시간 미상이면 삼주)에 卯·午·申 이 있으면 그 지지를 가진 기둥마다 현침 — 甲午·甲申·辛卯 일주는 언제나 현침(대표형). 표본 600 차트에서 약 15%. 캘린더 일진: 甲·辛 일간 × 卯·午·申 일진. `ruleSet: 'your'`(/api/saju)는 未 를 더하는 학파(辛未 일주 포함)다. 예전 표(일간마다 지지 하나: 甲乙→酉 · 丙丁→子 · 戊己→卯 · 庚辛→午 · 壬癸→卯)는 어느 학파에도 없는 표라 酉·子 에 붙고 甲申 일주를 놓쳤다. 오너 결정 18 이 다른 학파를 고르면 이 한 줄(`shinsal.ts` `isHyeonchim`)과 `interpretations.json` 문구를 함께 바꾼다.
- **상담사 화이트리스트.** `counselorContext` 의 `COUNSELOR_SHINSAL_LABEL`·`COUNSELOR_SHINSAL_EN` 키는 엔진이 내는 신살 이름(`ShinsalHit['kind']`) 그대로다 — '문창'(예전 '문창귀인' 키 때문에 상담사에서만 빠졌다), 엔진이 내지 않는 '과숙' 키는 없다. 테스트가 키 ⊆ 엔진 이름을 잠근다.

### 8.2 지지 관계 정본 — 삼합·반합·방합 (재감사 G4)

- **국(局)** — 삼합·방합은 _서로 다른 세 지지가 모두_ 있을 때만(CALCULATION_SPEC §1). 캘린더 일진(`saju-hyeongchung`)은 일진 지지 + 본명 지지로 세 멤버가 모이면 국이고, 국 전체 해석문을 싣는다.
- **반합** — 두 지지만 만나면 왕지(子午卯酉)를 낀 쌍(`relationTables.halfHarmonyPairs`: 申子·子辰·亥卯·卯未·寅午·午戌·巳酉·酉丑)만 '반합'이다. 生-墓 쌍(申辰·亥未·寅戌·巳丑)은 합이 아니고, 두 지지 방합은 없다(子丑·午未 는 육합만). 캘린더 강도: 삼합 +3(무게 0.7) > 반합 +2(0.6), 완성 방합 +1(0.55). 반합 문구는 짝 단위 — 국이 완성된 것처럼 말하지 않고 빠진 세 번째 지지를 적는다.
- **띠 표면 예외** — `fortune/zodiacDaily`(띠 운세)·`compatibility/zodiacCompat`(띠궁합)은 年支 하나끼리의 민속 띠궁합 관례를 따른다: 같은 삼합국의 두 띠면 生-墓 쌍까지 '삼합'(원숭이띠-용띠 등). 표는 relationTables 에서만 오고, 이 관례는 원국 해석(본명·캘린더·상담사·리포트)에 쓰지 않는다.
- **암합 化氣 파합자** — 캘린더 `saju-jijanggan` 의 화기 게이트는 합을 이루는 본명 천간 *그 한 자리*를 파합자로 세지 않는다(합에 묶여 파합 못함). 그래서 甲己→토·戊癸→화 가 어느 쪽이 본명이든 같은 결과를 낸다. 다른 자리의 같은 글자(爭合·妒合)는 그대로 파합자다.

---

## 9. 격국(格局) — 정격 8 + 종격·외격

**선택:** 27가지 격국 (`GeokgukType`).

- **정격(8)**: 정관·편관·정재·편재·식신·상관·정인·편인
- **종격(5)**: 종강·종왕·종아·종재·종살
- **비격(4)**, 화기격국(5), 특수격국(5)

**위치:** [`geokguk.ts`](./geokguk.ts) `GeokgukType`

**판정 순서:** 특수격국 → 종격 → **화기격국** → 비격(건록·양인·월겁) → 정격(월지 정기 투출 우선, 다음 중기/여기) → 잡기격 → 월령 용사 폴백.

**화기격국(化氣格) — 엄격 규칙 하나만** ([`geokguk.ts`](./geokguk.ts) `evaluateHwagiGeokguk`, 표 `HWAGI_DEFS`). 다음을 _모두_ 만족할 때만 성립하고, 하나라도 빠지면 정격/월령 폴백으로 흘려보낸다:

1. 일간이 천간합(甲己·乙庚·丙辛·丁壬·戊癸)의 한쪽
2. 합 상대가 일간과 붙은 **월간 또는 시간** (年干 은 멀어 불가)
3. 월령(월지)이 화신(化神) 오행을 지지 — 土: 辰戌丑未 · 金: 申酉 · 水: 亥子 · 木: 寅卯 · 火: 巳午
4. 파합 없음 — 화신을 극하는 오행이 천간에 2개 미만
5. 화신 우세 — 화신 오행이 천간 + 지장간 전체(각 1점)에서 5 이상

외격(外格)이라 내격(건록·양인·정격)보다 먼저 본다. 예전 `checkHwagiGeokguk` 은 두 천간이 _어디에든_ 있고 일간이 끼면 성립시켜(월령·인접 무시) 사주의 약 20% 가 화기격국이었고, 종격 판정 안에도 월령 없는 化氣 분기가 따로 있어 化氣 이름이 category '종격' 으로 나갔다(엔진 감사 SD-03). 지금은 시드 4000 실제 생일 기준 약 0.75%. 가드: `tests/lib/saju/geokguk.test.ts` (E4 화기격국 불변식), `tests/golden/sajuDerived.golden.test.ts` (D10).

**투출 미확인 시 (월령 용사 폴백):** 정기·중기·여기 어느 것도 투출하지 않아
정격이 잡히지 않고 종/화/특수/비격에도 해당하지 않으면 — 진술축미(土 창고)월은
잡기격(`category:'비격'`)으로, 그 외에는 월지 본기 십신으로 정격을 세운다
(`category:'정격'`, `confidence:'medium'`, `fallback:true`). `fallback` 표시
격국은 *표시용*이라 `determineGeokgukAdvanced` 가 성패(statusResult) 신호를 붙이지
않는다 — 운흐름 캘린더 등 타이밍 점수에 투출 정격과 동급으로 섞이지 않게 하기
위함. (비견/겁재 본기는 건록·양인·월겁격에서 먼저 처리되어 이 폴백에 도달하지
않는다.)

---

## 10. 용신(用神) — 억부 + 조후

**선택:** 신강/신약(억부) + 한난조습(조후)을 _함께_ 본다.

- **DaymasterStrength 5단계**: 극신강·신강·중화·신약·극신약
- **YongsinType**: 억부용신·조후용신·통관용신·병약용신·전왕용신 (코드 우선순위 명시)

**일간 강약은 §11 SSOT에서 도출** — `assessDaymasterStrength` 는 옛 countElements
비율(totalSupport/totalWeaken) 휴리스틱을 버리고, 강약 점수 SSOT
(`computeStrengthScore`)의 `total`(0~100)을 5단계로 매핑한다:

| 점수 | ≥80    | 60–79 | 40–59 | 21–39 | ≤20    |
| ---- | ------ | ----- | ----- | ----- | ------ |
| 단계 | 극신강 | 신강  | 중화  | 신약  | 극신약 |

(임계 60/40·80/20 은 `geokguk` 의 `getStrength`/`getStrengthExtreme` 와 동일.)

**매핑 함수는 하나:** [`strengthScore.ts`](./strengthScore.ts) `strengthBandOf(total)` → 5단계, `strengthClassOf(band)` → 3분류
({극신강,신강}→strong · 중화→medium · {신약,극신약}→weak). `StrengthScore.level`, `yongsin.daymasterStrength`,
`sajuFacts.strength`(3분류 한글 신강·중화·신약 → 상담사), 리포트·캘린더 `natal.saju.strength`(3분류 영문) 가 모두 이
두 함수에서 나온다. 예전엔 sajuFacts 가 별도 6단계 컷(85/70/55/40/25, 총점 ≥55 → 신강)을 써서 같은 사주가 상담사·리포트는
신약, 캘린더는 중화로 갈렸다(엔진 감사 SD-08). 가드: `tests/lib/saju/strengthScore.test.ts` (시드 400 차트 3분류 일치).

**용신 선정 순서와 억부 제약** ([`yongsin.ts`](./yongsin.ts) `determineYongsin`):

1. **조후용신** — 궁통보감 DB 조후 필요도(rating) ≥ 4 일 때. R4 가드: 신약 일간에 관살 조후는 보류.
2. **병약용신** (OD-8) — 병(病) = 억부상 _과다한 쪽_(신강: 비겁·인성 / 신약: 관성·재성·식상)에서 드러난 8글자 중
   **3글자 이상**인 오행(일간 천간 자신은 비겁으로 세지 않음). 약(藥)은 억부 허용 그룹에서만 — 병을 극하는 오행,
   그것이 억부에 어긋나면 병이 생하는 오행(신약의 관살 병 → 인성, 살인상생). 중화는 과다한 쪽이 없어 병약 없음.
3. **통관용신** — 충돌하는 두 오행이 각 2글자 이상이고, 통관 오행이 억부 허용 그룹이며 억부 회피가 아닐 때만.
4. **억부용신** (기본) — 신강: 용 식상 · 희 재성 · 기 인성 · 구 비겁 / 신약: 용 인성 · 희 비겁 · 기 관살 · 구 재성 /
   중화: 인성 (편약이면 기 관살 · 구 재성).

억부 허용 그룹 = 신강 → 식상·재성·관성 / 신약 → 인성·비겁. 조후가 아닌 용신은 이 그룹을 벗어나지 않는다.
**불변식:** 추천(primary·secondary)과 회피(kibsin·gusin)는 서로소 — `finalizeYongsin` 이 추천에 오른 오행을 회피에서 뺀다.
예전엔 병약·통관이 일간 강약을 보지 않아 신강 일간에 비겁을 처방하거나 같은 오행을 추천과 기신에 동시에 올렸고,
지장간 정기 +0.5 집계 탓에 병약이 거의 늘 발동해 억부용신 도달이 0 이었다(엔진 감사 SD-04). 가드:
`tests/lib/saju/yongsin.test.ts` (E4 시드 400 불변식), `tests/golden/sajuDerived.golden.test.ts` (Y01–Y04).

**위치:** [`yongsin.ts`](./yongsin.ts) `assessDaymasterStrength`, `determineYongsin`

---

## 11. 강약 점수 — 5요소 가중 합산

**선택:** 득령·통근·인성·비겁(support) − 식상·재성·관성(resist) 의 균형. 0~100, **50 = 중립**.

| 항목      | 범위 | 산식                                                                              |
| --------- | ---- | --------------------------------------------------------------------------------- |
| 득령      | 0~30 | 월지 오행 vs 일간 — 같음 30 · 월령이 생 25 · 내가 생 10 · 내가 극 5 · 월령이 극 0 |
| 통근      | 0~25 | 4지지 지장간에 일간 오행 — 정기 8 · 중기 5 · 여기 3 (§6)                          |
| 인성      | 0~20 | 존재감: 천간 3 · 지지 본기 2 · 지장간 1                                           |
| 비겁      | 0~15 | 같은 존재감, **일간 천간 자신은 제외** (일간은 자기 비겁이 아니다)                |
| 식상·재성 | −24  | 같은 존재감 × 1.5 (`RESIST_PRESENCE_SCALE`)                                       |
| 관성      | −30  | 같은 존재감 × 1.5                                                                 |

`total = clamp(0, 100, 50 + STRENGTH_CENTER_OFFSET + support − resist)`, `STRENGTH_CENTER_OFFSET = −9.5`.

**중심 보정 (OD-7, 엔진 감사 SD-09).** support 쪽 득령·통근은 resist 쪽에 대응 항목이 없는 구조적 가산점이라, 50 이 중립이라는
주석과 달리 시드 4000 실제 생일(1941–2048, 서울) 모집단의 평균이 64.1·중앙값 62.5 였다(극신강 27% · 극신약 0.75%).
일간 자기 비겁(+3)을 뺀 뒤의 중앙값 59.5 를 하나의 가산 상수로 50 에 맞췄다. 결과 분포: 극신강 13.7% · 신강 23.4% · 중화 29.5% ·
신약 27.2% · 극신약 6.2%. 상수를 바꾸면 이 모집단 중앙값이 50±2 를 지켜야 한다 — 가드: `tests/lib/saju/strengthScore.test.ts`.

**위치·간지 가중치는 강약 점수가 아니다.** `POSITION_WEIGHTS`(년 0.15 · 월 0.30 · 일 0.35 · 시 0.20)·`STEM_BRANCH_WEIGHTS`
(천간 0.40 · 지지 0.60)는 오행 비율 표시용 `calculateElementScores` 전용이다.

**SSOT 코어:** `computeStrengthScore(StrengthCoreInput)` — 강약 점수 알고리즘의
_유일한_ 출처. 입력 형태가 다른 두 경로가 모두 이 코어로 위임한다:

- `calculateStrengthScore(SajuPillars)` — full 형태(리포트/팩트 수집)
- `geokguk.getStrengthScore(SajuPillarsInput)` — simple 형태(격국/종격 판정).
  옛날엔 같은 알고리즘을 별도 재구현해 드리프트 위험이 있었으나 이제 위임.
- `yongsin.assessDaymasterStrength` — §10 의 5단계 라벨을 이 점수에서 도출.

**위치:** [`strengthScore.ts`](./strengthScore.ts) — `computeStrengthScore`, `STRENGTH_CENTER_OFFSET`,
`strengthBandOf`, `strengthClassOf`

**득령 표기(旺相休囚死)** — `tonggeun.calculateDeukryeong` 은 當令者旺 · 令生者相 · 生令者休 · **剋令者囚**(내가 월령을 극,
예: 甲 辰월, −50) · **令剋者死**(월령이 나를 극, 예: 甲 申월, −80). 위 득령 점수의 순서(극출 5 > 극입 0)와 같다. 예전 표는
囚/死 를 다섯 행 모두 뒤바꿨다(엔진 감사 SD-16).

---

## 12. 대운(大運) 방향

**선택:** **양남음녀 순행 / 음남양녀 역행** (정통 자평파).

```ts
isForward = (yearStem이 양 && male) || (yearStem이 음 && female)
```

**위치:** [`saju.ts`](./saju.ts) — `calculateSajuData` 의 daeWoon 산출이 단일 출처. (옛 `unse.getDaeunCycles` raw 경로는 2026-06 제거.)

**기준 천간:** *연주(年柱) 천간*의 음양 (월주·일간이 아님).

---

## 13. 대운 시작 나이 — days/3, 만 나이

**선택:** 출생일 ~ 직전(역행)/다음(순행) 절기까지의 일수를 **3으로 나눈 값**이 대운 시작 만 나이. `Math.max(1, age)` 로 1세 미만 clamp.

**일수 = |절입 instant − 생 UT 출생 instant|** (OD-1, §2 와 같은 기준). 진경도 보정분을 섞지 않는다 — 예: 1990-03-06 10:15 KST 는 경도와 무관하게 청명까지 29.9986일 → 9 (골든 G27). 옛 보정 거리로는 lon 124° 에서 10 이었다.

**라운딩:** **내림(floor)** — `CALCULATION_STANDARDS.saju.daeunRounding = 'floor'` ([`config/calculationStandards`](../config/calculationStandards.ts)). 3일 = 1년의 환산에서 남은 일수(1~2일 = 4~8개월)는 다음 해로 올리지 않는다 — 대운수는 '그 나이를 다 채운 뒤 시작'으로 읽는다. 예: 29.9986일 → 9 (G27), 24.03일 → 8 (G07). 골든 생성기(`scripts/golden/build-engine-golden.mts`)도 독립적으로 floor(days/3), 최소 1 로 계산한다. `ceil`·`round` 는 정책 값으로 남아 있지만 쓰지 않는다.

**위치:** [`daeunAge.ts`](./daeunAge.ts) — _단일 출처_.

---

## 14. 나이 표시 — 만 나이 한 컨벤션

**선택:** 사주·점성 화면 전체가 **만 나이**로 통일 (2026-06 변경).

- 옛 코드는 한국 나이(만 + 1)로 대운·프로펙션 표시 → 글로벌(미국·아프리카 등) 사용자가 _나는 31살인데 왜 32살이라고 나오지?_ 회귀
- 한국 법 자체도 2023년에 만 나이로 통일 — 사주 코드도 그에 맞춤
- **대운 _전환 연도_ 자체는 변하지 않음** — 라벨 숫자만 1 작아짐

**SSOT:** [`src/lib/datetime/currentAge.ts:currentManAge()`](../datetime/currentAge.ts) — _생일 통과 여부 + 출생지 시간대_ 둘 다 반영. 모든 화면이 이 함수만 사용.

**생일 = 출생지 시간대의 민용 날짜** (진경도 보정 전). 보정된 날짜를 넘기면 자정 직후 출생(서울 00:00–00:32)의 생일이 전날로 밀려 현재 대운이 하루 일찍 바뀐다 — 예: 1962-01-01 00:10 서울 출생은 1979-12-31 에 만 17세, 현재 대운 己亥@8 (골든 G23).

**현재 대운 = 만 나이가 든 대운 칸. 칸 i 는 `[시작 나이 + 10i, 시작 나이 + 10i + 10)` 을 맡고, 순서열은 끝이 없다. 첫 대운 전에는 없다** (OD-12, 2026-11 엔진 감사 E14 · SAJU-7; 재감사 SP-1 · SI-5). 첫 대운 전에는 월주(月柱)가 그 시기를 맡으므로 `daeWoon.current = null`, `daeWoon.preDaeun = { startsAtAge }` 다 — 예: 2022-06-15 10:00 서울 남자는 2026-11-24 에 만 4세라 대운 전(7세부터 丁未), 2029-07-01 에 丁未@7 (골든 G22). 예전엔 `|| list[0]` 폴백으로 첫 대운을 '현재'라 했다.

**대운 목록은 만 나이를 덮는다.** 목록은 최소 10칸이고, 만 나이가 `시작 나이 + 100` 이상이면 지금 걸린 대운까지 늘어난다(`daeunAge.daeunListLength`). 예: 1920-03-01 10:00 서울 남자(庚申년 戊寅월, 순행, 대운수 1)는 2026-11-24 에 만 106세 → 11번째 대운 己丑@101(101–110세). 예전엔 목록이 10칸에서 끊겨 `currentDaeun` 이 마지막 칸(이미 끝난 戊子@91)을 '현재'라 했고(/api/saju·상담사·궁합), Life 티어는 `nowAge < startAge + 10` 경계로 현재 대운을 아예 못 찾았다 — 표면마다 답이 달랐다. 목록이 만 나이를 덮지 못하면(옛·캐시된 목록) `currentDaeun` 은 끝난 대운을 고르지 않고 `current = null` 을 돌려준다.

**SSOT (한 규칙, 모든 표면):**

- [`daeunAge.ts`](./daeunAge.ts) — `currentDaeun(list, civilBirth, tz, now)`(현재 칸 선택, 순수), `runningDaeunIndex(startAges, age)`(칸 규칙), `daeunListLength(startAge, age)`(목록 길이), `daeunCellsToCover(cells, age)`(캐시된 목록을 같은 순서열로 잇기).
- [`saju.ts:resolveDaeunAt(seed, civilBirth, tz, now)`](./saju.ts) — 목록 + current/preDaeun. `calculateSajuData` 와 `/api/saju` 가 같은 함수를 쓴다. `/api/saju` 는 Redis 에 캐시된 결과(계산 시점의 now)의 목록·current 를 버리고 요청 시각으로 다시 맞춘다(SAJU-8) — 민용 생일·타임존은 결과의 `meta.civilBirthDate`·`meta.timeZone`, 순서열 seed 는 `daeunSeedOf(result)`(월주·대운수·방향·일간).
- 상담사(`sajuFacts.daeun`)·궁합(`compatSajuFacts.currentDaeun`)은 엔진 결과의 current/list 를 그대로 읽는다.
- Life 티어(`calendar-view/toLifetime`)는 영구 캐시된 본명 컨텍스트 목록을 `daeunCellsToCover` 로 잇고 now 플래그를 `runningDaeunIndex` 로 고른다. 막대 줄은 10칸 격자라 목록이 10칸을 넘으면 지금 대운으로 끝나는 10칸만 보인다.
- 가드: `tests/lib/saju/daeunCoverage.test.ts`, `tests/lib/destiny/currentDaeunParity.test.ts`, `tests/app/api/sajuRoute.engine.route.test.ts`.

---

## 15. 절기(節氣) 데이터 — KASI 기반

**선택:** 한국천문연구원(KASI) 공식값과 분 단위로 일치하는 Swiss Ephemeris 절기표 (1899–2051, UTC+9 고정 표기, 분 단위). 지원 범위는 **1900–2050** — API 검증 하한(`dateSchema` year ≥ 1900)과 같다(OD-4, 엔진 감사 E14 · SAJU-5). 1899·2051 은 범위 첫·끝 출생의 경계 lookup 용.

**생성:** 1899–1938 행은 [`scripts/golden/build-solar-terms.mts`](../../../scripts/golden/build-solar-terms.mts) 가 Swiss Ephemeris(`public/ephe`)로 만들고 astronomy-engine 과 ≤ 90 초 교차검증한다. 손으로 적지 않는다. 가드: [`tests/lib/saju/kasiSolarTerms.crosscheck.test.ts`](../../../tests/lib/saju/kasiSolarTerms.crosscheck.test.ts) (표 전체 ↔ astronomy-engine ≤ 90 초).

**위치:** [`constants.ts:KASI_SOLAR_TERMS`](./constants.ts) — 테이블. `getSolarTermKST(year, month)` lookup 함수 동일 파일.

**원칙:** 절기 시각은 분 단위까지 신뢰. 비교는 `.getTime()` 기반 instant 비교 — `Date` 객체 동등성으로 비교하지 말 것.

**비교 상대는 생 UT 출생 instant** (OD-1). 표의 각 값은 하나의 절대 instant(태양 시황경 315°+30k°)라서, 경도로 옮긴 시각과 비교하면 timezone 라벨에 따라 답이 갈린다. 진경도 보정은 시주 lookup 전용(§1). 가드: [`tests/lib/saju/solarTermFrame.test.ts`](../../../tests/lib/saju/solarTermFrame.test.ts).

---

## 의도적으로 _지원하지 않는_ 옵션

다음은 우리 코드가 **명시적으로 채택하지 않은** 학파/관습이다. 사용자 신고가 들어와도 *우리 컨벤션이 자평파이기 때문에 다르다*고 답한다:

- 야자시·조자시 구분 (이단 학파)
- 양력 1/1 또는 음력 설을 연주 기준일로 사용
- 양력 월을 그대로 월주로 사용 (절기 무시)
- 신살만으로 운세 판정 (신살파)
- 한국 나이 표시 (글로벌 일관성 위반)

---

## 변경 이력

- 2026-06: 최초 작성. 만 나이 통일 직후 시점 기준.
- 2026-11: OD-1 — 년주·월주·대운수는 생 UT 출생 instant 와 절입 instant 비교, 진경도 보정은 시주에만, 만 나이는 민용 생일 (§1·§2·§3·§13·§14·§15, 엔진 감사 E1).
- 2026-11: 판단층 (엔진 감사 E4, OD-7·OD-8) — 강약 점수에서 일간 자기 비겁 제외 + 중심 보정 −9.5(중앙값 50), 5단계 매핑 함수 하나(`strengthBandOf`/`strengthClassOf`)를 모든 표면이 공유, 용신 병약·통관은 억부 허용 그룹 안에서만·추천과 회피 서로소·병 = 드러난 8글자 3 이상, 화기격국은 `evaluateHwagiGeokguk` 엄격 규칙만, 득령 囚/死 교정, §6 午 3층·용도별 가중치 표 정정, 통근력은 §6 강약·통근 행 사용 (§6·§9·§10·§11).
- 2026-11: OD-5 — 시간 미상은 삼주(년·월·일) 분석. 정오 앵커는 년·월·일주 고정용, 빈 시각도 정오로 앵커, 오행 위치 가중은 0.80 으로 재정규화, 캘린더 placeUnreliable 이면 ASC·MC·하우스 의존 신호 제외 (§5, 엔진 감사 E7).
- 2026-11: 문서 동기화 (엔진 감사 E15 · F6 · SD-14 · F16) — §4 일주 = 출생지 민용일(‘KST 자정·선택적 경도 보정’ 삭제), §6 지장간 구성표(문서-코드 대조 테스트), §2·§3·§9 줄 번호 참조를 심볼 참조로, §1 캘린더 시진 `hourSegmentsForCivilDay`, §13 대운수 floor 근거, 해결된 TODO 2건 삭제.
- 2026-11: 재감사 G1 — 현재 대운은 끝없는 순서열의 만 나이 칸, 목록은 만 나이를 덮도록 늘어남(§14, SP-1·SI-5). 시간 미상이면 어떤 시각 문자열이든 정오 앵커(§5, SP-2·SDR-08). 두 번째 강약 알고리즘 `tonggeun.analyzeStrength` 삭제(§10·§11, SDR-07).
- 2026-11: 재감사 G2 — 캘린더 날짜의 세운·월운은 출생지 민용 날짜 + 절입일 규칙(절입이 든 현지 날이 새 기둥), 사주 기간 추출기·월 티어 머리말이 `periodPillars` 하나를 읽고, 대운 창은 만 나이 생일 경계(§3.1, TP-2·TP-3·TP-7).
- 2026-11: 재감사 G3 — 상담사 '오늘' = 보는 사람 현지 날짜 D, 세운·월운은 캘린더 셀과 같은 `pillarsForLocalDate(D, 출생 tz)`, 대운·만 나이·트랜짓은 출생 tz 의 D 정오(§3.1, TP-4·TP-5·CNS-1). Life '올해' 세운 줄도 같은 헬퍼.
- 2026-11: 재감사 G4 — 천라지망 짝 규칙·캘린더 짝 완성 활성, 괴강 일주 학파, 현침 글자 모양 규칙, 상담사 신살 화이트리스트 = 엔진 이름(§8.1, SDR-03~06). 캘린더 삼합·방합은 국 완성만·두 지지는 왕지 반합만, 띠 표면 민속 예외, 암합 화기 파합자 대칭(§8.2, SDR-01·02). 십신 음양 필수(§7, TP-1).
