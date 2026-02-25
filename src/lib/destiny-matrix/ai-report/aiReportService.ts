// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrix™ - AI Premium Report Generator
// 유료 기능: AI 기반 상세 내러티브 리포트 생성

'use server'

import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type {
  ReportPeriod,
  ReportTheme,
  TimingData,
  TimingAIPremiumReport,
  ThemedAIPremiumReport,
  TimingReportSections,
  ThemedReportSections,
} from './types'
import { THEME_META } from './types'
import { logger } from '@/lib/logger'
import { buildTimingPrompt } from './prompts/timingPrompts'
import { buildThemedPrompt } from './prompts/themedPrompts'
import { buildGraphRAGEvidence, formatGraphRAGEvidenceForPrompt } from './graphRagEvidence'

// Extracted modules
import type { AIPremiumReport, AIReportGenerationOptions, AIUserPlan } from './reportTypes'

import { buildAIPrompt, buildThemedAIPrompt, buildMatrixSummary } from './promptBuilders'
import { callAIBackend, callAIBackendGeneric } from './aiBackend'
import {
  generatePeriodLabel,
  calculatePeriodScore,
  calculateThemeScore,
  extractKeywords,
} from './scoreCalculators'

const SAJU_REGEX = /사주|오행|십신|대운|일간|격국|용신|신살/i
const ASTRO_REGEX =
  /점성|행성|하우스|트랜싯|별자리|상승궁|천궁도|astrology|planet|house|transit|zodiac/i

function hasCrossInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text)
}

function countSectionChars(sections: Record<string, unknown>): number {
  const values = Object.values(sections || {}) as unknown[]
  return values.reduce<number>((acc, value) => {
    if (typeof value === 'string') {
      return acc + value.length
    }
    if (Array.isArray(value)) {
      return acc + value.join(' ').length
    }
    if (value && typeof value === 'object') {
      return acc + countSectionChars(value as Record<string, unknown>)
    }
    return acc
  }, 0)
}

function getMissingCrossKeys(sections: Record<string, unknown>, keys: string[]): string[] {
  const missing: string[] = []
  for (const key of keys) {
    const value = sections[key]
    if (typeof value === 'string') {
      if (!hasCrossInText(value)) missing.push(key)
    }
  }
  return missing
}

function buildCrossRepairInstruction(lang: 'ko' | 'en', missing: string[]): string {
  const list = missing.join(', ')
  if (lang === 'ko') {
    return [
      '',
      '중요: 아래 섹션에서 사주/점성 교차 근거가 누락되었습니다.',
      `누락 섹션: ${list}`,
      '각 누락 섹션에 반드시 포함: 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장 + 실용 행동 2문장.',
      '문장형 존댓말만 사용하고 리스트/이모지/제목 표기는 금지합니다.',
    ].join('\n')
  }
  return [
    '',
    'IMPORTANT: Cross-basis is missing in the following sections.',
    `Missing sections: ${list}`,
    'Each missing section must include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence + 2 practical action sentences.',
    'Use sentence-form only. No lists, emojis, or headings.',
  ].join('\n')
}

function getPathText(sections: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = sections
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  if (typeof cur === 'string') return cur
  if (Array.isArray(cur)) return cur.map((v) => String(v)).join(' ')
  return ''
}

function getShortSectionPaths(
  sections: Record<string, unknown>,
  paths: string[],
  minCharsPerSection: number
): string[] {
  const short: string[] = []
  for (const path of paths) {
    const text = getPathText(sections, path)
    if (text && text.length < minCharsPerSection) short.push(path)
  }
  return short
}

function getMissingCrossPaths(sections: Record<string, unknown>, crossPaths: string[]): string[] {
  return crossPaths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !hasCrossInText(text)
  })
}

function getCrossCoverageRatio(sections: Record<string, unknown>, crossPaths: string[]): number {
  const texts = crossPaths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => hasCrossInText(t)).length
  return hit / texts.length
}

