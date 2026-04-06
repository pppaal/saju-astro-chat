import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import {
  type SajuProfile,
} from '@/lib/compatibility/cosmicCompatibility'
import { type FusionCompatibilityResult } from '@/lib/compatibility/compatibilityFusion'
import {
  type ExtendedAstrologyProfile,
} from '@/lib/compatibility/astrology/comprehensive'
import {
  calculateNatalChart,
  toChart,
} from '@/lib/astrology/foundation/astrologyService'
import type { AspectType } from '@/lib/astrology/foundation/types'
import type { PersonInput } from './types'
import {
  MAX_NOTE,
  ASPECT_LABEL_EN,
  ASPECT_LABEL_KO,
  ageFromDate,
  clamp,
  elementEnFromSaju,
  elementFromSign,
  elementLabel,
  normalizeLocale,
  normalizeSajuGender,
  normalizeSign,
  oppositeSign,
  parseBirthParts,
  signLabel,
  relationLabel,
  relationWeight,
  type PairAnalysis,
  type PairFusionInsights,
  type PairScore,
  type PersonAnalysis,
  type LocaleCode,
  unique,
} from './routeSupportCommon'
import {
  buildPairInsights,
  describeScoreBand,
  plainThemeLines,
  scenarioGuideLines,
} from './routeSupportNarrative'
import { buildUpcomingDates, scoreText } from './routeSupportTiming'

export {
  MAX_NOTE,
  ageFromDate,
  buildPairInsights,
  normalizeLocale,
  relationLabel,
  relationWeight,
  unique,
}
export type { LocaleCode, PairAnalysis, PairFusionInsights, PairScore, PersonAnalysis }

export function buildSajuProfileFromBirth(
  date: string,
  time: string,
  timezone: string,
  gender?: PersonInput['gender']
): SajuProfile | null {
  try {
    const result = calculateSajuData(date, time, normalizeSajuGender(gender), 'solar', timezone)
    return {
      dayMaster: {
        name: result.dayMaster.name,
        element: result.dayMaster.element,
        yin_yang: result.dayMaster.yin_yang === '양' ? 'yang' : 'yin',
      },
      pillars: {
        year: {
          stem: result.yearPillar.heavenlyStem.name,
          branch: result.yearPillar.earthlyBranch.name,
        },
        month: {
          stem: result.monthPillar.heavenlyStem.name,
          branch: result.monthPillar.earthlyBranch.name,
        },
        day: {
          stem: result.dayPillar.heavenlyStem.name,
          branch: result.dayPillar.earthlyBranch.name,
        },
        time: {
          stem: result.timePillar.heavenlyStem.name,
          branch: result.timePillar.earthlyBranch.name,
        },
      },
      elements: result.fiveElements,
    }
  } catch (error) {
    logger.warn('[Compatibility] Failed to build Saju profile', { error })
    return null
  }
}

export async function buildAstrologyProfileFromBirth(person: PersonInput): Promise<PersonAnalysis> {
  const errors: string[] = []
  const parts = parseBirthParts(person.date, person.time)

  if (!parts) {
    return {
      sajuProfile: null,
      astroProfile: null,
      extendedAstroProfile: null,
      natalChart: null,
      synastryChart: null,
      errors: ['Invalid birth date/time format'],
    }
  }

  try {
    const natal = await calculateNatalChart({
      year: parts.year,
      month: parts.month,
      date: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      latitude: person.latitude,
      longitude: person.longitude,
      timeZone: person.timeZone,
    })

    const planetMap = new Map(
      natal.planets.map((planet) => [String(planet.name).toLowerCase(), planet] as const)
    )

    const buildPlanet = (name: string, includeDegree = false) => {
      const planet = planetMap.get(name.toLowerCase())
      if (!planet) return undefined
      const sign = normalizeSign(String(planet.sign))
      const base = {
        sign,
        element: elementFromSign(sign),
      }
      return includeDegree ? { ...base, degree: planet.degree } : base
    }

    const sun = buildPlanet('Sun')
    const moon = buildPlanet('Moon')
    const venus = buildPlanet('Venus')
    const mars = buildPlanet('Mars')

    if (!sun || !moon || !venus || !mars) {
      errors.push('Missing required planets (Sun/Moon/Venus/Mars)')
      return {
        sajuProfile: null,
        astroProfile: null,
        extendedAstroProfile: null,
        natalChart: natal,
        synastryChart: null,
        errors,
      }
    }

    const ascSign = normalizeSign(String(natal.ascendant.sign))
    const northNode = buildPlanet('True Node')

    const extended: ExtendedAstrologyProfile = {
      sun,
      moon,
      venus,
      mars,
      ascendant: {
        sign: ascSign,
        element: elementFromSign(ascSign),
      },
      mercury: buildPlanet('Mercury', true),
      jupiter: buildPlanet('Jupiter'),
      saturn: buildPlanet('Saturn'),
      uranus: buildPlanet('Uranus'),
      neptune: buildPlanet('Neptune'),
      pluto: buildPlanet('Pluto'),
      northNode,
      southNode: northNode
        ? {
            sign: oppositeSign(northNode.sign),
            element: elementFromSign(oppositeSign(northNode.sign)),
          }
        : undefined,
    }

    return {
      sajuProfile: null,
      astroProfile: extended,
      extendedAstroProfile: extended,
      natalChart: natal,
      synastryChart: toChart(natal),
      errors,
    }
  } catch (error) {
    logger.warn('[Compatibility] Failed to build astrology profile', { error })
    return {
      sajuProfile: null,
      astroProfile: null,
      extendedAstroProfile: null,
      natalChart: null,
      synastryChart: null,
      errors: ['Astrology chart calculation failed'],
    }
  }
}

