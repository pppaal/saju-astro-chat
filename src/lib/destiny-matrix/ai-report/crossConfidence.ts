/**
 * 사주↔점성 cross signal confidence score.
 *
 * 두 시스템이 같은 방향을 가리키는 *강도*를 0-100%로 정량화.
 * 두 시스템 모두 강하게 합의 (>= 0.8) → "강한 신호"
 * 한쪽만 강함 (>= 0.6 + 약함) → "주의 필요"
 * 둘 다 약함 (<0.5) → "무시 가능"
 *
 * 사용처: report main paragraph 끝에 "두 시스템 합의 강도 87%" 표시.
 */

export type SignalDirection = 'caution' | 'flow' | 'neutral'

export interface CrossSignalInput {
  // saju side strength (0-1)
  sajuStrength?: number
  sajuDirection?: SignalDirection
  // astro side strength (0-1)
  astroStrength?: number
  astroDirection?: SignalDirection
}

export interface CrossConfidenceResult {
  scorePercent: number // 0-100
  band: 'high' | 'medium' | 'low' | 'conflict'
  description: string // 사용자 노출용 한 줄
}

/**
 * 두 시스템 신호 강도와 방향에서 confidence score 계산.
 * 같은 방향 + 둘 다 강함 → high (80%+)
 * 같은 방향 + 한쪽만 강함 → medium (50-79%)
 * 다른 방향 → conflict
 * 둘 다 약함 → low (<50%)
 */
export function calculateCrossConfidence(input: CrossSignalInput, lang: 'ko' | 'en' = 'ko'): CrossConfidenceResult {
  const sStrength = clamp01(input.sajuStrength)
  const aStrength = clamp01(input.astroStrength)
  const sDir = input.sajuDirection || 'neutral'
  const aDir = input.astroDirection || 'neutral'

  // 방향 충돌
  if (sDir !== 'neutral' && aDir !== 'neutral' && sDir !== aDir) {
    const conflictScore = Math.round((sStrength + aStrength) * 50)
    return {
      scorePercent: conflictScore,
      band: 'conflict',
      description:
        lang === 'ko'
          ? `두 시스템이 서로 다른 방향을 가리키고 있어요 (강도 ${conflictScore}%). 한쪽만 따라 결정하기 전에 두 신호를 같이 점검해 보세요.`
          : `The two systems point in different directions (strength ${conflictScore}%). Cross-check both before relying on one alone.`,
    }
  }

  // 같은 방향 (혹은 한쪽 neutral) — 평균 강도로 계산
  // 둘 다 강함이면 가산 효과 (geometric mean × 1.1)
  let score: number
  if (sDir !== 'neutral' && aDir !== 'neutral') {
    score = Math.sqrt(sStrength * aStrength) * 1.1
  } else {
    score = (sStrength + aStrength) / 2
  }
  score = Math.min(1, score)
  const scorePercent = Math.round(score * 100)

  let band: 'high' | 'medium' | 'low'
  if (scorePercent >= 75) band = 'high'
  else if (scorePercent >= 50) band = 'medium'
  else band = 'low'

  const description =
    lang === 'ko'
      ? band === 'high'
        ? `두 시스템이 같은 방향을 강하게 가리키는 합의 신호예요 (강도 ${scorePercent}%). 결정에 가속이 잘 붙는 시점입니다.`
        : band === 'medium'
          ? `두 시스템이 같은 방향을 가리키지만 강도가 중간이에요 (${scorePercent}%). 한 시스템에 의존하기보다 두 방향을 같이 보고 가는 편이 안전해요.`
          : `두 시스템 모두 약한 신호예요 (${scorePercent}%). 큰 결정보다 일상 흐름 정도로 받아들이는 편이 맞습니다.`
      : band === 'high'
        ? `Both systems strongly agree on direction (${scorePercent}%). Decisions tend to gain momentum.`
        : band === 'medium'
          ? `The two systems agree in direction but at moderate strength (${scorePercent}%). Cross-check both rather than rely on one.`
          : `Both signals are weak (${scorePercent}%). Treat as background flow rather than decision driver.`

  return { scorePercent, band, description }
}

function clamp01(n: number | undefined): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/**
 * 사주 신호 강도 — 본명 일간 vs 시기 element 조합으로 추정.
 * 십신 관계 (비겁/식상/재성/관성/인성)와 dominant element 매칭으로.
 */
export function estimateSajuSignalStrength(input: {
  natalElement?: string
  cycleElement?: string
  shinsalActive?: number // 활성 신살 개수
  hasGeokguk?: boolean
}): { strength: number; direction: SignalDirection } {
  const SEQ = ['목', '화', '토', '금', '수']
  const ni = input.natalElement ? SEQ.indexOf(input.natalElement) : -1
  const ci = input.cycleElement ? SEQ.indexOf(input.cycleElement) : -1
  if (ni < 0 || ci < 0) return { strength: 0.3, direction: 'neutral' }
  const diff = (ci - ni + 5) % 5
  // diff: 0=비겁(중립) 1=식상(flow) 2=재성(flow) 3=관성(caution) 4=인성(flow)
  let direction: SignalDirection = 'neutral'
  let baseStrength = 0.5
  if (diff === 0) {
    direction = 'neutral'
    baseStrength = 0.6
  } else if (diff === 3) {
    direction = 'caution'
    baseStrength = 0.7
  } else {
    direction = 'flow'
    baseStrength = 0.6
  }
  // 신살 활성 개수 + 격국 유무로 보정
  const shinsalBoost = Math.min(0.2, (input.shinsalActive || 0) * 0.04)
  const geokgukBoost = input.hasGeokguk ? 0.1 : 0
  return { strength: Math.min(1, baseStrength + shinsalBoost + geokgukBoost), direction }
}

/**
 * 점성 신호 강도 — 활성 트랜짓·어스펙트 카운트로 추정.
 */
export function estimateAstroSignalStrength(input: {
  activeTransitsCount?: number
  tenseAspectsCount?: number // square/opposition
  flowAspectsCount?: number // trine/sextile
  hasAdvancedSignals?: boolean // Solar/Lunar Return / Eclipses
}): { strength: number; direction: SignalDirection } {
  const tense = input.tenseAspectsCount || 0
  const flow = input.flowAspectsCount || 0
  const transits = input.activeTransitsCount || 0
  const advanced = input.hasAdvancedSignals ? 1 : 0

  // 우세 방향
  let direction: SignalDirection = 'neutral'
  if (tense > flow + 1) direction = 'caution'
  else if (flow > tense + 1) direction = 'flow'

  // 강도: aspect + transit + advanced 합산 (각각 가중치)
  const aspectScore = Math.min(0.5, (tense + flow) * 0.06)
  const transitScore = Math.min(0.3, transits * 0.1)
  const advancedScore = Math.min(0.2, advanced * 0.2)
  const baseStrength = 0.3
  return {
    strength: Math.min(1, baseStrength + aspectScore + transitScore + advancedScore),
    direction,
  }
}
