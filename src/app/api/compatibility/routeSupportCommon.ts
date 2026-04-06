import { LIMITS } from '@/lib/validation'
import type { AspectType } from '@/lib/astrology/foundation/types'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import type { AstrologyProfile, SajuProfile } from '@/lib/compatibility/cosmicCompatibility'
import type { ExtendedAstrologyProfile } from '@/lib/compatibility/astrology/comprehensive'
import type { Relation, PersonInput } from './types'

export const MAX_NOTE = LIMITS.NOTE
export type LocaleCode = 'ko' | 'en'

const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

const SIGN_TO_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Taurus: 'earth',
  Gemini: 'air',
  Cancer: 'water',
  Leo: 'fire',
  Virgo: 'earth',
  Libra: 'air',
  Scorpio: 'water',
  Sagittarius: 'fire',
  Capricorn: 'earth',
  Aquarius: 'air',
  Pisces: 'water',
}


const SIGN_LABEL_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

export const ASPECT_LABEL_EN: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
  semisextile: 'Semi-sextile',
  quincunx: 'Quincunx',
  quintile: 'Quintile',
  biquintile: 'Bi-quintile',
}

export const ASPECT_LABEL_KO: Record<AspectType, string> = {
  conjunction: '합',
  sextile: '섹스타일',
  square: '스퀘어',
  trine: '트라인',
  opposition: '대립',
  semisextile: '세미섹스타일',
  quincunx: '퀸컹스',
  quintile: '퀸타일',
  biquintile: '바이퀸타일',
}

export type PairScore = {
  pair: [number, number]
  score: number
}

export type PairAnalysis = {
  pair: [number, number]
  pairLabel: string
  relationLabel: string
  rawScore: number
  weightedScore: number
  sajuScore: number | null
  astrologyScore: number | null
  fusionScore: number | null
  crossScore: number | null
  strengths: string[]
  challenges: string[]
  advice: string[]
  topAspects: string[]
  topHouseOverlays: string[]
  fusionInsights: PairFusionInsights | null
}

export type PairFusionInsights = {
  deepAnalysis: string
  dayMasterHarmony: number | null
  sunMoonHarmony: number | null
  venusMarsSynergy: number | null
  emotionalIntensity: number | null
  intellectualAlignment: number | null
  spiritualConnection: number | null
  conflictResolutionStyle: string | null
  shortTerm: string | null
  mediumTerm: string | null
  longTerm: string | null
  recommendedActions: string[]
}

export type PersonAnalysis = {
  sajuProfile: SajuProfile | null
  astroProfile: AstrologyProfile | null
  extendedAstroProfile: ExtendedAstrologyProfile | null
  natalChart: NatalChartData | null
  synastryChart: Chart | null
  errors: string[]
}

export function relationWeight(relation?: Relation) {
  if (!relation) {
    return 1.0
  }
  if (relation === 'lover') {
    return 1.0
  }
  if (relation === 'friend') {
    return 0.95
  }
  return 0.9
}

export function normalizeLocale(locale?: string): LocaleCode {
  return String(locale || '')
    .toLowerCase()
    .startsWith('ko')
    ? 'ko'
    : 'en'
}

export function relationLabel(locale: LocaleCode, relation?: Relation, note?: string) {
  const isKo = locale === 'ko'
  if (relation === 'lover') {
    return isKo ? '연인' : 'lover'
  }
  if (relation === 'friend') {
    return isKo ? '친구' : 'friend'
  }
  if (relation === 'other') {
    return note?.trim() || (isKo ? '기타' : 'other')
  }
  return isKo ? '관계' : 'related'
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))]
}

export function normalizeSign(rawSign: string) {
  const clean = String(rawSign || '')
    .trim()
    .toLowerCase()
  const found = SIGN_ORDER.find((s) => s.toLowerCase() === clean)
  return found || 'Aries'
}

export function oppositeSign(sign: string) {
  const normalized = normalizeSign(sign)
  const index = SIGN_ORDER.findIndex((s) => s === normalized)
  if (index < 0) {
    return 'Libra'
  }
  return SIGN_ORDER[(index + 6) % 12]
}

export function elementFromSign(sign: string): 'fire' | 'earth' | 'air' | 'water' {
  return SIGN_TO_ELEMENT[normalizeSign(sign)] || 'fire'
}

export function elementEnFromSaju(value: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === '목' || normalized === 'wood') {
    return 'wood'
  }
  if (normalized === '화' || normalized === 'fire') {
    return 'fire'
  }
  if (normalized === '토' || normalized === 'earth') {
    return 'earth'
  }
  if (normalized === '금' || normalized === 'metal') {
    return 'metal'
  }
  if (normalized === '수' || normalized === 'water') {
    return 'water'
  }
  return normalized || 'earth'
}

function elementKo(value: string) {
  if (value === 'wood') return '목(木)'
  if (value === 'fire') return '화(火)'
  if (value === 'earth') return '토(土)'
  if (value === 'metal') return '금(金)'
  if (value === 'water') return '수(水)'
  return value
}

export function elementLabel(locale: LocaleCode, value: string) {
  const normalized = elementEnFromSaju(value)
  if (locale === 'ko') {
    return elementKo(normalized)
  }
  if (normalized === 'wood') return 'Wood'
  if (normalized === 'fire') return 'Fire'
  if (normalized === 'earth') return 'Earth'
  if (normalized === 'metal') return 'Metal'
  if (normalized === 'water') return 'Water'
  return normalized
}

export function signLabel(locale: LocaleCode, sign: string) {
  const normalized = normalizeSign(sign)
  if (locale === 'ko') {
    return `${SIGN_LABEL_KO[normalized] || normalized}(${normalized})`
  }
  return normalized
}

export function parseBirthParts(date: string, time: string) {
  const [year, month, day] = date.split('-').map((v) => Number(v))
  const [hourText = '0', minuteText = '0'] = String(time).split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null
  }

  return { year, month, day, hour, minute }
}

export function ageFromDate(date: string) {
  const [year, month, day] = date.split('-').map((v) => Number(v))
  if (!year || !month || !day) return 30

  const now = new Date()
  let age = now.getFullYear() - year
  const birthdayNotPassed =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)

  if (birthdayNotPassed) {
    age -= 1
  }
  return clamp(age, 1, 120)
}

export function normalizeSajuGender(value?: PersonInput['gender']): 'male' | 'female' {
  if (!value) return 'male'
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'f' || normalized === 'female') return 'female'
  return 'male'
}
export { SIGN_LABEL_KO }
