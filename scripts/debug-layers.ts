// 각 셀의 레이어별 평균 polarity 확인
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { SignalLayer } from '@/lib/calendar-engine/types'

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
    start: '2026-05-01T00:00:00.000Z',
    end: '2026-05-09T23:59:59.999Z',
    granularity: 'day',
  })

  for (const c of cells) {
    const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily']
    const layerAvgs: Record<string, number> = {}
    for (const l of layers) {
      const sigs = c.signals.filter((s) => s.layer === l)
      if (sigs.length === 0) { layerAvgs[l] = 0; continue }
      layerAvgs[l] = sigs.reduce((sum, s) => sum + s.polarity * s.weight, 0) / sigs.length
    }
    const total = Object.values(layerAvgs).reduce((a, b) => a + b, 0) / 4
    console.log(`${c.datetime.slice(5,10)}  D=${layerAvgs.decadal.toFixed(2)} Y=${layerAvgs.yearly.toFixed(2)} M=${layerAvgs.monthly.toFixed(2)} d=${layerAvgs.daily.toFixed(2)}  total=${total.toFixed(2)}`)
  }
}
main().catch(console.error)
