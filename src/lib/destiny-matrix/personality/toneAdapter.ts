/**
 * 출력 톤 개인화 — 같은 advice를 사용자 인격에 맞춰 어조 변형.
 *
 * AI 합성 없이 deterministic 변환:
 *   - prefix/suffix 추가
 *   - 연결사 변경 (그리고 → 따라서, ~해보세요 → ~하시면 됩니다)
 *   - 정량화 추가 (T-type일 때 "신뢰도 78%" 등)
 *   - 강도 조절 (Neuroticism 높으면 부드럽게)
 */

import type { PersonalityProfile } from './personalityProfile'

export type ToneOptions = {
  /** 추가 컨텍스트 — 정량 표현에 쓸 cross 정합도 */
  crossAgreementPercent?: number
  /** 추가 컨텍스트 — 도메인 (커리어 / 관계 등) */
  domainLabel?: string
}

// ─────────────────────────────────────────────────────────
// 톤 카테고리: MBTI 4축으로 정의
// ─────────────────────────────────────────────────────────

export type ToneCategory =
  | 'logicalAnalyst'    // NT (INTJ/INTP/ENTJ/ENTP) — 데이터·구조 우선
  | 'visionaryEmpath'   // NF (INFJ/INFP/ENFJ/ENFP) — 의미·진정성 우선
  | 'practicalSteward'  // SJ (ISTJ/ISFJ/ESTJ/ESFJ) — 절차·체계 우선
  | 'spontaneousDoer'   // SP (ISTP/ISFP/ESTP/ESFP) — 즉각·행동 우선

export function pickToneCategory(profile: PersonalityProfile): ToneCategory {
  const t = profile.mbti.type
  const isN = t.includes('N')
  const isT = t.includes('T')
  if (isN && isT) return 'logicalAnalyst'
  if (isN && !isT) return 'visionaryEmpath'
  if (!isN && t.includes('J')) return 'practicalSteward'
  return 'spontaneousDoer'
}

// ─────────────────────────────────────────────────────────
// 톤별 prefix · 연결사 · 종결어
// ─────────────────────────────────────────────────────────

const PREFIX_BY_TONE: Record<ToneCategory, string[]> = {
  logicalAnalyst: [
    '데이터로 보면',
    '근거를 정리하면',
    '신호를 분석하면',
    '구조적으로 보면',
  ],
  visionaryEmpath: [
    '큰 그림에서 보면',
    '본질적으로는',
    '의미를 짚어보면',
    '깊이 보면',
  ],
  practicalSteward: [
    '실무적으로 보면',
    '단계별로 보면',
    '절차로 정리하면',
    '체크리스트로 보면',
  ],
  spontaneousDoer: [
    '핵심만 보면',
    '바로 정리하면',
    '결론부터 말하면',
    '한 줄로 보면',
  ],
}

const SUFFIX_BY_TONE: Record<ToneCategory, string[]> = {
  logicalAnalyst: [
    '결정 전 검증 한 번 권장합니다.',
    '근거 기록해두면 추적 쉬워집니다.',
    '확정 전에 반대 근거 1개 확인하세요.',
  ],
  visionaryEmpath: [
    '내면이 가리키는 방향과 맞춰 보세요.',
    '진심이 어디 있는지 한 번 더 들여다보세요.',
    '큰 의미와 연결되는지 확인하세요.',
  ],
  practicalSteward: [
    '1단계·2단계로 나눠 진행하세요.',
    '체크리스트로 점검하면 안전합니다.',
    '기존 절차에 맞춰 차근차근 진행하세요.',
  ],
  spontaneousDoer: [
    '오늘 안에 첫 액션 한 가지만 잡으세요.',
    '복잡하게 가지 말고 바로 시도해보세요.',
    '한 발만 내디뎌 보세요.',
  ],
}

