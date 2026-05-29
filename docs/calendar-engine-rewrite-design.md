# 캘린더 엔진 재작성 설계문 (A안: raw 위 전면 재구축)

> 상태: **설계 초안 — 리뷰 대기**. 구현 전 합의용.
> 브랜치: `claude/gyeol-to-heureum-bQpP2`
> 작성 근거: 코드 검증 완료(아래 §0). 추측 아님.

---

## 0. 검증된 전제 (왜 이 설계가 성립하는가)

| 항목 | 검증 | 위치 |
|---|---|---|
| 천문 위치 정확 | ephemeris-golden 통과 (3날짜×10행성, tol 0.05°) | `scripts/ephemeris-golden.mts` |
| 사주 사실 정확 | saju 테스트 1758 통과 | `tests/lib/Saju/**`, `tests/saju-calculation.test.ts` |
| 실제 엔진 동작 | 5월치 374ms, 5테마 신호 정상 | `scripts/engine-status.ts` 실행 확인 |
| 신강/신약 가용 | `NatalSajuContext.strength: 'strong'\|'medium'\|'weak'` | `context/types.ts:24` |
| sect(주/야) 가용 | `NatalAstroContext.sect: 'day'\|'night'` | `context/types.ts:62` |
| 신호 saju/astro 태그 | `ActiveSignal.source: 'saju'\|'astro'` | `calendar-engine/types.ts:61` |

→ **keep-line = Layer 0(천문·사주 사실 + NatalContext). 그 위 해석·점수·축·타이밍 전부 재작성.**

---

## 1. 문제 (재작성하는 이유)

현재 캘린더(표면 A: `route.ts → app/api/calendar/lib/yearlyDates.ts`)는 **점수원이 3중으로 갈려 서로 모순**한다:

- 헤드라인 `score` = calendar-engine `derivedScore` (`route.ts:498`)
- `sajuAxisRaw` = **별도 엔진** UltraPrecision `engineScore.totalScore` (`yearlyDates.ts:1964,2054`)
- `astroAxisRaw` = **별도 계산** transit `dailyTransitScores` (`route.ts:376`)
- `crossAgreementPercent` = **제3의** claim 부호 IIFE (`yearlyDates.ts:2006`)
- (별개 표면 B: `public-api.ts` + `scoring.ts` 50/50 5쌍 — 캘린더와 무관, 오늘의운세용)

결과: `axisAgreement`(`yearlyDates.ts:2058`)와 `resolveCrossSystemTone`(`calendarMatrixEvidenceSupport.ts:273`)이 보는 raw가 헤드라인과 따로 논다 → **"축은 aligned인데 교차 28%"** 모순.

---

## 2. 목표 아키텍처 — 단일 신호 다발 + 단일 polarity 모델

```
[KEEP] Layer 0 ── 천문·사주 사실 (그대로)
  astro: foundation/transit findTransitAspects + ephe → {transit, natal, aspect, orb}
  saju : datePillars/shinsal/sibsin/yongsin → {간지, 신살hit, 십신, 용신}
  natal: strength(신강/신약), sect(주/야), dayMaster, yongsin, geokguk
        │
[NEW ①] 사실 → 신호 해석 (polarity·weight·theme)        §3  ← 도메인 정직성
        │   각 extractor는 "사실 탐지"만 하고, polarity/theme/weight는
        │   공유 규칙 모듈(rules)이 NatalContext 조건부로 부여.
        ▼
[NEW ②] 신호 → 점수 (단일 deriveScore, 2단 layer 평균)   §4
        ▼
[NEW ③] 두 축 = 같은 모델을 source로 분리                §5
  sajuAxis  = deriveScore(signals.filter source='saju')
  astroAxis = deriveScore(signals.filter source='astro')
  axisAgreement / crossAgreement = 두 축 gap에서 단일 도출
        ▼
[NEW ④] 타이밍 = 단일 다발에서 best-day/convergence 선별   §6
        ▼
[교체] scoreBreakdown / resolveCrossSystemTone 입력이 ③과 자동 정합  §7
```

