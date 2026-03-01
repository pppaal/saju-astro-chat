// src/app/api/reports/[id]/route.ts
// 저장된 AI 프리미엄 리포트 조회 API

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createErrorResponse } from '@/lib/api/errorHandler'
import { idParamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { summarizeGraphRAGEvidence } from '@/lib/destiny-matrix/ai-report'
import {
  getThemedSectionKeys,
  normalizeReportTheme,
} from '@/lib/destiny-matrix/ai-report/themeSchema'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ReportSection = { title: string; content: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const SECTION_TITLES_KO: Record<string, string> = {
  overview: '\uAC1C\uC694',
  energy: '\uC5D0\uB108\uC9C0 \uD750\uB984',
  opportunities: '\uAE30\uD68C \uD3EC\uC778\uD2B8',
  cautions: '\uC8FC\uC758 \uD3EC\uC778\uD2B8',
  actionPlan: '\uC2E4\uD589 \uACC4\uD68D',
  luckyElements: '\uD589\uC6B4 \uC694\uC18C',
  deepAnalysis: '\uC2EC\uCE35 \uBD84\uC11D',
  patterns: '\uD328\uD134 \uBD84\uC11D',
  timing: '\uD0C0\uC774\uBC0D',
  compatibility: '\uAD81\uD569 \uBD84\uC11D',
  spouseProfile: '\uBC30\uC6B0\uC790\uC0C1/\uC774\uC0C1\uD615',
  marriageTiming: '\uACB0\uD63C \uD0C0\uC774\uBC0D',
  strategy: '\uC804\uB7B5',
  roleFit: '\uC9C1\uBB34 \uC801\uD569',
  turningPoints: '\uC804\uD658\uC810',
  incomeStreams: '\uC218\uC785\uC6D0 \uBD84\uC11D',
  riskManagement: '\uB9AC\uC2A4\uD06C \uAD00\uB9AC',
  prevention: '\uC608\uBC29 \uC804\uB7B5',
  riskWindows: '\uC704\uD5D8 \uAD6C\uAC04',
  recoveryPlan: '\uD68C\uBCF5 \uB8E8\uD2F4',
  dynamics: '\uAD00\uACC4 \uC5ED\uD559',
  communication: '\uC18C\uD1B5 \uBC29\uC2DD',
  legacy: '\uAC00\uC871 \uC720\uC0B0/\uC138\uB300 \uACFC\uC81C',
  recommendations: '\uCD94\uCC9C \uD589\uB3D9',
  introduction: '\uB3C4\uC785\uBD80',
  personalityDeep: '\uC131\uD5A5 \uBD84\uC11D',
  careerPath: '\uCEE4\uB9AC\uC5B4',
  relationshipDynamics: '\uAD00\uACC4',
  wealthPotential: '\uC7AC\uBB34',
  healthGuidance: '\uAC74\uAC15',
  lifeMission: '\uC778\uC0DD \uBBF8\uC158',
  timingAdvice: '\uD0C0\uC774\uBC0D \uC870\uC5B8',
  conclusion: '\uACB0\uB860',
  domain_career: '\uCEE4\uB9AC\uC5B4',
  domain_love: '\uC5F0\uC560/\uAD00\uACC4',
  domain_wealth: '\uC7AC\uBB34',
  domain_health: '\uAC74\uAC15',
}
const SECTION_TITLES_EN: Record<string, string> = {
  overview: 'Overview',
  energy: 'Energy Flow',
  opportunities: 'Opportunities',
  cautions: 'Cautions',
  actionPlan: 'Action Plan',
  luckyElements: 'Lucky Elements',
  deepAnalysis: 'Deep Analysis',
  patterns: 'Patterns',
  timing: 'Timing',
  compatibility: 'Compatibility',
  spouseProfile: 'Spouse Profile',
  marriageTiming: 'Marriage Timing',
  strategy: 'Strategy',
  roleFit: 'Role Fit',
  turningPoints: 'Turning Points',
  incomeStreams: 'Income Streams',
  riskManagement: 'Risk Management',
  prevention: 'Prevention',
  riskWindows: 'Risk Windows',
  recoveryPlan: 'Recovery Plan',
  dynamics: 'Dynamics',
  communication: 'Communication',
  legacy: 'Legacy',
  recommendations: 'Recommendations',
  introduction: 'Introduction',
  personalityDeep: 'Personality',
  careerPath: 'Career',
  relationshipDynamics: 'Relationships',
  wealthPotential: 'Wealth',
  healthGuidance: 'Health',
  lifeMission: 'Life Mission',
  timingAdvice: 'Timing Advice',
  conclusion: 'Conclusion',
  domain_career: 'Career',
  domain_love: 'Love/Relationships',
  domain_wealth: 'Wealth',
  domain_health: 'Health',
}

function titleForKey(key: string, locale: string): string {
  const isKo = locale?.startsWith('ko')
  const dict = isKo ? SECTION_TITLES_KO : SECTION_TITLES_EN
  return dict[key] || key
}

function toSentenceBlock(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim()
    return joined.length > 0 ? joined : null
  }
  return null
}

function normalizeSections(
  reportType: string,
  reportData: Record<string, unknown>,
  locale: string,
  theme?: string | null
): ReportSection[] {
  const rawSections = reportData.sections
  if (Array.isArray(rawSections) && rawSections.length > 0) {
    return rawSections as ReportSection[]
  }

  if (!isRecord(rawSections)) {
    return []
  }

  const sections: ReportSection[] = []
  const pushIf = (key: string, value: unknown) => {
    const content = toSentenceBlock(value)
    if (content) {
      sections.push({ title: titleForKey(key, locale), content })
    }
  }

  if (reportType === 'timing') {
    pushIf('overview', rawSections.overview)
    pushIf('energy', rawSections.energy)
    pushIf('opportunities', rawSections.opportunities)
    pushIf('cautions', rawSections.cautions)
    if (isRecord(rawSections.domains)) {
      pushIf('domain_career', rawSections.domains.career)
      pushIf('domain_love', rawSections.domains.love)
      pushIf('domain_wealth', rawSections.domains.wealth)
      pushIf('domain_health', rawSections.domains.health)
    }
    pushIf('actionPlan', rawSections.actionPlan)
    pushIf('luckyElements', rawSections.luckyElements)
    return sections
  }

  if (reportType === 'themed') {
    const normalizedTheme = normalizeReportTheme(theme)
    const orderedKeys = normalizedTheme
      ? [...getThemedSectionKeys(normalizedTheme)]
      : ['deepAnalysis', 'patterns', 'timing', 'recommendations', 'actionPlan']
    for (const key of orderedKeys) {
      pushIf(key, rawSections[key])
    }
    return sections
  }

  pushIf('introduction', rawSections.introduction)
  pushIf('personalityDeep', rawSections.personalityDeep)
  pushIf('careerPath', rawSections.careerPath)
  pushIf('relationshipDynamics', rawSections.relationshipDynamics)
  pushIf('wealthPotential', rawSections.wealthPotential)
  pushIf('healthGuidance', rawSections.healthGuidance)
  pushIf('lifeMission', rawSections.lifeMission)
  pushIf('timingAdvice', rawSections.timingAdvice)
  pushIf('actionPlan', rawSections.actionPlan)
  pushIf('conclusion', rawSections.conclusion)
  return sections
}

// GET - 리포트 조회
export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'reports/[id]',
    })
  }
  const reportId = paramValidation.data.id

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const report = await prisma.destinyMatrixReport.findFirst({
          where: {
            id: reportId,
            userId: context.userId!,
          },
          select: {
            id: true,
            reportType: true,
            period: true,
            theme: true,
            reportData: true,
            title: true,
            summary: true,
            overallScore: true,
            grade: true,
            pdfGenerated: true,
            pdfUrl: true,
            locale: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        if (!report) {
          const reportOwner = await prisma.destinyMatrixReport.findUnique({
            where: { id: reportId },
            select: { userId: true, createdAt: true },
          })

          if (reportOwner) {
            logger.warn('[Report Fetch Forbidden] Report ownership mismatch', {
              reportId,
              requesterUserId: context.userId,
              ownerUserId: reportOwner.userId,
              reportCreatedAt: reportOwner.createdAt.toISOString(),
            })
            return createErrorResponse({
              code: ErrorCodes.FORBIDDEN,
              message: '리포트 접근 권한이 없습니다.',
              locale: context.locale,
              route: '/api/reports/[id]',
              headers: {
                'X-Report-Fetch-Reason': 'owner-mismatch',
              },
            })
          }

          return createErrorResponse({
            code: ErrorCodes.NOT_FOUND,
            message: '리포트를 찾을 수 없습니다.',
            locale: context.locale,
            route: '/api/reports/[id]',
            headers: {
              'X-Report-Fetch-Reason': 'not-found',
            },
          })
        }

        const reportData = report.reportData as Record<string, unknown>

        const sections = normalizeSections(
          report.reportType,
          reportData,
          report.locale || (reportData?.lang as string) || 'ko',
          report.theme
        )
        const graphRagEvidence =
          reportData && isRecord(reportData) && 'graphRagEvidence' in reportData
            ? reportData.graphRagEvidence
            : undefined

        return apiSuccess({
          report: {
            id: report.id,
            type: report.reportType,
            period: report.period,
            theme: report.theme,
            title: report.title,
            summary: report.summary || reportData?.summary,
            score: report.overallScore,
            grade: report.grade,
            createdAt: report.createdAt.toISOString(),
            sections:
              sections.length > 0 ? sections : (reportData?.sections as ReportSection[]) || [],
            keywords: reportData?.keywords || [],
            insights: reportData?.insights || [],
            actionItems: reportData?.actionItems || [],
            qualityAudit:
              reportData && isRecord(reportData) && 'qualityAudit' in reportData
                ? reportData.qualityAudit
                : undefined,
            calculationDetails:
              reportData && isRecord(reportData) && 'calculationDetails' in reportData
                ? reportData.calculationDetails
                : undefined,
            graphRagEvidence,
            graphRagEvidenceSummary: summarizeGraphRAGEvidence(
              graphRagEvidence as Parameters<typeof summarizeGraphRAGEvidence>[0]
            ),
            fullData: reportData,
          },
        })
      } catch (error) {
        logger.error('Report Fetch Error:', error)
        return createErrorResponse({
          code: ErrorCodes.DATABASE_ERROR,
          message: '리포트 조회 중 오류가 발생했습니다.',
          locale: context.locale,
          route: '/api/reports/[id]',
          headers: {
            'X-Report-Fetch-Reason': 'db-error',
          },
        })
      }
    },
    createAuthenticatedGuard({
      route: '/api/reports/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}

// DELETE - 리포트 삭제
export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'reports/[id]',
    })
  }
  const reportId = paramValidation.data.id

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const deleted = await prisma.destinyMatrixReport.deleteMany({
          where: {
            id: reportId,
            userId: context.userId!,
          },
        })

        if (deleted.count === 0) {
          return apiError(ErrorCodes.NOT_FOUND, '리포트를 찾을 수 없습니다.')
        }

        return apiSuccess({ message: '리포트가 삭제되었습니다.' })
      } catch (error) {
        logger.error('Report Delete Error:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, '리포트 삭제 중 오류가 발생했습니다.')
      }
    },
    createAuthenticatedGuard({
      route: '/api/reports/[id]',
      limit: 20,
      windowSeconds: 60,
    })
  )

  return handler(request)
}
