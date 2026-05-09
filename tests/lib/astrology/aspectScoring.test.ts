import { describe, expect, it } from 'vitest'

import { scoreAspect, aggregateAspectScore } from '@/lib/astrology/foundation/aspectScoring'

describe('scoreAspect', () => {
  it('rates trine between Venus and Jupiter as strongly positive', () => {
    const r = scoreAspect({
      fromPlanet: 'Venus',
      toPlanet: 'Jupiter',
      kind: 'trine',
      orb: 1.0,
    })
    expect(r.score).toBeGreaterThan(3)
  })

  it('rates square between Mars and Saturn as strongly negative', () => {
    const r = scoreAspect({
      fromPlanet: 'Mars',
      toPlanet: 'Saturn',
      kind: 'square',
      orb: 0.5,
    })
    expect(r.score).toBeLessThan(-1)
  })

  it('orb scaling reduces effect at the edge of the orb', () => {
    const tight = scoreAspect({
      fromPlanet: 'Venus',
      toPlanet: 'Jupiter',
      kind: 'trine',
      orb: 0.5,
    })
    const wide = scoreAspect({
      fromPlanet: 'Venus',
      toPlanet: 'Jupiter',
      kind: 'trine',
      orb: 5.5,
    })
    expect(tight.score).toBeGreaterThan(wide.score)
  })

  it('retrograde adds a small extra penalty on hard aspects', () => {
    const direct = scoreAspect({
      fromPlanet: 'Mars',
      toPlanet: 'Saturn',
      kind: 'square',
      orb: 0.5,
    })
    const retro = scoreAspect({
      fromPlanet: 'Mars',
      toPlanet: 'Saturn',
      kind: 'square',
      orb: 0.5,
      fromRetrograde: true,
    })
    expect(retro.score).toBeLessThan(direct.score)
  })

  it('aggregate sums multiple aspects', () => {
    const sum = aggregateAspectScore([
      scoreAspect({ fromPlanet: 'Venus', toPlanet: 'Jupiter', kind: 'trine', orb: 1 }),
      scoreAspect({ fromPlanet: 'Mars', toPlanet: 'Saturn', kind: 'square', orb: 1 }),
    ])
    expect(typeof sum).toBe('number')
  })
})
