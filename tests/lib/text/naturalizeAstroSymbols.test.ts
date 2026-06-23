import { describe, it, expect } from 'vitest'
import { naturalizeAstroSymbols } from '@/lib/text/naturalizeAstroSymbols'

describe('naturalizeAstroSymbols', () => {
  it('기호가 없는 평문은 그대로 둔다', () => {
    expect(naturalizeAstroSymbols('지금은 기다릴 때예요.')).toBe('지금은 기다릴 때예요.')
    expect(naturalizeAstroSymbols('This is your time to wait.')).toBe('This is your time to wait.')
  })

  describe('어스펙트 기호', () => {
    it('한국어 답변은 한국어 평어로 바꾼다', () => {
      expect(naturalizeAstroSymbols('두 별이 △을 이루고 있어요.')).toBe(
        '두 별이 조화을 이루고 있어요.'
      )
      expect(naturalizeAstroSymbols('☌ 결합이 강해요.')).toBe('결합 결합이 강해요.')
    })

    it('깨진 사각형(□ ☐ ⚺)은 모두 "긴장 결"로 모은다', () => {
      expect(naturalizeAstroSymbols('□ 신호')).toBe('긴장 결 신호')
      expect(naturalizeAstroSymbols('☐ 신호')).toBe('긴장 결 신호')
      expect(naturalizeAstroSymbols('⚺ 신호')).toBe('긴장 결 신호')
    })

    it('영어 답변은 영어 평어로 바꾼다 (한국어 누수 버그 회귀 방지)', () => {
      expect(naturalizeAstroSymbols('The two form a △ here.')).toBe('The two form a trine here.')
      expect(naturalizeAstroSymbols('A strong ☍ pulls at you.')).toBe(
        'A strong opposition pulls at you.'
      )
    })
  })

  describe('행성 / 별자리 / 역행', () => {
    it('한국어: 행성·별자리·역행 기호를 평어로 바꾼다', () => {
      expect(naturalizeAstroSymbols('♂ 역행(℞)이 ♏에 있어요.')).toBe(
        '화성 역행(역행)이 전갈자리에 있어요.'
      )
      expect(naturalizeAstroSymbols('☉와 ☽')).toBe('태양와 달')
    })

    it('영어: 행성·별자리 기호를 영어 이름으로 바꾼다', () => {
      expect(naturalizeAstroSymbols('Your ☉ sits in ♌.')).toBe('Your the Sun sits in Leo.')
      expect(naturalizeAstroSymbols('♀ ℞ in ♓')).toBe('Venus retrograde in Pisces')
    })
  })

  describe('도수 표기', () => {
    it('한국어: 23°45′ → 23도 45분', () => {
      expect(naturalizeAstroSymbols('화성 23°45′')).toBe('화성 23도 45분')
      expect(naturalizeAstroSymbols('12°')).toBe('12도')
      expect(naturalizeAstroSymbols('5°30′15″')).toBe('5도 30분 15초')
    })

    it('영어: prime 글리프를 ASCII 로 정규화한다', () => {
      expect(naturalizeAstroSymbols('Mars at 23°45′ now')).toBe("Mars at 23°45' now")
      expect(naturalizeAstroSymbols('exactly 12°')).toBe('exactly 12°')
    })
  })
})
