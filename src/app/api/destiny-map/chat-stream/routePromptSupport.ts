import { formatCounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import { buildInterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'
import { buildContextSections } from './lib/context-builder'
import { SECTION_PRIORITIES, type PromptSection } from './builders/promptAssembly'
import type { CounselorQuestionAnalysis } from './lib/focusDomain'

export interface MatrixSnapshot {
  totalScore: number
  topLayers: Array<{ layer: number; score: number }>
  highlights: string[]
  crossEvidenceHighlights?: string[]
  synergies: string[]
  drivers: string[]
  cautions: string[]
  calendarSignals: string[]
  overlapTimeline: string[]
  domainScores: Record<string, number>
  confidenceScore?: number
  finalScoreAdjusted?: number
  semanticHints: string[]
  layerThemeBriefs: string[]
  core?: {
    coreHash: string
    overallPhase: string
    overallPhaseLabel: string
    attackPercent: number
    defensePercent: number
    topClaimIds: string[]
    topCautionSignalIds: string[]
    counselorEvidence?: {
      focusDomain?: string
      graphRagEvidenceSummary?: {
        totalAnchors?: number
        totalSets?: number
      }
      topAnchors?: Array<{
        id?: string
        section?: string
        summary?: string
        setCount?: number
      }>
      topClaims?: Array<{
        id?: string
        text?: string
        domain?: string
        signalIds?: string[]
        anchorIds?: string[]
        provenanceSummary?: string
      }>
      scenarioBriefs?: Array<{
        id?: string
        domain?: string
        mainTokens?: string[]
        altTokens?: string[]
      }>
      selectedSignals?: Array<{
        id?: string
        domain?: string
        polarity?: string
        summary?: string
        score?: number
      }>
      strategyBrief?: {
        overallPhase?: string
        overallPhaseLabel?: string
        attackPercent?: number
        defensePercent?: number
      }
      actionFocusDomain?: string
      canonicalBrief?: {
        gradeLabel?: string
        phaseLabel?: string
        actionFocusDomain?: string
        focusRunnerUpDomain?: string
        actionRunnerUpDomain?: string
        topDecisionAction?: string
        topDecisionLabel?: string
        answerThesis?: string
        primaryAction?: string
        primaryCaution?: string
        timingHint?: string
        policyMode?: 'execute' | 'verify' | 'prepare'
        policyRationale?: string
        allowedActions?: string[]
        blockedActions?: string[]
        softChecks?: string[]
        hardStops?: string[]
        latentTopAxes?: string[]
      }
      topTimingWindow?: {
        domain: string
        window: string
        timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
        timingReliabilityBand?: 'low' | 'medium' | 'high'
        timingReliabilityScore?: number
        readinessScore?: number
        triggerScore?: number
        convergenceScore?: number
        precisionReason?: string
        timingConflictMode?: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
        timingConflictNarrative?: string
        whyNow: string
        entryConditions: string[]
        abortConditions: string[]
      }
      projections?: {
        structure?: { headline?: string; summary?: string; reasons?: string[] }
        timing?: { headline?: string; summary?: string; reasons?: string[] }
        conflict?: { headline?: string; summary?: string; reasons?: string[] }
        action?: { headline?: string; summary?: string; reasons?: string[] }
        risk?: { headline?: string; summary?: string; reasons?: string[] }
        evidence?: { headline?: string; summary?: string; reasons?: string[] }
      }
      personModel?: {
        domainStateGraph?: Array<{
          domain?: string
          label?: string
          currentState?: string
          thesis?: string
          firstMove?: string
          holdMove?: string
          supportSignals?: string[]
          pressureSignals?: string[]
        }>
        appliedProfile?: {
          foodProfile?: {
            summary?: string
            helpfulFoods?: string[]
            cautionFoods?: string[]
            rhythmGuidance?: string[]
          }
          lifeRhythmProfile?: {
            summary?: string
            peakWindows?: string[]
            recoveryWindows?: string[]
            regulationMoves?: string[]
          }
          relationshipStyleProfile?: {
            summary?: string
            attractionPatterns?: string[]
            ruptureTriggers?: string[]
            repairMoves?: string[]
          }
          workStyleProfile?: {
            summary?: string
            bestRoles?: string[]
            bestConditions?: string[]
            leverageMoves?: string[]
          }
          moneyStyleProfile?: {
            summary?: string
            earningPattern?: string[]
            leakageRisks?: string[]
            controlRules?: string[]
          }
          environmentProfile?: {
            summary?: string
            preferredSettings?: string[]
            drainSignals?: string[]
            resetActions?: string[]
          }
        }
        eventOutlook?: Array<{
          key?: string
          label?: string
          domain?: string
          status?: string
          readiness?: number
          bestWindow?: string
          summary?: string
          entryConditions?: string[]
          abortConditions?: string[]
          nextMove?: string
        }>
        birthTimeHypotheses?: Array<{
          label?: string
          birthTime?: string
          status?: string
          fitScore?: number
          summary?: string
          supportSignals?: string[]
          cautionSignals?: string[]
          coreDiff?: {
            directAnswer?: string
            actionDomain?: string
            riskDomain?: string
            bestWindow?: string
            branchSummary?: string
          }
        }>
        crossConflictMap?: Array<{
          domain?: string
          label?: string
          status?: string
          strongestTimescale?: string
          summary?: string
          sajuView?: string
          astroView?: string
          resolutionMove?: string
        }>
        pastEventReconstruction?: {
          summary?: string
          markers?: Array<{
            key?: string
            label?: string
            ageWindow?: string
            status?: string
            summary?: string
            evidence?: string[]
          }>
        }
        uncertaintyEnvelope?: {
          summary?: string
          reliableAreas?: string[]
          conditionalAreas?: string[]
          unresolvedAreas?: string[]
        }
      }
      whyStack?: string[]
    }
    quality?: {
      score: number
      grade: string
      warnings: string[]
      dataQuality?: {
        missingFields: string[]
        derivedFields: string[]
        conflictingFields: string[]
        qualityPenalties: string[]
        confidenceReason: string
      }
    }
  }
  globalConflictPolicy?: string
  lowConfidencePolicy?: string
  inputCrossMissing?: string[]
}

function pickMatrixThemeFocus(
  theme: string,
  domainScores: Record<string, number>
): { domain: string; score?: number } {
  const mapping: Record<string, string> = {
    love: 'love',
    family: 'love',
    career: 'career',
    wealth: 'money',
    health: 'health',
    today: 'general',
    month: 'general',
    year: 'general',
    life: 'general',
    chat: 'general',
  }
  const domain = mapping[theme] || 'general'
  return { domain, score: domainScores[domain] }
}

function trimPromptBlock(content: string, maxChars: number): string {
  if (!content) return ''
  const cleaned = content.trim()
  if (!cleaned) return ''
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars).trim()}\n...` : cleaned
}

type ProtectedTrimOptions = {
  headerLines?: string[]
  protectedPrefixes?: string[]
}

function trimPromptBlockWithProtection(
  content: string,
  maxChars: number,
  options: ProtectedTrimOptions
): string {
  if (!content) return ''
  const cleaned = content.trim()
  if (!cleaned) return ''
  if (cleaned.length <= maxChars) return cleaned

  const lines = cleaned.split('\n')
  const protectedPrefixes = options.protectedPrefixes || []
  const headerLines = new Set(options.headerLines || [])
  const protectedLines: string[] = []
  const protectedSeen = new Set<string>()

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const isProtected =
      headerLines.has(line) || protectedPrefixes.some((prefix) => line.startsWith(prefix))
    if (!isProtected || protectedSeen.has(line)) continue
    protectedSeen.add(line)
    protectedLines.push(line)
  }

  const protectedBlock = protectedLines.join('\n').trim()
  if (!protectedBlock) {
    return trimPromptBlock(cleaned, maxChars)
  }

  const maxBodyChars = Math.max(0, maxChars - protectedBlock.length - 2)
  const remainingLines = lines.filter((rawLine) => {
    const line = rawLine.trim()
    if (!line) return false
    return !protectedSeen.has(line)
  })
  const remainder = trimPromptBlock(remainingLines.join('\n'), maxBodyChars)

  if (!remainder) return protectedBlock
  return `${protectedBlock}\n${remainder}`.trim()
}

function trimCounselorEvidenceBlock(content: string, maxChars: number): string {
  return trimPromptBlockWithProtection(content, maxChars, {
    headerLines: [
      '[Counselor Answer Plan]',
      '[Current Read]',
      '[Timing]',
      '[Branch Options]',
      '[Risk Guardrails]',
    ],
    protectedPrefixes: [
      'answer=',
      'action_focus=',
      'risk_focus=',
      'opening_rationale=',
      'next_move=',
      'current_direct=',
      'current_why=',
      'current_risk=',
      'window=',
      'why_now=',
      'why_not_yet=',
      'branch_1=',
      'branch_1_entry=',
      'branch_1_stop=',
      'branch_1_next=',
      'risk=',
      'hard_stop_1=',
    ],
  })
}

function trimThemeAppliedContextBlock(content: string, maxChars: number): string {
  return trimPromptBlockWithProtection(content, maxChars, {
    headerLines: ['[Theme Applied Context]', '[Theme Event Condition Packet]'],
    protectedPrefixes: [
      'theme_domain=',
      'domain_state=',
      'domain_read=',
      'domain_first_move=',
      'domain_hold=',
      'condition_1_',
      'condition_2_',
      'birth_hypothesis_1',
      'birth_hypothesis_2',
      'conflict_1_',
      'conflict_2_',
      'past_reconstruction=',
      'past_marker_1',
      'event_1=',
      'event_1_summary=',
      'event_1_window=',
      'event_1_next=',
      'uncertainty=',
      'conditional_1=',
    ],
  })
}

function createPromptBlock(
  name: string,
  content: string,
  priority: number,
  maxChars: number
): PromptSection | null {
  const trimmed = trimPromptBlock(content, maxChars)
  if (!trimmed) return null
  return { name, content: trimmed, priority }
}

function firstNonEmptyBlock(...blocks: string[]): string {
  return blocks.find((block) => block && block.trim().length > 0) || ''
}

function isCounselorCostOptimized(): boolean {
  const explicit = process.env.COUNSELOR_COST_OPTIMIZED?.trim().toLowerCase()
  if (explicit) return explicit === 'true' || explicit === '1' || explicit === 'yes'
  const shared = process.env.AI_BACKEND_COST_OPTIMIZED?.trim().toLowerCase()
  return shared === 'true' || shared === '1' || shared === 'yes'
}

function isRelationshipTheme(theme: string): boolean {
  return theme === 'love' || theme === 'family'
}

function buildThemeSpecificAppliedContext(
  snapshot: MatrixSnapshot | null,
  lang: string,
  theme: string
): string {
  const personModel = snapshot?.core?.counselorEvidence?.personModel
  if (!personModel) return ''

  const domainStateGraph = personModel.domainStateGraph || []
  const eventOutlook = personModel.eventOutlook || []
  const appliedProfile = personModel.appliedProfile
  const uncertainty = personModel.uncertaintyEnvelope

  const targetDomain = isRelationshipTheme(theme)
    ? 'relationship'
    : theme === 'career'
      ? 'career'
      : theme === 'wealth'
        ? 'wealth'
        : theme === 'health'
          ? 'health'
          : null

  const domainState =
    (targetDomain && domainStateGraph.find((item) => item.domain === targetDomain)) ||
    domainStateGraph[0]
  const eventCandidates =
    theme === 'career'
      ? eventOutlook.filter((item) => item.key === 'careerEntry' || item.domain === 'career')
      : isRelationshipTheme(theme)
        ? eventOutlook.filter(
            (item) =>
              item.key === 'partnerEntry' ||
              item.key === 'commitment' ||
              item.domain === 'relationship'
          )
        : theme === 'wealth'
          ? eventOutlook.filter((item) => item.key === 'moneyBuild' || item.domain === 'wealth')
          : theme === 'health'
            ? eventOutlook.filter((item) => item.key === 'healthReset' || item.domain === 'health')
            : eventOutlook.slice(0, 2)
  const birthTimeHypothesis = (personModel.birthTimeHypotheses || []).slice(0, 2)
  const crossConflict = (personModel.crossConflictMap || []).slice(0, 2)
  const pastMarkers = personModel.pastEventReconstruction?.markers || []

  const profileLines =
    theme === 'career'
      ? [
          appliedProfile?.workStyleProfile?.summary || '',
          ...((appliedProfile?.workStyleProfile?.bestConditions || []).slice(0, 2) as string[]),
          ...((appliedProfile?.workStyleProfile?.leverageMoves || []).slice(0, 2) as string[]),
        ]
      : isRelationshipTheme(theme)
        ? [
            appliedProfile?.relationshipStyleProfile?.summary || '',
            ...((appliedProfile?.relationshipStyleProfile?.attractionPatterns || []).slice(
              0,
              2
            ) as string[]),
            ...((appliedProfile?.relationshipStyleProfile?.repairMoves || []).slice(
              0,
              2
            ) as string[]),
          ]
        : theme === 'wealth'
          ? [
              appliedProfile?.moneyStyleProfile?.summary || '',
              ...((appliedProfile?.moneyStyleProfile?.earningPattern || []).slice(
                0,
                2
              ) as string[]),
              ...((appliedProfile?.moneyStyleProfile?.controlRules || []).slice(0, 2) as string[]),
            ]
          : theme === 'health'
            ? [
                appliedProfile?.lifeRhythmProfile?.summary || '',
                ...((appliedProfile?.lifeRhythmProfile?.recoveryWindows || []).slice(
                  0,
                  2
                ) as string[]),
                ...((appliedProfile?.foodProfile?.rhythmGuidance || []).slice(0, 2) as string[]),
              ]
            : [
                appliedProfile?.lifeRhythmProfile?.summary || '',
                appliedProfile?.environmentProfile?.summary || '',
                ...(appliedProfile?.lifeRhythmProfile?.regulationMoves || []).slice(0, 2),
              ]

  const eventConditionLines = eventCandidates
    .slice(0, 2)
    .flatMap((event, index) => [
      event.label ? `condition_${index + 1}_label=${event.label}` : '',
      event.status ? `condition_${index + 1}_status=${event.status}` : '',
      event.bestWindow ? `condition_${index + 1}_window=${event.bestWindow}` : '',
      event.summary ? `condition_${index + 1}_summary=${event.summary}` : '',
      ...((event.entryConditions || [])
        .slice(0, 2)
        .map(
          (item, itemIndex) => `condition_${index + 1}_entry_${itemIndex + 1}=${item}`
        ) as string[]),
      ...((event.abortConditions || [])
        .slice(0, 2)
        .map(
          (item, itemIndex) => `condition_${index + 1}_abort_${itemIndex + 1}=${item}`
        ) as string[]),
      event.nextMove ? `condition_${index + 1}_next=${event.nextMove}` : '',
    ])

  const lines = [
    '[Theme Applied Context]',
    targetDomain ? `theme_domain=${targetDomain}` : `theme_domain=${theme || 'general'}`,
    domainState?.label ? `domain_label=${domainState.label}` : '',
    domainState?.currentState ? `domain_state=${domainState.currentState}` : '',
    domainState?.thesis ? `domain_read=${domainState.thesis}` : '',
    domainState?.firstMove ? `domain_first_move=${domainState.firstMove}` : '',
    domainState?.holdMove ? `domain_hold=${domainState.holdMove}` : '',
    ...(domainState?.supportSignals || [])
      .slice(0, 2)
      .map((item, index) => `support_${index + 1}=${item}`),
    ...(domainState?.pressureSignals || [])
      .slice(0, 2)
      .map((item, index) => `pressure_${index + 1}=${item}`),
    '[Theme Event Condition Packet]',
    ...eventConditionLines,
    ...birthTimeHypothesis.flatMap((item, index) => [
      item.label ? `birth_hypothesis_${index + 1}=${item.label}` : '',
      item.birthTime ? `birth_hypothesis_${index + 1}_time=${item.birthTime}` : '',
      item.status ? `birth_hypothesis_${index + 1}_status=${item.status}` : '',
      typeof item.fitScore === 'number'
        ? `birth_hypothesis_${index + 1}_fit=${item.fitScore.toFixed(2)}`
        : '',
      item.summary ? `birth_hypothesis_${index + 1}_summary=${item.summary}` : '',
      item.coreDiff?.actionDomain
        ? `birth_hypothesis_${index + 1}_action=${item.coreDiff.actionDomain}`
        : '',
      item.coreDiff?.riskDomain
        ? `birth_hypothesis_${index + 1}_risk=${item.coreDiff.riskDomain}`
        : '',
      item.coreDiff?.bestWindow
        ? `birth_hypothesis_${index + 1}_window=${item.coreDiff.bestWindow}`
        : '',
      item.coreDiff?.branchSummary
        ? `birth_hypothesis_${index + 1}_branch=${item.coreDiff.branchSummary}`
        : '',
    ]),
    ...crossConflict.flatMap((item, index) => [
      item.label ? `conflict_${index + 1}_label=${item.label}` : '',
      item.status ? `conflict_${index + 1}_status=${item.status}` : '',
      item.strongestTimescale ? `conflict_${index + 1}_window=${item.strongestTimescale}` : '',
      item.summary ? `conflict_${index + 1}_summary=${item.summary}` : '',
      item.resolutionMove ? `conflict_${index + 1}_resolve=${item.resolutionMove}` : '',
    ]),
    personModel.pastEventReconstruction?.summary
      ? `past_reconstruction=${personModel.pastEventReconstruction.summary}`
      : '',
    ...pastMarkers
      .slice(0, 2)
      .flatMap((item, index) => [
        item.label ? `past_marker_${index + 1}=${item.label}` : '',
        item.ageWindow ? `past_marker_${index + 1}_age=${item.ageWindow}` : '',
        item.summary ? `past_marker_${index + 1}_summary=${item.summary}` : '',
      ]),
    ...eventCandidates
      .slice(0, 2)
      .flatMap((event, index) => [
        event.label ? `event_${index + 1}=${event.label}` : '',
        event.summary ? `event_${index + 1}_summary=${event.summary}` : '',
        event.bestWindow ? `event_${index + 1}_window=${event.bestWindow}` : '',
        event.nextMove ? `event_${index + 1}_next=${event.nextMove}` : '',
        ...((event.entryConditions || [])
          .slice(0, 1)
          .map((item) => `event_${index + 1}_entry=${item}`) as string[]),
        ...((event.abortConditions || [])
          .slice(0, 1)
          .map((item) => `event_${index + 1}_stop=${item}`) as string[]),
      ]),
    ...profileLines
      .filter(Boolean)
      .slice(0, 4)
      .map((item, index) => `profile_${index + 1}=${item}`),
    uncertainty?.summary ? `uncertainty=${uncertainty.summary}` : '',
    ...((uncertainty?.conditionalAreas || [])
      .slice(0, 2)
      .map((item, index) => `conditional_${index + 1}=${item}`) as string[]),
  ].filter(Boolean)

  if (lines.length <= 1) return ''

  if (lang === 'ko') {
    return [
      ...lines,
      '이 블록은 질문 테마에 맞는 적용층입니다. 답변에서는 이 테마와 직접 연결되는 event/profile/domain lines를 우선 사용하고, 다른 영역은 보조 근거로만 쓰세요.',
    ].join('\n')
  }

  return [
    ...lines,
    'This block is the theme-specific applied layer. Prioritize event/profile/domain lines that directly fit the current question theme, and use other domains only as support.',
  ].join('\n')
}

export function buildCompactPromptSections(params: {
  contextSections: ReturnType<typeof buildContextSections>
  longTermMemorySection: string
  predictionSection: string
  theme: string
}): PromptSection[] {
  const { contextSections, longTermMemorySection, predictionSection, theme } = params
  const costOptimized = isCounselorCostOptimized()
  const sections: Array<PromptSection | null> = []

  sections.push(
    createPromptBlock(
      'base',
      contextSections.v3Snapshot ? `[Saju/Astro Base]\n${contextSections.v3Snapshot}` : '',
      SECTION_PRIORITIES.BASE_DATA,
      costOptimized ? 1200 : 1800
    )
  )

  const timingBlock = firstNonEmptyBlock(
    contextSections.timingScoreSection,
    contextSections.daeunTransitSection,
    contextSections.enhancedAnalysisSection
  )
  sections.push(
    createPromptBlock('timing', timingBlock, SECTION_PRIORITIES.TIMING, costOptimized ? 520 : 900)
  )

  const advancedBlock = firstNonEmptyBlock(
    contextSections.advancedAstroSection,
    contextSections.tier4AdvancedSection
  )
  sections.push(
    createPromptBlock(
      'advanced',
      advancedBlock,
      SECTION_PRIORITIES.TIER3_ASTRO,
      costOptimized ? 520 : 900
    )
  )

  sections.push(
    createPromptBlock(
      'memory',
      longTermMemorySection,
      SECTION_PRIORITIES.PAST_ANALYSIS,
      costOptimized ? 320 : 700
    )
  )

  sections.push(
    createPromptBlock(
      'prediction',
      predictionSection,
      SECTION_PRIORITIES.DATE_RECOMMENDATION,
      costOptimized ? 260 : 500
    )
  )

  if (theme === 'life' || theme === 'year' || theme === 'month') {
    sections.push(
      createPromptBlock(
        'life-trend',
        firstNonEmptyBlock(
          contextSections.lifePredictionSection,
          contextSections.pastAnalysisSection
        ),
        SECTION_PRIORITIES.LIFE_PREDICTION,
        costOptimized ? 360 : 700
      )
    )
  }

  return sections.filter((section): section is PromptSection => Boolean(section))
}

export function buildMatrixProfileSection(
  snapshot: MatrixSnapshot | null,
  lang: string,
  theme: string,
  questionAnalysis?: CounselorQuestionAnalysis | null
): string {
  if (!snapshot) {
    return ''
  }
  const costOptimized = isCounselorCostOptimized()

  const crossEvidenceText = snapshot.crossEvidenceHighlights?.slice(0, 3).join(' | ') || 'none'
  const cautionText = snapshot.cautions.slice(0, 3).join(' | ') || 'none'
  const corePhaseText = snapshot.core
    ? `${snapshot.core.overallPhaseLabel}(${snapshot.core.attackPercent}/${snapshot.core.defensePercent})`
    : 'none'
  const focus = pickMatrixThemeFocus(theme, snapshot.domainScores)
  const hasCommRisk = /communication|mercury|수성|소통|오해|문서|계약/i.test(cautionText)
  const counselorEvidenceText = formatCounselorEvidencePacket(
    snapshot.core?.counselorEvidence as Parameters<typeof formatCounselorEvidencePacket>[0],
    lang === 'ko' ? 'ko' : 'en'
  )
  const compactCounselorEvidenceText = trimCounselorEvidenceBlock(
    counselorEvidenceText,
    costOptimized ? 320 : 700
  )
  const interpretedAnswer = buildInterpretedAnswerContract({
    packet: snapshot.core?.counselorEvidence as Parameters<typeof formatCounselorEvidencePacket>[0],
    frame: questionAnalysis?.frame || 'open_counseling',
    primaryDomain: (questionAnalysis?.primaryDomain || 'personality') as
      | 'personality'
      | 'career'
      | 'relationship'
      | 'wealth'
      | 'health'
      | 'spirituality'
      | 'timing'
      | 'move',
  })
  const interpretedAnswerText = interpretedAnswer
    ? trimPromptBlockWithProtection(
        [
          '[Interpreted Answer Contract]',
          `frame=${interpretedAnswer.questionFrame}`,
          `primary_domain=${interpretedAnswer.primaryDomain}`,
          `direct_answer=${interpretedAnswer.directAnswer}`,
          ...interpretedAnswer.why.slice(0, 3).map((line, index) => `why_${index + 1}=${line}`),
          `timing_best=${interpretedAnswer.timing.bestWindow || 'none'}`,
          `timing_now=${interpretedAnswer.timing.now || 'none'}`,
          ...(interpretedAnswer.timing.next
            ? [`timing_next=${interpretedAnswer.timing.next}`]
            : []),
          ...(interpretedAnswer.timing.later
            ? [`timing_later=${interpretedAnswer.timing.later}`]
            : []),
          ...interpretedAnswer.conditions.entry
            .slice(0, 2)
            .map((line, index) => `entry_${index + 1}=${line}`),
          ...interpretedAnswer.conditions.abort
            .slice(0, 2)
            .map((line, index) => `abort_${index + 1}=${line}`),
          ...interpretedAnswer.branches
            .slice(0, 2)
            .flatMap((branch, index) => [
              `path_${index + 1}=${branch.summary}`,
              `path_${index + 1}_next=${branch.nextMove}`,
            ]),
          ...interpretedAnswer.uncertainty
            .slice(0, 2)
            .map((line, index) => `uncertainty_${index + 1}=${line}`),
          `next_move=${interpretedAnswer.nextMove}`,
        ].join('\n'),
        costOptimized ? 280 : 640,
        {
          headerLines: ['[Interpreted Answer Contract]'],
          protectedPrefixes: [
            'frame=',
            'primary_domain=',
            'direct_answer=',
            'why_1=',
            'timing_best=',
            'timing_now=',
            'entry_1=',
            'abort_1=',
            'path_1=',
            'next_move=',
          ],
        }
      )
    : ''
  const themeAppliedContext = trimThemeAppliedContextBlock(
    buildThemeSpecificAppliedContext(snapshot, lang, theme),
    costOptimized ? 520 : 1100
  )

  if (lang === 'ko') {
    return [
      '[Destiny Matrix Profile Context]',
      `theme_focus=${focus.domain}${typeof focus.score === 'number' ? `(${focus.score.toFixed(1)})` : ''}`,
      `core_phase=${corePhaseText}`,
      `cross_evidence=${crossEvidenceText}`,
      `cautions=${cautionText}`,
      interpretedAnswerText,
      compactCounselorEvidenceText,
      themeAppliedContext,
      '첫 두 문장은 질문에 대한 직접 답으로 시작하고, 교차 근거는 설명 보강에만 사용하세요.',
      '점수, 레이어, 내부 id를 늘어놓지 말고 지금 먼저 움직여야 할 영역과 가장 조심해야 할 변수만 분명하게 말하세요.',
      hasCommRisk
        ? '문서나 소통 리스크가 보이면 서명·확정·송금 같은 비가역 행동은 바로 밀지 마세요.'
        : '추천은 반드시 주의 문장과 충돌하지 않게 유지하세요.',
    ].join('\n')
  }

  return [
    '[Destiny Matrix Profile Context]',
    `theme_focus=${focus.domain}${typeof focus.score === 'number' ? `(${focus.score.toFixed(1)})` : ''}`,
    `core_phase=${corePhaseText}`,
    `cross_evidence=${crossEvidenceText}`,
    `cautions=${cautionText}`,
    interpretedAnswerText,
    compactCounselorEvidenceText,
    themeAppliedContext,
    'Answer directly in the first 1-2 sentences, and use cross_evidence only as supporting explanation.',
    'Prioritize the immediate action area, the main risk, and the realistic branches over raw score or layer dumps.',
    hasCommRisk
      ? 'If communication/document risk is present, do not recommend immediate signing/finalizing; prefer verification actions.'
      : 'Ensure recommendations never contradict cautions.',
  ].join('\n')
}
export function mapFocusDomainToPromptTheme(
  focusDomain: string | null | undefined,
  fallback: string
): string {
  switch (focusDomain) {
    case 'relationship':
      return 'love'
    case 'career':
      return 'career'
    case 'wealth':
      return 'wealth'
    case 'health':
      return 'health'
    case 'move':
      return 'life'
    case 'timing':
    case 'personality':
    case 'spirituality':
      return 'life'
    default:
      return fallback
  }
}

export function buildFocusDomainDepthGuide(
  focusDomain: string | null | undefined,
  lang: string
): string {
  const domain = focusDomain || 'personality'
  if (lang === 'ko') {
    switch (domain) {
      case 'relationship':
        return [
          '[Core Focus Guide]',
          '- 관계 질문은 감정 해석보다 거리, 경계, 기대치 조정 순서로 답합니다.',
          '- 실행 답변은 commitment 강행보다 clarify / boundary / preparation을 우선 검토합니다.',
        ].join('\n')
      case 'career':
        return [
          '[Core Focus Guide]',
          '- 커리어 질문은 기회 자체보다 역할, 조건, 검토 순서를 먼저 답합니다.',
          '- 실행 답변은 commit보다 review / negotiate / staged execution을 우선 검토합니다.',
        ].join('\n')
      case 'wealth':
        return [
          '[Core Focus Guide]',
          '- 재정 질문은 수익 기대보다 구조, 누수, 조건 검증을 먼저 답합니다.',
          '- 실행 답변은 allocation / review / staged commitment를 우선 검토합니다.',
        ].join('\n')
      case 'health':
        return [
          '[Core Focus Guide]',
          '- 건강 질문은 의지보다 회복, 과부하, 루틴 준수 기준으로 답합니다.',
          '- 실행 답변은 push보다 recovery / boundary / reduce-load를 우선 검토합니다.',
        ].join('\n')
      case 'move':
        return [
          '[Core Focus Guide]',
          '- 이동 질문은 결론보다 경로, 거점, 검증 순서로 답합니다.',
          '- 실행 답변은 relocate 강행보다 route recheck / commute restructure / staged move를 우선 검토합니다.',
        ].join('\n')
      default:
        return [
          '[Core Focus Guide]',
          '- 종합 질문도 하나의 우선 축으로 압축해 답합니다.',
          '- 설명보다 지금 먼저 해야 할 검토 또는 행동 하나를 분명히 제시합니다.',
        ].join('\n')
    }
  }

  switch (domain) {
    case 'relationship':
      return [
        '[Core Focus Guide]',
        '- Answer relationship questions through distance, boundaries, and expectation alignment.',
        '- Prefer clarify / boundary / preparation over forcing commitment.',
      ].join('\n')
    case 'career':
      return [
        '[Core Focus Guide]',
        '- Answer career questions through role, terms, and review order before expansion.',
        '- Prefer review / negotiate / staged execution over impulsive commitment.',
      ].join('\n')
    case 'wealth':
      return [
        '[Core Focus Guide]',
        '- Answer money questions through structure, leakage, and term validation before upside.',
        '- Prefer allocation / review / staged commitment over one-shot bets.',
      ].join('\n')
    case 'health':
      return [
        '[Core Focus Guide]',
        '- Answer health questions through recovery, overload, and routine compliance.',
        '- Prefer recovery / boundary / load reduction over willpower-heavy pushes.',
      ].join('\n')
    case 'move':
      return [
        '[Core Focus Guide]',
        '- Answer movement questions through route, base, and verification order.',
        '- Prefer route recheck / commute restructure / staged move over hard relocation pushes.',
      ].join('\n')
    default:
      return [
        '[Core Focus Guide]',
        '- Even broad questions must collapse into one operational priority.',
        '- Give one clear next move before expanding the explanation.',
      ].join('\n')
  }
}

export function buildFocusDomainVoiceGuide(
  focusDomain: string | null | undefined,
  lang: string
): string {
  const domain = focusDomain || 'personality'

  if (lang === 'ko') {
    switch (domain) {
      case 'relationship':
        return [
          '[Voice Guide]',
          '- 한 줄 결론은 감정 단정이 아니라 관계 거리감, 대화 가능성, 확인 포인트 중심으로 씁니다.',
          '- 실행 계획은 "대화를 어떻게 꺼낼지", "어떤 표현을 줄일지", "어떤 반응을 기다릴지"처럼 관계 운영 언어를 씁니다.',
          '- 주의/재확인은 자존심 싸움, 추측성 확신, 답을 재촉하는 행동을 경계하는 문장으로 씁니다.',
        ].join('\n')
      case 'career':
        return [
          '[Voice Guide]',
          '- 한 줄 결론은 가능성보다 역할, 책임 범위, 우선순위가 맞는지 중심으로 씁니다.',
          '- 실행 계획은 "무엇을 먼저 끝낼지", "무슨 조건을 문서로 확인할지", "어디까지 협상할지"처럼 실무 언어를 씁니다.',
          '- 주의/재확인은 성급한 확정, 책임 범위 불명확, 일정 과적재를 경계하는 문장으로 씁니다.',
        ].join('\n')
      case 'wealth':
        return [
          '[Voice Guide]',
          '- 한 줄 결론은 기대 수익보다 현금 흐름, 손실 상한, 조건 검증을 먼저 말합니다.',
          '- 실행 계획은 "얼마까지 허용할지", "어떤 숫자를 다시 볼지", "무슨 조건이 갖춰져야 들어갈지"처럼 숫자/조건 언어를 씁니다.',
          '- 주의/재확인은 조급한 베팅, 대충 본 약관, 누수되는 지출을 경계하는 문장으로 씁니다.',
        ].join('\n')
      case 'health':
        return [
          '[Voice Guide]',
          '- 한 줄 결론은 의지보다 회복 상태, 과부하 여부, 루틴 유지 가능성을 먼저 말합니다.',
          '- 실행 계획은 "무엇을 줄일지", "어떤 회복 블록을 지킬지", "언제 쉬어야 하는지"처럼 회복 언어를 씁니다.',
          '- 주의/재확인은 무리한 버티기, 수면 붕괴, 통증 무시를 경계하는 문장으로 씁니다.',
        ].join('\n')
      case 'move':
      case 'timing':
        return [
          '[Voice Guide]',
          '- 한 줄 결론은 가도 되는지보다 지금 움직일 창이 열렸는지, 더 봐야 하는지 중심으로 씁니다.',
          '- 실행 계획은 "언제 다시 볼지", "무슨 신호가 맞아야 하는지", "어떤 조건이면 미룰지"처럼 타이밍 언어를 씁니다.',
          '- 주의/재확인은 성급한 확정, 버퍼 없는 일정, 확인 없는 이동을 경계하는 문장으로 씁니다.',
        ].join('\n')
      default:
        return [
          '[Voice Guide]',
          '- 한 줄 결론은 추상적 성향 설명보다 지금 질문에 대한 운영 판단으로 시작합니다.',
          '- 실행 계획은 오늘 바로 할 수 있는 한두 가지 행동으로 씁니다.',
          '- 주의/재확인은 과장된 확신, 반복 실수, 확인 없는 확정을 경계하는 문장으로 씁니다.',
        ].join('\n')
    }
  }

  switch (domain) {
    case 'relationship':
      return [
        '[Voice Guide]',
        '- Direct Answer should talk about distance, communication viability, and what still needs confirmation.',
        '- Action Plan should sound like relationship management: what to say, what to stop, what response to wait for.',
        '- Avoid/Recheck should warn against projection, emotional overconfidence, and forcing the pace.',
      ].join('\n')
    case 'career':
      return [
        '[Voice Guide]',
        '- Direct Answer should focus on role fit, scope, and order of execution more than vague opportunity.',
        '- Action Plan should sound operational: what to finish first, what to verify in writing, what to negotiate.',
        '- Avoid/Recheck should warn against premature commitment, unclear ownership, and schedule overload.',
      ].join('\n')
    case 'wealth':
      return [
        '[Voice Guide]',
        '- Direct Answer should focus on cash flow, downside, and validation before upside.',
        '- Action Plan should sound numeric and conditional: limits, thresholds, and missing terms.',
        '- Avoid/Recheck should warn against rushed bets, sloppy term review, and recurring leakage.',
      ].join('\n')
    case 'health':
      return [
        '[Voice Guide]',
        '- Direct Answer should focus on recovery status, overload, and sustainability over pure willpower.',
        '- Action Plan should sound restorative: what to reduce, what to protect, when to rest.',
        '- Avoid/Recheck should warn against pushing through exhaustion and ignoring repeated symptoms.',
      ].join('\n')
    case 'move':
    case 'timing':
      return [
        '[Voice Guide]',
        '- Direct Answer should focus on whether the window is truly open or still conditional.',
        '- Action Plan should sound timing-led: when to revisit, what has to align, what delays the move.',
        '- Avoid/Recheck should warn against hard commitment without buffer, confirmation, or sequencing.',
      ].join('\n')
    default:
      return [
        '[Voice Guide]',
        '- Direct Answer should start with an operational read, not an abstract personality summary.',
        '- Action Plan should give one or two concrete next moves.',
        '- Avoid/Recheck should warn against exaggerated certainty and preventable repetition.',
      ].join('\n')
  }
}
