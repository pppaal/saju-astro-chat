// src/app/api/destiny-matrix/ai-report/route.ts
// Destiny Fusion Matrix™ - AI Premium Report API (유료)
// 크레딧 차감 후 AI 리포트 생성 + PDF 다운로드

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import {
  calculateDestinyMatrix,
  FusionReportGenerator,
  validateReportRequest,
  DestinyMatrixError,
  ErrorCodes,
  wrapError,
} from '@/lib/destiny-matrix'
import type { MatrixCalculationInput, InsightDomain, MatrixCell } from '@/lib/destiny-matrix'
import {
  generateAIPremiumReport,
  generateTimingReport,
  generateThemedReport,
  generateFivePagePDF,
  generatePremiumPDF,
  REPORT_CREDIT_COSTS,
  summarizeDestinyMatrixEvidence,
  summarizeGraphRAGEvidence,
  type AIPremiumReport,
  type ReportPeriod,
  type ReportTheme,
  type TimingData,
  type TimingAIPremiumReport,
  type ThemedAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report'
import {
  evaluateThemedReportQuality,
  buildCalculationDetails,
} from '@/lib/destiny-matrix/ai-report/qualityAudit'
import { auditCrossConsistency } from '@/lib/destiny-matrix/ai-report/crossConsistencyAudit'
import { canUseFeature, consumeCredits, getCreditBalance } from '@/lib/credits/creditService'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import {
  calculateNatalChart,
  toChart,
  findNatalAspects,
  calculateTransitChart,
  findMajorTransits,
  calculateSecondaryProgressions,
  calculateSolarReturn,
  calculateLunarReturn,
} from '@/lib/astrology'
import type { FiveElement } from '@/lib/Saju/types'

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

const ELEMENT_MAP: Record<string, FiveElement> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const GEOKGUK_ALIASES: Partial<Record<string, MatrixCalculationInput['geokguk']>> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
  종왕격: 'jonggang',
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const toOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const STEM_ELEMENTS: Record<string, string> = {
  갑: '목',
  을: '목',
  병: '화',
  정: '화',
  무: '토',
  기: '토',
  경: '금',
  신: '금',
  임: '수',
  계: '수',
}

function normalizeGenderForSaju(value: unknown): 'male' | 'female' {
  const normalized = toOptionalString(value)?.toLowerCase()
  if (normalized === 'f' || normalized === 'female') {
    return 'female'
  }
  return 'male'
}

function deriveSibsinDistributionFromSaju(sajuData: ReturnType<typeof calculateSajuData>) {
  const distribution: Record<string, number> = {}
  const pillars = [
    sajuData.yearPillar,
    sajuData.monthPillar,
    sajuData.dayPillar,
    sajuData.timePillar,
  ]
  for (const pillar of pillars) {
    if (pillar?.heavenlyStem?.sibsin) {
      distribution[pillar.heavenlyStem.sibsin] = (distribution[pillar.heavenlyStem.sibsin] || 0) + 1
    }
    if (pillar?.earthlyBranch?.sibsin) {
      distribution[pillar.earthlyBranch.sibsin] =
        (distribution[pillar.earthlyBranch.sibsin] || 0) + 1
    }
  }
  return distribution
}

function enrichRequestWithDerivedSaju(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  const birthDate = toOptionalString(requestBody.birthDate)
  if (!birthDate) {
    return requestBody
  }

  const birthTime = toOptionalString(requestBody.birthTime) || '12:00'
  const timezone = toOptionalString(requestBody.timezone) || 'Asia/Seoul'
  const gender = normalizeGenderForSaju(requestBody.gender)

  try {
    const sajuData = calculateSajuData(birthDate, birthTime, gender, 'solar', timezone)
    const dayElement = toOptionalString(sajuData.dayPillar?.heavenlyStem?.element)
    const derivedDayMaster = dayElement ? ELEMENT_MAP[dayElement] : undefined

    if (derivedDayMaster) {
      requestBody.dayMasterElement = derivedDayMaster
    }

    const hasSibsinDistribution =
      !!requestBody.sibsinDistribution &&
      typeof requestBody.sibsinDistribution === 'object' &&
      !Array.isArray(requestBody.sibsinDistribution) &&
      Object.keys(requestBody.sibsinDistribution as Record<string, unknown>).length > 0
    if (!hasSibsinDistribution) {
      requestBody.sibsinDistribution = deriveSibsinDistributionFromSaju(sajuData)
    }

    const geokguk = toOptionalString(requestBody.geokguk)
    const yongsin = toOptionalString(requestBody.yongsin)
    if (!geokguk || !yongsin) {
      const advanced = analyzeAdvancedSaju(
        {
          name: sajuData.dayPillar.heavenlyStem.name,
          element: sajuData.dayPillar.heavenlyStem.element,
          yin_yang: sajuData.dayPillar.heavenlyStem.yin_yang || '양',
        },
        {
          yearPillar: sajuData.yearPillar,
          monthPillar: sajuData.monthPillar,
          dayPillar: sajuData.dayPillar,
          timePillar: sajuData.timePillar,
        }
      )
      if (!geokguk) {
        requestBody.geokguk = GEOKGUK_ALIASES[advanced.geokguk.type] || advanced.geokguk.type
      }
      if (!yongsin) {
        requestBody.yongsin = advanced.yongsin.primary
      }
    }

    const annualElement = toOptionalString(sajuData.unse?.annual?.[0]?.element)
    if (!requestBody.currentSaeunElement && annualElement && ELEMENT_MAP[annualElement]) {
      requestBody.currentSaeunElement = ELEMENT_MAP[annualElement]
    }
  } catch (error) {
    logger.warn('[destiny-matrix/ai-report] Failed to derive saju from birth profile', {
      error: error instanceof Error ? error.message : String(error),
      birthDate,
    })
  }

  return requestBody
}

async function enrichRequestWithDerivedAstrology(
  requestBody: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const hasAstroSnapshot =
    !!requestBody.astrologySnapshot &&
    typeof requestBody.astrologySnapshot === 'object' &&
    !Array.isArray(requestBody.astrologySnapshot)
  if (hasAstroSnapshot) {
    return requestBody
  }

  const birthDate = toOptionalString(requestBody.birthDate)
  const birthTime = toOptionalString(requestBody.birthTime)
  if (!birthDate || !birthTime) return requestBody

  const [year, month, date] = birthDate.split('-').map((v) => Number(v))
  const [hour, minute] = birthTime.split(':').map((v) => Number(v))
  if ([year, month, date, hour, minute].some((v) => !Number.isFinite(v))) return requestBody

  const latitude = toOptionalNumber(requestBody.latitude) ?? 37.5665
  const longitude = toOptionalNumber(requestBody.longitude) ?? 126.978
  const timeZone = toOptionalString(requestBody.timezone) || 'Asia/Seoul'

  try {
    const natal = await calculateNatalChart({
      year,
      month,
      date,
      hour,
      minute,
      latitude,
      longitude,
      timeZone,
    })
    const natalChart = toChart(natal)
    const natalAspects = findNatalAspects(natalChart, { includeMinor: true, maxResults: 80 })
    const nowIso = new Date().toISOString()
    const transit = await calculateTransitChart({
      iso: nowIso,
      latitude,
      longitude,
      timeZone,
    })
    const majorTransits = findMajorTransits(transit, natalChart, 1.0).slice(0, 40)

    const natalInput = { year, month, date, hour, minute, latitude, longitude, timeZone }
    const progressions = await calculateSecondaryProgressions({
      natal: natalInput,
      targetDate: nowIso.slice(0, 10),
    })
    const solarReturn = await calculateSolarReturn({
      natal: natalInput,
      year: new Date().getFullYear(),
    })
    const lunarReturn = await calculateLunarReturn({
      natal: natalInput,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    })

    const planetSigns: Record<string, string> = {}
    const planetHouses: Record<string, number> = {}
    for (const p of natal.planets) {
      if (typeof p.name === 'string' && typeof p.sign === 'string') {
        planetSigns[p.name] = p.sign
      }
      if (typeof p.name === 'string' && Number.isFinite(p.house)) {
        planetHouses[p.name] = p.house
      }
    }

    requestBody.astrologySnapshot = {
      natalChart: natal,
      natalAspects,
      currentTransits: {
        asOfIso: nowIso,
        majorTransits,
      },
      progressions,
      returns: {
        solarReturn,
        lunarReturn,
      },
    }
    if (!requestBody.planetSigns || typeof requestBody.planetSigns !== 'object') {
      requestBody.planetSigns = planetSigns
    }
    if (!requestBody.planetHouses || typeof requestBody.planetHouses !== 'object') {
      requestBody.planetHouses = planetHouses
    }
    if (!Array.isArray(requestBody.aspects)) {
      requestBody.aspects = natalAspects.map((a) => ({
        planet1: a.from.name,
        planet2: a.to.name,
        type: a.type,
        orb: a.orb,
      }))
    }
  } catch (error) {
    logger.warn('[destiny-matrix/ai-report] Failed to derive astrology from birth profile', {
      error: error instanceof Error ? error.message : String(error),
      birthDate,
    })
  }

  return requestBody
}

function mergeTimingData(
  autoTiming: TimingData,
  requestTiming?: Record<string, unknown>
): TimingData {
  const req = requestTiming || {}
  return {
    daeun: (toOptionalRecord(req.daeun) as TimingData['daeun']) || autoTiming.daeun,
    seun: (toOptionalRecord(req.seun) as TimingData['seun']) || autoTiming.seun,
    wolun: (toOptionalRecord(req.wolun) as TimingData['wolun']) || autoTiming.wolun,
    iljin: (toOptionalRecord(req.iljin) as TimingData['iljin']) || autoTiming.iljin,
  }
}

function listAiReportMissing(
  matrixInput: MatrixCalculationInput,
  timingData: TimingData
): string[] {
  const missing: string[] = []
  if (!matrixInput.sajuSnapshot || Object.keys(matrixInput.sajuSnapshot).length === 0) {
    missing.push('sajuSnapshot')
  }
  if (!matrixInput.astrologySnapshot || Object.keys(matrixInput.astrologySnapshot).length === 0) {
    missing.push('astrologySnapshot')
  }
  if (!matrixInput.crossSnapshot || Object.keys(matrixInput.crossSnapshot).length === 0) {
    missing.push('crossSnapshot')
  }
  if (!timingData.seun) missing.push('timingData.seun')
  if (!timingData.wolun) missing.push('timingData.wolun')
  if (!timingData.iljin) missing.push('timingData.iljin')
  if (!timingData.daeun) missing.push('timingData.daeun')
  return missing
}

function normalizeAIUserPlan(plan: unknown): 'free' | 'starter' | 'pro' | 'premium' {
  if (plan === 'starter' || plan === 'pro' || plan === 'premium') {
    return plan
  }
  return 'free'
}

type ReportTier = 'free' | 'premium'

type FreeAIDigestReport = {
  id: string
  tier: 'free'
  generatedAt: string
  lang: 'ko' | 'en'
  headline: string
  summary: string
  overallScore: number
  grade: string
  topInsights: Array<{
    title: string
    reason: string
    action: string
  }>
  focusAreas: Array<{
    domain: string
    score: number
    summary: string
  }>
  caution: string[]
  nextSteps: string[]
}

function normalizeReportTier(value: unknown): ReportTier {
  if (typeof value === 'string' && value.toLowerCase() === 'free') {
    return 'free'
  }
  return 'premium'
}

function buildFreeDigestReport(baseReport: {
  overallScore: { total: number; grade: string; gradeDescription: string }
  topInsights: Array<{
    title: string
    description: string
    actionItems?: Array<{ text: string }>
    category?: string
  }>
  domainAnalysis: Array<{
    domain: string
    score: number
    summary: string
    hasData?: boolean
  }>
  lang: 'ko' | 'en'
}): FreeAIDigestReport {
  const topInsights = (baseReport.topInsights || []).slice(0, 3).map((item) => ({
    title: item.title,
    reason: item.description,
    action:
      item.actionItems && item.actionItems.length > 0
        ? item.actionItems[0]?.text ||
          (baseReport.lang === 'ko'
            ? '핵심 우선순위를 1개 정하세요.'
            : 'Pick one top priority first.')
        : baseReport.lang === 'ko'
          ? '핵심 우선순위를 1개 정하세요.'
          : 'Pick one top priority first.',
  }))

  const focusAreas = (baseReport.domainAnalysis || [])
    .filter((d) => d.hasData !== false)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) => ({
      domain: d.domain,
      score: d.score,
      summary: d.summary,
    }))

  const caution = (baseReport.topInsights || [])
    .filter((item) => item.category === 'caution' || item.category === 'challenge')
    .slice(0, 2)
    .map((item) => item.title)

  return {
    id: `free_${Date.now()}`,
    tier: 'free',
    generatedAt: new Date().toISOString(),
    lang: baseReport.lang,
    headline:
      baseReport.lang === 'ko' ? 'AI 리포트 무료 버전 요약' : 'AI Report Free Version Summary',
    summary:
      baseReport.lang === 'ko'
        ? `${baseReport.overallScore.gradeDescription} 핵심 신호를 빠르게 요약했습니다.`
        : `A quick summary of key signals. ${baseReport.overallScore.gradeDescription}`,
    overallScore: Math.round(baseReport.overallScore.total),
    grade: baseReport.overallScore.grade,
    topInsights,
    focusAreas,
    caution,
    nextSteps:
      baseReport.lang === 'ko'
        ? [
            '오늘 기준 실행 과제 1~2개만 선정하세요.',
            '중요 결정 전 조건/기한/리스크를 다시 확인하세요.',
            '프리미엄 버전에서 교차 근거와 상세 행동 플랜을 확인하세요.',
          ]
        : [
            'Select only 1-2 execution tasks for today.',
            'Re-check terms, deadlines, and risks before major decisions.',
            'Use the premium version for deeper cross-evidence and action planning.',
          ],
  }
}

