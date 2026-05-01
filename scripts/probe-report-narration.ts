// @ts-nocheck
/**
 * 1995-02-09 06:40 AM Seoul, male — synthesizeExpertNarrationKo 출력 확인
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
import { determineGeokguk } from '../src/lib/Saju/geokguk'
import { getShinsalHits } from '../src/lib/Saju/shinsal'
import { synthesizeExpertNarrationKo } from '../src/lib/destiny-matrix/ai-report/sajuNarrationBridge'

const sajuResult = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')

const fiveElements = sajuResult.fiveElements
const sibsinDistribution: Record<string, number> = {}
for (const p of [sajuResult.yearPillar, sajuResult.monthPillar, sajuResult.dayPillar, sajuResult.timePillar]) {
  if (!p) continue
  const sibsin = (p as { sibsin?: { cheon?: string; ji?: string } }).sibsin
  if (sibsin?.cheon) sibsinDistribution[sibsin.cheon] = (sibsinDistribution[sibsin.cheon] || 0) + 1
  if (sibsin?.ji) sibsinDistribution[sibsin.ji] = (sibsinDistribution[sibsin.ji] || 0) + 1
}

const twelveStages: Record<string, number> = {}
const pillarElements = {
  year: { stem: sajuResult.yearPillar?.heavenlyStem?.element, branch: sajuResult.yearPillar?.earthlyBranch?.element },
  month: { stem: sajuResult.monthPillar?.heavenlyStem?.element, branch: sajuResult.monthPillar?.earthlyBranch?.element },
  day: { stem: sajuResult.dayPillar?.heavenlyStem?.element, branch: sajuResult.dayPillar?.earthlyBranch?.element },
  time: { stem: sajuResult.timePillar?.heavenlyStem?.element, branch: sajuResult.timePillar?.earthlyBranch?.element },
}

const now = new Date()
const currentYear = now.getFullYear()

// Year stem-branch (60-cycle)
const idx = (currentYear - 4 + 6000) % 60
const STEMS_EL: Record<number, string> = { 0: '목', 1: '목', 2: '화', 3: '화', 4: '토', 5: '토', 6: '금', 7: '금', 8: '수', 9: '수' }
const currentSaeunElement = STEMS_EL[idx % 10]

// Daeun: take current
const daeWoonList = sajuResult.daeWoon?.list || []
const ageNow = currentYear - 1995
const currentDaeun = daeWoonList.find((d: { startAge: number }) => ageNow >= d.startAge && ageNow < d.startAge + 10)
const currentDaeunElement = currentDaeun?.heavenlyStem?.element

// 진짜 격국 + 신살 계산
const pillarsInput = {
  yearPillar: sajuResult.yearPillar,
  monthPillar: sajuResult.monthPillar,
  dayPillar: sajuResult.dayPillar,
  timePillar: sajuResult.timePillar,
}
let geokgukResult: any = null
let shinsalList: string[] = []
try {
  geokgukResult = determineGeokguk(pillarsInput as any)
} catch (e) {
  console.log('[geokguk error]', e)
}
try {
  const hits = getShinsalHits(pillarsInput as any)
  shinsalList = Array.from(new Set(hits.map((h: any) => h.kind)))
} catch (e) {
  console.log('[shinsal error]', e)
}

const input: any = {
  dayMasterElement: sajuResult.dayMaster.element,
  pillarElements,
  sibsinDistribution,
  twelveStages,
  geokguk: geokgukResult?.primary,
  yongsin: geokgukResult?.yongsin
    ? ({ '목': '목', '화': '화', '토': '토', '금': '금', '수': '수' }[geokgukResult.yongsin] || undefined)
    : undefined,
  currentDaeunElement,
  currentSaeunElement,
  currentWolunElement: '화',
  currentIljinElement: '수',
  currentIljinDate: now.toISOString().slice(0, 10),
  shinsalList,
  // 1995-02-09 06:40 Seoul 남자 — Sun ~ 물병자리 끝, Moon Cancer 정도, 등등
  relations: [],
  dominantWesternElement: 'air' as const,
  planetHouses: { Sun: 11, Moon: 8, Mercury: 11, Venus: 10, Mars: 9, Jupiter: 9, Saturn: 1, Uranus: 11, Pluto: 8 },
  planetSigns: {
    Sun: 'Aquarius', Moon: 'Cancer', Mercury: 'Aquarius', Venus: 'Capricorn',
    Mars: 'Sagittarius', Jupiter: 'Sagittarius', Saturn: 'Pisces',
    Uranus: 'Aquarius', Neptune: 'Capricorn', Pluto: 'Scorpio',
    Ascendant: 'Pisces', Midheaven: 'Sagittarius',
  },
  aspects: [
    { planet1: 'Sun', planet2: 'Moon', type: 'square' },
    { planet1: 'Sun', planet2: 'Saturn', type: 'square' },
    { planet1: 'Mars', planet2: 'Jupiter', type: 'conjunction' },
    { planet1: 'Venus', planet2: 'Pluto', type: 'trine' },
    { planet1: 'Moon', planet2: 'Saturn', type: 'opposition' },
    { planet1: 'Mercury', planet2: 'Uranus', type: 'conjunction' },
    { planet1: 'Jupiter', planet2: 'Neptune', type: 'trine' },
    { planet1: 'Venus', planet2: 'Mars', type: 'sextile' },
  ],
  activeTransits: ['saturn return', 'jupiter on natal MC'],
  asteroidHouses: { Juno: 7, Vesta: 6, Ceres: 4, Pallas: 11 },
  extraPointSigns: { Vertex: 'Leo', PartOfFortune: 'Virgo' },
  advancedAstroSignals: { solarReturn: true, lunarReturn: true, eclipses: true, progressions: true },
  sajuSnapshot: {
    fiveElements,
  },
  lang: 'ko' as const,
  startYearMonth: now.toISOString().slice(0, 7),
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('1995-02-09 06:40 AM Seoul, male — 2026년 리포트')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log()
console.log(`일간: ${sajuResult.dayMaster.name} (${sajuResult.dayMaster.element}, ${sajuResult.dayMaster.yin_yang})`)
console.log(`사주: ${sajuResult.yearPillar?.heavenlyStem?.name}${sajuResult.yearPillar?.earthlyBranch?.name} / ${sajuResult.monthPillar?.heavenlyStem?.name}${sajuResult.monthPillar?.earthlyBranch?.name} / ${sajuResult.dayPillar?.heavenlyStem?.name}${sajuResult.dayPillar?.earthlyBranch?.name} / ${sajuResult.timePillar?.heavenlyStem?.name}${sajuResult.timePillar?.earthlyBranch?.name}`)
console.log(`격국: ${geokgukResult?.primary || '미정'} (confidence: ${geokgukResult?.confidence || '-'})`)
console.log(`신살: ${shinsalList.slice(0, 8).join(', ') || '없음'}`)
console.log(`5행 분포: 목${fiveElements.wood} 화${fiveElements.fire} 토${fiveElements.earth} 금${fiveElements.metal} 수${fiveElements.water}`)
console.log(`현재 대운: ${currentDaeun?.heavenlyStem?.name || '?'}${currentDaeun?.earthlyBranch?.name || '?'} (${currentDaeunElement || '?'}) — 시작 ${currentDaeun?.startAge}세`)
console.log(`현재 세운: 2026년 (${currentSaeunElement})`)
console.log()
console.log('━━━━━━ 2026 NARRATION ━━━━━━')
console.log()

const narration = synthesizeExpertNarrationKo(input)
console.log(narration)
console.log()
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`총 길이: ${narration.length}자`)
