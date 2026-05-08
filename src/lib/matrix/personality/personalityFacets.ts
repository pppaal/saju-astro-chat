/**
 * Big Five (OCEAN) + 인지스타일 + 갈등 trigger + 학습 스타일.
 * personalityProfile.ts와 같은 사주+점성 입력을 사용.
 */

import type { MatrixCalculationInput } from '@/lib/matrix/types'
import type {
  BigFiveResult,
  CognitiveStyle,
  ConflictTrigger,
  LearningStyle,
} from './personalityProfile'

function clamp01_100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function countSibsin(input: MatrixCalculationInput, kinds: string[]): number {
  const dist = input.sibsinDistribution || {}
  let sum = 0
  for (const k of kinds) sum += (dist as Record<string, number>)[k] || 0
  return sum
}

function planetsInHouses(input: MatrixCalculationInput, houses: number[]): number {
  const map = input.planetHouses || {}
  let count = 0
  for (const h of Object.values(map)) {
    if (typeof h === 'number' && houses.includes(h)) count++
  }
  return count
}

function planetsInSigns(input: MatrixCalculationInput, signs: string[]): number {
  const map = input.planetSigns || {}
  let count = 0
  for (const s of Object.values(map)) {
    if (s && signs.includes(s)) count++
  }
  return count
}

function hasShinsalAny(input: MatrixCalculationInput, kinds: string[]): number {
  const list = (input.shinsalList || []) as string[]
  return list.filter((k) => kinds.includes(k)).length
}

function aspectCountByType(input: MatrixCalculationInput, types: string[]): number {
  const aspects = input.aspects || []
  return aspects.filter((a) => types.includes(a.type)).length
}

// ─────────────────────────────────────────────────────────
// Big Five (OCEAN)
// ─────────────────────────────────────────────────────────