export function formatAspectLine(
  aspect: {
    from: { name: string }
    to: { name: string }
    type: AspectType
    orb: number
  },
  locale: LocaleCode
) {
  const label =
    locale === 'ko'
      ? ASPECT_LABEL_KO[aspect.type] || aspect.type
      : ASPECT_LABEL_EN[aspect.type] || aspect.type
  return locale === 'ko'
    ? `${aspect.from.name} ${label} ${aspect.to.name} (오브 ${aspect.orb.toFixed(2)}°)`
    : `${aspect.from.name} ${label} ${aspect.to.name} (orb ${aspect.orb.toFixed(2)}°)`
}



export function pickFusionInsights(fusion: FusionCompatibilityResult): PairFusionInsights {
  return {
    deepAnalysis: fusion.aiInsights.deepAnalysis,
    dayMasterHarmony: fusion.details.sajuAnalysis?.dayMasterHarmony ?? null,
    sunMoonHarmony: fusion.details.astrologyAnalysis?.sunMoonHarmony ?? null,
    venusMarsSynergy: fusion.details.astrologyAnalysis?.venusMarsSynergy ?? null,
    emotionalIntensity: fusion.relationshipDynamics?.emotionalIntensity ?? null,
    intellectualAlignment: fusion.relationshipDynamics?.intellectualAlignment ?? null,
    spiritualConnection: fusion.relationshipDynamics?.spiritualConnection ?? null,
    conflictResolutionStyle: fusion.relationshipDynamics?.conflictResolutionStyle ?? null,
    shortTerm: fusion.futureGuidance?.shortTerm ?? null,
    mediumTerm: fusion.futureGuidance?.mediumTerm ?? null,
    longTerm: fusion.futureGuidance?.longTerm ?? null,
    recommendedActions: fusion.recommendedActions.map((item) => item.action).slice(0, 6),
  }
}

