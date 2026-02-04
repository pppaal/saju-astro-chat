'use client'

import { useMemo, useState, memo } from 'react'

// Import Tab Components
import {
  PersonalityTab,
  LoveTab,
  CareerTab,
  FortuneTab,
  HealthTab,
  KarmaTab,
  TimingTab,
  HiddenSelfTab,
  type TabId,
} from './fun-insights/tabs'
import type { TabData } from './fun-insights/types'

// Import data
import {
  elementTraits,
  dayMasterData,
  tianGanMap,
  LIFE_THEMES,
  EMOTION_PATTERNS,
  RELATIONSHIP_STYLES,
  CAREER_DESTINIES,
  generateDestinyChoices,
} from './fun-insights/data'

// Import helper utilities
import { findPlanetSign } from './fun-insights/utils'

// Import analyzers
import {
  getSibsinAnalysis,
  getCrossAnalysis,
  getHealthAnalysis,
  getCurrentFlowAnalysis,
  getLoveAnalysis,
  getCareerAnalysis,
  getKarmaAnalysis,
  getPersonalityAnalysis,
} from './fun-insights/analyzers'

// Import astrology insights
import { getChironInsight } from './fun-insights/astrology'

// Import generators
import { getRecommendedDates, getLuckyItems, getCombinedLifeTheme } from './fun-insights/generators'

// Import report generator
import { generateReport } from './fun-insights/generators/reportGenerator'

// Import HeroSection component
import HeroSection from './fun-insights/HeroSection'

