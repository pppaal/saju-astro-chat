/**
 * 운명력 엔진 (UnMyeong-ryeok Engine) v1.0
 * ────────────────────────────────────────
 * 자평력(saju-engine) ↔ 천기력(astro-engine) 교차 분석.
 * 동양·서양 두 시스템의 시그널을 정통 매핑으로 결합.
 *
 * 출력 구성:
 *   axes:     5축 매칭 (정체성·감정·직업·관계·성장)
 *   themes:   6 테마 (직업·재물·사랑·건강·학업·가족)
 *   matrix:   6 테마 × 5 시간축 (인생·대운·세운·월운·일진)
 *
 * 시그널 정통 매핑:
 *   사주 십신 ↔ 점성 행성:
 *     비견·겁재 ↔ Mars       (자기·경쟁)
 *     식신·상관 ↔ Mercury    (표현·소통)
 *     정재·편재 ↔ Venus·Jupiter (가치·확장)
 *     정관·편관 ↔ Saturn     (규율·책임)
 *     정인·편인 ↔ Moon·Neptune (보호·내면)
 *
 *   사주 오행 ↔ 점성 4원소:
 *     목 ↔ 바람 (양·확장)
 *     화 ↔ 불   (양·열)
 *     토·금 ↔ 흙 (중·구조)
 *     수 ↔ 물   (음·흐름)
 *
 *   사주 4기둥 ↔ 점성 하우스:
 *     年(조상·사회) ↔ 11H/12H
 *     月(직업·형제) ↔ 10H/3H
 *     日(자기·배우자) ↔ 1H/7H
 *     時(자녀·말년) ↔ 5H/4H
 */

import type { MainSajuOutput } from './saju-engine'
import type { AstroEngineOutput } from './astro-engine'

export const CROSS_ENGINE_META = {
  name: '운명력',
  nameEn: 'UnMyeong-ryeok',
  version: '1.0',
  tradition: '자평·서양 점성 교차',
  axes: 5,
  themes: 6,
  horizons: 5,
  tagline: '동·서 통합 운명 엔진',
} as const

// ─────────────────────────────────────────────────────────────────
// Axis (5축) — 정체성/감정/직업/관계/성장
// ─────────────────────────────────────────────────────────────────

export type AxisAgreement = 'aligned' | 'mixed' | 'opposed'

export interface AxisAnalysis {
  /** 사주측 시그널 (한 줄) */
  sajuSignal: string
  /** 점성측 시그널 (한 줄) */
  astroSignal: string
  /** 톤 일치 여부 */
  agreement: AxisAgreement
  /** 종합 한 줄 */
  summary: string
}

export interface CrossAxes {
  identity: AxisAnalysis     // 사주 일간 ↔ 점성 태양·ASC
  emotion: AxisAnalysis      // 사주 일지·인성 ↔ 점성 달
  career: AxisAnalysis       // 사주 격국·관성 ↔ 점성 MC·Saturn
  relationship: AxisAnalysis // 사주 일지·배우자성 ↔ 점성 7H·Venus
  growth: AxisAnalysis       // 사주 식상·인성 ↔ 점성 9H·Jupiter
}

// ─────────────────────────────────────────────────────────────────
// Theme (6) — 직업/재물/사랑/건강/학업/가족
// ─────────────────────────────────────────────────────────────────

export type ThemeKind =
  | 'career'         // 직업·승진
  | 'wealth'         // 재물·사업
  | 'love'           // 사랑·결혼
  | 'health'         // 건강
  | 'growth'         // 학업·성장
  | 'family'         // 가족·인복

export const THEME_LABEL: Record<ThemeKind, string> = {
  career: '직업·승진',
  wealth: '재물·사업',
  love: '사랑·결혼',
  health: '건강·기운',
  growth: '학업·성장',
  family: '가족·인복',
}

export interface ThemeSignal {
  /** 점수 (0-10) */
  score: number
  /** 등급 */
  grade: '천운' | '길' | '평' | '주의' | '흉'
  /** 사주 측 핵심 데이터 한 줄 */
  sajuPoints: string[]
  /** 점성 측 핵심 데이터 한 줄 */
  astroPoints: string[]
  /** 종합 한 줄 */
  verdict: string
}

// ─────────────────────────────────────────────────────────────────
// 시간축 (5) — 인생/대운/세운/월운/일진
// ─────────────────────────────────────────────────────────────────

export type Horizon = 'life' | 'daeun' | 'seun' | 'wolun' | 'iljin'

