// Destiny Match — UI 측 type. /api/destiny-match/discover 의 응답 shape 와
// 1:1. backend 가 schema 바뀌면 여기와 SwipeScreen 함께 정리.

export type SajuElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water' | null
export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'
  | null

export interface SynergyHighlight {
  saju: {
    kind: string
    label: string
    chars: string[]
    result?: string
  } | null
  astro: {
    kind: string
    label: string
    angle: number
    harmony: 'harmonious' | 'challenging' | 'neutral'
    signs: [string, string]
  } | null
}

export interface DiscoverCard {
  id: string
  userId: string
  displayName: string
  bio: string | null
  occupation: string | null
  photos: string[]
  city: string | null
  interests: string[]
  verified: boolean
  age: number | null
  distance: number | null
  zodiacSign: ZodiacSign
  sajuElement: SajuElement
  personalityType: string | null
  personalityName: string | null
  compatibilityScore: number
  compatibilityGrade: string
  compatibilityEmoji: string
  compatibilityTagline: string
  synergy: SynergyHighlight
  lastActiveAt: string | null
}

export interface DiscoverResponse {
  profiles: DiscoverCard[]
  hasMore: boolean
}

export type SwipeAction = 'like' | 'pass' | 'super_like'

export interface SwipeResponse {
  success: boolean
  isMatch: boolean
  swipeId: string
  connectionId: string | null
}
