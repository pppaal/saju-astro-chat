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

const formatted = matrixRegraded.map((d) =>
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

// 등급·도메인 다양하게 섞어서 6일 뽑기
const grade0 = formatted.filter((d) => d.grade === 0)[0]
const grade1Career = formatted.filter((d) => d.grade === 1 && d.categories.includes('career'))[0]
const grade1Love = formatted.filter((d) => d.grade === 1 && d.categories.includes('love'))[0]
const grade2 = formatted.filter((d) => d.grade === 2)[0]
const grade3 = formatted.filter((d) => d.grade === 3)[0]
const grade4 = formatted.filter((d) => d.grade === 4)[0]
const samples = [grade0, grade1Career, grade1Love, grade2, grade3, grade4].filter(Boolean)

console.log('=== 풀 파이프 응답 (lite → helpers → format) ===\n')
for (const item of samples) {
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

// 행동플래너: 대길(grade 0) 전체 24시간
for (const sample of [grade0].filter(Boolean)) {
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
      // 본명 사주 + 그날 공망 — date-detail에서 합쳐 들어오는 데이터를 시뮬레이션
      natalSaju: { dayStem: '甲', dayBranch: '子', yearBranch: '午' },
      gongmangBranches: ['戌', '亥'],
    } as never,
  })

  console.log(`\n=== 행동플래너 24시 (${sample.date} · grade=${sample.grade}) ===\n`)
  for (const slot of slots) {
    const tone = slot.tone === 'best' ? '🟢' : slot.tone === 'caution' ? '🔴' : '⚪'
    console.log(`${tone} ${slot.label}  ${slot.note}`)
  }
}

// 행동플래너: 대흉(grade 4) 전체 24시간
for (const sample of [grade4].filter(Boolean)) {
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
      // 본명 사주 + 그날 공망 — date-detail에서 합쳐 들어오는 데이터를 시뮬레이션
      natalSaju: { dayStem: '甲', dayBranch: '子', yearBranch: '午' },
      gongmangBranches: ['戌', '亥'],
    } as never,
  })

  console.log(`\n=== 행동플래너 24시 (${sample.date} · grade=${sample.grade}) ===\n`)
  for (const slot of slots) {
    const tone = slot.tone === 'best' ? '🟢' : slot.tone === 'caution' ? '🔴' : '⚪'
    console.log(`${tone} ${slot.label}  ${slot.note}`)
  }
}
