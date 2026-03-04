import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport } from './reportTypes'
import type { SignalDomain, SignalSynthesisResult, SynthesizedClaim } from './signalSynthesizer'

interface NarrativeInput {
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  synthesis: SignalSynthesisResult
}

const SECTION_DOMAINS: Record<keyof AIPremiumReport['sections'], SignalDomain[]> = {
  introduction: ['personality', 'timing'],
  personalityDeep: ['personality'],
  careerPath: ['career', 'wealth'],
  relationshipDynamics: ['relationship'],
  wealthPotential: ['wealth', 'career'],
  healthGuidance: ['health'],
  lifeMission: ['spirituality', 'personality'],
  timingAdvice: ['timing', 'career', 'relationship'],
  actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
  conclusion: ['personality', 'timing'],
}

const SECTION_TITLE_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '핵심 흐름',
  personalityDeep: '성향 심층',
  careerPath: '커리어',
  relationshipDynamics: '관계',
  wealthPotential: '재정',
  healthGuidance: '건강',
  lifeMission: '장기 방향',
  timingAdvice: '시기 전략',
  actionPlan: '실행 계획',
  conclusion: '마무리',
}

const SECTION_LEAD_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '지금 구간의 핵심은',
  personalityDeep: '당신의 기본 패턴은',
  careerPath: '커리어에서는',
  relationshipDynamics: '관계에서는',
  wealthPotential: '재정 운영에서는',
  healthGuidance: '건강 리듬은',
  lifeMission: '장기 방향에서는',
  timingAdvice: '타이밍 관점에서는',
  actionPlan: '실행 설계에서는',
  conclusion: '최종 요약은',
}

const SECTION_SUPPORT_PREFIX_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '보완 관점에서는',
  personalityDeep: '내면 축에서는',
  careerPath: '실행 축에서는',
  relationshipDynamics: '조율 축에서는',
  wealthPotential: '리스크 축에서는',
  healthGuidance: '회복 축에서는',
  lifeMission: '장기 축에서는',
  timingAdvice: '운영 축에서는',
  actionPlan: '실무 축에서는',
  conclusion: '정리 축에서는',
}

const SECTION_ACTION_HINT_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '오늘은 우선순위 1개만 확정하고 나머지는 재확인 슬롯으로 분리하세요.',
  personalityDeep: '말투와 결정 속도를 한 단계 늦추면 불필요한 충돌 비용이 크게 줄어듭니다.',
  careerPath: '성과는 범위를 줄여 완결률을 높일 때 더 빠르게 누적됩니다.',
  relationshipDynamics: '중요 대화는 요약 한 줄을 먼저 확인받는 방식이 안정적입니다.',
  wealthPotential: '금액·기한·취소 조건 3가지는 당일 확정 전에 반드시 재확인하세요.',
  healthGuidance: '집중 작업 전후로 회복 루틴을 고정하면 퍼포먼스 편차를 줄일 수 있습니다.',
  lifeMission: '주간 기록과 복기 루틴이 장기 방향을 현실 성과로 연결해 줍니다.',
  timingAdvice: '결정과 실행 날짜를 분리하면 타이밍 리스크를 체계적으로 낮출 수 있습니다.',
  actionPlan: '실행은 착수보다 마감 기준을 먼저 고정할 때 재현성이 올라갑니다.',
  conclusion: '핵심은 속도보다 정확한 순서이며, 그 순서가 결과 변동을 줄입니다.',
}

function fallbackTitle(section: keyof AIPremiumReport['sections'], lang: 'ko' | 'en'): string {
  if (lang === 'ko') return SECTION_TITLE_KO[section]
  const en: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: 'Core Direction',
    personalityDeep: 'Personality Deep Dive',
    careerPath: 'Career Trajectory',
    relationshipDynamics: 'Relationship Dynamics',
    wealthPotential: 'Financial Operation',
    healthGuidance: 'Health Rhythm',
    lifeMission: 'Long-term Direction',
    timingAdvice: 'Timing Strategy',
    actionPlan: 'Execution Plan',
    conclusion: 'Conclusion',
  }
  return en[section]
}

function sortClaimsForSection(
  claims: SynthesizedClaim[],
  section: keyof AIPremiumReport['sections']
): SynthesizedClaim[] {
  const domains = SECTION_DOMAINS[section]
  const direct = claims.filter((claim) => domains.includes(claim.domain))
  const rest = claims.filter((claim) => !domains.includes(claim.domain))
  return [...direct, ...rest]
}

function pickSupportClaim(
  leadClaim: SynthesizedClaim,
  orderedClaims: SynthesizedClaim[]
): SynthesizedClaim | undefined {
  return orderedClaims.find(
    (claim) =>
      claim.claimId !== leadClaim.claimId &&
      claim.domain !== leadClaim.domain &&
      claim.thesis !== leadClaim.thesis
  )
}

