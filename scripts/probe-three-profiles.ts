// @ts-nocheck
/**
 * 3명의 narration을 동시에 출력해 변동성 검증.
 */
import { calculateSajuData } from '../src/lib/saju/saju'
import { synthesizeExpertNarrationKo } from '../src/lib/matrix/ai-report/sajuNarrationBridge'

interface Profile {
  label: string
  date: string
  time: string
  gender: 'male' | 'female'
  city: string
  // 점성 차트 (정확한 ephemeris 없으면 mock — 실제 운영에서는 계산 엔진이 채움)
  astro: {
    dominantWesternElement: 'fire' | 'earth' | 'air' | 'water'
    planetSigns: Record<string, string>
    planetHouses: Record<string, number>
    aspects: Array<{ planet1: string; planet2: string; type: string }>
    activeTransits: string[]
  }
}

const profiles: Profile[] = [
  {
    label: 'A. 1995-02-09 06:40 서울 남',
    date: '1995-02-09', time: '06:40', gender: 'male', city: '서울',
    astro: {
      dominantWesternElement: 'air',
      planetSigns: {
        Sun: 'Aquarius', Moon: 'Cancer', Mercury: 'Aquarius', Venus: 'Capricorn',
        Mars: 'Sagittarius', Jupiter: 'Sagittarius', Saturn: 'Pisces',
        Uranus: 'Aquarius', Neptune: 'Capricorn', Pluto: 'Scorpio',
        Ascendant: 'Pisces', Midheaven: 'Sagittarius',
      },
      planetHouses: { Sun: 11, Moon: 8, Mercury: 11, Venus: 10, Mars: 9, Jupiter: 9, Saturn: 1, Uranus: 11, Pluto: 8 },
      aspects: [
        { planet1: 'Sun', planet2: 'Moon', type: 'square' },
        { planet1: 'Sun', planet2: 'Saturn', type: 'square' },
        { planet1: 'Mars', planet2: 'Jupiter', type: 'conjunction' },
        { planet1: 'Venus', planet2: 'Pluto', type: 'trine' },
      ],
      activeTransits: ['saturn return', 'jupiter on natal MC'],
    },
  },
  {
    label: 'B. 1990-07-15 14:20 부산 여',
    date: '1990-07-15', time: '14:20', gender: 'female', city: '부산',
    astro: {
      dominantWesternElement: 'fire',
      planetSigns: {
        Sun: 'Cancer', Moon: 'Scorpio', Mercury: 'Cancer', Venus: 'Leo',
        Mars: 'Taurus', Jupiter: 'Cancer', Saturn: 'Capricorn',
        Uranus: 'Capricorn', Neptune: 'Capricorn', Pluto: 'Scorpio',
        Ascendant: 'Libra', Midheaven: 'Cancer',
      },
      planetHouses: { Sun: 10, Moon: 2, Mercury: 9, Venus: 11, Mars: 8, Jupiter: 10, Saturn: 4, Uranus: 4, Pluto: 2 },
      aspects: [
        { planet1: 'Sun', planet2: 'Pluto', type: 'opposition' },
        { planet1: 'Venus', planet2: 'Mars', type: 'square' },
        { planet1: 'Moon', planet2: 'Jupiter', type: 'trine' },
        { planet1: 'Saturn', planet2: 'Uranus', type: 'conjunction' },
        { planet1: 'Mercury', planet2: 'Saturn', type: 'sextile' },
      ],
      activeTransits: ['pluto on natal Moon', '명왕성', 'neptune square Sun'],
    },
  },
  {
    label: 'C. 1985-11-03 09:00 인천 남',
    date: '1985-11-03', time: '09:00', gender: 'male', city: '인천',
    astro: {
      dominantWesternElement: 'water',
      planetSigns: {
        Sun: 'Scorpio', Moon: 'Aries', Mercury: 'Scorpio', Venus: 'Sagittarius',
        Mars: 'Cancer', Jupiter: 'Aquarius', Saturn: 'Scorpio',
        Uranus: 'Sagittarius', Neptune: 'Capricorn', Pluto: 'Scorpio',
        Ascendant: 'Sagittarius', Midheaven: 'Virgo',
      },
      planetHouses: { Sun: 11, Moon: 4, Mercury: 11, Venus: 1, Mars: 7, Jupiter: 2, Saturn: 11, Uranus: 1, Pluto: 11 },
      aspects: [
        { planet1: 'Sun', planet2: 'Mars', type: 'opposition' },
        { planet1: 'Mercury', planet2: 'Saturn', type: 'conjunction' },
        { planet1: 'Venus', planet2: 'Jupiter', type: 'trine' },
        { planet1: 'Moon', planet2: 'Saturn', type: 'square' },
      ],
      activeTransits: ['jupiter on natal Sun', 'uranus square Saturn'],
    },
  },
]

