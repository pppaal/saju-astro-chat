# raw → consumer 분배 명세 (Single Source of Truth)

> raw 사주/점성 데이터에서 4 consumer (운명 LLM / 궁합 LLM / 통합 리포트 / 캘린더·운흐름) 가
> 각각 무엇을 받아야 하는지의 SSOT. consumer 가 자기 분석을 자기 책임으로 호출하는 패턴
> (sajuFacts/astroFacts 정제 + consumer 가 직접 분석 함수 호출).
>
> **v5.1 (2026-06-06)** — raw 행 정밀화: 점성 raw 행 분리 (ASC/MC vs houses) +
> sect 를 분석 행으로 이동 (Sun house derive). 운명 LLM houses 셀 정정 (부분 사용 — H번호만).
> **v5 (2026-06-06)** — 3 Opus 병렬 운명/궁합/통합 시점 코드 실측 재검증 + PR #1230 (조후) /
> PR #1231 (buildReportContext) 반영. 운명 LLM 8 셀 / 궁합 3 셀 / 통합 4 셀 정정.
> (v4: 4 consumer 진입점 검증, 흐름성 축 도입. v3: 엔진 output type 대조.)

## 마커 범례

- `✅` = 받고 진짜 사용 (출력/프롬프트에 반영)
- `⚠️ dead` = 받지만 화면/출력에 표시 0 (비용만 있고 미사용)
- `-` = 안 받고 안 씀
- `◐` = 캘린더가 *내부 계산입력*으로만 참조(표시 X) — 동사 신호 산출용 "정답키"
- `🔴` = 캘린더 점수 *오염*: 정적(명사)인데 매일 polarity 로 emit → v3 서 제거 대상
- **흐름성** 열: `명사`=정체(시간 불변 → 리포트行) / `동사`=활성·이동(시기가 본명 점등 → 캘린더行)
- ※ "계산 vs 전송" 주의: 궁합은 풀 본명을 *계산*하나 LLM 엔 cross-signal 만 *전송* → 본 표는
  "출력/프롬프트 사용" 기준이라 미전송 분석은 `-`.

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
├── daeun  — 대운 ganji list (daeWoon.list 별칭)
├── annual — 세운 list
└── monthly — 월운 list
```

**raw 안에 이미 들어있음** (별도 분석 불필요):
- 십신 sibsin (각 기둥의 천간/지지에 다 박힘)
- 대운/세운/월운 timing

**raw 에 없음** (별도 함수 호출 필요):
- 일진 (iljin) — `getIljinCalendar(year, month, dayMaster)` 호출
- currentSeun / currentWolun / currentIljin / unseRelations — fusion saju adapter (`buildSajuNormalizerInput`) 가 만듦
- → 모두 "**사주 분석 (derived)**" 카테고리로 분류

### 점성 raw (`calculateNatalChart` 출력 → `toChart` Chart)

```
planets[]   — name, longitude, sign, degree, house, retrograde, speed
ascendant   — PlanetData
mc          — PlanetData
houses[12]  — cusp, formatted (sign 포함)
meta        — jdUT, isoUTC, timeZone, lat, lon, houseSystem
```

## 2. raw → consumer 분배 표 (v5 — 3 Opus 재검증 + PR #1230/#1231 반영)

> v5 검증: 3 Opus 병렬 실측 (운명/궁합/통합) — v4 의 ~15 셀 정정.
> 진입점: 운명 `app/api/counselor/realtime/route.ts → counselorContext.ts + astroSelfFormatter + slimAstroSelf` ·
> 궁합 `app/api/compatibility/counselor/route.ts → sajuSynastryFormatter + astroSynastryFormatter + compositeChartFormatter` ·
> 통합 `app/(main)/integrated-report/page.tsx → buildReportContext (PR #1231) → adapter.ts` ·
> 캘린더 `calendar-engine buildCalendar + extractor 31`.

| 항목 | 종류 | 흐름성 | 운명 LLM | 궁합 LLM | 통합 리포트 | 캘린더 (운흐름) |
|---|---|---|---|---|---|---|
| **사주 raw** | | | | | | |
| pillars (4기둥 + 십신 + 지장간) | raw | 명사 | ✅ | ✅ | ✅ | ✅ |
| dayMaster (일간) | raw | 명사 | ✅ | ✅ | ✅ | ✅ |
| fiveElements (오행 카운트) | raw | 명사 | ✅ | ✅(재계산) | ✅ | ✅ |
| 대운 list | raw | 동사 | ✅ | - | ✅ | ✅ |
| 대운 current | raw | 동사 | ✅ | ✅ | ✅ | ✅ |
| 세운 list (연) | raw (unse.annual) | 동사 | -(현재1점만) | -(cross) | - | ✅ |
| 월운 list | raw (unse.monthly) | 동사 | -(현재1점만) | - | - | ✅ |
| **사주 분석** (raw 위에 추가) | | | | | | |
| 격국 (determineGeokguk) | 분석 | 명사 | ✅ | - | ✅ | 🔴 |
| 용신 (determineYongsin) | 분석 | 명사 | ✅ | - | ✅ | ◐ |
| 12운성 (getTwelveStagesForPillars) | 분석 | 명사/동사 | ✅ | - | ✅ | ✅(시기) |
| 신살 self (getShinsalHits) | 분석 | 명사 | ✅ | ✅(cross) | ✅ | ◐ |
| 십신 분포 카운트 (즉석 sibsinOf / analyzeSibsinComprehensive) | 분석 | 명사 | ✅(즉석) | - | ✅(categoryCount) | - |
| 공망 self (getGongmang) | 분석 | 명사 | ✅ | - | ✗null | ◐ |
| 공망 cross 양방향 (gongmangOf cross) | 분석 | 동사 | - | ✅ | - | - |
| 본명 합충형 관계 (analyzeRelations) | 분석 | 명사 | ✅ | - | ✅ | -(시기 형충만 ✅) |
| 조후용신 (getJohuYongsin) | 분석 | 명사/동사 | ✅(rating≥4) | - | - | ✅(extractor) |
| 통근 (sajuFacts.rooted / calculateTonggeun) | 분석 | 명사/동사 | ✅(rooted) | -(field 미독취) | - | ✅(shift) |
| 득령 (calculateDeukryeong) | 분석 | 명사 | - | - | - | -(미확인) |
| 형충회합 시간 cross (analyzeHyeongchung) | 분석 | 동사 | ✅ | - | - | ✅ |
| 일진 캘린더 (getIljinCalendar — 별도 함수) | 분석 | 동사 | ✅ | - | - | ✅ |
| 현재 세운/월운/일진 (fusion adapter 1점) | 분석 | 동사 | ✅ | - | - | - |
| **사주 cross 분석 (궁합 전용)** | | | | | | |
| 십성·지장간·세운·신살 cross | 분석 | 동사 | - | ✅ | - | - |
| 본명 합/충/형/해/파/삼합/방합 cross | 분석 | 동사 | - | ✅ | - | - |
| **운기 cross (LLM 운명 전용)** | | | | | | |
| unseRelations (세운/월운/일진 ↔ 본명/대운) | 분석 | 동사 | ✅ | - | - | - |
| **점성 raw** | | | | | | |
| planets (10행성 + 노드) | raw | 명사 | ✅ | ✅ | ✅ | ✅ |
| ASC / MC | raw | 명사 | ✅ | ✅ | ✅ | ✅ |
| houses (12 cusp) | raw | 명사 | 부분(H번호만) | ✅ | ✅ | ✅ |
| **점성 분석** (raw 위에 추가) | | | | | | |
| sect (Sun house → day/night) | 분석 | 명사 | ✅ | ✅ | ✅ | ✅ |
| 본명 aspects (major) | 분석 | 명사 | ✅ | ✅ | ✅ | - |
| dignity (단순 per planet) | 분석 | 명사 | ✅ | - | ✅ | - |
| dignity 5-tier (dignityTiers) | 분석 | 명사/동사 | - | - | -(PR #1231) | ✅(트랜짓) |
| Chiron / Lilith (본명) | 분석 | 명사 | -(slim drop) | ✅(synastry) | ✅(extraPoints) | - |
| Fortune / Vertex (본명) | 분석 | 명사 | - | ✅(synastry) | - | - |
| 7 Arabic Lots (calculateArabicLots) | 분석 | 명사 | - | - | -(PR #1231) | ◐ |
| Zodiacal Releasing (L1 활성챕터) | 분석 | 동사 | - | - | -(PR #1231) | ✅ |
| Almuten Figuris | 분석 | 명사 | - | - | -(PR #1231) | -(미확인) |
| Profection (당해 활성 하우스) | 분석 | 동사 | ✅ | - | ✗미계산 | ✅ |
| Transit (행성 트랜짓) | 분석 | 동사 | ✅ | - | - | ✅ |
| Eclipse (식) | 분석 | 동사 | ✅ | - | - | ✅ |
| Fixed star 트랜짓 | 분석 | 동사 | -(slim drop) | - | - | ✅ |
| Solar Return | 분석 | 동사 | ✅ | - | - | ✅ |
| Lunar Return | 분석 | 동사 | -(slim drop) | - | - | ✅ |
| Secondary Progression | 분석 | 동사 | ✅ | - | - | ✅ |
| **점성 cross 분석 (궁합 전용)** | | | | | | |
| Synastry · Composite aspects | 분석 | 동사 | - | ✅ | - | - |

### v4 → v5 셀별 정정 노트

**운명 LLM (8 셀)**:
- 세운 list ✅ → `-(현재1점만)` — `counselorContext` 가 `unse.annual` list 미독취. fusion `currentSeun` 1점만 받음.
- 월운 list ✅ → `-(현재1점만)` — 동일.
- 십신 분포 카운트 - → `✅(즉석)` — `counselorContext.ts:803-820` 가 `sibsinOf` 즉석 계산으로 "십성 분포: X N Y N" 라인 emit.
- 조후용신 - → `✅(rating≥4)` — PR #1230 도입. 강한 계절 결핍 사주만 노출.
- Chiron / Lilith 본명 ✅ → `-(slim drop)` — `astroFacts(includeHellenistic:false)` 라 hellenistic 미생성 + `slimAstroSelf` 본명 positions 전체 drop.
- Fortune / Vertex 본명 → `-` — 동일 사유 (운명 LLM 안 받음).
- Fixed star 트랜짓 ✅ → `-(slim drop)` — `slimAstroSelf` 가 Fixed Stars 헤더 미매칭 → drop.
- Lunar Return ✅ → `-(slim drop)` — `slim` 이 "Solar Return" 만 매칭, "Lunar Return" 미매칭.

**궁합 LLM (3 셀)**:
- 통근(rooted) ✅ → `-` — `compatSajuFacts.base.rooted` 있지만 route/formatter 둘 다 안 읽음. (v3 "✅ 후함 정직 처리" 시 누락 항목.)
- 공망 cross 신규 행 추가 — `sajuSynastryFormatter:494-500` 가 `gongmangOf(aDay)` 로 self 공망 계산해 cross 라인 emit. v4 까지 표 누락.
- fiveElements 옆 주석 `✅(재계산)` — route 는 `base.fiveElements` 안 읽음. formatter 가 stems/branches 로 자체 재계산해 오행 합산 라인 emit.

**통합 리포트 (4 셀)** — PR #1231 (`buildReportContext`, `includeHellenistic:false`) 반영:
- dignity 5-tier ⚠️ dead → `-(PR #1231)` — `dignities:[]` 빈 채움. 계산 안 됨.
- 7 Arabic Lots ⚠️ dead → `-(PR #1231)` — 동일.
- Zodiacal Releasing ⚠️ dead → `-(PR #1231)` — 동일.
- Almuten Figuris ⚠️ dead → `-(PR #1231)` — 동일.

### 2.5 흐름/리포트 분리 (V3 캘린더 엔진 핵심)

- **명사(정체)** = 시간 불변 → **통합 리포트** 거주. **동사(활성·이동)** = 시기가 본명 점등 → **캘린더** 거주. **겹침** = raw 골격(4기둥·일간·오행·planets·ASC·MC·houses)뿐.
- **🔴 캘린더 점수 오염 (v3 제거):** `saju-geokguk`(격국 성패를 매일 polarity ±1 emit, `layer:'daily'`) + `saju-ilju-archetype`(일주 archetype 매일). 정적인데 흐름 점수에 매일 기여. (`saju-pattern` 격국명은 이미 `index.ts` score filter 로 제외됨 — narrative 만.)
- **◐ 계산입력 4개 (표시 X, 동사 산출용):** 용신(→`saju-yongsin` 시기 천간 대조) · 신살 위치(→`saju-shinsal-activation`) · 공망 위치(→`saju-gongmang`) · Lots 위치(→`astro-zr` 챕터 seed). 코드로 소비 확인.
- **격국 ◐ 아님:** 어느 캘린더 extractor 도 격국 안 읽음. 격국은 *용신 산출 시 상류(build.ts)* 에서만 쓰이고 캘린더는 결과(용신)만 받음.
- 같은 이름 정체/활성 분리: 용신(정체=리포트) vs 용신 *활성*(동사=캘린더), 12운성(본명) vs 12운성(시기), 통근(본명) vs 통근 *변화*(대운).

## 3. 엔진 실제 output 과 raw 행 대조 (v3)

### `calculateSajuData` 실제 출력 (`src/lib/saju/types.ts:113-153`)

```
{
  yearPillar / monthPillar / dayPillar / timePillar  (legacy spread)
  pillars: { year, month, day, time }                (nested)
  daeWoon: { startAge, isForward, current, list }
  unse: { daeun, annual, monthly }
  fiveElements: { wood, fire, earth, metal, water }
  dayMaster: StemBranchInfo
}
```

→ 표의 사주 raw 행과 일치.

### `calculateNatalChart` 실제 출력 (`src/lib/astrology/foundation/astrologyService.ts:36`)

```
{
  planets[]: PlanetData
  ascendant: PlanetData
  mc: PlanetData
  houses[12]: { cusp, formatted }
  meta?: { jdUT, isoUTC, timeZone, lat, lon, houseSystem }
}
```

→ 표의 점성 raw 행과 일치.

### v2 → v3 raw 행 정정

- **일진 list (v2 raw)** → **사주 분석 행으로 이동**: `calculateSajuData` 가 안 만듦. `getIljinCalendar(year, month, dayMaster)` 별도 함수 호출.
- **currentSeun / currentWolun / currentIljin / unseRelations** → 표에 분석 행으로 명시: fusion saju adapter (`buildSajuNormalizerInput`) 가 만드는 derived. raw 도 아니고 일반 분석도 아닌 fusion 계층.

## 5. 핵심 변경 (v1 → v2)

### 운명 LLM 추가 (v1 누락):
- 통근, Fixed Stars, Chiron/Lilith, Secondary Progression, Lunar Return, 형충회합 시간 cross
- unseRelations (운기 cross — 새 행)

### 통합 리포트 ⚠️ dead 표시 (v1 ✅ 였던 것):
- ~~Arabic Lots / ZR / Almuten — buildNatalContext 가 계산해 넘기지만 IntegratedReport.tsx 표시 0~~
- ~~dignity 5-tier — 받지만 adapter 가 단순 dignity 재계산 (5-tier 무시)~~
- **(v5 정정)** 위 4개 모두 PR #1231 (`buildReportContext`, `includeHellenistic:false`) 로 해소. 계산 자체 안 일어남 → `-` 로 통일.
- **(v4 정정) Profection** — ⚠️dead 아님, 통합 리포트 경로엔 *계산 자체가 없음*(natal-static).
- **(v4 정정) 공망(self)** — buildNatalContext 가 gongmangBranches 미설정 → `evalVoid` null, 미렌더.

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

## 6. 발견된 비효율 / 후속 결정

### A. ~~통합 리포트 dead data~~ → ✅ 해소
PR #1231 (`buildReportContext` + `includeHellenistic:false`) 로 Profection/Lots/ZR/Almuten/5-tier dignity 계산 자체 안 함. 비용 0, dead 0.

### B. ~~dignity 5-tier 비효율~~ → ✅ 해소
PR #1231 후 adapter 는 단순 `dignityOf` 만 사용 (예전부터 그랬음), buildReportContext 가 5-tier 안 받음 → 일관됨.

### C. 궁합 LLM 추가 분석 (Opus 추천 — 미결)
**현재**: 합·충·형 표면 신호만. 격국/용신/12운성 등 핵심 사주 분석 미사용. **통근(rooted) 도 누락** (v5 정정).
**옵션**:
1. 격국/용신/12운성/조후 cross 룰 추가 → 결혼·인내·역할 해석 풍부
2. 현 상태 유지 (cross 만으로 충분)

### D. ~~조후용신 dead~~ → ✅ 해소 (운명만)
PR #1230 으로 운명 LLM 도입 (rating ≥4 만). 궁합 LLM 은 미도입 (cross 본질 보존).

### E. 운명 LLM 의 slimAstroSelf drop (신규)
**현재**: `formatAstroSelf` 가 본명 positions / Fixed Stars / Lunar Return 헤더 emit 하지만 `slimAstroSelf` 가 매칭 없어 통째 drop.
**영향**: Chiron/Lilith/Fortune/Vertex 본명점, Fixed star 트랜짓, Lunar Return 운명 LLM 미전송.
**옵션**:
1. `slimAstroSelf` 매칭 패턴 추가 → 토큰 ↑, 정통 점성 깊이 ↑
2. 현 상태 유지 (slim 의도된 단순화)

### F. buildNatalContext 폐기 진행
- ✅ Phase 1 (PR #1231): 통합 리포트 → `buildReportContext`
- ⏭ Phase 2: 캘린더 convergence
- ⏭ Phase 3: 운흐름 page + preview
- ⏭ Phase 4: `buildNatalContext` 통째 제거

## 7. 아키텍처 의도

- raw 정제 = `sajuFacts` (collectSajuFacts) + `astroFacts` (collectAstroFacts)
- 모든 consumer 가 같은 facts wrapper 통과 → 동일 source
- **분석은 consumer 가 자기 책임**으로 호출:
  - 운명상담사 → counselorContext 가 `getShinsalHits` / `getTwelveStagesForPillars` 등 직접 호출
  - 통합 리포트 → page.tsx 가 직접 호출 (현재 buildNatalContext 의존)
  - 캘린더 → calendar route / derivers 가 직접 호출 (현재 buildNatalContext 의존)
- `buildNatalContext` 처럼 *모든 분석 한꺼번에* 만드는 fat wrapper 패턴은 폐기 대상

## 8. 검증 상태

- 2026-06-06 v1 작성 (분배 의도 명세)
- 2026-06-06 v2 Opus 코드 실측 감사 반영 — v1 의 ~15 셀 오류 수정
- 2026-06-06 v3 엔진 실제 output type 과 대조 — 일진 / fusion derived 를 raw → 분석 행으로 재분류
- 2026-06-06 **v4** — 4 consumer 진입점 코드 검증(운명/궁합/통합/캘린더). 추가 발견:
  - **흐름성(명사/동사) 축** 도입 — V3 캘린더 엔진의 리포트/흐름 분리 근거 (§2.5).
  - 캘린더 **🔴 정적 오염** 2개(`saju-geokguk`·`saju-ilju-archetype` 매일 emit) + **◐ 계산입력** 4개(용신·신살·공망·Lots) 확정.
  - 통합 리포트 **공망=미계산(null)**, **Profection=미계산**(전엔 ⚠️dead 로 오기).
  - 궁합 `-` 는 방어됨 — 풀 본명을 *계산*하나 LLM 엔 cross-signal 만 *전송*(계산≠전송).
- 2026-06-06 **v5** — 3 Opus 병렬 운명/궁합/통합 시점 코드 실측 재검증. ~15 셀 정정:
  - 운명 LLM 8 셀 (세운/월운 list, Chiron/Lilith/Fortune/Vertex 본명, Fixed star/Lunar Return 트랜짓 = slimAstroSelf drop, 십신분포 즉석=✅, 조후 rating≥4=✅).
  - 궁합 LLM 3 셀 (통근 ✅→`-`, 공망 cross 신규 행, fiveElements 자체 재계산).
  - 통합 리포트 4 셀 (Lots/ZR/Almuten/5-tier dignity ⚠️dead→`-`) — PR #1231 (`buildReportContext`) 로 해소.
  - 신규 후속 결정 E (운명 LLM slimAstroSelf drop) / F (buildNatalContext 폐기 Phase 추적).
- 2026-06-06 **v5.1** — raw 행 정밀화:
  - 점성 raw 행 분리: "ASC/MC·sect·houses" → "ASC/MC" + "houses (12 cusp)" 2 행.
  - `sect` (Sun house → day/night) 를 점성 분석 섹션으로 이동 — derive 데이터라 raw 아님.
  - 운명 LLM houses 셀: ✅ → `부분(H번호만)` — 행성의 하우스 번호만 표시, cusp 자체는 미사용.
- TODO: C(궁합 분석 확장) / E(slimAstroSelf 매칭) 결정 + V3 캘린더 엔진(§2.5 의 🔴 제거 / ◐ 분리) → implementation

## 9. 참고

- 옛 `buildNatalContext` (src/lib/calendar-engine/context/build.ts) = 통합 리포트 + 캘린더 + 운흐름 의 공통 fat wrapper. 이 표 적용 후 폐기 또는 thin pass-through 로.
- 운명/궁합 LLM 영역은 facts → consumer 패턴 이미 완료 (PR #1208, #1209, #1210, #1211, #1213, #1216).
