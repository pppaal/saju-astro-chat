import { z } from 'zod'
import {
  apiError,
  apiSuccess,
  createPublicStreamGuard,
  ErrorCodes,
  extractLocale,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { createValidationErrorResponse, dateSchema } from '@/lib/api/zodValidation'
import { LIST_LIMITS, TEXT_LIMITS } from '@/lib/constants/api-limits'
import { logger } from '@/lib/logger'
import { checkPremiumFromDatabase } from '@/lib/stripe/premiumCache'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import { buildActionPlanPayload } from './routeTimelineAssembly'
import { polishCalendarDayNarrationKo } from '@/lib/llm/calendarNarrativePolish'
import { buildDayContinuity, buildDayOfWeekTone } from '@/lib/calendar/dayContext'
import { getDisplayGradeFromScore } from '@/lib/counselor/calendar/scoring-config'
import { getGradeLabel as getUnifiedGradeLabel } from '@/components/calendar/constants'
import {
  analyzeConfidenceMeta,
  buildActionPlanInsights,
  buildPersonalizationHint,
  buildPersonalSummaryTag,
  buildRuleBasedTimeline,
  buildSlotGuardrail,
  buildSlotNarrative,
  buildSlotWhy,
  getEffectiveCalendarGrade,
  getEffectiveCalendarScore,
  inferSlotTypes,
  pickCategoryByHour,
  trimList,
} from './routeActionPlanSupport'

export type { ActionPlanIcpProfile, ActionPlanPersonaProfile } from './routeActionPlanSupport'

export type TimelineTone = 'best' | 'caution' | 'neutral'
export type SlotType =
  | 'deepWork'
  | 'decision'
  | 'communication'
  | 'money'
  | 'relationship'
  | 'recovery'

export type SlotWhy = {
  signalIds: string[]
  anchorIds: string[]
  patterns: string[]
  summary: string
}

export type TimelineSlot = {
  hour: number
  minute?: number
  label?: string
  note: string
  tone?: TimelineTone
  slotTypes?: SlotType[]
  why?: SlotWhy
  guardrail?: string
  evidenceSummary?: string[]
  confidence?: number
  confidenceReason?: string[]
  source?: 'rule' | 'rag' | 'hybrid'
}

type CalendarEvidence = {
  matrix?: {
    domain?: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
    finalScoreAdjusted?: number
    overlapStrength?: number
    peakLevel?: 'peak' | 'high' | 'normal'
    monthKey?: string
  }
  cross?: {
    sajuEvidence?: string
    astroEvidence?: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  }
  confidence?: number
  source?: 'rule' | 'rag' | 'hybrid'
  matrixVerdict?: {
    focusDomain?: string
    verdict?: string
    guardrail?: string
    topClaim?: string
    topAnchorSummary?: string
    phase?: string
    attackPercent?: number
    defensePercent?: number
  }
  matrixPacket?: {
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
  }
}

export type ActionPlanCalendarContext = {
  grade?: number
  displayGrade?: number
  score?: number
  displayScore?: number
  categories?: string[]
  bestTimes?: string[]
  warnings?: string[]
  recommendations?: string[]
  sajuFactors?: string[]
  astroFactors?: string[]
  summary?: string
  canonicalCore?: Partial<CalendarCoreAdapterResult>
  evidence?: CalendarEvidence
  natalSaju?: {
    dayStem: string
    dayBranch: string
    yearBranch?: string
    monthStem?: string
    monthBranch?: string
  }
  gongmangBranches?: string[]
  shinsalActive?: { name: string; type?: string; affectedArea?: string }[]
  activityScores?: {
    marriage?: number
    career?: number
    investment?: number
    moving?: number
    surgery?: number
    study?: number
  }
} | null

export type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

export type RagContextResponse = {
  rag_context?: {
    sipsin?: string
    timing?: string
    query_result?: string
    insights?: string[]
  }
}

const matrixEvidencePacketSchema = z
  .object({
    focusDomain: z.string().max(32).optional(),
    structuredEvidenceSummary: z
      .object({
        totalAnchors: z.number().min(0).max(1000).optional(),
        totalSets: z.number().min(0).max(1000).optional(),
      })
      .optional(),
    topAnchors: z
      .array(
        z.object({
          id: z.string().max(64).optional(),
          section: z.string().max(40).optional(),
          summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          setCount: z.number().min(0).max(1000).optional(),
        })
      )
      .max(6)
      .optional(),
    topClaims: z
      .array(
        z.object({
          id: z.string().max(64).optional(),
          text: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          domain: z.string().max(32).optional(),
          signalIds: z.array(z.string().max(64)).max(6).optional(),
          anchorIds: z.array(z.string().max(64)).max(6).optional(),
        })
      )
      .max(6)
      .optional(),
    scenarioBriefs: z
      .array(
        z.object({
          id: z.string().max(64).optional(),
          domain: z.string().max(32).optional(),
          mainTokens: z.array(z.string().max(TEXT_LIMITS.MAX_KEYWORD)).max(6).optional(),
          altTokens: z.array(z.string().max(TEXT_LIMITS.MAX_KEYWORD)).max(6).optional(),
        })
      )
      .max(6)
      .optional(),
    selectedSignals: z
      .array(
        z.object({
          id: z.string().max(64).optional(),
          domain: z.string().max(32).optional(),
          polarity: z.string().max(20).optional(),
          summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          score: z.number().min(-100).max(100).optional(),
        })
      )
      .max(8)
      .optional(),
    strategyBrief: z
      .object({
        overallPhase: z.string().max(32).optional(),
        overallPhaseLabel: z.string().max(60).optional(),
        attackPercent: z.number().min(0).max(100).optional(),
        defensePercent: z.number().min(0).max(100).optional(),
      })
      .optional(),
  })
  .optional()

const actionPlanTimelineRequestSchema = z.object({
  date: dateSchema,
  locale: z.enum(['ko', 'en']).optional(),
  timezone: z.string().max(TEXT_LIMITS.MAX_TIMEZONE).optional(),
  intervalMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
  calendar: z
    .object({
      grade: z.number().min(0).max(4).optional(),
      displayGrade: z.number().min(0).max(4).optional(),
      score: z.number().min(0).max(100).optional(),
      displayScore: z.number().min(0).max(100).optional(),
      categories: z
        .array(z.string().max(TEXT_LIMITS.MAX_TITLE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      bestTimes: z
        .array(z.string().max(TEXT_LIMITS.MAX_TITLE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      warnings: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      recommendations: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      sajuFactors: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      astroFactors: z
        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      title: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      canonicalCore: z
        .object({
          focusDomain: z.string().max(32).optional(),
          actionFocusDomain: z.string().max(32).optional(),
          riskAxisLabel: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          phase: z.string().max(48).optional(),
          phaseLabel: z.string().max(60).optional(),
          thesis: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          riskControl: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          primaryAction: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          primaryCaution: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          topDecisionLabel: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
          attackPercent: z.number().min(0).max(100).optional(),
          defensePercent: z.number().min(0).max(100).optional(),
          confidence: z.number().min(0).max(1).optional(),
          judgmentPolicy: z
            .object({
              mode: z.enum(['execute', 'verify', 'prepare']).optional(),
              rationale: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              allowedActions: z.array(z.string().max(64)).max(8).optional(),
              allowedActionLabels: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(8)
                .optional(),
              blockedActions: z.array(z.string().max(64)).max(8).optional(),
              blockedActionLabels: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(8)
                .optional(),
              hardStops: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
              hardStopLabels: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
              softChecks: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
              softCheckLabels: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
            })
            .optional(),
          topTimingWindow: z
            .object({
              domain: z.string().max(32).optional(),
              window: z.enum(['now', '1-3m', '3-6m', '6-12m', '12m+']).optional(),
              timingGranularity: z.enum(['day', 'week', 'fortnight', 'month', 'season']).optional(),
              precisionReason: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              timingConflictNarrative: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              whyNow: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              entryConditions: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
              abortConditions: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
            })
            .optional(),
          domainTimingWindows: z
            .array(
              z.object({
                domain: z.string().max(32).optional(),
                window: z.enum(['now', '1-3m', '3-6m', '6-12m', '12m+']).optional(),
                timingGranularity: z
                  .enum(['day', 'week', 'fortnight', 'month', 'season'])
                  .optional(),
                precisionReason: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                timingConflictNarrative: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                whyNow: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                entryConditions: z
                  .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                  .max(8)
                  .optional(),
                abortConditions: z
                  .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                  .max(8)
                  .optional(),
              })
            )
            .max(8)
            .optional(),
          projections: z
            .object({
              branches: z
                .object({
                  summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  detailLines: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(6).optional(),
                  reasons: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(6).optional(),
                  nextMoves: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(6).optional(),
                  counterweights: z
                    .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                    .max(6)
                    .optional(),
                })
                .optional(),
            })
            .optional(),
          singleSubjectView: z
            .object({
              directAnswer: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              actionAxis: z
                .object({
                  domain: z.string().max(32).optional(),
                  label: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  nowAction: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  whyThisFirst: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                })
                .optional(),
              riskAxis: z
                .object({
                  domain: z.string().max(32).optional(),
                  label: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  warning: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  hardStops: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
                })
                .optional(),
              timingState: z
                .object({
                  bestWindow: z.string().max(40).optional(),
                  whyNow: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  whyNotYet: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                })
                .optional(),
              branches: z
                .array(
                  z.object({
                    label: z.string().max(80).optional(),
                    summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                    entryConditions: z
                      .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                      .max(8)
                      .optional(),
                    abortConditions: z
                      .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                      .max(8)
                      .optional(),
                    nextMove: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  })
                )
                .max(4)
                .optional(),
              entryConditions: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
              abortConditions: z.array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE)).max(8).optional(),
              nextMove: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
            })
            .optional(),
          personModel: z
            .object({
              overview: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              domainStateGraph: z
                .array(
                  z.object({
                    domain: z.string().max(32).optional(),
                    label: z.string().max(80).optional(),
                    currentState: z
                      .enum(['expansion', 'stable', 'mixed', 'defensive', 'blocked'])
                      .optional(),
                    currentWindow: z.string().max(40).optional(),
                    thesis: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                    nextShift: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                    firstMove: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                    holdMove: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  })
                )
                .max(8)
                .optional(),
              appliedProfile: z
                .object({
                  lifeRhythmProfile: z
                    .object({
                      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                      regulationMoves: z
                        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                        .max(6)
                        .optional(),
                    })
                    .optional(),
                  relationshipStyleProfile: z
                    .object({
                      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                      repairMoves: z
                        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                        .max(6)
                        .optional(),
                    })
                    .optional(),
                  workStyleProfile: z
                    .object({
                      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                      leverageMoves: z
                        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                        .max(6)
                        .optional(),
                    })
                    .optional(),
                  moneyStyleProfile: z
                    .object({
                      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                      controlRules: z
                        .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                        .max(6)
                        .optional(),
                    })
                    .optional(),
                  environmentProfile: z
                    .object({
                      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                    })
                    .optional(),
                })
                .optional(),
              eventOutlook: z
                .array(
                  z.object({
                    key: z
                      .enum([
                        'careerEntry',
                        'partnerEntry',
                        'commitment',
                        'moneyBuild',
                        'healthReset',
                      ])
                      .optional(),
                    label: z.string().max(80).optional(),
                    domain: z.string().max(32).optional(),
                    status: z.enum(['open', 'mixed', 'blocked']).optional(),
                    readiness: z.number().min(0).max(100).optional(),
                    bestWindow: z.string().max(40).optional(),
                    summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                    entryConditions: z
                      .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                      .max(8)
                      .optional(),
                    abortConditions: z
                      .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                      .max(8)
                      .optional(),
                    nextMove: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
                  })
                )
                .max(8)
                .optional(),
            })
            .optional(),
        })
        .optional(),
      ganzhi: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
      transitSunSign: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
      natalSaju: z
        .object({
          dayStem: z.string().max(8),
          dayBranch: z.string().max(8),
          yearBranch: z.string().max(8).optional(),
          monthStem: z.string().max(8).optional(),
          monthBranch: z.string().max(8).optional(),
        })
        .optional(),
      gongmangBranches: z.array(z.string().max(8)).max(4).optional(),
      shinsalActive: z
        .array(
          z.object({
            name: z.string().max(20),
            type: z.string().max(20).optional(),
            affectedArea: z.string().max(40).optional(),
          })
        )
        .max(8)
        .optional(),
      activityScores: z
        .object({
          marriage: z.number().min(0).max(100).optional(),
          career: z.number().min(0).max(100).optional(),
          investment: z.number().min(0).max(100).optional(),
          moving: z.number().min(0).max(100).optional(),
          surgery: z.number().min(0).max(100).optional(),
          study: z.number().min(0).max(100).optional(),
        })
        .optional(),
      evidence: z
        .object({
          matrix: z
            .object({
              domain: z.enum(['career', 'love', 'money', 'health', 'move', 'general']).optional(),
              finalScoreAdjusted: z.number().min(0).max(10).optional(),
              overlapStrength: z.number().min(0).max(1).optional(),
              peakLevel: z.enum(['peak', 'high', 'normal']).optional(),
              monthKey: z.string().max(20).optional(),
            })
            .optional(),
          cross: z
            .object({
              sajuEvidence: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              astroEvidence: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              sajuDetails: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(LIST_LIMITS.MAX_LIST_ITEMS)
                .optional(),
              astroDetails: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(LIST_LIMITS.MAX_LIST_ITEMS)
                .optional(),
              bridges: z
                .array(z.string().max(TEXT_LIMITS.MAX_GUIDANCE))
                .max(LIST_LIMITS.MAX_LIST_ITEMS)
                .optional(),
            })
            .optional(),
          confidence: z.number().min(0).max(100).optional(),
          source: z.enum(['rule', 'rag', 'hybrid']).optional(),
          matrixVerdict: z
            .object({
              focusDomain: z.string().max(32).optional(),
              verdict: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              guardrail: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              topClaim: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              topAnchorSummary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
              phase: z.string().max(TEXT_LIMITS.MAX_TITLE).optional(),
              attackPercent: z.number().min(0).max(100).optional(),
              defensePercent: z.number().min(0).max(100).optional(),
            })
            .optional(),
          matrixPacket: matrixEvidencePacketSchema,
        })
        .optional(),
    })
    .nullable()
    .optional(),
  icp: z
    .object({
      primaryStyle: z.string().max(10).optional(),
      secondaryStyle: z.string().max(10).optional().nullable(),
      dominanceScore: z.number().min(0).max(100).optional(),
      affiliationScore: z.number().min(0).max(100).optional(),
      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      traits: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
    })
    .nullable()
    .optional(),
  persona: z
    .object({
      typeCode: z.string().max(20).optional(),
      personaName: z.string().max(TEXT_LIMITS.MAX_NAME).optional(),
      summary: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      strengths: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      challenges: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      guidance: z.string().max(TEXT_LIMITS.MAX_GUIDANCE).optional(),
      motivations: z
        .array(z.string().max(TEXT_LIMITS.MAX_KEYWORD))
        .max(LIST_LIMITS.MAX_LIST_ITEMS)
        .optional(),
      axes: z
        .record(
          z.string().max(20),
          z.object({
            pole: z.string().max(TEXT_LIMITS.MAX_KEYWORD),
            score: z.number().min(0).max(100),
          })
        )
        .optional(),
    })
    .nullable()
    .optional(),
})

export const POST = withApiMiddleware(
  async (request, context) => {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody) {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid JSON body')
    }

    const validation = actionPlanTimelineRequestSchema.safeParse(rawBody)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(request),
        route: 'calendar-action-plan',
      })
    }

    const { date, locale, timezone, calendar, icp, persona, intervalMinutes } = validation.data
    const actionPlanCalendar: ActionPlanCalendarContext = calendar
      ? {
          ...calendar,
          canonicalCore: calendar.canonicalCore as Partial<CalendarCoreAdapterResult> | undefined,
        }
      : null
    const lang = locale || (context.locale === 'ko' ? 'ko' : 'en')
    const safeInterval = intervalMinutes ?? 60
    let isPremiumUser = context.isPremium
    if (context.userId && !isPremiumUser) {
      try {
        const premiumStatus = await checkPremiumFromDatabase(context.userId)
        isPremiumUser = premiumStatus.isPremium
      } catch (error) {
        logger.warn('[ActionPlanTimeline] Premium check fallback to context', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const baseTimeline = buildRuleBasedTimeline({
      date,
      locale: lang,
      intervalMinutes: safeInterval,
      icp: icp
        ? {
            primaryStyle: icp.primaryStyle,
            secondaryStyle: icp.secondaryStyle ?? null,
            dominanceScore: icp.dominanceScore,
            affiliationScore: icp.affiliationScore,
            summary: icp.summary,
            traits: trimList(icp.traits, 4),
          }
        : null,
      persona: persona
        ? {
            typeCode: persona.typeCode,
            personaName: persona.personaName,
            summary: persona.summary,
            strengths: trimList(persona.strengths, 4),
            challenges: trimList(persona.challenges, 4),
            guidance: persona.guidance,
            motivations: trimList(persona.motivations, 4),
            axes: persona.axes,
          }
        : null,
      calendar: actionPlanCalendar
        ? {
            grade: getEffectiveCalendarGrade(actionPlanCalendar),
            displayGrade: actionPlanCalendar.displayGrade,
            score: getEffectiveCalendarScore(actionPlanCalendar),
            displayScore: actionPlanCalendar.displayScore,
            categories: trimList(actionPlanCalendar.categories, 3),
            bestTimes: trimList(actionPlanCalendar.bestTimes, 4),
            recommendations: trimList(actionPlanCalendar.recommendations, 3),
            warnings: trimList(actionPlanCalendar.warnings, 3),
            summary: actionPlanCalendar.summary,
            sajuFactors: trimList(actionPlanCalendar.sajuFactors, 3),
            astroFactors: trimList(actionPlanCalendar.astroFactors, 3),
            canonicalCore: actionPlanCalendar.canonicalCore,
            evidence: actionPlanCalendar.evidence,
          }
        : null,
    })

    const baselineConfidence =
      typeof actionPlanCalendar?.evidence?.confidence === 'number'
        ? actionPlanCalendar.evidence.confidence
        : undefined

    const responsePayload = buildActionPlanPayload(
      {
        locale: lang,
        sourceTimeline: baseTimeline,
        calendar: actionPlanCalendar,
        icp,
        persona,
        isPremiumUser,
        baselineConfidence,
        intervalMinutes: safeInterval,
      },
      {
        buildPersonalizationHint,
        pickCategoryByHour,
        inferSlotTypes,
        buildSlotWhy,
        buildSlotGuardrail,
        buildSlotNarrative,
        analyzeConfidenceMeta,
        buildActionPlanInsights,
        buildPersonalSummaryTag,
      }
    )
    logger.info('[ActionPlanTimeline] timeline generated', {
      date,
      intervalMinutes: safeInterval,
      timezone,
      hasIcp: Boolean(icp),
      hasPersona: Boolean(persona),
      isPremiumUser,
    })

    // Day-level expert polish — Claude로 4-5단락 자연어 풀이.
    // Premium gate: free users get the deterministic skeleton (with grade-aware
    // openings + best/caution slots), premium users get the AI-rewritten version.
    // The fallback is friendly and grade-aware on its own, so the experience
    // degrades gracefully — but the cost-bearing Claude call only fires for paid.
    try {
      type TimelineSlot = {
        tone?: string
        label?: string
        hour?: string
        note?: string
        action?: string
        evidenceSummary?: string[]
        confidenceReason?: string[]
        why?: { patterns?: string[]; summary?: string }
      }
      const payload = responsePayload as Record<string, unknown>
      const calendar = actionPlanCalendar as Record<string, unknown> | undefined
      const cycle =
        ((calendar?.evidence as Record<string, unknown> | undefined)?.cycle as
          | Record<string, unknown>
          | undefined) || undefined
      const cross =
        ((calendar?.evidence as Record<string, unknown> | undefined)?.cross as
          | Record<string, unknown>
          | undefined) || undefined
      const canonicalCore = calendar?.canonicalCore as Record<string, unknown> | undefined
      const natalSaju = calendar?.natalSaju as Record<string, unknown> | undefined
      const tl: TimelineSlot[] = (payload.timeline as TimelineSlot[]) || []
      // Tier 4 anchor — slot evidence (사주·점성 신호 분리)
      const SAJU_KW = ['일진', '대운', '세운', '월운', '식상', '재성', '관성', '인성', '비겁', '신살', '천을귀인', '도화', '역마', '백호', '양인', '괴강', '공망', '격국', '용신', '12운성', '천간', '지지', '오행', '갑자', '갑목', '을목', '병화', '정화', '무토', '기토', '경금', '신금', '임수', '계수']
      const ASTRO_KW = ['하우스', '트랜짓', '어스펙트', 'aspect', 'transit', 'house', 'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'ASC', 'MC', 'Vertex', 'Juno', 'Vesta', 'Ceres', 'Pallas', '태양', '달', '수성', '금성', '화성', '목성', '토성', '천왕성', '해왕성', '명왕성', '상승궁', '천정']
      const splitSignals = (lines: string[] = []): { saju: string[]; astro: string[] } => {
        const saju: string[] = []
        const astro: string[] = []
        for (const ln of lines) {
          const isSaju = SAJU_KW.some((k) => ln.includes(k))
          const isAstro = ASTRO_KW.some((k) => ln.includes(k))
          if (isSaju && !isAstro) saju.push(ln)
          else if (isAstro && !isSaju) astro.push(ln)
          else if (isSaju && isAstro) {
            saju.push(ln)
            astro.push(ln)
          }
        }
        return { saju, astro }
      }
      const mapSlot = (s: TimelineSlot) => {
        const rawSignals = [
          ...(s.evidenceSummary || []),
          ...(s.confidenceReason || []),
          ...(s.why?.patterns || []),
        ]
        const { saju, astro } = splitSignals(rawSignals)
        return {
          hour: s.label || s.hour || '',
          reason: s.note || s.action || '',
          sajuSignals: saju.slice(0, 3),
          astroSignals: astro.slice(0, 3),
          summary: s.why?.summary,
        }
      }
      const bestSlots = tl.filter((s) => s.tone === 'best').slice(0, 3).map(mapSlot)
      const cautionSlots = tl.filter((s) => s.tone === 'caution').slice(0, 3).map(mapSlot)

      const skeletonParts = [
        payload.summary as string | undefined,
        bestSlots.length ? `좋은 시간: ${bestSlots.map((s) => s.hour).join(', ')}` : '',
        cautionSlots.length ? `조심: ${cautionSlots.map((s) => s.hour).join(', ')}` : '',
      ].filter(Boolean)
      const skeleton = skeletonParts.join(' · ')

      // Free users see the deterministic skeleton + Premium upsell hint.
      // Premium users get the Claude-polished 4-5 paragraph reading.
      if (!isPremiumUser) {
        payload.dayNarrative = skeleton
        payload.dayNarrativeLocked = true
        payload.dayNarrativeUpsell =
          lang === 'ko'
            ? 'AI 4-5단락 풀이는 Premium 전용이에요. 결제 후 같은 날짜 다시 클릭하면 즉시 AI 풀이로 바뀝니다.'
            : 'The AI 4-5 paragraph reading is Premium only. After upgrading, click the date again to see the AI version.'
        return apiSuccess(responsePayload)
      }

      const polishedNarrative = await polishCalendarDayNarrationKo(
        {
          date,
          locale: lang,
          natal: {
            dayMaster: natalSaju?.dayStem as string | undefined,
            dayMasterElement: calendar?.dayMasterElement as string | undefined,
            geokguk: calendar?.geokguk as string | undefined,
            fiveElements: calendar?.fiveElements as Record<string, number> | undefined,
          },
          timing: {
            daeunGanji: cycle?.daeunGanji as string | undefined,
            daeunElement: cycle?.daeunElement as string | undefined,
            saeunYear: cycle?.saeunYear as number | undefined,
            saeunElement: cycle?.saeunElement as string | undefined,
            wolunElement: cycle?.wolunElement as string | undefined,
            iljinElement: cycle?.iljinElement as string | undefined,
          },
          astro: {
            transits: cross?.bridges as string[] | undefined,
            saturnHouse: cross?.saturnHouse as number | undefined,
            jupiterHouse: cross?.jupiterHouse as number | undefined,
          },
          bestSlots,
          cautionSlots,
          matrixCore: {
            phase: canonicalCore?.phase as string | undefined,
            focus: canonicalCore?.topDecisionLabel as string | undefined,
            risk: canonicalCore?.riskAxisLabel as string | undefined,
          },
          continuity: (() => {
            const c = buildDayContinuity(date, lang)
            return {
              yesterdayElement: c.yesterdayElement,
              todayElement: c.todayElement,
              tomorrowElement: c.tomorrowElement,
              flowChange: c.flowChange,
              narrative: lang === 'ko' ? c.flowNarrativeKo : c.flowNarrativeEn,
            }
          })(),
          weekday: (() => {
            const w = buildDayOfWeekTone(date)
            if (!w) return undefined
            return {
              label: lang === 'ko' ? w.weekdayKo : w.weekdayEn,
              tone: lang === 'ko' ? w.toneKo : w.toneEn,
              weekPosition: w.weekPosition,
            }
          })(),
          gradeContext: (() => {
            // Use the engine's display grade so narrative tone matches the badge
            // shown next to the date. Falls back to neutral Grade 2 if score absent.
            const score =
              typeof payload.score === 'number'
                ? (payload.score as number)
                : typeof (calendar?.score) === 'number'
                  ? (calendar.score as number)
                  : undefined
            if (typeof score !== 'number') return undefined
            const grade = getDisplayGradeFromScore(score)
            return {
              grade,
              gradeLabel: getUnifiedGradeLabel(grade, lang === 'ko' ? 'ko' : 'en').full,
              score,
            }
          })(),
        },
        skeleton
      )

      payload.dayNarrative = polishedNarrative
    } catch (polishErr) {
      logger.warn('[ActionPlan] day narrative polish failed', {
        error: polishErr instanceof Error ? polishErr.message : String(polishErr),
      })
    }

    return apiSuccess(responsePayload)
  },
  createPublicStreamGuard({
    route: 'calendar-action-plan',
    limit: 5,
    windowSeconds: 60,
  })
)
