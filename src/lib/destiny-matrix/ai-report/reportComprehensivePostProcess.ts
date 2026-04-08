import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport } from './reportTypes'
import type { ReportCoreViewModel } from './reportCoreHelpers'

type Lang = 'ko' | 'en'

export interface ComprehensivePostProcessDeps {
  sanitizeUserFacingNarrative: (text: string) => string
  formatNarrativeParagraphs: (text: string, lang: Lang) => string
  removeCrossSectionNarrativeRepetition: (
    sections: Record<string, unknown>,
    sectionOrder: string[],
    lang: Lang
  ) => Record<string, unknown>
  getReportDomainLabel: (domain: string, lang: Lang) => string
  getTimingWindowLabel: (window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+', lang: Lang) => string
  buildTimingWindowNarrative: (
    domain: string,
    item: NonNullable<ReportCoreViewModel['domainTimingWindows'][number]>,
    lang: Lang
  ) => string
  findReportCoreAdvisory: (
    reportCore: ReportCoreViewModel,
    domain: string
  ) => ReportCoreViewModel['advisories'][number] | null
  findReportCoreTimingWindow: (
    reportCore: ReportCoreViewModel,
    domain: string
  ) => ReportCoreViewModel['domainTimingWindows'][number] | null
  findReportCoreManifestation: (
    reportCore: ReportCoreViewModel,
    domain: string
  ) => ReportCoreViewModel['manifestations'][number] | null
  renderIntroductionSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderCareerPathSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderRelationshipDynamicsSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderWealthPotentialSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderHealthGuidanceSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderLifeMissionSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
  renderConclusionSection: (
    reportCore: ReportCoreViewModel,
    matrixInput: MatrixCalculationInput,
    lang: Lang
  ) => string
}

function compactComprehensiveNarrative(
  text: string,
  section: 'careerPath' | 'relationshipDynamics' | 'wealthPotential' | 'healthGuidance',
  deps: ComprehensivePostProcessDeps
): string {
  let normalized = deps
    .sanitizeUserFacingNarrative(String(text || '').trim())
    .replace(
      /[가-힣A-Za-z]+\s*은\s*[가-힣]+자리\s*\d+하우스에\s*(?:놓여 있습니다|위치해 있습니다)\.?\s*/gu,
      ''
    )
    .replace(/상위 흐름은\s*([^.!?\n]+)[.!?]?/gu, '지금 상대적으로 힘이 실리는 축은 $1입니다.')
    .replace(/핵심 근거는\s*([^.!?\n]+)[.!?]?/gu, '이 흐름을 받쳐주는 바탕은 $1입니다.')
    .replace(/현재\s*\d+세\s*전후\s*흐름은/gu, '지금 흐름은')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (section === 'careerPath') {
    normalized = normalized
      .replace(
        /^커리어(?:에서는| 흐름은)?[^.]+\.\s*/u,
        '커리어는 일을 더 많이 벌이는 사람보다, 무엇을 끝까지 책임질지 분명한 사람이 결국 앞서갑니다. '
      )
      .replace(/지금 상대적으로 힘이 실리는 축은\s*career[^.]*\./giu, '')
      .replace(/커리어 흐름은\s*지금 열려 있고/gu, '커리어 흐름은 지금 분명히 열려 있고')
      .replace(/직군.?국가 적합도 근거:[^.]+(?:\.\s*[^.]+){0,3}\.?/gu, '')
  }

  if (section === 'relationshipDynamics') {
    normalized = normalized
      .replace(/지금 상대적으로 힘이 실리는 축은\s*relationship[^.]*\./giu, '')
      .replace(/관계 흐름은/gu, '관계에서는')
      .replace(/현재 나이\(약\s*\d+세\)\s*기준으로 우선순위를 정리하세요\.?/gu, '')
      .replace(/(?:\d{1,2}-\d{1,2}세|20-34세|25-29세)[^.]+(?:\.\s*[^.]+){0,1}\.?/gu, '')
      .replace(/배우자 아키타입[^.]+(?:\.\s*[^.]+){0,2}\.?/gu, '')
  }

  if (section === 'wealthPotential') {
    normalized = normalized
      .replace(/재정 흐름은/gu, '재정에서는')
      .replace(/수입 밴드(?:\s*및 점프 이벤트 근거는)?[^.]+(?:\.\s*[^.]+){0,3}\.?/gu, '')
  }

  if (section === 'healthGuidance') {
    normalized = normalized
      .replace(
        /^건강(?:은| 흐름은)?[^.]+\.\s*/u,
        '건강은 버티는 힘보다 회복 속도를 어떻게 관리하느냐에서 차이가 크게 벌어집니다. '
      )
      .replace(/건강 흐름은/gu, '건강에서는')
      .replace(/(?:Moon-Saturn square|용신 화)\s*신호를 근거로 판단 강도를 조절합니다\.?/gu, '')
      .replace(/커리어 확장 신호를 근거로 판단 강도를 조절합니다\.?/gu, '')
      .replace(/특히 조심할 흐름은\s*$/gu, '')
  }

  return normalized.replace(/\s{2,}/g, ' ').trim()
}

function localizeBranchLabel(label: string | undefined | null): string {
  return String(label || '')
    .replace(/_/g, ' ')
    .replace(/\bdistance tuning\b/gi, '거리 조절')
    .replace(/\bcontract negotiation\b/gi, '조건 협상')
    .replace(/\bpromotion review\b/gi, '승진 검토')
    .replace(/\bspecialist track\b/gi, '전문 트랙')
    .replace(/\s+/g, ' ')
    .trim()
}

function applyPremiumVoiceLayerToComprehensiveSections(
  sections: Record<string, unknown>,
  deps: ComprehensivePostProcessDeps
): Record<string, unknown> {
  const next = { ...sections }

  const introduction = String(next.introduction || '').trim()
  if (introduction) {
    next.introduction = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        introduction
          .replace(
            /^이번 종합 리포트의 핵심은[^.]+\.\s*/u,
            '이번 종합 리포트는 가능성을 길게 나열하지 않고, 지금 실제로 판을 움직이는 축부터 바로 짚습니다. '
          )
          .replace(
            /인생의 흐름에서 가장 크게 작용하는 요소는 재정이며,\s*/u,
            '지금 가장 크게 움직이는 축은 재정이며, '
          )
          .replace(/지금 상대적으로 힘이 실리는 축은[^.]+?\.\s*/gu, '')
          .replace(/지금 상대적으로 힘이 실리는 축은\s*[^.]+입니다입니다\.\s*/gu, '')
      ),
      'ko'
    )
  }

  const conclusion = String(next.conclusion || '').trim()
  if (conclusion) {
    next.conclusion = deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(
        conclusion
          .replace(
            /^이번 흐름의 결론은[^.]+\.\s*/u,
            '이번 흐름의 결론은 분명합니다. 재능보다 운영이 결과를 가릅니다. '
          )
          .replace(/지금 결론은\s*([가-힣]+)\s*흐름이/u, '지금 결론에서 $1 흐름은')
      ),
      'ko'
    )
  }

  const relationshipDynamics = String(next.relationshipDynamics || '').trim()
  if (relationshipDynamics) {
    next.relationshipDynamics = deps.formatNarrativeParagraphs(
      compactComprehensiveNarrative(
        relationshipDynamics
          .replace(
            /^관계의 체감 품질은[^.]+\.\s*/u,
            '관계는 감정을 더 크게 보여주는 사람이 아니라, 해석 오차를 먼저 줄이는 사람이 결국 이깁니다. '
          )
          .replace(/관계 타임라인:\s*$/u, ''),
        'relationshipDynamics',
        deps
      ),
      'ko'
    )
  }

  const careerPath = String(next.careerPath || '').trim()
  if (careerPath) {
    next.careerPath = deps.formatNarrativeParagraphs(
      compactComprehensiveNarrative(careerPath, 'careerPath', deps),
      'ko'
    )
  }

  const wealthPotential = String(next.wealthPotential || '').trim()
  if (wealthPotential) {
    next.wealthPotential = deps.formatNarrativeParagraphs(
      compactComprehensiveNarrative(wealthPotential, 'wealthPotential', deps),
      'ko'
    )
  }

  const healthGuidance = String(next.healthGuidance || '').trim()
  if (healthGuidance) {
    next.healthGuidance = deps.formatNarrativeParagraphs(
      compactComprehensiveNarrative(healthGuidance, 'healthGuidance', deps),
      'ko'
    )
  }

  return next
}

