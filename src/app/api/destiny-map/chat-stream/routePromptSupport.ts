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
      structuredEvidenceSummary?: {
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

function trimFocusAppliedContextBlock(content: string, maxChars: number): string {
  return trimPromptBlockWithProtection(content, maxChars, {
    headerLines: ['[Focus Applied Context]', '[Focus Event Condition Packet]'],
    protectedPrefixes: [
      'focus_domain=',
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

function buildFocusAppliedContext(
  snapshot: MatrixSnapshot | null,
  lang: string,
  focusDomain: string | null | undefined
): string {
  const personModel = snapshot?.core?.counselorEvidence?.personModel
  if (!personModel) return ''

  const domainStateGraph = personModel.domainStateGraph || []
  const eventOutlook = personModel.eventOutlook || []
  const appliedProfile = personModel.appliedProfile
  const uncertainty = personModel.uncertaintyEnvelope

  const targetDomain =
    focusDomain === 'relationship' ||
    focusDomain === 'career' ||
    focusDomain === 'wealth' ||
    focusDomain === 'health'
      ? focusDomain
      : null

  const domainState =
    (targetDomain && domainStateGraph.find((item) => item.domain === targetDomain)) ||
    domainStateGraph[0]
  const eventCandidates =
    targetDomain === 'career'
      ? eventOutlook.filter((item) => item.key === 'careerEntry' || item.domain === 'career')
      : targetDomain === 'relationship'
        ? eventOutlook.filter(
            (item) =>
              item.key === 'partnerEntry' ||
              item.key === 'commitment' ||
              item.domain === 'relationship'
          )
        : targetDomain === 'wealth'
          ? eventOutlook.filter((item) => item.key === 'moneyBuild' || item.domain === 'wealth')
          : targetDomain === 'health'
            ? eventOutlook.filter((item) => item.key === 'healthReset' || item.domain === 'health')
            : eventOutlook.slice(0, 2)
  const birthTimeHypothesis = (personModel.birthTimeHypotheses || []).slice(0, 2)
  const crossConflict = (personModel.crossConflictMap || []).slice(0, 2)
  const pastMarkers = personModel.pastEventReconstruction?.markers || []

  const profileLines =
    targetDomain === 'career'
      ? [
          appliedProfile?.workStyleProfile?.summary || '',
          ...((appliedProfile?.workStyleProfile?.bestConditions || []).slice(0, 2) as string[]),
          ...((appliedProfile?.workStyleProfile?.leverageMoves || []).slice(0, 2) as string[]),
        ]
      : targetDomain === 'relationship'
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
        : targetDomain === 'wealth'
          ? [
              appliedProfile?.moneyStyleProfile?.summary || '',
              ...((appliedProfile?.moneyStyleProfile?.earningPattern || []).slice(
                0,
                2
              ) as string[]),
              ...((appliedProfile?.moneyStyleProfile?.controlRules || []).slice(0, 2) as string[]),
            ]
          : targetDomain === 'health'
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
    '[Focus Applied Context]',
    targetDomain ? `focus_domain=${targetDomain}` : `focus_domain=${focusDomain || 'general'}`,
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
    '[Focus Event Condition Packet]',
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
      '이 블록은 질문 초점 도메인에 맞는 적용층입니다. 답변에서는 이 초점과 직접 연결되는 event/profile/domain lines를 우선 사용하고, 다른 영역은 보조 근거로만 쓰세요.',
    ].join('\n')
  }

  return [
    ...lines,
    'This block is the focus-domain applied layer. Prioritize event/profile/domain lines that directly fit the current question focus, and use other domains only as support.',
  ].join('\n')
}

export function buildCompactPromptSections(params: {
  contextSections: ReturnType<typeof buildContextSections>
  longTermMemorySection: string
  predictionSection: string
}): PromptSection[] {
  const { contextSections, longTermMemorySection, predictionSection } = params
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

  const lifeTrendBlock = firstNonEmptyBlock(
    contextSections.lifePredictionSection,
    contextSections.pastAnalysisSection
  )
  if (lifeTrendBlock) {
    sections.push(
      createPromptBlock(
        'life-trend',
        lifeTrendBlock,
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
  const focusDomain =
    snapshot.core?.counselorEvidence?.focusDomain || questionAnalysis?.primaryDomain || null
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
  const focusAppliedContext = trimFocusAppliedContextBlock(
    buildFocusAppliedContext(snapshot, lang, focusDomain),
    costOptimized ? 520 : 1100
  )

  if (lang === 'ko') {
    return [
      '[Destiny Matrix Profile Context]',
      `focus_domain=${focusDomain || 'general'}`,
      `core_phase=${corePhaseText}`,
      `cross_evidence=${crossEvidenceText}`,
      `cautions=${cautionText}`,
      interpretedAnswerText,
      compactCounselorEvidenceText,
      focusAppliedContext,
      '첫 두 문장은 질문에 대한 직접 답으로 시작하고, 교차 근거는 설명 보강에만 사용하세요.',
      '점수, 레이어, 내부 id를 늘어놓지 말고 지금 먼저 움직여야 할 영역과 가장 조심해야 할 변수만 분명하게 말하세요.',
      hasCommRisk
        ? '문서나 소통 리스크가 보이면 서명·확정·송금 같은 비가역 행동은 바로 밀지 마세요.'
        : '추천은 반드시 주의 문장과 충돌하지 않게 유지하세요.',
    ].join('\n')
  }

  return [
    '[Destiny Matrix Profile Context]',
    `focus_domain=${focusDomain || 'general'}`,
    `core_phase=${corePhaseText}`,
    `cross_evidence=${crossEvidenceText}`,
    `cautions=${cautionText}`,
    interpretedAnswerText,
    compactCounselorEvidenceText,
    focusAppliedContext,
    'Answer directly in the first 1-2 sentences, and use cross_evidence only as supporting explanation.',
    'Prioritize the immediate action area, the main risk, and the realistic branches over raw score or layer dumps.',
    hasCommRisk
      ? 'If communication/document risk is present, do not recommend immediate signing/finalizing; prefer verification actions.'
      : 'Ensure recommendations never contradict cautions.',
  ].join('\n')
}