export function buildTimingPayload(
  pair: PairAnalysis | null,
  persons: PersonInput[],
  analyses: PersonAnalysis[],
  isGroup: boolean,
  locale: LocaleCode
) {
  if (!pair) return null
  const baseTimeZone = persons[pair.pair[0]]?.timeZone || 'Asia/Seoul'

  const monthLabel = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'long',
  }).format(new Date())
  const firstPersonElement = analyses[0]?.sajuProfile
    ? elementLabel(locale, analyses[0].sajuProfile.dayMaster.element)
    : locale === 'ko'
      ? '혼합'
      : 'Mixed'

  const base = {
    current_month: {
      branch: monthLabel,
      element: firstPersonElement,
      analysis:
        pair.weightedScore >= 75
          ? locale === 'ko'
            ? '투명한 소통과 공동 계획 수립에 유리한 달입니다.'
            : 'Good month for transparent communication and shared plans.'
          : locale === 'ko'
            ? '속도 조절과 경계 설정, 신뢰 회복에 집중해야 하는 달입니다.'
            : 'Use this month for pacing, boundary setting, and trust recovery.',
    },
  }

  if (isGroup) {
    const groupActivities = [
      {
        type: 'collaboration',
        days: locale === 'ko' ? '화, 목' : 'Tue, Thu',
        activities:
          locale === 'ko'
            ? ['계획 회의', '창의 워크숍']
            : ['Planning sessions', 'Creative workshops'],
        reason:
          locale === 'ko'
            ? '그룹 내 전략적 참여와 감정적 참여의 균형을 맞춰줍니다.'
            : 'Balances strategic and emotional participation in group dynamics.',
      },
      {
        type: 'bonding',
        days: locale === 'ko' ? '토' : 'Sat',
        activities:
          locale === 'ko'
            ? ['깊은 대화', '팀 여가 활동']
            : ['Long-form conversation', 'Team leisure activity'],
        reason:
          locale === 'ko'
            ? '과한 압박 없이 약한 페어 연결을 보완합니다.'
            : 'Improves weaker pair links without high pressure.',
      },
    ] as const

    return {
      ...base,
      group_activities: groupActivities.map((activity) => ({
        ...activity,
        next_dates: buildUpcomingDates(activity.days, baseTimeZone, locale),
      })),
    }
  }

  const firstName =
    persons[pair.pair[0]]?.name ||
    (locale === 'ko' ? `사람 ${pair.pair[0] + 1}` : `Person ${pair.pair[0] + 1}`)
  const secondName =
    persons[pair.pair[1]]?.name ||
    (locale === 'ko' ? `사람 ${pair.pair[1] + 1}` : `Person ${pair.pair[1] + 1}`)

  const goodDays = [
    {
      type: 'connection',
      days: locale === 'ko' ? '월, 금' : 'Mon, Fri',
      activities: locale === 'ko' ? ['깊은 대화', '데이트'] : ['Deep talk', 'Date night'],
      reason:
        locale === 'ko'
          ? `${firstName}와 ${secondName}는 이 날짜에 감정 표현의 명확성이 높아질 수 있습니다.`
          : `${firstName} and ${secondName} can improve emotional clarity on these days.`,
    },
    {
      type: 'planning',
      days: locale === 'ko' ? '수' : 'Wed',
      activities:
        locale === 'ko'
          ? ['재정 계획', '생활 루틴 정렬']
          : ['Financial planning', 'Routine alignment'],
      reason:
        locale === 'ko'
          ? '현실적 마찰과 기대치 불일치를 줄이기 좋은 타이밍입니다.'
          : 'Best for reducing practical friction and expectation mismatch.',
    },
  ] as const

  return {
    ...base,
    good_days: goodDays.map((day) => ({
      ...day,
      next_dates: buildUpcomingDates(day.days, baseTimeZone, locale),
    })),
  }
}

