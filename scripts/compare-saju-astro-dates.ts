// 사주 정렬일 vs 점성 정렬일
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15', birthTime: '14:30', gender: 'male',
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const cells = await buildCalendar(natal, {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-12-31T23:59:59.999Z',
    granularity: 'day',
  })

  const sajuDates = cells.filter(c => c.matchedPatterns.some(p => p.id === 'saju-five-layer'))
    .map(c => c.datetime.slice(0,10))
  const astroDates = cells.filter(c => c.matchedPatterns.some(p => p.id === 'astro-five-layer'))
    .map(c => c.datetime.slice(0,10))

  console.log('사주 정렬일 (22):', sajuDates.join(', '))
  console.log('\n점성 정렬일 (5):', astroDates.join(', '))

  const both = sajuDates.filter(d => astroDates.includes(d))
  console.log(`\n겹치는 날: ${both.length}`)
  console.log(both)
}
main().catch(console.error)
