// 3종 5층 정렬 (saju+astro / saju / astro) 빈도
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const cells = await buildCalendar(natal, {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-12-31T23:59:59.999Z',
    granularity: 'day',
  })

  const both = cells.filter(c => c.matchedPatterns.some(p => p.id === 'five-layer-resonance'))
  const saju = cells.filter(c => c.matchedPatterns.some(p => p.id === 'saju-five-layer'))
  const astro = cells.filter(c => c.matchedPatterns.some(p => p.id === 'astro-five-layer'))

  console.log(`365일 매칭:`)
  console.log(`  사주×점성 동시:  ${both.length}일  (가장 강력)`)
  console.log(`  사주만:         ${saju.length}일`)
  console.log(`  점성만:         ${astro.length}일`)

  console.log(`\n사주×점성 동시 정렬일 (TOP 5):`)
  for (const c of both.slice(0, 5)) {
    console.log(`  ${c.datetime.slice(0,10)}  score=${c.derivedScore}`)
  }
}
main().catch(console.error)
