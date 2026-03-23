import type { MatrixCalculationInput } from '../types'
import type { ReportTheme, ThemedReportSections, TimingData, TimingReportSections } from './types'
import type { AIPremiumReport } from './reportTypes'

import {
  buildThemedSectionHook,
  buildTimingSectionHook,
  findReportCoreAdvisory,
  findReportCoreManifestation,
  findReportCoreTimingWindow,
  findReportCoreVerdict,
  type ReportCoreViewModel,
} from './reportCoreHelpers'

type Lang = 'ko' | 'en'

type PersonalLeadSection =
  | 'introduction'
  | 'personalityDeep'
  | 'careerPath'
  | 'relationshipDynamics'
  | 'wealthPotential'
  | 'healthGuidance'
  | 'lifeMission'
  | 'timingAdvice'
  | 'actionPlan'
  | 'conclusion'

function buildComprehensiveSectionHookLocal(
  section:
    | 'introduction'
    | 'careerPath'
    | 'relationshipDynamics'
    | 'wealthPotential'
    | 'healthGuidance'
    | 'conclusion',
  lang: Lang
): string {
  if (lang !== 'ko') {
    const hooks = {
      introduction:
        'This is a report about operating leverage, not vague potential, so the first priority is where momentum is actually moving.',
      careerPath:
        'Career moves now favor visible judgment and priority control more than broad expansion.',
      relationshipDynamics:
        'Relationship quality improves fastest when interpretation drift is reduced before emotion escalates.',
      wealthPotential:
        'Financial quality rises when condition checks become stronger than upside excitement.',
      healthGuidance:
        'Health management is decided less by endurance and more by how quickly recovery rhythm is restored.',
      conclusion:
        'The conclusion of this cycle is simple: results improve when speed and verification stop fighting each other.',
    } as const
    return hooks[section]
  }

  const hooks = {
    introduction:
      '이번 종합 리포트의 핵심은 막연한 가능성을 늘어놓는 것이 아니라, 지금 판세를 실제로 움직이는 축을 먼저 선명하게 잡아내는 데 있습니다.',
    careerPath:
      '커리어는 많이 벌이는 사람보다, 우선순위와 판단 기준을 선명하게 보여주는 사람이 이기는 구간입니다.',
    relationshipDynamics:
      '관계의 체감 품질은 감정 표현보다 해석 오차를 얼마나 빨리 줄이느냐에서 먼저 갈립니다.',
    wealthPotential:
      '재정은 기대수익을 키우는 것보다, 조건 검증과 손실 상한을 먼저 다루는 사람이 결국 이깁니다.',
    healthGuidance:
      '건강은 버티는 힘보다 회복 리듬을 얼마나 빨리 되찾는지가 컨디션 격차를 만듭니다.',
    conclusion:
      '이번 흐름의 결론은 재능보다 운영입니다. 밀어붙일 순간과 멈춰 점검할 순간만 정확히 가르면 같은 재능도 전혀 다른 결과를 만듭니다.',
  } as const
  return hooks[section]
}

export interface ReportCoreEnrichmentDeps {
  buildReportCoreLine: (value: string | undefined | null, lang: Lang) => string
  buildNarrativeSectionFromCore: (
    primary: Array<string | undefined | null>,
    supporting: Array<string | undefined | null>,
    base: string,
    lang: Lang,
    minChars: number,
    includeBase?: boolean,
    allowBaseFallback?: boolean
  ) => string
  ensureLongSectionNarrative: (base: string, minChars: number, extras: string[]) => string
  sanitizeUserFacingNarrative: (text: string) => string
  formatNarrativeParagraphs: (text: string, lang: Lang) => string
  buildPrimaryActionLead: (
    action: string | undefined | null,
    fallback: string,
    lang: Lang
  ) => string
  buildPrimaryCautionLead: (
    caution: string | undefined | null,
    fallback: string,
    lang: Lang
  ) => string
  buildSectionPersonalLead: (
    section: PersonalLeadSection,
    input: MatrixCalculationInput,
    lang: Lang,
    timingData?: TimingData
  ) => string
  buildPersonalLifeTimelineNarrative: (
    input: MatrixCalculationInput,
    timingData: TimingData | undefined,
    lang: Lang
  ) => string
  buildTimingWindowNarrative: (
    domain: string,
    item: NonNullable<ReturnType<typeof findReportCoreTimingWindow>>,
    lang: Lang
  ) => string
  buildManifestationNarrative: (
    item: NonNullable<ReturnType<typeof findReportCoreManifestation>>,
    lang: Lang
  ) => string
  buildVerdictNarrative: (
    item: NonNullable<ReturnType<typeof findReportCoreVerdict>>,
    lang: Lang
  ) => string
  getReportDomainLabel: (domain: string, lang: Lang) => string
  distinctNarrative: (
    candidate: string | undefined | null,
    blocked: Array<string | undefined | null>
  ) => string
  formatPolicyCheckLabels: (labels: string[] | undefined) => string[]
  renderTimingAdviceSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderActionPlanSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
}

