import { useState, useCallback, useEffect, type ComponentProps } from 'react'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import type FortuneDashboard from '@/components/life-prediction/FortuneDashboard'

type FortuneTrend = ComponentProps<typeof FortuneDashboard>['trend']

type SearchParams = Record<string, string | string[] | undefined>

interface DestinyResult {
  saju?: Record<string, unknown>
  astrology?: Record<string, unknown>
  [key: string]: unknown
}

export function useLifePrediction(
  sp: SearchParams,
  result: DestinyResult | null,
  activeTab: string
) {
  const [lifePredictionTrend, setLifePredictionTrend] = useState<FortuneTrend | null>(null)
  const [lifePredictionLoading, setLifePredictionLoading] = useState(false)
  const [lifePredictionError, setLifePredictionError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const loadLifePrediction = useCallback(async () => {
    if (lifePredictionTrend || lifePredictionLoading) {
      return
    }

    const birthDate = (Array.isArray(sp.birthDate) ? sp.birthDate[0] : sp.birthDate) ?? ''
    const birthTime = (Array.isArray(sp.birthTime) ? sp.birthTime[0] : sp.birthTime) ?? ''
    const gender = (Array.isArray(sp.gender) ? sp.gender[0] : sp.gender) ?? 'Male'
    const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? 'ko'
    const locale = rawLang === 'en' ? 'en' : 'ko'

    if (!birthDate || !birthTime) {
      return
    }

    setLifePredictionLoading(true)
    setLifePredictionError(null)

    try {
      const sajuGender = gender === 'Female' ? 'female' : 'male'
      const sajuResult = calculateSajuData(birthDate, birthTime, sajuGender, 'solar', 'Asia/Seoul')

      const dayStem = sajuResult?.pillars?.day?.heavenlyStem?.name || '甲'
      const dayBranch = sajuResult?.pillars?.day?.earthlyBranch?.name || '子'
      const monthBranch = sajuResult?.pillars?.month?.earthlyBranch?.name || '子'
      const yearBranch = sajuResult?.pillars?.year?.earthlyBranch?.name || '子'
      const allStems = [
        sajuResult?.pillars?.year?.heavenlyStem?.name,
        sajuResult?.pillars?.month?.heavenlyStem?.name,
        dayStem,
        sajuResult?.pillars?.time?.heavenlyStem?.name,
      ].filter(Boolean)
      const allBranches = [
        yearBranch,
        monthBranch,
        dayBranch,
        sajuResult?.pillars?.time?.earthlyBranch?.name,
      ].filter(Boolean)
      const daeunData = sajuResult?.daeWoon?.list || []
      const birthYear = parseInt(birthDate.split('-')[0])

      const response = await fetch('/api/life-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'comprehensive',
          birthYear,
          birthMonth: parseInt(birthDate.split('-')[1]),
          birthDay: parseInt(birthDate.split('-')[2]),
          gender: sajuGender,
          dayStem,
          dayBranch,
          monthBranch,
          yearBranch,
          allStems,
          allBranches,
          daeunList: daeunData,
          yearsRange: 10,
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch prediction')
      }
      const apiResult = await response.json()
      if (apiResult.success && apiResult.data?.multiYearTrend) {
        setLifePredictionTrend(apiResult.data.multiYearTrend)
      } else {
        throw new Error(apiResult.error || 'Unknown error')
      }
    } catch (err) {
      logger.error('[LifePrediction] Error:', err)
      setLifePredictionError(err instanceof Error ? err.message : String(err))
    } finally {
      setLifePredictionLoading(false)
    }
  }, [sp, lifePredictionTrend, lifePredictionLoading])

  useEffect(() => {
    if (activeTab === 'life-prediction' && !lifePredictionTrend && !lifePredictionLoading) {
      loadLifePrediction()
    }
  }, [activeTab, lifePredictionTrend, lifePredictionLoading, loadLifePrediction])

  const handleYearClick = useCallback((year: number) => setSelectedYear(year), [])

  const saveLifePrediction = useCallback(async () => {
    if (!lifePredictionTrend || saveStatus === 'saving') {
      return
    }
    setSaveStatus('saving')
    try {
      const rawLang = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? 'ko'
      const response = await fetch('/api/life-prediction/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          multiYearTrend: lifePredictionTrend,
          saju: result?.saju,
          astro: result?.astrology,
          locale: rawLang,
        }),
      })
      if (response.ok) {
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [lifePredictionTrend, result, sp, saveStatus])

  return {
    lifePredictionTrend,
    lifePredictionLoading,
    lifePredictionError,
    selectedYear,
    saveStatus,
    loadLifePrediction,
    saveLifePrediction,
    handleYearClick,
    setLifePredictionTrend,
    setLifePredictionError,
  }
}