function formatEvidenceSentence(
  synthesis: SignalSynthesisResult,
  claims: SynthesizedClaim[],
  lang: 'ko' | 'en'
): string {
  const evidenceSignals = claims
    .flatMap((claim) => claim.evidence)
    .map((id) => synthesis.signalsById[id])
    .filter(Boolean)
    .slice(0, 2)

  if (evidenceSignals.length === 0) {
    return lang === 'ko'
      ? '근거 신호 밀도가 낮으므로 확정 전 체크리스트를 먼저 적용하세요.'
      : 'Evidence density is low, so apply a checklist before commitment.'
  }

  if (lang === 'ko') {
    return evidenceSignals
      .map((signal) => {
        const key = signal.keyword || signal.rowKey
        const saju = signal.sajuBasis || '사주 근거 보완 필요'
        const astro = signal.astroBasis || '점성 근거 보완 필요'
        return `${key}(${signal.id})는 ${saju} · ${astro} 근거가 동시에 확인됩니다.`
      })
      .join(' ')
  }

  return evidenceSignals
    .map((signal) => {
      const key = signal.keyword || signal.rowKey
      const saju = signal.sajuBasis || 'pending saju basis'
      const astro = signal.astroBasis || 'pending astrology basis'
      return `${key} (${signal.id}) is backed by ${saju} and ${astro}.`
    })
    .join(' ')
}

function formatActionSentence(claims: SynthesizedClaim[], lang: 'ko' | 'en'): string {
  const controls = claims
    .map((claim) => claim.riskControl)
    .filter(Boolean)
    .slice(0, 2)
  const actions = claims
    .flatMap((claim) => claim.actions || [])
    .filter(Boolean)
    .slice(0, 2)
  const plan = [...controls, ...actions].slice(0, 2).join(' ')

  if (lang === 'ko') {
    return plan || '결정과 실행 시점을 분리하고 외부 확정 전에 재확인 단계를 고정하세요.'
  }
  return plan || 'Split decision and execution timing, then lock a recheck step before commitment.'
}

function formatTimingGrounding(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const daeun = input.currentDaeunElement
  const saeun = input.currentSaeunElement
  if (lang === 'ko') {
    if (daeun || saeun) {
      return `현재 대운 ${daeun || '미확인'}과 세운 ${saeun || '미확인'} 기준으로, 결론과 실행 시점을 분리해 운영하는 방식이 안정적입니다.`
    }
    return '대운·세운 정보가 제한적이므로 당일 확정보다 24시간 재확인 창을 두는 보수 운영이 유리합니다.'
  }
  if (daeun || saeun) {
    return `With Daeun ${daeun || 'unknown'} and Seun ${saeun || 'unknown'}, separate decision timing from execution timing.`
  }
  return 'With limited Daeun/Seun coverage, use a conservative 24-hour recheck before commitment.'
}

function sectionLeadSentence(
  section: keyof AIPremiumReport['sections'],
  leadClaim: SynthesizedClaim,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    return `${SECTION_LEAD_KO[section]} ${leadClaim.thesis}`
  }
  return `${fallbackTitle(section, lang)}: ${leadClaim.thesis}`
}

function sectionSupportSentence(
  leadClaim: SynthesizedClaim,
  section: keyof AIPremiumReport['sections'],
  supportClaim: SynthesizedClaim | undefined,
  lang: 'ko' | 'en'
): string {
  if (!supportClaim || supportClaim.thesis === leadClaim.thesis) return ''
  if (lang === 'ko') {
    return `${SECTION_SUPPORT_PREFIX_KO[section]} ${supportClaim.thesis}`
  }
  return `Secondary track: ${supportClaim.thesis}`
}

function renderSection(section: keyof AIPremiumReport['sections'], input: NarrativeInput): string {
  const orderedClaims = sortClaimsForSection(input.synthesis.claims, section)
  const leadClaim = orderedClaims[0]
  const supportClaim = leadClaim ? pickSupportClaim(leadClaim, orderedClaims) : undefined
  const title = fallbackTitle(section, input.lang)

  if (!leadClaim) {
    return input.lang === 'ko'
      ? `${title}은 현재 데이터 밀도가 낮아 기본 운영 원칙 중심으로 제공합니다. 단기 확정보다 검증 단계를 먼저 두고, 일정·조건·책임을 문서로 고정하세요.`
      : `${title} is generated in low-signal mode. Prioritize verification before commitment and lock scope, terms, and ownership in writing.`
  }

  const thesisLine = sectionLeadSentence(section, leadClaim, input.lang)
  const supportLine = sectionSupportSentence(leadClaim, section, supportClaim, input.lang)
  const evidenceLine = formatEvidenceSentence(
    input.synthesis,
    [leadClaim, ...(supportClaim ? [supportClaim] : [])],
    input.lang
  )
  const actionLine = formatActionSentence(
    [leadClaim, ...(supportClaim ? [supportClaim] : [])],
    input.lang
  )
  const timingLine =
    section === 'timingAdvice' ? formatTimingGrounding(input.matrixInput, input.lang) : ''
  const styleHintLine = input.lang === 'ko' ? SECTION_ACTION_HINT_KO[section] : ''

  return [thesisLine, supportLine, evidenceLine, actionLine, styleHintLine, timingLine]
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function generateNarrativeSectionsFromSynthesis(
  input: NarrativeInput
): AIPremiumReport['sections'] {
  return {
    introduction: renderSection('introduction', input),
    personalityDeep: renderSection('personalityDeep', input),
    careerPath: renderSection('careerPath', input),
    relationshipDynamics: renderSection('relationshipDynamics', input),
    wealthPotential: renderSection('wealthPotential', input),
    healthGuidance: renderSection('healthGuidance', input),
    lifeMission: renderSection('lifeMission', input),
    timingAdvice: renderSection('timingAdvice', input),
    actionPlan: renderSection('actionPlan', input),
    conclusion: renderSection('conclusion', input),
  }
}
