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
  version: '1.1',
  tradition: '자평·서양 점성 교차',
  axes: 5,
  themes: 6,
  horizons: 5,
  tagline: '동·서 통합 운명 엔진',
} as const

// ─────────────────────────────────────────────────────────────────
// 사용자 세그먼트 — 같은 데이터를 4가지 톤으로 차별 narrate
// ─────────────────────────────────────────────────────────────────

export interface UserSegment {
  /** 직장인 / 자영업 / 학생 / 무직 */
  employment?: 'employed' | 'self_employed' | 'student' | 'unemployed'
  /** 미혼 / 기혼 / 이혼·사별 */
  maritalStatus?: 'single' | 'married' | 'divorced'
  /** 자녀 유무 */
  hasChildren?: boolean
  /** 성별 (이미 사주에 있지만 narrate에도 영향) */
  gender?: 'male' | 'female'
}

/** 세그먼트별 테마 톤 매핑 */
function getSegmentTone(theme: ThemeKind, segment?: UserSegment): {
  themeFocus: string
  audience: string
} {
  if (!segment) return { themeFocus: THEME_LABEL[theme], audience: '일반' }

  const emp = segment.employment
  const mar = segment.maritalStatus
  const kid = segment.hasChildren

  if (theme === 'career') {
    if (emp === 'self_employed') return { themeFocus: '사업·확장', audience: '자영업' }
    if (emp === 'employed') return { themeFocus: '직장·승진', audience: '직장인' }
    if (emp === 'student') return { themeFocus: '진로·취업', audience: '학생' }
    if (emp === 'unemployed') return { themeFocus: '취업·복귀', audience: '구직자' }
  }
  if (theme === 'wealth') {
    if (emp === 'self_employed') return { themeFocus: '매출·이재', audience: '자영업' }
    return { themeFocus: '재물·축적·투자', audience: '일반' }
  }
  if (theme === 'love') {
    if (mar === 'single') return { themeFocus: '연애·만남', audience: '미혼' }
    if (mar === 'married') return { themeFocus: '부부 관계', audience: '기혼' }
    if (mar === 'divorced') return { themeFocus: '재출발 인연', audience: '이혼·사별' }
  }
  if (theme === 'family') {
    if (kid) return { themeFocus: '자녀·가정', audience: '부모' }
    if (mar === 'married') return { themeFocus: '배우자·가족', audience: '기혼' }
    return { themeFocus: '부모·형제', audience: '일반' }
  }
  if (theme === 'growth') {
    if (emp === 'student') return { themeFocus: '학업·시험', audience: '학생' }
    return { themeFocus: '자기계발', audience: '일반' }
  }
  if (theme === 'health') return { themeFocus: '건강·기운', audience: '일반' }

  return { themeFocus: THEME_LABEL[theme], audience: '일반' }
}

// ─────────────────────────────────────────────────────────────────
// 액셔너블 advice — 테마 + grade + 시그널 조합으로 구체 행동 추출
// ─────────────────────────────────────────────────────────────────

