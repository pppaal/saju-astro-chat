import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })

  // 한 달
  const t1 = Date.now()
  const monthCells = await buildCalendar(natal, {
    start: '2026-05-01T00:00:00.000Z',
    end: '2026-05-31T23:59:59.999Z',
    granularity: 'day',
  })
  const tMonth = Date.now() - t1
  console.log(`한 달  (${monthCells.length}일): ${tMonth}ms`)

  // 1년
  const t2 = Date.now()
  const yearCells = await buildCalendar(natal, {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-12-31T23:59:59.999Z',
    granularity: 'day',
  })
  const tYear = Date.now() - t2
  console.log(`1년    (${yearCells.length}일): ${tYear}ms`)

  console.log(`\n비율: 1년 / 한 달 = ${(tYear/tMonth).toFixed(1)}x`)
  console.log(`절감: ${tYear - tMonth}ms (한 달만 호출 시)`)
}
main().catch(console.error)
