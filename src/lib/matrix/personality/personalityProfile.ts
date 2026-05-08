/**
 * 개인화 인격 프로필 — 사주+점성 데이터를 현대 심리학 framework로 변환
 *
 * 만세력 전문가는 사주만으로 인격 추정에 흔들림이 큼.
 * 우리는 사주+점성 cross로 같은 방향 가리키는 데이터에 confidence 가산.
 *
 * 출력:
 *   - MBTI 4축 (E/I, S/N, T/F, J/P) + 16 type 추정
 *   - Big Five (OCEAN) 5차원 점수
 *   - 인지 스타일 (분석·직관·감정·실용)
 *   - 갈등 trigger 패턴
 *   - 학습 스타일
 */

import type { MatrixCalculationInput } from '@/lib/matrix/types'

// ─────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────

export type MbtiAxis = {
  pole: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P'
  score: number // 0~100, 50이면 중립
  evidence: string[] // 근거 요약 (사주·점성 출처)
}

export type MbtiResult = {
  type: string // 예: "INTJ"
  confidence: number // 0~100, 4축 평균 명확도
  axes: { ei: MbtiAxis; sn: MbtiAxis; tf: MbtiAxis; jp: MbtiAxis }
  summaryKo: string
}

export type BigFiveResult = {
  openness: number // 0~100
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
  evidence: string[]
  summaryKo: string
}

export type CognitiveStyle = {
  primary: '분석·논리' | '직관·통합' | '감정·관계' | '실용·구조'
  secondary: '분석·논리' | '직관·통합' | '감정·관계' | '실용·구조'
  weakest: string
  optimalEnvironment: string
  summaryKo: string
}

export type ConflictTrigger = {
  triggers: string[] // 발화 패턴 (3-5개)
  reactionStyle: '외부 폭발형' | '내부 차단·이탈형' | '논리 반박형' | '감정 회피형'
  recoveryAdvice: string
  summaryKo: string
}

export type LearningStyle = {
  best: '텍스트·문서' | '체험·실행' | '토론·대화' | '영상·시각'
  worst: '텍스트·문서' | '체험·실행' | '토론·대화' | '영상·시각'
  pace: '깊이·천천히' | '넓게·빠르게' | '반복·꾸준히'
  summaryKo: string
}

export type PersonalityProfile = {
  mbti: MbtiResult
  bigFive: BigFiveResult
  cognitiveStyle: CognitiveStyle
  conflictTrigger: ConflictTrigger
  learningStyle: LearningStyle
}

// ─────────────────────────────────────────────────────────
// 도구: 사주·점성 신호 추출
// ─────────────────────────────────────────────────────────

const YANG_STEMS_KO = new Set(['갑', '병', '무', '경', '임', '甲', '丙', '戊', '庚', '壬'])
const YIN_STEMS_KO = new Set(['을', '정', '기', '신', '계', '乙', '丁', '己', '辛', '癸'])

const FIRE_AIR_SIGNS = new Set([
  'Aries', 'Leo', 'Sagittarius', 'Gemini', 'Libra', 'Aquarius',
  '양자리', '사자자리', '사수자리', '쌍둥이자리', '천칭자리', '물병자리',
])
const EARTH_WATER_SIGNS = new Set([
  'Taurus', 'Virgo', 'Capricorn', 'Cancer', 'Scorpio', 'Pisces',
  '황소자리', '처녀자리', '염소자리', '게자리', '전갈자리', '물고기자리',
])
const FIRE_SIGNS = new Set(['Aries', 'Leo', 'Sagittarius', '양자리', '사자자리', '사수자리'])
const AIR_SIGNS = new Set(['Gemini', 'Libra', 'Aquarius', '쌍둥이자리', '천칭자리', '물병자리'])
const EARTH_SIGNS = new Set(['Taurus', 'Virgo', 'Capricorn', '황소자리', '처녀자리', '염소자리'])
const WATER_SIGNS = new Set(['Cancer', 'Scorpio', 'Pisces', '게자리', '전갈자리', '물고기자리'])

