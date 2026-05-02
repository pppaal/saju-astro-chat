import { useState, useCallback } from 'react'
import type {
  PersonForm,
  TimingData,
  GroupAnalysisData,
  SynergyBreakdown,
} from '@/app/compatibility/lib'

export interface PairDetails {
  pair: [number, number]
  pairLabel: string
  relationLabel: string
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
  fusionInsights: {
    deepAnalysis?: string
    dayMasterHarmony?: number | null
    sunMoonHarmony?: number | null
    venusMarsSynergy?: number | null
    emotionalIntensity?: number | null
    intellectualAlignment?: number | null
    spiritualConnection?: number | null
    conflictResolutionStyle?: string | null
    shortTerm?: string | null
    mediumTerm?: string | null
    longTerm?: string | null
    recommendedActions?: string[]
  } | null
}

export interface RelationshipDynamics {
  emotionalIntensity?: number | null
  intellectualAlignment?: number | null
  spiritualConnection?: number | null
  conflictResolutionStyle?: string | null
}

export interface FutureGuidance {
  shortTerm?: string | null
  mediumTerm?: string | null
  longTerm?: string | null
}

export interface CoupleTimingMonth {
  year: number
  month: number
  label: 'great' | 'good' | 'neutral' | 'caution'
  reason: string
}

export interface CoupleTimingData {
  bestMeetingMonth: CoupleTimingMonth | null
  upcomingMonths: CoupleTimingMonth[]
  activationPeriod: { when: string; reason: string } | null
  cautionPeriod: { when: string; reason: string } | null
  primeYearWindow: { startYear: number; endYear: number; reason: string } | null
  monthlyOutlook: string
}

export interface AstroEraCard {
  planet: 'Saturn' | 'Jupiter'
  sign: string
  signKo: string
  themeKo: string
  bothImpact: string
}

export interface LifeStageEvent {
  person: 1 | 2
  label: string
  timing: string
  description: string
}

export interface CoupleAstroTiming {
  saturnEra: AstroEraCard | null
  jupiterEra: AstroEraCard | null
  lifeStages: LifeStageEvent[]
  crossNarrative: string | null
}

export interface IdealTypeMatch {
  personIndex: 1 | 2
  partnerIndex: 1 | 2
  seeks: string
  partnerActually: string
  matchLevel: 'strong' | 'partial' | 'weak'
  note: string
}

export interface MarriageReadiness {
  score: number
  band: 'high' | 'medium' | 'low'
  bestWindow: string | null
  sajuSignal: string
  astroSignal: string
  summary: string
}

export interface LongevityAssessment {
  score: number
  band: 'strong' | 'medium' | 'fragile'
  positive: string[]
  cautionary: string[]
  summary: string
}

export interface CoupleDeepInsights {
  attractionReasons: string[]
  whyItWorks: string[]
  frictionPoints: string[]
  idealMatch: IdealTypeMatch[]
  marriage: MarriageReadiness
  longevity: LongevityAssessment
}

export interface IdealAngleResult {
  angle:
    | 'sun_personality'
    | 'moon_emotional'
    | 'venus_romantic'
    | 'mars_physical'
    | 'mercury_communication'
    | 'saturn_commitment'
    | 'saju_signal'
  label: string
  seeks: string
  partnerOffers: string
  level: 'strong' | 'partial' | 'weak'
  note: string
}

export interface PersonIdealProfile {
  personIndex: 1 | 2
  partnerIndex: 1 | 2
  angles: IdealAngleResult[]
  matchSummary: string
}

export type CompatibilityTier = 'free' | 'premium'

export type FacetKey =
  | 'dating'
  | 'intimacy'
  | 'communication'
  | 'conflict'
  | 'values'
  | 'commitment'
  | 'daily'
  | 'growth'

export interface FacetReport {
  key: FacetKey
  label: string
  emoji: string
  score: number
  band: 'great' | 'good' | 'mixed' | 'caution'
  headline: string
  strengths: string[]
  minds: string[]
  tip: string
  prose?: string
}

interface CompatibilityResult {
  interpretation?: string
  overall_score?: number
  average?: number
  timing?: TimingData
  action_items?: string[]
  is_group?: boolean
  group_analysis?: GroupAnalysisData
  synergy_breakdown?: SynergyBreakdown
  pair_details?: PairDetails[]
  relationship_dynamics?: RelationshipDynamics | null
  future_guidance?: FutureGuidance | null
  couple_timing?: CoupleTimingData | null
  astro_timing?: CoupleAstroTiming | null
  deep_insights?: CoupleDeepInsights | null
  person_elements?: Array<{
    wood?: number
    fire?: number
    earth?: number
    metal?: number
    water?: number
  } | null>
  ideal_type_profiles?: PersonIdealProfile[] | null
  multi_facet_report?: FacetReport[] | null
  tier?: CompatibilityTier
  person_charts?: Array<{
    sun?: { sign?: string; element?: string }
    moon?: { sign?: string; element?: string }
    venus?: { sign?: string; element?: string }
    mars?: { sign?: string; element?: string }
    mercury?: { sign?: string; element?: string }
    ascendant?: { sign?: string; element?: string }
  } | null>
  error?: string | { message?: string }
}

