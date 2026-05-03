// @ts-nocheck
/**
 * 1995-02-09 06:40 Seoul male — 진짜 ephemeris 기반 점성 + 사주 narration.
 * 격국·신살은 destiny-matrix 엔진 호출 필요 — 일부는 try/catch로 graceful.
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '../src/lib/astrology/foundation/aspects'
import { synthesizeExpertNarrationKo } from '../src/lib/destiny-matrix/ai-report/sajuNarrationBridge'

const SIGN_EL: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

async function main() {
  // ─── 사주 (실제 계산) ───
  const sajuResult = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const fiveElements = sajuResult.fiveElements
  const sibsinDistribution: Record<string, number> = {}
  for (const p of [sajuResult.yearPillar, sajuResult.monthPillar, sajuResult.dayPillar, sajuResult.timePillar]) {
    if (!p) continue
    const ss = (p as any).sibsin
    if (ss?.cheon) sibsinDistribution[ss.cheon] = (sibsinDistribution[ss.cheon] || 0) + 1
    if (ss?.ji) sibsinDistribution[ss.ji] = (sibsinDistribution[ss.ji] || 0) + 1
  }

  const pillarElements = {
    year: { stem: sajuResult.yearPillar?.heavenlyStem?.element, branch: sajuResult.yearPillar?.earthlyBranch?.element },
    month: { stem: sajuResult.monthPillar?.heavenlyStem?.element, branch: sajuResult.monthPillar?.earthlyBranch?.element },
    day: { stem: sajuResult.dayPillar?.heavenlyStem?.element, branch: sajuResult.dayPillar?.earthlyBranch?.element },
    time: { stem: sajuResult.timePillar?.heavenlyStem?.element, branch: sajuResult.timePillar?.earthlyBranch?.element },
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const idx = (currentYear - 4 + 6000) % 60
  const STEMS_EL: Record<number, string> = { 0: '목', 1: '목', 2: '화', 3: '화', 4: '토', 5: '토', 6: '금', 7: '금', 8: '수', 9: '수' }
  const currentSaeunElement = STEMS_EL[idx % 10]

  const daeWoonList = sajuResult.daeWoon?.list || []
  const ageNow = currentYear - 1995
  // daeWoon은 age 필드 사용 (startAge 아님)
  const currentDaeun: any = daeWoonList.find((d: any) => ageNow >= d.age && ageNow < d.age + 10)
  const STEM_TO_EL: Record<string, string> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
  const currentDaeunElement = currentDaeun?.heavenlyStem ? STEM_TO_EL[currentDaeun.heavenlyStem] : undefined

  // 월운/일운 element — 실제로는 절기 기반이지만 단순화하여 현재 달/날짜로 매핑
  const month = now.getMonth() + 1
  const MONTH_BRANCH_EL: Record<number, string> = {
    1: '수', 2: '토', 3: '목', 4: '목', 5: '토', 6: '화',
    7: '화', 8: '토', 9: '금', 10: '금', 11: '토', 12: '수',
  }
  const currentWolunElement = MONTH_BRANCH_EL[month]
  // 일진은 60갑자 cycle — 단순화: 오늘 날짜 ord
  const ord = Math.floor(now.getTime() / 86400000)
  const ILJIN_EL = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']
  const currentIljinElement = ILJIN_EL[ord % 10]

  // ─── 점성 (진짜 ephemeris) ───
  const chart = await calculateNatalChart({
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  for (const p of chart.planets || []) {
    if (p.name && p.sign) planetSigns[p.name] = p.sign
    if (p.name && typeof p.house === 'number') planetHouses[p.name] = p.house
  }
  if (chart.ascendant?.sign) planetSigns.Ascendant = chart.ascendant.sign
  if (chart.mc?.sign) planetSigns.Midheaven = chart.mc.sign

  // 어스펙트 (real) — findNatalAspects는 Chart 객체와 rules를 받음
  const natalAspects = findNatalAspects(chart as any) || []
  const aspects = natalAspects.map((a: any) => ({
    planet1: a.planet1, planet2: a.planet2, type: a.type, angle: a.angle ?? a.exactAngle, orb: a.orb,
  }))

  // dominantWesternElement — 행성별 element count
  const elCount: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const p of chart.planets || []) {
    if (p.sign && SIGN_EL[p.sign]) elCount[SIGN_EL[p.sign]]++
  }
  const dominantWesternElement = Object.entries(elCount).sort((a, b) => b[1] - a[1])[0]?.[0] as any

  const input: any = {
    dayMasterElement: sajuResult.dayMaster.element,
    pillarElements,
    sibsinDistribution,
    twelveStages: {},
    geokguk: undefined,  // destiny-matrix 엔진 필요
    yongsin: undefined,
    currentDaeunElement,
    currentSaeunElement,
    currentWolunElement,
    currentIljinElement,
    currentIljinDate: now.toISOString().slice(0, 10),
    shinsalList: [],  // destiny-matrix 엔진 필요
    relations: [],
    dominantWesternElement,
    planetHouses,
    planetSigns,
    aspects,
    activeTransits: ['saturn return'],  // ephemeris 트랜짓 lookup은 별도 필요
    asteroidHouses: {},
    extraPointSigns: {},
    advancedAstroSignals: {},
    sajuSnapshot: { fiveElements },
    lang: 'ko' as const,
    startYearMonth: `${currentYear}-${String(month).padStart(2, '0')}`,
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1995-02-09 06:40 Seoul, male — 진짜 계산값')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
  console.log(`일간: ${sajuResult.dayMaster.name} (${sajuResult.dayMaster.element}, ${sajuResult.dayMaster.yin_yang})`)
  console.log(`사주: ${sajuResult.yearPillar?.heavenlyStem?.name}${sajuResult.yearPillar?.earthlyBranch?.name} / ${sajuResult.monthPillar?.heavenlyStem?.name}${sajuResult.monthPillar?.earthlyBranch?.name} / ${sajuResult.dayPillar?.heavenlyStem?.name}${sajuResult.dayPillar?.earthlyBranch?.name} / ${sajuResult.timePillar?.heavenlyStem?.name}${sajuResult.timePillar?.earthlyBranch?.name}`)
  console.log(`5행: 목${fiveElements.wood} 화${fiveElements.fire} 토${fiveElements.earth} 금${fiveElements.metal} 수${fiveElements.water}`)
  console.log(`현재 대운: ${currentDaeun?.heavenlyStem ?? '?'}${currentDaeun?.earthlyBranch ?? '?'} (${currentDaeunElement ?? '?'}) — ${currentDaeun?.age ?? '?'}~${(currentDaeun?.age ?? 0) + 9}세`)
  console.log(`현재 세운: ${currentYear}년 (${currentSaeunElement})`)
  console.log(`이번 달 월운: ${currentWolunElement} / 오늘 일운: ${currentIljinElement}`)
  console.log()
  console.log(`Sun: ${planetSigns.Sun} ${planetHouses.Sun}H / Moon: ${planetSigns.Moon} ${planetHouses.Moon}H / ASC: ${planetSigns.Ascendant}`)
  console.log(`Mercury: ${planetSigns.Mercury} ${planetHouses.Mercury}H / Venus: ${planetSigns.Venus} ${planetHouses.Venus}H / Mars: ${planetSigns.Mars} ${planetHouses.Mars}H`)
  console.log(`Jupiter: ${planetSigns.Jupiter} ${planetHouses.Jupiter}H / Saturn: ${planetSigns.Saturn} ${planetHouses.Saturn}H`)
  console.log(`Uranus: ${planetSigns.Uranus} / Neptune: ${planetSigns.Neptune} / Pluto: ${planetSigns.Pluto}`)
  console.log(`Aspects 활성: ${aspects.length}개 (dominant element: ${dominantWesternElement})`)
  console.log()
  console.log('━━━━━━ NARRATION (real data) ━━━━━━')
  console.log()

  const narration = synthesizeExpertNarrationKo(input)
  console.log(narration)
  console.log()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`총 길이: ${narration.length}자`)
}

main().catch((e) => {
  console.error('PROBE FAILED:', e)
  process.exit(1)
})
