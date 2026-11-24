import { describe, expect, it } from 'vitest'
import { CARD_COLORS } from '@/lib/tarot/tarotThemeConfig'
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

  // THEME_DISPLAY_INFO / getThemeDisplayInfo 테스트는 두 export 가 dead code
  // 로 제거되며 같이 제거. 이전 의도(테마 카테고리별 가이드 UI 차별화)는
  // 도입된 적 없이 곧장 dead 가 됐다 — 미래에 다시 필요해지면 그때 테스트도.
})
