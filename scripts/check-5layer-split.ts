// 5층 정렬일에 saju/astro가 각각 어떤 방향인지
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { SignalLayer } from '@/lib/calendar-engine/types'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const cells = await buildCalendar(natal, {
    start: '2026-05-10T00:00:00.000Z',
    end: '2026-05-10T23:59:59.999Z',
    granularity: 'day',
  })

  const c = cells[0]
  console.log('=== 2026-05-10 (5층 정렬일 후보) ===\n')

  const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily', 'hourly']
  for (const l of layers) {
    const sajuSigs = c.signals.filter((s) => s.layer === l && s.source === 'saju')
    const astroSigs = c.signals.filter((s) => s.layer === l && s.source === 'astro')

    const sajuAvg = sajuSigs.length === 0 ? 0
      : sajuSigs.reduce((a, s) => a + s.polarity * s.weight, 0) / sajuSigs.length
    const astroAvg = astroSigs.length === 0 ? 0
      : astroSigs.reduce((a, s) => a + s.polarity * s.weight, 0) / astroSigs.length
    const mixed = (sajuAvg * sajuSigs.length + astroAvg * astroSigs.length) /
                  Math.max(1, sajuSigs.length + astroSigs.length)

    console.log(`${l.padEnd(8)}  사주 ${sajuAvg.toFixed(2).padStart(5)} (n=${sajuSigs.length})  점성 ${astroAvg.toFixed(2).padStart(5)} (n=${astroSigs.length})  → 혼합 ${mixed.toFixed(2)}`)
  }
}
main().catch(console.error)
