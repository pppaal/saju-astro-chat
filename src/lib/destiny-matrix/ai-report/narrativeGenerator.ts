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

function buildLowSignalFallbackSection(
  section: keyof AIPremiumReport['sections'],
  title: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const dayMaster = input.dayMasterElement || 'core'
  const daeun = input.currentDaeunElement || ''
  const seun = input.currentSaeunElement || ''

  if (lang === 'ko') {
    const bySection: Record<keyof AIPremiumReport['sections'], string> = {
      introduction: `${title} 영역은 현재 직접 신호가 적어 보수 운영 규칙으로 정리합니다. 일간 ${dayMaster} 기준으로 오늘은 결론보다 순서 설계가 성과를 지키는 날입니다. 해야 할 일은 하나로 좁히고, 나머지는 재확인 슬롯으로 분리하세요. 외부 확정 전에는 일정·조건·책임 3항을 먼저 맞추는 방식이 안전합니다.`,
      personalityDeep: `${title} 영역은 저신호 구간이므로 기본 성향 관리에 집중하세요. 판단 속도를 한 단계 낮추고, 말보다 기록을 먼저 남기면 오해 비용이 줄어듭니다. 즉흥 결정보다 체크리스트 기반 결정을 사용하면 실수 편차가 작아집니다. 오늘은 감정 반응보다 실행 순서를 먼저 정하는 쪽이 유리합니다.`,
      careerPath: `${title} 영역은 직접 신호가 약해 확장보다 완결 우선 전략이 맞습니다. 새로운 시도는 한 번에 넓히지 말고 핵심 과제 1~2개를 먼저 끝내세요. 역할·범위·마감을 문서 한 줄로 고정하면 일정 흔들림이 크게 줄어듭니다. 당일 확정이 필요한 안건만 처리하고 나머지는 다음 확인 창으로 넘기세요.`,
      relationshipDynamics: `${title} 영역은 강한 방향 신호보다 해석 오차 관리가 핵심입니다. 중요한 대화는 결론부터 말하지 말고 먼저 상대 이해를 한 줄로 확인하세요. 감정이 올라오는 구간에서는 즉시 확정보다 시간차 응답이 관계 비용을 줄입니다. 오늘은 승부형 대화보다 조율형 대화가 결과가 좋습니다.`,
      wealthPotential: `${title} 영역은 수익 확대보다 손실 억제 우선으로 운영하세요. 금액·기한·취소조건을 따로 분리해 확인하면 불필요한 지출을 줄일 수 있습니다. 큰 지출이나 계약은 당일 확정보다 하루 재확인 후 처리하는 편이 안정적입니다. 현금흐름 표를 짧게라도 업데이트하면 판단 품질이 올라갑니다.`,
      healthGuidance: `${title} 영역은 퍼포먼스보다 회복 리듬을 먼저 잡는 구간입니다. 수면·수분·휴식 블록을 일정에 먼저 고정하면 집중력 편차가 줄어듭니다. 무리한 확장보다 강도 조절이 결과적으로 생산성을 지켜줍니다. 오늘은 과속보다 누락 없는 마무리를 우선하세요.`,
      lifeMission: `${title} 영역은 단기 성과보다 장기 일관성에 초점을 맞춰야 합니다. 큰 선언보다 작은 실행을 반복해서 기록하는 방식이 방향성을 만듭니다. 기준이 흔들릴 때는 선택 폭을 줄이고 우선순위 한 가지만 지키세요. 이번 주는 완벽보다 지속 가능한 루틴을 만드는 데 의미가 있습니다.`,
      timingAdvice: `${title} 영역은 타이밍 신호가 약해 결정보다 분리 운영이 안전합니다. ${daeun || '현재 흐름'}${seun ? `/${seun}` : ''} 기준으로 결론 시점과 실행 시점을 나눠 관리하세요. 중요한 확정은 최소 한 번의 재확인 단계를 넣어야 흔들림이 줄어듭니다. 오늘은 빠른 착수보다 정확한 순서가 더 높은 효율을 냅니다.`,
      actionPlan: `${title} 영역은 3단계 실행으로 정리하는 것이 가장 안정적입니다. 첫째, 오늘 반드시 끝낼 결과물 1개를 정합니다. 둘째, 외부 공유 전 조건·기한·책임을 한 줄로 확인합니다. 셋째, 당일 확정 항목과 보류 항목을 분리해 리스크를 통제하세요.`,
      conclusion: `${title} 영역의 결론은 속도보다 순서, 확정보다 재확인입니다. 직접 신호가 적은 날에는 과감한 확장보다 누락 방지가 성과를 지킵니다. 오늘은 완성도 높은 한 건을 만드는 데 집중하면 체감 결과가 분명해집니다. 같은 규칙을 며칠만 유지해도 변동성이 줄어듭니다.`,
    }
    return bySection[section]
  }

  const bySectionEn: Record<keyof AIPremiumReport['sections'], string> = {
    introduction: `${title} is currently in low-signal mode, so a conservative operating rule is used. With day-master ${dayMaster}, sequence quality matters more than raw speed today. Narrow work to one must-finish item and move everything else to a recheck slot. Before external commitment, align scope, terms, and ownership first.`,
    personalityDeep: `${title} should focus on baseline behavior control under low-signal conditions. Slow decision speed by one step and log key points before speaking. Checklist-based choices reduce variance more than instinct-only choices in this window. Prioritize execution order over emotional reaction.`,
    careerPath: `${title} currently favors completion over expansion. Do not widen scope at once; close one or two core deliverables first. Lock role, scope, and deadline in one written line before execution. Commit only what must close today and move the rest to a next review slot.`,
    relationshipDynamics: `${title} is less about momentum and more about interpretation control. In key conversations, confirm the other side's understanding in one line before concluding. When emotion rises, delayed responses are safer than immediate commitment. Coordination-first dialogue outperforms confrontation today.`,
    wealthPotential: `${title} should be run with downside control first. Split and confirm amount, deadline, and cancellation terms before any commitment. For large spending or contracts, a 24-hour recheck is safer than same-day finalization. A short cashflow update improves judgment quality immediately.`,
    healthGuidance: `${title} should prioritize recovery rhythm before performance push. Fix sleep, hydration, and recovery blocks in your schedule first. Intensity control protects output quality better than overspeed in this phase. Choose error-free completion over aggressive volume today.`,
    lifeMission: `${title} should prioritize long-term consistency over short spikes. Repeat small executable actions and keep simple logs. When criteria feel unstable, narrow choice width and protect one top priority. This week, sustainable routine matters more than perfection.`,
    timingAdvice: `${title} is in low-signal timing mode, so split decision timing from execution timing. With current cycle ${daeun || 'baseline'}${seun ? `/${seun}` : ''}, insert at least one recheck gate before commitment. Accuracy of order matters more than speed of start. Use staged execution windows.`,
    actionPlan: `${title} is best managed as a 3-step loop. First, define one must-finish deliverable. Second, verify terms, deadline, and ownership in one line before sharing. Third, separate same-day commitment items from deferred items to control risk.`,
    conclusion: `${title} concludes with a simple rule: sequence over speed, recheck over impulse. On low-signal days, preventing omission protects outcomes better than aggressive expansion. Focus on one high-quality completion today. Repeat this rule for several days to reduce volatility.`,
  }
  return bySectionEn[section]
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
  if (direct.length === 0) return []
  return direct
}

