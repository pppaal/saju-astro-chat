import { PEAK_LEVEL_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'

export type PeakLevel = 'peak' | 'high' | 'normal'

const isPeakLevel = (value: unknown): value is PeakLevel =>
  value === 'peak' || value === 'high' || value === 'normal'

export function resolvePeakLevel(explicitLevel: unknown, score?: number | null): PeakLevel | null {
  if (isPeakLevel(explicitLevel)) {
    return explicitLevel
  }
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return null
  }
  if (score >= PEAK_LEVEL_THRESHOLDS.peak) return 'peak'
  if (score >= PEAK_LEVEL_THRESHOLDS.high) return 'high'
  return 'normal'
}

export function getPeakLabel(level: PeakLevel, locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    if (level === 'peak') return '피크 구간'
    if (level === 'high') return '상승 구간'
    return '안정 구간'
  }
  if (level === 'peak') return 'Peak Window'
  if (level === 'high') return 'Rising Window'
  return 'Steady Window'
}