// Saju data type definition
interface SajuData {
  dayMaster?: {
    name?: string
    heavenlyStem?: string
    element?: string
  }
  pillars?: {
    year?: { heavenlyStem?: string; earthlyBranch?: string }
    month?: { heavenlyStem?: string; earthlyBranch?: string }
    day?: { heavenlyStem?: string; earthlyBranch?: string }
    time?: { heavenlyStem?: string; earthlyBranch?: string }
  }
  fiveElements?: Record<string, number>
  sinsal?: {
    luckyList?: Array<{ name: string }>
    unluckyList?: Array<{ name: string }>
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Astro data type definition
interface AstroData {
  planets?: Array<{ name?: string; sign?: string; house?: number; longitude?: number }>
  houses?: Array<{ index?: number; cusp?: number; sign?: string }>
  aspects?: Array<{ from?: string; to?: string; type?: string; orb?: number }>
  ascendant?: { sign?: string }
  [key: string]: unknown
}

interface Props {
  saju?: SajuData
  astro?: AstroData
  lang?: string
  theme?: string
  className?: string
}

// ============================================================
// 메인 컴포넌트
// ============================================================

const FunInsights = memo(function FunInsights({
  saju,
  astro,
  lang = 'ko',
  theme = '',
  className = '',
}: Props) {
  const isKo = lang === 'ko'

  const hasFiveElements = Boolean(saju?.fiveElements && Object.keys(saju.fiveElements).length > 0)
  const hasValidAstro = Boolean(findPlanetSign(astro, 'sun'))

  const data = useMemo(() => {
    if (!hasFiveElements && !hasValidAstro) {
      return null
    }

    const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || '갑'
    const dayMasterName = tianGanMap[rawDayMasterName] || rawDayMasterName
    const dayMasterInfo = dayMasterData[dayMasterName] || dayMasterData['갑']
    const dayElement = dayMasterInfo.element

    const fiveElements = saju?.fiveElements || {
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20,
    }
    const sorted = Object.entries(fiveElements).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )

    const sunSign = findPlanetSign(astro, 'sun')
    const moonSign = findPlanetSign(astro, 'moon')
    const ascSign = astro?.ascendant?.sign?.toLowerCase() || null

    return {
      dayMasterName,
      dayMasterInfo,
      dayElement,
      fiveElements,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      sunSign,
      moonSign,
      ascSign,
      crossAnalysis: getCrossAnalysis(saju, astro, lang || 'ko'),
      dates: getRecommendedDates(saju, astro, lang || 'ko'),
      luckyItems: getLuckyItems(saju, lang || 'ko'),
      sibsinAnalysis: getSibsinAnalysis(saju, lang || 'ko'),
      healthAnalysis: getHealthAnalysis(saju, lang || 'ko'),
      report: generateReport(saju, astro, lang || 'ko', theme || 'overall'),
      // 🔥 새로운 고급 분석 추가
      chironInsight: getChironInsight(astro, lang || 'ko'),
      currentFlow: getCurrentFlowAnalysis(saju, lang || 'ko'),
    }
  }, [saju, astro, lang, theme, hasFiveElements, hasValidAstro])

  // 운명 서사 생성 - 외부 상수 사용으로 대폭 간소화
  const destinyNarrative = useMemo(() => {
    if (!data) {
      return null
    }

    const dayEl = data.dayElement
    const strongEl = data.strongest[0]

    return {
      lifeTheme: LIFE_THEMES[data.dayMasterName] || LIFE_THEMES['갑'],
      emotionPattern: EMOTION_PATTERNS[strongEl],
      relationshipStyle: RELATIONSHIP_STYLES[dayEl],
      careerDestiny: CAREER_DESTINIES[strongEl],
    }
  }, [data])

  // 운명이 풀리는 선택 5가지 - 외부 함수 사용으로 간소화
  const _destinyChoices = useMemo(() => {
    if (!data) {
      return []
    }
    return generateDestinyChoices(data.weakest[0], elementTraits, isKo)
  }, [data, isKo])

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabId>('personality')

  // 탭 정의
  const tabs: { id: TabId; label: string; emoji: string }[] = [
    { id: 'personality', label: isKo ? '성격' : 'Personality', emoji: '🌟' },
    { id: 'love', label: isKo ? '연애' : 'Love', emoji: '💕' },
    { id: 'career', label: isKo ? '커리어' : 'Career', emoji: '💼' },
    { id: 'fortune', label: isKo ? '운세' : 'Fortune', emoji: '🔮' },
    { id: 'health', label: isKo ? '건강' : 'Health', emoji: '💪' },
    { id: 'karma', label: isKo ? '카르마' : 'Karma', emoji: '🌌' },
    { id: 'timing', label: isKo ? '타이밍' : 'Timing', emoji: '⏰' },
    { id: 'hidden', label: isKo ? '숨겨진 나' : 'Hidden Self', emoji: '🌑' },
  ]

  // combinedLifeTheme 계산
  const combinedLifeTheme = useMemo(() => {
    return getCombinedLifeTheme(saju, lang || 'ko')
  }, [saju, lang])

  // Hooks must be called before conditional returns
  // 오행 정규화 (탭 컴포넌트에 전달할 데이터보다 먼저 정의) - useMemo로 메모이제이션
  const normalizedElements = useMemo(() => {
    if (!data) return []
    const totalElements = Object.values(data.fiveElements).reduce(
      (a, b) => (a as number) + (b as number),
      0
    ) as number
    return Object.entries(data.fiveElements)
      .map(([el, val]) => ({
        element: el,
        value: totalElements > 0 ? Math.round(((val as number) / totalElements) * 100) : 20,
        raw: val as number,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  // 탭 컴포넌트에 전달할 데이터 - useMemo로 메모이제이션
  const tabData = useMemo(() => {
    if (!data) return null
    return {
      dayMasterName: data.dayMasterName,
      dayMasterInfo: data.dayMasterInfo,
      dayElement: data.dayElement,
      fiveElements: data.fiveElements,
      strongest: data.strongest,
      weakest: data.weakest,
      sunSign: data.sunSign,
      moonSign: data.moonSign,
      ascSign: data.ascSign,
      personalityAnalysis: getPersonalityAnalysis(saju, astro, lang),
      loveAnalysis: getLoveAnalysis(saju, astro, lang),
      careerAnalysis: getCareerAnalysis(saju, astro, lang),
      karmaAnalysis: getKarmaAnalysis(saju, astro, lang),
      healthAdvanced: null,
      sibsinAnalysis: data.sibsinAnalysis,
      healthAnalysis: data.healthAnalysis,
      crossAnalysis: data.crossAnalysis,
      currentFlow: data.currentFlow,
      chironInsight: data.chironInsight,
      luckyItems: data.luckyItems,
      normalizedElements, // 오행 균형 차트용
    } as unknown as TabData
  }, [data, saju, astro, lang, normalizedElements])

  if (!data) {
    return null
  }

  return (
    <div className={`mt-8 space-y-6 ${className}`}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 운명의 한 줄 요약 - 히어로 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <HeroSection isKo={isKo} data={data} destinyNarrative={destinyNarrative} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 탭 네비게이션 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-slate-700/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-200'
                  : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:text-gray-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 탭 컨텐츠 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'personality' && (
        <PersonalityTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
          combinedLifeTheme={combinedLifeTheme}
        />
      )}

      {activeTab === 'love' && (
        <LoveTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'career' && (
        <CareerTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'fortune' && (
        <FortuneTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'health' && (
        <HealthTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'karma' && (
        <KarmaTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'timing' && (
        <TimingTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'hidden' && (
        <HiddenSelfTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {/* 푸터 */}
      <p className="text-center text-xs text-gray-500 mt-6">
        {isKo ? '동양+서양 운세 시스템 통합 분석' : 'Eastern + Western fortune analysis combined'}
      </p>
    </div>
  )
})

export default FunInsights
