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
  supportClaim: SynthesizedClaim | undefined,
  lang: 'ko' | 'en'
): string {
  if (!supportClaim || supportClaim.thesis === leadClaim.thesis) return ''
  if (lang === 'ko') {
    return `보완 축은 ${supportClaim.thesis}`
  }
  return `Secondary track: ${supportClaim.thesis}`
}

function renderSection(section: keyof AIPremiumReport['sections'], input: NarrativeInput): string {
  const orderedClaims = sortClaimsForSection(input.synthesis.claims, section)
  const leadClaim = orderedClaims[0]
  const supportClaim = orderedClaims[1]
  const title = fallbackTitle(section, input.lang)

  if (!leadClaim) {
    return input.lang === 'ko'
      ? `${title}은 현재 데이터 밀도가 낮아 기본 운영 원칙 중심으로 제공합니다. 단기 확정보다 검증 단계를 먼저 두고, 일정·조건·책임을 문서로 고정하세요.`
      : `${title} is generated in low-signal mode. Prioritize verification before commitment and lock scope, terms, and ownership in writing.`
  }

  const thesisLine = sectionLeadSentence(section, leadClaim, input.lang)
  const supportLine = sectionSupportSentence(leadClaim, supportClaim, input.lang)
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

  return [thesisLine, supportLine, evidenceLine, actionLine, timingLine]
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