function buildDepthRepairInstruction(
  lang: 'ko' | 'en',
  sectionPaths: string[],
  shortPaths: string[],
  minCharsPerSection: number,
  minTotalChars: number
): string {
  const allPaths = sectionPaths.join(', ')
  const shortList = shortPaths.join(', ')
  if (lang === 'ko') {
    return [
      '',
      '중요: 리포트가 짧거나 일반론적입니다. 아래 기준을 만족하도록 전체를 다시 작성해 주세요.',
      `필수 섹션: ${allPaths}`,
      `각 섹션 최소 길이: ${minCharsPerSection}자, 전체 최소 길이: ${minTotalChars}자`,
      shortPaths.length > 0 ? `특히 보강이 필요한 섹션: ${shortList}` : '',
      '각 섹션은 반드시 1) 핵심 해석 2) 근거 3) 생활 적용 4) 주의 포인트를 문장형으로 포함해 주세요.',
      '어려운 용어를 쓰면 바로 뒤에 쉬운 한국어 설명을 붙여 주세요.',
      '리스트 대신 서술형 문단으로 작성해 주세요.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    '',
    'IMPORTANT: The report is too short or generic. Rewrite all sections with stronger depth.',
    `Required sections: ${allPaths}`,
    `Minimum length: ${minCharsPerSection} chars per section, ${minTotalChars} chars total`,
    shortPaths.length > 0 ? `Sections needing expansion: ${shortList}` : '',
    'Each section must include: key interpretation, evidence, practical application, and caution point.',
    'If technical terms are used, add plain-language explanations right after them.',
    'Use paragraph-style narrative, not bullet points.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildSecondPassInstruction(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '',
      '2차 보강 지시: 여전히 밀도가 부족하면 각 섹션을 최소 6문장으로 확장해 주세요.',
      '각 섹션에 반드시 실전 예시 1개와 실행 순서(오늘-이번주-이번달)를 포함해 주세요.',
      '추상적 미사여구 대신 행동 가능한 문장으로 작성해 주세요.',
    ].join('\n')
  }
  return [
    '',
    'Second-pass rewrite: if depth is still weak, expand each section to at least 6 sentences.',
    'Include one practical example and execution sequence (today-this week-this month) in each section.',
    'Prefer concrete action-oriented language over abstract filler.',
  ].join('\n')
}

function buildCrossCoverageRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number
): string {
  if (lang === 'ko') {
    return [
      '',
      `중요: 사주+점성 교차 서술 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      '각 핵심 섹션마다 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장을 반드시 포함하세요.',
      '단순 일반론을 줄이고, 근거어(사주/점성/하우스/대운/트랜싯)를 문장에 명시하세요.',
    ].join('\n')
  }
  return [
    '',
    `IMPORTANT: Cross-basis narrative coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    'For each core section include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
    'Avoid generic filler and explicitly mention grounding terms (saju/astrology/house/daeun/transit).',
  ].join('\n')
}

function getMaxRepairPassesByPlan(plan?: AIUserPlan): number {
  switch (plan) {
    case 'premium':
      return 2
    case 'pro':
      return 1
    case 'starter':
      return 1
    case 'free':
    default:
      return 0
  }
}

// ===========================
// 메인 생성 함수
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'

  // 1. 프롬프트 빌드
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, {
    mode: 'comprehensive',
    focusDomain: options.focusDomain,
  })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)

  let prompt: string
  if (options.theme && options.theme !== 'comprehensive') {
    prompt = buildThemedAIPrompt(input, matrixReport, options.theme, {
      ...options,
      graphRagEvidencePrompt,
    })
  } else {
    prompt = buildAIPrompt(input, matrixReport, {
      ...options,
      graphRagEvidencePrompt,
    })
  }

  const requestedChars =
    typeof options.targetChars === 'number' && Number.isFinite(options.targetChars)
      ? Math.max(2500, Math.min(22000, Math.floor(options.targetChars)))
      : options.detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 10000
          : 8000
        : undefined
  const maxTokensOverride = requestedChars ? Math.ceil(requestedChars / 2) + 1200 : undefined

  // 2. AI 백엔드 호출 + 품질 게이트(길이/교차 근거)
  const base = await callAIBackend(prompt, lang, {
    userPlan: options.userPlan,
    maxTokensOverride,
  })
  let sections = base.sections as unknown as Record<string, unknown>
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ]
  const crossPaths = [
    'introduction',
    'personalityDeep',
    'careerPath',
    'relationshipDynamics',
    'wealthPotential',
    'healthGuidance',
    'lifeMission',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ]
  const minCharsPerSection = lang === 'ko' ? 220 : 170
  const minTotalChars = Math.max(lang === 'ko' ? 2600 : 2200, requestedChars || 0)
  const minCrossCoverage = 0.6

  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<AIPremiumReport['sections']>(repairPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride,
      })
      sections = repaired.sections as unknown as Record<string, unknown>
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<AIPremiumReport['sections']>(
            secondPrompt,
            lang,
            {
              userPlan: options.userPlan,
              maxTokensOverride,
            }
          )
          sections = second.sections as unknown as Record<string, unknown>
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[AI Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[AI Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  // 3. 리포트 조립
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
      geokguk: input.geokguk,
    },

    sections: sections as AIPremiumReport['sections'],
    graphRagEvidence,

    matrixSummary: {
      overallScore: matrixReport.overallScore.total,
      grade: matrixReport.overallScore.grade,
      topInsights: matrixReport.topInsights.slice(0, 3).map((i) => i.title),
      keyStrengths: matrixReport.topInsights
        .filter((i) => i.category === 'strength')
        .slice(0, 3)
        .map((i) => i.title),
      keyChallenges: matrixReport.topInsights
        .filter((i) => i.category === 'challenge' || i.category === 'caution')
        .slice(0, 3)
        .map((i) => i.title),
    },

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  }

  return report
}

