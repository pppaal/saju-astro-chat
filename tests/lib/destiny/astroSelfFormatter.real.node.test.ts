/**
 * Counselor "[Current transits]" block at the real instant (engine audit E5, ASTRO-4).
 *
 * formatAstroSelf passes now.toISOString() (a 'Z' instant) with the user's zone.
 * isoToJD used to drop the 'Z' and read the UTC string as Seoul wall time, so a
 * Seoul user's transit chart was computed 9 h early: the Moon sat at Taurus
 * 20°34′ instead of 26°09′, 'Moon square Jupiter' was fabricated and
 * 'Moon sextile Sun' went missing. Natal fixture: golden chart R16
 * (1997-03-21 14:30 Seoul). The formatter prints only the first 30 hits, so the
 * full hit list is checked through the same calculateTransitChart +
 * findTransitAspects calls, and the printed block for what it must not say.
 *
 * The global setup mocks swisseph, so this file unmocks it and runs under node;
 * it is skipped where the native module cannot load (E16).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph').then(
  () => true,
  () => false
)

const { calculateNatalChart, toChart } = await import('@/lib/astrology/foundation/astrologyService')
const { formatAstroSelf } = await import('@/lib/destiny/astroSelfFormatter')
const { calculateTransitChart, findTransitAspects } =
  await import('@/lib/astrology/foundation/transit')

const R16 = {
  year: 1997,
  month: 3,
  date: 21,
  hour: 14,
  minute: 30,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}
const NOW = new Date('2026-11-24T05:00:00.000Z')

describe.skipIf(!swissephAvailable)('formatAstroSelf transits — real ephemeris', () => {
  for (const timeZone of ['Asia/Seoul', 'America/Los_Angeles']) {
    it(`uses the absolute instant for a ${timeZone} viewer`, async () => {
      const chart = toChart(await calculateNatalChart(R16))
      const out = await formatAstroSelf({
        chart,
        latitude: R16.latitude,
        longitude: R16.longitude,
        timeZone,
        now: NOW,
        includeLunarReturn: false,
      })
      const block = out.slice(out.indexOf('[Current transits'), out.indexOf('[Upcoming Eclipses'))
      expect(block.startsWith('[Current transits')).toBe(true)
      // the Moon is in Taurus at 2026-11-24T05:00Z (26°09′), never Gemini
      expect(block).toMatch(/Moon \(transit\) in Taurus /)
      expect(block).not.toMatch(/Moon \(transit\) in Gemini/)
      expect(block).not.toMatch(/Moon \(transit\) in \w+ Square natal Jupiter/)
      expect(block).not.toMatch(/Moon \(transit\) in \w+ Square natal Ascendant/)

      // same calls, full list (the formatter keeps the first 30)
      const transit = await calculateTransitChart({
        iso: NOW.toISOString(),
        latitude: R16.latitude,
        longitude: R16.longitude,
        timeZone,
      })
      const moon = transit.planets.find((p) => p.name === 'Moon')!
      expect(moon.sign).toBe('Taurus')
      expect(moon.longitude).toBeCloseTo(56.156, 0)
      const keys = findTransitAspects(
        transit,
        chart,
        ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
        2.0
      ).map((a) => `${a.from.name} ${a.type} ${a.to.name}`)
      expect(keys).toContain('Moon sextile Sun')
      expect(keys).not.toContain('Moon square Jupiter')
      expect(keys).not.toContain('Moon square Ascendant')
    })
  }
})