export function estimateBigFive(input: MatrixCalculationInput): BigFiveResult {
  const evidence: string[] = []

  // Openness — 편인·편재·상관 + 천왕성·해왕성 영향 + 9H/11H + air sign
  let openness = 40
  const openSibsin = countSibsin(input, ['편인', '편재', '상관'])
  if (openSibsin >= 3) { openness += 18; evidence.push(`편십신·상관 ${openSibsin}개(다층 사고)`) }
  else if (openSibsin >= 2) openness += 10
  const houses = input.planetHouses || {}
  if (houses.Uranus) { openness += 8; evidence.push(`천왕성 활성(혁신 성향)`) }
  if (houses.Neptune) openness += 5
  if (houses.Uranus === 9 || houses.Uranus === 11) openness += 5
  const airCount = planetsInSigns(input, ['Gemini', 'Libra', 'Aquarius', '쌍둥이자리', '천칭자리', '물병자리'])
  if (airCount >= 2) { openness += airCount * 4; evidence.push(`공기 sign ${airCount}개(개방성)`) }

  // Conscientiousness — 정관·정인·정재 + 토성 강 + earth sign
  let conscientiousness = 40
  const cSibsin = countSibsin(input, ['정관', '정인', '정재'])
  if (cSibsin >= 3) { conscientiousness += 18; evidence.push(`정십신 ${cSibsin}개(체계·책임)`) }
  else if (cSibsin >= 2) conscientiousness += 10
  if (houses.Saturn === 1 || houses.Saturn === 10 || houses.Saturn === 4) {
    conscientiousness += 12; evidence.push(`토성 angular ${houses.Saturn}H(구조 우선)`)
  }
  const earthCount = planetsInSigns(input, ['Taurus', 'Virgo', 'Capricorn', '황소자리', '처녀자리', '염소자리'])
  if (earthCount >= 2) { conscientiousness += earthCount * 3; evidence.push(`흙 sign ${earthCount}개(꾸준함)`) }
  const geokguk = String(input.geokguk || '')
  if (['정관격', '정재격', '정인격', '식신격'].includes(geokguk)) {
    conscientiousness += 8; evidence.push(`${geokguk}(체계·완결)`)
  }

  // Extraversion — 양일간 + 식상·비겁 + fire/air sign + 1/5/7/11 H
  let extraversion = 40
  const stem = String((input as { sajuSnapshot?: { pillars?: { day?: { heavenlyStem?: { name?: string } } } } }).sajuSnapshot?.pillars?.day?.heavenlyStem?.name || '')
  const yangStems = new Set(['甲', '丙', '戊', '庚', '壬', '갑', '병', '무', '경', '임'])
  if (yangStems.has(stem)) { extraversion += 8; evidence.push(`양일간(외향 기조)`) }
  const eSibsin = countSibsin(input, ['식신', '상관', '비견', '겁재'])
  if (eSibsin >= 3) { extraversion += 14; evidence.push(`식상·비겁 ${eSibsin}개(표현·교류)`) }
  const fireCount = planetsInSigns(input, ['Aries', 'Leo', 'Sagittarius', '양자리', '사자자리', '사수자리'])
  if (fireCount + airCount >= 3) extraversion += (fireCount + airCount) * 3
  const socialH = planetsInHouses(input, [1, 5, 7, 11])
  if (socialH >= 2) { extraversion += socialH * 4; evidence.push(`사회 하우스 ${socialH}개`) }

  // Agreeableness — 정인·식신·금성 강 + 7H 강 + trine/sextile 多
  let agreeableness = 40
  const aSibsin = countSibsin(input, ['정인', '식신'])
  if (aSibsin >= 2) { agreeableness += aSibsin * 5; evidence.push(`정인·식신 ${aSibsin}개(돌봄·공감)`) }
  if (houses.Venus === 1 || houses.Venus === 7 || houses.Venus === 11) {
    agreeableness += 10; evidence.push(`금성 ${houses.Venus}H(관계 조율)`)
  }
  const harmonyAspects = aspectCountByType(input, ['trine', 'sextile'])
  const tensionAspects = aspectCountByType(input, ['square', 'opposition'])
  if (harmonyAspects > tensionAspects) { agreeableness += (harmonyAspects - tensionAspects) * 3; evidence.push(`조화 어스펙트 ${harmonyAspects}개`) }
  if (countSibsin(input, ['편관']) >= 2) agreeableness -= 8
  const conflictShinsal = hasShinsalAny(input, ['괴강', '백호', '양인'])
  if (conflictShinsal > 0) { agreeableness -= conflictShinsal * 5; evidence.push(`괴강·백호·양인 ${conflictShinsal}개(직설)`) }

  // Neuroticism — 편관 강 + 신살(괴강·백호·양인·고신) + hard aspect 多
  let neuroticism = 30
  const nSibsin = countSibsin(input, ['편관'])
  if (nSibsin >= 2) { neuroticism += nSibsin * 6; evidence.push(`편관 ${nSibsin}개(압박 민감)`) }
  const stressShinsal = hasShinsalAny(input, ['괴강', '백호', '양인', '고신', '망신'])
  if (stressShinsal > 0) { neuroticism += stressShinsal * 5; evidence.push(`스트레스 신살 ${stressShinsal}개`) }
  if (tensionAspects >= 3) { neuroticism += tensionAspects * 3; evidence.push(`긴장 어스펙트 ${tensionAspects}개`) }
  // 천을귀인·천덕귀인 등 안정 신살은 neuroticism 감소
  const protectShinsal = hasShinsalAny(input, ['천을귀인', '천덕귀인', '월덕귀인'])
  if (protectShinsal > 0) { neuroticism -= protectShinsal * 4; evidence.push(`보호 신살 ${protectShinsal}개(안정)`) }

  const o = clamp01_100(openness)
  const c = clamp01_100(conscientiousness)
  const e = clamp01_100(extraversion)
  const a = clamp01_100(agreeableness)
  const n = clamp01_100(neuroticism)

  const summaryParts: string[] = []
  if (o >= 65) summaryParts.push('새 아이디어·다양한 영역에 열려 있는')
  else if (o <= 35) summaryParts.push('익숙한 방식·기존 틀에 안정감을 두는')
  if (c >= 65) summaryParts.push('체계적이고 책임감 있는')
  else if (c <= 35) summaryParts.push('자유로운 흐름을 선호하는')
  if (e >= 65) summaryParts.push('밖으로 표현·교류하며 충전하는')
  else if (e <= 35) summaryParts.push('혼자 깊이 들여다보며 충전하는')
  if (a >= 65) summaryParts.push('관계 조율·협력에 강한')
  else if (a <= 35) summaryParts.push('직설적이고 자기 기준이 분명한')
  if (n >= 65) summaryParts.push('압박·자극에 민감한')
  else if (n <= 35) summaryParts.push('스트레스 회복이 빠른')

  const summaryKo = summaryParts.length > 0
    ? `${summaryParts.join(', ')} 분이에요.`
    : '특정 차원이 두드러지지 않는 균형형 분이에요.'

  return {
    openness: o,
    conscientiousness: c,
    extraversion: e,
    agreeableness: a,
    neuroticism: n,
    evidence,
    summaryKo,
  }
}