핵심 이득: 헤드라인·두 축·교차·타이밍이 **하나의 신호 다발 + 하나의 polarity 모델**에서 나와 모순이 구조적으로 불가능.

---

## 3. NEW ① — 사실 → 신호 해석 규칙 (도메인 정직성)

extractor는 "사실 탐지"만. polarity/theme/weight 부여는 **공유 rules 모듈**이 담당하고, NatalContext(strength, sect)를 조건으로 받는다. 현재 `themes/featureMap.ts`의 flat 매핑을 조건부로 승격.

### 3.1 십신 → theme + polarity (신강/신약 conditional)

현재 `SIBSIN_THEME_MAP`(`featureMap.ts:84`)은 theme만, **flat**. 신설: theme는 유지하되 **polarity가 strength에 따라 반전**.

원리: 십신의 길흉은 신강/신약에 따라 뒤집힌다.
- **식상**(식신·상관): 신강 → 길(설기, +), 신약 → 흉(누설, −)
- **재성**(편재·정재): 신강 → 길(+), 신약 → 흉(재다신약, −)
- **관성**(편관·정관): 신강 → 길(+), 신약 → 흉(관살이 부담, −)
- **인성**(편인·정인): 신강 → 흉(과다, −), 신약 → 길(생조, +)
- **비겁**(비견·겁재): 신강 → 흉(과다, −), 신약 → 길(방조, +)

제안 테이블 (medium은 polarity 약화/중립):

| 십신군 | strong | medium | weak |
|---|---|---|---|
| 식상 | +2 | +1 | −1 |
| 재성 | +2 | +1 | −1 |
| 관성 | +1 | 0 | −2 |
| 인성 | −1 | 0 | +2 |
| 비겁 | −1 | 0 | +1 |

> 🔶 **확인필요 #1**: 위 polarity 수치(−3..+3 정수)는 자평진전 통설 기반 초안. 캘리브레이션(분포 시뮬) 후 확정.

### 3.2 행성 polarity — sect 분기 (헬레니즘 sect doctrine)

현재 `PLANET_BENEFIC_MALEFIC`(`featureMap.ts:181`)는 flat(Saturn=malefic 고정). 신설: sect로 분기.

고전 헬레니즘 sect 교리:
- **주간 sect 멤버**: Sun, Jupiter, **Saturn**
- **야간 sect 멤버**: Moon, Venus, **Mars**
- **in-sect malefic은 완화, out-of-sect malefic은 악화**:
  - 주간 차트: Saturn = in-sect → **완화**, Mars = out-of-sect → 악화
  - 야간 차트: Mars = in-sect → 완화, Saturn = out-of-sect → **악화**
- in-sect benefic은 강화: Jupiter(주간)·Venus(야간) ↑

| 행성 | 주간 출생(sect='day') | 야간 출생(sect='night') |
|---|---|---|
| Saturn | malefic **완화** (in-sect) | malefic **악화** (out-of-sect) |
| Mars | malefic 악화 (out-of-sect) | malefic 완화 (in-sect) |
| Jupiter | benefic 강화 | benefic 보통 |
| Venus | benefic 보통 | benefic 강화 |
| Sun/Moon/Mercury 등 | 중립 유지 | 중립 유지 |

> 🔴 **확인필요 #2 (중요)**: v4 plan 메모엔 *"야간 출생 → Saturn 완화"*라고 적혀 있는데, **고전 교리는 정반대**(Saturn은 주간 sect 멤버 → 주간 출생에서 완화, 야간 출생에서 악화)다. 위 표는 **고전 교리**를 따랐다. 메모의 "야간 Saturn 완화"가 의도라면 다른 학파/커스텀이므로 명시 결정 필요. **둘 중 어느 쪽을 채택할지 확정해야 구현 가능.**

### 3.3 어스펙트 → polarity·weight

