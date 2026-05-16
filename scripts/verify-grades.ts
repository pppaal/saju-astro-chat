import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { computeGradeThresholds, getGrade } from '../src/components/calendar/scoreGrade'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })

  // 1년치 빌드
  const cells = await buildCalendar(natal, {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-12-31T23:59:59.999Z',
    granularity: 'day',
  })

  const scores = cells.map((c) => c.derivedScore)
  const thresholds = computeGradeThresholds(scores)

  console.log('=== 365일 점수 분포 ===')
  console.log(`  최소: ${Math.min(...scores)}, 최대: ${Math.max(...scores)}, 평균: ${Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}`)
  console.log(`  임계값 (백분위 20/80): unluckyMax=${thresholds.unluckyMax}, luckyMin=${thresholds.luckyMin}`)

  // 등급별 카운트
  const buckets = { lucky: 0, neutral: 0, unlucky: 0 }
  for (const s of scores) {
    buckets[getGrade(s, thresholds).key]++
  }
  console.log('\n=== 등급별 카운트 (365일 기준) ===')
  console.log(`  길:   ${buckets.lucky}일  (${(buckets.lucky/365*100).toFixed(1)}%)`)
  console.log(`  평:   ${buckets.neutral}일  (${(buckets.neutral/365*100).toFixed(1)}%)`)
  console.log(`  흉:   ${buckets.unlucky}일  (${(buckets.unlucky/365*100).toFixed(1)}%)`)

  // 월별 분포
  console.log('\n=== 월별 길/평/흉 카운트 ===')
  for (let m = 0; m < 12; m++) {
    const monthCells = cells.filter((c) => new Date(c.datetime).getMonth() === m)
    const m_buckets = { lucky: 0, neutral: 0, unlucky: 0 }
    for (const c of monthCells) m_buckets[getGrade(c.derivedScore, thresholds).key]++
    console.log(`  ${String(m+1).padStart(2,' ')}월:  길 ${String(m_buckets.lucky).padStart(2,' ')} 평 ${String(m_buckets.neutral).padStart(2,' ')} 흉 ${String(m_buckets.unlucky).padStart(2,' ')}  (${monthCells.length}일)`)
  }
}

main().catch(console.error)
