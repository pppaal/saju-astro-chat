/**
 * astrologySection.ts - 점성술 데이터 섹션 빌더
 */

import type { PlanetData, TransitItem, FixedStarItem, AsteroidAspect } from '../prompt-types'

/**
 * 트랜짓 데이터 포맷
 */
export function formatTransits(transits: TransitItem[]): string {
  type TransitData = TransitItem & {
    transitPlanet?: string
    natalPoint?: string
    isApplying?: boolean
  }

  return transits
    .filter((t: TransitData) =>
      ['conjunction', 'trine', 'square', 'opposition'].includes(t.type || t.aspectType || '')
    )
    .slice(0, 8)
    .map((t: TransitData) => {
      const planet1 = t.transitPlanet ?? t.from?.name ?? '?'
      const planet2 = t.natalPoint ?? t.to?.name ?? '?'
      const aspectType = t.aspectType ?? t.type ?? '?'
      const applyingText = t.isApplying ? '(접근중)' : '(분리중)'
      return `${planet1}-${aspectType}-${planet2} ${applyingText}`
    })
    .join('; ')
}

/**
 * 엑스트라 포인트 데이터 추출 (Chiron, Lilith, Vertex, Part of Fortune)
 */
export function extractExtraPoints(data: Record<string, unknown>) {
  type ExtraPoint = { sign?: string; house?: number }
  const extraPoints = (data.extraPoints as Record<string, ExtraPoint | undefined> | undefined) ?? {}
  const vertex = extraPoints.vertex
  const partOfFortune = extraPoints.partOfFortune
  const chiron = extraPoints.chiron
  const lilith = extraPoints.lilith

  const extraPointsText =
    [
      chiron ? `Chiron(상처/치유): ${chiron.sign} (H${chiron.house})` : null,
      lilith ? `Lilith(그림자): ${lilith.sign} (H${lilith.house})` : null,
      vertex ? `Vertex(운명): ${vertex.sign} (H${vertex.house})` : null,
      partOfFortune
        ? `Part of Fortune(행운): ${partOfFortune.sign} (H${partOfFortune.house})`
        : null,
    ]
      .filter(Boolean)
      .join('; ') || '-'

  return { extraPointsText, chiron, lilith, vertex, partOfFortune }
}

/**
 * 소행성 데이터 추출 (Ceres, Pallas, Juno, Vesta)
 */
