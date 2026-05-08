'use client'

import { useState } from 'react'
import { repairMojibakeDeep } from '@/lib/text/mojibake'
import { expandNarrativeDeep } from './shared/longForm'
import type { TabProps } from './types'
import UnifiedSection from './shared/UnifiedSection';
import type { UnifiedSlice } from '../analyzers/unifiedAdapter';
import type { KarmaAnalysisResult } from '../analyzers/karmaAnalyzer'
import type { SajuDataExtended, PlanetData } from './data'
import { getKarmaMatrixAnalysis } from '../analyzers/matrixAnalyzer'
import { findPlanetHouse, analyzeElements } from './data'
import {
  getSoulIdentityNarrative,
  getLifeDirectionNarrative,
  getPastLifeNarrative,
  getGrowthHealingNarrative,
  getEnergyBalanceNarrative,
} from './data/karma-narratives'
import { PremiumReportCTA } from '../components'
import { ensureMinNarrativeParagraphs } from './shared/textDepth'

type TabId = 'soul' | 'direction' | 'pastlife' | 'growth' | 'energy'

interface TabConfig {
  id: TabId
  icon: string
  labelKo: string
  labelEn: string
}

const TABS: TabConfig[] = [
  { id: 'soul', icon: '🔮', labelKo: '영혼의 정체성', labelEn: 'Soul Identity' },
  { id: 'direction', icon: '🧭', labelKo: '이번 생의 방향', labelEn: 'Life Direction' },
  { id: 'pastlife', icon: '⭐', labelKo: '전생의 에너지', labelEn: 'Past Life Energy' },
  { id: 'growth', icon: '🌱', labelKo: '성장과 치유', labelEn: 'Growth & Healing' },
  { id: 'energy', icon: '⚖️', labelKo: '에너지 밸런스', labelEn: 'Energy Balance' },
]