export function sanitizeComprehensiveSectionsForUser(
  sections: Record<string, unknown>,
  sectionKeys: string[],
  deps: ComprehensivePostProcessDeps,
  lang: Lang = 'ko'
): Record<string, unknown> {
  const next = { ...sections }
  for (const key of sectionKeys) {
    const current = String(next[key] || '').trim()
    if (!current) continue
    const cleaned =
      lang === 'ko'
        ? deps
            .sanitizeUserFacingNarrative(current)
            .replace(/배우자 아키타입:[\s\S]*?(?=(?:현재 나이|관계 타임라인|$))/g, '')
            .replace(/현재 나이\(약\s*\d+세\)\s*기준으로 우선순위를 정렬하세요\.?/g, '')
            .replace(/(?:\/\s*)?\d{1,2}-\d{1,2}세\s*\(\d+%\):[^.]+\./g, '')
            .replace(/변곡점 Top:\s*/g, '')
            .replace(/전체 점수\/신뢰 요약:\s*/g, '')
            .replace(/상위 도메인:\s*/g, '상위 흐름은 ')
            .replace(/관계 타임라인:\s*$/g, '')
            .replace(/검증/g, '확인')
            .replace(/\s{2,}/g, ' ')
            .trim()
        : deps
            .sanitizeUserFacingNarrative(current)
            .replace(/dominant western element\s+바람/gi, 'dominant western element air')
            .replace(
              /\bwith\s+바람\s+as\s+the\s+dominant\s+western\s+element\b/gi,
              'with air as the dominant western element'
            )
            .replace(/\bdominant element\s+바람\b/gi, 'dominant element air')
            .replace(/격국\s+정재격/gi, 'frame jeongjae')
            .replace(/격국\s+편재격/gi, 'frame pyeonjae')
            .replace(/용신\s+화/gi, 'useful element fire')
            .replace(/용신\s+목/gi, 'useful element wood')
            .replace(/용신\s+수/gi, 'useful element water')
            .replace(/용신\s+금/gi, 'useful element metal')
            .replace(/용신\s+토/gi, 'useful element earth')
            .replace(/대운\s+metal/gi, 'Daeun metal')
            .replace(/대운\s+wood/gi, 'Daeun wood')
            .replace(/대운\s+water/gi, 'Daeun water')
            .replace(/대운\s+fire/gi, 'Daeun fire')
            .replace(/대운\s+earth/gi, 'Daeun earth')
            .replace(/대운/gi, 'Daeun')
            .replace(/세운/gi, 'annual cycle')
            .replace(/월운/gi, 'monthly cycle')
            .replace(/일운/gi, 'daily cycle')
            .replace(/\s{2,}/g, ' ')
            .trim()
    let formatted = deps.formatNarrativeParagraphs(cleaned, lang)
    if (lang === 'en') {
      formatted = formatted
        .replace(/dominant western element\s+바람/gi, 'dominant western element air')
        .replace(/dominant element\s+바람/gi, 'dominant element air')
        .replace(
          /with\s+바람\s+as\s+the\s+dominant\s+western\s+element/gi,
          'with air as the dominant western element'
        )
        .replace(/격국\s+정재격/gi, 'frame jeongjae')
        .replace(/격국\s+편재격/gi, 'frame pyeonjae')
        .replace(/용신\s+화/gi, 'useful element fire')
        .replace(/용신\s+목/gi, 'useful element wood')
        .replace(/용신\s+수/gi, 'useful element water')
        .replace(/용신\s+금/gi, 'useful element metal')
        .replace(/용신\s+토/gi, 'useful element earth')
        .replace(/대운\s+metal/gi, 'Daeun metal')
        .replace(/대운\s+wood/gi, 'Daeun wood')
        .replace(/대운\s+water/gi, 'Daeun water')
        .replace(/대운\s+fire/gi, 'Daeun fire')
        .replace(/대운\s+earth/gi, 'Daeun earth')
        .replace(/\((목)\)/gi, '(wood)')
        .replace(/\((화)\)/gi, '(fire)')
        .replace(/\((수)\)/gi, '(water)')
        .replace(/\((금)\)/gi, '(metal)')
        .replace(/\((토)\)/gi, '(earth)')
        .replace(
          /Key grounding comes from ([^.]+)\.\s+Key grounding comes from \1\./gi,
          'Key grounding comes from $1.'
        )
    }
    next[key] = formatted
  }
  const layered = lang === 'ko' ? applyPremiumVoiceLayerToComprehensiveSections(next, deps) : next
  return deps.removeCrossSectionNarrativeRepetition(layered, [...sectionKeys], lang)
}

