/**
 * 3층 궁합 — 사주 + 점성 synastry + composite 통합 분석
 *
 * 만세력 + 점성 전문가가 따로따로 보는 것을 한 번에 통합:
 *   Layer 1 (사주 궁합): 두 사주의 일주 충/합·일간 오행·격국·십신·신살 매칭
 *   Layer 2 (점성 synastry): 두 본명 차트 사이 어스펙트 + 하우스 overlay
 *   Layer 3 (composite): 두 차트의 중간점 — 관계 자체의 본질
 *
 * 출력: 각 층 점수·신호·narration + 통합 verdict
 */

import { calculateSajuData } from '@/lib/Saju/saju'

// ─────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────

export type CompatibilityPerson = {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
}

export type CompatibilitySignal = {
  text: string
  delta: number  // -15 ~ +15
}

export type CompatibilityLayerResult = {
  score: number  // 0-100
  signals: CompatibilitySignal[]
  narration: string
}

export type ThreeLayerCompatibility = {
  layer1_saju: CompatibilityLayerResult
  layer2_synastry: CompatibilityLayerResult
  layer3_composite: CompatibilityLayerResult
  integrated: {
    score: number
    level: '환상의 짝' | '잘 맞는 사이' | '노력 필요' | '도전적' | '어려운 조합'
    narration: string
  }
}

// ─────────────────────────────────────────────────────────
// 도구
// ─────────────────────────────────────────────────────────

const STEM_KO_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const STEM_HAP: Record<string, string> = {
  甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸',
  己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊',
}
const STEM_CHUNG = new Set(['甲-庚', '庚-甲', '乙-辛', '辛-乙', '丙-壬', '壬-丙', '丁-癸', '癸-丁'])
const BRANCH_HAP: Record<string, string> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}
const BRANCH_CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
// 삼합 그룹
const SAMHAP_GROUPS = [
  new Set(['寅', '午', '戌']),
  new Set(['巳', '酉', '丑']),
  new Set(['申', '子', '辰']),
  new Set(['亥', '卯', '未']),
]
function shareSamhap(b1: string, b2: string): boolean {
  return SAMHAP_GROUPS.some((g) => g.has(b1) && g.has(b2) && b1 !== b2)
}

const ELEMENT_ORDER = ['목', '화', '토', '금', '수']
function elementRelation(a: string, b: string): 'same' | 'support' | 'controlled' | 'control' | 'drain' {
  const ai = ELEMENT_ORDER.indexOf(a)
  const bi = ELEMENT_ORDER.indexOf(b)
  if (ai < 0 || bi < 0) return 'same'
  if (ai === bi) return 'same'
  const diff = (bi - ai + 5) % 5
  // 0: 동기, 1: 내가 b를 생함(설기), 2: 내가 b를 극함(재성), 3: b가 나를 극함(관성), 4: b가 나를 생함(인성)
  if (diff === 1) return 'drain'
  if (diff === 2) return 'control'
  if (diff === 3) return 'controlled'
  return 'support'
}

// ─────────────────────────────────────────────────────────
// Layer 1: 사주 궁합
// ─────────────────────────────────────────────────────────

