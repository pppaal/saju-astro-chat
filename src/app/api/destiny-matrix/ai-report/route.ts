// src/app/api/destiny-matrix/ai-report/route.ts
// Destiny Fusion Matrix™ - AI Premium Report API (유료)
// 크레딧 차감 후 AI 리포트 생성 + PDF 다운로드

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import type {
  MatrixCell,
} from '@/lib/destiny-matrix/types'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix/engine'
import { FusionReportGenerator } from '@/lib/destiny-matrix/interpreter/report-generator'
import { DestinyMatrixError, ErrorCodes } from '@/lib/destiny-matrix/errors'
import { buildCoreEnvelope } from '@/lib/destiny-matrix/core/buildCoreEnvelope'
import { buildSharedSurface } from '@/lib/destiny-matrix/core/adaptersPayload'
import { generateFivePagePDF, generatePremiumPDF } from '@/lib/destiny-matrix/ai-report/pdfGenerator'
import { summarizeDestinyMatrixEvidence } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'
import {
  REPORT_CREDIT_COSTS,
  type ReportPeriod,
  type ReportTheme,
  type TimingAIPremiumReport,
  type ThemedAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report/types'
import { auditMatrixInputReadiness } from '@/lib/destiny-matrix/ai-report/qualityAudit'
import { auditCrossConsistency } from '@/lib/destiny-matrix/ai-report/crossConsistencyAudit'
import { canUseFeature, consumeCredits, getCreditBalance } from '@/lib/credits/creditService'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import {
  extractOverallScore,
  extractReportSummary,
  generateReportTitle,
  normalizeReportTier,
  scoreToGrade,
  type ReportTier,
} from './routeReportPersistence'
import { buildRichFreeDigestReport as buildRichFreeDigestReportExternal } from './routeFreeDigest'
import {
  applyPreciseTimingSummaryIfNeeded,
  generateRouteAiReport,
  regenerateRouteAiReportStrict,
} from './routeReportGeneration'
import { buildAiReportErrorResponse } from './routeErrorResponses'
import {
  buildTimingDataFromDerivedSaju,
  deriveDominantWesternElementFromPlanetSigns,
  enrichRequestWithDerivedSaju,
} from './routeDerivedContext'
import {
  buildGeneratedReportJsonResponse,
  buildGeneratedReportPdfResponse,
  persistReportPredictionSnapshotEntry,
} from './routeReportOutput'
import { prepareAiReportRequest } from './routeRequestPreparation'

// ===========================
// 크레딧 비용 계산
// ===========================

function calculateCreditCost(period?: ReportPeriod, theme?: ReportTheme): number {
  if (theme) {
    return REPORT_CREDIT_COSTS.themed
  }
  if (period && period !== 'comprehensive') {
    return REPORT_CREDIT_COSTS[period]
  }
  return REPORT_CREDIT_COSTS.comprehensive
}

type GeneratedReportMode = 'themed' | 'timing' | 'comprehensive'
type PersistedReportType = GeneratedReportMode | 'free'

function resolveGeneratedReportMode(
  period?: ReportPeriod,
  theme?: ReportTheme
): GeneratedReportMode {
  if (theme) return 'themed'
  if (period && period !== 'comprehensive') return 'timing'
  return 'comprehensive'
}

function resolvePersistedReportType(
  reportTier: ReportTier,
  period?: ReportPeriod,
  theme?: ReportTheme
): PersistedReportType {
  if (reportTier === 'free') return 'free'
  return resolveGeneratedReportMode(period, theme)
}

type StrictPatternThresholds = {
  crossConsistencyMin: number
  coreQualityMin: number
  graphAnchorMin: number
  patternCountMin: number
}

type PatternQualityGateResult = {
  passed: boolean
  blockers: string[]
  metrics: {
    crossConsistencyScore: number
    coreQualityScore: number | null
    graphAnchorCount: number
    patternCount: number
    inputReadinessScore: number
  }
  thresholds: StrictPatternThresholds
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function parseThreshold(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return clampNumber(parsed, min, max)
}

function isEnvFlagEnabled(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

function isHardBlockModeEnabled(): boolean {
  // Keep strict hard-blocks active in tests, and opt-in in non-test envs.
  if (process.env.NODE_ENV === 'test') return true
  return isEnvFlagEnabled('AI_REPORT_ALLOW_HARD_BLOCKS')
}

function isStrictGateEnabled(name: string): boolean {
  return isHardBlockModeEnabled() && isEnvFlagEnabled(name)
}

function isStrictPatternGuardEnabled(): boolean {
  // Default OFF in non-test environments to avoid false-negative hard blocks.
  return isStrictGateEnabled('AI_REPORT_STRICT_PATTERN_GUARD')
}

function getStrictPatternThresholds(): StrictPatternThresholds {
  return {
    crossConsistencyMin: parseThreshold(process.env.AI_REPORT_PATTERN_CROSS_MIN, 74, 0, 100),
    coreQualityMin: parseThreshold(process.env.AI_REPORT_PATTERN_CORE_QUALITY_MIN, 68, 0, 100),
    graphAnchorMin: parseThreshold(process.env.AI_REPORT_PATTERN_GRAPH_ANCHOR_MIN, 1, 0, 200),
    patternCountMin: parseThreshold(process.env.AI_REPORT_PATTERN_COUNT_MIN, 1, 0, 200),
  }
}

function evaluatePatternQualityGate(input: {
  report: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
  crossConsistencyScore: number
  inputReadinessScore: number
  thresholds: StrictPatternThresholds
}): PatternQualityGateResult {
  const crossConsistencyScore = clampNumber(input.crossConsistencyScore, 0, 100)
  const inputReadinessScore = clampNumber(input.inputReadinessScore, 0, 100)
  const coreQualityRaw = input.report?.meta?.qualityMetrics?.coreQualityScore
  const coreQualityScore =
    typeof coreQualityRaw === 'number' && Number.isFinite(coreQualityRaw)
      ? clampNumber(coreQualityRaw, 0, 100)
      : null
  const graphAnchorCount = Array.isArray(input.report?.graphRagEvidence?.anchors)
    ? input.report.graphRagEvidence.anchors.length
    : 0
  const patternCount = Array.isArray(input.report?.patterns) ? input.report.patterns.length : 0
  const blockers: string[] = []

  if (crossConsistencyScore < input.thresholds.crossConsistencyMin) {
    blockers.push(
      `crossConsistency ${crossConsistencyScore.toFixed(1)} < ${input.thresholds.crossConsistencyMin}`
    )
  }
  if (graphAnchorCount < input.thresholds.graphAnchorMin) {
    blockers.push(`graphAnchors ${graphAnchorCount} < ${input.thresholds.graphAnchorMin}`)
  }
  if (patternCount < input.thresholds.patternCountMin) {
    blockers.push(`patterns ${patternCount} < ${input.thresholds.patternCountMin}`)
  }
  if (coreQualityScore !== null && coreQualityScore < input.thresholds.coreQualityMin) {
    blockers.push(`coreQuality ${coreQualityScore.toFixed(1)} < ${input.thresholds.coreQualityMin}`)
  }

  return {
    passed: blockers.length === 0,
    blockers,
    metrics: {
      crossConsistencyScore,
      coreQualityScore,
      graphAnchorCount,
      patternCount,
      inputReadinessScore,
    },
    thresholds: input.thresholds,
  }
}

function normalizeAIUserPlan(plan: unknown): 'free' | 'starter' | 'pro' | 'premium' {
  if (plan === 'starter' || plan === 'pro' || plan === 'premium') {
    return plan
  }
  return 'free'
}

// ===========================
// POST - AI 리포트 생성 (JSON 응답)
// ===========================

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    try {
      // 1. 인증 확인
      const userId = context.userId
      if (!userId) {
        return NextResponse.json(
          { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
          { status: HTTP_STATUS.UNAUTHORIZED }
        )
      }

      // 2. 요청 파싱 (크레딧 계산을 위해 먼저)
      let body: unknown
      try {
        body = await req.json()
      } catch {
        throw new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
          message: 'Invalid JSON in request body',
        })
      }

      const preparedRequest = await prepareAiReportRequest(body)
      if (!preparedRequest.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_ERROR,
              message: '입력 데이터 검증에 실패했습니다.',
              details: preparedRequest.validationErrors,
            },
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      const {
        requestBody,
        period,
        theme,
        name,
        birthDate,
        format,
        detailLevel,
        bilingual,
        targetChars,
        userQuestion,
        deterministicProfile,
        tone,
        targetDate,
        profileContext,
        matrixInput,
        timingData,
        missingKeys,
        queryDomain,
        maxInsights,
        includeVisualizations,
        includeDetailedData,
      } = preparedRequest.data
      const reportTier = normalizeReportTier(requestBody.reportTier)
      const isFreeTier = reportTier === 'free'

      // 4. 크레딧 비용 계산 및 잔액 확인
      const creditCost = isFreeTier ? 0 : calculateCreditCost(period, theme)
      const balance = await getCreditBalance(userId)
      const userPlan = isFreeTier ? 'free' : normalizeAIUserPlan(balance.plan)

      if (!isFreeTier && balance.remainingCredits < creditCost) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_CREDITS',
              message: `AI 리포트 생성에 ${creditCost} 크레딧이 필요합니다. (현재: ${balance.remainingCredits})`,
              required: creditCost,
              current: balance.remainingCredits,
            },
          },
          { status: HTTP_STATUS.PAYMENT_REQUIRED }
        )
      }

      // 6. 기본 입력/타이밍 준비
      const detailBasedMaxInsights =
        detailLevel === 'comprehensive' ? 20 : detailLevel === 'detailed' ? 10 : 5
      const resolvedMaxInsights = Math.min(20, Math.max(1, maxInsights ?? detailBasedMaxInsights))
      const strictCompleteness = isStrictGateEnabled('AI_REPORT_STRICT_COMPLETENESS')
      if (strictCompleteness && missingKeys.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INCOMPLETE_CONTEXT',
              message: '필수 데이터 누락으로 AI report 생성을 중단했습니다.',
              missing: missingKeys,
            },
          },
          { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
        )
      }
      if (!strictCompleteness && missingKeys.length > 0) {
        logger.warn(
          '[destiny-matrix/ai-report] Incomplete context detected; continuing in soft mode',
          {
            missing: missingKeys,
          }
        )
      }

      // 7. 기본 리포트 생성
      const inputReadinessAudit = auditMatrixInputReadiness(matrixInput)
      const strictInputReadiness = isStrictGateEnabled('AI_REPORT_STRICT_INPUT_READINESS')
      if (strictInputReadiness && !inputReadinessAudit.ready) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INPUT_QUALITY_BLOCKED',
              message: '입력 데이터 무결성 점검에서 치명 오류가 감지되어 생성을 중단했습니다.',
              blockers: inputReadinessAudit.blockers,
              inputReadinessAudit,
            },
          },
          { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
        )
      }
      if (!strictInputReadiness && !inputReadinessAudit.ready) {
        logger.warn(
          '[destiny-matrix/ai-report] Input readiness not ideal; continuing in soft mode',
          {
            blockers: inputReadinessAudit.blockers,
            score: inputReadinessAudit.score,
          }
        )
      }
      if (inputReadinessAudit.score < 75 || inputReadinessAudit.warnings.length > 0) {
        logger.warn('[destiny-matrix/ai-report] Input readiness below ideal', {
          score: inputReadinessAudit.score,
          warnings: inputReadinessAudit.warnings,
        })
      }

      const generator = new FusionReportGenerator({
        lang: matrixInput.lang || 'ko',
        maxTopInsights: resolvedMaxInsights,
        includeVisualizations,
        includeDetailedData,
        weightConfig: {
          baseWeights: {
            layer1_elementCore: 1.0,
            layer2_sibsinPlanet: 0.9,
            layer3_sibsinHouse: 0.85,
            layer4_timing: 0.95,
            layer5_relationAspect: 0.8,
            layer6_stageHouse: 0.75,
            layer7_advanced: 0.7,
            layer8_shinsal: 0.65,
            layer9_asteroid: 0.5,
            layer10_extraPoint: 0.55,
          },
          contextModifiers: [],
          temporalModifiers: [],
        },
        narrativeStyle: 'friendly',
      })

      const coreEnvelope = buildCoreEnvelope({
        mode: resolveGeneratedReportMode(period, theme),
        lang: ((matrixInput.lang || 'ko') as 'ko' | 'en') || 'ko',
        matrixInput,
        queryDomain: queryDomain as InsightDomain | undefined,
        reportGeneratorInstance: generator,
        matrixCalculator: calculateDestinyMatrix,
      })
      const matrix = coreEnvelope.matrix
      const layerResults = coreEnvelope.layerResults
      const baseReport = coreEnvelope.matrixReport
      const normalizedMatrixInput = coreEnvelope.normalizedInput
      const sharedSurface = buildSharedSurface(
        coreEnvelope.coreSeed,
        (((normalizedMatrixInput.lang || 'ko') as 'ko' | 'en') || 'ko')
      )

      if (isFreeTier) {
        const freeReport = buildRichFreeDigestReportExternal({
          overallScore: {
            total: baseReport.overallScore.total,
            grade: baseReport.overallScore.grade,
            gradeDescription: baseReport.overallScore.gradeDescription,
          },
          topInsights: baseReport.topInsights.map((insight) => ({
            title: insight.title,
            description: insight.description,
            actionItems: insight.actionItems?.map((action) => ({ text: action.text })),
            category: insight.category,
          })),
          domainAnalysis: baseReport.domainAnalysis.map((domain) => ({
            domain: domain.domain,
            score: domain.score,
            summary: domain.summary,
            hasData: domain.hasData,
          })),
          personModel: sharedSurface.personModel,
          lang: normalizedMatrixInput.lang || 'ko',
          theme,
          period,
          queryDomain: queryDomain as InsightDomain | undefined,
        })

        const freeReportType = resolvePersistedReportType(reportTier, period, theme)
        const freeReportTitle = generateReportTitle(freeReportType, period, theme, targetDate)
        const savedFreeReport = await prisma.destinyMatrixReport.create({
          data: {
            userId,
            reportType: freeReportType,
            period: period || null,
            theme: theme || null,
            reportData: freeReport as object,
            title: freeReportTitle,
            summary: freeReport.summary,
            overallScore: freeReport.overallScore,
            grade: freeReport.grade,
            locale: normalizedMatrixInput.lang || 'ko',
          },
        })

        return NextResponse.json({
          success: true,
          creditsUsed: 0,
          remainingCredits: balance.remainingCredits,
          reportType: freeReportType,
          report: {
            ...freeReport,
            id: savedFreeReport.id,
          },
        })
      }

      // 9. 타이밍 데이터 생성 (period 또는 theme이 있는 경우)

      // 10. 리포트 타입별 분기 처리
      let aiReport: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
      let premiumReport: AIPremiumReport | null = null
      const reportLang = normalizedMatrixInput.lang || 'ko'
      const reportMode = resolveGeneratedReportMode(period, theme)
      let matrixSummaryForGeneration =
        matrix && typeof matrix === 'object' && 'summary' in matrix
          ? (matrix.summary as typeof matrix.summary)
          : undefined

      matrixSummaryForGeneration = await applyPreciseTimingSummaryIfNeeded({
        theme,
        period,
        detailLevel,
        normalizedMatrixInput,
        matrixSummary: matrixSummaryForGeneration,
        calculateSummary: (timelineInput) =>
          calculateDestinyMatrix(timelineInput, { skipTimelineRecompute: true }).summary,
      })

      logger.info('[destiny-matrix/ai-report] Starting premium report generation', {
        reportMode,
        theme: theme || null,
        period: period || null,
        lang: reportLang,
        userPlan,
        deterministicProfile: deterministicProfile || null,
        hasUserQuestion: typeof userQuestion === 'string' && userQuestion.trim().length > 0,
      })
      ;({ aiReport, premiumReport } = await generateRouteAiReport({
        matrixInput,
        baseReport,
        theme,
        period,
        timingData,
        name,
        birthDate,
        targetDate,
        reportLang,
        userPlan,
        userQuestion,
        deterministicProfile,
        queryDomain: queryDomain as InsightDomain | undefined,
        detailLevel,
        bilingual,
        targetChars,
        tone,
        profileContext,
        layerResults,
        matrixSummaryForGeneration,
      }))

      if (theme) {
        const themedQualityAudit = (
          aiReport as ThemedAIPremiumReport & {
            qualityAudit?: {
              shouldBlock?: boolean
              overclaimFindings?: Array<{ section: string }>
            }
          }
        ).qualityAudit
        const strictThemeQuality = isStrictGateEnabled('AI_REPORT_STRICT_THEME_QUALITY')
        if (strictThemeQuality && themedQualityAudit?.shouldBlock) {
          const blockedSections = Array.from(
            new Set((themedQualityAudit.overclaimFindings || []).map((item) => item.section))
          )
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'QUALITY_BLOCKED',
                message:
                  '리포트 문장 품질 게이트(과장/비약 차단)에 걸렸습니다. 근거 없는 단정 표현을 줄여 다시 시도하세요.',
                blockedSections,
                overclaimFindings: (themedQualityAudit.overclaimFindings || []).slice(0, 10),
                qualityAudit: themedQualityAudit,
              },
            },
            { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
          )
        }
        if (!strictThemeQuality && themedQualityAudit?.shouldBlock) {
          logger.warn(
            '[destiny-matrix/ai-report] Theme quality gate flagged overclaim; continuing in soft mode',
            {
              theme,
              findings: (themedQualityAudit.overclaimFindings || []).slice(0, 5),
            }
          )
        }
      }

      logger.info('[destiny-matrix/ai-report] Report generation completed', {
        reportMode,
        theme: theme || null,
        period: period || null,
        metaModel:
          typeof (aiReport as { meta?: { modelUsed?: string } })?.meta?.modelUsed === 'string'
            ? (aiReport as { meta?: { modelUsed?: string } }).meta?.modelUsed
            : null,
      })

      let crossConsistencyAudit = auditCrossConsistency({
        mode: reportMode,
        matrixInput,
        report: aiReport,
        graphEvidence:
          (aiReport as AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport)
            .graphRagEvidence || null,
      })

      if (crossConsistencyAudit.score < 70) {
        logger.warn('[destiny-matrix/ai-report] Cross consistency score is low', {
          score: crossConsistencyAudit.score,
          blockers: crossConsistencyAudit.blockers,
        })
      }

      const strictThresholds = getStrictPatternThresholds()
      let strictRetryAttempted = false
      let patternQualityGate = evaluatePatternQualityGate({
        report: aiReport,
        crossConsistencyScore: crossConsistencyAudit.score,
        inputReadinessScore: inputReadinessAudit.score,
        thresholds: strictThresholds,
      })

      if (isStrictPatternGuardEnabled() && !patternQualityGate.passed) {
        strictRetryAttempted = true
        logger.warn('[destiny-matrix/ai-report] Pattern quality gate failed; retrying once', {
          blockers: patternQualityGate.blockers,
          metrics: patternQualityGate.metrics,
          thresholds: strictThresholds,
          reportMode,
        })

        try {
          const retried = await regenerateRouteAiReportStrict({
            matrixInput,
            baseReport,
            theme,
            period,
            timingData,
            name,
            birthDate,
            targetDate,
            reportLang,
            userPlan,
            userQuestion,
            deterministicProfile,
            queryDomain: queryDomain as InsightDomain | undefined,
            detailLevel,
            bilingual,
            targetChars,
            tone,
            profileContext,
            layerResults,
            matrixSummaryForGeneration,
          })
          aiReport = retried.aiReport
          premiumReport = retried.premiumReport
        } catch (retryError) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'PATTERN_QUALITY_BLOCKED',
                message: '패턴 품질 게이트 재생성 단계에서 기준 미달로 차단되었습니다.',
                retryError: retryError instanceof Error ? retryError.message : String(retryError),
                patternQualityGate: {
                  ...patternQualityGate,
                  strictRetryAttempted,
                },
                crossConsistencyAudit,
              },
            },
            { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
          )
        }

        crossConsistencyAudit = auditCrossConsistency({
          mode: reportMode,
          matrixInput,
          report: aiReport,
          graphEvidence:
            (aiReport as AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport)
              .graphRagEvidence || null,
        })

        patternQualityGate = evaluatePatternQualityGate({
          report: aiReport,
          crossConsistencyScore: crossConsistencyAudit.score,
          inputReadinessScore: inputReadinessAudit.score,
          thresholds: strictThresholds,
        })

        if (!patternQualityGate.passed) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'PATTERN_QUALITY_BLOCKED',
                message:
                  '패턴 품질 게이트 기준(교차 정합/Graph anchor/패턴 수)을 충족하지 못해 리포트 생성을 차단했습니다.',
                patternQualityGate: {
                  ...patternQualityGate,
                  strictRetryAttempted,
                },
                crossConsistencyAudit,
              },
            },
            { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
          )
        }
      }
      if (!isStrictPatternGuardEnabled() && !patternQualityGate.passed) {
        logger.warn(
          '[destiny-matrix/ai-report] Pattern quality gate failed; strict guard disabled, continuing',
          {
            blockers: patternQualityGate.blockers,
            metrics: patternQualityGate.metrics,
            thresholds: strictThresholds,
          }
        )
      }

      const aiReportWithAudits = {
        ...aiReport,
        crossConsistencyAudit,
        inputReadinessAudit,
        patternQualityGate: {
          ...patternQualityGate,
          strictRetryAttempted,
        },
      }

      // 11. 크레딧 차감 (성공한 경우에만)
      const consumeResult = await consumeCredits(userId, 'reading', creditCost)
      if (!consumeResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CREDIT_DEDUCTION_FAILED',
              message: '크레딧 차감에 실패했습니다.',
            },
          },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      // 12. DB에 리포트 저장
      const reportType = resolvePersistedReportType(reportTier, period, theme)
      const reportTitle = generateReportTitle(reportType, period, theme, targetDate)
      const reportSummary = extractReportSummary(aiReportWithAudits)
      const overallScore = extractOverallScore(aiReportWithAudits)
      const destinyMatrixEvidenceSummary = summarizeDestinyMatrixEvidence(baseReport)

      logger.info('[destiny-matrix/ai-report] Persisting generated report', {
        reportMode,
        reportType,
        theme: theme || null,
        period: period || null,
        overallScore,
      })
      let savedReport
      try {
        savedReport = await prisma.destinyMatrixReport.create({
          data: {
            userId,
            reportType,
            period: period || null,
            theme: theme || null,
            reportData: aiReportWithAudits as object,
            title: reportTitle,
            summary: reportSummary,
            overallScore,
            grade: scoreToGrade(overallScore),
            locale: normalizedMatrixInput.lang || 'ko',
          },
        })
      } catch (persistError) {
        logger.error('[destiny-matrix/ai-report] Failed to persist generated report', {
          reportMode,
          reportType,
          theme: theme || null,
          period: period || null,
          message: persistError instanceof Error ? persistError.message : String(persistError),
          name: persistError instanceof Error ? persistError.name : 'Unknown',
        })
        throw persistError
      }

      logger.info('[destiny-matrix/ai-report] Report persisted successfully', {
        reportId: savedReport.id,
        reportMode,
        reportType,
      })

      // 13. PDF 형식 요청인 경우 (종합 리포트만 지원, Pro 이상)
      if (format === 'pdf') {
        const canUsePdf = await canUseFeature(userId, 'pdfReport')
        if (!canUsePdf) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FEATURE_LOCKED',
                message: 'PDF 리포트는 Pro 이상 플랜에서 사용 가능합니다.',
                upgrade: true,
              },
            },
            { status: HTTP_STATUS.FORBIDDEN }
          )
        }
        const pdfBytes = premiumReport
          ? await generatePremiumPDF(premiumReport)
          : await generateFivePagePDF(
              aiReportWithAudits as AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
            )

        // PDF 생성 상태 업데이트
        await prisma.destinyMatrixReport.update({
          where: { id: savedReport.id },
          data: { pdfGenerated: true },
        })

        return buildGeneratedReportPdfResponse({
          savedReportId: savedReport.id,
          pdfBytes,
        })
      }

      // 14. JSON 응답 (저장된 리포트 ID 포함)
      const predictionId = await persistReportPredictionSnapshotEntry({
        userId,
        lang: (normalizedMatrixInput.lang || 'ko') === 'en' ? 'en' : 'ko',
        theme: theme || reportType,
        reportType,
        reportSummary,
        report: aiReportWithAudits,
        matrixSummaryForGeneration,
      })

      return buildGeneratedReportJsonResponse({
        predictionId,
        creditsUsed: creditCost,
        remainingCredits: balance.remainingCredits - creditCost,
        reportType,
        report: aiReportWithAudits,
        savedReportId: savedReport.id,
        destinyMatrixEvidenceSummary,
      })

      /*


          id: savedReport.id, // DB에 저장된 ID로 덮어쓰기
      */
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : String(error)

      logger.error('AI Report Generation Error:', {
        message: rawErrorMessage,
        name: error instanceof Error ? error.name : 'Unknown',
        hasAnthropicKey: !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasTogetherKey: !!process.env.TOGETHER_API_KEY,
        hasReplicateKey: !!(process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN),
      })

      // AI 프로바이더 관련 에러는 사용자에게 친절한 메시지로 변환
      return buildAiReportErrorResponse(error)

      /* if (rawErrorMessage.includes('No AI providers available')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_NOT_CONFIGURED',
              message: 'AI 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.',
            },
          },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      if (
        rawErrorMessage.includes('All AI providers failed') ||
        rawErrorMessage.includes('API error')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_SERVICE_ERROR',
              message: 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
            },
          },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      if (
        rawErrorMessage.includes('No JSON found in AI response') ||
        rawErrorMessage.includes('AI response JSON is malformed') ||
        rawErrorMessage.includes('AI response is empty')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_RESPONSE_INVALID',
              message:
                'AI 응답 형식이 깨져 리포트 생성에 실패했습니다. 모델 설정이나 토큰 한도를 점검해 주세요.',
            },
          },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      if (
        rawErrorMessage.includes('prisma') ||
        rawErrorMessage.includes('Prisma') ||
        rawErrorMessage.includes('DATABASE_URL') ||
        rawErrorMessage.includes('destinyMatrixReport')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'REPORT_PERSIST_FAILED',
              message:
                '리포트 저장 단계에서 실패했습니다. 배포 DB 연결이나 마이그레이션 상태를 확인해 주세요.',
            },
          },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      if (
        rawErrorMessage.includes('aborted') ||
        rawErrorMessage.includes('timeout') ||
        rawErrorMessage.includes('AbortError')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_TIMEOUT',
              message: 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
            },
          },
          { status: HTTP_STATUS.SERVER_ERROR }
        )
      }

      const wrappedError = wrapError(error)
      return NextResponse.json(wrappedError.toJSON(), {
        status: wrappedError.getHttpStatus(),
      }) */
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-matrix/ai-report',
    limit: 10,
    windowSeconds: 60,
  })
)