// 종결어 변환: "~해보세요" → tone별
const CLOSING_TRANSFORM: Record<ToneCategory, (text: string) => string> = {
  logicalAnalyst: (t) =>
    t
      .replace(/(?<=[가-힣])해보세요\.?$/g, '시도하시면 됩니다.')
      .replace(/(?<=[가-힣])하세요\.?$/g, '진행하시면 됩니다.'),
  visionaryEmpath: (t) =>
    t
      .replace(/(?<=[가-힣])하세요\.?$/g, '하시면 더 자연스러워요.'),
  practicalSteward: (t) =>
    t
      .replace(/(?<=[가-힣])하세요\.?$/g, '단계별로 처리하세요.'),
  spontaneousDoer: (t) =>
    t
      .replace(/(?<=[가-힣])진행하세요\.?$/g, '바로 시작하세요.')
      .replace(/(?<=[가-힣])정리하세요\.?$/g, '오늘 안에 정리하세요.'),
}

// ─────────────────────────────────────────────────────────
// Big Five 기반 강도 조절
// ─────────────────────────────────────────────────────────

function adjustForNeuroticism(text: string, neuroticism: number): string {
  // 높은 neuroticism: 강한 경고 단어를 부드럽게
  if (neuroticism >= 70) {
    return text
      .replace(/위험합니다/g, '주의가 필요합니다')
      .replace(/금지/g, '미루는 게 좋아요')
      .replace(/하지 마세요/g, '한 번 더 보고 결정하세요')
  }
  return text
}

function adjustForAgreeableness(text: string, agreeableness: number): string {
  // 낮은 agreeableness: 직설적으로 (모호한 권유 → 단정)
  if (agreeableness <= 35) {
    return text
      .replace(/~?하시는 편이 좋습니다/g, '하세요')
      .replace(/~?하시면 좋습니다/g, '하세요')
      .replace(/권장합니다/g, '필요합니다')
  }
  // 높은 agreeableness: 협력적 어투
  if (agreeableness >= 70) {
    return text
      .replace(/하세요\./g, '하시면 좋아요.')
      .replace(/필요합니다\./g, '필요해요.')
  }
  return text
}

function adjustForConscientiousness(text: string, conscientiousness: number): string {
  // 높은 conscientiousness: 체계 단어 추가
  if (conscientiousness >= 70 && !/체계|단계|절차|체크/.test(text)) {
    return text + ' (체계적으로 단계 잡고 진행 권장)'
  }
  return text
}

// ─────────────────────────────────────────────────────────
// 메인: advice 한 줄을 tone에 맞춰 변형
// ─────────────────────────────────────────────────────────

/**
 * 한 줄 advice를 사용자 인격에 맞춰 변형.
 * - tone category: MBTI 4축으로 결정 (logicalAnalyst/visionaryEmpath/practicalSteward/spontaneousDoer)
 * - 강도 조절: Big Five (Neuroticism, Agreeableness, Conscientiousness)
 * - 정량화: 컨텍스트의 cross 정합도 등
 */
export function adaptAdviceTone(
  advice: string,
  profile: PersonalityProfile,
  options: ToneOptions = {}
): string {
  if (!advice || advice.trim().length === 0) return ''

  const tone = pickToneCategory(profile)

  // 1) Big Five 강도 조절
  let out = advice
  out = adjustForNeuroticism(out, profile.bigFive.neuroticism)
  out = adjustForAgreeableness(out, profile.bigFive.agreeableness)
  out = adjustForConscientiousness(out, profile.bigFive.conscientiousness)

  // 2) 종결어 변환
  out = CLOSING_TRANSFORM[tone](out)

  // 3) prefix 추가 (advice 첫 글자 기반 deterministic 선택)
  const prefixes = PREFIX_BY_TONE[tone]
  const seed = advice.charCodeAt(0) || 0
  const prefix = prefixes[seed % prefixes.length]

  // 4) 정량화 — logicalAnalyst만, 컨텍스트 있을 때
  let prefixWithData = prefix
  if (tone === 'logicalAnalyst' && typeof options.crossAgreementPercent === 'number') {
    prefixWithData = `${prefix} (사주↔점성 정합 ${options.crossAgreementPercent}%)`
  }

  // 5) suffix 추가
  const suffixes = SUFFIX_BY_TONE[tone]
  const suffix = suffixes[(seed + 7) % suffixes.length]

  return `${prefixWithData}, ${out} ${suffix}`
}

/**
 * 여러 advice를 한 번에 변환.
 */
export function adaptAdviceListTone(
  adviceList: string[],
  profile: PersonalityProfile,
  options: ToneOptions = {}
): string[] {
  return adviceList.filter(Boolean).map((a) => adaptAdviceTone(a, profile, options))
}