function pickSupportClaim(
  leadClaim: SynthesizedClaim,
  orderedClaims: SynthesizedClaim[],
  preferredDomains: SignalDomain[],
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): SynthesizedClaim | undefined {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .trim()
  return orderedClaims.find(
    (claim) =>
      claim.claimId !== leadClaim.claimId &&
      !usedClaimIds.has(claim.claimId) &&
      preferredDomains.includes(claim.domain) &&
      claim.thesis !== leadClaim.thesis &&
      !usedTheses.has(normalize(claim.thesis))
  )
}

function normalizeTextKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim()
}

function pickLeadClaim(
  orderedClaims: SynthesizedClaim[],
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): SynthesizedClaim | undefined {
  const fresh = orderedClaims.find(
    (claim) => !usedClaimIds.has(claim.claimId) && !usedTheses.has(normalizeTextKey(claim.thesis))
  )
  if (fresh) return fresh
  return orderedClaims.find((claim) => !usedClaimIds.has(claim.claimId)) || orderedClaims[0]
}

function sanitizeEvidenceBasis(value: string | undefined, lang: 'ko' | 'en'): string {
  if (!value) return lang === 'ko' ? '근거 보완 필요' : 'pending evidence'
  const cleaned = value
    .replace(/\b(?:pair|angle|orb|allowed|policy)\s*=\s*[^,\s)]+/gi, '')
    .replace(/\s*[-/]\s*(?:conjunction|opposition|square|trine|sextile)\b/gi, '')
    .replace(/\b(?:conjunction|opposition|square|trine|sextile)\b/gi, (m) => m.toLowerCase())
    .replace(/\(\s*\)/g, '')
    .replace(/^\s*-\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!cleaned || cleaned === '-') {
    return lang === 'ko' ? '근거 보완 필요' : 'pending evidence'
  }
  return cleaned
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
        const key = signal.keyword || signal.rowKey || '핵심'
        const saju = sanitizeEvidenceBasis(signal.sajuBasis || '사주 근거 보완 필요', lang)
        const astro = sanitizeEvidenceBasis(signal.astroBasis || '점성 근거 보완 필요', lang)
        return `${key} 신호는 ${saju}와 ${astro} 근거가 함께 확인됩니다.`
      })
      .join(' ')
  }

  return evidenceSignals
    .map((signal) => {
      const key = signal.keyword || signal.rowKey || 'core'
      const saju = sanitizeEvidenceBasis(signal.sajuBasis || 'pending saju basis', lang)
      const astro = sanitizeEvidenceBasis(signal.astroBasis || 'pending astrology basis', lang)
      return `${key} signal is grounded by ${saju} and ${astro}.`
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
  const plan = [...new Set([...controls, ...actions])].slice(0, 2).join(' ')

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
    const dedupedThesis = leadClaim.thesis.replace(
      /^(성향|커리어|관계|재정|건강|장기 방향|타이밍|실행 설계|최종 요약)은\s*/u,
      ''
    )
    return `${SECTION_LEAD_KO[section]} ${dedupedThesis}`.trim()
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

function renderSection(
  section: keyof AIPremiumReport['sections'],
  input: NarrativeInput,
  usedClaimIds: Set<string>,
  usedTheses: Set<string>
): string {
  const orderedClaims = sortClaimsForSection(input.synthesis.claims, section)
  const domains = SECTION_DOMAINS[section]
  const leadClaim = pickLeadClaim(orderedClaims, usedClaimIds, usedTheses)
  const supportClaim = leadClaim
    ? pickSupportClaim(leadClaim, orderedClaims, domains, usedClaimIds, usedTheses)
    : undefined
  const title = fallbackTitle(section, input.lang)

  if (!leadClaim) {
    return buildLowSignalFallbackSection(section, title, input.matrixInput, input.lang)
  }

  usedClaimIds.add(leadClaim.claimId)
  usedTheses.add(normalizeTextKey(leadClaim.thesis))
  if (supportClaim) {
    usedClaimIds.add(supportClaim.claimId)
    usedTheses.add(normalizeTextKey(supportClaim.thesis))
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
  const usedClaimIds = new Set<string>()
  const usedTheses = new Set<string>()

  return {
    introduction: renderSection('introduction', input, usedClaimIds, usedTheses),
    personalityDeep: renderSection('personalityDeep', input, usedClaimIds, usedTheses),
    careerPath: renderSection('careerPath', input, usedClaimIds, usedTheses),
    relationshipDynamics: renderSection('relationshipDynamics', input, usedClaimIds, usedTheses),
    wealthPotential: renderSection('wealthPotential', input, usedClaimIds, usedTheses),
    healthGuidance: renderSection('healthGuidance', input, usedClaimIds, usedTheses),
    lifeMission: renderSection('lifeMission', input, usedClaimIds, usedTheses),
    timingAdvice: renderSection('timingAdvice', input, usedClaimIds, usedTheses),
    actionPlan: renderSection('actionPlan', input, usedClaimIds, usedTheses),
    conclusion: renderSection('conclusion', input, usedClaimIds, usedTheses),
  }
}
