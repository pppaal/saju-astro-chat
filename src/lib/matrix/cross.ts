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

import type { MainSajuOutput } from '../saju/engine'
import type { AstroEngineOutput } from '../astro/engine'

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

// ─────────────────────────────────────────────────────────────────
// 신살별 specific advice (정통 의미 → 행동)
// 17 신살 × 6 테마 매핑 — generic 액션 위에 specific 추가
// ─────────────────────────────────────────────────────────────────

const SHINSAL_ADVICE: Record<string, Record<ThemeKind, string | undefined>> = {
  천을귀인: {
    career: '귀인 만나는 자리·미팅 적극',
    wealth: '귀인 추천 거래 OK',
    love: '소개팅·중매 자리 적극',
    health: '권위 있는 의사 상담 받기',
    growth: '멘토 만남·강의 참석',
    family: '가족 모임 적극 참여',
  },
  천덕귀인: {
    career: '책임감 있는 결정',
    wealth: undefined,
    love: '진중한 만남 적기',
    health: '몸이 알아서 보호함',
    growth: '진리·도덕 공부',
    family: '윗사람께 인사',
  },
  월덕귀인: {
    career: '온화한 협업 적기',
    wealth: '안정적 거래',
    love: '편안한 인연',
    health: undefined,
    growth: undefined,
    family: '화합 자리 적극',
  },
  건록: {
    career: '지위 안정·정착',
    wealth: '월급·고정 수입 확실',
    love: undefined,
    health: undefined,
    growth: undefined,
    family: undefined,
  },
  암록: {
    career: '숨은 도움 받음',
    wealth: '의외 수입 가능',
    love: undefined,
    health: undefined,
    growth: undefined,
    family: '먼 친척 도움',
  },
  학당귀인: {
    career: '실력 인정 받음',
    wealth: undefined,
    love: undefined,
    health: undefined,
    growth: '시험·자격증 도전',
    family: undefined,
  },
  문창: {
    career: '글·발표·계약서 명확',
    wealth: undefined,
    love: undefined,
    health: undefined,
    growth: '독서·집필·시험 적기',
    family: undefined,
  },
  공망풀림: {
    career: '비어있던 자리에 기회 — 적극',
    wealth: '잠재 수익 발현',
    love: '오래 비었던 인연 활성',
    health: '회복기',
    growth: '잠재 능력 발현',
    family: '소원했던 가족 연락',
  },
  역마: {
    career: '이직·출장·이동 적기',
    wealth: '해외 거래·투자 가능',
    love: '먼 거리 인연',
    health: '운동 새로 시작',
    growth: '연수·해외 학습',
    family: '여행·이사 검토',
  },
  도화: {
    career: '대중 노출·홍보 좋음',
    wealth: '엔터테인먼트·미용 사업',
    love: '인연 다발 — 진지한 선택',
    health: undefined,
    growth: '예술·표현 공부',
    family: '인기 있는 자녀 응원',
  },
  화개: {
    career: '연구·종교·예술 분야 활성',
    wealth: undefined,
    love: '깊이 있는 인연',
    health: '명상·영적 활동',
    growth: '철학·종교·심리 공부',
    family: '고요한 가족 시간',
  },
  양인: {
    career: '✗ 다툼·강압 조심',
    wealth: '✗ 무리한 거래 자제',
    love: '✗ 격한 갈등 조심',
    health: '✗ 운전·사고·수술 주의',
    growth: undefined,
    family: '✗ 가족 다툼 자제',
  },
  공망: {
    career: '✗ 결과 더디게 — 인내',
    wealth: '✗ 헛된 지출 주의',
    love: '✗ 약속 흐려짐',
    health: '✗ 기력 떨어짐',
    growth: '✗ 학습 효율 낮음',
    family: '✗ 가족 무관심',
  },
  공망묶임: {
    career: '✗ 진전 없는 묶임 — 다른 길',
    wealth: '✗ 자금 묶임',
    love: '✗ 관계 진전 안 됨',
    health: '✗ 만성 피로',
    growth: '✗ 정체기',
    family: '✗ 소통 막힘',
  },
  귀문관: {
    career: '✗ 과한 신경 — 결정 흐림',
    wealth: '✗ 과민 반응 거래',
    love: '✗ 의심·집착 주의',
    health: '✗ 정신 피로·우울 주의',
    growth: '✗ 집중 어려움',
    family: '✗ 가족 갈등 — 정신 안정',
  },
  원진: {
    career: '✗ 동료 원망 — 거리 두기',
    wealth: '✗ 손실 잊지 못함',
    love: '✗ 묵은 갈등',
    health: '✗ 스트레스성 질환',
    growth: undefined,
    family: '✗ 부모·형제 원망',
  },
}

