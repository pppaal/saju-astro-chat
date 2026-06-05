# DestinyPal 5-Tier 운세차트 — 데이터 & 해석 스펙

> 목적: destinypal 5-tier 차트가 **무슨 데이터를 받고**, **5개 층이 각각 어떻게
> 데이터를 받고**, **어떻게 해석하는지**를 한 곳에 정리. 신규 교차(사주×점성)
> 작업 전 공통 기준선. 모든 경로는 코드에서 직접 확인(file:line).
>
> 상태(2026-06-06): 엔진 wiring 완료, Phase 3 신호 일부 placeholder. §5 참조.

---

## 0. 한눈에 (파이프라인)

```
BIRTH(생년월일시·출생지)
   │
   ▼  buildNatalContext()              src/app/destinypal/page.tsx:120
NatalContext  =  사주 본명  +  점성 본명
   │
   ▼  buildCalendar(natal, 365일)      src/app/destinypal/page.tsx:123-131
365 × CalendarCell  =  { signals[], derivedScore(0~100), themeScores(5축) }
   │
   ▼  어댑터 5개 (pure 함수, I/O 없음)   src/components/destinypal/adapters/*
toLifetime · toDecade · toYear · toMonth · toDay
   │
   ▼
5-Tier UI  (평생 → 대운 → 세운 → 월운 → 일진)
```

핵심: **하나의 엔진이 365일치 신호를 만들고, 어댑터가 그걸 스케일별로 잘라
재구성**한다. 캘린더(하루 격자)와 **같은 신호**를 쓰되, destinypal은 층을
평균내지 않고 **나란히 세워** 보여주는 게 차별점.

---

## 1. 입력 데이터 — 무슨 데이터를 받나

### 1.1 원천 입력
- `BIRTH`: 생년·월·일·시 + 출생지(위경도/시간대). 로그인 유저는 Prisma 프로필
  (`page.tsx:74-89`), 미입력/게스트는 preview 고정값(1995-02-09 서울).

### 1.2 NatalContext — `buildNatalContext(BIRTH)`
본명(고정 정체성). 두 도메인:

**사주 (四柱)** — `src/lib/saju/**`, `src/lib/fusion/normalizer/saju.ts`
- 본명 4기둥(년/월/일/시 천간·지지), **일간(日干)**, 오행 분포, **일간 강약**(극강~극약)
- **십신(十神)** 분포·우세, **12운성(十二運性)**, 4궁(년=조상/월=부모/일=배우자/시=자녀)
- **격국(格局)**, **용신(用神)**, 상신(相神), **신살(神殺)**(도화·역마·양인 등)
- **지장간(地藏干)**(정기·중기·여기), 통근(通根), **대운 시퀀스**(이전/현재/다음)

**점성 (Hellenistic)** — `src/lib/astrology/**`, `src/lib/fusion/normalizer/astro.ts`
- 본명 차트(행성 sign·house), 오행/모드 분포, 역행, 스텔리움
- **품위(dignity)**(domicile/exaltation/detriment/fall), accidental dignity, **sect(주/야)**
- Lot of Fortune·Spirit, **ZR(Zodiacal Releasing)** L1/L2, 고정성, 아랍점
- 타이밍: **트랜짓**, **태양/달 회귀**, **프로펙션** 하우스, 프로그레션

> ⚠️ 현대 점성(asteroid·midpoint·draconic)은 **의도적으로 등록 OFF**
> (`calendar-engine/index.ts:150-160`). 고전 점성만 사용 → 사주(고전)와 톤 일치.

### 1.3 Calendar cells — `buildCalendar(natal, 365)`
365일 각 날짜에 대해 1개 `CalendarCell`:
- `signals: ActiveSignal[]` — 그날 활성된 사주·점성·**교차** 신호 (하루 수백~천 개 가능)
- `derivedScore: number` — 0~100 종합 점수 (§4.1)
- `themeScores` — 5축(love/money/career/health/growth) 각 0~100 (§4.2)

---

## 2. 신호 모델 — 공통 언어

모든 신호는 `ActiveSignal`로 평탄화되어 한 풀에 모인다(사주·점성 **동등 취급**).