const QUICK_MODE_DEFAULTS = {
  time: '12:00',
  city: 'Seoul, KR',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
} as const

const getQuickModeTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || QUICK_MODE_DEFAULTS.timeZone
  } catch {
    return QUICK_MODE_DEFAULTS.timeZone
  }
}

const fallbackGenderByIndex = (index: number): 'male' | 'female' => {
  // Backward-compatible fallback for forms that do not explicitly ask gender yet.
  return index === 1 ? 'female' : 'male'
}

const normalizeApiGender = (
  value: PersonForm['gender'] | undefined,
  index: number
): 'male' | 'female' => {
  if (!value) return fallbackGenderByIndex(index)
  if (value === 'F' || value === 'Female') return 'female'
  return 'male'
}

export function useCompatibilityAnalysis() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultText, setResultText] = useState<string | null>(null)
  const [overallScore, setOverallScore] = useState<number | null>(null)
  const [timing, setTiming] = useState<TimingData | null>(null)
  const [actionItems, setActionItems] = useState<string[]>([])
  const [groupAnalysis, setGroupAnalysis] = useState<GroupAnalysisData | null>(null)
  const [synergyBreakdown, setSynergyBreakdown] = useState<SynergyBreakdown | null>(null)
  const [isGroupResult, setIsGroupResult] = useState(false)
  const [pairDetails, setPairDetails] = useState<PairDetails[]>([])
  const [relationshipDynamics, setRelationshipDynamics] = useState<RelationshipDynamics | null>(
    null
  )
  const [futureGuidance, setFutureGuidance] = useState<FutureGuidance | null>(null)
  const [coupleTiming, setCoupleTiming] = useState<CoupleTimingData | null>(null)
  const [astroTiming, setAstroTiming] = useState<CoupleAstroTiming | null>(null)
  const [deepInsights, setDeepInsights] = useState<CoupleDeepInsights | null>(null)
  const [personElements, setPersonElements] = useState<
    Array<{
      wood?: number
      fire?: number
      earth?: number
      metal?: number
      water?: number
    } | null>
  >([])
  const [idealTypeProfiles, setIdealTypeProfiles] = useState<PersonIdealProfile[] | null>(null)
  const [multiFacetReport, setMultiFacetReport] = useState<FacetReport[] | null>(null)
  const [tier, setTier] = useState<CompatibilityTier>('free')
  const [personCharts, setPersonCharts] = useState<
    Array<{
      sun?: { sign?: string; element?: string }
      moon?: { sign?: string; element?: string }
      venus?: { sign?: string; element?: string }
      mars?: { sign?: string; element?: string }
      mercury?: { sign?: string; element?: string }
      ascendant?: { sign?: string; element?: string }
    } | null>
  >([])

  const validate = useCallback(
    (persons: PersonForm[], count: number, t: (key: string, fallback: string) => string) => {
      if (count < 2 || count > 4) {
        return t('compatibilityPage.errorAddPeople', 'Add between 2 and 4 people.')
      }
      for (let i = 0; i < persons.length; i++) {
        const p = persons[i]
        const isDetailedMode = Boolean(p.isDetailedMode)
        if (!p.date) {
          return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`
        }
        if (isDetailedMode && !p.time) {
          return `${i + 1}: ${t('compatibilityPage.errorDateTimeRequired', 'date and time are required.')}`
        }
        if (isDetailedMode && (p.lat == null || p.lon == null)) {
          return `${i + 1}: ${t('compatibilityPage.errorSelectCity', 'select a city from suggestions.')}`
        }
        if (isDetailedMode && !p.timeZone) {
          return `${i + 1}: ${t('compatibilityPage.errorTimezoneRequired', 'timezone is required.')}`
        }
        if (i > 0 && isDetailedMode && !p.relation) {
          return `${i + 1}: ${t('compatibilityPage.errorRelationRequired', 'relation to Person 1 is required.')}`
        }
        if (i > 0 && isDetailedMode && p.relation === 'other' && !p.relationNote?.trim()) {
          return `${i + 1}: ${t('compatibilityPage.errorOtherNote', "add a note for relation 'other'.")}`
        }
      }
      return null
    },
    []
  )

  const analyzeCompatibility = useCallback(
    async (persons: PersonForm[], locale: 'ko' | 'en' = 'en') => {
      setIsLoading(true)
      setError(null)
      setResultText(null)

      try {
        const body = {
          locale,
          persons: persons.map((p, idx) => ({
            name: p.name || `Person ${idx + 1}`,
            date: p.date,
            time: p.time || QUICK_MODE_DEFAULTS.time,
            gender: normalizeApiGender(p.gender, idx),
            city: p.cityQuery || QUICK_MODE_DEFAULTS.city,
            latitude: p.lat ?? QUICK_MODE_DEFAULTS.latitude,
            longitude: p.lon ?? QUICK_MODE_DEFAULTS.longitude,
            timeZone: p.timeZone || getQuickModeTimezone(),
            relationToP1: idx === 0 ? undefined : p.relation || 'friend',
            relationNoteToP1: idx === 0 ? undefined : p.relationNote,
          })),
        }

        const res = await fetch('/api/compatibility', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
          },
          body: JSON.stringify(body),
        })
        const data = (await res.json()) as CompatibilityResult | null
        if (!data) {
          throw new Error('Server error')
        }
        if (!res.ok || data.error) {
          const errMsg =
            typeof data.error === 'string'
              ? data.error
              : data.error && typeof data.error === 'object' && 'message' in data.error
                ? String((data.error as { message: string }).message)
                : 'Server error'
          throw new Error(errMsg)
        }

        const interpretation = data.interpretation
        if (interpretation !== null && interpretation !== undefined && interpretation !== '') {
          setResultText(String(interpretation))
        } else {
          setResultText(JSON.stringify(data, null, 2))
        }

        // Extract numeric score from API response
        const numericScore = data.overall_score ?? data.average ?? null
        if (typeof numericScore === 'number' && numericScore >= 0 && numericScore <= 100) {
          setOverallScore(numericScore)
        } else {
          setOverallScore(null)
        }

        // Set timing and action items from fusion system
        if (data.timing) {
          setTiming(data.timing)
        }
        if (data.action_items && Array.isArray(data.action_items)) {
          setActionItems(data.action_items)
        }

        // Group analysis data
        if (data.is_group && data.group_analysis) {
          setGroupAnalysis(data.group_analysis)
          setIsGroupResult(true)
        } else {
          setGroupAnalysis(null)
          setIsGroupResult(false)
        }

        // Synergy breakdown
        if (data.synergy_breakdown) {
          setSynergyBreakdown(data.synergy_breakdown)
        } else {
          setSynergyBreakdown(null)
        }

        // Rich report data — pair details, relationship dynamics, future guidance
        setPairDetails(Array.isArray(data.pair_details) ? data.pair_details : [])
        setRelationshipDynamics(data.relationship_dynamics ?? null)
        setFutureGuidance(data.future_guidance ?? null)
        setCoupleTiming(data.couple_timing ?? null)
        setAstroTiming(data.astro_timing ?? null)
        setDeepInsights(data.deep_insights ?? null)
        setPersonElements(Array.isArray(data.person_elements) ? data.person_elements : [])
        setPersonCharts(Array.isArray(data.person_charts) ? data.person_charts : [])
        setIdealTypeProfiles(data.ideal_type_profiles ?? null)
        setMultiFacetReport(data.multi_facet_report ?? null)
        setTier(data.tier ?? 'free')
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to fetch compatibility.'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const resetResults = useCallback(() => {
    setResultText(null)
    setError(null)
    setOverallScore(null)
    setTiming(null)
    setActionItems([])
    setGroupAnalysis(null)
    setSynergyBreakdown(null)
    setIsGroupResult(false)
    setPairDetails([])
    setRelationshipDynamics(null)
    setFutureGuidance(null)
    setCoupleTiming(null)
    setAstroTiming(null)
    setDeepInsights(null)
    setPersonElements([])
    setPersonCharts([])
    setIdealTypeProfiles(null)
    setMultiFacetReport(null)
    setTier('free')
  }, [])

  return {
    isLoading,
    error,
    setError,
    resultText,
    overallScore,
    timing,
    actionItems,
    groupAnalysis,
    synergyBreakdown,
    isGroupResult,
    pairDetails,
    relationshipDynamics,
    futureGuidance,
    coupleTiming,
    astroTiming,
    deepInsights,
    personElements,
    personCharts,
    idealTypeProfiles,
    multiFacetReport,
    tier,
    validate,
    analyzeCompatibility,
    resetResults,
  }
}
