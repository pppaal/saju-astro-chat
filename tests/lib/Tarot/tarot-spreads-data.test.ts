import { describe, expect, it } from 'vitest'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'

describe('tarotThemes — collapsed to general-insight only', () => {
  it('exposes exactly one category', () => {
    expect(tarotThemes.length).toBe(1)
    expect(tarotThemes[0].id).toBe('general-insight')
  })

  it('the single category has exactly 4 classic spreads', () => {
    const theme = tarotThemes[0]
    expect(theme.spreads.length).toBe(4)
  })

  it('spreads are the canonical 1·3·5·10 lineup', () => {
    const ids = tarotThemes[0].spreads.map((s) => s.id).sort()
    expect(ids).toEqual(
      ['celtic-cross', 'general-cross', 'past-present-future', 'quick-reading'].sort(),
    )
  })

  it('card counts match the lineup', () => {
    const byId = Object.fromEntries(tarotThemes[0].spreads.map((s) => [s.id, s.cardCount]))
    expect(byId['quick-reading']).toBe(1)
    expect(byId['past-present-future']).toBe(3)
    expect(byId['general-cross']).toBe(5)
    expect(byId['celtic-cross']).toBe(10)
  })

  it('every spread has positions array matching cardCount', () => {
    for (const spread of tarotThemes[0].spreads) {
      expect(spread.positions.length, `spread ${spread.id}`).toBe(spread.cardCount)
    }
  })

  it('every spread has KO + EN title', () => {
    for (const spread of tarotThemes[0].spreads) {
      expect(spread.title.length, `spread ${spread.id} EN title`).toBeGreaterThan(0)
      expect(spread.titleKo!.length, `spread ${spread.id} KO title`).toBeGreaterThan(0)
    }
  })

  it('every position has KO + EN title (description optional)', () => {
    for (const spread of tarotThemes[0].spreads) {
      for (const pos of spread.positions) {
        expect(pos.title.length).toBeGreaterThan(0)
        expect(pos.titleKo!.length).toBeGreaterThan(0)
      }
    }
  })
})