function reinforceNarrativeSection(
  base: string,
  critical: string[],
  supplemental: string[],
  lang: Lang,
  minChars: number,
  deps: ReportCoreEnrichmentDeps
): string {
  let out = deps.sanitizeUserFacingNarrative(String(base || '').trim())
  const criticalLines = [
    ...new Set(critical.map((item) => deps.buildReportCoreLine(item, lang)).filter(Boolean)),
  ]
  for (const line of criticalLines.reverse()) {
    if (out.includes(line)) continue
    out = out ? `${line} ${out}` : line
  }
  out = deps.ensureLongSectionNarrative(
    out,
    minChars,
    supplemental.map((item) => deps.buildReportCoreLine(item, lang))
  )
  return deps.formatNarrativeParagraphs(deps.sanitizeUserFacingNarrative(out), lang)
}

export function enrichComprehensiveSectionsWithReportCore(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: Lang,
  deps: ReportCoreEnrichmentDeps,
  sectionSupplements: Record<string, string[]> = {},
  timingData?: TimingData
): AIPremiumReport['sections'] {
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const focusDomainLabel = deps.getReportDomainLabel(reportCore.focusDomain, lang)
  const rawFocusNarrative =
    focusAdvisory?.thesis || focusManifestation?.manifestation || reportCore.thesis || ''
  const focusNarrativeForIntro =
    lang === 'ko'
      ? rawFocusNarrative.replace(new RegExp(`^${focusDomainLabel}(?:는|은)\\s*`), '')
      : rawFocusNarrative
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const wealthAdvisory = findReportCoreAdvisory(reportCore, 'wealth')
  const healthAdvisory = findReportCoreAdvisory(reportCore, 'health')
  const careerTiming = findReportCoreTimingWindow(reportCore, 'career')
  const relationshipTiming = findReportCoreTimingWindow(reportCore, 'relationship')
  const wealthTiming = findReportCoreTimingWindow(reportCore, 'wealth')
  const healthTiming = findReportCoreTimingWindow(reportCore, 'health')
  const moveTiming = findReportCoreTimingWindow(reportCore, 'move')
  const careerManifestation = findReportCoreManifestation(reportCore, 'career')
  const relationshipManifestation = findReportCoreManifestation(reportCore, 'relationship')
  const wealthManifestation = findReportCoreManifestation(reportCore, 'wealth')
  const healthManifestation = findReportCoreManifestation(reportCore, 'health')
  const moveManifestation = findReportCoreManifestation(reportCore, 'move')
  const careerVerdict = findReportCoreVerdict(reportCore, 'career')
  const relationshipVerdict = findReportCoreVerdict(reportCore, 'relationship')
  const wealthVerdict = findReportCoreVerdict(reportCore, 'wealth')
  const healthVerdict = findReportCoreVerdict(reportCore, 'health')
  const moveVerdict = findReportCoreVerdict(reportCore, 'move')
  const blockedCareerLines = [careerAdvisory?.thesis, careerAdvisory?.action, reportCore.thesis]

  return {
    introduction: deps.buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHookLocal('introduction', lang),
        deps.buildSectionPersonalLead('introduction', matrixInput, lang, timingData),
        lang === 'ko'
          ? `지금 인생 전체 흐름에서 가장 크게 움직이는 축은 ${focusDomainLabel}이고, 현재 국면은 ${focusNarrativeForIntro}`
          : `The strongest axis in your life right now is ${focusDomainLabel}, and the current movement is ${focusNarrativeForIntro}.`,
        deps.buildPrimaryActionLead(reportCore.primaryAction, reportCore.riskControl, lang),
        deps.buildPrimaryCautionLead(reportCore.primaryCaution, reportCore.riskControl, lang),
      ],
      [
        reportCore.gradeReason,
        focusAdvisory?.strategyLine || '',
        focusTiming ? deps.buildTimingWindowNarrative(focusTiming.domain, focusTiming, lang) : '',
        focusManifestation ? deps.buildManifestationNarrative(focusManifestation, lang) : '',
        reportCore.gradeReason,
        reportCore.riskControl,
        ...(sectionSupplements.introduction || []),
      ],
      sections.introduction,
      lang,
      lang === 'ko' ? 1000 : 700,
      false,
      false
    ),
    personalityDeep: deps.buildNarrativeSectionFromCore(
      [
        deps.buildSectionPersonalLead('personalityDeep', matrixInput, lang, timingData),
        lang === 'ko'
          ? '기본 성향에서는 확장 욕구와 확인 본능이 동시에 강하게 작동합니다.'
          : 'At the personality level, expansion drive and verification instinct operate together.',
        lang === 'ko'
          ? '당신의 기본 성향은 빠른 판단보다 기준을 세운 뒤 밀어붙일 때 가장 강합니다.'
          : 'Your baseline style becomes strongest when you define standards before you push.',
      ],
      [
        focusManifestation?.activationThesis || '',
        focusAdvisory?.caution || '',
        reportCore.coherenceAudit.notes[0] || '',
        ...(sectionSupplements.personalityDeep || []),
      ],
      sections.personalityDeep,
      lang,
      lang === 'ko' ? 900 : 650,
      false,
      false
    ),
    careerPath: deps.buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHookLocal('careerPath', lang),
        deps.buildSectionPersonalLead('careerPath', matrixInput, lang, timingData),
        careerAdvisory?.thesis || '',
        careerAdvisory?.action || '',
      ],
      [
        careerAdvisory?.strategyLine || '',
        careerTiming ? deps.buildTimingWindowNarrative('career', careerTiming, lang) : '',
        careerManifestation ? deps.buildManifestationNarrative(careerManifestation, lang) : '',
        careerVerdict ? deps.buildVerdictNarrative(careerVerdict, lang) : '',
        careerAdvisory?.caution || '',
        ...(sectionSupplements.careerPath || []),
      ],
      sections.careerPath,
      lang,
      lang === 'ko' ? 950 : 680,
      false,
      false
    ),
    relationshipDynamics: deps.buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHookLocal('relationshipDynamics', lang),
        deps.buildSectionPersonalLead('relationshipDynamics', matrixInput, lang, timingData),
        deps.distinctNarrative(relationshipAdvisory?.thesis, blockedCareerLines) ||
          (lang === 'ko'
            ? '관계에서는 속도보다 해석의 정확도가 더 중요하게 작동합니다.'
            : 'In relationships, interpretive accuracy matters more than speed.'),
        deps.distinctNarrative(relationshipAdvisory?.action, blockedCareerLines) ||
          (lang === 'ko'
            ? '결론을 던지기 전에 서로 이해한 문장을 짧게 맞춰보는 편이 유리합니다.'
            : 'It is better to align one short sentence of shared understanding before making a conclusion.'),
      ],
      [
        relationshipAdvisory?.strategyLine || '',
        relationshipTiming
          ? deps.buildTimingWindowNarrative('relationship', relationshipTiming, lang)
          : '',
        relationshipManifestation
          ? deps.buildManifestationNarrative(relationshipManifestation, lang)
          : '',
        relationshipVerdict ? deps.buildVerdictNarrative(relationshipVerdict, lang) : '',
        relationshipAdvisory?.caution || '',
        ...(sectionSupplements.relationshipDynamics || []),
      ],
      sections.relationshipDynamics,
      lang,
      lang === 'ko' ? 950 : 680,
      false,
      false
    ),
    wealthPotential: deps.buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHookLocal('wealthPotential', lang),
        deps.buildSectionPersonalLead('wealthPotential', matrixInput, lang, timingData),
        deps.distinctNarrative(wealthAdvisory?.thesis, blockedCareerLines) || '',
        deps.distinctNarrative(wealthAdvisory?.action, blockedCareerLines) || '',
      ],
      [
        wealthAdvisory?.strategyLine || '',
        wealthTiming ? deps.buildTimingWindowNarrative('wealth', wealthTiming, lang) : '',
        wealthManifestation ? deps.buildManifestationNarrative(wealthManifestation, lang) : '',
        wealthVerdict ? deps.buildVerdictNarrative(wealthVerdict, lang) : '',
        wealthAdvisory?.caution || '',
        ...(sectionSupplements.wealthPotential || []),
      ],
      sections.wealthPotential,
      lang,
      lang === 'ko' ? 950 : 680,
      false,
      false
    ),
    healthGuidance: deps.buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHookLocal('healthGuidance', lang),
        deps.buildSectionPersonalLead('healthGuidance', matrixInput, lang, timingData),
        deps.distinctNarrative(healthAdvisory?.thesis, blockedCareerLines) || '',
        deps.distinctNarrative(healthAdvisory?.action, blockedCareerLines) || '',
      ],
      [
        healthAdvisory?.strategyLine || '',
        healthTiming ? deps.buildTimingWindowNarrative('health', healthTiming, lang) : '',
        healthManifestation ? deps.buildManifestationNarrative(healthManifestation, lang) : '',
        healthVerdict ? deps.buildVerdictNarrative(healthVerdict, lang) : '',
        healthAdvisory?.caution || '',
        ...(sectionSupplements.healthGuidance || []),
      ],
      sections.healthGuidance,
      lang,
      lang === 'ko' ? 900 : 650,
      false,
      false
    ),
    lifeMission: deps.buildNarrativeSectionFromCore(
      [
        deps.buildSectionPersonalLead('lifeMission', matrixInput, lang, timingData),
        lang === 'ko'
          ? '인생 전체 흐름에서 중요한 건 한 번의 큰 선택보다, 반복 가능한 기준을 만드는 일입니다.'
          : 'Across the whole life arc, what matters is building repeatable standards rather than chasing one oversized decision.',
        lang === 'ko'
          ? '장기적으로는 성과보다 기준, 속도보다 누적 가능한 운영 방식이 더 큰 차이를 만듭니다.'
          : 'In the long run, standards and repeatable operation matter more than bursts of speed.',
      ],
      [
        focusManifestation ? deps.buildManifestationNarrative(focusManifestation, lang) : '',
        reportCore.judgmentPolicy.rationale,
        ...(reportCore.coherenceAudit.notes || []),
        ...(sectionSupplements.lifeMission || []),
      ],
      sections.lifeMission,
      lang,
      lang === 'ko' ? 900 : 650,
      false,
      false
    ),
    timingAdvice: deps.ensureLongSectionNarrative(
      deps.renderTimingAdviceSection(reportCore, matrixInput, lang),
      lang === 'ko' ? 950 : 680,
      sectionSupplements.timingAdvice || []
    ),
    actionPlan: deps.ensureLongSectionNarrative(
      deps.renderActionPlanSection(reportCore, matrixInput, lang),
      lang === 'ko' ? 900 : 650,
      sectionSupplements.actionPlan || []
    ),
    conclusion: deps.buildNarrativeSectionFromCore(
      [
        buildComprehensiveSectionHookLocal('conclusion', lang),
        deps.buildSectionPersonalLead('conclusion', matrixInput, lang, timingData),
        lang === 'ko'
          ? `지금 결론은 ${reportCore.thesis}`
          : `The current conclusion is ${reportCore.thesis}`,
        lang === 'ko'
          ? '이 흐름에서는 성급한 확정보다 기준 정리와 순서 설계가 결과를 더 크게 바꿉니다.'
          : 'In this phase, clarifying standards and sequence matters more than rushing commitment.',
      ],
      [
        reportCore.primaryAction,
        reportCore.primaryCaution,
        reportCore.riskControl,
        moveTiming ? deps.buildTimingWindowNarrative('move', moveTiming, lang) : '',
        moveManifestation ? deps.buildManifestationNarrative(moveManifestation, lang) : '',
        moveVerdict ? deps.buildVerdictNarrative(moveVerdict, lang) : '',
        ...(sectionSupplements.conclusion || []),
      ],
      sections.conclusion,
      lang,
      lang === 'ko' ? 820 : 600,
      false,
      false
    ),
  }
}

