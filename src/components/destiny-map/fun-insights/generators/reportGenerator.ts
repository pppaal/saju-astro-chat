import { elementTraits, dayMasterData, zodiacData, tianGanMap } from '../data'
import { findPlanetSign } from '../utils'

interface SajuData {
  dayMaster?: { name?: string; heavenlyStem?: string; element?: string }
  fiveElements?: Record<string, number>
  [key: string]: unknown
}

interface AstroData {
  planets?: Array<{ name?: string; sign?: string; house?: number; longitude?: number }>
  [key: string]: unknown
}

const reportCache = new Map<string, string>()

export function generateReport(
  saju: unknown,
  astro: unknown,
  lang: string,
  _theme: string
): string {
  const sajuData = saju as SajuData | undefined
  const astroData = astro as AstroData | undefined

  const cacheKey = JSON.stringify({
    dayMaster: sajuData?.dayMaster?.name,
    fiveElements: sajuData?.fiveElements,
    sun: findPlanetSign(astroData, 'sun'),
    moon: findPlanetSign(astroData, 'moon'),
    lang,
  })

  if (reportCache.has(cacheKey)) {
    return reportCache.get(cacheKey)!
  }

  const isKo = lang === 'ko'

  const rawDayMasterName = sajuData?.dayMaster?.name || sajuData?.dayMaster?.heavenlyStem
  const dayMasterName = rawDayMasterName ? tianGanMap[rawDayMasterName] || rawDayMasterName : null
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null
  const dayElement = dayMasterInfo?.element

  const sunSign = findPlanetSign(astroData, 'sun')
  const moonSign = findPlanetSign(astroData, 'moon')
  const sunData = sunSign ? zodiacData[sunSign] : null
  const moonData = moonSign ? zodiacData[moonSign] : null

  const fiveElements = sajuData?.fiveElements || {}
  const sorted = Object.entries(fiveElements).sort(([, a], [, b]) => (b as number) - (a as number))
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  if (!dayMasterInfo) {
    return isKo ? '사주 데이터를 분석 중입니다...' : 'Analyzing Saju data...'
  }

  const report = isKo
    ? `【동양 × 서양 운세 융합 분석】

${dayMasterInfo.hanja}${dayMasterInfo.ko.replace('갑목', '금')}(${dayElement ? elementTraits[dayElement]?.ko : ''}) 일간을 가진 당신은 ${dayMasterInfo.personality.ko}입니다.

${
  sunData && moonData
    ? `태양 ${sunData.ko}(${sunData.trait.ko})와 달 ${moonData.ko}(${moonData.trait.ko})의 조합으로, 외적으로는 ${sunData.trait.ko} 모습을, 내면에서는 ${moonData.trait.ko} 감성을 지닙니다.`
    : sunData
      ? `태양 ${sunData.ko}의 영향으로 ${sunData.trait.ko} 성향이 드러납니다.`
      : ''
}

【오행 밸런스】
${strongest ? `강점: ${elementTraits[strongest[0]]?.ko}(${strongest[1]}%) - ${strongest[0] === 'wood' ? '성장과 발전' : strongest[0] === 'fire' ? '열정과 표현' : strongest[0] === 'earth' ? '안정과 신뢰' : strongest[0] === 'metal' ? '결단과 실행' : '지혜와 유연함'}의 에너지가 풍부합니다.` : ''}
${weakest ? `보완점: ${elementTraits[weakest[0]]?.ko}(${weakest[1]}%) - 이 기운을 보완하면 더 균형 잡힌 삶을 살 수 있습니다.` : ''}

${dayMasterInfo.strength.ko}이 장점이며, ${dayMasterInfo.weakness.ko}은 주의가 필요합니다.`
    : `【Eastern × Western Fortune Analysis】

As ${dayMasterInfo.en} (${dayElement ? elementTraits[dayElement]?.en : ''}), you are ${dayMasterInfo.personality.en}.

${
  sunData && moonData
    ? `With Sun in ${sunData.en} (${sunData.trait.en}) and Moon in ${moonData.en} (${moonData.trait.en}), you show ${sunData.trait.en} externally while feeling ${moonData.trait.en} internally.`
    : sunData
      ? `Sun in ${sunData.en} influences your ${sunData.trait.en} tendencies.`
      : ''
}

【Five Elements Balance】
${strongest ? `Strength: ${elementTraits[strongest[0]]?.en} (${strongest[1]}%) - Rich in ${strongest[0] === 'wood' ? 'growth' : strongest[0] === 'fire' ? 'passion' : strongest[0] === 'earth' ? 'stability' : strongest[0] === 'metal' ? 'decisiveness' : 'wisdom'} energy.` : ''}
${weakest ? `To improve: ${elementTraits[weakest[0]]?.en} (${weakest[1]}%) - Boosting this brings better balance.` : ''}

Your strengths are ${dayMasterInfo.strength.en}, while ${dayMasterInfo.weakness.en} needs attention.`

  reportCache.set(cacheKey, report)

  if (reportCache.size > 500) {
    const firstKey = reportCache.keys().next().value
    if (firstKey !== undefined) {
      reportCache.delete(firstKey)
    }
  }

  return report
}
