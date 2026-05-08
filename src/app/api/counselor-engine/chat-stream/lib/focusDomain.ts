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
  | 'relationship_commitment'
  | 'career_decision'
  | 'wealth_planning'
  | 'health_recovery'
  | 'move_lease'
  | 'move_relocation'
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

type DomainPattern = {
  domain: InsightDomain
  patterns: RegExp[]
}

function regex(source: string): RegExp {
  return new RegExp(source, 'i')
}

const DOMAIN_PATTERNS: DomainPattern[] = [
  {
    domain: 'relationship',
    patterns: [
      regex(
        [
          'love',
          'relationship',
          'partner',
          'dating',
          'marriage',
          'spouse',
          'boyfriend',
          'girlfriend',
          'reconcile',
          'commitment',
          '\\uC5F0\\uC560',
          '\\uAD00\\uACC4',
          '\\uC7AC\\uD68C',
          '\\uACB0\\uD63C',
          '\\uBC30\\uC6B0\\uC790',
          '\\uC0AC\\uB791',
          '\\uC2A4\\uD3EC\\uC2A4',
          '\\uB0A8\\uCE5C',
          '\\uC5EC\\uCE5C',
          '\\uC368',
        ].join('|')
      ),
    ],
  },
  {
    domain: 'career',
    patterns: [
      regex(
        [
          'career',
          'job',
          'work',
          'business',
          'promotion',
          'interview',
          'company',
          'coworker',
          'startup',
          'project',
          'quit',
          'resign',
          'offer',
          '\\uCEE4\\uB9AC\\uC5B4',
          '\\uC9C1\\uC7A5',
          '\\uC774\\uC9C1',
          '\\uCDE8\\uC5C5',
          '\\uD1F4\\uC0AC',
          '\\uC2B9\\uC9C4',
          '\\uBA74\\uC811',
          '\\uD68C\\uC0AC',
          '\\uC5C5\\uBB34',
          '\\uCC3D\\uC5C5',
        ].join('|')
      ),
    ],
  },
  {
    domain: 'wealth',
    patterns: [
      regex(
        [
          'money',
          'finance',
          'income',
          'salary',
          'investment',
          'stock',
          'debt',
          'loan',
          'budget',
          'asset',
          'deposit',
          '\\uB3C8',
          '\\uC7AC\\uC815',
          '\\uC218\\uC785',
          '\\uAE09\\uC5EC',
          '\\uD22C\\uC790',
          '\\uC8FC\\uC2DD',
          '\\uBE5A',
          '\\uB300\\uCD9C',
          '\\uC790\\uC0B0',
          '\\uBCF4\\uC99D\\uAE08',
          '\\uC608\\uC0B0',
        ].join('|')
      ),
    ],
  },
  {
    domain: 'health',
    patterns: [
      regex(
        [
          'health',
          'body',
          'sleep',
          'stress',
          'burnout',
          'diet',
          'exercise',
          'recovery',
          'anxiety',
          'panic',
          'sick',
          '\\uAC74\\uAC15',
          '\\uBAB8',
          '\\uC218\\uBA74',
          '\\uC2A4\\uD2B8\\uB808\\uC2A4',
          '\\uBC88\\uC544\\uC6C3',
          '\\uC2DD\\uC0AC',
          '\\uC6B4\\uB3D9',
          '\\uD68C\\uBCF5',
          '\\uBD88\\uC548',
          '\\uACF5\\uD669',
          '\\uD53C\\uB85C',
        ].join('|')
      ),
    ],
  },
  {
    domain: 'timing',
    patterns: [
      regex(
        [
          'when',
          'timing',
          'date',
          'month',
          'year',
          'week',
          'today',
          'tomorrow',
          'soon',
          'later',
          'window',
          '\\uC5B8\\uC81C',
          '\\uD0C0\\uC774\\uBC0D',
          '\\uC2DC\\uAE30',
          '\\uC774\\uBC88 \\uB2EC',
          '\\uB2E4\\uC74C \\uB2EC',
          '\\uC5B4\\uB298',
          '\\uB0B4\\uC77C',
          '\\uC62C\\uD574',
          '\\uB0B4\\uB144',
        ].join('|')
      ),
    ],
  },
  {
    domain: 'spirituality',
    patterns: [
      regex(
        [
          'purpose',
          'meaning',
          'soul',
          'calling',
          'healing',
          'inner child',
          '\\uC758\\uBBF8',
          '\\uC0B6',
          '\\uC18C\\uBA85',
          '\\uC815\\uCCB4\\uC131',
          '\\uB0B4\\uBA74',
          '\\uC131\\uC7A5',
          '\\uD790\\uB9C1',
        ].join('|')
      ),
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
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0)
}

function domainBonus(domain: InsightDomain, text: string): number {
  if (
    domain === 'career' &&
    /(job|career|work|promotion|interview|quit|resign|\uC774\uC9C1|\uCDE8\uC5C5|\uD1F4\uC0AC|\uC2B9\uC9C4)/i.test(
      text
    )
  ) {
    return 0.75
  }

  if (
    domain === 'relationship' &&
    /(love|relationship|partner|marriage|spouse|reconcile|\uC5F0\uC560|\uAD00\uACC4|\uC7AC\uD68C|\uACB0\uD63C|\uBC30\uC6B0\uC790)/i.test(
      text
    )
  ) {
    return 0.55
  }

  if (
    domain === 'wealth' &&
    /(money|finance|salary|debt|loan|deposit|\uB3C8|\uC7AC\uC815|\uAE09\uC5EC|\uBE5A|\uB300\uCD9C|\uBCF4\uC99D\uAE08)/i.test(
      text
    )
  ) {
    return 0.5
  }

  if (
    domain === 'health' &&
    /(health|sleep|stress|burnout|recovery|\uAC74\uAC15|\uC218\uBA74|\uC2A4\uD2B8\uB808\uC2A4|\uBC88\uC544\uC6C3|\uD68C\uBCF5)/i.test(
      text
    )
  ) {
    return 0.5
  }

  if (
    domain === 'timing' &&
    /(when|timing|month|year|window|\uC5B8\uC81C|\uD0C0\uC774\uBC0D|\uC2DC\uAE30|\uC774\uBC88 \uB2EC|\uC62C\uD574)/i.test(
      text
    )
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

  const scores = DOMAIN_PATTERNS.map(({ domain, patterns }) => ({
    domain,
    score: countMatches(text, patterns) + domainBonus(domain, text),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scores[0]?.domain || 'personality'
}

function inferSecondaryDomains(text: string, primaryDomain: InsightDomain): InsightDomain[] {
  return DOMAIN_PATTERNS.map(({ domain, patterns }) => ({
    domain,
    score: countMatches(text, patterns),
  }))
    .filter((item) => item.domain !== primaryDomain && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.domain)
}

function inferEmotionalTone(text: string): CounselorEmotionalTone {
  if (
    /(panic|anxious|scared|terrified|\uBD88\uC548|\uCD08\uC870|\uB450\uB824\uC6C0|\uAC71\uC815)/i.test(
      text
    )
  ) {
    return 'anxious'
  }

  if (
    /(urgent|asap|immediately|right now|\uAE09\uD574|\uC2DC\uAE09|\uC9C0\uAE08 \uBC14\uB85C|\uB2F9\uC7A5)/i.test(
      text
    )
  ) {
    return 'urgent'
  }

  if (/(confused|torn|a or b|vs|\uD63C\uB780|\uACE0\uBBFC|\uC591\uC790\uD0DD\uC77C)/i.test(text)) {
    return 'conflicted'
  }

  if (/(hope|optimistic|\uD76C\uB9DD|\uAE30\uB300|\uB0A8\uC544 \uC788\uC744\uAE4C)/i.test(text)) {
    return 'hopeful'
  }

  if (
    /(heavy|burnout|exhaust|drained|\uBB34\uAC81|\uC9C0\uCE68|\uBC88\uC544\uC6C3|\uC18C\uC9C4)/i.test(
      text
    )
  ) {
    return 'heavy'
  }

  return 'steady'
}

function inferFrame(input: {
  primaryDomain: InsightDomain
  text: string
  needsTimingGuidance: boolean
  isDecisionQuestion: boolean
}): CounselorFrame {
  const hasCommitmentSignal =
    /(marriage|spouse|commitment|long[- ]term|settle down|future together|\uACB0\uD63C|\uBC30\uC6B0\uC790|\uC624\uB798 \uAC08 \uC0AC\uB78C|\uD3C9\uC0DD)/i.test(
      input.text
    )
  const hasLeaseSignal =
    /(lease|rent|deposit|landlord|housing contract|\uC804\uC138|\uC6D4\uC138|\uBCF4\uC99D\uAE08|\uACC4\uC57D|\uC784\uB300\uCC28)/i.test(
      input.text
    )
  const hasRelocationSignal =
    /(move|relocate|relocation|commute|base|basecamp|neighborhood|district|\uC774\uC0AC|\uC774\uB3D9|\uAC70\uC810|\uCD9C\uD1F4\uADFC|\uB3D9\uB124)/i.test(
      input.text
    )

  if (input.primaryDomain === 'relationship' && hasCommitmentSignal) {
    return 'relationship_commitment'
  }
  if (hasLeaseSignal) return 'move_lease'
  if (hasRelocationSignal) return 'move_relocation'
  if (input.needsTimingGuidance) return 'timing_window'
  if (input.primaryDomain === 'relationship') return 'relationship_repair'
  if (input.primaryDomain === 'career' && input.isDecisionQuestion) return 'career_decision'
  if (input.primaryDomain === 'wealth') return 'wealth_planning'
  if (input.primaryDomain === 'health') return 'health_recovery'
  if (input.primaryDomain === 'personality' || input.primaryDomain === 'spirituality') {
    return /(who am i|meaning|purpose|\uC800\uB294 \uC5B4\uB5A4 \uC0AC\uB78C|\uC815\uCCB4\uC131|\uC758\uBBF8|\uC0B6\uC758 \uBC29\uD5A5)/i.test(
      input.text
    )
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
    /(should i|do i|whether|which|choose|quit or stay|\uD574\uC57C \uD560\uAE4C|\uD574\uC57C \uD560\uC9C0|\uB9D0\uC544\uC57C \uD560\uAE4C|\uB9D0\uC544\uC57C \uD560\uC9C0|\uD574\uB3C4 \uB418\uB294\uC9C0|\uC120\uD0DD|\uACE0\uBBFC)/i.test(
      text
    )
  const needsTimingGuidance =
    primaryDomain === 'timing' ||
    /(when|timing|month|year|week|today|tomorrow|\uC5B8\uC81C|\uD0C0\uC774\uBC0D|\uC2DC\uAE30|\uC774\uBC88 \uB2EC|\uC62C\uD574|\uB0B4\uB144)/i.test(
      text
    )
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
    personality: { ko: '\uC778\uBB3C/\uC804\uCCB4 \uD750\uB984', en: 'personality / overall flow' },
    career: { ko: '\uCEE4\uB9AC\uC5B4/\uC77C', en: 'career / work' },
    relationship: { ko: '\uAD00\uACC4/\uC5F0\uC560', en: 'relationships / love' },
    wealth: { ko: '\uB3C8/\uC7AC\uC815', en: 'money / finances' },
    health: { ko: '\uAC74\uAC15/\uD68C\uBCF5', en: 'health / recovery' },
    spirituality: { ko: '\uB0B4\uBA74/\uC131\uC7A5', en: 'inner growth / spirituality' },
    timing: { ko: '\uD0C0\uC774\uBC0D/\uD310\uB2E8 \uC2DC\uAE30', en: 'timing / decision window' },
  }
  return labels[focusDomain]?.[lang] || labels.personality[lang]
}

export function describeQuestionAnalysis(
  analysis: CounselorQuestionAnalysis,
  lang: 'ko' | 'en'
): string {
  const frameLabels: Record<CounselorFrame, { ko: string; en: string }> = {
    relationship_repair: { ko: '\uAD00\uACC4 \uC815\uB82C', en: 'relationship repair' },
    relationship_commitment: { ko: '\uAD00\uACC4 \uD655\uC815', en: 'relationship commitment' },
    career_decision: { ko: '\uCEE4\uB9AC\uC5B4 \uD310\uB2E8', en: 'career decision' },
    wealth_planning: { ko: '\uC7AC\uC815 \uD310\uB2E8', en: 'wealth planning' },
    health_recovery: { ko: '\uD68C\uBCF5 \uD310\uB2E8', en: 'health recovery' },
    move_lease: { ko: '\uACC4\uC57D/\uAC70\uC8FC \uD310\uB2E8', en: 'lease and housing decision' },
    move_relocation: {
      ko: '\uC774\uB3D9/\uAC70\uC810 \uD310\uB2E8',
      en: 'relocation and base reset',
    },
    timing_window: { ko: '\uD0C0\uC774\uBC0D \uD310\uB2E8', en: 'timing window' },
    identity_reflection: { ko: '\uC778\uBB3C \uD574\uC11D', en: 'identity reflection' },
    open_counseling: { ko: '\uC0C1\uB2F4 \uD574\uC11D', en: 'open counseling' },
  }
  const toneLabels: Record<CounselorEmotionalTone, { ko: string; en: string }> = {
    steady: { ko: '\uC548\uC815', en: 'steady' },
    anxious: { ko: '\uBD88\uC548', en: 'anxious' },
    urgent: { ko: '\uAE09\uBC15', en: 'urgent' },
    conflicted: { ko: '\uD63C\uB780', en: 'conflicted' },
    hopeful: { ko: '\uAE30\uB300', en: 'hopeful' },
    heavy: { ko: '\uBB34\uAC70\uC6C0', en: 'heavy' },
  }
  const secondary =
    analysis.secondaryDomains.length > 0
      ? analysis.secondaryDomains.map((domain) => describeFocusDomain(domain, lang)).join(', ')
      : lang === 'ko'
        ? '\uC5C6\uC74C'
        : 'none'

  const lines =
    lang === 'ko'
      ? [
          '[Question Analysis]',
          `- primary_domain: ${describeFocusDomain(analysis.primaryDomain, lang)}`,
          `- secondary_domains: ${secondary}`,
          `- frame: ${frameLabels[analysis.frame].ko}`,
          `- emotional_tone: ${toneLabels[analysis.emotionalTone].ko}`,
          `- decision_question: ${analysis.isDecisionQuestion ? 'yes' : 'no'}`,
          `- timing_needed: ${analysis.needsTimingGuidance ? 'yes' : 'no'}`,
          `- confidence: ${analysis.confidence}`,
        ]
      : [
          '[Question Analysis]',
          `- primary_domain: ${describeFocusDomain(analysis.primaryDomain, lang)}`,
          `- secondary_domains: ${secondary}`,
          `- frame: ${frameLabels[analysis.frame].en}`,
          `- emotional_tone: ${toneLabels[analysis.emotionalTone].en}`,
          `- decision_question: ${analysis.isDecisionQuestion ? 'yes' : 'no'}`,
          `- timing_needed: ${analysis.needsTimingGuidance ? 'yes' : 'no'}`,
          `- confidence: ${analysis.confidence}`,
        ]

  return lines.join('\n')
}

export function buildCounselingStructureGuide(
  analysis: CounselorQuestionAnalysis,
  lang: 'ko' | 'en'
): string {
  const lineMap: Record<CounselorFrame, { ko: string; en: string }> = {
    relationship_repair: {
      ko: '- 문단 순서: 현재 거리감 -> 막히는 이유 -> 다시 맞춰야 할 조건 -> 지금 할 행동.',
      en: '- Paragraph order: current distance -> blockage -> repair conditions -> immediate action.',
    },
    relationship_commitment: {
      ko: '- 문단 순서: 상대 패턴 -> 관계 확정 조건 -> 깨지는 위험 -> 지금 확인할 기준.',
      en: '- Paragraph order: partner pattern -> commitment conditions -> break risks -> what to verify now.',
    },
    career_decision: {
      ko: '- 문단 순서: 선택지 정리 -> 리스크 비교 -> 지금 움직일지 보류할지 -> 실행 체크포인트.',
      en: '- Paragraph order: main options -> risk comparison -> move now or wait -> execution checkpoints.',
    },
    wealth_planning: {
      ko: '- 문단 순서: 현재 흐름 -> 누수 지점 -> 보수적 계획 -> 확인해야 할 지표.',
      en: '- Paragraph order: current flow -> leakage -> conservative plan -> metrics to verify.',
    },
    health_recovery: {
      ko: '- 문단 순서: 현재 상태 -> 과부하 신호 -> 회복 루틴 -> 멈춰야 할 기준.',
      en: '- Paragraph order: present condition -> overload signs -> recovery routine -> when to seek help.',
    },
    move_lease: {
      ko: '- 문단 순서: 계약 조건 -> 비용과 보증금 압박 -> 보류 조건 -> 지금 다시 볼 항목.',
      en: '- Paragraph order: lease conditions -> cost and deposit pressure -> hold conditions -> what to recheck now.',
    },
    move_relocation: {
      ko: '- 문단 순서: 현재 거점 -> 일과 회복에 미치는 영향 -> 이동 성립 조건 -> 거점 재정비 체크포인트.',
      en: '- Paragraph order: current base -> impact on work and recovery -> relocation conditions -> base reset checkpoints.',
    },
    timing_window: {
      ko: '- 문단 순서: 지금 움직일지 보류할지 -> 강한 창 -> 늦춰야 할 조건 -> 다음 점검 시점.',
      en: '- Paragraph order: move now or wait -> best window -> delay conditions -> next review date.',
    },
    identity_reflection: {
      ko: '- 문단 순서: 기본 구조 -> 반복 패턴 -> 강점과 한계 -> 앞으로의 방향.',
      en: '- Paragraph order: core nature -> repeated pattern -> strengths/limits -> direction.',
    },
    open_counseling: {
      ko: '- 문단 순서: 직접 답 -> 근거 -> 현실적인 행동 -> 다시 확인할 지점.',
      en: '- Paragraph order: direct answer -> grounded evidence -> realistic action -> recheck point.',
    },
  }

  return [
    '[Counseling Structure]',
    lineMap[analysis.frame][lang],
    lang === 'ko'
      ? '- 감정 톤은 반영하되 과장하지 않습니다.'
      : '- Reflect the emotional tone without exaggeration.',
  ].join('\n')
}