function analyzeSajuCompatibility(
  a: ReturnType<typeof calculateSajuData>,
  b: ReturnType<typeof calculateSajuData>
): CompatibilityLayerResult {
  const signals: CompatibilitySignal[] = []
  let score = 50

  const aDS = a.pillars.day.heavenlyStem.name
  const aDB = a.pillars.day.earthlyBranch.name
  const bDS = b.pillars.day.heavenlyStem.name
  const bDB = b.pillars.day.earthlyBranch.name

  // 일주 천간 관계
  if (aDS === bDS) {
    signals.push({ text: `두 사람 일간이 ${aDS}로 같음 — 비슷한 기질, 동질감 강하지만 경쟁 가능`, delta: 4 })
    score += 4
  } else if (STEM_HAP[aDS] === bDS) {
    signals.push({ text: `일간 천간합 ${aDS}-${bDS} — 부드럽게 맞물리는 협력 구도`, delta: 12 })
    score += 12
  } else if (STEM_CHUNG.has(`${aDS}-${bDS}`)) {
    signals.push({ text: `일간 천간충 ${aDS}-${bDS} — 추진력은 있되 충돌·갈등 빈번`, delta: -8 })
    score -= 8
  }

  // 일지 관계
  if (BRANCH_HAP[aDB] === bDB && aDB !== bDB) {
    signals.push({ text: `일지 육합 ${aDB}-${bDB} — 일상이 자연스럽게 맞물림`, delta: 10 })
    score += 10
  } else if (BRANCH_CHUNG[aDB] === bDB) {
    signals.push({ text: `일지 충 ${aDB}-${bDB} — 환경·생활방식 충돌, 거리 조절 필요`, delta: -10 })
    score -= 10
  } else if (shareSamhap(aDB, bDB)) {
    signals.push({ text: `일지 삼합 그룹 — 큰 방향이 같이 가는 협력 구도`, delta: 8 })
    score += 8
  } else if (aDB === bDB) {
    signals.push({ text: `일지가 ${aDB}로 같음 — 동질감 강하지만 자형 가능`, delta: 2 })
    score += 2
  }

  // 일간 오행 관계
  const aEl = STEM_KO_EL[aDS]
  const bEl = STEM_KO_EL[bDS]
  if (aEl && bEl && aEl !== bEl) {
    const rel = elementRelation(aEl, bEl)
    if (rel === 'support') {
      signals.push({ text: `${aEl}↔${bEl} 상생 — 한 쪽이 받쳐주는 구도`, delta: 6 })
      score += 6
    } else if (rel === 'controlled') {
      signals.push({ text: `${aEl}↔${bEl} 일간이 상대를 극함 — 주도·견제 구도`, delta: -3 })
      score -= 3
    } else if (rel === 'control') {
      signals.push({ text: `${aEl}↔${bEl} 상대가 일간을 극함 — 압박·시험 구도`, delta: -3 })
      score -= 3
    } else if (rel === 'drain') {
      signals.push({ text: `${aEl}↔${bEl} 일간 기운이 상대로 풀림 — 헌신·소모 구도`, delta: 0 })
    }
  }

  // 5행 보완 (한 사람에 부족한 오행을 상대가 채워주면 +)
  const aFE = (a.fiveElements || {}) as Record<string, number>
  const bFE = (b.fiveElements || {}) as Record<string, number>
  let supplemented = 0
  const elKeys: Array<[string, string]> = [['wood', '목'], ['fire', '화'], ['earth', '토'], ['metal', '금'], ['water', '수']]
  for (const [enKey] of elKeys) {
    if ((aFE[enKey] || 0) <= 1 && (bFE[enKey] || 0) >= 2) supplemented++
    if ((bFE[enKey] || 0) <= 1 && (aFE[enKey] || 0) >= 2) supplemented++
  }
  if (supplemented >= 2) {
    signals.push({ text: `5행 보완 — 서로 부족한 오행을 채워주는 구도 (${supplemented}개)`, delta: 6 })
    score += 6
  }

  score = Math.max(0, Math.min(100, score))

  let narration: string
  if (score >= 75) narration = `사주 궁합으로 보면 두 사람이 자연스럽게 맞물리는 구도예요. 일상·결정·방향이 큰 충돌 없이 풀립니다.`
  else if (score >= 60) narration = `사주 궁합은 안정 구간이에요. 큰 갈등은 적되 한 두 가지 조정 포인트가 있어요.`
  else if (score >= 45) narration = `사주 궁합은 중립 구간 — 받쳐주는 신호와 부담 신호가 섞여 있어요. 노력으로 맞춰가는 관계.`
  else if (score >= 30) narration = `사주 궁합은 도전적이에요. 일상 패턴이나 결정 방식에서 충돌이 잦을 가능성.`
  else narration = `사주 궁합 자체가 어려운 조합이에요. 깊은 이해와 거리 조절이 필요한 관계.`

  return { score, signals, narration }
}

// ─────────────────────────────────────────────────────────
// Layer 2: 점성 synastry (간이) — 두 사람 본명의 행성 간 관계
// 정밀 차트 계산 없이 saju.dayMaster·일지 element와 점성 추정
// (실제 production은 calculateNatal 두 번 + 어스펙트 매칭이 정밀)
// ─────────────────────────────────────────────────────────