const ACTIONS_BY_THEME_GRADE: Record<ThemeKind, Record<string, string[]>> = {
  career: {
    천운: ['이직·승진 적극', '큰 결정·계약 적기', '리더 역할 도전'],
    길: ['미팅·면접 활성화', '제안서 적극 제출', '확장 시도'],
    평: ['현 자리 안정 유지', '큰 변화 보류', '내실 다지기'],
    주의: ['관계 갈등 조심', '계약 신중', '본업 우선'],
    흉: ['기존 자리 지키기', '새 시도 자제', '조용히 대기'],
  },
  wealth: {
    천운: ['적극 투자', '큰 거래 가능', '확장·창업'],
    길: ['투자 검토', '신규 거래 OK', '재물 축적'],
    평: ['보수적 운용', '큰 지출 자제'],
    주의: ['대출·투자 신중', '지출 통제'],
    흉: ['투자 자제', '손실 방어 우선', '현금 보유'],
  },
  love: {
    천운: ['적극 만남', '결혼 결단 가능', '인연 깊이 넣기'],
    길: ['소개팅·데이트 활발', '관계 진전 시도'],
    평: ['관계 안정 유지'],
    주의: ['갈등·오해 주의', '큰 약속 보류'],
    흉: ['관계 진전 자제', '거리 두기'],
  },
  health: {
    천운: ['활발한 활동 가능', '운동 새 시작'],
    길: ['컨디션 양호'],
    평: ['평소 관리'],
    주의: ['수면·스트레스 관리', '소화기 주의'],
    흉: ['종합 검진', '무리한 활동 자제'],
  },
  growth: {
    천운: ['시험·자격증 도전', '강의·집필 가능'],
    길: ['학습 적극', '발표 기회 잡기'],
    평: ['꾸준한 학습'],
    주의: ['집중력 약함', '암기 어려움'],
    흉: ['시험·발표 보류'],
  },
  family: {
    천운: ['가족 행사·여행', '관계 깊이 넣기'],
    길: ['연락·만남 활발'],
    평: ['평소 관리'],
    주의: ['가족 갈등 조심', '말 신중'],
    흉: ['거리 두기', '의절·소외 주의'],
  },
}

/** 시그널 기반 구체 액션 추출 — saju/astro points 를 보고 추가 advice */
function deriveSpecificActions(
  theme: ThemeKind,
  signal: ThemeSignal,
  saju: MainSajuOutput,
): string[] {
  const out: string[] = []
  const sajuJoined = signal.sajuPoints.join(' ')
  const astroJoined = signal.astroPoints.join(' ')

  // 격국 파격 → 행동 advice
  if (sajuJoined.includes('파격')) {
    if (theme === 'career') out.push('큰 결정·계약 미루기')
    if (theme === 'wealth') out.push('투자 결정 보류')
    if (theme === 'love') out.push('약속·결단 미루기')
  }
  // 격국 강화 → 적극
  if (sajuJoined.includes('격국 강화')) {
    if (theme === 'career') out.push('본업 자리잡기 적극')
    if (theme === 'wealth') out.push('재성 흐름 활용 — 거래 진행')
  }
  // 통근 깊음 → 결과 발현
  if (sajuJoined.includes('통근 깊음')) {
    out.push('흐름이 실제로 자리잡는 시기 — 결과로 이어짐')
  }
  // 점성 trine = 호조
  if (astroJoined.includes('trine')) {
    out.push('우주 흐름이 도와주는 시기')
  }
  // 점성 square = 도전
  if (astroJoined.includes('square')) {
    out.push('긴장·도전 시기 — 정면 돌파')
  }
  // 점성 conjunction = 강조
  if (astroJoined.includes('conjunction')) {
    out.push('해당 영역 에너지 강하게 부각')
  }
  // 귀인 시그널
  if (sajuJoined.includes('귀인')) {
    out.push('귀인·도움 받음 — 만남 적극 응함')
  }
  // 일지 충돌
  if (sajuJoined.includes('충돌')) {
    out.push('가까운 관계 갈등 — 소통 신중')
  }
  // 인생 정점 위치 (lifetime peak/valley)
  const userAge = (() => {
    const inputDate = saju.input?.birthDate
    if (!inputDate) return undefined
    return new Date().getFullYear() - new Date(inputDate).getFullYear()
  })()
  if (userAge && saju.lifeNarrative) {
    const cur = saju.lifeNarrative.chapters.find((c) => c.isCurrent)
    if (cur) out.push(`현재 ${cur.ageRange} ${cur.ganji} 챕터`)
  }
  return out.slice(0, 4)
}

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
  /** 세그먼트 톤 적용된 테마 라벨 (예: 자영업 → "사업·확장") */
  themeFocus: string
  /** 대상 사용자 (예: "직장인", "기혼") */
  audience: string
  /** 구체 액션 (✓ 적극 / ✗ 자제) */
  actions: string[]
}