export const HORIZON_LABEL: Record<Horizon, string> = {
  life: '인생 전체',
  daeun: '이 10년 (대운)',
  seun: '이 한 해 (세운)',
  wolun: '이번 달 (월운)',
  iljin: '오늘 (일진)',
}

export interface ThemeMatrixCell {
  theme: ThemeKind
  horizon: Horizon
  signal: ThemeSignal
}

// ─────────────────────────────────────────────────────────────────
// 메인 출력
// ─────────────────────────────────────────────────────────────────

export interface CrossEngineOutput {
  engine: typeof CROSS_ENGINE_META
  axes: CrossAxes
  /** 6 테마 × 5 시간축 = 30 cells */
  matrix: ThemeMatrixCell[]
  /** 가장 강한 cross 신호 */
  highlights: {
    strongestAlignedAxis?: keyof CrossAxes
    strongestOpposedAxis?: keyof CrossAxes
    bestThemeNow: { theme: ThemeKind; horizon: Horizon; score: number }
    worstThemeNow: { theme: ThemeKind; horizon: Horizon; score: number }
  }
}

// ─────────────────────────────────────────────────────────────────
// 5축 분석 (Axis)
// ─────────────────────────────────────────────────────────────────

function gradeFromPercent(pct: number): ThemeSignal['grade'] {
  if (pct >= 85) return '천운'
  if (pct >= 70) return '길'
  if (pct >= 50) return '평'
  if (pct >= 30) return '주의'
  return '흉'
}

function buildIdentityAxis(s: MainSajuOutput, a: AstroEngineOutput): AxisAnalysis {
  const sajuId = `${s.advanced.strength.level} 일간 ${s.pillars.day.stem}(${s.pillars.day.element})`
  const astroId = `태양 ${a.bigThree.sun.sign} + ASC ${a.bigThree.ascendant.sign} (${a.elementBalance.dominant} 우세)`
  // 강약 + 4원소 우세 매핑
  const sajuStrong = s.advanced.strength.level.includes('강')
  const astroFire = a.elementBalance.dominant === '불' || a.elementBalance.dominant === '바람'
  let agreement: AxisAgreement
  if (sajuStrong === astroFire) agreement = 'aligned'
  else if (sajuStrong !== astroFire) agreement = 'opposed'
  else agreement = 'mixed'
  const summary =
    agreement === 'aligned'
      ? '동·서 정체성이 같은 방향 — 자아가 일관'
      : agreement === 'opposed'
      ? '동·서 정체성이 반대 — 내면·외면 갈등 가능'
      : '동·서 정체성 혼합 — 다면적 자아'
  return { sajuSignal: sajuId, astroSignal: astroId, agreement, summary }
}

function buildEmotionAxis(s: MainSajuOutput, a: AstroEngineOutput): AxisAnalysis {
  const sajuEm = `일지 ${s.pillars.day.branch} + 인성 ${s.advanced.yongsin.primary || '?'}`
  const astroEm = `달 ${a.bigThree.moon.sign} (${a.bigThree.moon.house}H)`
  // 단순 매핑: moon 물·흙 = 사주 인성/수 → aligned. 불·바람 = 외향 → opposed
  const moonEl = a.elementBalance.water > 30 || a.elementBalance.earth > 30 ? 'inner' : 'outer'
  const sajuInner = s.advanced.yongsin.primary === '수' || s.advanced.yongsin.primary === '토'
  const agreement: AxisAgreement =
    (moonEl === 'inner') === sajuInner ? 'aligned' : 'opposed'
  const summary =
    agreement === 'aligned'
      ? '감정·내면이 두 시스템에서 같은 방향'
      : '감정 양극 — 표현 vs 침잠 갈등'
  return { sajuSignal: sajuEm, astroSignal: astroEm, agreement, summary }
}

function buildCareerAxis(s: MainSajuOutput, a: AstroEngineOutput): AxisAnalysis {
  const sajuCar = `격국 ${s.advanced.geokguk.type}`
  const astroCar = `MC ${a.bigThree.mc.sign}`
  // Saturn 트랜짓 강조 vs 사주 격국 관성
  const sajuOfficial = s.advanced.geokguk.type.includes('관')
  const astroSaturn = a.current.majorTransits.some((t) => t.transitPlanet === 'Saturn')
  const agreement: AxisAgreement =
    sajuOfficial && astroSaturn
      ? 'aligned'
      : sajuOfficial !== astroSaturn
      ? 'mixed'
      : 'aligned'
  const summary =
    agreement === 'aligned'
      ? '직업 영역에서 동·서 시그널 일치'
      : '직업 시그널 혼재'
  return { sajuSignal: sajuCar, astroSignal: astroCar, agreement, summary }
}