function approximateAstroFromSaju(s: ReturnType<typeof calculateSajuData>): { sun: string; moon: string; mercury: string } {
  // 본명 4기둥의 element 분포로 간이 점성 추정
  const ds = s.pillars.day.heavenlyStem.name
  const ms = s.pillars.month.heavenlyStem.name
  const sunEl = STEM_KO_EL[ds] || '토'
  const moonEl = STEM_KO_EL[ms] || '토'
  return { sun: sunEl, moon: moonEl, mercury: sunEl }
}

function analyzeSynastry(
  a: ReturnType<typeof calculateSajuData>,
  b: ReturnType<typeof calculateSajuData>
): CompatibilityLayerResult {
  const signals: CompatibilitySignal[] = []
  let score = 50

  const ax = approximateAstroFromSaju(a)
  const bx = approximateAstroFromSaju(b)

  // Sun-Sun 관계 (자아·정체성)
  if (ax.sun === bx.sun) {
    signals.push({ text: `두 사람 자아 element 같음 (${ax.sun}) — 가치관·정체성 동기화`, delta: 7 })
    score += 7
  } else {
    const rel = elementRelation(ax.sun, bx.sun)
    if (rel === 'support') {
      signals.push({ text: `자아 element 상생 (${ax.sun}↔${bx.sun}) — 정체성 서로 받쳐줌`, delta: 8 })
      score += 8
    } else if (rel === 'control' || rel === 'controlled') {
      signals.push({ text: `자아 element 상극 (${ax.sun}↔${bx.sun}) — 정체성 충돌 가능`, delta: -5 })
      score -= 5
    }
  }

  // Sun-Moon 관계 (자아 vs 정서) — 이게 부부 궁합에 가장 중요
  const sunMoonRel = elementRelation(ax.sun, bx.moon)
  if (sunMoonRel === 'support') {
    signals.push({ text: `A의 자아(${ax.sun})와 B의 정서(${bx.moon}) 상생 — 정서적 안정`, delta: 9 })
    score += 9
  } else if (sunMoonRel === 'control' || sunMoonRel === 'controlled') {
    signals.push({ text: `A의 자아와 B의 정서 상극 — 정서적 거리감`, delta: -4 })
    score -= 4
  }

  // Moon-Moon 관계 (정서 동기화)
  if (ax.moon === bx.moon) {
    signals.push({ text: `두 사람 정서 element 같음 — 감정 흐름 비슷, 공감 빠름`, delta: 6 })
    score += 6
  }

  score = Math.max(0, Math.min(100, score))

  let narration: string
  if (score >= 70) narration = `점성으로 보면 정체성·정서·소통 흐름이 자연스럽게 맞물리는 사이예요.`
  else if (score >= 50) narration = `점성 흐름은 중립 — 큰 자석은 없되 큰 충돌도 없는 사이.`
  else narration = `점성 흐름에서 정체성·정서 충돌 가능성. 표현 방식 차이를 의식해야 해요.`

  return { score, signals, narration }
}

// ─────────────────────────────────────────────────────────
// Layer 3: Composite — 두 사람 본명의 중간점 (관계 본질)
// ─────────────────────────────────────────────────────────