/** 사주 매트릭스 cell 안의 활성 신살 → 테마 별 advice 추출 */
function deriveShinsalAdvice(theme: ThemeKind, signal: ThemeSignal, saju: MainSajuOutput, horizon: Horizon): string[] {
  const cycleEntry =
    horizon === 'daeun' ? saju.cycleAnalysis.daeun :
    horizon === 'seun' ? saju.cycleAnalysis.seun :
    horizon === 'wolun' ? saju.cycleAnalysis.wolun :
    horizon === 'iljin' ? saju.cycleAnalysis.iljin :
    saju.cycleAnalysis.daeun
  if (!cycleEntry) return []
  const out: string[] = []
  for (const hit of cycleEntry.shinsalActivation.hits) {
    const advice = SHINSAL_ADVICE[hit.kind]?.[theme]
    if (advice) out.push(advice)
  }
  return out
}

/** NEVER 룰 — 격국 파격 + 양인/공망 같은 강한 흉 조합 → 강한 반대 advice */
function deriveNeverRules(signal: ThemeSignal, saju: MainSajuOutput, horizon: Horizon): string[] {
  const cycleEntry =
    horizon === 'daeun' ? saju.cycleAnalysis.daeun :
    horizon === 'seun' ? saju.cycleAnalysis.seun :
    horizon === 'wolun' ? saju.cycleAnalysis.wolun :
    horizon === 'iljin' ? saju.cycleAnalysis.iljin :
    null
  if (!cycleEntry) return []
  const never: string[] = []
  const isBreak = cycleEntry.geokgukShift.shift === 'break' && cycleEntry.geokgukShift.intensity >= 2
  const hasYangin = cycleEntry.shinsalActivation.hits.some((h) => h.kind === '양인')
  const hasGongmangLock = cycleEntry.shinsalActivation.hits.some((h) => h.kind === '공망묶임')
  const hasGwimun = cycleEntry.shinsalActivation.hits.some((h) => h.kind === '귀문관')
  if (isBreak && hasYangin) never.push('🚫 절대 큰 결정·계약 안 됨 (격국 파격 + 양인)')
  if (isBreak && hasGongmangLock) never.push('🚫 새 시도 자제 (격국 파격 + 공망묶임)')
  if (hasGwimun) never.push('🚫 충동·과민 결정 자제 (귀문관)')
  return never
}