// ─────────────────────────────────────────────────────────
// 인지 스타일
// ─────────────────────────────────────────────────────────

export function detectCognitiveStyle(input: MatrixCalculationInput): CognitiveStyle {
  const scores: Record<CognitiveStyle['primary'], number> = {
    '분석·논리': 0,
    '직관·통합': 0,
    '감정·관계': 0,
    '실용·구조': 0,
  }

  const stem = String((input as { sajuSnapshot?: { pillars?: { day?: { heavenlyStem?: { name?: string } } } } }).sajuSnapshot?.pillars?.day?.heavenlyStem?.name || '')
  // 일간별 인지 기조
  if (['庚', '辛', '경', '신'].includes(stem)) scores['분석·논리'] += 15
  if (['壬', '癸', '임', '계'].includes(stem)) scores['직관·통합'] += 15
  if (['丙', '丁', '병', '정'].includes(stem)) scores['감정·관계'] += 15
  if (['戊', '己', '무', '기'].includes(stem)) scores['실용·구조'] += 15
  if (['甲', '乙', '갑', '을'].includes(stem)) { scores['직관·통합'] += 8; scores['실용·구조'] += 5 }

  // 십신 영향
  if (countSibsin(input, ['정관', '정재']) >= 2) scores['분석·논리'] += 8
  if (countSibsin(input, ['편인', '편재']) >= 2) scores['직관·통합'] += 8
  if (countSibsin(input, ['정인', '식신']) >= 2) scores['감정·관계'] += 8
  if (countSibsin(input, ['정재', '비견']) >= 2) scores['실용·구조'] += 6

  // 점성: 수성 위치
  const signs = input.planetSigns || {}
  const mercurySign = signs.Mercury as string | undefined
  if (mercurySign && ['Capricorn', 'Virgo', 'Taurus', '염소자리', '처녀자리', '황소자리'].includes(mercurySign)) {
    scores['실용·구조'] += 6
  }
  if (mercurySign && ['Gemini', 'Aquarius', 'Libra', '쌍둥이자리', '물병자리', '천칭자리'].includes(mercurySign)) {
    scores['분석·논리'] += 8
  }
  if (mercurySign && ['Pisces', 'Cancer', 'Scorpio', '물고기자리', '게자리', '전갈자리'].includes(mercurySign)) {
    scores['직관·통합'] += 8
  }
  if (mercurySign && ['Aries', 'Leo', 'Sagittarius', '양자리', '사자자리', '사수자리'].includes(mercurySign)) {
    scores['감정·관계'] += 5
  }

  // 점성: 달 angular = 감정·관계 강화
  const houses = input.planetHouses || {}
  if ([1, 4, 7, 10].includes(houses.Moon as number)) scores['감정·관계'] += 6
  if ([1, 4, 7, 10].includes(houses.Saturn as number)) scores['실용·구조'] += 6

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const primary = sorted[0][0] as CognitiveStyle['primary']
  const secondary = sorted[1][0] as CognitiveStyle['primary']
  const weakest = sorted[3][0]

  const optimalEnvByStyle: Record<CognitiveStyle['primary'], string> = {
    '분석·논리': '데이터·체계가 있는 환경, 자율성과 깊이 있는 작업이 가능한 자리',
    '직관·통합': '큰 그림과 가능성을 다루는 환경, 답이 정해지지 않은 탐색형 과제',
    '감정·관계': '신뢰 기반 협업·돌봄·표현이 중심인 환경',
    '실용·구조': '명확한 절차와 측정 가능한 결과가 있는 환경',
  }

  const koJongsung = (s: string): boolean => {
    if (!s) return false
    const last = s.charCodeAt(s.length - 1)
    if (last < 0xac00 || last > 0xd7a3) return false
    return (last - 0xac00) % 28 !== 0
  }
  const ig = (s: string) => (koJongsung(s) ? '이' : '가')
  const summaryKo =
    `${primary}${ig(primary)} 주, ${secondary}${ig(secondary)} 보조로 작동하는 인지 스타일이에요. ` +
    `${optimalEnvByStyle[primary]}${ig(optimalEnvByStyle[primary])} 가장 잘 받쳐주고, ${weakest}${ig(weakest)} 약점이에요.`

  return {
    primary,
    secondary,
    weakest,
    optimalEnvironment: optimalEnvByStyle[primary],
    summaryKo,
  }
}

