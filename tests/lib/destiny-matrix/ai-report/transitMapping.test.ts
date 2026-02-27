import { describe, expect, it } from 'vitest'
import { mapMajorTransitsToActiveTransits } from '@/lib/destiny-matrix/ai-report/transitMapping'

describe('mapMajorTransitsToActiveTransits', () => {
  it('returns non-empty activeTransits when majorTransits exist', () => {
    const majorTransits = [
      { transitPlanet: 'Saturn', natalPlanet: 'Saturn', type: 'conjunction' },
      { transitPlanet: 'Jupiter', natalPlanet: 'Jupiter', type: 'conjunction' },
      { transitPlanet: 'Pluto', natalPlanet: 'Sun', type: 'square' },
    ]

    const active = mapMajorTransitsToActiveTransits(majorTransits, 8)

    expect(active.length).toBeGreaterThan(0)
    expect(active).toContain('saturnReturn')
    expect(active).toContain('jupiterReturn')
    expect(active).toContain('plutoTransit')
  })
})
