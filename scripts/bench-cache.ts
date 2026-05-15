// 캐시 hit vs miss 비교 (Redis는 dev에선 비활성일 수도 — InMemory만이라도 효과 봄)
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

  // 1차: cold (캐시 비어있음)
  const t1 = Date.now()
  await buildCalendar(natal, {
    start: '2026-05-01T00:00:00.000Z',
    end: '2026-05-31T23:59:59.999Z',
    granularity: 'day',
  })
  const tCold = Date.now() - t1

  // 2차: warm (Redis가 작동하면 hit)
  const t2 = Date.now()
  await buildCalendar(natal, {
    start: '2026-05-01T00:00:00.000Z',
    end: '2026-05-31T23:59:59.999Z',
    granularity: 'day',
  })
  const tWarm = Date.now() - t2

  console.log(`1차 (cold cache): ${tCold}ms`)
  console.log(`2차 (warm cache): ${tWarm}ms`)
  console.log(`개선: ${tCold - tWarm}ms (${tWarm > 0 ? (tCold/tWarm).toFixed(1) : '∞'}x)`)
}

main().catch(console.error)
