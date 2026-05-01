// @ts-nocheck
/**
 * 1995-02-09 06:40 AM Seoul, male — synthesizeExpertNarrationKo 출력 확인
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
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

const input: any = {
  dayMasterElement: sajuResult.dayMaster.element,
  pillarElements,
  sibsinDistribution,
  twelveStages,
  geokguk: undefined,
  yongsin: undefined,
  currentDaeunElement,
  currentSaeunElement,
  currentWolunElement: '화',
  currentIljinElement: '수',
  currentIljinDate: now.toISOString().slice(0, 10),
  shinsalList: [],
  dominantWesternElement: 'air' as const,
  planetHouses: { Sun: 11, Moon: 8, Saturn: 1, Jupiter: 9 },
  planetSigns: { Sun: 'Aquarius', Moon: 'Cancer', Venus: 'Capricorn', Mars: 'Sagittarius' },
  aspects: Array(8).fill({}),
  activeTransits: [],
  lang: 'ko' as const,
  startYearMonth: now.toISOString().slice(0, 7),
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('1995-02-09 06:40 AM Seoul, male — 리포트 narration')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log()
console.log(`일간: ${sajuResult.dayMaster.name} (${sajuResult.dayMaster.element}, ${sajuResult.dayMaster.yin_yang})`)
console.log(`년주: ${sajuResult.yearPillar?.heavenlyStem?.name}${sajuResult.yearPillar?.earthlyBranch?.name}`)
console.log(`월주: ${sajuResult.monthPillar?.heavenlyStem?.name}${sajuResult.monthPillar?.earthlyBranch?.name}`)
console.log(`일주: ${sajuResult.dayPillar?.heavenlyStem?.name}${sajuResult.dayPillar?.earthlyBranch?.name}`)
console.log(`시주: ${sajuResult.timePillar?.heavenlyStem?.name}${sajuResult.timePillar?.earthlyBranch?.name}`)
console.log(`현재 대운: ${currentDaeun?.heavenlyStem?.name || '?'}${currentDaeun?.earthlyBranch?.name || '?'} (${currentDaeunElement || '?'})`)
console.log(`현재 세운: ${currentYear}년 (${currentSaeunElement})`)
console.log()
console.log('━━━━━━ NARRATION OUTPUT ━━━━━━')
console.log()

const narration = synthesizeExpertNarrationKo(input)
console.log(narration)
console.log()
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`총 길이: ${narration.length}자`)