// ─────────────────────────────────────────────────────────
// 갈등 trigger
// ─────────────────────────────────────────────────────────

export function detectConflictTrigger(input: MatrixCalculationInput): ConflictTrigger {
  const triggers: string[] = []
  const houses = input.planetHouses || {}

  // 권위·강압
  if (countSibsin(input, ['편관']) >= 2 || hasShinsalAny(input, ['괴강', '양인']) > 0) {
    triggers.push('권위적 강압이나 일방적 명령')
  }
  // 자율성 침해
  if (countSibsin(input, ['비견', '겁재']) >= 2 || houses.Sun === 1) {
    triggers.push('자기 영역·자율성에 대한 침해')
  }
  // 인정 부족
  if (countSibsin(input, ['식신', '상관']) >= 2 || houses.Sun === 5 || houses.Sun === 10) {
    triggers.push('표현이나 성취가 인정받지 못할 때')
  }
  // 비논리
  if (countSibsin(input, ['정관']) >= 2 && countSibsin(input, ['정인']) >= 1) {
    triggers.push('비논리적·즉흥적 결정 강요')
  }
  // 정서 무관심
  if (countSibsin(input, ['정인']) >= 2 || houses.Moon === 4) {
    triggers.push('가까운 사람으로부터 정서적 무시·외면')
  }
  // 변동·이동 강제
  if (hasShinsalAny(input, ['역마', '지살']) > 0) {
    triggers.push('갑작스러운 환경 변화·이동 강제')
  }
  // 책임 과부하
  if (hasShinsalAny(input, ['고신', '망신']) > 0 || houses.Saturn === 6) {
    triggers.push('혼자 떠안는 책임·실무 부담')
  }

  // reaction style
  let reactionStyle: ConflictTrigger['reactionStyle'] = '내부 차단·이탈형'
  const yangStems = new Set(['甲', '丙', '戊', '庚', '壬', '갑', '병', '무', '경', '임'])
  const stem = String((input as { sajuSnapshot?: { pillars?: { day?: { heavenlyStem?: { name?: string } } } } }).sajuSnapshot?.pillars?.day?.heavenlyStem?.name || '')
  if (yangStems.has(stem) && hasShinsalAny(input, ['괴강', '양인']) > 0) {
    reactionStyle = '외부 폭발형'
  } else if (countSibsin(input, ['정관', '정인']) >= 2) {
    reactionStyle = '논리 반박형'
  } else if (countSibsin(input, ['정인', '식신']) >= 2 && !yangStems.has(stem)) {
    reactionStyle = '감정 회피형'
  }

  const recoveryAdviceByStyle: Record<ConflictTrigger['reactionStyle'], string> = {
    '외부 폭발형': '폭발 직후 24시간은 결정 보류. 신체 활동(운동·산책)으로 풀어내고, 사과는 사실+다음 단계 1줄로.',
    '내부 차단·이탈형': '말 끊기 전에 "지금은 정리할 시간 필요하다"고 한 줄로 표현. 24-48시간 후 재대화.',
    '논리 반박형': '상대에게 "사실·기준·범위 3가지로 다시 정리해주세요" 요청. 감정 단어는 제거.',
    '감정 회피형': '회피하지 말고 "이 부분이 마음에 걸린다"는 한 줄을 메시지로 먼저. 면대면은 24시간 후.',
  }

  const summaryKo =
    `이 분이 갈등에 빠지는 trigger는 ${triggers.slice(0, 3).join(', ')} 같은 상황이에요. ` +
    `반응 패턴은 ${reactionStyle}이고, 회복은 이렇게 가는 게 좋아요 — ${recoveryAdviceByStyle[reactionStyle]}`

  return {
    triggers: triggers.length > 0 ? triggers : ['특정 trigger가 두드러지지 않는 균형형'],
    reactionStyle,
    recoveryAdvice: recoveryAdviceByStyle[reactionStyle],
    summaryKo,
  }
}