export function enrichTimingSectionsWithReportCore(
  sections: TimingReportSections,
  reportCore: ReportCoreViewModel,
  lang: Lang,
  deps: ReportCoreEnrichmentDeps
): TimingReportSections {
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const career = findReportCoreAdvisory(reportCore, 'career')
  const relationship = findReportCoreAdvisory(reportCore, 'relationship')
  const wealth = findReportCoreAdvisory(reportCore, 'wealth')
  const health = findReportCoreAdvisory(reportCore, 'health')
  const wealthVerdict = findReportCoreVerdict(reportCore, 'wealth')
  const allowedActionCopy = [
    ...(reportCore.judgmentPolicy.allowedActionLabels || []),
    ...((wealthVerdict?.allowedActionLabels as string[] | undefined) || []),
  ].filter(Boolean)
  const blockedActionCopy = [...(reportCore.judgmentPolicy.blockedActionLabels || [])].filter(
    Boolean
  )
  const softCheckCopy = deps.formatPolicyCheckLabels(
    reportCore.judgmentPolicy.softCheckLabels || reportCore.judgmentPolicy.softChecks
  )
  const hardStopCopy = deps.formatPolicyCheckLabels(
    reportCore.judgmentPolicy.hardStopLabels || reportCore.judgmentPolicy.hardStops
  )

  return {
    ...sections,
    overview: reinforceNarrativeSection(
      sections.overview,
      [buildTimingSectionHook('overview', lang), reportCore.thesis, reportCore.gradeReason],
      [focusAdvisory?.strategyLine || '', focusTiming?.whyNow || ''],
      lang,
      lang === 'ko' ? 380 : 260,
      deps
    ),
    energy: reinforceNarrativeSection(
      sections.energy,
      [
        buildTimingSectionHook('energy', lang),
        focusManifestation?.activationThesis || focusAdvisory?.thesis || reportCore.thesis,
      ],
      [focusManifestation?.manifestation || '', ...(focusManifestation?.likelyExpressions || [])],
      lang,
      lang === 'ko' ? 360 : 240,
      deps
    ),
    opportunities: reinforceNarrativeSection(
      sections.opportunities,
      [
        buildTimingSectionHook('opportunities', lang),
        reportCore.primaryAction,
        focusAdvisory?.action || '',
      ],
      [...allowedActionCopy],
      lang,
      lang === 'ko' ? 360 : 240,
      deps
    ),
    cautions: reinforceNarrativeSection(
      sections.cautions,
      [buildTimingSectionHook('cautions', lang), reportCore.primaryCaution, reportCore.riskControl],
      [...blockedActionCopy, ...hardStopCopy],
      lang,
      lang === 'ko' ? 360 : 240,
      deps
    ),
    domains: {
      career: reinforceNarrativeSection(
        sections.domains.career,
        [buildTimingSectionHook('domains', lang), career?.thesis || '', career?.action || ''],
        [career?.timingHint || '', career?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220,
        deps
      ),
      love: reinforceNarrativeSection(
        sections.domains.love,
        [
          buildTimingSectionHook('domains', lang),
          relationship?.thesis || '',
          relationship?.action || '',
        ],
        [relationship?.timingHint || '', relationship?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220,
        deps
      ),
      wealth: reinforceNarrativeSection(
        sections.domains.wealth,
        [buildTimingSectionHook('domains', lang), wealth?.thesis || '', wealth?.action || ''],
        [wealth?.timingHint || '', wealth?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220,
        deps
      ),
      health: reinforceNarrativeSection(
        sections.domains.health,
        [buildTimingSectionHook('domains', lang), health?.thesis || '', health?.action || ''],
        [health?.timingHint || '', health?.caution || ''],
        lang,
        lang === 'ko' ? 320 : 220,
        deps
      ),
    },
    actionPlan: reinforceNarrativeSection(
      sections.actionPlan,
      [
        buildTimingSectionHook('actionPlan', lang),
        reportCore.primaryAction,
        reportCore.riskControl,
      ],
      [...softCheckCopy, ...hardStopCopy],
      lang,
      lang === 'ko' ? 380 : 260,
      deps
    ),
  }
}

export function enrichThemedSectionsWithReportCore(
  sections: ThemedReportSections,
  reportCore: ReportCoreViewModel,
  lang: Lang,
  theme: ReportTheme,
  matrixInput: MatrixCalculationInput,
  deps: ReportCoreEnrichmentDeps,
  timingData?: TimingData
): ThemedReportSections {
  const focusAdvisory = findReportCoreAdvisory(reportCore, reportCore.focusDomain)
  const focusTiming = findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const focusManifestation = findReportCoreManifestation(reportCore, reportCore.focusDomain)
  const relationship = findReportCoreAdvisory(reportCore, 'relationship')
  const career = findReportCoreAdvisory(reportCore, 'career')
  const wealth = findReportCoreAdvisory(reportCore, 'wealth')
  const health = findReportCoreAdvisory(reportCore, 'health')
  const relationshipTiming = findReportCoreTimingWindow(reportCore, 'relationship')
  const careerTiming = findReportCoreTimingWindow(reportCore, 'career')
  const wealthTiming = findReportCoreTimingWindow(reportCore, 'wealth')
  const healthTiming = findReportCoreTimingWindow(reportCore, 'health')
  const relationshipManifestation = findReportCoreManifestation(reportCore, 'relationship')
  const careerManifestation = findReportCoreManifestation(reportCore, 'career')
  const wealthManifestation = findReportCoreManifestation(reportCore, 'wealth')
  const healthManifestation = findReportCoreManifestation(reportCore, 'health')

  const themeLeadBySection: Partial<Record<keyof ThemedReportSections, string>> = {
    deepAnalysis:
      theme === 'love'
        ? deps.buildSectionPersonalLead('relationshipDynamics', matrixInput, lang, timingData)
        : theme === 'career'
          ? deps.buildSectionPersonalLead('careerPath', matrixInput, lang, timingData)
          : theme === 'wealth'
            ? deps.buildSectionPersonalLead('wealthPotential', matrixInput, lang, timingData)
            : theme === 'health'
              ? deps.buildSectionPersonalLead('healthGuidance', matrixInput, lang, timingData)
              : deps.buildSectionPersonalLead('personalityDeep', matrixInput, lang, timingData),
    timing:
      theme === 'love'
        ? deps.buildPersonalLifeTimelineNarrative(matrixInput, timingData, lang)
        : deps.buildSectionPersonalLead('timingAdvice', matrixInput, lang, timingData),
    actionPlan: deps.buildSectionPersonalLead('actionPlan', matrixInput, lang, timingData),
  }

  const sectionsWithThemeLead: ThemedReportSections = {
    ...sections,
    deepAnalysis: [themeLeadBySection.deepAnalysis, sections.deepAnalysis]
      .filter(Boolean)
      .join(' '),
    timing: [themeLeadBySection.timing, sections.timing].filter(Boolean).join(' '),
    actionPlan: [themeLeadBySection.actionPlan, sections.actionPlan].filter(Boolean).join(' '),
  }

  const themeSpecificLines: Record<
    ReportTheme,
    Partial<Record<keyof ThemedReportSections, string[]>>
  > = {
    love: {
      compatibility: [
        relationshipManifestation?.manifestation || '',
        relationshipTiming
          ? deps.buildTimingWindowNarrative('relationship', relationshipTiming, lang)
          : '',
      ],
      spouseProfile: [
        relationship?.thesis || '',
        relationshipManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
      marriageTiming: [relationshipTiming?.whyNow || '', relationship?.timingHint || ''],
    },
    career: {
      strategy: [
        careerManifestation?.manifestation || '',
        careerTiming ? deps.buildTimingWindowNarrative('career', careerTiming, lang) : '',
      ],
      roleFit: [
        career?.thesis || '',
        careerManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
      turningPoints: [careerTiming?.whyNow || '', careerTiming?.entryConditions?.join(', ') || ''],
    },
    wealth: {
      strategy: [
        wealthManifestation?.manifestation || '',
        wealthTiming ? deps.buildTimingWindowNarrative('wealth', wealthTiming, lang) : '',
      ],
      incomeStreams: [
        wealth?.thesis || '',
        wealthManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
      riskManagement: [
        wealth?.caution || '',
        wealthManifestation?.riskExpressions?.slice(0, 2).join(' ') || '',
      ],
    },
    health: {
      prevention: [
        healthManifestation?.manifestation || '',
        healthTiming ? deps.buildTimingWindowNarrative('health', healthTiming, lang) : '',
      ],
      riskWindows: [
        healthTiming?.whyNow || '',
        healthManifestation?.riskExpressions?.slice(0, 2).join(' ') || '',
      ],
      recoveryPlan: [
        health?.action || '',
        healthManifestation?.likelyExpressions?.slice(0, 2).join(' ') || '',
      ],
    },
    family: {
      dynamics: [relationshipManifestation?.manifestation || '', relationship?.thesis || ''],
      communication: [relationship?.caution || '', relationshipTiming?.whyNow || ''],
      legacy: [deps.buildPersonalLifeTimelineNarrative(matrixInput, timingData, lang)],
    },
  }

  return {
    ...sectionsWithThemeLead,
    deepAnalysis: reinforceNarrativeSection(
      sectionsWithThemeLead.deepAnalysis,
      [
        buildThemedSectionHook(theme, 'deepAnalysis', lang),
        reportCore.thesis,
        focusManifestation?.baselineThesis || '',
      ],
      [focusManifestation?.activationThesis || '', focusManifestation?.manifestation || ''],
      lang,
      lang === 'ko' ? 420 : 280,
      deps
    ),
    patterns: reinforceNarrativeSection(
      sectionsWithThemeLead.patterns,
      [
        buildThemedSectionHook(theme, 'patterns', lang),
        focusAdvisory?.thesis || reportCore.gradeReason,
      ],
      [
        focusAdvisory?.strategyLine || '',
        reportCore.domainVerdicts
          .slice(0, 2)
          .map((item) =>
            lang === 'ko'
              ? `${deps.getReportDomainLabel(item.domain, lang)}의 판정 모드는 ${item.mode}이며, 이유는 ${item.rationale}`
              : `${deps.getReportDomainLabel(item.domain, lang)} runs in ${item.mode} mode because ${item.rationale}`
          )
          .join(' '),
      ],
      lang,
      lang === 'ko' ? 420 : 280,
      deps
    ),
    timing: reinforceNarrativeSection(
      sectionsWithThemeLead.timing,
      [
        buildThemedSectionHook(theme, 'timing', lang),
        focusTiming
          ? deps.buildTimingWindowNarrative(reportCore.focusDomain, focusTiming, lang)
          : reportCore.gradeReason,
      ],
      [...(focusTiming?.entryConditions || []), ...(focusTiming?.abortConditions || [])],
      lang,
      lang === 'ko' ? 420 : 280,
      deps
    ),
    compatibility: sections.compatibility
      ? reinforceNarrativeSection(
          sections.compatibility,
          [
            buildThemedSectionHook(theme, 'compatibility', lang),
            relationship?.thesis || '',
            ...(themeSpecificLines.love.compatibility || []),
          ],
          [relationship?.caution || '', relationship?.timingHint || ''],
          lang,
          lang === 'ko' ? 360 : 240,
          deps
        )
      : sections.compatibility,
    spouseProfile: sections.spouseProfile
      ? reinforceNarrativeSection(
          sections.spouseProfile,
          [
            buildThemedSectionHook(theme, 'spouseProfile', lang),
            relationship?.action || focusManifestation?.manifestation || '',
            ...(themeSpecificLines.love.spouseProfile || []),
          ],
          [relationship?.strategyLine || ''],
          lang,
          lang === 'ko' ? 360 : 240,
          deps
        )
      : sections.spouseProfile,
    marriageTiming: sections.marriageTiming
      ? reinforceNarrativeSection(
          sections.marriageTiming,
          [
            buildThemedSectionHook(theme, 'marriageTiming', lang),
            relationship?.timingHint || '',
            ...(themeSpecificLines.love.marriageTiming || []),
          ],
          [relationshipTiming?.whyNow || ''],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.marriageTiming,
    strategy: sections.strategy
      ? reinforceNarrativeSection(
          sections.strategy,
          [
            buildThemedSectionHook(theme, 'strategy', lang),
            reportCore.primaryAction,
            reportCore.riskControl,
            ...(themeSpecificLines[theme]?.strategy || []),
          ],
          [reportCore.judgmentPolicy.rationale],
          lang,
          lang === 'ko' ? 360 : 240,
          deps
        )
      : sections.strategy,
    roleFit: sections.roleFit
      ? reinforceNarrativeSection(
          sections.roleFit,
          [
            buildThemedSectionHook(theme, 'roleFit', lang),
            career?.thesis || '',
            career?.action || '',
            ...(themeSpecificLines.career.roleFit || []),
          ],
          [career?.caution || '', career?.timingHint || ''],
          lang,
          lang === 'ko' ? 360 : 240,
          deps
        )
      : sections.roleFit,
    turningPoints: sections.turningPoints
      ? reinforceNarrativeSection(
          sections.turningPoints,
          [
            buildThemedSectionHook(theme, 'turningPoints', lang),
            careerTiming?.whyNow || '',
            ...(themeSpecificLines.career.turningPoints || []),
          ],
          [(career?.timingHint || '') + ' ' + (career?.strategyLine || '')],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.turningPoints,
    incomeStreams: sections.incomeStreams
      ? reinforceNarrativeSection(
          sections.incomeStreams,
          [
            buildThemedSectionHook(theme, 'incomeStreams', lang),
            wealth?.thesis || '',
            wealth?.action || '',
            ...(themeSpecificLines.wealth.incomeStreams || []),
          ],
          [wealth?.strategyLine || ''],
          lang,
          lang === 'ko' ? 360 : 240,
          deps
        )
      : sections.incomeStreams,
    riskManagement: sections.riskManagement
      ? reinforceNarrativeSection(
          sections.riskManagement,
          [
            buildThemedSectionHook(theme, 'riskManagement', lang),
            wealth?.caution || reportCore.primaryCaution,
            ...(themeSpecificLines.wealth.riskManagement || []),
          ],
          [reportCore.riskControl],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.riskManagement,
    prevention: sections.prevention
      ? reinforceNarrativeSection(
          sections.prevention,
          [
            buildThemedSectionHook(theme, 'prevention', lang),
            health?.action || '',
            health?.caution || '',
            ...(themeSpecificLines.health.prevention || []),
          ],
          [health?.strategyLine || ''],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.prevention,
    riskWindows: sections.riskWindows
      ? reinforceNarrativeSection(
          sections.riskWindows,
          [
            buildThemedSectionHook(theme, 'riskWindows', lang),
            healthTiming?.whyNow || '',
            ...(themeSpecificLines.health.riskWindows || []),
          ],
          [health?.timingHint || ''],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.riskWindows,
    recoveryPlan: sections.recoveryPlan
      ? reinforceNarrativeSection(
          sections.recoveryPlan,
          [
            buildThemedSectionHook(theme, 'recoveryPlan', lang),
            health?.action || '',
            reportCore.riskControl,
            ...(themeSpecificLines.health.recoveryPlan || []),
          ],
          [...reportCore.judgmentPolicy.softChecks],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.recoveryPlan,
    dynamics: sections.dynamics
      ? reinforceNarrativeSection(
          sections.dynamics,
          [
            buildThemedSectionHook(theme, 'dynamics', lang),
            ...(themeSpecificLines.family.dynamics || []),
          ],
          [relationship?.strategyLine || ''],
          lang,
          lang === 'ko' ? 360 : 240,
          deps
        )
      : sections.dynamics,
    communication: sections.communication
      ? reinforceNarrativeSection(
          sections.communication,
          [
            buildThemedSectionHook(theme, 'communication', lang),
            ...(themeSpecificLines.family.communication || []),
          ],
          [relationship?.timingHint || ''],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.communication,
    legacy: sections.legacy
      ? reinforceNarrativeSection(
          sections.legacy,
          [
            buildThemedSectionHook(theme, 'legacy', lang),
            ...(themeSpecificLines.family.legacy || []),
          ],
          [reportCore.judgmentPolicy.rationale],
          lang,
          lang === 'ko' ? 340 : 220,
          deps
        )
      : sections.legacy,
    recommendations: [
      ...new Set(
        [
          reportCore.primaryAction,
          focusAdvisory?.action,
          focusAdvisory?.caution,
          ...sections.recommendations,
        ]
          .map((item) => deps.sanitizeUserFacingNarrative(String(item || '').trim()))
          .filter(Boolean)
      ),
    ],
    actionPlan: reinforceNarrativeSection(
      sectionsWithThemeLead.actionPlan,
      [
        buildThemedSectionHook(theme, 'actionPlan', lang),
        reportCore.topDecisionLabel || reportCore.primaryAction,
        reportCore.primaryAction,
        reportCore.primaryCaution,
      ],
      [reportCore.riskControl, reportCore.judgmentPolicy.rationale],
      lang,
      lang === 'ko' ? 420 : 280,
      deps
    ),
  }
}