| 필드 | 의미 |
| --- | --- |
| `polarity` | −3~+3. 방향·강도 (−3 매우 흉, 0 중립, +3 매우 길) |
| `layer` | `decadal/yearly/monthly/daily/hourly/instant` — 시간 스케일 |
| `weight` | 0~1. 본질 강도(층별 정규화) |
| `themes` | 영향 영역 태그(love/money/career/health/growth) |
| `evidence` | 원천 detail(행성·기둥·어스펙트·orb·십신 등) — *왜*의 근거 |
| `window` | `{start, peak, end}` — 활성 구간(peak=정점) |

### 2.1 교차신호 (cross-activation) — 진짜 융합의 금맥
`src/lib/calendar-engine/extractors/cross-activation.ts`,
매핑 `src/lib/calendar-engine/data/saju-astro-mapping.ts` (17쌍, A등급)

- 정의: 사주 십신/신살 ↔ 점성 행성의 **의미 동치** 17쌍.
  예) 正官×토성(구조·책임), 偏財×수성(상업), 正財×금성(가치), 도화×금성(매력),
  역마×수성(이동), 양인×화성(force·위험), 正印×목성(배움)/달(돌봄) …
- 발화 조건: 두 신호가 **같은 날짜 구간(window 교집합)**에 동시 활성일 때만.
- polarity 합성(`cross-activation.ts:112-121`):
  - 둘 다 + → 매핑 polarity 그대로(강화)
  - 둘 다 − → 그대로(압박 가중)
  - 혼합(+/−) → **0 (의미 상쇄/갈등)**
- weight = `사주w × 점성w × 0.6`(노이즈 dampening), peak=두 부모 peak의 중점.
- 부모 신호 id 보존(`evidence.detail.parentIds`) → "이 교차가 왜 떴는지" 역추적 가능.

### 2.2 합치도 (crossAgreement) — 두 시스템이 같은 말을 하나?
`src/lib/calendar-engine/derivers/crossAgreement.ts`
- 사주축·점성축을 **각각 따로** 점수화 → 방향 비교: `aligned / opposed / mixed`
- 합치도 %(50 중립 → 100 완전일치 → 0 완전반대) + 신뢰도(둘 다 존재 시 보너스)
- `cross-verified` = 둘 다 존재 AND 합치도 ≥ 60

---

## 3. 5층 — 각 층이 데이터를 어떻게 받나

어댑터는 **NatalContext + 365 cells**를 받아 스케일별로 필터·집계한다(순수 함수).

| 층 | 어댑터 | 입력(주로) | 보여주는 것 |
| --- | --- | --- | --- |
| 평생 | `toLifetime` | 대운 시퀀스 + ZR + 외행성 회귀 | 4 생애기 + 대운 spine + 마일스톤 |
| 대운 | `toDecade` | 현재 대운 + `decadal` 신호 + 교차 | 대운 기둥·십신 테마 + 10년 점수 + 합충/12운성 |
| 세운 | `toYear` | `yearly` 신호 + 프로펙션 + ZR | 세운 기둥 + 프로펙션 휠 + 월별 점수 |
| 월운 | `toMonth` | 해당 월 30 cells | 월운 + 30일 격자 + 길/흉/주의일 + 수렴 |
| 일진 | `toDay` | 해당 1 cell | 일진 + 점수 + 신호/교차 + Phase3 5종 |

### 3.1 평생 (Lifetime) — `toLifetime`, type `DestinyLifetime`
- 입력: `deriveLifetimeFlow()` + `deriveLifetimePivots()` (`page.tsx:134-135`)
- 필드: `daewoon[]`(10년 블록), `lifeStages[]`(초·청·중·말 4기, 현재기만 detail),
  `milestones[]`(토성/목성 회귀·식·ZR 전환), `zrSpiritChapters[]`/`zrFortuneChapters[]`
- 해석축: "지금 인생 어느 장(章)에 있나" — 큰 흐름·전환점.

