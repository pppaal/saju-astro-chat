import { NextResponse } from 'next/server'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'
import type { TimingAIPremiumReport, ThemedAIPremiumReport } from '@/lib/destiny-matrix/ai-report/types'
import { auditCrossConsistency } from '@/lib/destiny-matrix/ai-report/crossConsistencyAudit'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import {
  evaluatePatternQualityGate,
  getStrictPatternThresholds,
  isStrictGateEnabled,
  isStrictPatternGuardEnabled,
  type GeneratedReportMode,
  type PatternQualityGateResult,
} from './routeExecutionHelpers'

type ReportUnion = AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport

export function enforceThemeQualityGate(input: {
  theme?: string
  aiReport: ReportUnion
}): { response: NextResponse } | null {
  if (!input.theme) return null

  const themedQualityAudit = (
    input.aiReport as ThemedAIPremiumReport & {
      qualityAudit?: { shouldBlock?: boolean; overclaimFindings?: Array<{ section: string }> }
    }
  ).qualityAudit
  const strictThemeQuality = isStrictGateEnabled('AI_REPORT_STRICT_THEME_QUALITY')

  if (strictThemeQuality && themedQualityAudit?.shouldBlock) {
    const blockedSections = Array.from(
      new Set((themedQualityAudit.overclaimFindings || []).map((item) => item.section))
    )
    return {
      response: NextResponse.json(
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
      ),
    }
  }

  if (!strictThemeQuality && themedQualityAudit?.shouldBlock) {
    logger.warn('[destiny-matrix/ai-report] Theme quality gate flagged overclaim; continuing in soft mode', {
      theme: input.theme,
      findings: (themedQualityAudit.overclaimFindings || []).slice(0, 5),
    })
  }

  return null
}

export async function finalizeReportQuality(input: {
  reportMode: GeneratedReportMode
  matrixInput: MatrixCalculationInput
  aiReport: ReportUnion
  premiumReport: AIPremiumReport | null
  inputReadinessScore: number
  regenerate: () => Promise<{
    aiReport: ReportUnion
    premiumReport: AIPremiumReport | null
  }>
}): Promise<
  | {
      aiReport: ReportUnion
      premiumReport: AIPremiumReport | null
      crossConsistencyAudit: ReturnType<typeof auditCrossConsistency>
      patternQualityGate: PatternQualityGateResult
      strictRetryAttempted: boolean
    }
  | { response: NextResponse }
> {
  let aiReport = input.aiReport
  let premiumReport = input.premiumReport

  let crossConsistencyAudit = auditCrossConsistency({
    mode: input.reportMode,
    matrixInput: input.matrixInput,
    report: aiReport,
    graphEvidence: aiReport.graphRagEvidence || null,
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
    inputReadinessScore: input.inputReadinessScore,
    thresholds: strictThresholds,
  })

  if (isStrictPatternGuardEnabled() && !patternQualityGate.passed) {
    strictRetryAttempted = true
    logger.warn('[destiny-matrix/ai-report] Pattern quality gate failed; retrying once', {
      blockers: patternQualityGate.blockers,
      metrics: patternQualityGate.metrics,
      thresholds: strictThresholds,
      reportMode: input.reportMode,
    })

    try {
      const retried = await input.regenerate()
      aiReport = retried.aiReport
      premiumReport = retried.premiumReport
    } catch (retryError) {
      return {
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'PATTERN_QUALITY_BLOCKED',
              message: '패턴 품질 게이트 재생성 단계에서 기준 미달로 차단되었습니다.',
              retryError: retryError instanceof Error ? retryError.message : String(retryError),
              patternQualityGate: { ...patternQualityGate, strictRetryAttempted },
              crossConsistencyAudit,
            },
          },
          { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
        ),
      }
    }

    crossConsistencyAudit = auditCrossConsistency({
      mode: input.reportMode,
      matrixInput: input.matrixInput,
      report: aiReport,
      graphEvidence: aiReport.graphRagEvidence || null,
    })

    patternQualityGate = evaluatePatternQualityGate({
      report: aiReport,
      crossConsistencyScore: crossConsistencyAudit.score,
      inputReadinessScore: input.inputReadinessScore,
      thresholds: strictThresholds,
    })

    if (!patternQualityGate.passed) {
      return {
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'PATTERN_QUALITY_BLOCKED',
              message:
                '패턴 품질 게이트 기준(교차 정합, Graph anchor, 패턴 수)을 충족하지 못해 리포트 생성을 차단했습니다.',
              patternQualityGate: { ...patternQualityGate, strictRetryAttempted },
              crossConsistencyAudit,
            },
          },
          { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
        ),
      }
    }
  }

  if (!isStrictPatternGuardEnabled() && !patternQualityGate.passed) {
    logger.warn('[destiny-matrix/ai-report] Pattern quality gate failed; strict guard disabled, continuing', {
      blockers: patternQualityGate.blockers,
      metrics: patternQualityGate.metrics,
      thresholds: strictThresholds,
    })
  }

  return {
    aiReport,
    premiumReport,
    crossConsistencyAudit,
    patternQualityGate,
    strictRetryAttempted,
  }
}
