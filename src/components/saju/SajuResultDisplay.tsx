// src/components/saju/SajuResultDisplay.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  type DaeunData,
  type YeonunData,
  type WolunData,
  type IljinData,
} from '../../lib/Saju'
import FunInsights from '../destiny-map/FunInsights'
import { SajuApiResponse } from './types/analysis.types'
import { Section, OhaengDistribution, RelationsPanel } from './result-display/components'
import {
  PillarSection,
  AdvancedAnalysisSection,
  FortuneFlowSection,
} from './result-display/sections'

// Re-export for external usage
export type { SajuApiResponse } from './types/analysis.types'

interface Props {
  result: SajuApiResponse
}

/* =========================================== */

export default function SajuResultDisplay({ result }: Props) {
  const [selectedDaeun, setSelectedDaeun] = useState<DaeunData | null>(null)
  const [selectedYeonun, setSelectedYeonun] = useState<YeonunData | undefined>()
  const [selectedWolun, setSelectedWolun] = useState<WolunData | undefined>()
  const [displayedYeonun, setDisplayedYeonun] = useState<YeonunData[]>([])
  const [displayedWolun, setDisplayedWolun] = useState<WolunData[]>([])
  const [displayedIljin, setDisplayedIljin] = useState<IljinData[]>([])

  // Initialize selected daeun based on current age
  useEffect(() => {
    if (result && result.daeun?.cycles?.length) {
      const currentYear = new Date().getFullYear()
      const currentAge = currentYear - result.birthYear + 1
      const initialDaeun =
        result.daeun.cycles.find((d) => currentAge >= d.age && currentAge < d.age + 10) ||
        result.daeun.cycles[0]
      setSelectedDaeun(initialDaeun)
    }
  }, [result])

  useEffect(() => {
    if (!selectedDaeun) {
      return
    }
    const daeunStartYear = result.birthYear + selectedDaeun.age - 1
    const newYeonun = getAnnualCycles(daeunStartYear, 10, result.dayMaster)
    setDisplayedYeonun(newYeonun)
    setSelectedYeonun(
      newYeonun.find((y) => y.year === new Date().getFullYear()) || newYeonun[newYeonun.length - 1]
    )
  }, [selectedDaeun, result.birthYear, result.dayMaster])

  useEffect(() => {
    if (!selectedYeonun) {
      return
    }
    const newWolun = getMonthlyCycles(selectedYeonun.year, result.dayMaster)
    setDisplayedWolun(newWolun)
    const now = new Date()
    const nowKst = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -9, 0, 0, 0)
    )
    const kstMonth = nowKst.getUTCMonth() + 1
    setSelectedWolun(newWolun.find((m) => m.month === kstMonth) ?? newWolun[newWolun.length - 1])
  }, [selectedYeonun, result.dayMaster])

  useEffect(() => {
    if (!selectedWolun) {
      return
    }
    const y = selectedWolun.year
    const m = selectedWolun.month
    const newIljin = getIljinCalendar(y, m, result.dayMaster)
    const fixed = newIljin.filter((d) => d.year === y && d.month === m)
    setDisplayedIljin(fixed)
  }, [selectedWolun, result.dayMaster])

  // Memoized click handlers
  const handleDaeunClick = useCallback((item: DaeunData) => {
    setSelectedDaeun(item)
  }, [])

  const handleYeonunClick = useCallback((item: YeonunData) => {
    setSelectedYeonun(item)
  }, [])

  const handleWolunClick = useCallback((item: WolunData) => {
    setSelectedWolun(item)
  }, [])

  // Memoized day master display
  const dayMasterDisplay = useMemo(() => {
    const { dayPillar } = result
    const stemName =
      typeof dayPillar.heavenlyStem === 'string'
        ? dayPillar.heavenlyStem
        : (dayPillar.heavenlyStem?.name ?? '')
    const stemElement =
      typeof dayPillar.heavenlyStem === 'string' ? '' : (dayPillar.heavenlyStem?.element ?? '')
    return { name: stemName, element: stemElement }
  }, [result])

  // Memoized FunInsights saju prop (FunInsights expects flexible SajuData type)
  const funInsightsSaju = useMemo(
    () => ({
      dayMaster: result.dayMaster,
      pillars: {
        year: {
          heavenlyStem:
            typeof result.yearPillar.heavenlyStem === 'string'
              ? result.yearPillar.heavenlyStem
              : result.yearPillar.heavenlyStem?.name,
          earthlyBranch:
            typeof result.yearPillar.earthlyBranch === 'string'
              ? result.yearPillar.earthlyBranch
              : result.yearPillar.earthlyBranch?.name,
        },
        month: {
          heavenlyStem:
            typeof result.monthPillar.heavenlyStem === 'string'
              ? result.monthPillar.heavenlyStem
              : result.monthPillar.heavenlyStem?.name,
          earthlyBranch:
            typeof result.monthPillar.earthlyBranch === 'string'
              ? result.monthPillar.earthlyBranch
              : result.monthPillar.earthlyBranch?.name,
        },
        day: {
          heavenlyStem:
            typeof result.dayPillar.heavenlyStem === 'string'
              ? result.dayPillar.heavenlyStem
              : result.dayPillar.heavenlyStem?.name,
          earthlyBranch:
            typeof result.dayPillar.earthlyBranch === 'string'
              ? result.dayPillar.earthlyBranch
              : result.dayPillar.earthlyBranch?.name,
        },
        time: {
          heavenlyStem:
            typeof result.timePillar.heavenlyStem === 'string'
              ? result.timePillar.heavenlyStem
              : result.timePillar.heavenlyStem?.name,
          earthlyBranch:
            typeof result.timePillar.earthlyBranch === 'string'
              ? result.timePillar.earthlyBranch
              : result.timePillar.earthlyBranch?.name,
        },
      },
      fiveElements: result.fiveElements,
      unse: result.daeun,
      sinsal: ('sinsal' in result ? result.sinsal : undefined) as
        | {
            luckyList?: { name: string }[]
            unluckyList?: { name: string }[]
            [key: string]: unknown
          }
        | undefined,
      advancedAnalysis: result.advancedAnalysis,
    }),
    [result]
  )

  if (!result || !result.daeun?.cycles || !selectedDaeun) {
    return (
      <div className="text-white text-center mt-8" role="status" aria-live="polite">
        결과를 표시할 수 없습니다.
      </div>
    )
  }

  const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = result

  return (
    <article className="mt-12 text-gray-200 font-sans" aria-label="사주 분석 결과">
      <PillarSection
        yearPillar={yearPillar}
        monthPillar={monthPillar}
        dayPillar={dayPillar}
        timePillar={timePillar}
        dayMasterDisplay={dayMasterDisplay}
        tableByPillar={result.table?.byPillar}
      />

      <Section title="Five Elements">
        {fiveElements && <OhaengDistribution ohaengData={fiveElements} />}
      </Section>

      <Section title="합·충 관계">
        <RelationsPanel relations={result.relations} />
      </Section>

      {result.advancedAnalysis && (
        <AdvancedAnalysisSection advancedAnalysis={result.advancedAnalysis} />
      )}

      <FortuneFlowSection
        daeun={daeun}
        displayedYeonun={displayedYeonun}
        displayedWolun={displayedWolun}
        displayedIljin={displayedIljin}
        selectedDaeun={selectedDaeun}
        selectedYeonun={selectedYeonun}
        selectedWolun={selectedWolun}
        onDaeunClick={handleDaeunClick}
        onYeonunClick={handleYeonunClick}
        onWolunClick={handleWolunClick}
      />

      {/* 재미있는 사주 인사이트 - 이해하기 쉬운 해석 */}
      <Section title="✨ 쉽게 이해하는 나의 사주">
        <FunInsights saju={funInsightsSaju} astro={undefined} theme="life" />
      </Section>
    </article>
  )
}
