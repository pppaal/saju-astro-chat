/**
 * 점수 매칭 측정 — 그래프 두 라인 평균 vs cell.derivedScore.
 *
 * 95.02.09 06:40 남자 서울 기준 한 달(2026-05)의 30일에 대해:
 *   - cell.derivedScore (진짜 점수, 전체 신호로 deriveScore)
 *   - sajuLine = deriveScore(source='saju' 신호)
 *   - astroLine = deriveScore(source='astro' 신호)
 *   - lineAvg = (sajuLine + astroLine) / 2
 *   - 차이 = derivedScore - lineAvg
 *
 * 결과로 일치도 / 평균 오차 / 최대 오차 측정.
 *
 * 실행: npx tsx scripts/check-score-alignment.ts
 */

import { buildCalendar } from '../src/lib/calendar-engine'
import { deriveScore } from '../src/lib/calendar-engine/derivers/score'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })

  const rangeStart = new Date(2026, 4, 1) // May 2026
  const rangeEnd = new Date(2026, 4, 31, 23, 59, 59)
  const cells = await buildCalendar(natal, {
    start: rangeStart.toISOString(),
    end: rangeEnd.toISOString(),
    granularity: 'day',
  })

  console.log(
    `\n${'date'.padEnd(12)} | ${'derived'.padStart(7)} | ${'saju'.padStart(5)} | ${'astro'.padStart(5)} | ${'avg'.padStart(5)} | ${'diff'.padStart(6)}`,
  )
  console.log('-'.repeat(58))

  const diffs: number[] = []
  for (const cell of cells) {
    const saju = cell.signals.filter((s) => s.source === 'saju')
    const astro = cell.signals.filter((s) => s.source === 'astro')
    const sajuLine = saju.length > 0 ? deriveScore(saju) : 50
    const astroLine = astro.length > 0 ? deriveScore(astro) : 50
    const lineAvg = Math.round((sajuLine + astroLine) / 2)
    const diff = cell.derivedScore - lineAvg
    diffs.push(diff)
    console.log(
      `${cell.datetime.slice(0, 10).padEnd(12)} | ${String(cell.derivedScore).padStart(7)} | ${String(sajuLine).padStart(5)} | ${String(astroLine).padStart(5)} | ${String(lineAvg).padStart(5)} | ${(diff >= 0 ? '+' : '') + diff}`.padEnd(6),
    )
  }

  const absDiffs = diffs.map((d) => Math.abs(d))
  const avgAbsDiff = absDiffs.reduce((a, b) => a + b, 0) / absDiffs.length
  const maxAbsDiff = Math.max(...absDiffs)
  const within3 = absDiffs.filter((d) => d <= 3).length
  const within5 = absDiffs.filter((d) => d <= 5).length
  console.log('\n' + '='.repeat(58))
  console.log(`평균 절대 오차 : ${avgAbsDiff.toFixed(2)}점`)
  console.log(`최대 절대 오차 : ${maxAbsDiff}점`)
  console.log(`±3점 이내      : ${within3}/${absDiffs.length} (${Math.round((within3 / absDiffs.length) * 100)}%)`)
  console.log(`±5점 이내      : ${within5}/${absDiffs.length} (${Math.round((within5 / absDiffs.length) * 100)}%)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
