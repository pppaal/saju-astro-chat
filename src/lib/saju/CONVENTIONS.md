# 사주 계산 컨벤션 (Saju Conventions)

이 문서는 **사주 계산 코드가 따르는 학파·관례**를 한 곳에 정리한 단일 출처(SSOT)다.
새 코드를 추가하거나 외부 도구·만세력과 결과가 다를 때, *이 문서가 우리 코드의 정답 기준*이다.

> **한 줄 요약:** 정통 자평파(子平命理) + 절기 기반(입춘=연시작, 12절기=월 전환) + 한국식 LMT +30분 시진 보정 +
> 4길성 중심 신살(참고 수준) + 억부·조후 용신 + 양남음녀 순역행 + 글로벌 _만 나이_ 표시.

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
- 한국(`Asia/Seoul`): LMT 보정 → 子 _시진_ 경계 = 23:30–01:30. (시진 경계일 뿐, 일주는 위처럼 민용일 기준.)
- 비한국 / KMT 시대 / DST 보정 후: 정시 경계 → 子 시진 = 23:00–01:00.

**위치:** 시진 경계 [`saju.ts`](./saju.ts) `LMT_HOUR_RANGES`(한국)/`PLAIN_HOUR_RANGES`(그 외), 일주 경계는 [`dayPillar.ts`](./dayPillar.ts)(민용일 JDN). 골든: `tests/lib/Saju/determinism-golden.test.ts`.

**판단 근거:** 정통 자평파 다수설(야자시론 미채택). 일주가 민용일 기준이라 23시대 출생도 별도 야자시 룰 없이 자연 처리된다. 사용자 신고 시 *우리 코드는 자평파 + 민용일 일주 경계를 따른다*고 답한다.

---

## 2. 연주(年柱) 시작 — 입춘(立春)

**선택:** 양력 1/1 아님, 음력 설날도 아님. **입춘 통과 전엔 작년의 사주년.**

```ts
const ipchunUTC = getSolarTermKST(year, 2)
const sajuYear = birthDateTime < ipchunUTC ? year - 1 : year
```

