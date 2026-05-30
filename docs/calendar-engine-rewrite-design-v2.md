# 캘린더 엔진 재작성 설계문 **v2** (5-리뷰 반영)

> 상태: **리뷰 1회전 반영 완료**. v1(`calendar-engine-rewrite-design.md`)을 Opus 5각도 적대 리뷰(도메인/수학/코드정합/아키텍처/제품)로 검증 후 수정.
> 브랜치: `claude/gyeol-to-heureum-bQpP2`
> 원칙: **토대(§1~6)가 모순 없이 선 다음에 흐름(§7)을 얹는다. 동시 착수 금지.**

---

## v1 → v2 변경 이력 (무엇이 틀렸었나)

| # | v1의 오류 | 근거 리뷰 | v2 수정 |
|---|---|---|---|
| E1 | "현 사주 polarity = flat 십신" 전제 | 도메인 H-3 | 실제는 **용신 기반**(`polarityFromYongsin`). 진짜 이중계산은 `saju-pillar.ts`↔`saju-yongsin.ts`. §2·§3 정정 |
| E2 | "두 축 평균 = 헤드라인" | 아키 C1·수학 H3 | deriveScore 비선형 → **신호별 기여 분해**로 단일계산. §4 |
| E3 | "모든 신호를 매끈한 연속 파동으로" | 도메인 M-3·수학·제품 | 사주 일진/형충은 이산 → **source/kind별 envelope 분기**(astro=곡선, 사주=box). §7.3 |
| E4 | "`peak==start`는 확인필요 항목" | 4개 리뷰 전부 | **구조적 BLOCKER** — degenerate window 가드 + layer별 최소폭. §7.2 |
| E5 | "deriveScore에 한 줄·엔진 무변경" | 수학 C2·아키·코드정합 | 내부 부등식보너스·round가 계단 재주입 → **엔진 연속화 필요**. §4.2 |
| E6 | "FlowChart에 그대로 매핑, 신규 최소" | 아키 C2·코드정합 | FlowSeries contract 부재 + prop이 momentum/phase 못 담음 → **타입 신설 + prop 확장**. §7.7·§8 |
| E7 | intensity 무시(평균만) | 수학 C1·제품 H1 | "강렬·모순된 날"이 50점으로 뭉개짐 → **tension 별도 채널**. §5 |
| E8 | "흐름=정밀 예언" 톤 | 제품 C3·H2 | 불확실성 표현 부재 + 6국면 임의발명 → **신뢰밴드 + 3국면 톤다운**. §7.6·§7.8 |

---

## 1. 문제 (검증됨 — 변경 없음)

캘린더 헤드라인 점수원이 **4중 분기, 서로 다른 입력**에서 나와 모순(코드정합 리뷰가 라인별 확인):
- 헤드라인 `derivedScore`(`route.ts:498`) / `sajuAxisRaw`=UltraPrecision(`yearlyDates.ts:1964,2054`) / `astroAxisRaw`=transit(`route.ts:376`→`yearlyDates.ts:2049-2055`) / `crossAgreement`=claim IIFE(`yearlyDates.ts:2006`, 입력이 축과 완전 별개).
→ "축 aligned인데 교차 28%" 모순이 **구조적으로 실재**. (별개 표면 B = `scoring.ts` 50/50은 **런타임 소비처 0건 = dead**, §6에서 정리.)

## 2. keep-line — Layer 0 (사실)

천문(ephemeris-golden 통과)·사주(1758 테스트 통과) **사실 계산은 불변**. NatalContext도 유지: `strength`(`context/types.ts:24`), `sect`(`:62`), dayMaster/yongsin/geokguk/fiveElements.

**E1 정정**: 현 사주 polarity는 v1이 적은 "flat 십신 매핑"이 **아님**.
- `saju-pillar.ts` = `polarityFromYongsin`(용신 기반) — 십신은 theme에만.
- `saju-yongsin.ts` = 또 용신 기반 polarity — **동일 element에 부호 이중 emit**(진짜 이중계산, §6 삭제 대상).
- `saju-shinsal.ts` = extractor가 polarity 직접 부여.
- astro = `inferAspectPolarity`(`tagger.ts:72`)를 extractor가 호출 — flat `PLANET_BENEFIC_MALEFIC`.

## 3. 해석 규칙 (NEW ①) — conditional만 rules로

**경계 규칙(아키 H2)**: polarity가 NatalContext(strength/sect)에 **의존하는 신호만** 공유 `rules`로 모은다. 고정 polarity 신호는 extractor 직접 유지 — 안 그러면 3-hop 인디렉션.