export function buildGroupPayload(
  names: string[],
  analyses: PersonAnalysis[],
  pairAnalyses: PairAnalysis[],
  locale: LocaleCode
): {
  groupAnalysis: Record<string, unknown> | null
  synergyBreakdown: Record<string, unknown> | null
} {
  if (names.length <= 2) {
    return { groupAnalysis: null, synergyBreakdown: null }
  }

  const oheng = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const astro = { fire: 0, earth: 0, air: 0, water: 0 }

  analyses.forEach((analysis) => {
    if (analysis.sajuProfile) {
      const key = elementEnFromSaju(analysis.sajuProfile.dayMaster.element)
      if (key in oheng) {
        oheng[key as keyof typeof oheng] += 1
      }
    }
    if (analysis.astroProfile) {
      const key = analysis.astroProfile.sun.element
      if (key in astro) {
        astro[key as keyof typeof astro] += 1
      }
    }
  })

  const dominantOheng = Object.entries(oheng).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const dominantAstro = Object.entries(astro).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const lackingOheng = Object.entries(oheng).find(([, v]) => v === 0)?.[0] ?? null
  const lackingAstro = Object.entries(astro).find(([, v]) => v === 0)?.[0] ?? null

  const roles = {
    leader: [] as string[],
    mediator: [] as string[],
    catalyst: [] as string[],
    stabilizer: [] as string[],
    creative: [] as string[],
    emotional: [] as string[],
  }

  analyses.forEach((analysis, idx) => {
    const name = names[idx]
    const sunElement = analysis.astroProfile?.sun.element
    const sajuElement = analysis.sajuProfile
      ? elementEnFromSaju(analysis.sajuProfile.dayMaster.element)
      : null

    if (sunElement === 'fire') roles.leader.push(name)
    if (sunElement === 'water') roles.emotional.push(name)
    if (sunElement === 'air') roles.catalyst.push(name)
    if (sunElement === 'earth' || sajuElement === 'metal') roles.stabilizer.push(name)
    if (sunElement === 'water' || sajuElement === 'water') roles.mediator.push(name)
    if (sunElement === 'air' || sajuElement === 'wood') roles.creative.push(name)
  })

  const pairwiseMatrix = pairAnalyses.map((pair) => ({
    pair: pair.pairLabel,
    index: pair.pair,
    saju: scoreText(pair.sajuScore, locale),
    astro: scoreText(pair.astrologyScore, locale),
    score: pair.weightedScore,
    summary:
      locale === 'ko'
        ? `관계 가중치를 반영한 ${describeScoreBand(pair.weightedScore, locale)} 조합입니다.`
        : `${describeScoreBand(pair.weightedScore, locale)} fit with relation weight applied.`,
    saju_details: pair.sajuScore
      ? [locale === 'ko' ? `사주 점수 ${pair.sajuScore}/100` : `Saju score ${pair.sajuScore}/100`]
      : [],
    astro_details: pair.astrologyScore
      ? [
          locale === 'ko'
            ? `점성 점수 ${pair.astrologyScore}/100`
            : `Astrology score ${pair.astrologyScore}/100`,
        ]
      : [],
    fusion_insights: pair.strengths.slice(0, 2),
  }))

  const rawAverage = Math.round(
    pairAnalyses.reduce((sum, pair) => sum + pair.rawScore, 0) / Math.max(pairAnalyses.length, 1)
  )
  const ohengBonus = lackingOheng ? 0 : 4
  const astroBonus = lackingAstro ? 1 : 4
  const roleBonus = Object.values(roles).filter((list) => list.length > 0).length >= 4 ? 3 : 1
  const samhapBonus =
    pairAnalyses.filter((pair) => pair.crossScore !== null && (pair.crossScore || 0) >= 70)
      .length >= 2
      ? 3
      : 0
  const sizeAdjustment = names.length === 4 ? -2 : 0
  const totalScore = clamp(
    rawAverage + ohengBonus + astroBonus + roleBonus + samhapBonus + sizeAdjustment,
    0,
    100
  )

  const sortedPairs = [...pairAnalyses].sort((a, b) => b.weightedScore - a.weightedScore)
  const best = sortedPairs[0] || null
  const weakest = sortedPairs[sortedPairs.length - 1] || null

  const specialFormations: string[] = []
  if (!lackingOheng) {
    specialFormations.push(locale === 'ko' ? '오행 균형 분포' : 'Balanced five-element coverage')
  }
  if (!lackingAstro) {
    specialFormations.push(
      locale === 'ko' ? '점성 원소 균형 분포' : 'Balanced astro element coverage'
    )
  }
  if (pairAnalyses.some((p) => (p.crossScore || 0) >= 80)) {
    specialFormations.push(
      locale === 'ko' ? '강한 교차 시스템 공명' : 'Strong cross-system resonance'
    )
  }

  return {
    groupAnalysis: {
      element_distribution: {
        oheng,
        astro,
        dominant_oheng: dominantOheng,
        lacking_oheng: lackingOheng,
        dominant_astro: dominantAstro,
        lacking_astro: lackingAstro,
      },
      pairwise_matrix: pairwiseMatrix,
      group_roles: Object.fromEntries(
        Object.entries(roles).map(([key, value]) => [key, unique(value)])
      ),
    },
    synergyBreakdown: {
      total_score: totalScore,
      overall_score: totalScore,
      avg_pair_score: rawAverage,
      oheng_bonus: ohengBonus,
      astro_bonus: astroBonus,
      role_bonus: roleBonus,
      samhap_bonus: samhapBonus,
      size_adjustment: sizeAdjustment,
      special_formations: specialFormations,
      best_pair: {
        pair: best?.pairLabel || (locale === 'ko' ? '정보 없음' : 'N/A'),
        score: best?.weightedScore || 0,
        summary: best?.strengths?.[0] || (locale === 'ko' ? '데이터 없음' : 'No data'),
      },
      weakest_pair: {
        pair: weakest?.pairLabel || (locale === 'ko' ? '정보 없음' : 'N/A'),
        score: weakest?.weightedScore || 0,
        summary: weakest?.challenges?.[0] || (locale === 'ko' ? '데이터 없음' : 'No data'),
      },
    },
  }
}

