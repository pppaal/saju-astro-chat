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
import { buildTimingPrompt } from './prompts/timingPrompts'
import { buildThemedPrompt } from './prompts/themedPrompts'

// Extracted modules
import type { AIPremiumReport, AIReportGenerationOptions } from './reportTypes'

import { buildAIPrompt, buildThemedAIPrompt, buildMatrixSummary } from './promptBuilders'
import { callAIBackend, callAIBackendGeneric } from './aiBackend'
import {
  generatePeriodLabel,
  calculatePeriodScore,
  calculateThemeScore,
  extractKeywords,
} from './scoreCalculators'

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
  let prompt: string
  if (options.theme && options.theme !== 'comprehensive') {
    prompt = buildThemedAIPrompt(input, matrixReport, options.theme, options)
  } else {
    prompt = buildAIPrompt(input, matrixReport, options)
  }

  // 2. AI 백엔드 호출
  const { sections, model, tokensUsed } = await callAIBackend(prompt, lang)

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

    sections,

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
  } = {}
): Promise<TimingAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]

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
    matrixSummary
  )

  // 3. AI 백엔드 호출
  const { sections, model, tokensUsed } = await callAIBackendGeneric<TimingReportSections>(
    prompt,
    lang
  )

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
    sections,
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
  } = {}
): Promise<ThemedAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'

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
    matrixSummary
  )

  // 3. AI 백엔드 호출
  const { sections, model, tokensUsed } = await callAIBackendGeneric<ThemedReportSections>(
    prompt,
    lang
  )

  // 4. 테마 메타데이터
  const themeMeta = THEME_META[theme]

  // 5. 점수 계산
  const themeScore = calculateThemeScore(theme, input.sibsinDistribution)

  // 6. 키워드 추출
  const keywords = extractKeywords(sections, theme, lang)

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

    sections,
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