const CARDINAL_SIGNS = new Set(['Aries', 'Cancer', 'Libra', 'Capricorn', '양자리', '게자리', '천칭자리', '염소자리'])
const FIXED_SIGNS = new Set(['Taurus', 'Leo', 'Scorpio', 'Aquarius', '황소자리', '사자자리', '전갈자리', '물병자리'])
const MUTABLE_SIGNS = new Set(['Gemini', 'Virgo', 'Sagittarius', 'Pisces', '쌍둥이자리', '처녀자리', '사수자리', '물고기자리'])

const SOCIAL_HOUSES = new Set([1, 5, 7, 11]) // 외향
const PRIVATE_HOUSES = new Set([4, 8, 12]) // 내향
const STRUCTURE_HOUSES = new Set([2, 6, 10]) // 실용
const PHILOSOPHY_HOUSES = new Set([9, 12]) // 직관·영성

function getDayMasterStemRaw(input: MatrixCalculationInput): string | undefined {
  const snap = (input as { sajuSnapshot?: { pillars?: { day?: { heavenlyStem?: { name?: string } } } } }).sajuSnapshot
  return snap?.pillars?.day?.heavenlyStem?.name
}

function isYangDayMaster(input: MatrixCalculationInput): boolean | undefined {
  const stem = getDayMasterStemRaw(input)
  if (!stem) return undefined
  if (YANG_STEMS_KO.has(stem)) return true
  if (YIN_STEMS_KO.has(stem)) return false
  return undefined
}

function countSibsin(input: MatrixCalculationInput, kinds: string[]): number {
  const dist = input.sibsinDistribution || {}
  let sum = 0
  for (const k of kinds) sum += (dist as Record<string, number>)[k] || 0
  return sum
}

function planetsInSignGroup(input: MatrixCalculationInput, group: Set<string>): number {
  const signs = input.planetSigns || {}
  let count = 0
  for (const sign of Object.values(signs)) {
    if (sign && group.has(sign)) count++
  }
  return count
}

function planetsInHouses(input: MatrixCalculationInput, houseSet: Set<number>): number {
  const houses = input.planetHouses || {}
  let count = 0
  for (const h of Object.values(houses)) {
    if (typeof h === 'number' && houseSet.has(h)) count++
  }
  return count
}

function hasShinsal(input: MatrixCalculationInput, kinds: string[]): boolean {
  const list = (input.shinsalList || []) as string[]
  return list.some((k) => kinds.includes(k))
}

// ─────────────────────────────────────────────────────────
// MBTI 4축 추정
// ─────────────────────────────────────────────────────────

function axisEI(input: MatrixCalculationInput): MbtiAxis {
  let eScore = 0
  let iScore = 0
  const evidence: string[] = []

  // 사주: 양일간 = E, 음일간 = I
  const yang = isYangDayMaster(input)
  if (yang === true) { eScore += 12; evidence.push('일간 양간(외향 기조)') }
  else if (yang === false) { iScore += 12; evidence.push('일간 음간(내향 기조)') }

  // 사주: 식상·비겁 多 = E, 인성 多 = I
  const sikbi = countSibsin(input, ['식신', '상관', '비견', '겁재'])
  const inseong = countSibsin(input, ['정인', '편인'])
  if (sikbi >= 3) { eScore += 8; evidence.push(`식상·비겁 ${sikbi}개(표현·교류 多)`) }
  if (inseong >= 3) { iScore += 8; evidence.push(`인성 ${inseong}개(내면 흡수 多)`) }

  // 점성: 화·풍 sign 많으면 E, 토·수 sign 많으면 I
  const fireAir = planetsInSignGroup(input, FIRE_AIR_SIGNS)
  const earthWater = planetsInSignGroup(input, EARTH_WATER_SIGNS)
  if (fireAir > earthWater) { eScore += (fireAir - earthWater) * 4; evidence.push(`점성 화·풍 sign ${fireAir}개 우세`) }
  else if (earthWater > fireAir) { iScore += (earthWater - fireAir) * 4; evidence.push(`점성 토·수 sign ${earthWater}개 우세`) }

  // 점성: 사회 하우스(1·5·7·11) vs 사적 하우스(4·8·12)
  const social = planetsInHouses(input, SOCIAL_HOUSES)
  const priv = planetsInHouses(input, PRIVATE_HOUSES)
  if (social > priv) { eScore += (social - priv) * 5; evidence.push(`사회 하우스(1/5/7/11) ${social}개`) }
  else if (priv > social) { iScore += (priv - social) * 5; evidence.push(`사적 하우스(4/8/12) ${priv}개`) }

  const total = eScore + iScore
  const score = total === 0 ? 50 : Math.round((eScore / total) * 100)
  return { pole: score >= 50 ? 'E' : 'I', score, evidence }
}

