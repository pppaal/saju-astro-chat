'use client'

import { useMemo, useState, memo } from 'react'
import { repairMojibakeDeep } from '@/lib/text/mojibake'
import { expandNarrativeDeep } from './free-report/tabs/shared/longForm'
import PremiumNarrativeCard from '@/components/reports/PremiumNarrativeCard'

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
} from './free-report/tabs'
import type { TabData } from './free-report/types'

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
} from './free-report/data'

// Import helper utilities
import { findPlanetSign } from './free-report/utils'

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
} from './free-report/analyzers'

// Import astrology insights
import { getChironInsight } from './free-report/astrology'

// Import generators
import { getRecommendedDates, getLuckyItems, getCombinedLifeTheme } from './free-report/generators'

// Import report generator
import { generateReport } from './free-report/generators/reportGenerator'

// Import HeroSection component
import HeroSection from './free-report/HeroSection'

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
  /** 통합 엔진 슬라이스 (unifiedAdapter.getUnifiedSlice() 결과) — 옵션 */
  unified?: import('./free-report/analyzers/unifiedAdapter').UnifiedSlice | null
}

// ============================================================
// 메인 컴포넌트
// ============================================================

const FreeReport = memo(function FreeReport({
  saju,
  astro,
  lang = 'ko',
  theme = '',
  className = '',
  unified,
}: Props) {
  // unified is now available for tabs that opt-in to use it
  const isKo = lang === 'ko'

  const normalizedSaju = useMemo(
    () => (saju ? (repairMojibakeDeep(saju) as SajuData) : saju),
    [saju]
  )
  const normalizedAstro = useMemo(
    () => (astro ? (repairMojibakeDeep(astro) as AstroData) : astro),
    [astro]
  )

  const hasFiveElements = Boolean(
    normalizedSaju?.fiveElements && Object.keys(normalizedSaju.fiveElements).length > 0
  )
  const hasSajuCore = Boolean(
    normalizedSaju?.dayMaster || normalizedSaju?.pillars || hasFiveElements
  )
  const hasValidAstro = Boolean(findPlanetSign(normalizedAstro, 'sun'))

  const data = useMemo(() => {
    if (!hasSajuCore && !hasValidAstro) {
      return null
    }

    const rawDayMasterName =
      normalizedSaju?.dayMaster?.name || normalizedSaju?.dayMaster?.heavenlyStem || '갑'
    const dayMasterName = tianGanMap[rawDayMasterName] || rawDayMasterName
    const dayMasterInfo = dayMasterData[dayMasterName] || dayMasterData['갑']
    const dayElement = dayMasterInfo.element

    const fiveElements = normalizedSaju?.fiveElements || {
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20,
    }
    const sorted = Object.entries(fiveElements).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )

    const sunSign = findPlanetSign(normalizedAstro, 'sun')
    const moonSign = findPlanetSign(normalizedAstro, 'moon')
    const ascSign = normalizedAstro?.ascendant?.sign?.toLowerCase() || null

    const generated = {
      dayMasterName,
      dayMasterInfo,
      dayElement,
      fiveElements,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      sunSign,
      moonSign,
      ascSign,
      crossAnalysis: getCrossAnalysis(normalizedSaju, normalizedAstro, lang || 'ko'),
      dates: getRecommendedDates(normalizedSaju, normalizedAstro, lang || 'ko'),
      luckyItems: getLuckyItems(normalizedSaju, lang || 'ko'),
      sibsinAnalysis: getSibsinAnalysis(normalizedSaju, lang || 'ko'),
      healthAnalysis: getHealthAnalysis(normalizedSaju, lang || 'ko'),
      report: generateReport(normalizedSaju, normalizedAstro, lang || 'ko', theme || 'overall'),
      // 🔥 새로운 고급 분석 추가
      chironInsight: getChironInsight(normalizedAstro, lang || 'ko'),
      currentFlow: getCurrentFlowAnalysis(normalizedSaju, lang || 'ko'),
    }
    return repairMojibakeDeep(generated)
  }, [normalizedSaju, normalizedAstro, lang, theme, hasSajuCore, hasValidAstro])

  // 운명 서사 생성 - 외부 상수 사용으로 대폭 간소화
  const destinyNarrative = useMemo(() => {
    if (!data) {
      return null
    }

    const dayEl = data.dayElement
    const strongEl = data.strongest[0]

    return expandNarrativeDeep(
      repairMojibakeDeep({
        lifeTheme: LIFE_THEMES[data.dayMasterName] || LIFE_THEMES['갑'],
        emotionPattern: EMOTION_PATTERNS[strongEl],
        relationshipStyle: RELATIONSHIP_STYLES[dayEl],
        careerDestiny: CAREER_DESTINIES[strongEl],
      }),
      { isKo, topic: 'personality', minSentences: 4 }
    )
  }, [data, isKo])

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
    return getCombinedLifeTheme(normalizedSaju, lang || 'ko')
  }, [normalizedSaju, lang])

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
    return expandNarrativeDeep(
      repairMojibakeDeep({
        dayMasterName: data.dayMasterName,
        dayMasterInfo: data.dayMasterInfo,
        dayElement: data.dayElement,
        fiveElements: data.fiveElements,
        strongest: data.strongest,
        weakest: data.weakest,
        sunSign: data.sunSign,
        moonSign: data.moonSign,
        ascSign: data.ascSign,
        personalityAnalysis: getPersonalityAnalysis(normalizedSaju, normalizedAstro, lang),
        loveAnalysis: getLoveAnalysis(normalizedSaju, normalizedAstro, lang),
        careerAnalysis: getCareerAnalysis(normalizedSaju, normalizedAstro, lang),
        karmaAnalysis: getKarmaAnalysis(normalizedSaju, normalizedAstro, lang),
        healthAdvanced: null,
        sibsinAnalysis: data.sibsinAnalysis,
        healthAnalysis: data.healthAnalysis,
        crossAnalysis: data.crossAnalysis,
        currentFlow: data.currentFlow,
        chironInsight: data.chironInsight,
        luckyItems: data.luckyItems,
        normalizedElements, // 오행 균형 차트용
        // 통합 엔진 슬라이스 — 탭이 opt-in 으로 사용 가능
        unified,
      }),
      { isKo, topic: 'general', minSentences: 4 }
    ) as unknown as TabData
  }, [data, normalizedSaju, normalizedAstro, lang, normalizedElements, isKo])

  const premiumStyleReport = useMemo(() => {
    const raw = String(data?.report || '').trim()
    if (!raw) return null
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const firstLine = lines[0] || ''
    const body = lines.slice(1).join('\n\n').trim()
    const titleFromBracket =
      firstLine.match(/^【(.+)】$/)?.[1] || firstLine.match(/^\[(.+)\]$/)?.[1] || ''

    return {
      title: titleFromBracket || (isKo ? 'AI 프리미엄 리포트' : 'AI Premium Report'),
      content: body || raw,
    }
  }, [data?.report, isKo])

  if (!data) {
    return null
  }

  return (
    <div
      className={`mt-8 space-y-6 [&_p]:text-[1.02rem] md:[&_p]:text-[1.06rem] [&_li]:text-[1.02rem] md:[&_li]:text-[1.06rem] ${className}`}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 운명의 한 줄 요약 - 히어로 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <HeroSection isKo={isKo} data={data} destinyNarrative={destinyNarrative} />

      {premiumStyleReport && (
        <PremiumNarrativeCard
          title={premiumStyleReport.title}
          content={premiumStyleReport.content}
          defaultOpen
        />
      )}

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
              <span className="text-base font-semibold md:text-[1.05rem]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 탭 컨텐츠 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'personality' && (
        <PersonalityTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
          combinedLifeTheme={combinedLifeTheme}
        />
      )}

      {activeTab === 'love' && (
        <LoveTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'career' && (
        <CareerTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'fortune' && (
        <FortuneTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'health' && (
        <HealthTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'karma' && (
        <KarmaTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'timing' && (
        <TimingTab
          saju={normalizedSaju}
          astro={normalizedAstro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'hidden' && (
        <HiddenSelfTab
          saju={normalizedSaju}
          astro={normalizedAstro}
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

export default FreeReport