export interface ThemeTiming {
  /** 인생에서 이 테마의 정점 시기 */
  peakChapter?: { age: number; ageRange: string; ganji: string; score: number }
  /** 인생에서 이 테마의 저점 시기 */
  valleyChapter?: { age: number; ageRange: string; ganji: string; score: number }
  /** 한 줄 추천 (예: "직업 정점은 32~41세 甲戌, 주의기는 52~61세 壬申") */
  recommendation: string
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
  /** 사용자 세그먼트 (입력) */
  segment?: UserSegment
  axes: CrossAxes
  /** 6 테마 × 5 시간축 = 30 cells */
  matrix: ThemeMatrixCell[]
  /** 테마별 시기 매칭 (인생 peak/valley) */
  themeTimings: Record<ThemeKind, ThemeTiming>
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
  segment?: UserSegment
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

  // 세그먼트 톤
  const { themeFocus, audience } = getSegmentTone(theme, ctx.segment)

  // verdict — 세그먼트 톤 반영
  const verdict = (() => {
    if (pct >= 85) return `${themeFocus} 매우 길운 — 적극 행동`
    if (pct >= 70) return `${themeFocus} 호운 — 흐름 활용`
    if (pct >= 50) return `${themeFocus} 평운 — 안정 유지`
    if (pct >= 30) return `${themeFocus} 주의기 — 보수적 자세`
    return `${themeFocus} 흉운 — 새 시도 자제`
  })()

  // 액션 — 등급별 기본 액션 + 시그널 기반 구체 advice
  const baseActions = ACTIONS_BY_THEME_GRADE[theme]?.[grade] || []
  const specificActions = deriveSpecificActions(theme, {
    score: combined, grade, sajuPoints, astroPoints, verdict,
    themeFocus, audience, actions: [],
  }, ctx.saju)
  const actions = [...baseActions.slice(0, 2), ...specificActions].slice(0, 5)

  return {
    score: Math.round(combined * 10) / 10,
    grade,
    sajuPoints,
    astroPoints,
    verdict,
    themeFocus,
    audience,
    actions,
  }
}

// ─────────────────────────────────────────────────────────────────
// 테마별 시기 매칭 (lifetime peak/valley)
// ─────────────────────────────────────────────────────────────────

// 천간 → 십신 그룹 (테마 친화도 매핑용, 일간 기준)
function stemToSibsinGroup(stem: string, dayMaster: string): 'inseong' | 'jaeseong' | 'siksang' | 'gwansal' | 'bijeon' {
  const elementMap: Record<string, string> = {
    甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
    己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
  }
  const dayEl = elementMap[dayMaster]
  const stemEl = elementMap[stem]
  if (!dayEl || !stemEl) return 'bijeon'
  if (stemEl === dayEl) return 'bijeon'
  // 생하는 관계
  const sheng: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
  const ke: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }
  if (sheng[stemEl] === dayEl) return 'inseong'   // stem이 일간 생함
  if (sheng[dayEl] === stemEl) return 'siksang'   // 일간이 stem 생함
  if (ke[dayEl] === stemEl) return 'jaeseong'     // 일간이 stem 극 (재성)
  if (ke[stemEl] === dayEl) return 'gwansal'      // stem이 일간 극 (관살)
  return 'bijeon'
}

/** 테마별 챕터 친화도 가중치 — 십신 그룹별 */
const THEME_AFFINITY: Record<ThemeKind, Record<string, number>> = {
  career:  { gwansal: 1.5, inseong: 1.2, jaeseong: 1.0, siksang: 0.8, bijeon: 0.6 },
  wealth:  { jaeseong: 1.5, siksang: 1.3, bijeon: 0.6, inseong: 0.9, gwansal: 1.0 },
  love:    { jaeseong: 1.4, gwansal: 1.2, siksang: 1.0, inseong: 0.9, bijeon: 0.7 }, // 남자 기준
  health:  { inseong: 1.2, bijeon: 1.1, siksang: 1.0, jaeseong: 1.0, gwansal: 0.8 },
  growth:  { inseong: 1.5, siksang: 1.3, bijeon: 1.0, jaeseong: 0.9, gwansal: 0.9 },
  family:  { inseong: 1.3, bijeon: 1.2, siksang: 1.0, jaeseong: 1.0, gwansal: 0.9 },
}