### 3.2 대운 (Decade) — `toDecade`, type `DestinyDecade`
- 입력: 현재 대운 기둥 + `layer==='decadal'` 신호 + `kind==='cross-activation'` 필터
- 필드: `gz`(간지), `sibsin`+`theme`(십신→테마 룩업 `toDecade.ts:93-104`),
  `pillar`(천간/지지 각 십신·오행), `years[]`(10년 점수, 없으면 50),
  `hapchung`/`unseong`(본명×대운 합충·12운성), `astro[]`(외행성 트랜짓),
  `crossActivations[]`, `zr*Chapters[]`, `narrative[]`
- 해석축: "이 10년의 결(結)" — 십신 테마 + 본명과의 합/충.

### 3.3 세운 (Year) — `toYear`, type `DestinyYear`
- 입력: `layer==='yearly'` 신호 + 프로펙션(나이%12) + ZR L1/L2
- 필드: `sewoon`(연 간지·십신·점수), `profection`(활성 하우스·룰러·룰러 본명위치),
  `profectionWheel[]`(12하우스), `sajuNote`/`astroNote`, `monthlyScores[]`(월별 spine)
- 해석축: "올해 주제" — 세운 십신 + 프로펙션 하우스 테마(`toYear.ts:85-98`).

### 3.4 월운 (Month) — `toMonth`, type `DestinyMonth`
- 입력: 해당 월 30개 cell
- 필드: `woolun`(월 간지), `calendar[]`(30일 `{d, ds(점수), intensity, mark, focus}`),
  `bestDay`, `cautionDays`/`goodDays`/`avoidDays`(임계: avoid<22, caution<35, good≥65,
  best≥75 `toMonth.ts:103-108`), `themes[]`(5축 30일 평균), `converge`(사주+점성 동시
  임팩트 날), `narrative[]`
- 해석축: "이번 달 리듬" — 어느 날이 좋고/조심인지 + 수렴일.

### 3.5 일진 (Day) — `toDay`, type `DestinyDay` (가장 복잡)
- 입력: 해당 1 cell
- 필드: `iljin`(일 간지)·`iljinSibsin`, `score`(0~100), `themes[]`(5축),
  `signals[]`(사주)/`transits[]`(점성)/`crossSignals[]`/`allSignals[]`,
  `oneLine`, `topReasons[]`/`cautions[]`, `shinsalActive[]`
- **Phase 3 신규 5종**(`toDay.ts:13-19`): `jijanggan`(지장간 3층), `geokgukStatus`
  (격국 성/파), `gongmang`(공망 활성), `appliedPatterns[]`(8종), `crossActivations[]`
- 해석축: "오늘" — 점수 + 가장 밝은/어두운 신호 5개 + 교차쌍.

---

## 4. 해석 로직 — 어떻게 해석하나

### 4.1 점수 (0~100, 5등급) — `derivers/score.ts`, `grade.ts`
1. **층별 평균 polarity** → **층 가중**(`LAYER_WEIGHT`: 대운1.0/세운0.85/월0.7/일0.55)
   로 2단계 가중평균(`grandAvg`, −3~+3). 일진이 대운을 압도하지 않게 하는 핵심.
2. 정규화: `score = 50 + (grandAvg − 1.75) × 16` (bias 1.75로 recenter — 안 하면 평균
   ~86로 다 "좋은 날" 인플레).
3. 보정: 3층↑ 정렬 시 ±4(공명), 패턴 매치 ±12×강도, soft-compress(90~98 / 하단).
4. 등급(`grade.ts:8-31`): **≥74 최고 / ≥64 좋음 / ≥46 보통 / ≥33 조심 / <33 지키기**
   (목표 분포 5/15/50/25/5%, 1095일 골든샘플로 보정).

### 4.2 테마 5축 — `derivers/themeScores.ts`
- 각 신호의 `themes` 태그별로 polarity 가중 누적 → love/money/career/health/growth
  각 0~100. **종합점수와 독립**(score=70인데 love=55 가능 — 정상).

### 4.3 교차신호 해석 (§2.1)
- 카드 1급 소재로 써라: "오늘 正官이 토성을 만나 **구조·책임이 2배**" 식.
- polarity=0(혼합)이면 "강화"가 아니라 **"긴장/갈등"**으로 읽어야 한다.
- 근거: `parentIds`로 어떤 사주신호 + 어떤 점성신호인지 명시 가능.