- polarity 기본값: `ASPECT_POLARITY`(`featureMap.ts:167`) 계승 (trine/sextile +, square/opposition −, conjunction = 행성 sect 판정에 위임)
- weight: orb 기반 damping — 타이트할수록 ↑ (현 `astro-transit.ts`의 exactness 계승). 정밀도가 곧 가중.
- conjunction polarity: 두 행성의 sect-조정 benefic/malefic으로 결정 (예: 야간 Mars conj → 완화된 − 또는 0).

### 3.4 신살·오행 theme

`SHINSAL_THEME_MAP`/`ELEMENT_THEME_MAP`(`featureMap.ts:102,155`) 계승. polarity는 길성/흉살 분류 유지하되 §3.1 strength와 상충 시 strength 우선(중복계산 방지).

---

## 4. NEW ② — 점수 모델 (단일 deriveScore)

현 `derivers/score.ts`의 2단 가중평균 모델 **계승·정리**:
1. layer별 평균 polarity (weight 가중)
2. layer 평균들을 `LAYER_WEIGHT`로 가중평균 → grandAvg(−3..+3)
3. `normalizeAvgToScore(grandAvg, BIAS, SCALE)` → 0..100
4. 공명 보너스(동방향 layer ≥3/≥4) + soft compression

변경점:
- `DERIVED_SCORE_BIAS=1.75`, `SCALE=16`는 **재캘리브레이션 대상**(§3 polarity 규칙이 분포를 바꿈).
- 패턴 보너스의 `malefic=['crisis']` → 5테마 체계에 맞게 재정의.

> 🔶 **확인필요 #3**: bias/scale은 §3 확정 후 `scripts/score-distribution`류로 재측정해 채움.

---

## 5. NEW ③ — 두 축 + 교차 (단일 도출)

```ts
const sajuSignals  = signals.filter(s => s.source === 'saju')
const astroSignals = signals.filter(s => s.source === 'astro')

const sajuAxisRaw  = deriveScore(sajuSignals,  patternsSaju)   // 0..100
const astroAxisRaw = deriveScore(astroSignals, patternsAstro)  // 0..100

const gap = Math.abs(sajuAxisRaw - astroAxisRaw)
const axisAgreement: 'aligned'|'mixed'|'opposed' =
  gap <= 12 ? 'aligned' : gap <= 28 ? 'mixed' : 'opposed'   // 임계값 현행 계승

// crossAgreement: 같은 두 축에서 단일 도출 (claim-IIFE 폐기)
//   같은 방향 + 작은 gap → 높음 / 부호 반대 → 낮음
const crossAgreementPercent = deriveCrossAgreement(sajuAxisRaw, astroAxisRaw)
```

- **헤드라인 score** = `(sajuAxisRaw + astroAxisRaw)/2` 또는 전체 신호 `deriveScore` — §확인필요 #4: 두 축 평균 vs 전체합산 중 택1(둘이 미세하게 다를 수 있음, 정합 위해 평균 권장).
- `deriveCrossAgreement`는 gap + 동방향 여부의 결정함수 (claim-IIFE의 80~92/60~72/50~58/28~40 밴드를 두 축 기반으로 재현).
- **삭제**: UltraPrecision-as-axis, transit-as-axis(`dailyTransitScores`를 축으로 쓰는 것), claim-IIFE, `axisOffset`/override 춤.
  - UltraPrecision은 **narrative(공망/12운성) 용도로만** 잔존, 축 계산에서 분리.

---

## 6. NEW ④ — 타이밍 선별

현 `derivers/convergence.ts`(bothSystems = astroHeavy>0 && sajuHeavy>0) + `keyEvents.ts` **계승**. 단:
- `bothSystems`/convergence를 §5의 source-분리 신호와 정합되게 재정의(동일 source 판정 사용).
- best-day 선별 = 단일 신호 다발의 score + 두 축 동방향 가산.

---

## 7. 삭제 / 교체 목록 (우리꺼)

