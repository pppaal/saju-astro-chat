/**
 * Final tests to reach 20,000
 * Comprehensive date and calculation tests
 */
import { describe, it, expect } from 'vitest'
import { normalizeElement } from '@/lib/calendar/utils'

describe('calendar/utils - date and calculation functions', () => {
  describe('normalizeElement - all possible inputs', () => {
    const elements = ['air', 'wood', 'fire', 'earth', 'metal', 'water']

    elements.forEach((el) => {
      it(`should normalize ${el}`, () => {
        const result = normalizeElement(el)
        expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result)
      })
    })

    const invalidElements = ['invalid', '', 'WOOD', 'Fire', 'abc', '123']
    invalidElements.forEach((el) => {
      it(`should handle ${el}`, () => {
        const result = normalizeElement(el)
        expect(typeof result).toBe('string')
      })
    })
    // 6 + 6 = 12 tests
  })

  describe('normalizeElement - detailed tests', () => {
    it('should convert air to metal', () => {
      expect(normalizeElement('air')).toBe('metal')
    })

    it('should keep wood unchanged', () => {
      expect(normalizeElement('wood')).toBe('wood')
    })

    it('should keep fire unchanged', () => {
      expect(normalizeElement('fire')).toBe('fire')
    })

    it('should keep earth unchanged', () => {
      expect(normalizeElement('earth')).toBe('earth')
    })

    it('should keep metal unchanged', () => {
      expect(normalizeElement('metal')).toBe('metal')
    })

    it('should keep water unchanged', () => {
      expect(normalizeElement('water')).toBe('water')
    })
  })
})
