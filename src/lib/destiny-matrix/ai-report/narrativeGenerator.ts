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

function fallbackTitle(section: keyof AIPremiumReport['sections'], lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const ko: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: '핵심 흐름 요약',
      personalityDeep: '성향 심층 해석',
      careerPath: '커리어 전개',
      relationshipDynamics: '관계 역학',
      wealthPotential: '재정 운영',
      healthGuidance: '건강 리듬',
      lifeMission: '장기 방향',
      timingAdvice: '시기 전략',
      actionPlan: '실행 계획',
      conclusion: '마무리 요약',
    }
    return ko[section]
  }
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
  claim: SynthesizedClaim,
  lang: 'ko' | 'en'
): string {
  const evidenceSignals = claim.evidence
    .map((id) => synthesis.signalsById[id])
    .filter(Boolean)
    .slice(0, 2)
  if (evidenceSignals.length === 0) {
    return lang === 'ko'
      ? '근거 신호는 추가 검증이 필요하므로, 확정 전 체크리스트를 우선 적용하세요.'
      : 'Evidence density is low, so apply a checklist before commitment.'
  }
  if (lang === 'ko') {
    return evidenceSignals
      .map(
        (signal) =>
          `${signal.keyword || signal.rowKey} 신호(${signal.id})는 ${signal.sajuBasis || '사주 근거 보완 필요'}와 ${signal.astroBasis || '점성 근거 보완 필요'}를 함께 보여줍니다.`
      )
      .join(' ')
  }
  return evidenceSignals
    .map(
      (signal) =>
        `Signal ${signal.id} (${signal.keyword || signal.rowKey}) links ${signal.sajuBasis || 'pending saju basis'} with ${signal.astroBasis || 'pending astrology basis'}.`
    )
    .join(' ')
}

function formatActionSentence(claims: SynthesizedClaim[], lang: 'ko' | 'en'): string {
  const controls = claims.map((claim) => claim.riskControl).slice(0, 2)
  const actions = claims.flatMap((claim) => claim.actions || []).slice(0, 2)
  if (lang === 'ko') {
    const plan = [...controls, ...actions].slice(0, 2).join(' ')
    return plan || '결정과 실행을 분리하고, 외부 확정 전 재확인 단계를 고정하세요.'
  }
  const plan = [...controls, ...actions].slice(0, 2).join(' ')
  return plan || 'Split decision and execution timing, then lock a recheck step before commitment.'
}

function formatTimingGrounding(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const daeun = input.currentDaeunElement
  const saeun = input.currentSaeunElement
  if (lang === 'ko') {
    if (daeun || saeun) {
      return `현재 대운 ${daeun || '미확인'}과 세운 ${saeun || '미확인'}의 조합을 기준으로, 오늘 결론과 실행 시점을 분리하는 방식이 안정적입니다.`
    }
    return '대운·세운 정보가 제한적이므로, 당일 확정보다 24시간 재확인 창을 두는 보수적 운영이 유리합니다.'
  }
  if (daeun || saeun) {
    return `With Daeun ${daeun || 'unknown'} and Seun ${saeun || 'unknown'}, separate decision timing from execution timing.`
  }
  return 'With limited Daeun/Seun coverage, use a conservative 24-hour recheck before commitment.'
}

function renderSection(section: keyof AIPremiumReport['sections'], input: NarrativeInput): string {
  const orderedClaims = sortClaimsForSection(input.synthesis.claims, section)
  const leadClaim = orderedClaims[0]
  const supportClaim = orderedClaims[1]
  const title = fallbackTitle(section, input.lang)
  if (!leadClaim) {
    return input.lang === 'ko'
      ? `${title}은 현재 데이터 밀도가 낮아 기본 운영 원칙 중심으로 제시합니다. 단기 확정보다 검증 단계를 먼저 두고, 일정·조건·책임을 문서로 고정하세요.`
      : `${title} is generated in low-signal mode. Prioritize verification before commitment and lock scope, terms, and ownership in writing.`
  }

  const thesisLine =
    input.lang === 'ko'
      ? `${title}의 결론은 ${leadClaim.thesis}`
      : `${title} conclusion: ${leadClaim.thesis}`
  const supportLine = supportClaim
    ? input.lang === 'ko'
      ? `보조 축으로는 ${supportClaim.thesis}`
      : `Secondary track: ${supportClaim.thesis}`
    : ''
  const evidenceLine = formatEvidenceSentence(input.synthesis, leadClaim, input.lang)
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
