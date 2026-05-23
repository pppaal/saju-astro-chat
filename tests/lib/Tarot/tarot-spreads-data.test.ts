import { describe, expect, it } from 'vitest'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'

describe('tarotThemes — dynamic 1·3·5·7 lineup', () => {
  it('exposes exactly one category', () => {
    expect(tarotThemes.length).toBe(1)
    expect(tarotThemes[0].id).toBe('general-insight')
  })

  it('the single category has exactly 4 spreads', () => {
    const theme = tarotThemes[0]
    expect(theme.spreads.length).toBe(4)
  })

  it('spreads keep canonical ids (quick-reading / past-present-future / general-cross / celtic-cross)', () => {
    const ids = tarotThemes[0].spreads.map((s) => s.id).sort()
    expect(ids).toEqual(
      ['celtic-cross', 'general-cross', 'past-present-future', 'quick-reading'].sort()
    )
  })

  it('card counts: 1 / 3 / 5 / 7 (celtic-cross repurposed from 10 → 7)', () => {
    const byId = Object.fromEntries(tarotThemes[0].spreads.map((s) => [s.id, s.cardCount]))
    expect(byId['quick-reading']).toBe(1)
    expect(byId['past-present-future']).toBe(3)
    expect(byId['general-cross']).toBe(5)
    expect(byId['celtic-cross']).toBe(7)
  })

  it('positions arrays are empty — LLM names each seat from the user question', () => {
    for (const spread of tarotThemes[0].spreads) {
      expect(spread.positions.length, `spread ${spread.id}`).toBe(0)
    }
  })

  it('every spread has KO + EN title', () => {
    for (const spread of tarotThemes[0].spreads) {
      expect(spread.title.length, `spread ${spread.id} EN title`).toBeGreaterThan(0)
      expect(spread.titleKo!.length, `spread ${spread.id} KO title`).toBeGreaterThan(0)
    }
  })
})