// ===========================
// 타이밍 리포트 생성 함수
// ===========================

export async function generateTimingReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  period: ReportPeriod,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    targetDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
  } = {}
): Promise<TimingAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, { mode: 'timing', period })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)

  // 1. 매트릭스 요약 빌드
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. 프롬프트 빌드
  const prompt = buildTimingPrompt(
    period,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
    },
    timingData,
    targetDate,
    matrixSummary,
    graphRagEvidencePrompt
  )

  // 3. AI 백엔드 호출 + 품질 게이트(길이/교차 근거)
  const base = await callAIBackendGeneric<TimingReportSections>(prompt, lang, {
    userPlan: options.userPlan,
  })
  let sections = base.sections as unknown as Record<string, unknown>
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
    'luckyElements',
  ]
  const crossPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  const minCharsPerSection = lang === 'ko' ? 170 : 130
  const minTotalChars = lang === 'ko' ? 1900 : 1600
  const minCrossCoverage = 0.6

  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<TimingReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      sections = repaired.sections as unknown as Record<string, unknown>
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<TimingReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
          })
          sections = second.sections as unknown as Record<string, unknown>
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Timing Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Timing Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  // 4. 기간 라벨 생성
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. 점수 계산
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)

  // 6. 리포트 조립
  const report: TimingAIPremiumReport = {
    id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    period,
    targetDate,
    periodLabel,

    timingData,
    sections: sections as unknown as TimingReportSections,
    graphRagEvidence,
    periodScore,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  }

  return report
}

// ===========================
// 테마별 리포트 생성 함수
// ===========================

export async function generateThemedReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  theme: ReportTheme,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
  } = {}
): Promise<ThemedAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, { mode: 'themed', theme })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)

  // 1. 매트릭스 요약 빌드
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. 프롬프트 빌드
  const prompt = buildThemedPrompt(
    theme,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
      sibsinDistribution: input.sibsinDistribution,
    },
    timingData,
    matrixSummary,
    undefined,
    graphRagEvidencePrompt
  )

  // 3. AI 백엔드 호출 + 품질 게이트(길이/교차 근거)
  const base = await callAIBackendGeneric<ThemedReportSections>(prompt, lang, {
    userPlan: options.userPlan,
  })
  let sections = base.sections as unknown as Record<string, unknown>
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [
    'deepAnalysis',
    'patterns',
    'timing',
    'compatibility',
    'strategy',
    'prevention',
    'dynamics',
    'actionPlan',
  ]
  const crossPaths = [
    'deepAnalysis',
    'patterns',
    'timing',
    'compatibility',
    'strategy',
    'prevention',
    'dynamics',
    'actionPlan',
  ]
  const minCharsPerSection = lang === 'ko' ? 180 : 140
  const minTotalChars = lang === 'ko' ? 1700 : 1400
  const minCrossCoverage = 0.6
  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<ThemedReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      sections = repaired.sections as unknown as Record<string, unknown>
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<ThemedReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
          })
          sections = second.sections as unknown as Record<string, unknown>
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Themed Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Themed Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  // 4. 테마 메타데이터
  const themeMeta = THEME_META[theme]

  // 5. 점수 계산
  const themeScore = calculateThemeScore(theme, input.sibsinDistribution)

  // 6. 키워드 추출
  const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)

  // 7. 리포트 조립
  const report: ThemedAIPremiumReport = {
    id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    theme,
    themeLabel: themeMeta.label[lang],
    themeEmoji: themeMeta.emoji,

    sections: sections as unknown as ThemedReportSections,
    graphRagEvidence,
    themeScore,
    keywords,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  }

  return report
}