export default function KarmaTab({ saju, astro, isKo, data }: TabProps) {
  const unified = (data as { unified?: UnifiedSlice | null } | null)?.unified ?? null;
  const [activeTab, setActiveTab] = useState<TabId>('soul')

  const karmaAnalysis = expandNarrativeDeep(
    repairMojibakeDeep((data as Record<string, unknown>).karmaAnalysis as KarmaAnalysisResult | null),
    { isKo, topic: 'karma', minSentences: 4 }
  )
  const matrixKarma = expandNarrativeDeep(
    repairMojibakeDeep(getKarmaMatrixAnalysis(saju || undefined, astro || undefined, isKo ? 'ko' : 'en')),
    { isKo, topic: 'karma', minSentences: 4 }
  )

  // 데이터 추출
  const sajuExt = saju as SajuDataExtended | undefined
  const dayMaster =
    sajuExt?.dayMaster?.name ??
    sajuExt?.dayMaster?.heavenlyStem ??
    sajuExt?.fourPillars?.day?.heavenlyStem ??
    ''
  const sinsal = sajuExt?.advancedAnalysis?.sinsal ?? {}
  const luckyList = repairMojibakeDeep((sinsal?.luckyList ?? [])
    .map((item: unknown) =>
      typeof item === 'string'
        ? item
        : ((item as { name?: string; shinsal?: string })?.name ??
          (item as { name?: string; shinsal?: string })?.shinsal ??
          '')
    )
    .filter(Boolean))
  const unluckyList = repairMojibakeDeep((sinsal?.unluckyList ?? [])
    .map((item: unknown) =>
      typeof item === 'string'
        ? item
        : ((item as { name?: string; shinsal?: string })?.name ??
          (item as { name?: string; shinsal?: string })?.shinsal ??
          '')
    )
    .filter(Boolean))
  const elementAnalysis = expandNarrativeDeep(
    repairMojibakeDeep(analyzeElements(sajuExt)),
    { isKo, topic: 'karma', minSentences: 4 }
  )

  // 점성술 데이터
  const planets = astro?.planets as PlanetData[] | undefined
  const northNodeHouse =
    findPlanetHouse(planets, 'north node') ?? findPlanetHouse(planets, 'northnode')
  const saturnHouse = findPlanetHouse(planets, 'saturn')

  // Check if we have any data to show
  const hasAnyData = !!(
    karmaAnalysis ||
    dayMaster ||
    northNodeHouse ||
    matrixKarma ||
    elementAnalysis
  )

  if (!hasAnyData) {
    return (
      <div className="p-6 text-center text-gray-400">
      <UnifiedSection unified={unified} variant="life" isKo={isKo} />
        <span className="text-4xl mb-4 block">🔮</span>
        {isKo
          ? '카르마 분석을 위한 데이터가 충분하지 않습니다.'
          : 'Not enough data for karma analysis.'}
      </div>
    )
  }

  // Get narratives for each section
  const soulNarrative = repairMojibakeDeep(
    ensureMinNarrativeParagraphs(
      getSoulIdentityNarrative(dayMaster || undefined, karmaAnalysis?.soulType, isKo),
      isKo,
      'karma'
    )
  )
  const directionNarrative = repairMojibakeDeep(
    ensureMinNarrativeParagraphs(
      getLifeDirectionNarrative(
        northNodeHouse,
        saturnHouse,
        matrixKarma?.nodeAxis ?? undefined,
        isKo
      ),
      isKo,
      'karma'
    )
  )
  const pastLifeNarrative = repairMojibakeDeep(
    ensureMinNarrativeParagraphs(
      getPastLifeNarrative(
        luckyList,
        unluckyList,
        matrixKarma?.pastLifeHints ?? [],
        karmaAnalysis?.pastLifeTheme,
        isKo
      ),
      isKo,
      'karma'
    )
  )
  const growthNarrative = repairMojibakeDeep(
    ensureMinNarrativeParagraphs(
      getGrowthHealingNarrative(
        karmaAnalysis?.woundToHeal,
        karmaAnalysis?.soulMission,
        matrixKarma?.karmicRelations ?? [],
        isKo
      ),
      isKo,
      'karma'
    )
  )
  const energyNarrative = repairMojibakeDeep(
    ensureMinNarrativeParagraphs(getEnergyBalanceNarrative(elementAnalysis, isKo), isKo, 'karma')
  )

  const renderNarrative = (paragraphs: string[]) => (
    <div className="space-y-4">
      {paragraphs.map((p, idx) => {
        const text = repairMojibakeDeep(p)
        if (text === '') {
          return <div key={idx} className="h-2" />
        }
        // Check if it's a section header
        if (text.startsWith('【') || text.includes('【')) {
          return (
            <h4 key={idx} className="text-lg font-bold text-purple-300 mt-6 mb-2">
              {text}
            </h4>
          )
        }
        // Check if it's a sub-item (starts with emoji or special character)
        if (text.match(/^[🎯💫✨📚💡📖😓🏆💔🩹🎁🌀⭐💰🌟⚡🗡️]/u)) {
          return (
            <p
              key={idx}
              className="text-gray-200 text-sm leading-relaxed pl-2 border-l-2 border-purple-500/30"
            >
              {text}
            </p>
          )
        }
        // Check if it's an indented advice line
        if (text.startsWith('   →')) {
          return (
            <p key={idx} className="text-purple-300 text-sm italic pl-6 leading-relaxed">
              {text.substring(4)}
            </p>
          )
        }
        return (
          <p key={idx} className="text-gray-300 text-sm leading-relaxed">
            {text}
          </p>
        )
      })}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'soul':
        return (
          <div className="rounded-2xl bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 p-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">🔮</span>
              <h3 className="text-2xl font-bold text-purple-200">
                {isKo ? '영혼의 정체성' : 'Soul Identity'}
              </h3>
              <p className="text-purple-400 text-sm mt-1">
                {isKo
                  ? '당신은 누구이며, 어떤 에너지를 타고 태어났는가'
                  : 'Who you are and what energy you were born with'}
              </p>
            </div>
            {renderNarrative(soulNarrative)}
          </div>
        )

      case 'direction':
        return (
          <div className="rounded-2xl bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border border-teal-500/30 p-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">🧭</span>
              <h3 className="text-2xl font-bold text-teal-200">
                {isKo ? '이번 생의 방향' : "This Life's Direction"}
              </h3>
              <p className="text-teal-400 text-sm mt-1">
                {isKo
                  ? '어디서 와서 어디로 가야 하는가'
                  : 'Where you came from and where you need to go'}
              </p>
            </div>
            {renderNarrative(directionNarrative)}
          </div>
        )

      case 'pastlife':
        return (
          <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-purple-900/40 border border-violet-500/30 p-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">⭐</span>
              <h3 className="text-2xl font-bold text-violet-200">
                {isKo ? '전생의 에너지' : 'Past Life Energy'}
              </h3>
              <p className="text-violet-400 text-sm mt-1">
                {isKo
                  ? '타고난 별들과 전생에서 가져온 것들'
                  : 'Stars you were born with and what you brought from past lives'}
              </p>
            </div>
            {renderNarrative(pastLifeNarrative)}
          </div>
        )

      case 'growth':
        return (
          <div className="rounded-2xl bg-gradient-to-br from-rose-900/40 to-pink-900/40 border border-rose-500/30 p-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">🌱</span>
              <h3 className="text-2xl font-bold text-rose-200">
                {isKo ? '성장과 치유' : 'Growth & Healing'}
              </h3>
              <p className="text-rose-400 text-sm mt-1">
                {isKo
                  ? '이번 생의 사명과 치유해야 할 상처'
                  : "This life's mission and wounds to heal"}
              </p>
            </div>
            {renderNarrative(growthNarrative)}
          </div>
        )

      case 'energy':
        return (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-900/40 to-green-900/40 border border-emerald-500/30 p-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">⚖️</span>
              <h3 className="text-2xl font-bold text-emerald-200">
                {isKo ? '에너지 밸런스' : 'Energy Balance'}
              </h3>
              <p className="text-emerald-400 text-sm mt-1">
                {isKo
                  ? '오행의 균형과 보충해야 할 에너지'
                  : 'Five Elements balance and energy to supplement'}
              </p>
            </div>
            {/* Visual Element Bars */}
            {elementAnalysis && (
              <div className="mb-6 p-4 rounded-xl bg-white/5">
                <div className="space-y-3">
                  {Object.entries(elementAnalysis.balance).map(([element, value]) => {
                    const percentage = Math.min(100, Math.max(5, (value as number) * 20))
                    const colors: Record<string, string> = {
                      wood: 'from-green-500 to-green-400',
                      fire: 'from-red-500 to-orange-400',
                      earth: 'from-yellow-600 to-yellow-400',
                      metal: 'from-gray-400 to-white',
                      water: 'from-blue-600 to-blue-400',
                    }
                    const names: Record<string, { ko: string; en: string; emoji: string }> = {
                      wood: { ko: '나무', en: 'Wood', emoji: '🌳' },
                      fire: { ko: '불', en: 'Fire', emoji: '🔥' },
                      earth: { ko: '흙', en: 'Earth', emoji: '🏔️' },
                      metal: { ko: '쇠', en: 'Metal', emoji: '⚔️' },
                      water: { ko: '물', en: 'Water', emoji: '💧' },
                    }
                    const info = names[element]

                    return (
                      <div key={element}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300">
                            {info.emoji} {isKo ? info.ko : info.en}
                          </span>
                          <span className="text-xs text-gray-400">{value}</span>
                        </div>
                        <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${colors[element]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {renderNarrative(energyNarrative)}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Karma Score Header */}
      {matrixKarma && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/30 border border-violet-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌌</span>
              <h3 className="text-lg font-bold text-violet-300">
                {isKo ? '카르마 탐색 지수' : 'Karma Exploration Index'}
              </h3>
            </div>
            <div className="text-3xl font-bold text-violet-400">
              {matrixKarma.karmaScore}
              <span className="text-lg text-violet-500">/100</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500 rounded-full"
                style={{ width: `${matrixKarma.karmaScore}%` }}
              />
            </div>
          </div>

          <p className="text-gray-300 text-sm">
            {matrixKarma.karmaScore >= 80
              ? isKo
                ? '🌟 아주 깊은 영혼의 여정이 드러났어요! 아래 탭에서 자세한 분석을 확인하세요.'
                : '🌟 Very deep soul journey revealed! Check detailed analysis in tabs below.'
              : matrixKarma.karmaScore >= 60
                ? isKo
                  ? '✨ 카르마 패턴이 선명하게 보여요. 각 영역을 탐색해보세요.'
                  : '✨ Karma patterns showing clearly. Explore each area.'
                : matrixKarma.karmaScore >= 40
                  ? isKo
                    ? '💫 기본적인 영혼 패턴을 볼 수 있어요. 더 알아보세요.'
                    : '💫 Basic soul patterns visible. Learn more.'
                  : isKo
                    ? '🌙 더 많은 정보로 깊이 탐색할 수 있어요.'
                    : '🌙 More info enables deeper exploration.'}
          </p>
        </div>
      )}

      {/* Soul Pattern Summary */}
      {matrixKarma?.soulPattern && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-2 border-indigo-400/50 p-6">
          <div className="text-center">
            <span className="text-4xl block mb-2">{matrixKarma.soulPattern.fusion.icon}</span>
            <h3 className="text-xl font-bold text-indigo-200">
              {isKo ? matrixKarma.soulPattern.soulTheme.ko : matrixKarma.soulPattern.soulTheme.en}
            </h3>
            <p className="text-indigo-400 text-sm mt-1">
              {isKo
                ? matrixKarma.soulPattern.fusion.keyword.ko
                : matrixKarma.soulPattern.fusion.keyword.en}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  matrixKarma.soulPattern.fusion.score >= 7
                    ? 'bg-green-500/30 text-green-300'
                    : matrixKarma.soulPattern.fusion.score >= 4
                      ? 'bg-yellow-500/30 text-yellow-300'
                      : 'bg-red-500/30 text-red-300'
                }`}
              >
                {matrixKarma.soulPattern.fusion.level} · {matrixKarma.soulPattern.fusion.score}/10
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{isKo ? tab.labelKo : tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderContent()}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA section="karma" matrixData={{ matrixKarma }} />
    </div>
  )
}