**위치:** [`saju.ts:363-369`](./saju.ts#L363-L369)

**경계 케이스:** 1985-02-04 06:00 KST 출생은 입춘(06:12 KST) 12분 전 → 사주년 1984년(甲子). [`tests/lib/Saju/determinism-golden.test.ts`](../../../tests/lib/Saju/determinism-golden.test.ts) 의 boundary cases 가 이 동작을 잠금.

---

## 3. 월주(月柱) 전환 — 12절기(節氣)

**선택:** 양력 월 아님. **12절기로 월 전환** — 입춘=寅월, 경칩=卯월, 청명=辰월, … 소한=丑월.

- 각 양력 월의 *첫 절기*가 통과해야 그 사주월로 진입
- 통과 전이면 사주월은 _이전 절기-월_

**위치:** [`saju.ts:371-410`](./saju.ts#L371-L410), [`unse.ts:getMonthlyCycles`](./unse.ts) (`useSolarTerms` 플래그)

**기본값:** `CALCULATION_STANDARDS.saju.useSolarTermsForMonthlyCycles = true` ([`config/calculationStandards`](../config/calculationStandards.ts))

---

## 4. 일주(日柱) 자정 — KST 자정 (선택적 경도 보정)

**선택:** **KST(Asia/Seoul) 자정**이 일주 전환선. Julian Day Number(JDN) 기반 결정적 계산.

- `longitude` 인자가 들어오면 진태양시(LST) 보정 적용 가능 — 출생지 경도로 분 단위 시각 조정
- 기본은 KST 자정 (한국 표준 사주)

**위치:** [`saju.ts:271-274`](./saju.ts#L271-L274) (longitude param), `dayPillar.ts` (JDN compute)

**자정 경계 잠금:** [`determinism-golden.test.ts`](../../../tests/lib/Saju/determinism-golden.test.ts) — 1990-12-31 23:59 vs 1991-01-01 00:01 KST 두 케이스로 회귀 방지.

---

## 5. 시주(時柱) 경계

**선택:** 위 1번(자시)과 동일 표 기반. 한국 LMT +30분 보정 시진 경계.

- 시간 미상(`birthTimeUnknown=true`): 시주 계산 skip, 다른 모듈은 ASC/MC 의존 정보(점성 하우스 등) 자동 마스킹

**위치:** [`saju.ts:160-192`](./saju.ts#L160-L192) 및 호출처

---

## 6. 지장간(地藏干) — 정기·중기·여기 3층

**선택:** 정통 12지지 지장간. 子·卯·午·酉 = 정기만, 나머지 8지지 = 3층.

**구성·정기 lookup:** [`constants.ts:JIJANGGAN, JIJANGGAN_ORDERED`](./constants.ts) — 어느 지지가 어떤 천간들을 품는지(정기/중기/여기 라벨)는 _전체 코드 공유 단일 출처_.

**가중치 — 용도별로 의도적으로 다름:**

| 용도                                       | 정기 | 중기 | 여기 | 위치                                                                                                            |
| ------------------------------------------ | ---- | ---- | ---- | --------------------------------------------------------------------------------------------------------------- |
| 캘린더 시그널 (`saju-jijanggan` extractor) | 0.70 | 0.50 | 0.35 | [`calendar-engine/extractors/saju-jijanggan.ts:50-54`](../calendar-engine/extractors/saju-jijanggan.ts#L50-L54) |
| 강약 점수 (`strengthScore`)                | 0.60 | 0.25 | 0.15 | [`strengthScore.ts:99-103`](./strengthScore.ts#L99-L103)                                                        |

**왜 둘이 다른가:** _의도된 분리_. 캘린더 시그널은 _부드러운 비율_ (정기 ~2× 여기) — 본명-시기 매트릭스에서 본기 뿐 아니라 중기·여기까지 폭넓게 잡아내야 일진 색채가 풍부해진다. 강약 점수는 _가파른 비율_ (정기 ~4× 여기) — 일간 강약 판정은 본기 위주가 정통이고 잔기는 미세 보정 정도로만.

**원칙:** 위 둘 외 다른 가중치를 새로 만들지 말 것. *제3의 값*이 필요해 보이면 둘 중 하나에 합칠 수 있는지 먼저 검토 → 정말 따로 필요하면 이 표에 행을 추가하고 *왜 다른지*를 함께 기록.

**구성 정확도:** 학파별로 寅·亥 등의 미세 차이가 있으나, 2026-05 commit 에서 정통 도메인 기준으로 통일 — 변경 시 golden test가 막는다.

---

## 7. 십신(十神) — 정통 음양·오행 cross 10가지

**선택:** 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인 — 일간 vs 다른 천간의 음양·오행 관계.

**SSOT:** [`core/sibsin.ts:getSibseong()`](./core/sibsin.ts) — _유일한 출처_. `saju.ts`, `unse.ts`, `cycleRelations.ts`, `calendar-engine/extractors/*` 전부 여기서만 import.

**원칙:** 십신 매핑은 _이 한 함수에만 박혀 있어야_ 한다. 어디서든 직접 `if (dayMaster.element === ...)` 매핑하는 코드가 보이면 → core/sibsin 으로 통합.

---

## 8. 신살(神煞) — 4길성 중심, 참고 수준

**선택:** **참고 신호**로 사용 (메인 해석 동력이 아님).

| 등급                    | 신살                                |
| ----------------------- | ----------------------------------- |
| classical-noble (4길성) | 천을귀인·천덕귀인·월덕귀인·태극귀인 |
| rok-ma                  | 건록·역마                           |
| dohwa-hwagae            | 도화·화개                           |
| common                  | 그 외 (공망·고진·과숙 …)            |

**위치:** [`calendar-engine/extractors/saju-shinsal.ts:19-26, 87-105`](../calendar-engine/extractors/saju-shinsal.ts) — `ShinsalGrade` 등급

**원칙:** 신살은 본명 사주의 _보조 색채_. 강약·격국·용신 위에 _얹어서_ 톤을 더할 뿐, 신살만으로 판단을 내리지 않는다 (신살파가 아닌 자평파 노선).

---

## 9. 격국(格局) — 정격 8 + 종격·외격

**선택:** 27가지 격국 (`GeokgukType`).

- **정격(8)**: 정관·편관·정재·편재·식신·상관·정인·편인
- **종격(5)**: 종강·종왕·종아·종재·종살
- **비격(4)**, 화기격국(5), 특수격국(5)

**위치:** [`geokguk.ts:14-42`](./geokguk.ts#L14-L42)

**판단 기준:** 월지 정기(본기) 투출 우선, 다음 중기/여기.

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

**위치:** [`yongsin.ts:14-37`](./yongsin.ts#L14-L37), `assessDaymasterStrength`

---

## 11. 강약 점수 — 5요소 가중 합산

**선택:** 통근·득령·득지·득세·생부 5요소 종합. 위치별·간지별 가중치 명시.

| 위치 가중치 | 년주 | 월주 | 일주 | 시주 |
| ----------- | ---- | ---- | ---- | ---- |
| 값          | 0.15 | 0.30 | 0.35 | 0.20 |

| 간지 가중치 | 천간 | 지지 |
| ----------- | ---- | ---- |
| 값          | 0.40 | 0.60 |

**SSOT 코어:** `computeStrengthScore(StrengthCoreInput)` — 강약 점수 알고리즘의
_유일한_ 출처. 입력 형태가 다른 두 경로가 모두 이 코어로 위임한다:

- `calculateStrengthScore(SajuPillars)` — full 형태(리포트/팩트 수집)
- `geokguk.getStrengthScore(SajuPillarsInput)` — simple 형태(격국/종격 판정).
  옛날엔 같은 알고리즘을 별도 재구현해 드리프트 위험이 있었으나 이제 위임.
- `yongsin.assessDaymasterStrength` — §10 의 5단계 라벨을 이 점수에서 도출.

**위치:** [`strengthScore.ts`](./strengthScore.ts) — `computeStrengthScore`,
`POSITION_WEIGHTS`, `STEM_BRANCH_WEIGHTS`

---

## 12. 대운(大運) 방향

**선택:** **양남음녀 순행 / 음남양녀 역행** (정통 자평파).

```ts
isForward = (yearStem이 양 && male) || (yearStem이 음 && female)
```

**위치:** [`unse.ts:getDaeunCycles`](./unse.ts), [`saju.ts:468-470`](./saju.ts#L468-L470)

**기준 천간:** *연주(年柱) 천간*의 음양 (월주·일간이 아님).

---

## 13. 대운 시작 나이 — days/3, 만 나이

**선택:** 출생일 ~ 직전(역행)/다음(순행) 절기까지의 일수를 **3으로 나눈 값**이 대운 시작 만 나이. `Math.max(1, age)` 로 1세 미만 clamp.

**라운딩:** `CALCULATION_STANDARDS.saju.daeunRounding` (ceil / floor / round 중)

**위치:** [`daeunAge.ts`](./daeunAge.ts) — _단일 출처_.

---

## 14. 나이 표시 — 만 나이 한 컨벤션

**선택:** 사주·점성 화면 전체가 **만 나이**로 통일 (2026-06 변경).

- 옛 코드는 한국 나이(만 + 1)로 대운·프로펙션 표시 → 글로벌(미국·아프리카 등) 사용자가 _나는 31살인데 왜 32살이라고 나오지?_ 회귀
- 한국 법 자체도 2023년에 만 나이로 통일 — 사주 코드도 그에 맞춤
- **대운 _전환 연도_ 자체는 변하지 않음** — 라벨 숫자만 1 작아짐

**SSOT:** [`src/lib/datetime/currentAge.ts:currentManAge()`](../datetime/currentAge.ts) — _생일 통과 여부 + 출생지 시간대_ 둘 다 반영. 모든 화면이 이 함수만 사용.

---

## 15. 절기(節氣) 데이터 — KASI 기반

**선택:** 한국천문연구원(KASI) 공식 절기표 (1939-2051, KST, 분 단위 정확도, Swiss Ephemeris 검증됨).

**위치:** [`constants.ts:KASI_SOLAR_TERMS`](./constants.ts) — 테이블. `getSolarTermKST(year, month)` lookup 함수 동일 파일.

**원칙:** 절기 시각은 분 단위까지 신뢰. 비교는 `.getTime()` 기반 instant 비교 — `Date` 객체 동등성으로 비교하지 말 것.

---

## 의도적으로 _지원하지 않는_ 옵션

다음은 우리 코드가 **명시적으로 채택하지 않은** 학파/관습이다. 사용자 신고가 들어와도 *우리 컨벤션이 자평파이기 때문에 다르다*고 답한다:

- 야자시·조자시 구분 (이단 학파)
- 양력 1/1 또는 음력 설을 연주 기준일로 사용
- 양력 월을 그대로 월주로 사용 (절기 무시)
- 신살만으로 운세 판정 (신살파)
- 한국 나이 표시 (글로벌 일관성 위반)

---

## 추가가 필요한 항목 (TODO)

- **진태양시(LST) 보정 정책 기본값** — 현재 longitude 가 옵션 인자. ON/OFF 정책 결정 + 문서화 필요.
- **`CALCULATION_STANDARDS.saju.daeunRounding` 의 현행 값** — config 파일 링크 + 결정 근거 메모.

---

## 변경 이력

- 2026-06: 최초 작성. 만 나이 통일 직후 시점 기준.
