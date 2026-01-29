'use client'

import { useState, useMemo } from 'react'
import type { CompatibilityData, TabId } from './types'
import type { SajuProfile, AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility'
import { logger } from '@/lib/logger'
import {
  OverviewTab,
  ChemistryTab,
  HarmonyTab,
  SynastryTab,
  DeepSajuTab,
  DeepAstroTab,
  FutureTab,
  FusionTab,
} from './tabs'

// Import advanced analysis functions
import {
  performComprehensiveSajuAnalysis,
  analyzeTenGods,
  analyzeShinsals,
  analyzeHap,
  analyzeConflicts,
  analyzeYongsinCompatibility,
  analyzeSeunCompatibility,
  analyzeGongmang,
  analyzeGanHap,
  analyzeGyeokguk,
  analyzeTwelveStates,
} from '@/lib/compatibility/advancedSajuAnalysis'

import {
  analyzeAspects,
  analyzeSynastry,
  analyzeCompositeChart,
  analyzeHouseOverlays,
  analyzeMercuryAspects,
  analyzeJupiterAspects,
  analyzeSaturnAspects,
  analyzeOuterPlanets,
  analyzeNodes,
} from '@/lib/compatibility/advancedAstrologyAnalysis'

// Import cross-system analysis (Saju × Astrology fusion)
import { performCrossSystemAnalysis } from '@/lib/compatibility/crossSystemAnalysis'

interface Props {
  persons: Array<{
    name: string
    date: string
    time: string
    city: string
    relation?: string
  }>
  person1Saju?: SajuRawData
  person2Saju?: SajuRawData
  person1Astro?: AstroRawData
  person2Astro?: AstroRawData
  lang?: string
  className?: string
}

interface SajuRawData {
  dayMaster?: { name?: string; heavenlyStem?: string; element?: string }
  pillars?: {
    year?: { heavenlyStem?: string; earthlyBranch?: string }
    month?: { heavenlyStem?: string; earthlyBranch?: string }
    day?: { heavenlyStem?: string; earthlyBranch?: string }
    time?: { heavenlyStem?: string; earthlyBranch?: string }
  }
  yearPillar?: { heavenlyStem?: string; earthlyBranch?: string }
  monthPillar?: { heavenlyStem?: string; earthlyBranch?: string }
  dayPillar?: { heavenlyStem?: string; earthlyBranch?: string }
  timePillar?: { heavenlyStem?: string; earthlyBranch?: string }
  fiveElements?: Record<string, number>
  elements?: Record<string, number>
  [key: string]: unknown
}

interface AstroRawData {
  planets?: Array<{ name?: string; sign?: string }> | Record<string, { sign?: string }>
  ascendant?: { sign?: string }
  [key: string]: unknown
}

export default function CompatibilityFunInsights({
  persons,
  person1Saju,
  person2Saju,
  person1Astro,
  person2Astro,
  lang = 'ko',
  className = '',
}: Props) {
  const isKo = lang === 'ko'
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Perform advanced analysis
  const analysisData = useMemo(() => {
    // Build Saju profiles from raw data
    const buildSajuProfile = (saju: SajuRawData | null | undefined): SajuProfile | null => {
      if (!saju) {
        return null
      }

      const dayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || '갑'
      const dayMasterElement = saju?.dayMaster?.element || 'wood'

      return {
        dayMaster: {
          name: dayMasterName,
          element: dayMasterElement,
        },
        pillars: {
          year: {
            stem: saju?.pillars?.year?.heavenlyStem || saju?.yearPillar?.heavenlyStem || '甲',
            branch: saju?.pillars?.year?.earthlyBranch || saju?.yearPillar?.earthlyBranch || '子',
          },
          month: {
            stem: saju?.pillars?.month?.heavenlyStem || saju?.monthPillar?.heavenlyStem || '甲',
            branch: saju?.pillars?.month?.earthlyBranch || saju?.monthPillar?.earthlyBranch || '子',
          },
          day: {
            stem: saju?.pillars?.day?.heavenlyStem || saju?.dayPillar?.heavenlyStem || '甲',
            branch: saju?.pillars?.day?.earthlyBranch || saju?.dayPillar?.earthlyBranch || '子',
          },
          time: {
            stem: saju?.pillars?.time?.heavenlyStem || saju?.timePillar?.heavenlyStem || '甲',
            branch: saju?.pillars?.time?.earthlyBranch || saju?.timePillar?.earthlyBranch || '子',
          },
        },
        elements: saju?.fiveElements ||
          saju?.elements || {
            wood: 20,
            fire: 20,
            earth: 20,
            metal: 20,
            water: 20,
          },
      }
    }

    // Build Astrology profiles from raw data
    const buildAstroProfile = (astro: AstroRawData | null | undefined): AstrologyProfile | null => {
      if (!astro) {
        return null
      }

      const getSignData = (source: AstroRawData, planetName: string) => {
        // Try multiple sources
        if (Array.isArray(source?.planets)) {
          const planet = source.planets.find(
            (p) => p.name?.toLowerCase() === planetName.toLowerCase()
          )
          if (planet?.sign) {
            return {
              sign: planet.sign.toLowerCase(),
              element: getElementFromSign(planet.sign.toLowerCase()),
            }
          }
        }

        // Object-based planets
        const planetsObj = source?.planets as Record<string, { sign?: string }> | undefined
        if (planetsObj && !Array.isArray(planetsObj) && planetsObj[planetName]) {
          const sign = planetsObj[planetName].sign?.toLowerCase()
          return { sign: sign || 'aries', element: getElementFromSign(sign || 'aries') }
        }

        // Direct access
        const directAccess = source as Record<string, { sign?: string }>
        if (directAccess?.[planetName]?.sign) {
          const sign = directAccess[planetName].sign!.toLowerCase()
          return { sign, element: getElementFromSign(sign) }
        }

        return { sign: 'aries', element: 'fire' }
      }

      return {
        sun: getSignData(astro, 'sun'),
        moon: getSignData(astro, 'moon'),
        venus: getSignData(astro, 'venus'),
        mars: getSignData(astro, 'mars'),
        mercury: getSignData(astro, 'mercury'),
        jupiter: getSignData(astro, 'jupiter'),
        saturn: getSignData(astro, 'saturn'),
        uranus: getSignData(astro, 'uranus'),
        neptune: getSignData(astro, 'neptune'),
        pluto: getSignData(astro, 'pluto'),
        northNode: getSignData(astro, 'northNode'),
        southNode: getSignData(astro, 'southNode'),
        ascendant: astro?.ascendant?.sign
          ? {
              sign: astro.ascendant.sign.toLowerCase(),
              element: getElementFromSign(astro.ascendant.sign.toLowerCase()),
            }
          : undefined,
      }
    }

    const p1Saju = buildSajuProfile(person1Saju)
    const p2Saju = buildSajuProfile(person2Saju)
    const p1Astro = buildAstroProfile(person1Astro)
    const p2Astro = buildAstroProfile(person2Astro)

    // Perform analyses with safe fallbacks
    let sajuAnalysis = undefined
    let tenGods = undefined
    let shinsals = undefined
    let harmonies = undefined
    let conflicts = undefined
    let yongsin = undefined
    let seun = undefined
    let gongmang = undefined
    let ganHap = undefined
    let gyeokguk = undefined
    let twelveStates = undefined
    let aspects = undefined
    let synastry = undefined
    let compositeChart = undefined
    let houseOverlays = undefined
    let mercuryAspects = undefined
    let jupiterAspects = undefined
    let saturnAspects = undefined
    let outerPlanets = undefined
    let nodes = undefined

    // Get current year for Seun analysis
    const currentYear = new Date().getFullYear()

    try {
      if (p1Saju && p2Saju) {
        const s1: SajuProfile = p1Saju
        const s2: SajuProfile = p2Saju
        sajuAnalysis = performComprehensiveSajuAnalysis(s1, s2)
        tenGods = analyzeTenGods(s1, s2)
        shinsals = analyzeShinsals(s1, s2)
        harmonies = analyzeHap(s1, s2)
        conflicts = analyzeConflicts(s1, s2)
        yongsin = analyzeYongsinCompatibility(s1, s2)
        seun = analyzeSeunCompatibility(s1, s2, currentYear)
        gongmang = analyzeGongmang(s1, s2)
        ganHap = analyzeGanHap(s1, s2)
        gyeokguk = analyzeGyeokguk(s1, s2)
        twelveStates = analyzeTwelveStates(s1, s2)
      }
    } catch (e) {
      logger.error('Saju analysis error:', { error: e })
    }

    try {
      if (p1Astro && p2Astro) {
        aspects = analyzeAspects(p1Astro, p2Astro)
        synastry = analyzeSynastry(p1Astro, p2Astro)
        compositeChart = analyzeCompositeChart(p1Astro, p2Astro)
        houseOverlays = analyzeHouseOverlays(p1Astro, p2Astro)

        // Extended astrology analysis (needs more planet data)
        if (p1Astro.mercury && p2Astro.mercury) {
          mercuryAspects = analyzeMercuryAspects(
            p1Astro.mercury,
            p2Astro.mercury,
            p1Astro.sun,
            p2Astro.sun
          )
        }
        if (p1Astro.jupiter && p2Astro.jupiter) {
          jupiterAspects = analyzeJupiterAspects(
            p1Astro.jupiter,
            p2Astro.jupiter,
            p1Astro.sun,
            p2Astro.sun
          )
        }
        if (p1Astro.saturn && p2Astro.saturn) {
          saturnAspects = analyzeSaturnAspects(
            p1Astro.saturn,
            p2Astro.saturn,
            p1Astro.sun,
            p2Astro.sun,
            p1Astro.moon,
            p2Astro.moon
          )
        }
        if (p1Astro.uranus || p1Astro.neptune || p1Astro.pluto) {
          outerPlanets = analyzeOuterPlanets(
            { uranus: p1Astro.uranus, neptune: p1Astro.neptune, pluto: p1Astro.pluto },
            { uranus: p2Astro.uranus, neptune: p2Astro.neptune, pluto: p2Astro.pluto },
            p1Astro.sun,
            p2Astro.sun
          )
        }
        if (p1Astro.northNode && p2Astro.northNode) {
          nodes = analyzeNodes(
            p1Astro.northNode,
            p1Astro.southNode,
            p2Astro.northNode,
            p2Astro.southNode,
            p1Astro.sun,
            p2Astro.sun,
            p1Astro.moon,
            p2Astro.moon
          )
        }
      }
    } catch (e) {
      logger.error('Astrology analysis error:', { error: e })
    }

    // Cross-System Analysis (Saju × Astrology Fusion)
    let crossSystemAnalysis = undefined
    try {
      if (p1Saju && p2Saju && p1Astro && p2Astro) {
        crossSystemAnalysis = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro)
      }
    } catch (e) {
      logger.error('Cross-system analysis error:', { error: e })
    }

    // Calculate overall scores (now including cross-system score)
    const sajuScore = sajuAnalysis?.overallScore || 65
    const astroScore = synastry?.compatibilityIndex || 65
    const crossScore = crossSystemAnalysis?.crossSystemScore || 65
    // Weighted average: Saju 35%, Astrology 35%, Cross-System Fusion 30%
    const overallScore = Math.round(sajuScore * 0.35 + astroScore * 0.35 + crossScore * 0.3)

    return {
      persons,
      person1Saju: p1Saju,
      person2Saju: p2Saju,
      person1Astro: p1Astro,
      person2Astro: p2Astro,
      // Basic Saju
      sajuAnalysis,
      tenGods,
      shinsals,
      harmonies,
      conflicts,
      // Extended Saju
      yongsin,
      seun,
      gongmang,
      ganHap,
      gyeokguk,
      twelveStates,
      // Basic Astrology
      aspects,
      synastry,
      compositeChart,
      // Extended Astrology
      houseOverlays,
      mercuryAspects,
      jupiterAspects,
      saturnAspects,
      outerPlanets,
      nodes,
      // Cross-System Fusion
      crossSystemAnalysis,
      // Scores
      overallScore,
      sajuScore,
      astroScore,
      crossScore,
    }
  }, [persons, person1Saju, person2Saju, person1Astro, person2Astro])

  // Tab definitions
  const tabs: { id: TabId; label: string; emoji: string }[] = [
    { id: 'overview', label: isKo ? '개요' : 'Overview', emoji: '💫' },
    { id: 'chemistry', label: isKo ? '케미' : 'Chemistry', emoji: '💞' },
    { id: 'harmony', label: isKo ? '합/충' : 'Harmony', emoji: '☯️' },
    { id: 'fusion', label: isKo ? '동서융합' : 'Fusion', emoji: '🔮' },
    { id: 'synastry', label: isKo ? '점성' : 'Synastry', emoji: '✨' },
    { id: 'deepSaju', label: isKo ? '심화사주' : 'Deep Saju', emoji: '🏛️' },
    { id: 'deepAstro', label: isKo ? '심화점성' : 'Deep Astro', emoji: '🌌' },
    { id: 'future', label: isKo ? '미래' : 'Future', emoji: '🔮' },
  ]

  return (
    <div className={`mt-8 space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-slate-700/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-pink-500/30 border border-pink-500/50 text-pink-200'
                  : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:text-gray-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'chemistry' && <ChemistryTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'harmony' && <HarmonyTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'fusion' && <FusionTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'synastry' && <SynastryTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'deepSaju' && <DeepSajuTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'deepAstro' && <DeepAstroTab data={analysisData} isKo={isKo} lang={lang} />}

      {activeTab === 'future' && <FutureTab data={analysisData} isKo={isKo} lang={lang} />}

      {/* Footer */}
      <p className="text-center text-xs text-gray-500 mt-6">
        {isKo ? '사주 + 점성학 심화 궁합 분석' : 'Advanced Saju + Astrology Compatibility Analysis'}
      </p>
    </div>
  )
}

// Helper function to get element from zodiac sign
function getElementFromSign(sign: string): string {
  const elementMap: Record<string, string> = {
    aries: 'fire',
    leo: 'fire',
    sagittarius: 'fire',
    taurus: 'earth',
    virgo: 'earth',
    capricorn: 'earth',
    gemini: 'air',
    libra: 'air',
    aquarius: 'air',
    cancer: 'water',
    scorpio: 'water',
    pisces: 'water',
  }
  return elementMap[sign.toLowerCase()] || 'fire'
}