export function applyComprehensiveSectionRoleGuards(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  deps: ComprehensivePostProcessDeps,
  lang: Lang
): AIPremiumReport['sections'] {
  if (lang !== 'ko') return sections

  const next: AIPremiumReport['sections'] = { ...sections }
  const focusTiming = deps.findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
  const blockedLabels = (reportCore.judgmentPolicy.blockedActionLabels || []).slice(0, 2)
  const softChecks = (
    reportCore.judgmentPolicy.softCheckLabels ||
    reportCore.judgmentPolicy.softChecks ||
    []
  ).slice(0, 2)
  const focusWindow =
    focusTiming && focusTiming.whyNow
      ? `${deps.getTimingWindowLabel(focusTiming.window, lang)} 구간에서는 ${focusTiming.whyNow}`
      : focusTiming
        ? deps.buildTimingWindowNarrative(reportCore.focusDomain, focusTiming, lang)
        : ''
  const personalityStructure = [
    matrixInput.dayMasterElement ? `원국의 중심은 ${matrixInput.dayMasterElement} 일간입니다.` : '',
    matrixInput.geokguk ? `격국은 ${matrixInput.geokguk}으로 읽힙니다.` : '',
    matrixInput.yongsin ? `용신 축은 ${matrixInput.yongsin}입니다.` : '',
    matrixInput.dominantWesternElement
      ? `서양 쪽에서는 ${matrixInput.dominantWesternElement} 원소가 강하게 작동합니다.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  const finalizeKoSection = (text: string) =>
    deps.formatNarrativeParagraphs(
      deps.sanitizeUserFacingNarrative(text).replace(/검증/g, '확인'),
      'ko'
    )

  const branchLabels = Array.from(
    new Set(
      (reportCore.branchSet || [])
        .slice(0, 3)
        .map((branch) => localizeBranchLabel(branch.label || branch.summary || ''))
        .filter(Boolean)
    )
  )
  const repairKoArtifacts = (text: string) =>
    finalizeKoSection(
      String(text || '')
        .replace(/distance tuning/gi, '거리 조절')
        .replace(/contract negotiation/gi, '조건 협상')
        .replace(/promotion review/gi, '승진 검토')
        .replace(/specialist track/gi, '전문 트랙')
        .replace(/이 구간에서는\s*를\s*한 번에/gu, '이 구간에서는 기준을 한 번에')
        .replace(/강점은\s*를\s*빠르게/gu, '강점은 기준을 빠르게')
        .replace(/약점은\s*이\s*판단 과속/gu, '약점은 판단 과속이')
        .replace(/현실적으로는\s*,\s*/gu, '현실적으로는 ')
        .replace(/현실적인 경로는\s*,\s*/gu, '현실적인 경로는 ')
        .replace(
          /1안은\s*\?+\s*[^.]*\./gu,
          branchLabels.length > 0
            ? `우선 경로는 ${branchLabels.join(', ')} 쪽입니다.`
            : '우선은 비교 가능한 경로부터 좁혀 가는 쪽이 맞습니다.'
        )
    )

  next.introduction = repairKoArtifacts(
    deps.renderIntroductionSection(reportCore, matrixInput, lang)
  )

  next.personalityDeep = repairKoArtifacts(
    [
      personalityStructure,
      '기본 성향의 강점은 구조화와 재정렬이고, 취약점은 해석이 끝나기 전에 확정을 서두를 때 발생합니다.',
      '그래서 이 사람은 속도로 승부를 보기보다 기준을 짧은 문장으로 먼저 고정하고 움직일 때 판단 품질이 올라갑니다.',
    ].join(' ')
  )

  next.careerPath = finalizeKoSection(deps.renderCareerPathSection(reportCore, matrixInput, lang))
  next.relationshipDynamics = finalizeKoSection(
    deps.renderRelationshipDynamicsSection(reportCore, matrixInput, lang)
  )
  next.wealthPotential = finalizeKoSection(
    deps.renderWealthPotentialSection(reportCore, matrixInput, lang)
  )
  next.healthGuidance = finalizeKoSection(
    deps.renderHealthGuidanceSection(reportCore, matrixInput, lang)
  )
  next.lifeMission = repairKoArtifacts(deps.renderLifeMissionSection(reportCore, matrixInput, lang))

  next.timingAdvice = finalizeKoSection(
    [
      focusWindow || reportCore.gradeReason,
      '타이밍의 핵심은 빨리 결정하는 것이 아니라, 확정과 검토를 다른 슬롯으로 분리하는 데 있습니다.',
      softChecks.length > 0 ? '지금은 문서, 합의, 전달 순서를 먼저 고정하는 편이 안전합니다.' : '',
      reportCore.riskControl,
    ]
      .filter(Boolean)
      .join(' ')
  )

  next.actionPlan = finalizeKoSection(
    [
      `우선 행동은 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
      '기본 실행 원칙은 역할·우선순위·기한을 먼저 고정한 뒤 움직이는 것입니다.',
      blockedLabels.length > 0
        ? '반대로 피해야 할 것은 분위기나 압박에 밀려 바로 확정하는 방식입니다.'
        : '',
      reportCore.riskControl,
      '실행은 착수-재확인-확정으로 나누고, 오늘 먼저 닫을 것과 보류할 것을 분리하세요.',
    ]
      .filter(Boolean)
      .join(' ')
  )

  next.turningPoints = repairKoArtifacts(String(next.turningPoints || ''))
  next.futureOutlook = repairKoArtifacts(String(next.futureOutlook || ''))
  next.conclusion = repairKoArtifacts(deps.renderConclusionSection(reportCore, matrixInput, lang))

  return next
}
