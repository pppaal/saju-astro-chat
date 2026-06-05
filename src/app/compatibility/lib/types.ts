/**
 * @file Compatibility page types
 * Extracted from page.tsx for modularity
 */

export type SavedPerson = {
  id: string
  name: string
  relation: string
  birthDate?: string | null
  birthTime?: string | null
  gender?: string | null
  birthCity?: string | null
  latitude?: number | null
  longitude?: number | null
  tzId?: string | null
}

export type Relation =
  | 'lover'
  | 'crush'
  | 'spouse'
  | 'engaged'
  | 'ex'
  | 'family'
  | 'sibling'
  | 'friend'
  | 'colleague'
  | 'business'
  | 'other'

export type CityItem = {
  name: string
  country: string
  lat: number
  lon: number
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}

export type PersonForm = {
  name: string
  date: string
  time: string
  gender?: 'M' | 'F' | 'Male' | 'Female'
  cityQuery: string
  lat: number | null
  lon: number | null
  timeZone: string
  suggestions: CityItem[]
  showDropdown: boolean
  relation?: Relation
  relationNote?: string
  isDetailedMode?: boolean
  /**
   * User checked "시간 모름 (00:00 처리)". `time` will be set to '00:00'
   * in that case, but we still need this flag so the counselor route
   * can tell the LLM not to cite time-pillar / 일진 / ASC / MC / houses.
   * Without it the model sees `00:00` and treats it as a real midnight.
   */
  timeUnknown?: boolean
}

export type TimingData = {
  current_month?: {
    branch: string
    element: string
    analysis: string
  }
  good_days?: Array<{
    type: string
    days: string
    activities: string[]
    reason: string
    next_dates?: string[]
  }>
  favorable_members?: number[]
  group_activities?: Array<{
    type: string
    days: string
    activities: string[]
    reason: string
    next_dates?: string[]
  }>
}

export type GroupAnalysisData = {
  element_distribution?: {
    oheng: Record<string, number>
    astro: Record<string, number>
    dominant_oheng: string | null
    lacking_oheng: string | null
    dominant_astro: string | null
    lacking_astro: string | null
  }
  pairwise_matrix?: Array<{
    pair: string
    index: [number, number]
    saju: string
    astro: string
    score?: number
    summary?: string
    saju_details?: string[]
    astro_details?: string[]
    fusion_insights?: string[]
  }>
  group_roles?: Record<string, string[]>
}

export type SynergyBreakdown = {
  total_score: number
  overall_score?: number
  avg_pair_score: number
  oheng_bonus: number
  astro_bonus: number
  role_bonus: number
  samhap_bonus: number
  banghap_bonus?: number
  size_adjustment: number
  special_formations?: string[]
  best_pair: {
    pair: string
    score: number
    summary: string
  }
  weakest_pair: {
    pair: string
    score: number
    summary: string
  }
}

export type ParsedSection = {
  title: string
  icon: string
  content: string
}
