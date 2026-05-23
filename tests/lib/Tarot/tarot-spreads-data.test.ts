import { describe, expect, it } from 'vitest'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'

const byThemeId = Object.fromEntries(tarotThemes.map((t) => [t.id, t]))
const allSpreads = tarotThemes.flatMap((t) => t.spreads)

describe('tarotThemes — general-insight (canonical) lineup', () => {
  it('keeps the general-insight category', () => {
    expect(byThemeId['general-insight']).toBeTruthy()
  })

  it('general-insight has exactly the 4 canonical spreads', () => {
    const ids = byThemeId['general-insight'].spreads.map((s) => s.id).sort()
    expect(ids).toEqual(
      ['celtic-cross', 'general-cross', 'past-present-future', 'quick-reading'].sort()
    )
  })

  it('canonical card counts: 1 / 3 / 5 / 7', () => {
    const byId = Object.fromEntries(
      byThemeId['general-insight'].spreads.map((s) => [s.id, s.cardCount])
    )
    expect(byId['quick-reading']).toBe(1)
    expect(byId['past-present-future']).toBe(3)
    expect(byId['general-cross']).toBe(5)
    expect(byId['celtic-cross']).toBe(7)
  })
})

describe('tarotThemes — purpose-built categories', () => {
  it('exposes love / decision / career themes', () => {
    expect(byThemeId['love']).toBeTruthy()
    expect(byThemeId['decision']).toBeTruthy()
    expect(byThemeId['career']).toBeTruthy()
  })

  it('purpose spreads carry expected card counts', () => {
    const byId = Object.fromEntries(allSpreads.map((s) => [s.id, s.cardCount]))
    expect(byId['two-hearts']).toBe(3)
    expect(byId['relationship-cross']).toBe(5)
    expect(byId['yes-no']).toBe(1)
    expect(byId['crossroads']).toBe(4)
    expect(byId['career-path']).toBe(5)
  })
})

describe('tarotThemes — invariants across all spreads', () => {
  it('every spread id is unique', () => {
    const ids = allSpreads.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('positions arrays are empty — LLM names each seat from the user question', () => {
    for (const spread of allSpreads) {
      expect(spread.positions.length, `spread ${spread.id}`).toBe(0)
    }
  })

  it('every spread has a positive card count and KO + EN title', () => {
    for (const spread of allSpreads) {
      expect(spread.cardCount, `spread ${spread.id} count`).toBeGreaterThan(0)
      expect(spread.title.length, `spread ${spread.id} EN title`).toBeGreaterThan(0)
      expect(spread.titleKo!.length, `spread ${spread.id} KO title`).toBeGreaterThan(0)
    }
  })

  it('every theme has KO + EN category labels', () => {
    for (const theme of tarotThemes) {
      expect(theme.category.length, `theme ${theme.id} EN`).toBeGreaterThan(0)
      expect(theme.categoryKo!.length, `theme ${theme.id} KO`).toBeGreaterThan(0)
    }
  })
})
