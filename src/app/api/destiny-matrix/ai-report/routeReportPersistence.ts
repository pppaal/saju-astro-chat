import type {
  ReportPeriod,
  ReportTheme,
  ThemedAIPremiumReport,
  TimingAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report/types'
import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'

export type ReportTier = 'free' | 'premium'

export const PERIOD_LABELS: Record<string, string> = {
  daily: '오늘',
  monthly: '이번달',
  yearly: '올해',
  comprehensive: '종합',
}

export const THEME_LABELS: Record<string, string> = {
  love: '사랑',
  career: '커리어',
  wealth: '재물',
  health: '건강',
  family: '가족',
}

type PersistedReport = AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport

export function normalizeReportTier(value: unknown): ReportTier {
  if (typeof value === 'string' && value.toLowerCase() === 'free') {
    return 'free'
  }
  return 'premium'
}

export function generateReportTitle(
  reportType: string,
  period?: ReportPeriod | string,
  theme?: ReportTheme | string,
  targetDate?: string
): string {
  const date = targetDate ? new Date(targetDate) : new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  if (reportType === 'free') {
    if (theme) {
      return `${THEME_LABELS[theme] || theme} 무료 요약 리포트`
    }
    if (period && period !== 'comprehensive') {
      const periodLabel = PERIOD_LABELS[period] || period
      if (period === 'daily') {
        return `${year}년 ${month}월 ${date.getDate()}일 무료 요약`
      }
      if (period === 'monthly') {
        return `${year}년 ${month}월 무료 요약`
      }
      if (period === 'yearly') {
        return `${year}년 무료 요약`
      }
      return `${periodLabel} 무료 요약 리포트`
    }
    return `${year}년 종합 운세 무료 요약`
  }

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

export function extractReportSummary(report: PersistedReport): string {
  const record = report as unknown as Record<string, unknown>

  if (typeof record.summary === 'string') {
    return record.summary
  }
  if (typeof record.overallMessage === 'string') {
    return record.overallMessage
  }
  if (Array.isArray(record.sections) && record.sections.length > 0) {
    const first = record.sections[0] as Record<string, unknown>
    if (typeof first.content === 'string') {
      return first.content.slice(0, 200) + (first.content.length > 200 ? '...' : '')
    }
  }

  return '운세 분석이 완료되었습니다.'
}

export function extractOverallScore(report: PersistedReport): number | null {
  const record = report as unknown as Record<string, unknown>

  if (typeof record.overallScore === 'number') {
    return Math.round(record.overallScore)
  }
  if (typeof record.score === 'number') {
    return Math.round(record.score)
  }

  if (record.periodScore && typeof record.periodScore === 'object') {
    const periodScore = record.periodScore as Record<string, unknown>
    if (typeof periodScore.overall === 'number') {
      return Math.round(periodScore.overall)
    }
  }

  if (record.themeScore && typeof record.themeScore === 'object') {
    const themeScore = record.themeScore as Record<string, unknown>
    if (typeof themeScore.overall === 'number') {
      return Math.round(themeScore.overall)
    }
  }

  if (record.matrixSummary && typeof record.matrixSummary === 'object') {
    const matrixSummary = record.matrixSummary as Record<string, unknown>
    if (typeof matrixSummary.overallScore === 'number') {
      return Math.round(matrixSummary.overallScore)
    }
  }

  return null
}

export function scoreToGrade(score: number | null): string | null {
  if (score === null) return null
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}