function runOne(p: Profile): void {
  const saju = calculateSajuData(p.date, p.time, p.gender, 'solar', 'Asia/Seoul')

  const sibsinDistribution: Record<string, number> = {}
  for (const pl of [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.timePillar]) {
    if (!pl) continue
    const ss = (pl as any).sibsin
    if (ss?.cheon) sibsinDistribution[ss.cheon] = (sibsinDistribution[ss.cheon] || 0) + 1
    if (ss?.ji) sibsinDistribution[ss.ji] = (sibsinDistribution[ss.ji] || 0) + 1
  }

  const now = new Date()
  const year = now.getFullYear()
  const idx = (year - 4 + 6000) % 60
  const STEMS_EL: Record<number, string> = { 0: '목', 1: '목', 2: '화', 3: '화', 4: '토', 5: '토', 6: '금', 7: '금', 8: '수', 9: '수' }
  const currentSaeunElement = STEMS_EL[idx % 10]

  const daeWoonList = saju.daeWoon?.list || []
  const ageNow = year - Number(p.date.slice(0, 4))
  const currentDaeun: any = daeWoonList.find((d: any) => ageNow >= d.startAge && ageNow < d.startAge + 10)

  const input: any = {
    dayMasterElement: saju.dayMaster.element,
    pillarElements: {
      year: { stem: saju.yearPillar?.heavenlyStem?.element, branch: saju.yearPillar?.earthlyBranch?.element },
      month: { stem: saju.monthPillar?.heavenlyStem?.element, branch: saju.monthPillar?.earthlyBranch?.element },
      day: { stem: saju.dayPillar?.heavenlyStem?.element, branch: saju.dayPillar?.earthlyBranch?.element },
      time: { stem: saju.timePillar?.heavenlyStem?.element, branch: saju.timePillar?.earthlyBranch?.element },
    },
    sibsinDistribution,
    twelveStages: {},
    geokguk: undefined,
    yongsin: undefined,
    currentDaeunElement: currentDaeun?.heavenlyStem?.element,
    currentSaeunElement,
    currentWolunElement: '화',
    currentIljinElement: '수',
    currentIljinDate: now.toISOString().slice(0, 10),
    shinsalList: ['천을귀인', '도화', '백호'],
    relations: [{ kind: '천간충', detail: 'mock' }],
    dominantWesternElement: p.astro.dominantWesternElement,
    planetHouses: p.astro.planetHouses,
    planetSigns: p.astro.planetSigns,
    aspects: p.astro.aspects,
    activeTransits: p.astro.activeTransits,
    asteroidHouses: { Juno: 7, Vesta: 6 },
    extraPointSigns: { Vertex: 'Leo', PartOfFortune: 'Virgo' },
    advancedAstroSignals: { solarReturn: true, lunarReturn: true, eclipses: true },
    sajuSnapshot: { fiveElements: saju.fiveElements },
    lang: 'ko',
    startYearMonth: now.toISOString().slice(0, 7),
  }

  const text = synthesizeExpertNarrationKo(input)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(p.label)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`일간: ${saju.dayMaster.name} (${saju.dayMaster.element})`)
  console.log(`사주: ${saju.yearPillar?.heavenlyStem?.name}${saju.yearPillar?.earthlyBranch?.name}/${saju.monthPillar?.heavenlyStem?.name}${saju.monthPillar?.earthlyBranch?.name}/${saju.dayPillar?.heavenlyStem?.name}${saju.dayPillar?.earthlyBranch?.name}/${saju.timePillar?.heavenlyStem?.name}${saju.timePillar?.earthlyBranch?.name}`)
  console.log(`5행: 목${saju.fiveElements.wood} 화${saju.fiveElements.fire} 토${saju.fiveElements.earth} 금${saju.fiveElements.metal} 수${saju.fiveElements.water}`)
  console.log(`Sun: ${p.astro.planetSigns.Sun} / Moon: ${p.astro.planetSigns.Moon} / ASC: ${p.astro.planetSigns.Ascendant}`)
  console.log(`총 길이: ${text.length}자`)
  console.log()

  // 메인 본문 첫 단락만 (cross 검증)
  const mainParas = text.split('\n\n')
  console.log('▶ 첫 cross 단락:')
  console.log(mainParas[0])
  console.log()

  // ASC × 일간 cross
  const ascParaIdx = mainParas.findIndex((p) => p.includes('상승') && p.includes('일간'))
  if (ascParaIdx >= 0) {
    console.log('▶ ASC × 일간 cross:')
    console.log(mainParas[ascParaIdx])
    console.log()
  }

  // 5행 분포
  const fiveParaIdx = mainParas.findIndex((p) => p.includes('5행 분포로는'))
  if (fiveParaIdx >= 0) {
    console.log('▶ 5행 분포 풀이:')
    console.log(mainParas[fiveParaIdx])
    console.log()
  }
}

for (const p of profiles) {
  runOne(p)
  console.log()
}
