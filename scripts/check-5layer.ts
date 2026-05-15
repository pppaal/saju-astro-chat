// 5층 정렬 패턴이 1년 중 며칠 매칭되는지
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
  const cells = await buildCalendar(natal, {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-12-31T23:59:59.999Z',
    granularity: 'day',
  })

  const fiveLayer = cells.filter((c) =>
    c.matchedPatterns.some((p) => p.id === 'five-layer-resonance'),
  )

  console.log(`365일 중 "5층 정렬" 매칭: ${fiveLayer.length}일`)
  for (const c of fiveLayer.slice(0, 15)) {
    const pat = c.matchedPatterns.find((p) => p.id === 'five-layer-resonance')!
    console.log(`  ${c.datetime.slice(0,10)}  score=${c.derivedScore}  strength=${pat.strength}`)
  }
}
main().catch(console.error)