function analyzeComposite(
  a: ReturnType<typeof calculateSajuData>,
  b: ReturnType<typeof calculateSajuData>
): CompatibilityLayerResult {
  const signals: CompatibilitySignal[] = []
  let score = 50

  // composite "일간" — 두 일간 element의 중간 또는 융합
  const aEl = STEM_KO_EL[a.pillars.day.heavenlyStem.name] || '토'
  const bEl = STEM_KO_EL[b.pillars.day.heavenlyStem.name] || '토'
  const fusionElement = aEl === bEl ? aEl : `${aEl}+${bEl}`

  if (aEl === bEl) {
    signals.push({ text: `관계 본질 element ${aEl} — 같은 색의 단단한 결속`, delta: 6 })
    score += 6
  } else {
    const rel = elementRelation(aEl, bEl)
    if (rel === 'support') {
      signals.push({ text: `관계 본질이 상생 흐름 (${fusionElement}) — 함께 성장하는 관계`, delta: 10 })
      score += 10
    } else if (rel === 'control' || rel === 'controlled') {
      signals.push({ text: `관계 본질에 통제 흐름 (${fusionElement}) — 한 쪽이 주도, 다른 쪽이 견제`, delta: -3 })
      score -= 3
    } else if (rel === 'drain') {
      signals.push({ text: `관계 본질이 헌신 흐름 (${fusionElement}) — 한 쪽이 더 주는 구도`, delta: 0 })
    }
  }

  // 두 사람 격국 매칭 (사주 lib에 있다면)
  const aGeokguk = (a as { advancedAnalysis?: { geokguk?: { primary?: string } } }).advancedAnalysis?.geokguk?.primary
  const bGeokguk = (b as { advancedAnalysis?: { geokguk?: { primary?: string } } }).advancedAnalysis?.geokguk?.primary
  if (aGeokguk && bGeokguk) {
    if (aGeokguk === bGeokguk) {
      signals.push({ text: `두 사람 격국 같음 (${aGeokguk}) — 가치관 동기화`, delta: 7 })
      score += 7
    } else {
      // 정관격↔정인격 같은 보완형 조합 +, 편관격↔비견격 같은 충돌형 -
      const harmonious = ['정관격', '정재격', '정인격', '식신격']
      if (harmonious.includes(aGeokguk) && harmonious.includes(bGeokguk)) {
        signals.push({ text: `두 격국 모두 정격 — 안정 지향 조합`, delta: 4 })
        score += 4
      }
    }
  }

  // 대운 phase 비교 — 두 사람이 같은 시기에 비슷한 흐름인지
  const aDaeun = a.daeWoon.current
  const bDaeun = b.daeWoon.current
  if (aDaeun && bDaeun) {
    const aDaeunEl = STEM_KO_EL[aDaeun.heavenlyStem]
    const bDaeunEl = STEM_KO_EL[bDaeun.heavenlyStem]
    if (aDaeunEl === bDaeunEl) {
      signals.push({ text: `현 대운 element 같음 (${aDaeunEl}) — 비슷한 인생 phase에 함께 있음`, delta: 5 })
      score += 5
    }
  }

  score = Math.max(0, Math.min(100, score))

  let narration: string
  if (score >= 70) narration = `관계 본질이 단단한 구도예요. 시간이 갈수록 깊어지는 사이.`
  else if (score >= 55) narration = `관계 본질에 안정성과 변동성이 같이 있어요. 큰 흐름 안에서 조율이 핵심.`
  else if (score >= 40) narration = `관계 본질에 긴장이 있어요. 의식적 노력 없으면 거리감 생기기 쉬움.`
  else narration = `관계 본질이 도전적이에요. 두 사람의 인생 방향이 다른 곳을 가리킬 가능성.`

  return { score, signals, narration }
}

// ─────────────────────────────────────────────────────────
// 통합 verdict
// ─────────────────────────────────────────────────────────

function integrate(
  l1: CompatibilityLayerResult,
  l2: CompatibilityLayerResult,
  l3: CompatibilityLayerResult
): ThreeLayerCompatibility['integrated'] {
  // 사주 30%, synastry 30%, composite 40%
  const score = Math.round(l1.score * 0.3 + l2.score * 0.3 + l3.score * 0.4)

  let level: ThreeLayerCompatibility['integrated']['level']
  if (score >= 80) level = '환상의 짝'
  else if (score >= 65) level = '잘 맞는 사이'
  else if (score >= 50) level = '노력 필요'
  else if (score >= 35) level = '도전적'
  else level = '어려운 조합'

  const narration = `사주 ${l1.score}점, 점성 ${l2.score}점, 관계 본질 ${l3.score}점 — 통합 ${score}점, 등급 "${level}". ${l3.narration}`

  return { score, level, narration }
}

// ─────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────

export function analyzeThreeLayerCompatibility(
  personA: CompatibilityPerson,
  personB: CompatibilityPerson
): ThreeLayerCompatibility {
  const sajuA = calculateSajuData(personA.birthDate, personA.birthTime, personA.gender, 'solar', 'Asia/Seoul')
  const sajuB = calculateSajuData(personB.birthDate, personB.birthTime, personB.gender, 'solar', 'Asia/Seoul')

  const layer1 = analyzeSajuCompatibility(sajuA, sajuB)
  const layer2 = analyzeSynastry(sajuA, sajuB)
  const layer3 = analyzeComposite(sajuA, sajuB)
  const integrated = integrate(layer1, layer2, layer3)

  return { layer1_saju: layer1, layer2_synastry: layer2, layer3_composite: layer3, integrated }
}