// ─────────────────────────────────────────────────────────
// 학습 스타일
// ─────────────────────────────────────────────────────────

export function detectLearningStyle(input: MatrixCalculationInput): LearningStyle {
  const scores: Record<LearningStyle['best'], number> = {
    '텍스트·문서': 0,
    '체험·실행': 0,
    '토론·대화': 0,
    '영상·시각': 0,
  }

  // 인성(정인·편인) = 텍스트·문서
  if (countSibsin(input, ['정인', '편인']) >= 2) scores['텍스트·문서'] += 15
  // 식신·상관·비견 = 체험·토론
  if (countSibsin(input, ['식신', '상관']) >= 2) { scores['체험·실행'] += 8; scores['토론·대화'] += 8 }
  if (countSibsin(input, ['비견', '겁재']) >= 2) scores['토론·대화'] += 6

  // 점성: 수성 sign별
  const signs = input.planetSigns || {}
  const mercury = signs.Mercury as string | undefined
  if (mercury && ['Capricorn', 'Virgo', '염소자리', '처녀자리'].includes(mercury)) scores['텍스트·문서'] += 8
  if (mercury && ['Gemini', 'Libra', '쌍둥이자리', '천칭자리'].includes(mercury)) scores['토론·대화'] += 8
  if (mercury && ['Aries', 'Leo', '양자리', '사자자리'].includes(mercury)) scores['체험·실행'] += 8
  if (mercury && ['Pisces', 'Cancer', '물고기자리', '게자리'].includes(mercury)) scores['영상·시각'] += 8

  const houses = input.planetHouses || {}
  if (houses.Mercury === 9 || houses.Mercury === 3) scores['텍스트·문서'] += 5
  if (houses.Neptune === 12 || houses.Neptune === 9) scores['영상·시각'] += 5

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const best = sorted[0][0] as LearningStyle['best']
  const worst = sorted[3][0] as LearningStyle['best']

  let pace: LearningStyle['pace'] = '깊이·천천히'
  if (countSibsin(input, ['상관', '편재', '식신']) >= 3) pace = '넓게·빠르게'
  else if (countSibsin(input, ['정인', '정관', '정재']) >= 3) pace = '반복·꾸준히'

  const summaryKo =
    `${best} 방식이 가장 잘 맞고, ${worst} 방식은 효율이 떨어져요. ` +
    `학습 페이스는 "${pace}"가 자연스러워요.`

  return { best, worst, pace, summaryKo }
}