function buildTimingData(targetDate?: string): TimingData {
  // Parse target date or use today
  const date = targetDate ? new Date(targetDate) : new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // 년주 계산 (간단한 근사)
  const yearStemIdx = (year - 4) % 10
  const yearBranchIdx = (year - 4) % 12

  // 월주 계산 (간단한 근사 - 실제는 절기 기준)
  const monthStemIdx = (((year - 4) % 5) * 2 + month + 1) % 10
  const monthBranchIdx = (month + 1) % 12

  // 일주 계산 (간단한 근사)
  const baseDate = new Date(1900, 0, 1)
  const dayDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  const dayStemIdx = (dayDiff + 10) % 10
  const dayBranchIdx = dayDiff % 12

  return {
    seun: {
      year,
      heavenlyStem: HEAVENLY_STEMS[yearStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[yearBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[yearStemIdx]],
    },
    wolun: {
      month,
      heavenlyStem: HEAVENLY_STEMS[monthStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[monthBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[monthStemIdx]],
    },
    iljin: {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      heavenlyStem: HEAVENLY_STEMS[dayStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[dayBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[dayStemIdx]],
    },
  }
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

      let requestBody = enrichRequestWithDerivedSaju({ ...(body as Record<string, unknown>) })
      requestBody = await enrichRequestWithDerivedAstrology(requestBody)
      const period = requestBody.period as ReportPeriod | undefined
      const theme = requestBody.theme as ReportTheme | undefined
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

      // 5. 요청 검증
      const validation = validateReportRequest(requestBody)
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_ERROR,
              message: '입력 데이터 검증에 실패했습니다.',
              details: validation.errors,
            },
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const validatedInput = validation.data!
      const { queryDomain, maxInsights, includeVisualizations, includeDetailedData, ...rest } =
        validatedInput

      // 6. 추가 옵션 추출
      const name = requestBody.name as string | undefined
      const birthDate = requestBody.birthDate as string | undefined
      const format = requestBody.format as 'json' | 'pdf' | undefined
      const detailLevel = requestBody.detailLevel as
        | 'standard'
        | 'detailed'
        | 'comprehensive'
        | undefined
      const bilingual = requestBody.bilingual === true
      const targetChars = toOptionalNumber(requestBody.targetChars)
      const userQuestion = toOptionalString(requestBody.userQuestion)
      const deterministicProfile =
        requestBody.deterministicProfile === 'strict' ||
        requestBody.deterministicProfile === 'balanced' ||
        requestBody.deterministicProfile === 'aggressive'
          ? requestBody.deterministicProfile
          : 'balanced'
      const tone =
        requestBody.tone === 'realistic' || requestBody.tone === 'friendly'
          ? (requestBody.tone as 'realistic' | 'friendly')
          : undefined
      const targetDate = requestBody.targetDate as string | undefined
      const profileContext = {
        birthDate: toOptionalString(requestBody.birthDate),
        birthTime: toOptionalString(requestBody.birthTime),
        birthCity: toOptionalString(requestBody.birthCity),
        timezone: toOptionalString(requestBody.timezone),
        latitude: toOptionalNumber(requestBody.latitude),
        longitude: toOptionalNumber(requestBody.longitude),
        houseSystem: toOptionalString(requestBody.houseSystem),
        analysisAt: toOptionalString(requestBody.analysisAt) || new Date().toISOString(),
      }
      const sajuSnapshot =
        toOptionalRecord(requestBody.sajuSnapshot) || toOptionalRecord(requestBody.saju)
      const astrologySnapshot =
        toOptionalRecord(requestBody.astrologySnapshot) || toOptionalRecord(requestBody.astrology)
      const crossSnapshot =
        toOptionalRecord(requestBody.crossSnapshot) ||
        toOptionalRecord(requestBody.graphRagEvidence) ||
        toOptionalRecord(requestBody.matrixSummary)
      const currentDateIso =
        toOptionalString(requestBody.currentDateIso) ||
        (profileContext.analysisAt
          ? profileContext.analysisAt.slice(0, 10)
          : new Date().toISOString().slice(0, 10))
      const matrixInput = {
        ...(rest as MatrixCalculationInput),
        profileContext,
        sajuSnapshot,
        astrologySnapshot,
        crossSnapshot,
        currentDateIso,
      } as MatrixCalculationInput

      // 7. 기본 매트릭스 계산
      const matrix = calculateDestinyMatrix(matrixInput)
      const layerResults = extractAllLayerCells(matrix as MatrixLayers)
      const detailBasedMaxInsights =
        detailLevel === 'comprehensive' ? 20 : detailLevel === 'detailed' ? 10 : 5
      const resolvedMaxInsights = Math.min(20, Math.max(1, maxInsights ?? detailBasedMaxInsights))
      const autoTimingData: TimingData = buildTimingData(targetDate)
      const timingData: TimingData = mergeTimingData(
        autoTimingData,
        toOptionalRecord(requestBody.timingData)
      )
      const strictCompleteness = process.env.NODE_ENV !== 'test'
      const missingKeys = listAiReportMissing(matrixInput, timingData)
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

      // 8. 기본 리포트 생성
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

      const baseReport = generator.generateReport(
        matrixInput,
        layerResults,
        queryDomain as InsightDomain | undefined
      )

      if (isFreeTier) {
        const freeReport = buildFreeDigestReport({
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
          lang: matrixInput.lang || 'ko',
        })

        return NextResponse.json({
          success: true,
          creditsUsed: 0,
          remainingCredits: balance.remainingCredits,
          reportType: 'free',
          report: freeReport,
        })
      }

      // 9. 타이밍 데이터 생성 (period 또는 theme이 있는 경우)

      // 10. 리포트 타입별 분기 처리
      let aiReport: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
      let premiumReport: AIPremiumReport | null = null

      if (theme) {
        // ??? ???
        const themedReport = await generateThemedReport(
          matrixInput,
          baseReport,
          theme,
          timingData,
          {
            name,
            birthDate,
            lang: matrixInput.lang || 'ko',
            userPlan,
            userQuestion,
            deterministicProfile,
          }
        )
        const qualityAudit = evaluateThemedReportQuality({
          sections:
            themedReport.sections && typeof themedReport.sections === 'object'
              ? (themedReport.sections as unknown as Record<string, unknown>)
              : {},
          keywords: Array.isArray(themedReport.keywords) ? themedReport.keywords : [],
          theme,
          lang: matrixInput.lang || 'ko',
        })

        if (qualityAudit.shouldBlock) {
          const blockedSections = Array.from(
            new Set(qualityAudit.overclaimFindings.map((item) => item.section))
          )
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'QUALITY_BLOCKED',
                message:
                  '리포트 문장 품질 게이트(과장/비약 차단)에 걸렸습니다. 근거 없는 단정 표현을 줄여 다시 시도하세요.',
                blockedSections,
                overclaimFindings: qualityAudit.overclaimFindings.slice(0, 10),
                qualityAudit,
              },
            },
            { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
          )
        }

        const calculationDetails = buildCalculationDetails({
          matrixInput,
          profileContext,
          timingData,
          matrixSummary:
            matrix && typeof matrix === 'object' && 'summary' in matrix
              ? (matrix.summary as typeof matrix.summary)
              : undefined,
          layerResults,
          topInsights: Array.isArray(baseReport.topInsights)
            ? (baseReport.topInsights as unknown as Array<Record<string, unknown>>)
            : [],
        })
        aiReport = {
          ...themedReport,
          qualityAudit,
          calculationDetails,
        } as ThemedAIPremiumReport
      } else if (period && period !== 'comprehensive') {
        // 타이밍 리포트 (daily/monthly/yearly)
        aiReport = await generateTimingReport(matrixInput, baseReport, period, timingData, {
          name,
          birthDate,
          targetDate,
          lang: matrixInput.lang || 'ko',
          userPlan,
          userQuestion,
          deterministicProfile,
        })
      } else {
        // 기존 종합 리포트
        premiumReport = await generateAIPremiumReport(matrixInput, baseReport, {
          name,
          birthDate,
          lang: matrixInput.lang || 'ko',
          focusDomain: queryDomain as InsightDomain | undefined,
          detailLevel: detailLevel || 'detailed',
          bilingual,
          targetChars: targetChars ? Math.floor(targetChars) : undefined,
          tone,
          userPlan,
          userQuestion,
          deterministicProfile,
        })
        aiReport = premiumReport
      }

      const crossConsistencyAudit = auditCrossConsistency({
        mode: theme ? 'themed' : period && period !== 'comprehensive' ? 'timing' : 'comprehensive',
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

      aiReport = {
        ...aiReport,
        crossConsistencyAudit,
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
      const reportType = theme ? 'themed' : period ? 'timing' : 'comprehensive'
      const reportTitle = generateReportTitle(reportType, period, theme, targetDate)
      const reportSummary = extractReportSummary(aiReport)
      const overallScore = extractOverallScore(aiReport)
      const destinyMatrixEvidenceSummary = summarizeDestinyMatrixEvidence(baseReport)

      const savedReport = await prisma.destinyMatrixReport.create({
        data: {
          userId,
          reportType,
          period: period || null,
          theme: theme || null,
          reportData: aiReport as object,
          title: reportTitle,
          summary: reportSummary,
          overallScore,
          grade: scoreToGrade(overallScore),
          locale: matrixInput.lang || 'ko',
        },
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
              aiReport as AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
            )

        // PDF 생성 상태 업데이트
        await prisma.destinyMatrixReport.update({
          where: { id: savedReport.id },
          data: { pdfGenerated: true },
        })

        return new NextResponse(Buffer.from(pdfBytes), {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="destiny-matrix-report-${savedReport.id}.pdf"`,
            'Content-Length': pdfBytes.length.toString(),
          },
        })
      }

      // 14. JSON 응답 (저장된 리포트 ID 포함)
      const res = NextResponse.json({
        success: true,
        creditsUsed: creditCost,
        remainingCredits: balance.remainingCredits - creditCost,
        reportType,
        report: {
          ...aiReport,
          id: savedReport.id, // DB에 저장된 ID로 덮어쓰기
          destinyMatrixEvidenceSummary,
          graphRagEvidenceSummary: summarizeGraphRAGEvidence(
            (aiReport as AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport)
              .graphRagEvidence
          ),
        },
      })
      return res
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : String(error)

      logger.error('AI Report Generation Error:', {
        message: rawErrorMessage,
        name: error instanceof Error ? error.name : 'Unknown',
      })

      // AI 프로바이더 관련 에러는 사용자에게 친절한 메시지로 변환
      if (rawErrorMessage.includes('No AI providers available')) {
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
      })
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

function extractAllLayerCells(matrix: MatrixLayers): Record<string, Record<string, MatrixCell>> {
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

const PERIOD_LABELS: Record<string, string> = {
  daily: '오늘',
  monthly: '이번달',
  yearly: '올해',
  comprehensive: '종합',
}

const THEME_LABELS: Record<string, string> = {
  love: '사랑',
  career: '커리어',
  wealth: '재물',
  health: '건강',
  family: '가족',
}

function generateReportTitle(
  reportType: string,
  period?: string,
  theme?: string,
  targetDate?: string
): string {
  const date = targetDate ? new Date(targetDate) : new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  if (reportType === 'themed' && theme) {
    return `${THEME_LABELS[theme] || theme} 운세 심화 분석`
  }

  if (reportType === 'timing' && period) {
    const periodLabel = PERIOD_LABELS[period] || period
    if (period === 'daily') {
      return `${year}년 ${month}월 ${date.getDate()}일 운세`
    }
    if (period === 'monthly') {
      return `${year}년 ${month}월 운세`
    }
    if (period === 'yearly') {
      return `${year}년 운세`
    }
    return `${periodLabel} 운세 리포트`
  }

  return `${year}년 종합 운세 리포트`
}

function extractReportSummary(
  report: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
): string {
  // 각 리포트 타입에서 요약 추출
  const r = report as unknown as Record<string, unknown>

  if (typeof r.summary === 'string') {
    return r.summary
  }
  if (typeof r.overallMessage === 'string') {
    return r.overallMessage
  }

  // sections에서 첫 번째 내용 추출
  if (Array.isArray(r.sections) && r.sections.length > 0) {
    const first = r.sections[0] as Record<string, unknown>
    if (typeof first.content === 'string') {
      return first.content.slice(0, 200) + (first.content.length > 200 ? '...' : '')
    }
  }

  return '운세 분석이 완료되었습니다.'
}

function extractOverallScore(
  report: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
): number | null {
  const r = report as unknown as Record<string, unknown>

  if (typeof r.overallScore === 'number') {
    return Math.round(r.overallScore)
  }
  if (typeof r.score === 'number') {
    return Math.round(r.score)
  }

  // periodScore에서 추출 (타이밍 리포트)
  if (r.periodScore && typeof r.periodScore === 'object') {
    const ps = r.periodScore as Record<string, unknown>
    if (typeof ps.overall === 'number') {
      return Math.round(ps.overall)
    }
  }

  // themeScore에서 추출 (테마별 리포트)
  if (r.themeScore && typeof r.themeScore === 'object') {
    const ts = r.themeScore as Record<string, unknown>
    if (typeof ts.overall === 'number') {
      return Math.round(ts.overall)
    }
  }

  // matrixSummary에서 추출 (종합 리포트)
  if (r.matrixSummary && typeof r.matrixSummary === 'object') {
    const ms = r.matrixSummary as Record<string, unknown>
    if (typeof ms.overallScore === 'number') {
      return Math.round(ms.overallScore)
    }
  }

  return null
}

function scoreToGrade(score: number | null): string | null {
  if (score === null) {
    return null
  }
  if (score >= 90) {
    return 'S'
  }
  if (score >= 80) {
    return 'A'
  }
  if (score >= 70) {
    return 'B'
  }
  if (score >= 60) {
    return 'C'
  }
  return 'D'
}
