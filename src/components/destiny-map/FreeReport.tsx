'use client'

import { useMemo, useState, memo } from 'react'
import { Sparkles } from 'lucide-react'
import { repairMojibakeDeep } from '@/lib/text/mojibake'
import { expandNarrativeDeep } from './free-report/tabs/shared/longForm'
import PremiumNarrativeCard from '@/components/reports/PremiumNarrativeCard'
import { runMainSaju } from '@/lib/saju/main'
import { buildExtendedAnalysisFromMain } from '@/lib/saju/extendedAnalysis'
import ExtendedAnalysisSection from '@/components/reports/ExtendedAnalysisSection'

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
import AdvancedAstroInsights from './free-report/AdvancedAstroInsights'
import ChartSynthesisCard from './free-report/ChartSynthesisCard'
import AstroThemedCards from './free-report/AstroThemedCards'
import AstroLifecycleTimeline from './free-report/AstroLifecycleTimeline'
import { synthesizeChart } from '@/lib/astrology/foundation/synthesis'
import { buildThemedAstroReading } from '@/lib/astrology/foundation/themedReading'
import { buildLifecycleTiming } from '@/lib/astrology/foundation/lifecycleTiming'

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

interface FusionFragmentItem {
  id: string
  meaning: string
  narrative: string
  intensity: string
}
export interface FusionFragments {
  generatedAt?: string
  byDomain?: Partial<
    Record<
      'self' | 'love' | 'money' | 'career' | 'health' | 'family',
      {
        tone: string
        confirms: FusionFragmentItem[]
        conflicts: FusionFragmentItem[]
      }
    >
  >
  themes?: Array<{ id: string; meaning: string; narrative: string }>
}

