import { calculateYearlyImportantDates } from '@/app/api/calendar/lib/yearlyDates'
import type { UserSajuProfile, UserAstroProfile } from '@/lib/calendar/types'

const sajuProfile: UserSajuProfile = {
  dayMaster: '甲',
  yearStem: '庚',
  yearBranch: '午',
  monthStem: '戊',
  monthBranch: '寅',
  dayStem: '甲',
  dayBranch: '子',
  hourStem: '丙',
  hourBranch: '寅',
  fiveElements: { wood: 2, fire: 2, earth: 1, metal: 2, water: 1 },
} as unknown as UserSajuProfile

const astroProfile: UserAstroProfile = {
  sunSign: 'Capricorn',
  moonSign: 'Pisces',
  ascendant: 'Aries',
  dominantElement: 'Earth',
} as unknown as UserAstroProfile

const matrixContext = {
  domainScores: {
    career: { finalScoreAdjusted: 7.4 },
    love: { finalScoreAdjusted: 6.6 },
    money: { finalScoreAdjusted: 5.2 },
    health: { finalScoreAdjusted: 4.4 },
    move: { finalScoreAdjusted: 3.6 },
  },
  overlapTimelineByDomain: {
    career: [
      { month: '2026-01', overlapStrength: 0.18 },
      { month: '2026-02', overlapStrength: 0.32 },
      { month: '2026-03', overlapStrength: 0.62 },
      { month: '2026-04', overlapStrength: 0.88 },
      { month: '2026-05', overlapStrength: 0.71 },
      { month: '2026-06', overlapStrength: 0.45 },
      { month: '2026-07', overlapStrength: 0.22 },
      { month: '2026-08', overlapStrength: 0.34 },
      { month: '2026-09', overlapStrength: 0.66 },
      { month: '2026-10', overlapStrength: 0.78 },
      { month: '2026-11', overlapStrength: 0.42 },
      { month: '2026-12', overlapStrength: 0.16 },
    ],
    love: [
      { month: '2026-04', overlapStrength: 0.52 },
      { month: '2026-05', overlapStrength: 0.74 },
      { month: '2026-06', overlapStrength: 0.81 },
      { month: '2026-09', overlapStrength: 0.55 },
    ],
    money: [
      { month: '2026-02', overlapStrength: 0.62 },
      { month: '2026-08', overlapStrength: 0.5 },
      { month: '2026-11', overlapStrength: 0.7 },
    ],
    health: [
      { month: '2026-01', overlapStrength: 0.4 },
      { month: '2026-07', overlapStrength: 0.6 },
    ],
    move: [{ month: '2026-12', overlapStrength: 0.45 }],
  },
  timingCalibration: { reliabilityScore: 0.65 },
}

const dates = calculateYearlyImportantDates(2026, sajuProfile, astroProfile, {
  locale: 'ko',
  matrixContext: matrixContext as never,
})

const total = dates.length
const byGrade: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
for (const d of dates) byGrade[d.grade] = (byGrade[d.grade] || 0) + 1

console.log('=== 2026년 캘린더 해석 출력 (엔진 베이스) ===\n')
console.log(`총 일수: ${total}`)
console.log(
  `등급 분포: 0(대길)=${byGrade[0]} 1(길)=${byGrade[1]} 2(보통)=${byGrade[2]} 3(흉)=${byGrade[3]} 4(대흉)=${byGrade[4]}\n`
)

const samples = [
  { label: 'TOP 대길 (grade 0)', list: dates.filter((d) => d.grade === 0).slice(0, 2) },
  { label: '길 (grade 1)', list: dates.filter((d) => d.grade === 1).slice(0, 2) },
  { label: '보통 (grade 2)', list: dates.filter((d) => d.grade === 2).slice(0, 1) },
  { label: '흉 (grade 3)', list: dates.filter((d) => d.grade === 3).slice(0, 2) },
  { label: '대흉 (grade 4)', list: dates.filter((d) => d.grade === 4).slice(0, 2) },
]

for (const { label, list } of samples) {
  console.log(`\n────── ${label} ──────`)
  for (const d of list) {
    console.log(
      `\n📅 ${d.date}  | grade=${d.grade} | score=${d.score} | confidence=${d.confidence}`
    )
    console.log(`   카테고리: ${d.categories.join(', ')}`)
    console.log(`   crossVerified: ${d.crossVerified} | crossAgreement=${d.crossAgreementPercent}%`)
    console.log(`   ▸ title: ${d.titleKey}`)
    console.log(`   ▸ description: ${d.descKey}`)
    console.log(`   ▸ saju factors:`)
    for (const f of d.sajuFactorKeys) console.log(`       - ${f}`)
    console.log(`   ▸ astro factors:`)
    for (const f of d.astroFactorKeys) console.log(`       - ${f}`)
    console.log(`   ▸ recommendations: [${d.recommendationKeys.join(', ')}]`)
    console.log(`   ▸ warnings: [${d.warningKeys.join(', ')}]`)
  }
}
