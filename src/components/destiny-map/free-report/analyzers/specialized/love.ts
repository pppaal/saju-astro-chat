/**
 * Love Timing Analysis
 * Specialized love timing analysis combining Saju and Astrology data
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine'
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core'
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet'
import type { WesternElement, ShinsalKind } from '@/lib/destiny-matrix/types'
import type { FiveElement } from '@/lib/saju/types'
import type { SajuData, AstroData } from '../../types'
import type { LoveTimingResult, ExtendedSajuData } from '../types/specialized.types'
import { LOVE_SHINSALS } from '../shared/constants'
import { extractShinsals } from '../shared/shinsalFilter'

// Helper functions
function mapSajuElementToKo(el: string): FiveElement {
  const map: Record<string, FiveElement> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  }
  return map[el] || '토'
}

function getWestElementFromSign(sign: string): WesternElement {
  const normalized = sign?.charAt(0).toUpperCase() + sign?.slice(1).toLowerCase()
  return SIGN_TO_ELEMENT[normalized] || 'earth'
}

/**
 * Analyze love timing using destiny matrix
 * Combines Saju love patterns with astrological love indicators
 */
export function getLoveTimingAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveTimingResult | null {
  const isKo = lang === 'ko'
  if (!saju && !astro) {
    return null
  }

  const extSaju = saju as ExtendedSajuData | undefined
  const dayElement = saju?.dayMaster?.element || 'wood'
  const sajuEl = mapSajuElementToKo(dayElement)

  // 1. 현재 연애운
  const currentYear = new Date().getFullYear()
  const yearEl = mapSajuElementToKo('wood') // 간단히 기본값 사용
  const yearInteraction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(yearEl)]
  const loveScore = yearInteraction?.score || 50

  const currentLuck = {
    icon: loveScore >= 70 ? '💖' : loveScore >= 50 ? '💕' : '💔',
    score: loveScore,
    message: {
      ko:
        loveScore >= 70
          ? '연애운이 매우 좋아요!'
          : loveScore >= 50
            ? '안정적인 연애 시기예요'
            : '내면 성장에 집중하세요',
      en:
        loveScore >= 70
          ? 'Excellent love luck!'
          : loveScore >= 50
            ? 'Stable love period'
            : 'Focus on inner growth',
    },
    timing: (loveScore >= 70 ? 'excellent' : loveScore >= 50 ? 'good' : 'neutral') as
      | 'excellent'
      | 'good'
      | 'neutral',
  }

  // 2. 금성 타이밍
  let venusTiming: LoveTimingResult['venusTiming'] = null
  if (astro?.planets && Array.isArray(astro.planets)) {
    const venus = astro.planets.find((p) => p.name?.toLowerCase() === 'venus')
    if (venus?.sign) {
      const venusEl = getWestElementFromSign(venus.sign)
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[venusEl]
      if (interaction) {
        venusTiming = {
          sign: venus.sign,
          element: venusEl,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: interaction.keyword, en: interaction.keywordEn },
          },
          loveStyle: {
            ko: `${venus.sign} 금성 - 당신의 사랑 스타일`,
            en: `Venus in ${venus.sign} - Your love style`,
          },
        }
      }
    }
  }

  // 3. 신살 연애 타이밍 (L8)
  const shinsalLoveTiming: LoveTimingResult['shinsalLoveTiming'] = []
  const shinsalList = extractShinsals(extSaju, LOVE_SHINSALS)

  for (const shinsal of shinsalList.slice(0, 3)) {
    const venusData = SHINSAL_PLANET_MATRIX[shinsal as ShinsalKind]?.['Venus']
    if (venusData) {
      shinsalLoveTiming.push({
        shinsal,
        planet: 'Venus',
        fusion: {
          level: venusData.level,
          score: venusData.score,
          icon: venusData.icon,
          color: getInteractionColor(venusData.level),
          keyword: { ko: venusData.keyword, en: venusData.keywordEn },
          description: { ko: venusData.keyword, en: venusData.keywordEn },
        },
        timing: {
          ko: `${shinsal}이 연애운에 영향을 줍니다`,
          en: `${shinsal} affects love timing`,
        },
      })
    }
  }

  // 4. 행운의 시기
  const luckyPeriods: LoveTimingResult['luckyPeriods'] = []
  const daeunList = extSaju?.daeun || []
  const currentDaeun = daeunList.find((d) => d.current || d.isCurrent)

  if (currentDaeun?.element) {
    const daeunEl = mapSajuElementToKo(currentDaeun.element)
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)]
    if (interaction && interaction.score >= 60) {
      luckyPeriods.push({
        period: `${currentDaeun.startAge || currentYear}세~`,
        icon: '💫',
        strength: interaction.score >= 70 ? 'strong' : 'moderate',
        score: interaction.score,
        description: {
          ko: `${daeunEl} 대운 - 좋은 연애 시기`,
          en: `${daeunEl} Daeun - Good love period`,
        },
        goodFor: isKo ? ['새로운 만남', '관계 발전'] : ['New meetings', 'Relationship growth'],
      })
    }
  }

  return {
    loveScore,
    currentLuck,
    venusTiming,
    shinsalLoveTiming,
    luckyPeriods,
  }
}