interface Props {
  saju?: SajuData
  astro?: AstroData
  lang?: string
  theme?: string
  className?: string
  /** Birth info threaded through for client-side ExtendedAnalysis. */
  birthInfo?: {
    birthDate?: string
    birthTime?: string
    gender?: string
    timezone?: string
  }
  /**
   * Rule-matched narrative fragments from the fusion engine (see
   * /api/destiny-map → fusionFragments). Pure DB-text composition,
   * no LLM call. When present, surfaced as the "사주×점성 룰 매칭"
   * section near the bottom of the report.
   */
  fusionFragments?: FusionFragments | null
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
  birthInfo,
  fusionFragments,
}: Props) {
  const isKo = lang === 'ko'

  // Compute the deterministic ExtendedAnalysis bundle (life stages × 5,
  // decisive timings × 7, relationships, practical info, karmic) on the
  // client. Same engine as the premium report — only the AI-written
  // sections are gated.
  const extendedAnalysis = useMemo(() => {
    if (!birthInfo?.birthDate) return null
    try {
      const gender = String(birthInfo.gender || '')
        .toLowerCase()
        .startsWith('f')
        ? 'female'
        : 'male'
      const main = runMainSaju({
        birthDate: birthInfo.birthDate,
        birthTime: birthInfo.birthTime || '12:00',
        gender,
        timezone: birthInfo.timezone || 'Asia/Seoul',
      })
      const koreanAge = new Date().getFullYear() - parseInt(birthInfo.birthDate.slice(0, 4), 10) + 1
      return buildExtendedAnalysisFromMain(main, { koreanAge })
    } catch {
      return null
    }
  }, [birthInfo?.birthDate, birthInfo?.birthTime, birthInfo?.gender, birthInfo?.timezone])

  const normalizedSaju = useMemo(
    () => (saju ? (repairMojibakeDeep(saju) as SajuData) : saju),
    [saju]
  )
  const normalizedAstro = useMemo(
    () => (astro ? (repairMojibakeDeep(astro) as AstroData) : astro),
    [astro]
  )

  // Western chart synthesis (element/modality balance, chart shape,
  // aspect patterns, dominant planet) — derived directly from the
  // already-loaded astro snapshot. Western counterpart to saju's
  // comprehensiveReport.
  const chartSynthesis = useMemo(() => {
    if (!normalizedAstro?.planets || normalizedAstro.planets.length === 0) return null
    try {
      return synthesizeChart(normalizedAstro as unknown as Parameters<typeof synthesizeChart>[0])
    } catch {
      return null
    }
  }, [normalizedAstro])

  // Themed astro reading (love/career/wealth/health/family/spirituality).
  const astroThemed = useMemo(() => {
    if (!normalizedAstro?.planets || normalizedAstro.planets.length === 0) return null
    try {
      return buildThemedAstroReading(
        normalizedAstro as unknown as Parameters<typeof buildThemedAstroReading>[0]
      )
    } catch {
      return null
    }
  }, [normalizedAstro])

  // Lifecycle timing — Saturn return / Jupiter cycle / Uranus opposition / etc.
  const astroLifecycle = useMemo(() => {
    if (!birthInfo?.birthDate) return null
    try {
      const birthYear = parseInt(birthInfo.birthDate.slice(0, 4), 10)
      if (!Number.isFinite(birthYear)) return null
      return buildLifecycleTiming(birthYear)
    } catch {
      return null
    }
  }, [birthInfo?.birthDate])

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
    // bracket prefix like [인생 전반 Focus Report] is just a marker the
    // generator emits; strip it from body and force a clean unified title.
    const hasBracketPrefix = /^【.+】$|^\[.+\]$/.test(firstLine)
    const body = (hasBracketPrefix ? lines.slice(1) : lines).join('\n\n').trim()

    return {
      title: isKo ? '무료 리포트' : 'Free Report',
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

      {/* 🎁 무료 ExtendedAnalysis — 30+ deterministic 섹션 (인생 시기 5
          단계 / 결정적 시기 7개 / 관계운 5영역 / 실용 정보 / 카르마)
          프리미엄 리포트와 동일한 결정론 엔진을 무료에도 풀어줌. AI가
          작성하는 14 섹션만 프리미엄에서 잠금. */}
      {extendedAnalysis && (
        <>
          <div className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent p-4 sm:p-5 mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-fuchsia-300" />
              <h3 className="text-sm font-bold text-white">결정론 사주 분석</h3>
            </div>
            <p className="text-xs text-slate-300/80 leading-snug">
              사주 8자에서 직접 도출한 30+ 섹션입니다 — 인생 시기, 결정적 타이밍, 관계운, 카르마
              유형까지 무료로 풀어드립니다.
            </p>
          </div>
          <div className="-mx-4 sm:-mx-0">
            <ExtendedAnalysisSection analysis={extendedAnalysis} />
          </div>

          {/* Chart synthesis — Sun×Moon×ASC + element/modality/hemisphere
              balance + chart shape + aspect patterns. Saju side has
              comprehensiveReport / advancedAnalysis; this is the
              western counterpart so the astro depth matches. */}
          {chartSynthesis && <ChartSynthesisCard synth={chartSynthesis} />}

          {/* 점성 테마별 해석 (사주 extendedAnalysis.relationships에 대응) */}
          {astroThemed && <AstroThemedCards data={astroThemed} />}

          {/* 점성 생애 사이클 타이밍 (사주 extendedAnalysis.decisiveTimings에 대응) */}
          {astroLifecycle && <AstroLifecycleTimeline data={astroLifecycle} />}

          {/* 9 advanced astro insights — Chiron / Asteroids / Fixed Stars
              / Lilith / Vertex / POF / Eclipses / Harmonics / Draconic.
              All were already implemented but only Chiron rendered;
              the other 8 were orphaned. Now all surfaced as cards. */}
          <AdvancedAstroInsights astro={normalizedAstro} lang={lang} className="-mx-4 sm:-mx-0" />

          {/* 사주×점성 룰 매칭 — fusion 엔진이 (saju predicate AND
              astro predicate) 매칭된 룰의 narrative fragment를 도메인별로
              모아 보여줌. 같은 사주는 같은 fragment. LLM 호출 없음. */}
          {fusionFragments && <FusionFragmentsSection fragments={fusionFragments} isKo={isKo} />}
        </>
      )}

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

// ============================================================
// Fusion fragments — DB-text composition section
// ============================================================

const DOMAIN_LABELS_KO: Record<string, { label: string; icon: string }> = {
  self: { label: '자기·정체성', icon: '🌟' },
  love: { label: '사랑·관계', icon: '💕' },
  money: { label: '재물', icon: '💰' },
  career: { label: '커리어', icon: '💼' },
  health: { label: '건강', icon: '💪' },
  family: { label: '가족', icon: '👪' },
}
const DOMAIN_LABELS_EN: Record<string, { label: string; icon: string }> = {
  self: { label: 'Self', icon: '🌟' },
  love: { label: 'Love', icon: '💕' },
  money: { label: 'Money', icon: '💰' },
  career: { label: 'Career', icon: '💼' },
  health: { label: 'Health', icon: '💪' },
  family: { label: 'Family', icon: '👪' },
}

function FusionFragmentsSection({
  fragments,
  isKo,
}: {
  fragments: NonNullable<Props['fusionFragments']>
  isKo: boolean
}) {
  const labels = isKo ? DOMAIN_LABELS_KO : DOMAIN_LABELS_EN
  const byDomain = fragments.byDomain || {}
  const domainEntries = (
    Object.entries(byDomain) as Array<
      [string, { tone: string; confirms: { id: string; meaning: string; narrative: string; intensity: string }[]; conflicts: { id: string; meaning: string; narrative: string; intensity: string }[] }]
    >
  ).filter(([, agg]) => agg.confirms.length > 0 || agg.conflicts.length > 0)
  const themes = fragments.themes || []
  if (domainEntries.length === 0 && themes.length === 0) return null

  return (
    <div className="rounded-3xl border border-cyan-300/20 bg-slate-900/50 p-6 mt-6">
      <h3 className="text-base font-bold text-white mb-1">
        {isKo ? '🔗 사주×점성 룰 매칭' : '🔗 Saju × Astrology rule matches'}
      </h3>
      <p className="text-xs text-slate-400 mb-5">
        {isKo
          ? '사주 패턴과 점성 패턴이 동시에 매칭된 영역의 룰 fragment입니다. 동일 사주는 동일 fragment.'
          : 'Rule fragments where both saju and astrology predicates fire. Same chart, same fragments.'}
      </p>

      <div className="space-y-5">
        {domainEntries.map(([domain, agg]) => {
          const meta = labels[domain] ?? { label: domain, icon: '·' }
          return (
            <article key={domain} className="rounded-2xl border border-white/10 bg-[#0a1224]/70 p-4">
              <header className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-semibold text-white">
                  <span className="mr-1" aria-hidden>{meta.icon}</span>
                  {meta.label}
                </p>
                <span className="text-[11px] uppercase tracking-[0.14em] text-cyan-200/80">
                  {agg.tone}
                </span>
              </header>
              {agg.confirms.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {agg.confirms.slice(0, 5).map((m) => (
                    <li key={m.id} className="text-[13px] leading-[1.7] text-slate-200">
                      <span className="text-cyan-200 mr-1.5">+</span>
                      <span className="font-medium">{m.meaning}</span>
                      <span className="text-slate-400"> — {m.narrative}</span>
                    </li>
                  ))}
                </ul>
              )}
              {agg.conflicts.length > 0 && (
                <ul className="space-y-2">
                  {agg.conflicts.slice(0, 3).map((m) => (
                    <li key={m.id} className="text-[13px] leading-[1.7] text-slate-200">
                      <span className="text-rose-200 mr-1.5">!</span>
                      <span className="font-medium">{m.meaning}</span>
                      <span className="text-slate-400"> — {m.narrative}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}

        {themes.length > 0 && (
          <article className="rounded-2xl border border-amber-300/20 bg-[#1a1408]/40 p-4">
            <p className="text-sm font-semibold text-amber-100 mb-3">
              {isKo ? '✨ 교차 테마 (도메인 결합)' : '✨ Cross-domain themes'}
            </p>
            <ul className="space-y-2">
              {themes.slice(0, 5).map((t) => (
                <li key={t.id} className="text-[13px] leading-[1.7] text-amber-50/90">
                  <span className="font-medium">{t.meaning}</span>
                  <span className="text-amber-100/70"> — {t.narrative}</span>
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </div>
  )
}

export default FreeReport