// ===========================
// GET - PDF 다운로드 (리포트 ID로)
// ===========================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  // API 문서 반환
  if (format !== 'docs') {
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Use POST to generate reports. Add ?format=docs for API documentation.' },
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }

  return NextResponse.json({
    openapi: '3.0.0',
    info: {
      title: 'Destiny Fusion Matrix™ AI Premium Report API',
      version: '1.0.0',
      description: 'AI 기반 프리미엄 운명 분석 리포트 생성 (유료)',
    },
    paths: {
      '/api/destiny-matrix/ai-report': {
        post: {
          summary: 'AI 프리미엄 리포트 생성',
          description: '크레딧을 사용하여 AI 기반 상세 리포트를 생성합니다.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AIReportRequest' },
              },
            },
          },
          responses: {
            '200': { description: '성공 - JSON 또는 PDF 리포트' },
            '401': { description: '인증 필요' },
            '402': { description: '크레딧 부족' },
            '403': { description: '기능 잠금 (플랜 업그레이드 필요)' },
          },
        },
      },
    },
    components: {
      schemas: {
        AIReportRequest: {
          type: 'object',
          required: ['dayMasterElement'],
          properties: {
            dayMasterElement: { type: 'string', enum: ['목', '화', '토', '금', '수'] },
            name: { type: 'string', description: '사용자 이름 (선택)' },
            birthDate: { type: 'string', description: '생년월일 (선택)' },
            format: { type: 'string', enum: ['json', 'pdf'], default: 'json' },
            reportTier: {
              type: 'string',
              enum: ['free', 'premium'],
              default: 'premium',
              description: 'free는 무료 요약 리포트(크레딧 차감 없음), premium은 상세 AI 리포트',
            },
            detailLevel: {
              type: 'string',
              enum: ['standard', 'detailed', 'comprehensive'],
              default: 'detailed',
            },
            bilingual: {
              type: 'boolean',
              description: '종합 리포트에서 한/영 동시 출력 여부 (기본 false)',
            },
            targetChars: {
              type: 'number',
              description: '종합 리포트 목표 최소 글자 수 (권장 8000~20000)',
            },
            tone: {
              type: 'string',
              enum: ['friendly', 'realistic'],
              description: '서술 톤 (기본 friendly)',
            },
            userQuestion: {
              type: 'string',
              description:
                '사용자 원문 질문. 예/아니오 질문은 행동 가이드 중심으로 자동 라우팅됩니다.',
            },
            deterministicProfile: {
              type: 'string',
              enum: ['strict', 'balanced', 'aggressive'],
              description: '결정형 판정식 가중치 프로파일 (기본 balanced)',
            },
            currentDateIso: {
              type: 'string',
              description: '기준 날짜(YYYY-MM-DD). 미입력 시 서버 오늘 날짜로 자동 주입',
            },
            sajuSnapshot: {
              type: 'object',
              description: '사주 전체 원본 스냅샷(JSON object)',
            },
            astrologySnapshot: {
              type: 'object',
              description: '점성 전체 원본 스냅샷(JSON object)',
            },
            crossSnapshot: {
              type: 'object',
              description: '교차/그래프 근거 전체 원본 스냅샷(JSON object)',
            },
            queryDomain: {
              type: 'string',
              enum: [
                'personality',
                'career',
                'relationship',
                'wealth',
                'health',
                'spirituality',
                'timing',
              ],
            },
            lang: { type: 'string', enum: ['ko', 'en'], default: 'ko' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
    pricing: {
      creditCost: REPORT_CREDIT_COSTS.comprehensive,
      description: `Premium AI 리포트 1회 생성 = ${REPORT_CREDIT_COSTS.comprehensive} 크레딧 (Free 요약 버전은 0 크레딧)`,
      availablePlans: ['pro', 'premium'],
    },
  })
}

// ===========================
// 헬퍼 함수
// ===========================

type MatrixLayer = Record<string, unknown>
type MatrixLayers = {
  layer1_elementCore: MatrixLayer
  layer2_sibsinPlanet: MatrixLayer
  layer3_sibsinHouse: MatrixLayer
  layer4_timing: MatrixLayer
  layer5_relationAspect: MatrixLayer
  layer6_stageHouse: MatrixLayer
  layer7_advanced: MatrixLayer
  layer8_shinsalPlanet: MatrixLayer
  layer9_asteroidHouse: MatrixLayer
  layer10_extraPointElement: MatrixLayer
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function _extractAllLayerCells(matrix: MatrixLayers): Record<string, Record<string, MatrixCell>> {
  return {
    layer1: extractLayerCells(matrix.layer1_elementCore),
    layer2: extractLayerCells(matrix.layer2_sibsinPlanet),
    layer3: extractLayerCells(matrix.layer3_sibsinHouse),
    layer4: extractLayerCells(matrix.layer4_timing),
    layer5: extractLayerCells(matrix.layer5_relationAspect),
    layer6: extractLayerCells(matrix.layer6_stageHouse),
    layer7: extractLayerCells(matrix.layer7_advanced),
    layer8: extractLayerCells(matrix.layer8_shinsalPlanet),
    layer9: extractLayerCells(matrix.layer9_asteroidHouse),
    layer10: extractLayerCells(matrix.layer10_extraPointElement),
  }
}

function isMatrixCell(obj: unknown): obj is MatrixCell {
  if (!isRecord(obj)) {
    return false
  }
  const candidate = obj as Record<string, unknown>
  if (!isRecord(candidate.interaction)) {
    return false
  }
  return 'level' in candidate.interaction
}

function extractLayerCells(layerData: Record<string, unknown>): Record<string, MatrixCell> {
  const cells: Record<string, MatrixCell> = {}

  for (const [cellKey, cellData] of Object.entries(layerData || {})) {
    if (isRecord(cellData)) {
      // 새 Computed 형식: { interaction: {...}, sajuBasis: "...", astroBasis: "..." }
      if (isMatrixCell(cellData)) {
        cells[cellKey] = cellData
      }
      // 레거시 중첩 형식 (하위 호환성)
      else {
        for (const [colKey, interaction] of Object.entries(cellData)) {
          if (isRecord(interaction) && 'level' in interaction) {
            const nestedCellKey = `${cellKey}_${colKey}`
            cells[nestedCellKey] = { interaction: interaction as MatrixCell['interaction'] }
          }
        }
      }
    }
  }

  return cells
}

// ===========================
// 타이밍 데이터 빌더
// ===========================

// ===========================
// 리포트 저장 헬퍼 함수
// ===========================

export const __testables = {
  deriveDominantWesternElementFromPlanetSigns,
  buildTimingDataFromDerivedSaju,
  enrichRequestWithDerivedSaju,
}
