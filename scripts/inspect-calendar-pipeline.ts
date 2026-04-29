// 풀 파이프(라이트 → helpers → 응답) 끝까지 상담사 톤이 살아남는지 확인
import { calculateYearlyImportantDatesLite } from '@/app/api/calendar/lib/liteYearlyDates'
import { applyMatrixPreformatRegrade, formatDateForResponse } from '@/app/api/calendar/lib/helpers'
import koTranslations from '@/i18n/locales/ko'
import enTranslations from '@/i18n/locales/en'
import type { UserSajuProfile, UserAstroProfile } from '@/lib/destiny-map/calendar/types'

const sajuProfile: UserSajuProfile = {
  dayMaster: '甲',
  dayMasterElement: 'wood',
  dayBranch: '子',
  yearBranch: '午',
  pillars: {
    year: { stem: '庚', branch: '午' },
    month: { stem: '戊', branch: '寅' },
    day: { stem: '甲', branch: '子' },
    time: { stem: '丙', branch: '寅' },
  },
  yongsin: { primary: '화', type: '조후' },
  geokguk: { type: '정관격', strength: '신강' },
} as unknown as UserSajuProfile

const astroProfile: UserAstroProfile = {
  sunSign: 'Capricorn',
  sunElement: 'Earth',
  moonSign: 'Pisces',
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
      { month: '2026-04', overlapStrength: 0.88 },
      { month: '2026-10', overlapStrength: 0.78 },
    ],
    love: [{ month: '2026-06', overlapStrength: 0.81 }],
  },
  timingCalibration: { reliabilityScore: 0.65 },
}

const dates = calculateYearlyImportantDatesLite(2026, sajuProfile, astroProfile, {
  locale: 'ko',
  matrixContext: matrixContext as never,
})

const matrixRegraded = dates.map((d) => applyMatrixPreformatRegrade(d, matrixContext as never))

const formatted = matrixRegraded.slice(0, 5).map((d) =>
  formatDateForResponse(
    d as never,
    'ko',
    koTranslations as never,
    enTranslations as never,
    matrixContext as never,
    undefined,
    false
  )
)

console.log('=== 풀 파이프 응답 (lite → helpers → format) ===\n')
for (const item of formatted) {
  console.log(`📅 ${item.date} | grade=${item.grade} | score=${item.score} | confidence=${item.evidence?.confidence}`)
  console.log(`  title:        ${item.title}`)
  console.log(`  summary:      ${item.summary}`)
  console.log(`  description:  ${item.description}`)
  console.log(`  saju factors:`)
  for (const f of item.sajuFactors || []) console.log(`    - ${f}`)
  console.log(`  astro factors:`)
  for (const f of item.astroFactors || []) console.log(`    - ${f}`)
  console.log(`  recommendations: ${(item.recommendations || []).slice(0, 2).join(' / ')}`)
  console.log(`  warnings:        ${(item.warnings || []).slice(0, 2).join(' / ')}`)
  const cc = (item as { crossCheck?: { line: string; agreementPercent: number } }).crossCheck
  if (cc) console.log(`  cross-check:     [${cc.agreementPercent}%] ${cc.line}`)
  const gl = (item as { glossary?: Record<string, string> }).glossary
  if (gl) {
    console.log(`  glossary:`)
    for (const [k, v] of Object.entries(gl).slice(0, 6)) console.log(`    · ${k} = ${v}`)
  }
  console.log('')
}

// 행동플래너 슬롯 — 사주/점성 컨셉이 실제로 박혀나오는지 확인
import { buildRuleBasedTimeline } from '@/app/api/calendar/action-plan/routeActionPlanSupport'

const sample = formatted[0]
const slots = buildRuleBasedTimeline({
  date: sample.date,
  locale: 'ko',
  intervalMinutes: 60,
  calendar: {
    grade: sample.grade,
    displayGrade: sample.displayGrade,
    score: sample.score,
    displayScore: sample.displayScore,
    categories: sample.categories,
    bestTimes: sample.bestTimes,
    recommendations: sample.recommendations,
    warnings: sample.warnings,
    summary: sample.summary,
    sajuFactors: sample.sajuFactors,
    astroFactors: sample.astroFactors,
    evidence: sample.evidence,
  } as never,
})

console.log(`\n=== 행동플래너 슬롯 (${sample.date}) ===\n`)
for (const slot of slots.filter((s) => [9, 14, 21].includes(s.hour))) {
  console.log(`${slot.label} (${slot.tone}) — ${slot.note}`)
  for (const e of slot.evidenceSummary || []) console.log(`   · ${e}`)
}
