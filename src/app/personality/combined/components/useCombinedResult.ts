'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import type { ICPAnalysis } from '@/lib/icp/types'
import type { PersonaAnalysis } from '@/lib/persona/types'
import { analyzeICP } from '@/lib/icp/analysis'
import { analyzePersona } from '@/lib/persona/analysis'
import { buildHybridNarrative, type HybridNarrative } from '@/lib/persona/hybridNarrative'
import { scoreIcpTest } from '@/lib/icpTest/scoring'
import { resolveHybridArchetype } from '@/lib/icpTest/hybrid'
import type { IcpHybridResult, IcpResult } from '@/lib/icpTest/types'

export interface CombinedResult {
  icpResult: ICPAnalysis | null
  personaResult: PersonaAnalysis | null
  hasIcp: boolean
  hasPersona: boolean
  loading: boolean
  isKo: boolean
  starPositions: Array<{ left: string; top: string; animationDelay: string }>
  hybridResult: IcpHybridResult | null
  hybridNarrative: HybridNarrative | null
}

export function useCombinedResult(): CombinedResult {
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  const [icpResult, setIcpResult] = useState<ICPAnalysis | null>(null)
  const [icpV2Result, setIcpV2Result] = useState<IcpResult | null>(null)
  const [personaResult, setPersonaResult] = useState<PersonaAnalysis | null>(null)
  const [hasIcp, setHasIcp] = useState(false)
  const [hasPersona, setHasPersona] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadResults = useCallback(() => {
    // Load ICP results
    const icpAnswers = localStorage.getItem('icpQuizAnswers')
    if (icpAnswers) {
      try {
        const parsed = JSON.parse(icpAnswers)
        const analysis = analyzeICP(parsed, locale)
        const v2Result = scoreIcpTest(parsed)
        setIcpResult(analysis)
        setIcpV2Result(v2Result)
        setHasIcp(true)
      } catch {
        setHasIcp(false)
        setIcpV2Result(null)
      }
    }

    // Load Persona results
    const personaAnswers = localStorage.getItem('personaQuizAnswers')
    if (personaAnswers) {
      try {
        const parsed = JSON.parse(personaAnswers)
        const analysis = analyzePersona(parsed, locale)
        setPersonaResult(analysis)
        setHasPersona(true)
      } catch {
        setHasPersona(false)
      }
    }

    setLoading(false)
  }, [locale])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  const hybridResult = useMemo(
    () => (icpV2Result ? resolveHybridArchetype(icpV2Result, personaResult) : null),
    [icpV2Result, personaResult]
  )

  const hybridNarrative = useMemo(
    () =>
      icpResult && personaResult
        ? buildHybridNarrative({
            icp: icpResult,
            persona: personaResult,
            hybrid: hybridResult,
            locale: isKo ? 'ko' : 'en',
          })
        : null,
    [hybridResult, icpResult, isKo, personaResult]
  )

  // Memoize star positions to avoid recalculation
  const starPositions = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        left: `${(i * 37 + 13) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        animationDelay: `${(i * 0.08) % 4}s`,
      })),
    []
  )

  return {
    icpResult,
    personaResult,
    hasIcp,
    hasPersona,
    loading,
    isKo,
    starPositions,
    hybridResult,
    hybridNarrative,
  }
}