function buildRelationshipAxis(s: MainSajuOutput, a: AstroEngineOutput): AxisAnalysis {
  const sajuRel = `일지 ${s.pillars.day.branch} (배우자궁)`
  const astroRel = `Venus / 7H 강조` // 약식
  const venusInChart = a.natal.planets.find((p) => p.name === 'Venus')
  const astroDesc = `Venus ${venusInChart?.sign} (${venusInChart?.house}H)`
  const summary = `사주 일지 ${s.pillars.day.branch} ↔ 점성 ${astroDesc}`
  return {
    sajuSignal: sajuRel,
    astroSignal: astroRel,
    agreement: 'mixed',
    summary,
  }
}

function buildGrowthAxis(s: MainSajuOutput, a: AstroEngineOutput): AxisAnalysis {
  const sajuGr = `용신 ${s.advanced.yongsin.primary} + 식상/인성`
  const jupiterInChart = a.natal.planets.find((p) => p.name === 'Jupiter')
  const astroGr = `Jupiter ${jupiterInChart?.sign} (${jupiterInChart?.house}H)`
  return {
    sajuSignal: sajuGr,
    astroSignal: astroGr,
    agreement: 'mixed',
    summary: '학습·성장 영역 — 두 시스템 함께 추적',
  }
}

// ─────────────────────────────────────────────────────────────────
// Theme score builders (6 테마)
// ─────────────────────────────────────────────────────────────────

interface SignalContext {
  saju: MainSajuOutput
  astro: AstroEngineOutput
  horizon: Horizon
}

