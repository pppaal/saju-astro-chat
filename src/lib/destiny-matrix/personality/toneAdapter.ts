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
  // 높은 conscientiousness만 — text에 체계 단어가 없을 때만 (이미 있으면 중복)
  if (conscientiousness >= 70 && !/체계|단계|절차|체크|순서|기록|점검/.test(text)) {
    return text + ' (단계 정리하고 진행 권장)'
  }
  return text
}

// 다양한 seed 생성 — char sum + length로 보다 균등 분포
function stableSeed(text: string): number {
  let sum = 0
  for (let i = 0; i < text.length; i++) sum = (sum + text.charCodeAt(i)) % 997
  return sum + text.length
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

  // 3) prefix · suffix 다양화 — advice 본문 content seed로 풀에서 분산 선택
  const seed = stableSeed(advice)
  const prefixes = PREFIX_BY_TONE[tone]
  const prefix = prefixes[seed % prefixes.length]
  const suffixes = SUFFIX_BY_TONE[tone]
  const suffix = suffixes[(seed * 13 + 5) % suffixes.length]

  // 4) 정량화 — logicalAnalyst만, 컨텍스트 있을 때, 그리고 짝수 seed에만 (50% 확률)
  //    매번 정량 표시면 단조롭고 길어짐
  let prefixFull = prefix
  if (
    tone === 'logicalAnalyst' &&
    typeof options.crossAgreementPercent === 'number' &&
    seed % 2 === 0
  ) {
    prefixFull = `${prefix} (정합 ${options.crossAgreementPercent}%)`
  }

  return `${prefixFull}, ${out} ${suffix}`
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
