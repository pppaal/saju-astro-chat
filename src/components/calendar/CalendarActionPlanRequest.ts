import type { ICPAnalysis } from '@/lib/icp/types'
import type { PersonaAnalysis } from '@/lib/persona/types'
import type { CounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import type { ImportantDate } from './types'
import {
  resolveActionPlanPrecisionMode,
  sanitizeActionPlanAiInsights,
  sanitizeActionPlanAiTimeline,
  type ActionPlanInsights,
  type ActionPlanPrecisionMode,
  type AiTimelineSlot,
} from './CalendarActionPlanAI'

type CleanText = (value: string | undefined, fallback?: string) => string

export type ActionPlanAiPayload = {
  date: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  calendar: Record<string, unknown> | null
  icp: Record<string, unknown> | null
  persona: Record<string, unknown> | null
}

type ParseActionPlanAiResponseResult = {
  timeline: AiTimelineSlot[]
  summary: string | null
  insights: ActionPlanInsights | null
  precisionMode: ActionPlanPrecisionMode
}

export function buildActionPlanAiPayload(input: {
  dateKey: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  baseInfo: ImportantDate | null
  canonicalCore?: CalendarCoreAdapterResult | null
  selectedMatrixPacket: CounselorEvidencePacket | null | undefined
  icpResult: ICPAnalysis | null
  personaResult: PersonaAnalysis | null
  isKo: boolean
  cleanText: CleanText
}): ActionPlanAiPayload {
  const {
    dateKey,
    locale,
    intervalMinutes,
    baseInfo,
    canonicalCore,
    selectedMatrixPacket,
    icpResult,
    personaResult,
    isKo,
    cleanText,
  } = input

  const trimText = (value: string | undefined, max: number) => {
    if (!value) return undefined
    return cleanText(value, '').slice(0, max) || undefined
  }
  const trimList = (list: string[] | undefined, max: number, maxText = 220) => {
    if (!list || list.length === 0) return undefined
    const compact = list
      .map((item) => trimText(item, maxText))
      .filter((item): item is string => Boolean(item))
    return compact.length ? compact.slice(0, max) : undefined
  }

  const compactMatrixPacket = selectedMatrixPacket
    ? {
        focusDomain: trimText(selectedMatrixPacket.focusDomain, 24),
        graphFocusSummary: trimText(
          selectedMatrixPacket.focusDomain && selectedMatrixPacket.topAnchors?.[0]?.summary
            ? `${isKo ? '핵심 교차 근거' : 'Core cross evidence'}: ${
                selectedMatrixPacket.focusDomain
              } · ${selectedMatrixPacket.topAnchors[0].summary}`
            : selectedMatrixPacket.topAnchors?.[0]?.summary,
          220
        ),
        graphRagEvidenceSummary: selectedMatrixPacket.graphRagEvidenceSummary
          ? {
              totalAnchors: selectedMatrixPacket.graphRagEvidenceSummary.totalAnchors,
              totalSets: selectedMatrixPacket.graphRagEvidenceSummary.totalSets,
            }
          : undefined,
        topAnchors: selectedMatrixPacket.topAnchors
          ?.map((anchor) => ({
            id: trimText(anchor.id, 48),
            section: trimText(anchor.section, 32),
            summary: trimText(anchor.summary, 180),
            setCount: anchor.setCount,
          }))
          .filter((anchor) => anchor.id && anchor.summary)
          .slice(0, 3),
        topClaims: selectedMatrixPacket.topClaims
          ?.map((claim) => ({
            id: trimText(claim.id, 48),
            text: trimText(claim.text, 180),
            domain: trimText(claim.domain, 24),
            signalIds: trimList(claim.signalIds, 4, 32),
            anchorIds: trimList(claim.anchorIds, 3, 32),
          }))
          .filter((claim) => claim.id && claim.text)
          .slice(0, 4),
        scenarioBriefs: selectedMatrixPacket.scenarioBriefs
          ?.map((scenario) => ({
            id: trimText(scenario.id, 48),
            domain: trimText(scenario.domain, 24),
            mainTokens: trimList(scenario.mainTokens, 4, 32),
            altTokens: trimList(scenario.altTokens, 4, 32),
          }))
          .filter((scenario) => scenario.id)
          .slice(0, 3),
        selectedSignals: selectedMatrixPacket.selectedSignals
          ?.map((signal) => ({
            id: trimText(signal.id, 48),
            domain: trimText(signal.domain, 24),
            polarity: trimText(signal.polarity, 16),
            summary: trimText(signal.summary, 160),
            score: signal.score,
          }))
          .filter((signal) => signal.id && signal.summary)
          .slice(0, 5),
        strategyBrief: selectedMatrixPacket.strategyBrief
          ? {
              overallPhase: trimText(selectedMatrixPacket.strategyBrief.overallPhase, 24),
              overallPhaseLabel: trimText(selectedMatrixPacket.strategyBrief.overallPhaseLabel, 48),
              attackPercent: selectedMatrixPacket.strategyBrief.attackPercent,
              defensePercent: selectedMatrixPacket.strategyBrief.defensePercent,
            }
          : undefined,
      }
    : undefined

  const compactEvidence = baseInfo?.evidence
    ? {
        matrix: baseInfo.evidence.matrix
          ? {
              domain: baseInfo.evidence.matrix.domain,
              finalScoreAdjusted:
                typeof baseInfo.evidence.matrix.finalScoreAdjusted === 'number'
                  ? Math.max(0, Math.min(10, baseInfo.evidence.matrix.finalScoreAdjusted))
                  : undefined,
              overlapStrength:
                typeof baseInfo.evidence.matrix.overlapStrength === 'number'
                  ? Math.max(0, Math.min(1, baseInfo.evidence.matrix.overlapStrength))
                  : undefined,
              peakLevel: baseInfo.evidence.matrix.peakLevel,
              monthKey: trimText(baseInfo.evidence.matrix.monthKey, 20),
            }
          : undefined,
        cross: baseInfo.evidence.cross
          ? {
              sajuEvidence: trimText(baseInfo.evidence.cross.sajuEvidence, 360),
              astroEvidence: trimText(baseInfo.evidence.cross.astroEvidence, 360),
              sajuDetails: trimList(baseInfo.evidence.cross.sajuDetails, 2, 260),
              astroDetails: trimList(baseInfo.evidence.cross.astroDetails, 2, 260),
              bridges: trimList(baseInfo.evidence.cross.bridges, 2, 260),
            }
          : undefined,
        confidence:
          typeof baseInfo.evidence.confidence === 'number'
            ? Math.max(0, Math.min(100, baseInfo.evidence.confidence))
            : undefined,
        source:
          baseInfo.evidence.source === 'rule' ||
          baseInfo.evidence.source === 'rag' ||
          baseInfo.evidence.source === 'hybrid'
            ? baseInfo.evidence.source
            : undefined,
        matrixVerdict: baseInfo.evidence.matrixVerdict
          ? {
              focusDomain: trimText(baseInfo.evidence.matrixVerdict.focusDomain, 24),
              verdict: trimText(baseInfo.evidence.matrixVerdict.verdict, 180),
              guardrail: trimText(baseInfo.evidence.matrixVerdict.guardrail, 180),
              topClaim: trimText(baseInfo.evidence.matrixVerdict.topClaim, 180),
              topAnchorSummary: trimText(baseInfo.evidence.matrixVerdict.topAnchorSummary, 160),
              phase: trimText(baseInfo.evidence.matrixVerdict.phase, 48),
              attackPercent: baseInfo.evidence.matrixVerdict.attackPercent,
              defensePercent: baseInfo.evidence.matrixVerdict.defensePercent,
            }
          : undefined,
        matrixPacket: compactMatrixPacket,
      }
    : undefined

  const compactCalendar = baseInfo
    ? {
        grade: baseInfo.displayGrade ?? baseInfo.grade,
        displayGrade: baseInfo.displayGrade,
        score: baseInfo.displayScore ?? baseInfo.score,
        displayScore: baseInfo.displayScore,
        categories: trimList(baseInfo.categories, 4, 32),
        bestTimes: trimList(baseInfo.bestTimes, 4, 120),
        warnings: trimList(baseInfo.warnings, 3, 220),
        recommendations: trimList(baseInfo.recommendations, 3, 220),
        sajuFactors: trimList(baseInfo.sajuFactors, 3, 220),
        astroFactors: trimList(baseInfo.astroFactors, 3, 220),
        title: trimText(baseInfo.title, 120),
        summary: trimText(baseInfo.summary, 240),
        ganzhi: trimText(baseInfo.ganzhi, 60),
        transitSunSign: trimText(baseInfo.transitSunSign, 60),
        canonicalCore: canonicalCore
          ? {
              focusDomain: trimText(canonicalCore.focusDomain, 24),
              actionFocusDomain: trimText(canonicalCore.actionFocusDomain, 24),
              riskAxisLabel: trimText(canonicalCore.riskAxisLabel, 80),
              phase: trimText(canonicalCore.phase, 48),
              phaseLabel: trimText(canonicalCore.phaseLabel, 60),
              thesis: trimText(canonicalCore.thesis, 220),
              riskControl: trimText(canonicalCore.riskControl, 220),
              primaryAction: trimText(canonicalCore.primaryAction, 220),
              primaryCaution: trimText(canonicalCore.primaryCaution, 220),
              topDecisionLabel: trimText(canonicalCore.topDecisionLabel || undefined, 220),
              attackPercent: canonicalCore.attackPercent,
              defensePercent: canonicalCore.defensePercent,
              confidence: canonicalCore.confidence,
              judgmentPolicy: canonicalCore.judgmentPolicy
                ? {
                    mode: canonicalCore.judgmentPolicy.mode,
                    rationale: trimText(canonicalCore.judgmentPolicy.rationale, 220),
                    allowedActions: trimList(canonicalCore.judgmentPolicy.allowedActions, 8, 64),
                    allowedActionLabels: trimList(
                      canonicalCore.judgmentPolicy.allowedActionLabels,
                      8,
                      160
                    ),
                    blockedActions: trimList(canonicalCore.judgmentPolicy.blockedActions, 8, 64),
                    blockedActionLabels: trimList(
                      canonicalCore.judgmentPolicy.blockedActionLabels,
                      8,
                      160
                    ),
                    hardStops: trimList(canonicalCore.judgmentPolicy.hardStops, 8, 160),
                    hardStopLabels: trimList(canonicalCore.judgmentPolicy.hardStopLabels, 8, 160),
                    softChecks: trimList(canonicalCore.judgmentPolicy.softChecks, 8, 160),
                    softCheckLabels: trimList(canonicalCore.judgmentPolicy.softCheckLabels, 8, 160),
                  }
                : undefined,
              topTimingWindow: canonicalCore.topTimingWindow
                ? {
                    domain: trimText(canonicalCore.topTimingWindow.domain, 24),
                    window: canonicalCore.topTimingWindow.window,
                    timingGranularity: canonicalCore.topTimingWindow.timingGranularity,
                    precisionReason: trimText(canonicalCore.topTimingWindow.precisionReason, 220),
                    timingConflictNarrative: trimText(
                      canonicalCore.topTimingWindow.timingConflictNarrative,
                      220
                    ),
                    whyNow: trimText(canonicalCore.topTimingWindow.whyNow, 220),
                    entryConditions: trimList(
                      canonicalCore.topTimingWindow.entryConditions,
                      4,
                      160
                    ),
                    abortConditions: trimList(
                      canonicalCore.topTimingWindow.abortConditions,
                      4,
                      160
                    ),
                  }
                : undefined,
              domainTimingWindows: canonicalCore.domainTimingWindows?.slice(0, 6).map((item) => ({
                domain: trimText(item.domain, 24),
                window: item.window,
                timingGranularity: item.timingGranularity,
                precisionReason: trimText(item.precisionReason, 220),
                timingConflictNarrative: trimText(item.timingConflictNarrative, 220),
                whyNow: trimText(item.whyNow, 220),
                entryConditions: trimList(item.entryConditions, 4, 160),
                abortConditions: trimList(item.abortConditions, 4, 160),
              })),
              projections: canonicalCore.projections?.branches
                ? {
                    branches: {
                      summary: trimText(canonicalCore.projections.branches.summary, 220),
                      detailLines: trimList(canonicalCore.projections.branches.detailLines, 4, 180),
                      reasons: trimList(canonicalCore.projections.branches.reasons, 4, 180),
                      nextMoves: trimList(canonicalCore.projections.branches.nextMoves, 4, 180),
                      counterweights: trimList(
                        canonicalCore.projections.branches.counterweights,
                        4,
                        180
                      ),
                    },
                  }
                : undefined,
              singleSubjectView: canonicalCore.singleSubjectView
                ? {
                    directAnswer: trimText(canonicalCore.singleSubjectView.directAnswer, 220),
                    actionAxis: canonicalCore.singleSubjectView.actionAxis
                      ? {
                          domain: trimText(canonicalCore.singleSubjectView.actionAxis.domain, 24),
                          label: trimText(canonicalCore.singleSubjectView.actionAxis.label, 80),
                          nowAction: trimText(
                            canonicalCore.singleSubjectView.actionAxis.nowAction,
                            220
                          ),
                          whyThisFirst: trimText(
                            canonicalCore.singleSubjectView.actionAxis.whyThisFirst,
                            220
                          ),
                        }
                      : undefined,
                    riskAxis: canonicalCore.singleSubjectView.riskAxis
                      ? {
                          domain: trimText(canonicalCore.singleSubjectView.riskAxis.domain, 24),
                          label: trimText(canonicalCore.singleSubjectView.riskAxis.label, 80),
                          warning: trimText(canonicalCore.singleSubjectView.riskAxis.warning, 220),
                          hardStops: trimList(
                            canonicalCore.singleSubjectView.riskAxis.hardStops,
                            4,
                            160
                          ),
                        }
                      : undefined,
                    timingState: canonicalCore.singleSubjectView.timingState
                      ? {
                          bestWindow: trimText(
                            canonicalCore.singleSubjectView.timingState.bestWindow,
                            40
                          ),
                          whyNow: trimText(canonicalCore.singleSubjectView.timingState.whyNow, 220),
                          whyNotYet: trimText(
                            canonicalCore.singleSubjectView.timingState.whyNotYet,
                            220
                          ),
                        }
                      : undefined,
                    branches: canonicalCore.singleSubjectView.branches
                      ?.map((branch) => ({
                        label: trimText(branch.label, 80),
                        summary: trimText(branch.summary, 180),
                        entryConditions: trimList(branch.entryConditions, 4, 160),
                        abortConditions: trimList(branch.abortConditions, 4, 160),
                        nextMove: trimText(branch.nextMove, 180),
                      }))
                      .slice(0, 3),
                    entryConditions: trimList(
                      canonicalCore.singleSubjectView.entryConditions,
                      4,
                      160
                    ),
                    abortConditions: trimList(
                      canonicalCore.singleSubjectView.abortConditions,
                      4,
                      160
                    ),
                    nextMove: trimText(canonicalCore.singleSubjectView.nextMove, 220),
                  }
                : undefined,
              personModel: canonicalCore.personModel
                ? {
                    overview: trimText(canonicalCore.personModel.overview, 220),
                    domainStateGraph: canonicalCore.personModel.domainStateGraph
                      ?.map((item) => ({
                        domain: trimText(item.domain, 24),
                        label: trimText(item.label, 80),
                        currentState: item.currentState,
                        currentWindow: trimText(item.currentWindow, 40),
                        thesis: trimText(item.thesis, 180),
                        nextShift: trimText(item.nextShift, 180),
                        firstMove: trimText(item.firstMove, 180),
                        holdMove: trimText(item.holdMove, 180),
                      }))
                      .slice(0, 6),
                    appliedProfile: canonicalCore.personModel.appliedProfile
                      ? {
                          lifeRhythmProfile: {
                            summary: trimText(
                              canonicalCore.personModel.appliedProfile.lifeRhythmProfile.summary,
                              180
                            ),
                            regulationMoves: trimList(
                              canonicalCore.personModel.appliedProfile.lifeRhythmProfile
                                .regulationMoves,
                              4,
                              160
                            ),
                          },
                          relationshipStyleProfile: {
                            summary: trimText(
                              canonicalCore.personModel.appliedProfile.relationshipStyleProfile
                                .summary,
                              180
                            ),
                            repairMoves: trimList(
                              canonicalCore.personModel.appliedProfile.relationshipStyleProfile
                                .repairMoves,
                              4,
                              160
                            ),
                          },
                          workStyleProfile: {
                            summary: trimText(
                              canonicalCore.personModel.appliedProfile.workStyleProfile.summary,
                              180
                            ),
                            leverageMoves: trimList(
                              canonicalCore.personModel.appliedProfile.workStyleProfile
                                .leverageMoves,
                              4,
                              160
                            ),
                          },
                          moneyStyleProfile: {
                            summary: trimText(
                              canonicalCore.personModel.appliedProfile.moneyStyleProfile.summary,
                              180
                            ),
                            controlRules: trimList(
                              canonicalCore.personModel.appliedProfile.moneyStyleProfile
                                .controlRules,
                              4,
                              160
                            ),
                          },
                          environmentProfile: {
                            summary: trimText(
                              canonicalCore.personModel.appliedProfile.environmentProfile.summary,
                              180
                            ),
                          },
                        }
                      : undefined,
                    eventOutlook: canonicalCore.personModel.eventOutlook
                      ?.map((item) => ({
                        key: item.key,
                        label: trimText(item.label, 80),
                        domain: trimText(item.domain, 24),
                        status: item.status,
                        readiness: item.readiness,
                        bestWindow: trimText(item.bestWindow, 40),
                        summary: trimText(item.summary, 180),
                        entryConditions: trimList(item.entryConditions, 4, 160),
                        abortConditions: trimList(item.abortConditions, 4, 160),
                        nextMove: trimText(item.nextMove, 180),
                      }))
                      .slice(0, 6),
                  }
                : undefined,
            }
          : undefined,
        evidence: compactEvidence,
      }
    : null

  const compactIcp = icpResult
    ? {
        primaryStyle: trimText(icpResult.primaryStyle, 10),
        secondaryStyle: trimText(icpResult.secondaryStyle ?? undefined, 10),
        dominanceScore: icpResult.dominanceScore,
        affiliationScore: icpResult.affiliationScore,
        summary: trimText(isKo ? icpResult.summaryKo : icpResult.summary, 240),
        traits: trimList(
          (isKo ? icpResult.primaryOctant.traitsKo : icpResult.primaryOctant.traits) ?? [],
          4,
          80
        ),
      }
    : null

  const compactPersona = personaResult
    ? {
        typeCode: trimText(personaResult.typeCode, 20),
        personaName: trimText(personaResult.personaName, 80),
        summary: trimText(personaResult.summary, 240),
        strengths: trimList(personaResult.strengths, 4, 80),
        challenges: trimList(personaResult.challenges, 4, 80),
        guidance: trimText(personaResult.guidance, 240),
        motivations: trimList(personaResult.keyMotivations, 4, 80),
        axes: personaResult.axes,
      }
    : null

  return {
    date: dateKey,
    locale,
    intervalMinutes,
    calendar: compactCalendar,
    icp: compactIcp,
    persona: compactPersona,
  }
}

export function parseActionPlanAiResponse(input: {
  json: unknown
  cleanText: CleanText
  clampConfidence: (value: number) => number
  isSanitizedSlotType: (value: string) => boolean
}): ParseActionPlanAiResponseResult {
  const { json, cleanText, clampConfidence, isSanitizedSlotType } = input

  if (!(json && typeof json === 'object' && (json as { success?: unknown }).success)) {
    throw new Error(
      (json as { error?: { message?: string } | null } | null | undefined)?.error?.message ??
        'AI generation failed'
    )
  }

  const data = (json as { data?: unknown }).data as
    | {
        timeline?: unknown
        summary?: unknown
        insights?: unknown
        precisionMode?: unknown
      }
    | undefined

  const timeline = sanitizeActionPlanAiTimeline({
    raw: data?.timeline,
    cleanText,
    clampConfidence,
    isSanitizedSlotType,
  })
  if (timeline.length === 0) {
    throw new Error('Invalid AI timeline')
  }

  const summary =
    typeof data?.summary === 'string' ? cleanText(data.summary, '') : cleanText(undefined, '')
  const insights = sanitizeActionPlanAiInsights({
    raw: data?.insights,
    cleanText,
  })
  const precisionMode = resolveActionPlanPrecisionMode(data?.precisionMode)

  return {
    timeline,
    summary,
    insights,
    precisionMode,
  }
}