### 4.4 합치도 해석 (§2.2)
- `aligned`(≥75%): "두 시스템이 같은 방향 → 신뢰도 높음, 밀어붙여도 됨"
- `mixed`(55~74%): "큰 줄기 같지만 디테일 갈림 → 핵심만"
- `opposed`/낮음: "사주·점성이 엇갈림 → 보수적으로"

### 4.5 다층 수렴 (제안 — destinypal의 우위)
- 캘린더는 층을 평균에 묻지만, destinypal은 **"몇 개 층이 같은 방향인지"**를 드러낼 수
  있다. 예: 평생(약 火) + 대운(金 소모) + 세운(火 보충) + 목성회귀 = "2026 회복의 해".
- 헤드라인 후보: "5개 층 중 N개 정렬 ↑/↓".

### 4.6 내러티브
- `oneLine`(요약) + `topReasons`/`cautions`(영향 큰 신호 5개) + `narrative[]`(룰 매칭 산문).
- 톤은 점수가 아니라 **신호/패턴 룰**에서 나온다(점수-내러티브 불일치 주의).

---

## 5. 현재 상태 (구현 vs placeholder)

**완료**: 엔진 wiring(실데이터), 5층 어댑터, 점수/등급, 테마, 교차신호 추출,
합치도, Phase 3 일진 5종 추출.

**placeholder / 미완**:
- 대운 `hapchung`/`unseong` 일부 "분석 준비 중" 폴백(`toDecade.ts:300-306`)
- 대운 테마가 십신 룩업으로 **하드코딩**(동적 아님)
- 월 `appliedPatterns` 타입만 있고 어댑터 미집계
- 점수↔테마 cross-domain 집계 출처 불명확(신호 정의에 의존)

**아직 교차 안 된 것(개선 여지)**: §6.

---

## 6. 더 교차시킬 빈 곳 (사주×점성 — 임팩트순)

1. **궁(宮) × 하우스 매핑** ⭐최대 — 사주 4궁 ↔ 점성 12하우스가 **안 연결**됨.
   일주(배우자)↔7H, 시주(자녀)↔5H … 매핑 추가 → "배우자궁 + 7H 트랜짓 동시 =
   관계 타이밍" 교차신호. `saju-astro-mapping.ts` 패턴 그대로 확장.
2. **강약 × 품위 충돌** — 사주 일간 강약 ↔ 점성 accidental dignity. "약한 일간 +
   흉성 강세 = 불안정" 긴장 신호. 현재 둘이 따로 놂.
3. **격국 × Lot/ZR 룰러/노드** — 둘 다 "인생 구조·목적"을 말함. 교차 시 "인생 테제".
4. **오행 브릿지 심화** — 현재 wood/metal→air로 lossy(`fusion/bridges/element.ts`).
   상생/상극 관계를 점성 원소 균형과 교차해 "이 시기 필요 오행 충족/차단".

> 권장 착수: **1번**(매핑 테이블 1개 추가 + 교차 추출 확장). 기존 17쌍과 같은 구조라
> 리스크 낮고 연애/결혼 타이밍 정밀도 즉시 상승.

---

## 7. 핵심 파일 (참조)

| 영역 | 파일 |
| --- | --- |
| 페이지 조립(SSR) | `src/app/destinypal/page.tsx` |
| 어댑터 | `src/components/destinypal/adapters/{toLifetime,toDecade,toYear,toMonth,toDay,toUser,shared}.ts` |
| 타입 | `src/types/destinypal/{lifetime,decade,year,month,day,user,shared}.ts` |
| 아톰(시각) | `src/components/destinypal/atoms/{ScoreDial,ThemeBars,Ganji,Polarity,ElementBars}.tsx` |
| 점수/등급/테마 | `src/lib/calendar-engine/derivers/{score,grade,themeScores,crossAgreement}.ts` |
| 교차 매핑/추출 | `src/lib/calendar-engine/data/saju-astro-mapping.ts`, `extractors/cross-activation.ts` |
| 융합 정규화 | `src/lib/fusion/normalizer/{saju,astro}.ts`, `bridges/element.ts` |