function buildThemeSignal(theme: ThemeKind, ctx: SignalContext): ThemeSignal {
  const { saju, astro, horizon } = ctx

  // 시간축에 따른 사주 점수 base 추출
  const sajuScoreBase = (() => {
    if (horizon === 'life') {
      // 인생 평균 = 모든 챕터 평균
      const chapters = saju.lifeNarrative?.chapters || []
      if (chapters.length === 0) return 5
      const avg = chapters.reduce((s, c) => s + c.score, 0) / chapters.length
      return avg / 8 * 10 // 0-10 정규화
    }
    if (horizon === 'daeun') return saju.scores.daeunScore / 8 * 10
    if (horizon === 'seun') return saju.scores.seunScore
    if (horizon === 'wolun') return saju.scores.wolunScore / 7 * 10
    if (horizon === 'iljin') return saju.scores.iljinScore / 12 * 10
    return 5
  })()

  // 테마별 사주 가중치
  const sajuPoints: string[] = []
  let sajuModifier = 0

  if (theme === 'career') {
    // 격국 관성·강화·통근
    const cycleEntry =
      horizon === 'daeun' ? saju.cycleAnalysis.daeun :
      horizon === 'seun' ? saju.cycleAnalysis.seun :
      horizon === 'wolun' ? saju.cycleAnalysis.wolun :
      horizon === 'iljin' ? saju.cycleAnalysis.iljin :
      saju.cycleAnalysis.daeun
    if (cycleEntry?.geokgukShift.shift === 'strengthen') {
      sajuModifier += cycleEntry.geokgukShift.intensity * 0.5
      sajuPoints.push(`격국 강화 (강도 ${cycleEntry.geokgukShift.intensity})`)
    } else if (cycleEntry?.geokgukShift.shift === 'break') {
      sajuModifier -= cycleEntry.geokgukShift.intensity * 0.5
      sajuPoints.push(`격국 파격 위협`)
    }
    if (cycleEntry?.rootedness.rootStrengthTotal && cycleEntry.rootedness.rootStrengthTotal >= 2) {
      sajuModifier += 1
      sajuPoints.push(`통근 깊음 (${cycleEntry.rootedness.rootStrengthTotal})`)
    }
    if (saju.advanced.geokguk.type) sajuPoints.push(`본명 ${saju.advanced.geokguk.type}`)
  }
  if (theme === 'wealth') {
    // 재성, 식상
    const cycleEntry = saju.cycleAnalysis.daeun
    if (cycleEntry?.geokgukShift.geokguk?.includes('재')) {
      sajuModifier += 1
      sajuPoints.push('재성 격국')
    }
    if (saju.advanced.geokguk.type.includes('재')) {
      sajuPoints.push(`본명 ${saju.advanced.geokguk.type}`)
    }
  }
  if (theme === 'love') {
    // 일지 충/합 + 배우자성
    const cycleEntry =
      horizon === 'daeun' ? saju.cycleAnalysis.daeun :
      horizon === 'seun' ? saju.cycleAnalysis.seun : null
    const dayInter = cycleEntry?.pillarInteractions.pillars.find((p) => p.pillar === 'day')
    if (dayInter?.tone === 'positive') {
      sajuModifier += 1.5
      sajuPoints.push(`일지 ${dayInter.branchRelation || dayInter.stemRelation}`)
    } else if (dayInter?.tone === 'negative') {
      sajuModifier -= 1.5
      sajuPoints.push(`일지 ${dayInter.branchRelation || dayInter.stemRelation} (충돌)`)
    }
    sajuPoints.push(`일주 ${saju.pillars.day.ganzhi}`)
  }
  if (theme === 'health') {
    // 오행 균형 + 형/충
    const counts = saju.fiveElements
    const values = Object.values(counts)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const balance = min / Math.max(1, max)
    if (balance >= 0.5) {
      sajuModifier += 1
      sajuPoints.push('오행 균형 양호')
    } else {
      sajuModifier -= 0.5
      sajuPoints.push('오행 불균형')
    }
  }
  if (theme === 'growth') {
    // 인성 + 식상 + 문창
    const natalShinsal = saju.cycleAnalysis.daeun?.shinsalActivation.hits.map((h) => h.kind) || []
    if (natalShinsal.includes('문창') || natalShinsal.includes('학당귀인')) {
      sajuModifier += 1
      sajuPoints.push('문창·학당')
    }
    if (saju.advanced.geokguk.type.includes('인')) {
      sajuModifier += 0.5
      sajuPoints.push('인성 격국')
    }
  }
  if (theme === 'family') {
    // 년월주 + 비견 + 천을귀인
    const cycleEntry = saju.cycleAnalysis.daeun
    const lucky = cycleEntry?.shinsalActivation.hits.filter((h) => h.tone === 'lucky') || []
    if (lucky.length >= 1) {
      sajuModifier += 1
      sajuPoints.push(`귀인 ${lucky.map((h) => h.kind).join('·')}`)
    }
    const yearInter = cycleEntry?.pillarInteractions.pillars.find((p) => p.pillar === 'year')
    if (yearInter?.tone === 'negative') {
      sajuModifier -= 1
      sajuPoints.push('년주 동요 (가족 영역)')
    }
  }

  // 점성 측 시그널
  const astroPoints: string[] = []
  let astroModifier = 0

  if (theme === 'career') {
    const saturnTransit = astro.current.majorTransits.find((t) => t.transitPlanet === 'Saturn')
    if (saturnTransit) {
      const positive = saturnTransit.type === 'trine' || saturnTransit.type === 'sextile'
      astroModifier += positive ? 1 : -1
      astroPoints.push(`T.Saturn ${saturnTransit.type} N.${saturnTransit.natalPoint}`)
    }
    astroPoints.push(`MC ${astro.bigThree.mc.sign} (직업 정체성)`)
  }
  if (theme === 'wealth') {
    const jupiterTransit = astro.current.majorTransits.find((t) => t.transitPlanet === 'Jupiter')
    if (jupiterTransit) {
      const positive = jupiterTransit.type === 'trine' || jupiterTransit.type === 'sextile' || jupiterTransit.type === 'conjunction'
      astroModifier += positive ? 1.5 : -0.5
      astroPoints.push(`T.Jupiter ${jupiterTransit.type} N.${jupiterTransit.natalPoint}`)
    }
    const venusInChart = astro.natal.planets.find((p) => p.name === 'Venus')
    if (venusInChart) astroPoints.push(`Venus ${venusInChart.sign} (${venusInChart.house}H)`)
  }
  if (theme === 'love') {
    const venusTransit = astro.current.transitToNatal.find((t) => t.transitPlanet === 'Venus')
    if (venusTransit) {
      astroModifier += 1
      astroPoints.push(`T.Venus ${venusTransit.type} N.${venusTransit.natalPoint}`)
    }
    const venusInChart = astro.natal.planets.find((p) => p.name === 'Venus')
    if (venusInChart) astroPoints.push(`Venus ${venusInChart.sign}`)
  }
  if (theme === 'health') {
    // 6H + Saturn 균형
    if (astro.elementBalance.fire > 50 || astro.elementBalance.water < 10) {
      astroModifier -= 0.5
      astroPoints.push('원소 불균형')
    } else {
      astroModifier += 0.5
      astroPoints.push('원소 균형')
    }
  }
  if (theme === 'growth') {
    const jupiterTransit = astro.current.majorTransits.find((t) => t.transitPlanet === 'Jupiter')
    if (jupiterTransit && (jupiterTransit.type === 'trine' || jupiterTransit.type === 'sextile')) {
      astroModifier += 1
      astroPoints.push(`T.Jupiter ${jupiterTransit.type} (확장)`)
    }
    const mercuryInChart = astro.natal.planets.find((p) => p.name === 'Mercury')
    if (mercuryInChart) astroPoints.push(`Mercury ${mercuryInChart.sign}`)
  }
  if (theme === 'family') {
    // 4H 강조
    const moonAspects = astro.natalAspects.filter((a) => a.from.name === 'Moon' || a.to.name === 'Moon')
    if (moonAspects.length >= 3) {
      astroModifier += 0.5
      astroPoints.push(`Moon aspects ${moonAspects.length}`)
    }
    astroPoints.push(`Moon ${astro.bigThree.moon.sign}`)
  }

  // 종합 점수
  let combined = sajuScoreBase * 0.5 + (5 + astroModifier) * 0.5 + sajuModifier
  combined = Math.max(0, Math.min(10, combined))

  const pct = (combined / 10) * 100
  const grade = gradeFromPercent(pct)

  // verdict
  const verdict = (() => {
    if (pct >= 85) return `${THEME_LABEL[theme]} 매우 길운 — 적극 행동`
    if (pct >= 70) return `${THEME_LABEL[theme]} 호운 — 흐름 활용`
    if (pct >= 50) return `${THEME_LABEL[theme]} 평운 — 안정 유지`
    if (pct >= 30) return `${THEME_LABEL[theme]} 주의기 — 보수적 자세`
    return `${THEME_LABEL[theme]} 흉운 — 새 시도 자제`
  })()

  return {
    score: Math.round(combined * 10) / 10,
    grade,
    sajuPoints,
    astroPoints,
    verdict,
  }
}

