import type { DomainKey } from '@/lib/destiny-matrix/types'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'

export type CounselorEmotionalTone =
  | 'steady'
  | 'anxious'
  | 'urgent'
  | 'conflicted'
  | 'hopeful'
  | 'heavy'

export type CounselorFrame =
  | 'relationship_repair'
  | 'career_decision'
  | 'wealth_planning'
  | 'health_recovery'
  | 'timing_window'
  | 'identity_reflection'
  | 'open_counseling'

export interface CounselorQuestionAnalysis {
  primaryDomain: InsightDomain
  secondaryDomains: InsightDomain[]
  emotionalTone: CounselorEmotionalTone
  frame: CounselorFrame
  isDecisionQuestion: boolean
  needsTimingGuidance: boolean
  confidence: 'high' | 'medium' | 'low'
}

const DOMAIN_PATTERNS: Array<{ domain: InsightDomain; patterns: RegExp[] }> = [
  {
    domain: 'relationship',
    patterns: [
      /love|relationship|partner|dating|marriage|spouse|boyfriend|girlfriend|ex|reconcile|crush/i,
      /연애|사랑|관계|상대|재회|결혼|이혼|배우자|부부|썸|남친|여친|호감|가족|부모|자녀|형제|갈등/i,
    ],
  },
  {
    domain: 'career',
    patterns: [
      /career|job|work|business|promotion|interview|company|boss|coworker|startup|project|quit|resign/i,
      /직업|직장|커리어|이직|회사|승진|면접|사업|창업|상사|동료|프로젝트|업무|퇴사/i,
    ],
  },
  {
    domain: 'wealth',
    patterns: [
      /money|finance|income|salary|investment|stock|debt|loan|budget|asset|real estate/i,
      /돈|재정|투자|주식|연봉|수입|빚|대출|예산|저축|자산|부동산|매출/i,
    ],
  },
  {
    domain: 'health',
    patterns: [
      /health|body|sleep|stress|burnout|diet|exercise|recovery|anxiety|panic|sick/i,
      /건강|몸|수면|스트레스|번아웃|식단|운동|회복|불안|우울|아프|컨디션/i,
    ],
  },
  {
    domain: 'timing',
    patterns: [
      /when|timing|date|month|year|week|today|tomorrow|soon|later|schedule|window/i,
      /언제|시기|타이밍|날짜|이번.?주|이번.?달|올해|내년|오늘|곧|나중|시점/i,
    ],
  },
  {
    domain: 'spirituality',
    patterns: [
      /purpose|meaning|soul|calling|healing journey|shadow work|inner child/i,
      /의미|소명|영성|영혼|치유|그림자|내면아이|각성|명상/i,
    ],
  },
]

const DOMAIN_THEME_MAP: Record<InsightDomain, string> = {
  personality: 'chat',
  career: 'career',
  relationship: 'love',
  wealth: 'wealth',
  health: 'health',
  spirituality: 'life',
  timing: 'life',
}

const LAYER_DOMAIN_MAP: Partial<Record<InsightDomain, DomainKey>> = {
  career: 'career',
  relationship: 'love',
  wealth: 'money',
  health: 'health',
  timing: 'move',
  spirituality: 'move',
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => {
    const matches = text.match(pattern)
    return total + (matches ? matches.length : 0)
  }, 0)
}

function domainBonus(domain: InsightDomain, text: string): number {
  if (
    domain === 'career' &&
    /(job|career|work|resign|quit|promotion|interview|이직|퇴사|회사)/i.test(text)
  ) {
    return 0.75
  }
  if (
    domain === 'relationship' &&
    /(love|relationship|partner|marriage|reconcile|연애|재회|상대|썸)/i.test(text)
  ) {
    return 0.45
  }
  if (
    domain === 'timing' &&
    /(when|timing|month|year|window|언제|시기|타이밍|올해|내년)/i.test(text)
  ) {
    return 0.6
  }
  return 0
}