/** 7단계 nuance tone — 점수에 따른 행동 단계 */
function nuanceTone(score: number): string {
  if (score >= 9) return '저돌 (모든 자원 투입)'
  if (score >= 8) return '모험 (큰 도전 가능)'
  if (score >= 7) return '적극 (활발한 행동)'
  if (score >= 6) return '시작 (조용한 진입)'
  if (score >= 5) return '탐색 (정찰·소규모)'
  if (score >= 3.5) return '관망 (대기·관찰)'
  return '기다림 (방어·휴식)'
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

export interface HorizonSynthesis {
  /** 같은 시간축에서 가장 강한 테마 */
  strongest: { theme: ThemeKind; score: number; verdict: string }
  /** 같은 시간축에서 가장 약한 테마 */
  weakest: { theme: ThemeKind; score: number; verdict: string }
  /** 호운 테마 (>=70%) */
  positives: ThemeKind[]
  /** 주의 테마 (<50%) */
  negatives: ThemeKind[]
  /** 종합 한 줄 (예: "이번 달은 직업·재물 호조 / 사랑·건강 주의 — 직업 우선") */
  synthesis: string
}

export interface CrossEngineOutput {
  engine: typeof CROSS_ENGINE_META
  /** 사용자 세그먼트 (입력) */
  segment?: UserSegment
  axes: CrossAxes
  /** 6 테마 × 5 시간축 = 30 cells */
  matrix: ThemeMatrixCell[]
  /** 시간축별 cross-section 종합 */
  horizonSynthesis: Record<Horizon, HorizonSynthesis>
  /** 테마별 시기 매칭 (인생 peak/valley) */
  themeTimings: Record<ThemeKind, ThemeTiming>
  /** 헤드라인 컨텍스트 — 셀 반복 대신 한 번만 노출 */
  headerContext: {
    currentChapter?: string
    currentDaeun?: string
    daeunPhase?: string
  }
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
    if (horizon === 'iljin') return saju.scores.iljinScore / 15 * 10
    return 5
  })()

  // ⭐ 풍부 데이터 추출 (사주 fullInsights + 점성 advanced + matrix 결합)
  const fi = saju.fullInsights as
    | undefined
    | {
        sibsin?: { dominantSibsin?: string[]; missingSibsin?: string[] }
        healthCareer?: {
          health?: { overallScore?: number; weakElement?: string; organHealth?: Array<{ element?: string; status?: string }> }
          career?: { workStyle?: { type?: string }; entrepreneurialScore?: number; leadershipScore?: number; primaryFields?: Array<{ category?: string }>; peakCareerAges?: number[] }
        }
        comprehensivePrediction?: { multiYearTrend?: { peakYears?: number[]; lowYears?: number[]; overallTrend?: string } }
        extendedAnalysis?: { lifeStages?: Array<{ ageRange?: string; theme?: string }> }
      }
  const aAdv = (astro as unknown as {
    advanced?: {
      asteroids?: Record<string, { sign: string; house: number }>
      upcomingEclipses?: Array<{ date: string; type: string; sign: string }>
      fixedStars?: Array<{ planet?: string; orb: number; star: { name_ko?: string; name: string } }>
      harmonics?: { strongestHarmonics?: Array<{ harmonic: number; strength: number }> }
      midpointActivations?: Array<{ midpoint: { planet1: string; planet2: string }; activator: string; aspectType: string; orb: number }>
    }
  }).advanced

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
    // ⭐ fullInsights.sibsin — 십신 분포 (관성/식상)
    if (fi?.sibsin?.dominantSibsin?.includes('정관') || fi?.sibsin?.dominantSibsin?.includes('편관')) {
      sajuModifier += 1.5
      sajuPoints.push('관성 강 (조직·권위)')
    }
    if (fi?.sibsin?.missingSibsin?.includes('정관') && fi?.sibsin?.missingSibsin?.includes('편관')) {
      sajuModifier -= 1
      sajuPoints.push('관성 결핍 (자유업 적합)')
    }
    // ⭐ fullInsights.healthCareer.career — 적성·정점기
    if (fi?.healthCareer?.career?.peakCareerAges?.length) {
      sajuPoints.push(`커리어 정점 ${fi.healthCareer.career.peakCareerAges[0]}세`)
    }
    if (fi?.healthCareer?.career?.workStyle?.type) {
      sajuPoints.push(`업무: ${fi.healthCareer.career.workStyle.type}`)
    }
    // ⭐ comprehensivePrediction — 다년 트렌드
    const cy = new Date().getFullYear()
    if (fi?.comprehensivePrediction?.multiYearTrend?.peakYears?.includes(cy)) {
      sajuModifier += 1
      sajuPoints.push(`${cy}년 정점 연도`)
    }
    if (fi?.comprehensivePrediction?.multiYearTrend?.lowYears?.includes(cy)) {
      sajuModifier -= 1
      sajuPoints.push(`${cy}년 저점 주의`)
    }
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
    // ⭐ 십신: 재성 분포
    if (fi?.sibsin?.dominantSibsin?.includes('정재') || fi?.sibsin?.dominantSibsin?.includes('편재')) {
      sajuModifier += 1.5
      sajuPoints.push('재성 강 (재물 활성)')
    }
    if (fi?.sibsin?.missingSibsin?.includes('정재') && fi?.sibsin?.missingSibsin?.includes('편재')) {
      sajuModifier -= 1
      sajuPoints.push('재성 결핍 (재물 의식 약)')
    }
    // 식상 → 재물 흐름
    if (fi?.sibsin?.dominantSibsin?.includes('식신') || fi?.sibsin?.dominantSibsin?.includes('상관')) {
      sajuModifier += 0.5
      sajuPoints.push('식상→재성 흐름')
    }
    // 창업 점수
    if (fi?.healthCareer?.career?.entrepreneurialScore && fi.healthCareer.career.entrepreneurialScore >= 70) {
      sajuModifier += 1
      sajuPoints.push(`창업력 ${fi.healthCareer.career.entrepreneurialScore}`)
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
    // ⭐ 십신: 배우자성 (남=정재, 여=정관)
    const isMale = saju.input?.gender === 'male'
    const spouseSibsin = isMale ? '정재' : '정관'
    if (fi?.sibsin?.dominantSibsin?.includes(spouseSibsin)) {
      sajuModifier += 1
      sajuPoints.push(`${spouseSibsin} 강 (배우자 인연 활성)`)
    } else if (fi?.sibsin?.missingSibsin?.includes(spouseSibsin)) {
      sajuModifier -= 0.5
      sajuPoints.push(`${spouseSibsin} 결핍 (인연 시기 차이)`)
    }
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
    // ⭐ healthCareer 종합 점수
    if (fi?.healthCareer?.health?.overallScore !== undefined) {
      const hs = fi.healthCareer.health.overallScore
      sajuModifier += (hs - 50) / 25 // -2 ~ +2 범위
      sajuPoints.push(`건강 ${hs}/100`)
      const vulnerable = fi.healthCareer.health.organHealth?.filter((o) => o.status === 'vulnerable') || []
      if (vulnerable.length > 0) {
        sajuPoints.push(`취약 ${vulnerable.map((o) => o.element).join(',')}`)
      }
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
    // ⭐ 십신: 인성 (학습·지혜)
    if (fi?.sibsin?.dominantSibsin?.includes('정인') || fi?.sibsin?.dominantSibsin?.includes('편인')) {
      sajuModifier += 1
      sajuPoints.push('인성 강 (학습·지혜)')
    }
    // 식상 (표현·창의)
    if (fi?.sibsin?.dominantSibsin?.includes('식신')) {
      sajuModifier += 0.5
      sajuPoints.push('식신 (창의 표현)')
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
    // ⭐ 십신: 비겁 (형제·동료)
    if (fi?.sibsin?.dominantSibsin?.includes('비견') || fi?.sibsin?.dominantSibsin?.includes('겁재')) {
      sajuModifier += 0.5
      sajuPoints.push('비겁 (형제·동료 인연)')
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
    // ⭐ midpoint Sun/MC, Mars/Saturn (커리어 추진)
    const careerMidpoint = aAdv?.midpointActivations?.find(
      (m) =>
        (m.midpoint.planet1 === 'Sun' && m.midpoint.planet2 === 'MC') ||
        (m.midpoint.planet1 === 'Mars' && m.midpoint.planet2 === 'Saturn'),
    )
    if (careerMidpoint) {
      astroModifier += 1
      astroPoints.push(`midpoint ${careerMidpoint.midpoint.planet1}/${careerMidpoint.midpoint.planet2} 활성`)
    }
    // ⭐ asteroid Pallas (전략·지혜)
    const pallas = aAdv?.asteroids?.Pallas
    if (pallas && pallas.house === 10) {
      astroModifier += 0.5
      astroPoints.push('Pallas 10H (전략 직업)')
    }
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
    // ⭐ Venus 가 2H/8H 이면 재물 활성
    if (venusInChart && (venusInChart.house === 2 || venusInChart.house === 8)) {
      astroModifier += 1
      astroPoints.push(`Venus ${venusInChart.house}H (재물궁)`)
    }
  }
  if (theme === 'love') {
    const venusTransit = astro.current.transitToNatal.find((t) => t.transitPlanet === 'Venus')
    if (venusTransit) {
      astroModifier += 1
      astroPoints.push(`T.Venus ${venusTransit.type} N.${venusTransit.natalPoint}`)
    }
    const venusInChart = astro.natal.planets.find((p) => p.name === 'Venus')
    if (venusInChart) astroPoints.push(`Venus ${venusInChart.sign}`)
    // ⭐ Juno (결혼 소행성)
    const juno = aAdv?.asteroids?.Juno
    if (juno) astroPoints.push(`Juno ${juno.sign} ${juno.house}H (결혼)`)
    // ⭐ Venus/Mars midpoint (사랑·열정)
    const loveMid = aAdv?.midpointActivations?.find(
      (m) =>
        (m.midpoint.planet1 === 'Venus' && m.midpoint.planet2 === 'Mars') ||
        (m.midpoint.planet1 === 'Mars' && m.midpoint.planet2 === 'Venus'),
    )
    if (loveMid) {
      astroModifier += 0.5
      astroPoints.push(`Venus/Mars midpoint 활성 ← ${loveMid.activator}`)
    }
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
    // ⭐ Chiron (치유 소행성)
    const chiron = aAdv?.asteroids?.Chiron
    if (chiron && chiron.house === 6) {
      astroPoints.push(`Chiron 6H (건강 치유 테마)`)
    }
    // ⭐ Eclipse Leo (심장)
    const upcomingLeoEclipse = aAdv?.upcomingEclipses?.find((e) => e.sign === 'Leo')
    if (upcomingLeoEclipse) {
      astroPoints.push(`다가올 Leo 식 ${upcomingLeoEclipse.date} (심장계 주의)`)
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
    // ⭐ Pallas (지혜) + Vesta (헌신)
    const pallas = aAdv?.asteroids?.Pallas
    if (pallas) astroPoints.push(`Pallas ${pallas.sign} (전략·지혜)`)
    const vesta = aAdv?.asteroids?.Vesta
    if (vesta) astroPoints.push(`Vesta ${vesta.sign} (집중·헌신)`)
    // ⭐ Mercury midpoint
    const mercMid = aAdv?.midpointActivations?.find(
      (m) => m.midpoint.planet1 === 'Mercury' || m.midpoint.planet2 === 'Mercury',
    )
    if (mercMid) astroPoints.push(`Mercury midpoint 활성`)
    // ⭐ 하모닉 (학습·집중)
    const h7 = aAdv?.harmonics?.strongestHarmonics?.find((h) => h.harmonic === 7)
    if (h7 && h7.strength >= 70) {
      astroModifier += 0.5
      astroPoints.push(`H7 강 (영감·신비)`)
    }
  }
  if (theme === 'family') {
    // 4H 강조
    const moonAspects = astro.natalAspects.filter((a) => a.from.name === 'Moon' || a.to.name === 'Moon')
    if (moonAspects.length >= 3) {
      astroModifier += 0.5
      astroPoints.push(`Moon aspects ${moonAspects.length}`)
    }
    astroPoints.push(`Moon ${astro.bigThree.moon.sign}`)
    // ⭐ Ceres (양육·돌봄)
    const ceres = aAdv?.asteroids?.Ceres
    if (ceres) astroPoints.push(`Ceres ${ceres.sign} ${ceres.house}H (양육·돌봄)`)
    // ⭐ Moon midpoint (가족 정서)
    const moonMid = aAdv?.midpointActivations?.find(
      (m) => m.midpoint.planet1 === 'Moon' || m.midpoint.planet2 === 'Moon',
    )
    if (moonMid) astroPoints.push(`Moon midpoint 활성`)
  }

  // ⭐ 진짜 교차 — 사주 ↔ 점성 결합 시 보너스
  if (theme === 'career') {
    const sajuOfficial = saju.advanced.geokguk.type.includes('관')
    const astroSaturnStrong = astro.current.majorTransits.some((t) => t.transitPlanet === 'Saturn' && (t.type === 'trine' || t.type === 'sextile'))
    if (sajuOfficial && astroSaturnStrong) {
      sajuModifier += 1
      sajuPoints.push('🔗 격국 관성 + Saturn 길조 = 권위·관료 강화')
    }
  }
  if (theme === 'love') {
    const isMale = saju.input?.gender === 'male'
    const spouseSibsin = isMale ? '정재' : '정관'
    const sajuSpouseStrong = fi?.sibsin?.dominantSibsin?.includes(spouseSibsin)
    const astroVenusActive = astro.current.transitToNatal.some((t) => t.transitPlanet === 'Venus')
    if (sajuSpouseStrong && astroVenusActive) {
      sajuModifier += 1
      sajuPoints.push(`🔗 ${spouseSibsin} 강 + Venus 트랜짓 = 인연 시기`)
    }
  }
  if (theme === 'health') {
    const sajuFireDeficient = (saju.fiveElements as Record<string, number>)['fire'] === 0 || (saju.fiveElements as Record<string, number>)['화'] === 0
    const astroFireRich = astro.elementBalance.fire >= 30
    if (sajuFireDeficient && astroFireRich) {
      sajuModifier += 0.5
      sajuPoints.push('🔗 사주 火 결핍 ↔ 점성 火 풍부 = 보완')
    } else if (sajuFireDeficient && !astroFireRich) {
      sajuModifier -= 0.5
      sajuPoints.push('🔗 사주 火 결핍 + 점성 火 약 = 가중 (심장 주의)')
    }
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

  // 액션 — 등급별 기본 + 신살 specific + NEVER 룰 + nuance 톤
  const baseActions = (ACTIONS_BY_THEME_GRADE[theme]?.[grade] || []).slice(0, 2)
  const partialSignal = {
    score: combined, grade, sajuPoints, astroPoints, verdict,
    themeFocus, audience, actions: [],
  }
  const shinsalActions = deriveShinsalAdvice(theme, partialSignal, ctx.saju, ctx.horizon)
  const neverActions = deriveNeverRules(partialSignal, ctx.saju, ctx.horizon)
  const tone = nuanceTone(combined)
  // 우선순위: NEVER (강한 반대) > 신살 specific > base
  const actions = [...neverActions, ...shinsalActions.slice(0, 2), ...baseActions, `톤: ${tone}`].slice(0, 5)

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

  // 시간축별 cross-section 종합
  const horizonSynthesis = {} as Record<Horizon, HorizonSynthesis>
  for (const h of ALL_HORIZONS) {
    const cellsInHorizon = matrix.filter((c) => c.horizon === h)
    const sorted = [...cellsInHorizon].sort((a, b) => b.signal.score - a.signal.score)
    const strongest = sorted[0]
    const weakest = sorted[sorted.length - 1]
    const positives = cellsInHorizon
      .filter((c) => (c.signal.score / 10) * 100 >= 70)
      .map((c) => c.theme)
    const negatives = cellsInHorizon
      .filter((c) => (c.signal.score / 10) * 100 < 50)
      .map((c) => c.theme)
    const horizonName = HORIZON_LABEL[h]
    const synthesis = (() => {
      if (positives.length >= 4) return `${horizonName} 다영역 호조 — 적극 행동 시기`
      if (positives.length >= 2 && negatives.length === 0) {
        const posLabels = positives.map((t) => THEME_LABEL[t]).join('·')
        return `${horizonName} ${posLabels} 호조 — 이쪽에 집중`
      }
      if (positives.length >= 1 && negatives.length >= 1) {
        return `${horizonName} ${THEME_LABEL[positives[0]]} 호조 / ${THEME_LABEL[negatives[0]]} 주의 — ${THEME_LABEL[positives[0]]} 우선`
      }
      if (negatives.length >= 3) return `${horizonName} 다영역 주의 — 보수 자세`
      return `${horizonName} 평운 — 안정 유지`
    })()
    horizonSynthesis[h] = {
      strongest: { theme: strongest.theme, score: strongest.signal.score, verdict: strongest.signal.verdict },
      weakest: { theme: weakest.theme, score: weakest.signal.score, verdict: weakest.signal.verdict },
      positives,
      negatives,
      synthesis,
    }
  }

  // 헤더 컨텍스트 — 모든 셀에 반복 안 하고 한 번만
  const curChapter = saju.lifeNarrative?.chapters.find((c) => c.isCurrent)
  const curDaeun = saju.cycles.currentDaeun
  const headerContext = {
    currentChapter: curChapter ? `${curChapter.ageRange} ${curChapter.ganji} 챕터` : undefined,
    currentDaeun: curDaeun ? `${curDaeun.heavenlyStem}${curDaeun.earthlyBranch}` : undefined,
    daeunPhase: curDaeun?.phase
      ? `${curDaeun.phase === 'stem' ? '천간기' : '지지기'} ${Math.round((curDaeun.phaseProgress ?? 0) * 100)}%`
      : undefined,
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
    segment,
    axes,
    matrix,
    horizonSynthesis,
    themeTimings,
    headerContext,
    highlights: {
      strongestAlignedAxis: aligned?.[0],
      strongestOpposedAxis: opposed?.[0],
      bestThemeNow: { theme: bestThemeNow.theme, horizon: bestThemeNow.horizon, score: bestThemeNow.signal.score },
      worstThemeNow: { theme: worstThemeNow.theme, horizon: worstThemeNow.horizon, score: worstThemeNow.signal.score },
    },
  }
}
