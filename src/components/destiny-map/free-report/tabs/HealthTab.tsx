'use client'

import { repairMojibakeDeep } from '@/lib/text/mojibake'
import type { TabProps } from './types'
import { expandNarrativeDeep } from './shared/longForm'
import { getHealthMatrixAnalysis } from '../analyzers/matrixAnalyzer'
import { PremiumReportCTA } from '../components'
import {
  type HealthItem,
  type ChironInsight,
  getHealthStory,
  getEnergyLevel,
  VitalityScoreCard,
  ElementBalanceSection,
  VulnerableAreasSection,
  LifeCycleCard,
  ShinsalHealthSection,
  HealthCheckPoints,
  ChironDeepAnalysis,
} from './health'
import { ensureMinSentenceText } from './shared/textDepth'

export default function HealthTab({ saju, astro, isKo, data }: TabProps) {
  // Early return if data is null
  if (!data) {
    return <div className="text-gray-400 text-center p-6">Loading...</div>
  }

  const healthAnalysis = expandNarrativeDeep(
    repairMojibakeDeep((data as Record<string, unknown>).healthAnalysis as HealthItem[] | null),
    { isKo, topic: 'health', minSentences: 4 }
  )
  const chironInsight = expandNarrativeDeep(
    repairMojibakeDeep((data as Record<string, unknown>).chironInsight as ChironInsight | null),
    { isKo, topic: 'healing', minSentences: 4 }
  )
  const dayMasterName = data.dayMasterName || ''

  // 매트릭스 분석 호출
  const matrixHealth = expandNarrativeDeep(
    repairMojibakeDeep(
      getHealthMatrixAnalysis(saju || undefined, astro || undefined, isKo ? 'ko' : 'en')
    ),
    { isKo, topic: 'health', minSentences: 4 }
  )

  // 일간별 건강 정보
  const healthStory = expandNarrativeDeep(
    repairMojibakeDeep(getHealthStory(String(dayMasterName || ''), isKo)),
    { isKo, topic: 'health', minSentences: 4 }
  )

  // 에너지 강도 분석
  const advancedAnalysis = (saju as Record<string, unknown>)?.advancedAnalysis as
    | Record<string, unknown>
    | undefined
  const extendedAnalysis = advancedAnalysis?.extended as Record<string, unknown> | undefined
  const energyStrength = extendedAnalysis?.strength as Record<string, unknown> | undefined
  const energyLevel = expandNarrativeDeep(
    repairMojibakeDeep(getEnergyLevel(energyStrength, isKo)),
    { isKo, topic: 'health', minSentences: 4 }
  )

  return (
    <div className="space-y-6">
      {/* 1. 종합 생명력 점수 */}
      {matrixHealth && <VitalityScoreCard matrixHealth={matrixHealth} isKo={isKo} />}

      {/* 2. 오행 건강 밸런스 */}
      {matrixHealth && matrixHealth.elementBalance.length > 0 && (
        <ElementBalanceSection elementBalance={matrixHealth.elementBalance} isKo={isKo} />
      )}

      {/* 3. 취약 부위 경고 */}
      {matrixHealth && matrixHealth.vulnerableAreas.length > 0 && (
        <VulnerableAreasSection vulnerableAreas={matrixHealth.vulnerableAreas} isKo={isKo} />
      )}

      {/* 4. 생명력 사이클 */}
      {matrixHealth?.lifeCycleStage && (
        <LifeCycleCard lifeCycleStage={matrixHealth.lifeCycleStage} isKo={isKo} />
      )}

      {/* 5. 신살 건강 경고 */}
      {matrixHealth && matrixHealth.shinsalHealth.length > 0 && (
        <ShinsalHealthSection shinsalHealth={matrixHealth.shinsalHealth} isKo={isKo} />
      )}

      {/* 6. 에너지 타입 */}
      {energyLevel && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-orange-900/20 border border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{energyLevel.emoji}</span>
            <h3 className="text-lg font-bold text-orange-300">
              {isKo ? '나의 에너지 타입' : 'My Energy Type'}: {energyLevel.level}
            </h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed mb-3">
            {ensureMinSentenceText(energyLevel.desc, isKo, 'health')}
          </p>
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-orange-200">
              {ensureMinSentenceText(energyLevel.advice, isKo, 'health')}
            </p>
          </div>
        </div>
      )}

      {/* 7. 건강 체크 포인트 */}
      <HealthCheckPoints healthStory={healthStory} healthAnalysis={healthAnalysis} isKo={isKo} />

      {/* 8. Chiron 치유 심층 분석 */}
      {(matrixHealth?.chironHealing || chironInsight) && (
        <ChironDeepAnalysis
          chironHealing={matrixHealth?.chironHealing ?? null}
          chironInsight={chironInsight}
          isKo={isKo}
        />
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA section="health" matrixData={{ matrixHealth }} />
    </div>
  )
}