export function extractAsteroids(data: Record<string, unknown>) {
  type AsteroidPoint = { sign?: string; house?: number }
  type AsteroidData = {
    juno?: AsteroidPoint
    ceres?: AsteroidPoint
    pallas?: AsteroidPoint
    vesta?: AsteroidPoint
    aspects?: AsteroidAspect[] | Record<string, AsteroidAspect[]>
  }

  const asteroids = (data.asteroids as AsteroidData | undefined) ?? {}
  const { juno, ceres, pallas, vesta } = asteroids

  const asteroidsText =
    [
      ceres ? `Ceres(양육): ${ceres.sign} (H${ceres.house})` : null,
      pallas ? `Pallas(지혜): ${pallas.sign} (H${pallas.house})` : null,
      juno ? `Juno(결혼): ${juno.sign} (H${juno.house})` : null,
      vesta ? `Vesta(헌신): ${vesta.sign} (H${vesta.house})` : null,
    ]
      .filter(Boolean)
      .join('; ') || '-'

  // Asteroid Aspects
  const asteroidAspects = asteroids.aspects
  const asteroidAspectsText = asteroidAspects
    ? (() => {
        if (Array.isArray(asteroidAspects)) {
          return asteroidAspects
            .slice(0, 4)
            .map(
              (a: AsteroidAspect) =>
                `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
            )
            .join('; ')
        }
        if (typeof asteroidAspects === 'object') {
          const allAsp: string[] = []
          for (const [name, hits] of Object.entries(asteroidAspects)) {
            if (Array.isArray(hits)) {
              for (const h of (hits as AsteroidAspect[]).slice(0, 2)) {
                allAsp.push(`${name}-${h.type ?? h.aspect}-${h.planet2?.name ?? h.to ?? h.planet}`)
              }
            }
          }
          return allAsp.slice(0, 4).join('; ')
        }
        return '-'
      })()
    : '-'

  return { asteroidsText, asteroidAspectsText, juno, ceres, pallas, vesta }
}

/**
 * Solar/Lunar Return 데이터 추출
 */
export function extractReturns(data: Record<string, unknown>) {
  type ReturnSummary = {
    ascSign?: string
    ascendant?: string
    sunHouse?: number
    moonSign?: string
    moonHouse?: number
    theme?: string
    yearTheme?: string
    monthTheme?: string
  }
  type ReturnData = { summary?: ReturnSummary }

  const solarReturn = data.solarReturn as ReturnData | undefined
  const solarReturnText = solarReturn
    ? [
        `SR ASC: ${solarReturn.summary?.ascSign ?? solarReturn.summary?.ascendant ?? '-'}`,
        `SR Sun House: ${solarReturn.summary?.sunHouse ?? '-'}`,
        `SR Moon: ${solarReturn.summary?.moonSign ?? '-'} (H${solarReturn.summary?.moonHouse ?? '-'})`,
        `Year Theme: ${solarReturn.summary?.theme ?? solarReturn.summary?.yearTheme ?? '-'}`,
      ].join('; ')
    : '-'

  const lunarReturn = data.lunarReturn as ReturnData | undefined
  const lunarReturnText = lunarReturn
    ? [
        `LR ASC: ${lunarReturn.summary?.ascSign ?? lunarReturn.summary?.ascendant ?? '-'}`,
        `LR Moon House: ${lunarReturn.summary?.moonHouse ?? '-'}`,
        `Month Theme: ${lunarReturn.summary?.theme ?? lunarReturn.summary?.monthTheme ?? '-'}`,
      ].join('; ')
    : '-'

  return { solarReturnText, lunarReturnText }
}

/**
 * Progressions 데이터 추출
 */
export function extractProgressions(data: Record<string, unknown>) {
  type ProgressionSummary = {
    keySigns?: { sun?: string; moon?: string }
    progressedSun?: string
    progressedMoon?: string
    moonHouse?: number
    ascendant?: string
  }
  type ProgressionChart = { ascendant?: { sign?: string } }
  type ProgressionSecondary = {
    summary?: ProgressionSummary
    moonPhase?: { phase?: string }
    chart?: ProgressionChart
  }
  type ProgressionSolarArc = { summary?: ProgressionSummary }
  type ProgressionData = { secondary?: ProgressionSecondary; solarArc?: ProgressionSolarArc }

  const progressions = data.progressions as ProgressionData | undefined
  const progressedSun =
    progressions?.secondary?.summary?.keySigns?.sun ??
    progressions?.secondary?.summary?.progressedSun ??
    '-'
  const progressedMoon =
    progressions?.secondary?.summary?.keySigns?.moon ??
    progressions?.secondary?.summary?.progressedMoon ??
    '-'
  const progressedMoonPhase = progressions?.secondary?.moonPhase?.phase ?? '-'
  const progressedMoonHouse = progressions?.secondary?.summary?.moonHouse ?? '-'
  const progressedAsc =
    progressions?.secondary?.summary?.ascendant ??
    progressions?.secondary?.chart?.ascendant?.sign ??
    '-'
  const solarArcSun =
    progressions?.solarArc?.summary?.keySigns?.sun ??
    progressions?.solarArc?.summary?.progressedSun ??
    '-'

  const progressionsText = progressions
    ? [
        `P.Sun: ${progressedSun}`,
        `P.Moon: ${progressedMoon} (Phase: ${progressedMoonPhase})`,
        `P.ASC: ${progressedAsc}`,
        progressions.solarArc ? `SA Sun: ${solarArcSun}` : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  const progressionDetailText = progressions
    ? `
• Progressed Sun: ${progressedSun} → 현재 자아 성장 방향
• Progressed Moon: ${progressedMoon} (House ${progressedMoonHouse}) → 현재 감정적 초점
• Progressed Moon Phase: ${progressedMoonPhase} → 29.5년 인생 주기 중 위치
  - New Moon(0-3.5년): 새로운 시작, 씨앗 심기
  - Crescent(3.5-7년): 성장 도전, 의지력 시험
  - First Quarter(7-10.5년): 행동, 결단의 시기
  - Gibbous(10.5-14년): 분석, 완성 추구
  - Full Moon(14-17.5년): 수확, 관계 절정
  - Disseminating(17.5-21년): 나눔, 가르침
  - Last Quarter(21-24.5년): 재평가, 정리
  - Balsamic(24.5-29.5년): 완료, 새 주기 준비
• Progressed ASC: ${progressedAsc} → 현재 페르소나 변화
${progressions.solarArc ? `• Solar Arc Sun: ${solarArcSun} → 외적 발전 방향` : ''}
`.trim()
    : ''

  return { progressionsText, progressionDetailText }
}

/**
 * Fixed Stars 데이터 추출
 */
export function extractFixedStars(data: Record<string, unknown>): string {
  const fixedStars = data.fixedStars as FixedStarItem[] | undefined
  return fixedStars?.length
    ? fixedStars
        .slice(0, 4)
        .map(
          (fs: FixedStarItem) =>
            `${fs.star ?? fs.starName}↔${fs.planet ?? fs.planetName}(${fs.meaning ?? ''})`
        )
        .join('; ')
    : '-'
}