### 3.1 십신 polarity — **1차 근사**로 명시 (도메인 M-1)
신강/신약 conditional 반전(식상·재성·관성은 신강 길/신약 흉, 인성·비겁은 반대)을 **rules**로. 단:
- ⚠️ **1차 근사임을 명시**. 자평진전 통설은 격국(geokguk) 위주이고 strength는 보조 — **재다신약/관인상생/상관견관**은 단일 strength축으로 안 잡힘.
- ⚠️ **용신 polarity와 충돌·삼중계산 위험**(E1). sibsin-strength를 도입하면 pillar-yongsin + yongsin-extractor와 **3중**. → **합성 규칙 필수**: 십신-strength는 *theme별 가중 조정*에만 쓰고 부호 최종권은 용신에 두거나, 용신 extractor polarity를 0으로 내려 단일화. (확인필요 #1)

### 3.2 행성 polarity — sect 분기 + sect light (도메인 H-2, M-4)
- malefic 완화/악화: **Saturn 주간 in-sect 완화·야간 악화 / Mars 야간 완화·주간 악화** (고전 교리, 확정).
- benefic: Jupiter 주간↑ / Venus 야간↑.
- **sect light 추가**(v1 누락): 주간=Sun, 야간=Moon이 주광체 → 자기 sect일 때 가중↑. `sectLight`가 이미 `fusion/adapters/astro.ts`에 존재 → 캘린더로 이식.
- **conjunction 합성 규칙 명시**(도메인 H-1): `inferAspectPolarity(type, A, B, sect)`로 시그니처 확장 → "sect 조정된 행성 등급" 산출 후 aspect 표 적용(2단 합성).

### 3.3 어스펙트 weight — applying/separating 비대칭 (도메인 M-2)
`findTransitAspects`가 이미 `isApplying` 산출(`transit.ts:68,151,178`)하나 `astro-transit.ts:225-230`이 **버림**. → weight/envelope 하강부를 **applying(접근=긴장고조)·separating(분리=빠른 해소)** 비대칭화. 데이터 이미 있음(저비용).

## 4. 점수 모델 (NEW ②) — 분해형 + 연속화

### 4.1 신호별 기여 분해 (E2 / 아키 C1)
"필터 후 재계산" 폐기. **deriveScore 1회** 실행, grandAvg에 대한 각 신호의 기여분을 source로 누적:
```
grandAvg = Σ_layer (layerAvg_layer · lw_layer) / Σ lw
headline = normalize(grandAvg, BIAS, SCALE) + bonuses        // 단일 계산
sajuAxis  = headline 중 saju 신호 기여분 (분해 표시값)
astroAxis = 나머지
```
→ **헤드라인 = 합의 분해**라 정의상 `headline = f(sajuAxis, astroAxis)` 항상 성립. **결정(확인필요 #2)**: 두 축은 "절대점수"가 아니라 **헤드라인의 분해 표시값**으로 못박는다(순위·방향용). bonuses/compression은 헤드라인에만.

### 4.2 엔진 내부 연속화 (E5 / 수학 C2)
현 `score.ts`가 곡선의 적 — 흐름 모드에서 교체:
- 공명 보너스(`:92-95`, `layerAvg>0.3` 카운트 → `length>=3`이면 +4) = **임계 통과 시 ±4 계단**. → `resonance = k·tanh(Σ softsign(layerAvg))` **연속 함수**로.
- `Math.round/floor` compression(`:114-119`) = 정수격자 톱니. → flow 시계열은 **float 유지, 렌더 직전만 라운딩**.
- 패턴 보너스(`:97-103`)는 시간 무관 상수 오프셋 → 흐름에선 envelope 변조 대상에서 빼거나 momentum 계산서 제외.

### 4.3 캘리브레이션
BIAS=1.75/SCALE=16은 §3 규칙 변경 후 **재측정**. (확인필요 #3)

## 5. tension 채널 (NEW — E7 / 수학 C1·제품 H1)
가중평균은 방향만 남기고 강도를 정의상 버림 → +3/−3 충돌이 "평범 50"으로. **2채널로 분리**:
```
posE(t) = Σ_{polarity>0} |pol|·weight·envelope
negE(t) = Σ_{polarity<0} |pol|·weight·envelope
level(t)   = normalize((posE−negE)/(posE+negE+ε))   // 방향
tension(t) = (posE+negE)/Σweight                    // 충돌 강도(같은 source 내부 ±공존도 포착)
```
→ tension 높음 = "⚡혼전(강렬·모순)". 흐름은 **(level, tension) 2채널**. agreement(§7.5)는 saju↔astro 충돌만, tension은 source 내부 충돌까지.

## 6. 삭제/교체 (코드정합 검증 반영)

| 대상 | 조치 | 검증 |
|---|---|---|
| UltraPrecision 축(`yearlyDates.ts:1964,2054`) | 축에서 제거, narrative만 | 확인됨 |
| transit 축(`:2049-2055`,`route.ts:376`) | 엔진 astro 분해로 대체 | 확인됨 |
| claim-IIFE(`:2006`) | `deriveCrossAgreement`로 | 입력이 축과 별개임 확인 |
| override/axisOffset(`:2070-2082`) | 제거. **단 `sajuAxis`(표시값)/`sajuAxisRaw`(raw) 구분 소멸 = 의미변경**(H1) | silent breakage 주의 |
| `saju-yongsin` polarity 중복(E1) | element 부호 이중 emit 제거(라벨/weight 분리) | 도메인 H-3 |
| Surface B `scoring.ts` 함수 | 삭제 안전(런타임 소비처 0) — **타입은 `destinyCalendar` 배럴이 re-export하므로 유지/이전** | 코드정합 확인 |

## 7. 흐름(Flow) 설계 v2 — MVP 우선

> 토대(§1~6)가 선 **다음**에 얹는다. MVP는 "흐름의 본질"만, 정교화는 후속.

### 7.0 본질 (지킬 약속)
운을 시간 위 연속 곡선으로. **핵심 = 두 흐름선(사주/astro)이 같은 엔진(§4 분해)에서 나와 만나고 벌어지는 게 진짜 의미를 갖는 것**(§1 모순제거의 시계열 증명).

### 7.1 흐름 함수
```
flowChannel(t) = { level(t), tension(t) }   // §5
  입력: ActiveSignal[] (셀 그룹핑 이전 raw — 윈도우 안 잘린 상태, 아키 H3)
  각 신호 weight → weight · envelope_s(t)
```

### 7.2 envelope 폭 정책 — **BLOCKER 선결** (E4)
구현 전 **extractor 횡단 작업**: 모든 신호에 layer별 최소폭 부여 + degenerate 가드.
- `peak==start` 또는 `end==peak` (saju-shinsal 하드코딩 단일일 `:95-98`, astro-transit 1-hit 세그먼트 `splitConsecutive:162`) → **0 나눗셈**.
- 규칙: `start/peak/end`에 layer별 최소폭 강제(daily ±0.5d, monthly ±5d, decadal ±1y 등) + `(peak−start)<Δmin` 가드.

### 7.3 envelope 모양 — source/kind 분기 (E3)
- **astro transit**(연속 orb): bump. MVP=**삼각형**(linear), 후속 raised-cosine(아키 M2: 일/주 샘플에선 차이 미미). applying/separating 비대칭(§3.3).
- **사주 일진/형충/삼합/신살**(이산·이진): **box envelope**(윈도우 내 1, 밖 0). "오늘 70% 충"은 명리에 없음.
- §12.9(v1) "연속성: 계단 금지" 불변식은 사주 경계서 당연 위반 → **불변식을 source별로 재정의**(astro만 연속, 사주는 box step 허용).

### 7.4 파생량 (MVP 3개)
level / momentum(수치미분 `(f(t+Δ)−f(t−Δ))/2Δ`) / pivot(부호변화). + tension(§5).
- **pivot 폭발 방지**(수학 C3): **scale-separated** — 굵은 layer(decadal+yearly)로 재구성한 coarse flow에서만 lifetime pivot 검출, + prominence θ 필터. daily 잔물결 미세 pivot 배제.

### 7.5 agreement(t) = level + 방향 (E / 수학 H1)
```
agree_level = band(|levelSaju − levelAstro|)
agree_dir   = sign(momSaju)==sign(momAstro)          // 둘 다 상승이면 레벨차 커도 본류
agreement(t)= w1·agree_level + w2·agree_dir
```
"본류 vs 소용돌이"는 **방향 정합**이 주축.

### 7.6 줌 = 대역제한 평균 (수학 H2)
점 샘플링 금지(aliasing). `flow_zoom(t;scale) = ∫ flow(τ)·kernel_scale(t−τ)dτ`. 인생뷰=큰 저역통과(잔물결 평균화). 줌 일관성 불변식 = "해당 scale 저역성분 일치"로 재정의(달성 가능 형태).

### 7.7 불확실성 표현 (E8 / 제품 C3)
- tension/분산 → **신뢰밴드 폭**(곡선 두께). 모순↑ = 밴드↑ = "불확실".
- pivot 예고는 "6/20경"이 아니라 **±window**.
- momentum 작은 구간 = "흐림" 처리. **거짓 정밀감 차단.**

### 7.8 국면 — 3국면 톤다운 (E8 / 제품 H2·아키 M1)
6국면(임의발명) → **상승 / 고원(정점) / 하강** 3개(momentum 부호 3분류). 톤 = "예언"이 아니라 "지금 곡선 모양 설명". `lifetimePivots.phase`(past/current/upcoming)와 **명명 충돌 해소**.

### 7.9 기존 자산 (재발명 금지 — 제품)
`keyEvents`(강한 구간 run 검출)=phase 상승구간과 중복 → **통합**. `convergence`/`lifetimePivots`=pivot 마커로. `summary.formatReason`/`signalI18n`/`TONE_POOL`=국면 서사 i18n 재사용. "왜 오르나"는 신호 나열 아닌 **momentum 기여(envelope 기울기×polarity) 상위 신호**.

## 8. contract (E6 / 아키 C2·코드정합)
```ts
// NEW — v1에 없던 흐름 타입
type PhaseKey = 'rising'|'plateau'|'falling'
interface FlowPoint { t: string; level: number; tension: number; momentum: number;
  phase: PhaseKey; levelSaju: number; levelAstro: number; agreement: number; confidence: number }
interface FlowPivot { t: string; kind: 'peak'|'trough'; window: [string,string]; evidenceSignalIds: string[] }
interface FlowSeries { resolution: 'day'|'week'|'month'; points: FlowPoint[]; pivots: FlowPivot[] }

// scoreBreakdown — 필드 유지하되 의미변경 감지 위해 판별자 추가(H1)
interface ScoreBreakdown { model: 'v4'; sajuAxis; astroAxis; axisAgreement; crossAgreementPercent; ... }
```
- **FlowChart/CrossLineChart prop 확장은 실제 작업**(`{label,score,type}` → FlowPoint). "그대로 재사용" 철회. `CrossLinePoint→FlowPoint` 어댑터 포함.
- flow 입력 = `ActiveSignal[]`(아키 H3), 셀 캐시 위 아님.

## 9. 캐시/롤아웃 (코드정합 검증)
- `ENGINE_SIGNATURE` bump **2곳 필수**: `cell-cache.ts:27`(`'v3-chironlilith'`), `context/cache.ts:32`(`'natal-v2-rich'`) → `'v4-...'`.
- **주의**: 점수 로직만 바꾸면 birthKey 불변 → cell-cache는 **bump가 유일 무효화 수단**(engineSignature 컬럼 비교 없음). bump 누락 시 stale 영구.
- strength/sect는 birth 파생이라 캐시 키에 암묵 포함 — **누락 아님**.
- flow 시계열 = **별도 캐시 키**(birthKey × scale × range) + 독립 signature.
- 모듈 위치: `derivers/flow/{envelope,flowSeries}.ts` (top-level 금지, 순환 방지).

## 10. 검증 (불변식 재정의)
- Layer 0(ephemeris-golden/saju 1758) **불변 통과**.
- **분해 정합**: `headline == combine(sajuAxis, astroAxis)` 항상(분해형이라 정의상 성립).
- **연속성(source별)**: astro flow 인접 |Δ| ≤ 상한 / 사주 box는 경계 step 허용.
- **줌 일관성**: 저역성분 일치(점 level 아님).
- **pivot 타당성**: prominence θ 이상 + 신호 peak±window 내.
- **FE 회귀(H1)**: 새 분포가 기존 차트 렌더 가정(0~100, 교차 빈도) 안 깨는지.
- 신규 골든: sect 판정 일출/일몰 경계(도메인 L-1, `context/build.ts:175` `sun.house>=7` 의심).

## 11. 구현 순서 (동시착수 금지)
1. **[BLOCKER] envelope 폭 정책 + degenerate 가드** (§7.2, extractor 횡단)
2. **conditional polarity rules** (§3 — 십신-strength↔용신 합성, sect light, applying/separating)
3. **분해형 + 연속화 deriveScore + tension 채널** (§4·§5)
4. **두 축 분해 + agreement(level+방향) + claim-IIFE 교체** (§4.1·§7.5)
5. 삭제·연결(`yearlyDates`) + signature bump (§6·§9)
6. **— 여기까지 토대. 모순 0 확인 후 —**
7. flow 엔진(envelope/flowSeries) + FlowSeries contract + FE prop 확장 (§7·§8)
8. 캘리브레이션(BIAS/SCALE/phase 임계/tension 임계)

## 12. 확인 필요 (구현 전 결정)
1. **#1 십신-strength ↔ 용신 polarity 합성** — 삼중계산 방지: 십신은 theme가중만? 용신 extractor 부호 0? (도메인 H-3)
2. **#2 두 축 정의** — "절대점수" vs "헤드라인 분해 표시값". v2 권장=후자. (아키 C1)
3. **#3 BIAS/SCALE/임계 캘리브레이션** — §3 확정 후.
4. **#4 MVP 범위** — 삼각형 bump/3국면/저역통과 줌으로 시작, cosine·6국면·정교화는 후속. 동의?
5. **#5 sect light·hayz 범위** — sect light는 포함. hayz(rejoicing)는 scope-out 명시? (도메인 H-2)
6. **#6 sect 판정 정확도** — `sun.house>=7` 경계 케이스 수정 + 골든. (도메인 L-1)