export function buildInterpretationMarkdown(params: {
  locale: LocaleCode
  names: string[]
  persons: PersonInput[]
  analyses: PersonAnalysis[]
  pairAnalyses: PairAnalysis[]
  finalScore: number
  timing: ReturnType<typeof buildTimingPayload> | null
}) {
  const { locale, names, persons, analyses, pairAnalyses, finalScore, timing } = params
  const isKo = locale === 'ko'
  const primaryPair = pairAnalyses[0]

  if (!primaryPair) {
    return [
      isKo ? '## 종합 점수' : '## Overall Score',
      '',
      isKo
        ? '입력값으로부터 페어 결과를 생성하지 못했습니다.'
        : 'No pair result could be generated from the input.',
      '',
      isKo ? '## 조언' : '## Advice',
      '',
      isKo
        ? '- 모든 사람의 생년월일, 출생시간, 위도/경도, 시간대를 다시 확인해주세요.'
        : '- Please verify date, time, latitude/longitude, and timezone for all people.',
    ].join('\n')
  }

  const [aIndex, bIndex] = primaryPair.pair
  const p1Name = names[aIndex]
  const p2Name = names[bIndex]
  const p1Saju = analyses[aIndex]?.sajuProfile
  const p2Saju = analyses[bIndex]?.sajuProfile
  const p1Astro = analyses[aIndex]?.astroProfile
  const p2Astro = analyses[bIndex]?.astroProfile
  const fusion = primaryPair.fusionInsights

  const personalityScore = clamp(
    Math.round(
      (primaryPair.sajuScore ?? primaryPair.weightedScore) * 0.65 +
        (primaryPair.crossScore ?? primaryPair.weightedScore) * 0.35
    ),
    0,
    100
  )
  const emotionalScore = clamp(
    Math.round(
      (fusion?.sunMoonHarmony ?? primaryPair.astrologyScore ?? primaryPair.weightedScore) * 0.7 +
        (fusion?.emotionalIntensity ?? primaryPair.weightedScore) * 0.3
    ),
    0,
    100
  )
  const intimacyScore = clamp(
    Math.round(
      (fusion?.venusMarsSynergy ?? primaryPair.astrologyScore ?? primaryPair.weightedScore) * 0.75 +
        (fusion?.emotionalIntensity ?? primaryPair.weightedScore) * 0.25
    ),
    0,
    100
  )
  const homeScore = clamp(
    Math.round(
      (primaryPair.sajuScore ?? primaryPair.weightedScore) * 0.7 + primaryPair.weightedScore * 0.3
    ),
    0,
    100
  )
  const communicationScore = clamp(
    Math.round(
      (fusion?.intellectualAlignment ?? primaryPair.crossScore ?? primaryPair.weightedScore) * 0.7 +
        primaryPair.weightedScore * 0.3
    ),
    0,
    100
  )
  const datingScore = clamp(
    Math.round(emotionalScore * 0.4 + intimacyScore * 0.4 + communicationScore * 0.2),
    0,
    100
  )
  const marriageScore = clamp(
    Math.round(homeScore * 0.45 + personalityScore * 0.25 + communicationScore * 0.3),
    0,
    100
  )
  const reunionScore = clamp(
    Math.round(
      communicationScore * 0.35 +
        emotionalScore * 0.35 +
        (primaryPair.crossScore ?? primaryPair.weightedScore) * 0.3
    ),
    0,
    100
  )
  const cohabitationScore = clamp(
    Math.round(homeScore * 0.5 + communicationScore * 0.3 + emotionalScore * 0.2),
    0,
    100
  )

  const lines: string[] = []
  lines.push(isKo ? '## 종합 점수' : '## Overall Score')
  lines.push('')
  lines.push(
    `${primaryPair.pairLabel}: ${primaryPair.weightedScore}/100 (${describeScoreBand(primaryPair.weightedScore, locale)})`
  )
  lines.push(
    isKo
      ? `전체 ${pairAnalyses.length}개 페어 평균: ${finalScore}/100`
      : `Global average across ${pairAnalyses.length} pair(s): ${finalScore}/100`
  )
  lines.push(
    isKo
      ? '이 결과는 사주 + 점성 + 교차 시스템 점수를 기반으로 계산되었습니다.'
      : 'This result is computed locally from Saju + Astrology + cross-system scoring.'
  )
  lines.push('')

  lines.push(isKo ? '## 관계 분석' : '## Relationship Analysis')
  lines.push('')
  for (let i = 1; i < persons.length; i++) {
    lines.push(
      `${names[0]} ↔ ${names[i]}: ${relationLabel(locale, persons[i].relationToP1, persons[i].relationNoteToP1)}`
    )
  }
  lines.push('')

  lines.push(isKo ? '## 상세 점수' : '## Detailed Scores')
  lines.push('')
  pairAnalyses.forEach((pair) => {
    lines.push(
      locale === 'ko'
        ? `${pair.pairLabel}: ${pair.weightedScore}/100 (사주 ${scoreText(pair.sajuScore, locale)}, 점성 ${scoreText(pair.astrologyScore, locale)}, 교차 ${scoreText(pair.crossScore, locale)})`
        : `${pair.pairLabel}: ${pair.weightedScore}/100 (Saju ${scoreText(pair.sajuScore, locale)}, Astrology ${scoreText(pair.astrologyScore, locale)}, Cross ${scoreText(pair.crossScore, locale)})`
    )
  })
  lines.push('')

  lines.push(isKo ? '## 한눈에 보는 궁합 해설' : '## Plain-Language Compatibility Guide')
  lines.push('')
  lines.push(...plainThemeLines(locale, 'personality', personalityScore))
  lines.push(...plainThemeLines(locale, 'emotional', emotionalScore))
  lines.push(...plainThemeLines(locale, 'intimacy', intimacyScore))
  lines.push(...plainThemeLines(locale, 'home', homeScore))
  lines.push(...plainThemeLines(locale, 'communication', communicationScore))
  lines.push('')

  lines.push(isKo ? '## 상황별 관계 운영 가이드' : '## Scenario-Based Relationship Guide')
  lines.push('')
  lines.push(...scenarioGuideLines(locale, 'dating', datingScore))
  lines.push(...scenarioGuideLines(locale, 'marriage', marriageScore))
  lines.push(...scenarioGuideLines(locale, 'reunion', reunionScore))
  lines.push(...scenarioGuideLines(locale, 'cohabitation', cohabitationScore))
  lines.push('')

  lines.push(isKo ? '## 사주 분석' : '## Saju Analysis')
  lines.push('')
  if (p1Saju && p2Saju) {
    lines.push(
      isKo
        ? `일간 비교: ${p1Name} ${p1Saju.dayMaster.name} (${elementLabel(locale, p1Saju.dayMaster.element)}) vs ${p2Name} ${p2Saju.dayMaster.name} (${elementLabel(locale, p2Saju.dayMaster.element)})`
        : `Day Master: ${p1Name} ${p1Saju.dayMaster.name} (${elementLabel(locale, p1Saju.dayMaster.element)}) vs ${p2Name} ${p2Saju.dayMaster.name} (${elementLabel(locale, p2Saju.dayMaster.element)})`
    )
    lines.push(
      isKo
        ? `사주 궁합 점수: ${scoreText(primaryPair.sajuScore, locale)}`
        : `Saju compatibility score: ${scoreText(primaryPair.sajuScore, locale)}`
    )
    lines.push(
      isKo
        ? `월지 상호작용: ${p1Saju.pillars.month.branch} ↔ ${p2Saju.pillars.month.branch}`
        : `Month branch interaction: ${p1Saju.pillars.month.branch} ↔ ${p2Saju.pillars.month.branch}`
    )
  } else {
    lines.push(
      isKo
        ? '이 페어의 사주 프로필을 완전히 계산하지 못했습니다.'
        : 'Saju profile could not be fully computed for this pair.'
    )
  }
  lines.push('')

  lines.push(isKo ? '## 점성 분석' : '## Astrology Analysis')
  lines.push('')
  if (p1Astro && p2Astro) {
    lines.push(
      isKo
        ? `${p1Name}: 태양 ${signLabel(locale, p1Astro.sun.sign)}, 달 ${signLabel(locale, p1Astro.moon.sign)}, 금성 ${signLabel(locale, p1Astro.venus.sign)}, 화성 ${signLabel(locale, p1Astro.mars.sign)}`
        : `${p1Name}: Sun ${signLabel(locale, p1Astro.sun.sign)}, Moon ${signLabel(locale, p1Astro.moon.sign)}, Venus ${signLabel(locale, p1Astro.venus.sign)}, Mars ${signLabel(locale, p1Astro.mars.sign)}`
    )
    lines.push(
      isKo
        ? `${p2Name}: 태양 ${signLabel(locale, p2Astro.sun.sign)}, 달 ${signLabel(locale, p2Astro.moon.sign)}, 금성 ${signLabel(locale, p2Astro.venus.sign)}, 화성 ${signLabel(locale, p2Astro.mars.sign)}`
        : `${p2Name}: Sun ${signLabel(locale, p2Astro.sun.sign)}, Moon ${signLabel(locale, p2Astro.moon.sign)}, Venus ${signLabel(locale, p2Astro.venus.sign)}, Mars ${signLabel(locale, p2Astro.mars.sign)}`
    )
    lines.push(
      isKo
        ? `점성 궁합 점수: ${scoreText(primaryPair.astrologyScore, locale)}`
        : `Astrology compatibility score: ${scoreText(primaryPair.astrologyScore, locale)}`
    )

    if (primaryPair.topAspects.length > 0) {
      lines.push(isKo ? '주요 시너스트리 어스펙트:' : 'Top synastry aspects:')
      primaryPair.topAspects.slice(0, 6).forEach((aspect) => lines.push(`- ${aspect}`))
    }
    if (primaryPair.topHouseOverlays.length > 0) {
      lines.push(isKo ? '핵심 하우스 오버레이:' : 'Key house overlays:')
      primaryPair.topHouseOverlays.slice(0, 4).forEach((overlay) => lines.push(`- ${overlay}`))
    }
  } else {
    lines.push(
      isKo
        ? '이 페어의 점성 프로필을 완전히 계산하지 못했습니다.'
        : 'Astrology profile could not be fully computed for this pair.'
    )
  }
  lines.push('')

  lines.push(isKo ? '## 교차 시스템 분석' : '## Cross-System Analysis')
  lines.push('')
  lines.push(
    isKo
      ? `융합 점수(사주 + 점성): ${scoreText(primaryPair.fusionScore, locale)}`
      : `Fusion score (Saju + Astrology): ${scoreText(primaryPair.fusionScore, locale)}`
  )
  lines.push(
    isKo
      ? `교차 시스템 일관성 점수: ${scoreText(primaryPair.crossScore, locale)}`
      : `Cross-system consistency score: ${scoreText(primaryPair.crossScore, locale)}`
  )
  if (primaryPair.crossScore !== null) {
    if (primaryPair.crossScore >= 75) {
      lines.push(
        isKo
          ? '사주와 점성이 비슷한 방향을 가리키고 있습니다.'
          : 'Saju and Astrology are pointing in a similar direction.'
      )
    } else if (primaryPair.crossScore >= 55) {
      lines.push(
        isKo
          ? '사주와 점성이 부분적으로 맞습니다. 실무적인 조율이 중요합니다.'
          : 'Saju and Astrology are partially aligned; practical tuning is important.'
      )
    } else {
      lines.push(
        isKo
          ? '사주와 점성의 강조점이 다릅니다. 소통 품질이 핵심입니다.'
          : 'Saju and Astrology show different emphasis; communication quality is critical.'
      )
    }
  }
  lines.push('')

  lines.push(isKo ? '## 성격/감정 궁합' : '## Personality & Emotional Fit')
  lines.push('')
  if (fusion) {
    if (fusion.dayMasterHarmony !== null) {
      lines.push(
        isKo
          ? `사주 성향 조화(일간): ${fusion.dayMasterHarmony}/100`
          : `Saju personality alignment (Day Master): ${fusion.dayMasterHarmony}/100`
      )
    }
    if (fusion.sunMoonHarmony !== null) {
      lines.push(
        isKo
          ? `감정/가치관 조화(태양·달): ${fusion.sunMoonHarmony}/100`
          : `Emotional/value harmony (Sun-Moon): ${fusion.sunMoonHarmony}/100`
      )
    }
    if (fusion.intellectualAlignment !== null) {
      lines.push(
        isKo
          ? `대화/사고 결(지적 정렬): ${fusion.intellectualAlignment}/100`
          : `Conversation/thinking alignment: ${fusion.intellectualAlignment}/100`
      )
    }
    if (fusion.conflictResolutionStyle) {
      lines.push(
        isKo
          ? `갈등 해결 스타일: ${fusion.conflictResolutionStyle}`
          : `Conflict resolution style: ${fusion.conflictResolutionStyle}`
      )
    }
  } else {
    lines.push(
      isKo
        ? '성향/감정 조화 지표를 일부 계산하지 못해 핵심 점수 위주로 해석했습니다.'
        : 'Some personality/emotion indicators were unavailable, so this section uses core scores.'
    )
  }
  lines.push('')

  lines.push(isKo ? '## 속궁합 & 친밀도' : '## Intimacy Chemistry')
  lines.push('')
  if (fusion?.venusMarsSynergy !== null && fusion?.venusMarsSynergy !== undefined) {
    lines.push(
      isKo
        ? `로맨스/끌림 지수(금성·화성): ${fusion.venusMarsSynergy}/100`
        : `Romance/attraction index (Venus-Mars): ${fusion.venusMarsSynergy}/100`
    )
  } else {
    lines.push(
      isKo
        ? `점성 기반 친밀도: ${scoreText(primaryPair.astrologyScore, locale)}`
        : `Astrology-based intimacy score: ${scoreText(primaryPair.astrologyScore, locale)}`
    )
  }
  if (fusion?.emotionalIntensity !== null && fusion?.emotionalIntensity !== undefined) {
    lines.push(
      isKo
        ? `감정 몰입도: ${fusion.emotionalIntensity}/100`
        : `Emotional intensity: ${fusion.emotionalIntensity}/100`
    )
  }
  lines.push(
    isKo
      ? '핵심: 속궁합은 끌림 강도만이 아니라 감정 안정성과 소통 품질이 함께 맞을 때 오래 갑니다.'
      : 'Key point: Intimacy lasts when attraction and communication/emotional stability rise together.'
  )
  lines.push('')

  lines.push(isKo ? '## 미래 흐름 & 만남 타이밍' : '## Future Flow & Best Meeting Windows')
  lines.push('')
  if (fusion?.shortTerm) {
    lines.push(
      isKo ? `단기(1~6개월): ${fusion.shortTerm}` : `Short term (1-6 months): ${fusion.shortTerm}`
    )
  }
  if (fusion?.mediumTerm) {
    lines.push(
      isKo
        ? `중기(6개월~2년): ${fusion.mediumTerm}`
        : `Mid term (6 months-2 years): ${fusion.mediumTerm}`
    )
  }
  if (fusion?.longTerm) {
    lines.push(isKo ? `장기(2년+): ${fusion.longTerm}` : `Long term (2+ years): ${fusion.longTerm}`)
  }
  if (
    timing &&
    'good_days' in timing &&
    Array.isArray(timing.good_days) &&
    timing.good_days.length
  ) {
    timing.good_days.forEach((day: { days: string; next_dates?: string[] }) => {
      const nextDates =
        Array.isArray((day as { next_dates?: unknown }).next_dates) &&
        (day as { next_dates?: unknown[] }).next_dates?.length
          ? (day as { next_dates: string[] }).next_dates.join(', ')
          : null
      if (nextDates) {
        lines.push(
          isKo
            ? `추천 만남일(${day.days}) 다음 일정: ${nextDates}`
            : `Recommended meeting days (${day.days}) next windows: ${nextDates}`
        )
      }
    })
  }
  lines.push('')

  lines.push(isKo ? '## 강점' : '## Strengths')
  lines.push('')
  primaryPair.strengths.forEach((item) => lines.push(`- ${item}`))
  lines.push('')

  lines.push(isKo ? '## 과제' : '## Challenges')
  lines.push('')
  if (primaryPair.challenges.length === 0) {
    lines.push(
      isKo
        ? '- 현재 계산 기준에서 큰 위험 신호는 감지되지 않았습니다.'
        : '- No major challenge signal detected from current calculations.'
    )
  } else {
    primaryPair.challenges.forEach((item) => lines.push(`- ${item}`))
  }
  lines.push('')

  lines.push(isKo ? '## 조언' : '## Advice')
  lines.push('')
  primaryPair.advice.forEach((item) => lines.push(`- ${item}`))
  lines.push('')

  lines.push(isKo ? '## 요약' : '## Summary')
  lines.push('')
  lines.push(
    isKo
      ? `${p1Name} & ${p2Name} 현재 점수는 ${primaryPair.weightedScore}/100입니다. 장기 궁합을 높이려면 일관된 소통과 역할 명확화에 집중하세요.`
      : `${p1Name} & ${p2Name} currently rate ${primaryPair.weightedScore}/100. Focus on consistent communication and role clarity to improve long-term compatibility.`
  )

  return lines.join('\n')
}