function axisSN(input: MatrixCalculationInput): MbtiAxis {
  let sScore = 0
  let nScore = 0
  const evidence: string[] = []

  // 사주: 정재·정관·정인·식신 = S(현실·구체), 편재·편관·편인·상관 = N(추상·다층)
  const positiveSibsin = countSibsin(input, ['정재', '정관', '정인', '식신'])
  const adventureSibsin = countSibsin(input, ['편재', '편관', '편인', '상관'])
  if (positiveSibsin > adventureSibsin) {
    sScore += (positiveSibsin - adventureSibsin) * 5
    evidence.push(`정십신 ${positiveSibsin}개 우세(체계·현실)`)
  } else if (adventureSibsin > positiveSibsin) {
    nScore += (adventureSibsin - positiveSibsin) * 5
    evidence.push(`편십신 ${adventureSibsin}개 우세(다층·확장)`)
  }

  // 점성: earth·water = S(체험), fire·air = N (특히 air = N 강)
  const earth = planetsInSignGroup(input, EARTH_SIGNS)
  const air = planetsInSignGroup(input, AIR_SIGNS)
  if (earth >= 2) { sScore += earth * 4; evidence.push(`점성 흙 sign ${earth}개(감각·실측)`) }
  if (air >= 2) { nScore += air * 5; evidence.push(`점성 공기 sign ${air}개(개념·추상)`) }

  // 6하우스(일상·실무) = S, 9하우스(고차원·철학) = N
  const houses = input.planetHouses || {}
  const h6 = Object.values(houses).filter((h) => h === 6).length
  const h9 = Object.values(houses).filter((h) => h === 9).length
  if (h6 > 0) { sScore += h6 * 4; evidence.push(`6하우스 행성 ${h6}개(실무 감각)`) }
  if (h9 > 0) { nScore += h9 * 4; evidence.push(`9하우스 행성 ${h9}개(고차원 사고)`) }

  const total = sScore + nScore
  const score = total === 0 ? 50 : Math.round((sScore / total) * 100)
  return { pole: score >= 50 ? 'S' : 'N', score, evidence }
}

function axisTF(input: MatrixCalculationInput): MbtiAxis {
  let tScore = 0
  let fScore = 0
  const evidence: string[] = []

  // 사주: 일간 금(辛庚) = T, 일간 화(丙丁) 또는 인성 多 = F
  const stem = getDayMasterStemRaw(input)
  if (stem === '庚' || stem === '辛' || stem === '경' || stem === '신') {
    tScore += 12; evidence.push(`일간 금(분석·결단)`)
  } else if (stem === '丙' || stem === '丁' || stem === '병' || stem === '정') {
    fScore += 10; evidence.push(`일간 화(감정·표현)`)
  }

  // 정관·편관·정재 多 = T, 정인·식신 多 = F
  const tSibsin = countSibsin(input, ['정관', '편관', '정재'])
  const fSibsin = countSibsin(input, ['정인', '식신'])
  if (tSibsin > fSibsin) { tScore += (tSibsin - fSibsin) * 5; evidence.push(`관성·정재 ${tSibsin}개(원칙·구조)`) }
  else if (fSibsin > tSibsin) { fScore += (fSibsin - tSibsin) * 5; evidence.push(`인성·식신 ${fSibsin}개(공감·돌봄)`) }

  // 점성: 토성 angular(1/4/7/10) = T 강화, 금성 angular = F 강화
  const houses = input.planetHouses || {}
  const angular = new Set([1, 4, 7, 10])
  if (angular.has(houses.Saturn as number)) { tScore += 8; evidence.push(`토성 angular(논리·구조)`) }
  if (angular.has(houses.Venus as number)) { fScore += 8; evidence.push(`금성 angular(관계·조화)`) }
  if (angular.has(houses.Moon as number)) { fScore += 6; evidence.push(`달 angular(감정 우선)`) }

  const total = tScore + fScore
  const score = total === 0 ? 50 : Math.round((tScore / total) * 100)
  return { pole: score >= 50 ? 'T' : 'F', score, evidence }
}