function buildThemeTimings(saju: MainSajuOutput, _astro: AstroEngineOutput): Record<ThemeKind, ThemeTiming> {
  const result = {} as Record<ThemeKind, ThemeTiming>
  const chapters = saju.lifeNarrative?.chapters || []
  const dayMaster = saju.pillars.day.stem

  for (const theme of ALL_THEMES) {
    if (chapters.length === 0) {
      result[theme] = { recommendation: '인생 데이터 부족' }
      continue
    }

    // 각 챕터의 테마별 점수 = base score × 테마 친화도
    const themeScored = chapters.map((c) => {
      const stem = c.ganji.charAt(0)
      const group = stemToSibsinGroup(stem, dayMaster)
      const affinity = THEME_AFFINITY[theme][group] || 1.0
      const themeScore = Math.min(8, c.score * affinity)
      return { ...c, themeScore, group }
    })

    themeScored.sort((a, b) => b.themeScore - a.themeScore)
    const peak = themeScored[0]
    const valley = themeScored[themeScored.length - 1]

    const themeFocusLabel = THEME_LABEL[theme]
    const recommendation =
      peak && valley
        ? `${themeFocusLabel} 정점: ${peak.ageRange} ${peak.ganji}(${peak.group}, ${peak.themeScore.toFixed(1)}). 주의기: ${valley.ageRange} ${valley.ganji}(${valley.group}, ${valley.themeScore.toFixed(1)}).`
        : '시기 매칭 데이터 부족'

    result[theme] = {
      peakChapter: peak
        ? { age: peak.age, ageRange: peak.ageRange, ganji: peak.ganji, score: Math.round(peak.themeScore * 10) / 10 }
        : undefined,
      valleyChapter: valley
        ? { age: valley.age, ageRange: valley.ageRange, ganji: valley.ganji, score: Math.round(valley.themeScore * 10) / 10 }
        : undefined,
      recommendation,
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────
// 메인 진입점
// ─────────────────────────────────────────────────────────────────

const ALL_THEMES: ThemeKind[] = ['career', 'wealth', 'love', 'health', 'growth', 'family']
const ALL_HORIZONS: Horizon[] = ['life', 'daeun', 'seun', 'wolun', 'iljin']

export function runCrossEngine(
  saju: MainSajuOutput,
  astro: AstroEngineOutput,
  segment?: UserSegment,
): CrossEngineOutput {
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
      const signal = buildThemeSignal(theme, { saju, astro, horizon, segment })
      matrix.push({ theme, horizon, signal })
    }
  }

  // 테마별 시기 매칭
  const themeTimings = buildThemeTimings(saju, astro)

  // highlights
  const sortedByScore = [...matrix].sort((a, b) => b.signal.score - a.signal.score)
  const bestThemeNow = sortedByScore[0]
  const worstThemeNow = sortedByScore[sortedByScore.length - 1]

  const axisEntries = Object.entries(axes) as Array<[keyof CrossAxes, AxisAnalysis]>
  const aligned = axisEntries.find(([, v]) => v.agreement === 'aligned')
  const opposed = axisEntries.find(([, v]) => v.agreement === 'opposed')

  return {
    engine: CROSS_ENGINE_META,
    segment,
    axes,
    matrix,
    themeTimings,
    highlights: {
      strongestAlignedAxis: aligned?.[0],
      strongestOpposedAxis: opposed?.[0],
      bestThemeNow: { theme: bestThemeNow.theme, horizon: bestThemeNow.horizon, score: bestThemeNow.signal.score },
      worstThemeNow: { theme: worstThemeNow.theme, horizon: worstThemeNow.horizon, score: worstThemeNow.signal.score },
    },
  }
}