// ─────────────────────────────────────────────────────────────────
// 메인 진입점
// ─────────────────────────────────────────────────────────────────

const ALL_THEMES: ThemeKind[] = ['career', 'wealth', 'love', 'health', 'growth', 'family']
const ALL_HORIZONS: Horizon[] = ['life', 'daeun', 'seun', 'wolun', 'iljin']

export function runCrossEngine(saju: MainSajuOutput, astro: AstroEngineOutput): CrossEngineOutput {
  // 5축
  const axes: CrossAxes = {
    identity: buildIdentityAxis(saju, astro),
    emotion: buildEmotionAxis(saju, astro),
    career: buildCareerAxis(saju, astro),
    relationship: buildRelationshipAxis(saju, astro),
    growth: buildGrowthAxis(saju, astro),
  }

  // 6 × 5 매트릭스
  const matrix: ThemeMatrixCell[] = []
  for (const theme of ALL_THEMES) {
    for (const horizon of ALL_HORIZONS) {
      // 일진은 무거운 분석 생략 — 직업/사랑/건강/성장/가족 대신 career만
      if (horizon === 'iljin' && (theme === 'wealth' || theme === 'family' || theme === 'love' || theme === 'growth' || theme === 'health')) {
        // 일진은 모든 테마 다 만들지만 narrative 짧게
      }
      const signal = buildThemeSignal(theme, { saju, astro, horizon })
      matrix.push({ theme, horizon, signal })
    }
  }

  // highlights
  const sortedByScore = [...matrix].sort((a, b) => b.signal.score - a.signal.score)
  const bestThemeNow = sortedByScore[0]
  const worstThemeNow = sortedByScore[sortedByScore.length - 1]

  const axisEntries = Object.entries(axes) as Array<[keyof CrossAxes, AxisAnalysis]>
  const aligned = axisEntries.find(([, v]) => v.agreement === 'aligned')
  const opposed = axisEntries.find(([, v]) => v.agreement === 'opposed')

  return {
    engine: CROSS_ENGINE_META,
    axes,
    matrix,
    highlights: {
      strongestAlignedAxis: aligned?.[0],
      strongestOpposedAxis: opposed?.[0],
      bestThemeNow: { theme: bestThemeNow.theme, horizon: bestThemeNow.horizon, score: bestThemeNow.signal.score },
      worstThemeNow: { theme: worstThemeNow.theme, horizon: worstThemeNow.horizon, score: worstThemeNow.signal.score },
    },
  }
}