| 대상 | 파일 | 조치 |
|---|---|---|
| UltraPrecision 축 사용 | `yearlyDates.ts:1964,2054` | 축에서 제거, narrative만 |
| transit 축 사용 | `yearlyDates.ts:2055`, `route.ts:376` | 제거(엔진 astro축으로 대체) |
| claim-IIFE crossAgreement | `yearlyDates.ts:2006` | `deriveCrossAgreement`로 교체 |
| override/axisOffset 춤 | `yearlyDates.ts:2070-2082` | 단순화(평균만) |
| scoring.ts 50/50 (표면 B) | `lib/destiny-map/calendar/scoring.ts` | §확인필요 #5: 표면 B 소비처 확인 후 폐기 |
| resolveCrossSystemTone 입력 | `calendarMatrixEvidenceSupport.ts:273` | §5 두 축으로 자동 정합(코드 거의 불변) |

---

## 8. contract 인터페이스 (초안)

```ts
// 신호 — ActiveSignal shape 계승, polarity/weight/themes가 NEW① rules의 출력
interface ActiveSignal {
  id: string; source: 'saju'|'astro'; kind: SignalKind
  themes: AstroThemeKey[]; themeWeights?: Partial<Record<AstroThemeKey, number>>
  polarity: -3..3    // ← NEW① rules(strength/sect 조건부)가 산출
  weight: 0..1       // ← orb/intrinsic damping
  layer: SignalLayer; active: ActiveWindow; evidence: SignalEvidence
}

// 셀 출력 — scoreBreakdown이 §5와 일치
interface CalendarCellScore {
  derivedScore: number          // headline = (sajuAxisRaw+astroAxisRaw)/2
  sajuAxisRaw: number
  astroAxisRaw: number
  axisAgreement: 'aligned'|'mixed'|'opposed'
  crossAgreementPercent: number
  themeScores: Partial<Record<AstroThemeKey, number>>
}
```

`scoreBreakdown`의 기존 필드(sajuAxis/astroAxis/sajuAxisRaw/astroAxisRaw/axisAgreement/finalScore)는 **유지**(FE 호환) — 값의 출처만 단일 엔진으로 교체.

---

## 9. 롤아웃 / 캐시

- `ENGINE_SIGNATURE` bump **2곳**: `cell-cache.ts:27`(`'v3-chironlilith'`) + `context/cache.ts:32`(`'natal-v2-rich'`) → 새 시그니처(예 `'v4-...'`)로 옛 캐시 lazy 무효화.
- FE 소비처(`YearDashboard`/`MonthDashboard`/`CrossLineChart`/`LifeTimeline`)는 `scoreBreakdown`/`crossAgreementPercent`/`bothSystems` shape 유지 → **무변경**.
- 단계: ① rules 모듈 + 테이블 → ② deriveScore 정리 → ③ 두 축/교차 단일화 → ④ yearlyDates 삭제·연결 → 캘리브레이션 → signature bump.

---

## 10. 검증 기준 (재작성 후)

- ephemeris-golden / saju 1758 = **불변 통과**(Layer 0 안 건드림).
- 교체될 가드(현재 실패 중): `score-headline-alignment`, `interpretation.regression`의 score↔근거 일치 → **새 contract로 재작성**.
- 신규 골든: "축 aligned ⇒ crossAgreement ≥ 임계" 같은 **정합성 불변식** 테스트 추가(현재 모순을 영구 차단).

---

## 11. 확인 필요 (구현 전 결정)

1. **#1 십신 polarity 수치** — §3.1 초안 테이블 확정/캘리브레이션.
2. **#2 (중요) Saturn sect 방향** — 고전 교리(주간 완화) vs 메모("야간 완화"). **상반됨, 택1 필수.**
3. **#3 점수 bias/scale** — §3 확정 후 재측정.
4. **#4 헤드라인** — 두 축 평균 vs 전체 신호 합산.
5. **#5 표면 B(scoring.ts/public-api)** — 소비처 확인 후 폐기 여부.
