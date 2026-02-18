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
import { idParamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ReportSection = { title: string; content: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const SECTION_TITLES_KO: Record<string, string> = {
  overview: '??',
  energy: '??? ??',
  opportunities: '?? ??',
  cautions: '?? ??',
  actionPlan: '?? ???',
  luckyElements: '?? ??',
  deepAnalysis: '?? ??',
  patterns: '?? ??',
  timing: '?? ???',
  compatibility: '?? ??',
  strategy: '??',
  prevention: '?? ???',
  dynamics: '?? ??',
  recommendations: '?? ???',
  introduction: '?? ??',
  personalityDeep: '?? ??',
  careerPath: '???',
  relationshipDynamics: '??',
  wealthPotential: '??',
  healthGuidance: '??',
  lifeMission: '?? ??',
  timingAdvice: '?? ??',
  conclusion: '???',
  domain_career: '???',
  domain_love: '??/??',
  domain_wealth: '??',
  domain_health: '??',
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
  strategy: 'Strategy',
  prevention: 'Prevention',
  dynamics: 'Dynamics',
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
  locale: string
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
    pushIf('deepAnalysis', rawSections.deepAnalysis)
    pushIf('patterns', rawSections.patterns)
    pushIf('timing', rawSections.timing)
    if ('compatibility' in rawSections) pushIf('compatibility', rawSections.compatibility)
    if ('strategy' in rawSections) pushIf('strategy', rawSections.strategy)
    if ('prevention' in rawSections) pushIf('prevention', rawSections.prevention)
    if ('dynamics' in rawSections) pushIf('dynamics', rawSections.dynamics)
    pushIf('recommendations', rawSections.recommendations)
    pushIf('actionPlan', rawSections.actionPlan)
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
          return apiError(ErrorCodes.NOT_FOUND, '리포트를 찾을 수 없습니다.')
        }

        const reportData = report.reportData as Record<string, unknown>

        const sections = normalizeSections(
          report.reportType,
          reportData,
          report.locale || (reportData?.lang as string) || 'ko'
        )

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
            fullData: reportData,
          },
        })
      } catch (error) {
        logger.error('Report Fetch Error:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, '리포트 조회 중 오류가 발생했습니다.')
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
