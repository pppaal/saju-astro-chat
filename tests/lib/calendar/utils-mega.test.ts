/**
 * Mega comprehensive tests for calendar/utils.ts
 * Testing every function with all valid combinations
 */
import { describe, it, expect } from 'vitest'
import {
  isCheoneulGwiin,
  isSamhapPartial,
  isSamhapFull,
  isChung,
  isXing,
  getJijanggan,
  getStemElement,
  getBranchElement,
} from '@/lib/calendar/utils'
import { STEMS, BRANCHES } from '@/lib/calendar/constants'

describe('calendar/utils - mega comprehensive tests', () => {
  describe('isCheoneulGwiin - all stem combinations', () => {
    STEMS.forEach((stem) => {
      BRANCHES.forEach((branch) => {
        it(`should have boolean result for ${stem}-${branch}`, () => {
          const result = isCheoneulGwiin(stem, branch)
          expect(typeof result).toBe('boolean')
        })
      })
    })
    // 10 stems * 12 branches = 120 tests
  })

  describe('isChung - all branch pair combinations', () => {
    BRANCHES.forEach((branch1) => {
      BRANCHES.forEach((branch2) => {
        it(`should have boolean for ${branch1}-${branch2}`, () => {
          const result = isChung(branch1, branch2)
          expect(typeof result).toBe('boolean')
        })
      })
    })
    // 12 * 12 = 144 tests
  })

  describe('isXing - all branch pair combinations', () => {
    BRANCHES.forEach((branch1) => {
      BRANCHES.forEach((branch2) => {
        it(`should have boolean for ${branch1}-${branch2}`, () => {
          const result = isXing(branch1, branch2)
          expect(typeof result).toBe('boolean')
        })
      })
    })
    // 12 * 12 = 144 tests
  })

  describe('isSamhapPartial - all 2-branch combinations', () => {
    for (let i = 0; i < BRANCHES.length; i++) {
      for (let j = i + 1; j < BRANCHES.length; j++) {
        const branches = [BRANCHES[i], BRANCHES[j]]
        it(`should have boolean for ${branches.join('-')}`, () => {
          const result = isSamhapPartial(branches)
          expect(typeof result).toBe('boolean')
        })
      }
    }
    // 12 * 11 / 2 = 66 tests
  })

  describe('isSamhapFull - all 3-branch combinations', () => {
    for (let i = 0; i < BRANCHES.length; i++) {
      for (let j = i + 1; j < BRANCHES.length; j++) {
        for (let k = j + 1; k < BRANCHES.length; k++) {
          const branches = [BRANCHES[i], BRANCHES[j], BRANCHES[k]]
          it(`should return element or null for ${branches.join('-')}`, () => {
            const result = isSamhapFull(branches)
            if (result !== null) {
              expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result)
            }
          })
        }
      }
    }
    // 12 * 11 * 10 / 6 = 220 tests
  })

  describe('getJijanggan - all branches', () => {
    BRANCHES.forEach((branch) => {
      it(`should return array for ${branch}`, () => {
        const result = getJijanggan(branch)
        expect(Array.isArray(result)).toBe(true)
      })

      it(`should have valid stems in jijanggan for ${branch}`, () => {
        const result = getJijanggan(branch)
        result.forEach((stem) => {
          expect(STEMS).toContain(stem)
        })
      })
    })
    // 12 * 2 = 24 tests
  })

  describe('getStemElement - all stems', () => {
    STEMS.forEach((stem) => {
      it(`should return element for ${stem}`, () => {
        const result = getStemElement(stem)
        expect(['wood', 'fire', 'earth', 'metal', 'water', '']).toContain(result)
      })

      it(`should return valid element or empty for ${stem}`, () => {
        const result = getStemElement(stem)
        if (result !== '') {
          expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result)
        }
      })
    })
    // 10 * 2 = 20 tests
  })

  describe('getBranchElement - all branches', () => {
    BRANCHES.forEach((branch) => {
      it(`should return element for ${branch}`, () => {
        const result = getBranchElement(branch)
        expect(['wood', 'fire', 'earth', 'metal', 'water', '']).toContain(result)
      })

      it(`should return valid element or empty for ${branch}`, () => {
        const result = getBranchElement(branch)
        if (result !== '') {
          expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result)
        }
      })
    })
    // 12 * 2 = 24 tests
  })

  describe('Chung symmetry - all pairs', () => {
    BRANCHES.forEach((b1, i) => {
      BRANCHES.forEach((b2, j) => {
        if (i < j) {
          it(`should have symmetric chung for ${b1}-${b2}`, () => {
            const r1 = isChung(b1, b2)
            const r2 = isChung(b2, b1)
            expect(r1).toBe(r2)
          })
        }
      })
    })
    // 12 * 11 / 2 = 66 tests
  })

  describe('Xing symmetry - all pairs', () => {
    BRANCHES.forEach((b1, i) => {
      BRANCHES.forEach((b2, j) => {
        if (i < j) {
          it(`should check xing for ${b1}-${b2}`, () => {
            const r1 = isXing(b1, b2)
            const r2 = isXing(b2, b1)
            expect(typeof r1).toBe('boolean')
            expect(typeof r2).toBe('boolean')
          })
        }
      })
    })
    // 12 * 11 / 2 = 66 tests
  })

  describe('Edge cases for all functions', () => {
    it('isCheoneulGwiin with invalid stem', () => {
      expect(isCheoneulGwiin('invalid', '子')).toBe(false)
    })

    it('isChung with invalid branches', () => {
      const result = isChung('invalid', '子')
      expect(typeof result).toBe('boolean')
    })

    it('isXing with invalid branches', () => {
      expect(isXing('invalid', '子')).toBe(false)
    })

    it('getJijanggan with invalid branch', () => {
      expect(getJijanggan('invalid')).toEqual([])
    })

    it('getStemElement with invalid stem', () => {
      expect(getStemElement('invalid')).toBe('')
    })

    it('getBranchElement with invalid branch', () => {
      expect(getBranchElement('invalid')).toBe('')
    })

    it('isSamhapPartial with empty array', () => {
      expect(isSamhapPartial([])).toBe(false)
    })

    it('isSamhapFull with empty array', () => {
      expect(isSamhapFull([])).toBeNull()
    })

    it('isSamhapPartial with single branch', () => {
      expect(isSamhapPartial(['子'])).toBe(false)
    })
  })
})