export function inferCounselorFocusDomain(input: {
  lastUserMessage?: string | null
  theme?: string | null
}): InsightDomain {
  const text = (input.lastUserMessage || '').trim()
  if (!text) {
    return input.theme === 'health'
      ? 'health'
      : input.theme === 'career'
        ? 'career'
        : input.theme === 'wealth'
          ? 'wealth'
          : input.theme === 'love' || input.theme === 'family'
            ? 'relationship'
            : 'personality'
  }

  const lowered = text.toLowerCase()
  const scores = DOMAIN_PATTERNS.map(({ domain, patterns }) => ({
    domain,
    score: countMatches(lowered, patterns) + domainBonus(domain, text),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    return 'personality'
  }

  return scores[0].domain
}

function inferSecondaryDomains(text: string, primaryDomain: InsightDomain): InsightDomain[] {
  const lowered = text.toLowerCase()
  return DOMAIN_PATTERNS.map(({ domain, patterns }) => ({
    domain,
    score: countMatches(lowered, patterns),
  }))
    .filter((item) => item.domain !== primaryDomain && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.domain)
}

function inferEmotionalTone(text: string): CounselorEmotionalTone {
  if (/불안|무섭|panic|anxious|scared|걱정|초조|두려/i.test(text)) return 'anxious'
  if (/빨리|당장|urgent|asap|immediately|곧 결정|마감/i.test(text)) return 'urgent'
  if (/헷갈|confused|갈팡질팡|모르겠|둘 중|A or B|vs/i.test(text)) return 'conflicted'
  if (/기대|희망|hope|optimistic|잘될까|가능성/i.test(text)) return 'hopeful'
  if (/지쳤|heavy|힘들|burnout|우울|exhaust/i.test(text)) return 'heavy'
  return 'steady'
}

function inferFrame(input: {
  primaryDomain: InsightDomain
  text: string
  needsTimingGuidance: boolean
  isDecisionQuestion: boolean
}): CounselorFrame {
  if (input.needsTimingGuidance) return 'timing_window'
  if (input.primaryDomain === 'relationship') return 'relationship_repair'
  if (input.primaryDomain === 'career' && input.isDecisionQuestion) return 'career_decision'
  if (input.primaryDomain === 'wealth') return 'wealth_planning'
  if (input.primaryDomain === 'health') return 'health_recovery'
  if (input.primaryDomain === 'personality' || input.primaryDomain === 'spirituality') {
    return /who am i|나는 어떤 사람|방향|meaning|purpose|정체성/i.test(input.text)
      ? 'identity_reflection'
      : 'open_counseling'
  }
  return 'open_counseling'
}

export function analyzeCounselorQuestion(input: {
  lastUserMessage?: string | null
  theme?: string | null
}): CounselorQuestionAnalysis {
  const text = (input.lastUserMessage || '').trim()
  const primaryDomain = inferCounselorFocusDomain(input)
  const secondaryDomains = text ? inferSecondaryDomains(text, primaryDomain) : []
  const emotionalTone = inferEmotionalTone(text)
  const isDecisionQuestion =
    /할까|말까|할지|should i|do i|갈까|옮길까|결정|choose|which|whether/i.test(text)
  const needsTimingGuidance =
    primaryDomain === 'timing' || /언제|시기|timing|when|month|year|이번|올해|내년/i.test(text)
  const frame = inferFrame({ primaryDomain, text, needsTimingGuidance, isDecisionQuestion })
  const signalCount =
    1 + secondaryDomains.length + Number(isDecisionQuestion) + Number(needsTimingGuidance)
  const confidence: CounselorQuestionAnalysis['confidence'] =
    signalCount >= 3 ? 'high' : signalCount >= 2 ? 'medium' : 'low'

  return {
    primaryDomain,
    secondaryDomains,
    emotionalTone,
    frame,
    isDecisionQuestion,
    needsTimingGuidance,
    confidence,
  }
}

export function mapFocusDomainToTheme(focusDomain: InsightDomain): string {
  return DOMAIN_THEME_MAP[focusDomain] || 'chat'
}

export interface CounselorStorageSignals {
  analysis: CounselorQuestionAnalysis
  inferredTheme: string
  memoryTopics: string[]
}

export function deriveCounselorStorageSignals(input: {
  lastUserMessage?: string | null
  theme?: string | null
  keyTopics?: string[] | null
}): CounselorStorageSignals {
  const analysis = analyzeCounselorQuestion({
    lastUserMessage: input.lastUserMessage,
    theme: input.theme,
  })
  const inferredTheme = mapFocusDomainToTheme(analysis.primaryDomain)
  const memoryTopics = Array.from(
    new Set([
      analysis.primaryDomain,
      ...analysis.secondaryDomains,
      ...((input.keyTopics || []).filter(Boolean) as string[]),
    ])
  ).slice(0, 6)

  return {
    analysis,
    inferredTheme,
    memoryTopics,
  }
}

export function mapFocusDomainToLayerDomain(focusDomain: InsightDomain): DomainKey | null {
  return LAYER_DOMAIN_MAP[focusDomain] || null
}

export function describeFocusDomain(focusDomain: InsightDomain, lang: 'ko' | 'en'): string {
  const labels: Record<InsightDomain, { ko: string; en: string }> = {
    personality: { ko: '성향/종합 흐름', en: 'personality / overall flow' },
    career: { ko: '커리어/일', en: 'career / work' },
    relationship: { ko: '관계/연애', en: 'relationships / love' },
    wealth: { ko: '재정/돈', en: 'money / finances' },
    health: { ko: '건강/회복', en: 'health / recovery' },
    spirituality: { ko: '내면/성장', en: 'inner growth / spirituality' },
    timing: { ko: '시기/타이밍', en: 'timing / decision window' },
  }
  return labels[focusDomain]?.[lang] || labels.personality[lang]
}

export function describeQuestionAnalysis(
  analysis: CounselorQuestionAnalysis,
  lang: 'ko' | 'en'
): string {
  const frameLabels: Record<CounselorFrame, { ko: string; en: string }> = {
    relationship_repair: { ko: '관계 회복형', en: 'relationship repair' },
    career_decision: { ko: '커리어 결정형', en: 'career decision' },
    wealth_planning: { ko: '재정 계획형', en: 'wealth planning' },
    health_recovery: { ko: '회복 조정형', en: 'health recovery' },
    timing_window: { ko: '타이밍 판단형', en: 'timing window' },
    identity_reflection: { ko: '자기 이해형', en: 'identity reflection' },
    open_counseling: { ko: '열린 상담형', en: 'open counseling' },
  }
  const toneLabels: Record<CounselorEmotionalTone, { ko: string; en: string }> = {
    steady: { ko: '차분함', en: 'steady' },
    anxious: { ko: '불안', en: 'anxious' },
    urgent: { ko: '급함', en: 'urgent' },
    conflicted: { ko: '갈등', en: 'conflicted' },
    hopeful: { ko: '기대', en: 'hopeful' },
    heavy: { ko: '무거움', en: 'heavy' },
  }
  const secondary =
    analysis.secondaryDomains.length > 0
      ? analysis.secondaryDomains.map((domain) => describeFocusDomain(domain, lang)).join(', ')
      : lang === 'ko'
        ? '없음'
        : 'none'

  if (lang === 'ko') {
    return [
      '[Question Analysis]',
      `- primary_domain: ${describeFocusDomain(analysis.primaryDomain, lang)}`,
      `- secondary_domains: ${secondary}`,
      `- frame: ${frameLabels[analysis.frame].ko}`,
      `- emotional_tone: ${toneLabels[analysis.emotionalTone].ko}`,
      `- decision_question: ${analysis.isDecisionQuestion ? 'yes' : 'no'}`,
      `- timing_needed: ${analysis.needsTimingGuidance ? 'yes' : 'no'}`,
      `- confidence: ${analysis.confidence}`,
    ].join('\n')
  }

  return [
    '[Question Analysis]',
    `- primary_domain: ${describeFocusDomain(analysis.primaryDomain, lang)}`,
    `- secondary_domains: ${secondary}`,
    `- frame: ${frameLabels[analysis.frame].en}`,
    `- emotional_tone: ${toneLabels[analysis.emotionalTone].en}`,
    `- decision_question: ${analysis.isDecisionQuestion ? 'yes' : 'no'}`,
    `- timing_needed: ${analysis.needsTimingGuidance ? 'yes' : 'no'}`,
    `- confidence: ${analysis.confidence}`,
  ].join('\n')
}

export function buildCounselingStructureGuide(
  analysis: CounselorQuestionAnalysis,
  lang: 'ko' | 'en'
): string {
  const line =
    lang === 'ko'
      ? {
          relationship_repair:
            '- 문단 순서: 현재 거리감 -> 막힌 이유 -> 다시 이어질 조건 -> 바로 할 행동.',
          career_decision:
            '- 문단 순서: 선택지 핵심 -> 리스크 비교 -> 지금 움직일지 여부 -> 실행 체크포인트.',
          wealth_planning:
            '- 문단 순서: 현재 재정 흐름 -> 새는 지점 -> 보수적 실행안 -> 확인할 수치.',
          health_recovery:
            '- 문단 순서: 현재 컨디션 -> 과부하 신호 -> 회복 루틴 -> 전문 도움 필요 여부.',
          timing_window:
            '- 문단 순서: 지금 해도 되는지 -> 가장 좋은 시점 -> 미뤄야 하는 조건 -> 다음 확인 날짜.',
          identity_reflection:
            '- 문단 순서: 핵심 성향 -> 반복 패턴 -> 강점/약점 -> 방향 제안.',
          open_counseling:
            '- 문단 순서: 질문 직접 답변 -> 핵심 근거 -> 현실적 행동 -> 재확인 포인트.',
        }[analysis.frame]
      : {
          relationship_repair:
            '- Paragraph order: current distance -> blockage -> repair conditions -> immediate action.',
          career_decision:
            '- Paragraph order: main options -> risk comparison -> move now or wait -> execution checkpoints.',
          wealth_planning:
            '- Paragraph order: current flow -> leakage -> conservative plan -> metrics to verify.',
          health_recovery:
            '- Paragraph order: present condition -> overload signs -> recovery routine -> when to seek help.',
          timing_window:
            '- Paragraph order: move now or wait -> best window -> delay conditions -> next review date.',
          identity_reflection:
            '- Paragraph order: core nature -> repeated pattern -> strengths/limits -> direction.',
          open_counseling:
            '- Paragraph order: direct answer -> grounded evidence -> realistic action -> recheck point.',
        }[analysis.frame]

  return lang === 'ko'
    ? ['[Counseling Structure]', line, '- 사용자의 감정 톤을 반영하되 과장하지 말 것.'].join('\n')
    : ['[Counseling Structure]', line, '- Reflect the emotional tone without exaggeration.'].join('\n')
}
