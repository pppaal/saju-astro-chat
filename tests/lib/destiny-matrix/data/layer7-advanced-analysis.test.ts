import { describe, it, expect } from 'vitest'
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis'

describe('layer7-advanced-analysis', () => {
  it('should export ADVANCED_ANALYSIS_MATRIX', () => {
    expect(ADVANCED_ANALYSIS_MATRIX).toBeDefined()
  })

  it('should have geokguk pattern entries', () => {
    // Regular patterns (정격)
    expect(ADVANCED_ANALYSIS_MATRIX.jeonggwan).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.pyeongwan).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.jeongin).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.pyeongin).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.siksin).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.sanggwan).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.jeongjae).toBeDefined()
    expect(ADVANCED_ANALYSIS_MATRIX.pyeonjae).toBeDefined()
  })

  it('each geokguk should have progression types', () => {
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan

    expect(jeonggwan.secondary).toBeDefined()
    expect(jeonggwan.solarArc).toBeDefined()
    expect(jeonggwan.solarReturn).toBeDefined()
    expect(jeonggwan.lunarReturn).toBeDefined()
    expect(jeonggwan.draconic).toBeDefined()
    expect(jeonggwan.harmonics).toBeDefined()
  })

  it('each interaction code should have required properties', () => {
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan
    const secondary = jeonggwan.secondary

    expect(secondary).toHaveProperty('level')
    expect(secondary).toHaveProperty('score')
    expect(secondary).toHaveProperty('icon')
    expect(secondary).toHaveProperty('colorCode')
    expect(secondary).toHaveProperty('keyword')
    expect(secondary).toHaveProperty('keywordEn')
  })

  it('interaction code levels should be valid', () => {
    const validLevels = ['extreme', 'amplify', 'clash', 'balance', 'conflict']
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan

    expect(validLevels).toContain(jeonggwan.secondary.level)
    expect(validLevels).toContain(jeonggwan.solarArc.level)
    expect(validLevels).toContain(jeonggwan.solarReturn.level)
  })

  it('interaction code color codes should be valid', () => {
    const validColors = ['purple', 'green', 'blue', 'yellow', 'red']
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan

    expect(validColors).toContain(jeonggwan.secondary.colorCode)
    expect(validColors).toContain(jeonggwan.solarArc.colorCode)
  })

  it('scores should be numeric', () => {
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan

    expect(typeof jeonggwan.secondary.score).toBe('number')
    expect(typeof jeonggwan.solarArc.score).toBe('number')
    expect(typeof jeonggwan.solarReturn.score).toBe('number')
  })

  it('pyeongwan should have progression types', () => {
    const pyeongwan = ADVANCED_ANALYSIS_MATRIX.pyeongwan

    expect(pyeongwan.secondary).toBeDefined()
    expect(pyeongwan.solarArc).toBeDefined()
    expect(pyeongwan.draconic).toBeDefined()
  })

  it('jeongin should have progression types', () => {
    const jeongin = ADVANCED_ANALYSIS_MATRIX.jeongin

    expect(jeongin.secondary).toBeDefined()
    expect(jeongin.harmonics).toBeDefined()
  })

  it('siksin should have progression types', () => {
    const siksin = ADVANCED_ANALYSIS_MATRIX.siksin

    expect(siksin.secondary).toBeDefined()
    expect(siksin.solarReturn).toBeDefined()
    expect(siksin.lunarReturn).toBeDefined()
  })

  it('sanggwan should have progression types', () => {
    const sanggwan = ADVANCED_ANALYSIS_MATRIX.sanggwan

    expect(sanggwan.secondary).toBeDefined()
    expect(sanggwan.solarArc).toBeDefined()
  })

  it('keywords should be non-empty strings', () => {
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan

    expect(jeonggwan.secondary.keyword.length).toBeGreaterThan(0)
    expect(jeonggwan.secondary.keywordEn.length).toBeGreaterThan(0)
    expect(jeonggwan.solarArc.keyword.length).toBeGreaterThan(0)
  })

  it('icons should be non-empty strings', () => {
    const jeonggwan = ADVANCED_ANALYSIS_MATRIX.jeonggwan

    expect(jeonggwan.secondary.icon.length).toBeGreaterThan(0)
    expect(jeonggwan.solarArc.icon.length).toBeGreaterThan(0)
  })
})
