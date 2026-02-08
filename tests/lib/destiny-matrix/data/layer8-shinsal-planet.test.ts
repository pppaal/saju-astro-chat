import { describe, it, expect } from 'vitest'
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet'

describe('layer8-shinsal-planet', () => {
  it('should export SHINSAL_PLANET_MATRIX', () => {
    expect(SHINSAL_PLANET_MATRIX).toBeDefined()
  })

  it('should have 천을귀인 (Cheoneul Gwiin) entry', () => {
    expect(SHINSAL_PLANET_MATRIX['천을귀인']).toBeDefined()
  })

  it('should have 태극귀인 (Taegeuk Gwiin) entry', () => {
    expect(SHINSAL_PLANET_MATRIX['태극귀인']).toBeDefined()
  })

  it('should have 천덕귀인 (Cheondeok Gwiin) entry', () => {
    expect(SHINSAL_PLANET_MATRIX['천덕귀인']).toBeDefined()
  })

  it('천을귀인 should have planet entries', () => {
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return // Skip if not defined
    }

    expect(cheoneul.Sun).toBeDefined()
    expect(cheoneul.Moon).toBeDefined()
    expect(cheoneul.Mercury).toBeDefined()
    expect(cheoneul.Venus).toBeDefined()
    expect(cheoneul.Mars).toBeDefined()
    expect(cheoneul.Jupiter).toBeDefined()
    expect(cheoneul.Saturn).toBeDefined()
    expect(cheoneul.Uranus).toBeDefined()
    expect(cheoneul.Neptune).toBeDefined()
    expect(cheoneul.Pluto).toBeDefined()
  })

  it('each interaction code should have required properties', () => {
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    const sunEntry = cheoneul.Sun
    expect(sunEntry).toHaveProperty('level')
    expect(sunEntry).toHaveProperty('score')
    expect(sunEntry).toHaveProperty('icon')
    expect(sunEntry).toHaveProperty('colorCode')
    expect(sunEntry).toHaveProperty('keyword')
    expect(sunEntry).toHaveProperty('keywordEn')
  })

  it('interaction code levels should be valid', () => {
    const validLevels = ['extreme', 'amplify', 'clash', 'balance', 'conflict']
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    expect(validLevels).toContain(cheoneul.Sun.level)
    expect(validLevels).toContain(cheoneul.Moon.level)
    expect(validLevels).toContain(cheoneul.Jupiter.level)
  })

  it('interaction code color codes should be valid', () => {
    const validColors = ['purple', 'green', 'blue', 'yellow', 'red']
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    expect(validColors).toContain(cheoneul.Sun.colorCode)
    expect(validColors).toContain(cheoneul.Moon.colorCode)
  })

  it('scores should be numeric', () => {
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    expect(typeof cheoneul.Sun.score).toBe('number')
    expect(typeof cheoneul.Moon.score).toBe('number')
    expect(typeof cheoneul.Jupiter.score).toBe('number')
  })

  it('태극귀인 should have planet entries', () => {
    const taegeuk = SHINSAL_PLANET_MATRIX['태극귀인']
    if (!taegeuk) {
      return
    }

    expect(taegeuk.Sun).toBeDefined()
    expect(taegeuk.Moon).toBeDefined()
    expect(taegeuk.Jupiter).toBeDefined()
  })

  it('천덕귀인 should have planet entries', () => {
    const cheondeok = SHINSAL_PLANET_MATRIX['천덕귀인']
    if (!cheondeok) {
      return
    }

    expect(cheondeok.Sun).toBeDefined()
    expect(cheondeok.Moon).toBeDefined()
    expect(cheondeok.Jupiter).toBeDefined()
  })

  it('keywords should be non-empty strings', () => {
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    expect(cheoneul.Sun.keyword.length).toBeGreaterThan(0)
    expect(cheoneul.Sun.keywordEn.length).toBeGreaterThan(0)
    expect(cheoneul.Moon.keyword.length).toBeGreaterThan(0)
  })

  it('icons should be non-empty strings', () => {
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    expect(cheoneul.Sun.icon.length).toBeGreaterThan(0)
    expect(cheoneul.Moon.icon.length).toBeGreaterThan(0)
  })

  it('extreme level entries should have high scores', () => {
    const cheoneul = SHINSAL_PLANET_MATRIX['천을귀인']
    if (!cheoneul) {
      return
    }

    // Sun and Jupiter are 'extreme' level with score 10
    if (cheoneul.Sun.level === 'extreme') {
      expect(cheoneul.Sun.score).toBeGreaterThanOrEqual(9)
    }
    if (cheoneul.Jupiter.level === 'extreme') {
      expect(cheoneul.Jupiter.score).toBeGreaterThanOrEqual(9)
    }
  })
})
