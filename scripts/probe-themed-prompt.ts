// @ts-nocheck
/**
 * themed report prompt가 LLM에 어떻게 전달되는지 확인.
 * synthesizeExpertNarrationKo가 잘 inject되는지 검증.
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '../src/lib/astrology/foundation/aspects'
import { synthesizeExpertNarrationKo } from '../src/lib/destiny-matrix/ai-report/sajuNarrationBridge'
import { buildThemedPrompt } from '../src/lib/destiny-matrix/ai-report/prompts/themedPrompts'

const SIGN_EL: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

async function main() {
  const saju = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const sibsinDistribution: Record<string, number> = {}
  for (const p of [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.timePillar]) {
    if (!p) continue
    const ss = (p as any).sibsin
    if (ss?.cheon) sibsinDistribution[ss.cheon] = (sibsinDistribution[ss.cheon] || 0) + 1
    if (ss?.ji) sibsinDistribution[ss.ji] = (sibsinDistribution[ss.ji] || 0) + 1
  }

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

  const natalAspects = findNatalAspects(chart as any) || []
  const aspects = natalAspects.map((a: any) => ({
    planet1: a.planet1, planet2: a.planet2, type: a.type,
  }))

  const elCount: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  for (const p of chart.planets || []) {
    if (p.sign && SIGN_EL[p.sign]) elCount[SIGN_EL[p.sign]]++
  }
  const dominantWesternElement = Object.entries(elCount).sort((a, b) => b[1] - a[1])[0]?.[0]

  const STEM_TO_EL: Record<string, string> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
  const ageNow = new Date().getFullYear() - 1995
  const currentDaeun: any = (saju.daeWoon?.list || []).find((d: any) => ageNow >= d.age && ageNow < d.age + 10)

  const matrixInput: any = {
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
    currentDaeunElement: currentDaeun?.heavenlyStem ? STEM_TO_EL[currentDaeun.heavenlyStem] : undefined,
    currentSaeunElement: '화',
    currentWolunElement: '토',
    currentIljinElement: '토',
    shinsalList: [],
    relations: [],
    dominantWesternElement,
    planetHouses,
    planetSigns,
    aspects,
    activeTransits: ['saturn return'],
    asteroidHouses: {},
    extraPointSigns: {},
    advancedAstroSignals: { solarReturn: true, lunarReturn: true },
    sajuSnapshot: { fiveElements: saju.fiveElements },
    lang: 'ko',
    startYearMonth: '2026-01',
  }

  const expertSkeleton = synthesizeExpertNarrationKo(matrixInput)

  // career theme prompt 빌드
  const themePrompt = buildThemedPrompt(
    'career',
    'ko',
    {
      name: '테스트',
      birthDate: '1995-02-09',
      dayMaster: saju.dayMaster.element,
      dayMasterElement: saju.dayMaster.element,
      sibsinDistribution,
    },
    {
      daeun: { heavenlyStem: currentDaeun?.heavenlyStem ?? '?', earthlyBranch: currentDaeun?.earthlyBranch ?? '?', element: currentDaeun?.heavenlyStem ? STEM_TO_EL[currentDaeun.heavenlyStem] : '?' },
      seun: { year: 2026, heavenlyStem: '丙', earthlyBranch: '午', element: '화' },
    } as any,
    'matrixSummary 자리 — 종합점수·도메인 grade·top 인사이트 (실제 운영에선 buildMatrixSummary 결과)',
    undefined,
    undefined,
    '내년 이직해야 할까요?',
    `[기존 deterministicCore promptBlock — 짧은 결정 요약]\n\n## 결정론적 본명 분석 skeleton (이 raw 분석을 바탕으로 career 관점에서 풀어쓰세요)\n\n${expertSkeleton}\n`
  )

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('CAREER theme prompt — LLM이 받는 전체 텍스트')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
  console.log(themePrompt)
  console.log()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Prompt 총 길이: ${themePrompt.length}자`)
  console.log(`그 중 expert skeleton: ${expertSkeleton.length}자`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1) })