function axisJP(input: MatrixCalculationInput): MbtiAxis {
  let jScore = 0
  let pScore = 0
  const evidence: string[] = []

  // 사주: 정관격·정재격·정인격 = J, 편관격·편재격·상관격 = P
  const geokguk = String(input.geokguk || '')
  if (['정관격', '정재격', '정인격', '식신격'].includes(geokguk)) {
    jScore += 14; evidence.push(`${geokguk}(체계·계획)`)
  } else if (['편관격', '편재격', '편인격', '상관격'].includes(geokguk)) {
    pScore += 14; evidence.push(`${geokguk}(유연·즉흥)`)
  }

  // 점성: cardinal/fixed sign 多 = J, mutable sign 多 = P
  const cardinalFixed = planetsInSignGroup(input, CARDINAL_SIGNS) + planetsInSignGroup(input, FIXED_SIGNS)
  const mutable = planetsInSignGroup(input, MUTABLE_SIGNS)
  if (cardinalFixed > mutable) { jScore += (cardinalFixed - mutable) * 3; evidence.push(`점성 cardinal+fixed ${cardinalFixed}개(고정·결단)`) }
  else if (mutable > cardinalFixed) { pScore += (mutable - cardinalFixed) * 3; evidence.push(`점성 mutable ${mutable}개(적응·변화)`) }

  // 토성 1H/10H = J 강화
  const houses = input.planetHouses || {}
  if (houses.Saturn === 1 || houses.Saturn === 10) { jScore += 8; evidence.push(`토성 ${houses.Saturn}하우스(체계 우선)`) }

  const total = jScore + pScore
  const score = total === 0 ? 50 : Math.round((jScore / total) * 100)
  return { pole: score >= 50 ? 'J' : 'P', score, evidence }
}

const MBTI_TYPE_KO: Record<string, string> = {
  INTJ: '독립적 전략가형 — 장기 비전과 체계로 문제를 푸는 분',
  INTP: '논리적 사색가형 — 개념·시스템을 깊이 파고드는 분',
  ENTJ: '결단형 리더형 — 목표·구조를 잡고 추진하는 분',
  ENTP: '도전적 발명가형 — 새 아이디어로 판을 흔드는 분',
  INFJ: '직관적 옹호자형 — 의미·가치로 움직이는 분',
  INFP: '이상주의 중재자형 — 진정성과 가능성에 끌리는 분',
  ENFJ: '카리스마 안내자형 — 사람을 이끌고 성장시키는 분',
  ENFP: '자유로운 활동가형 — 새 만남·아이디어로 활기를 만드는 분',
  ISTJ: '신뢰형 관리자형 — 책임·체계로 묵묵히 완수하는 분',
  ISFJ: '헌신형 수호자형 — 가까운 사람을 챙기는 따뜻한 분',
  ESTJ: '실행형 경영자형 — 효율·결과로 조직을 움직이는 분',
  ESFJ: '협력형 외교관형 — 관계·화합으로 일이 풀리는 분',
  ISTP: '문제 해결형 장인형 — 손으로 다루며 정밀하게 푸는 분',
  ISFP: '예술가형 — 자기 감각·심미로 세상에 표현하는 분',
  ESTP: '추진형 사업가형 — 즉흥과 행동으로 기회를 잡는 분',
  ESFP: '활기형 연예인형 — 사람들과 함께 순간을 즐기는 분',
}

export function estimateMbti(input: MatrixCalculationInput): MbtiResult {
  const ei = axisEI(input)
  const sn = axisSN(input)
  const tf = axisTF(input)
  const jp = axisJP(input)
  const type = `${ei.pole}${sn.pole}${tf.pole}${jp.pole}`
  // confidence = 4 axes 중심 거리 평균 (50에서 멀수록 명확)
  const distances = [ei, sn, tf, jp].map((a) => Math.abs(a.score - 50))
  const confidence = Math.round((distances.reduce((s, d) => s + d, 0) / 4) * 2)
  const summaryKo = MBTI_TYPE_KO[type] || `${type}형`
  return { type, confidence, axes: { ei, sn, tf, jp }, summaryKo }
}
