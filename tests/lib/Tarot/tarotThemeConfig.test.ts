import { describe, expect, it } from 'vitest'
import { CARD_COLORS, getThemeDisplayInfo, THEME_DISPLAY_INFO } from '@/lib/tarot/tarotThemeConfig'
import { DECK_STYLES } from '@/lib/tarot/tarot.types'

describe('tarotThemeConfig', () => {
  describe('CARD_COLORS', () => {
    it('matches DECK_STYLES length and order', () => {
      expect(CARD_COLORS.length).toBe(DECK_STYLES.length)
      CARD_COLORS.forEach((c, i) => {
        expect(c.id).toBe(DECK_STYLES[i])
      })
    })

    it('every color has id, name, gradient, accent, backImage', () => {
      for (const c of CARD_COLORS) {
        expect(c.id.length).toBeGreaterThan(0)
        expect(c.name.length).toBeGreaterThan(0)
        expect(c.gradient.length).toBeGreaterThan(0)
        expect(c.accent.length).toBeGreaterThan(0)
        expect(c.backImage.length).toBeGreaterThan(0)
      }
    })
  })

  describe('THEME_DISPLAY_INFO', () => {
    it('only general-insight remains after spread collapse', () => {
      expect(Object.keys(THEME_DISPLAY_INFO)).toEqual(['general-insight'])
    })

    it('general-insight entry has all required fields', () => {
      const info = THEME_DISPLAY_INFO['general-insight']
      expect(info.guidanceIcon.length).toBeGreaterThan(0)
      expect(info.guidanceTitle.length).toBeGreaterThan(0)
      expect(info.guidanceTitleKo.length).toBeGreaterThan(0)
      expect(info.affirmationTitle.length).toBeGreaterThan(0)
      expect(info.affirmationTitleKo.length).toBeGreaterThan(0)
    })
  })

  describe('getThemeDisplayInfo', () => {
    it('returns general-insight info for general-insight key', () => {
      expect(getThemeDisplayInfo('general-insight').guidanceTitle).toBe('Key Insight')
    })

    it('falls back to general-insight for unknown / removed theme ids', () => {
      // 우리가 옛 테마 다 지웠으니 무엇이 들어와도 general-insight 로 폴백
      expect(getThemeDisplayInfo('love-relationships').guidanceTitle).toBe('Key Insight')
      expect(getThemeDisplayInfo('career-work').guidanceTitle).toBe('Key Insight')
      expect(getThemeDisplayInfo(undefined).guidanceTitle).toBe('Key Insight')
      expect(getThemeDisplayInfo('').guidanceTitle).toBe('Key Insight')
    })
  })
})
