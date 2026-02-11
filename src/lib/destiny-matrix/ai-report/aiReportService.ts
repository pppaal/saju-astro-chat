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
