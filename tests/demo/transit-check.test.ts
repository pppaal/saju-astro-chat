import { it, expect } from 'vitest'
import { calculateTransitChart } from '@/lib/astrology/foundation/transit'

it('Swiss Ephemeris transit chart 작동 확인', async () => {
  const chart = await calculateTransitChart({
    iso: '2026-05-15T12:00:00',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })
  expect(chart.planets.length).toBeGreaterThan(0)
  console.log('Sun position:', chart.planets.find(p => p.name === 'Sun'))
}, 30000)
