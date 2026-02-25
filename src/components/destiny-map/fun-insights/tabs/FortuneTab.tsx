'use client'

import { memo, useMemo } from 'react'
import { repairMojibakeDeep } from '@/lib/text/mojibake'
import { expandNarrativeDeep } from './shared/longForm'
import type { TabProps } from './types'
import { getFullMatrixAnalysis } from '../analyzers'
import { PremiumReportCTA } from '../components'

import type { SajuDataExtended, PlanetData, CurrentFlow } from './fortune/types'
import { findPlanetSign, findPlanetHouse } from './fortune/utils'
import {
  calculateYearFortune,
  calculateMonthFortune,
  calculateTodayFortune,
  calculateActionPlan,
} from './fortune/hooks'
import {
  EnergyStatusSection,
  CurrentFlowSection,
  YearFortuneSection,
  MonthFortuneSection,
  TodayFortuneSection,
  ActionPlanSection,
  LifeCycleSection,
  TimingOverlaySection,
  RelationAspectSection,
  AdvancedAnalysisSection,
  ExtraPointsSection,
} from './fortune/components'

function FortuneTab({ saju, astro, lang, isKo, data }: TabProps) {
  // Compute full matrix once and reuse by section.
  const fullMatrix = useMemo(
    () => repairMojibakeDeep(getFullMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang)),
    [saju, astro, lang]
  )

  const matrixAnalysis = repairMojibakeDeep(fullMatrix ?? null)
  const timingOverlays = expandNarrativeDeep(
    repairMojibakeDeep(fullMatrix?.timingOverlays ?? []),
    { isKo, topic: 'timing', minSentences: 4 }
  )
  const relationAspects = expandNarrativeDeep(
    repairMojibakeDeep(fullMatrix?.relationAspects ?? []),
    { isKo, topic: 'fortune', minSentences: 4 }
  )
  const advancedAnalysis = expandNarrativeDeep(
    repairMojibakeDeep(fullMatrix?.advancedAnalysis ?? []),
    { isKo, topic: 'fortune', minSentences: 4 }
  )
  const extraPoints = expandNarrativeDeep(
    repairMojibakeDeep(fullMatrix?.extraPoints ?? []),
    { isKo, topic: 'hidden', minSentences: 4 }
  )

  const topSibsinHouse = useMemo(
    () =>
      [...(fullMatrix?.sibsinHouseFusions ?? [])]
        .sort((a, b) => b.fusion.score - a.fusion.score)
        .slice(0, 3),
    [fullMatrix]
  )
  const topAsteroidHouse = useMemo(
    () =>
      [...(fullMatrix?.asteroidHouseFusions ?? [])]
        .sort((a, b) => b.fusion.score - a.fusion.score)
        .slice(0, 3),
    [fullMatrix]
  )

  // Early return if data is null
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>
  }

  const currentFlow = expandNarrativeDeep(
    repairMojibakeDeep(data.currentFlow as CurrentFlow | null),
    { isKo, topic: 'fortune', minSentences: 4 }
  )
  const dayElement = data.dayElement as string | undefined

  // Extract saju data
  const sajuExt = saju as SajuDataExtended | undefined
  const dayMaster =
    sajuExt?.dayMaster?.name ??
    sajuExt?.dayMaster?.heavenlyStem ??
    sajuExt?.fourPillars?.day?.heavenlyStem ??
    ''
  const dayMasterElement = sajuExt?.dayMaster?.element ?? ''
  const daeun = sajuExt?.daeun ?? sajuExt?.bigFortune
  const currentDaeun = Array.isArray(daeun) ? daeun.find((d) => d.current || d.isCurrent) : null

  // Extract astrology data
  const planets = astro?.planets as PlanetData[] | undefined
  const jupiterSign = findPlanetSign(planets, 'jupiter')
  const jupiterHouse = findPlanetHouse(planets, 'jupiter')
  const saturnSign = findPlanetSign(planets, 'saturn')
  const saturnHouse = findPlanetHouse(planets, 'saturn')

  // Calculate fortunes
  const dayMasterName = data.dayMasterName || ''
  const yearFortune = expandNarrativeDeep(
    repairMojibakeDeep(calculateYearFortune({ sajuExt, dayMasterName, dayElement, isKo })),
    { isKo, topic: 'fortune', minSentences: 4 }
  )
  const monthFortune = expandNarrativeDeep(
    repairMojibakeDeep(calculateMonthFortune({ sajuExt, isKo })),
    { isKo, topic: 'fortune', minSentences: 4 }
  )
  const todayFortune = expandNarrativeDeep(
    repairMojibakeDeep(calculateTodayFortune({ sajuExt, isKo })),
    { isKo, topic: 'fortune', minSentences: 4 }
  )
  const actionPlan = expandNarrativeDeep(
    repairMojibakeDeep(
      calculateActionPlan({
        todayFortune,
        monthFortune,
        yearFortune,
        dayElement,
        isKo,
      })
    ),
    { isKo, topic: 'fortune', minSentences: 4 }
  )

  return (
    <div className="space-y-6">
      {/* Energy Status Summary */}
      <EnergyStatusSection
        dayMaster={dayMaster}
        dayMasterElement={dayMasterElement}
        currentDaeun={currentDaeun ?? null}
        jupiterSign={jupiterSign}
        jupiterHouse={jupiterHouse}
        saturnSign={saturnSign}
        saturnHouse={saturnHouse}
        isKo={isKo}
      />

      {/* Current Flow (Daeun + Seun) */}
      {currentFlow && <CurrentFlowSection currentFlow={currentFlow} isKo={isKo} />}

      {/* Year Fortune */}
      {yearFortune && (
        <YearFortuneSection yearFortune={yearFortune} dayMaster={dayMaster} isKo={isKo} />
      )}

      {/* Month Fortune */}
      {monthFortune && <MonthFortuneSection monthFortune={monthFortune} isKo={isKo} />}

      {/* Today Fortune */}
      {todayFortune && <TodayFortuneSection todayFortune={todayFortune} isKo={isKo} />}

      {/* Action Plan */}
      {actionPlan && <ActionPlanSection actionPlan={actionPlan} isKo={isKo} />}

      {/* Life Cycle Section */}
      {matrixAnalysis && matrixAnalysis.lifeCycles.length > 0 && (
        <LifeCycleSection lifeCycles={matrixAnalysis.lifeCycles} isKo={isKo} />
      )}

      {/* Layer 3 + Layer 9 quick insight */}
      {(topSibsinHouse.length > 0 || topAsteroidHouse.length > 0) && (
        <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-700/40 space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {isKo ? '심화 매트릭스 포인트' : 'Deep Matrix Highlights'}
          </h3>

          {topSibsinHouse.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-indigo-300">
                {isKo ? 'Layer 3 · 십신 × 하우스' : 'Layer 3 · Sibsin × House'}
              </p>
              {topSibsinHouse.map((item, idx) => (
                <div key={`${item.sibsin}-${item.house}-${idx}`} className="text-sm text-gray-200">
                  <span className="mr-2">{item.fusion.icon}</span>
                  <span className="font-medium text-white">
                    {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                  </span>
                  <span className="ml-2 text-gray-300">
                    {isKo ? item.fusion.description.ko : item.fusion.description.en}
                  </span>
                </div>
              ))}
            </div>
          )}

          {topAsteroidHouse.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-pink-300">
                {isKo ? 'Layer 9 · 소행성 × 하우스' : 'Layer 9 · Asteroid × House'}
              </p>
              {topAsteroidHouse.map((item, idx) => (
                <div
                  key={`${item.asteroid}-${item.house}-${idx}`}
                  className="text-sm text-gray-200"
                >
                  <span className="mr-2">{item.fusion.icon}</span>
                  <span className="font-medium text-white">
                    {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                  </span>
                  <span className="ml-2 text-gray-300">
                    {isKo ? item.fusion.description.ko : item.fusion.description.en}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Layer 4: Timing Overlay */}
      <TimingOverlaySection timingOverlays={timingOverlays} isKo={isKo} />

      {/* Layer 5: Relation-Aspect */}
      <RelationAspectSection relationAspects={relationAspects} isKo={isKo} />

      {/* Layer 7: Advanced Analysis */}
      <AdvancedAnalysisSection advancedAnalysis={advancedAnalysis} isKo={isKo} />

      {/* Layer 10: Extra Points */}
      <ExtraPointsSection extraPoints={extraPoints} isKo={isKo} />

      {/* AI Premium Report CTA */}
      <PremiumReportCTA section="fortune" />
    </div>
  )
}

export default memo(FortuneTab)
