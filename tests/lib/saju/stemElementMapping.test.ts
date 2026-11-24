/**
 * Stem Element Mapping Tests
 *
 * Tests for heavenly stem to five element mapping
 */

import {
  STEM_TO_ELEMENT,
  ELEMENT_KO_TO_EN,
  STEM_TO_ELEMENT_EN,
  getElementEnFromStem,
} from '@/lib/saju/constants'

describe('STEM_TO_ELEMENT', () => {
  it('maps Chinese stems to Korean elements', () => {
    expect(STEM_TO_ELEMENT['甲']).toBe('목')
    expect(STEM_TO_ELEMENT['乙']).toBe('목')
    expect(STEM_TO_ELEMENT['丙']).toBe('화')
    expect(STEM_TO_ELEMENT['丁']).toBe('화')
    expect(STEM_TO_ELEMENT['戊']).toBe('토')
    expect(STEM_TO_ELEMENT['己']).toBe('토')
    expect(STEM_TO_ELEMENT['庚']).toBe('금')
    expect(STEM_TO_ELEMENT['辛']).toBe('금')
    expect(STEM_TO_ELEMENT['壬']).toBe('수')
    expect(STEM_TO_ELEMENT['癸']).toBe('수')
  })

  it('maps Korean stems to Korean elements', () => {
    expect(STEM_TO_ELEMENT['갑']).toBe('목')
    expect(STEM_TO_ELEMENT['을']).toBe('목')
    expect(STEM_TO_ELEMENT['병']).toBe('화')
    expect(STEM_TO_ELEMENT['정']).toBe('화')
    expect(STEM_TO_ELEMENT['무']).toBe('토')
    expect(STEM_TO_ELEMENT['기']).toBe('토')
    expect(STEM_TO_ELEMENT['경']).toBe('금')
    expect(STEM_TO_ELEMENT['신']).toBe('금')
    expect(STEM_TO_ELEMENT['임']).toBe('수')
    expect(STEM_TO_ELEMENT['계']).toBe('수')
  })

  it('has 20 entries (10 Chinese + 10 Korean)', () => {
    expect(Object.keys(STEM_TO_ELEMENT)).toHaveLength(20)
  })

  it('pairs same element for yin-yang pairs', () => {
    // 甲乙 are both Wood
    expect(STEM_TO_ELEMENT['甲']).toBe(STEM_TO_ELEMENT['乙'])
    // 丙丁 are both Fire
    expect(STEM_TO_ELEMENT['丙']).toBe(STEM_TO_ELEMENT['丁'])
    // 戊己 are both Earth
    expect(STEM_TO_ELEMENT['戊']).toBe(STEM_TO_ELEMENT['己'])
    // 庚辛 are both Metal
    expect(STEM_TO_ELEMENT['庚']).toBe(STEM_TO_ELEMENT['辛'])
    // 壬癸 are both Water
    expect(STEM_TO_ELEMENT['壬']).toBe(STEM_TO_ELEMENT['癸'])
  })
})

describe('ELEMENT_KO_TO_EN', () => {
  it('maps Korean elements to English', () => {
    expect(ELEMENT_KO_TO_EN['목']).toBe('Wood')
    expect(ELEMENT_KO_TO_EN['화']).toBe('Fire')
    expect(ELEMENT_KO_TO_EN['토']).toBe('Earth')
    expect(ELEMENT_KO_TO_EN['금']).toBe('Metal')
    expect(ELEMENT_KO_TO_EN['수']).toBe('Water')
  })

  it('has 5 elements', () => {
    expect(Object.keys(ELEMENT_KO_TO_EN)).toHaveLength(5)
  })
})

describe('STEM_TO_ELEMENT_EN', () => {
  it('maps Chinese stems to English elements', () => {
    expect(STEM_TO_ELEMENT_EN['甲']).toBe('wood')
    expect(STEM_TO_ELEMENT_EN['丙']).toBe('fire')
    expect(STEM_TO_ELEMENT_EN['戊']).toBe('earth')
    expect(STEM_TO_ELEMENT_EN['庚']).toBe('metal')
    expect(STEM_TO_ELEMENT_EN['壬']).toBe('water')
  })

  it('maps Korean stems to English elements', () => {
    expect(STEM_TO_ELEMENT_EN['갑']).toBe('wood')
    expect(STEM_TO_ELEMENT_EN['병']).toBe('fire')
    expect(STEM_TO_ELEMENT_EN['무']).toBe('earth')
    expect(STEM_TO_ELEMENT_EN['경']).toBe('metal')
    expect(STEM_TO_ELEMENT_EN['임']).toBe('water')
  })
})

describe('getElementEnFromStem', () => {
  it('returns English element for Chinese stem', () => {
    expect(getElementEnFromStem('甲')).toBe('wood')
    expect(getElementEnFromStem('丙')).toBe('fire')
    expect(getElementEnFromStem('戊')).toBe('earth')
    expect(getElementEnFromStem('庚')).toBe('metal')
    expect(getElementEnFromStem('壬')).toBe('water')
  })

  it('returns English element for Korean stem', () => {
    expect(getElementEnFromStem('갑')).toBe('wood')
    expect(getElementEnFromStem('병')).toBe('fire')
    expect(getElementEnFromStem('무')).toBe('earth')
    expect(getElementEnFromStem('경')).toBe('metal')
    expect(getElementEnFromStem('임')).toBe('water')
  })

  it('returns null for invalid stem', () => {
    expect(getElementEnFromStem('invalid')).toBeNull()
    expect(getElementEnFromStem('')).toBeNull()
  })
})

describe('Five Element theory', () => {
  it('has exactly 5 elements', () => {
    const uniqueElements = new Set(Object.values(STEM_TO_ELEMENT))
    expect(uniqueElements.size).toBe(5)
  })

  it('elements are 목, 화, 토, 금, 수', () => {
    const uniqueElements = new Set(Object.values(STEM_TO_ELEMENT))
    expect(uniqueElements.has('목')).toBe(true)
    expect(uniqueElements.has('화')).toBe(true)
    expect(uniqueElements.has('토')).toBe(true)
    expect(uniqueElements.has('금')).toBe(true)
    expect(uniqueElements.has('수')).toBe(true)
  })

  it('each element has 2 stems (yin and yang)', () => {
    const elements = ['목', '화', '토', '금', '수']
    for (const element of elements) {
      const stemsForElement = Object.entries(STEM_TO_ELEMENT)
        .filter(
          ([key, value]) =>
            value === element &&
            key.length === 1 &&
            !['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'].includes(key)
        )
        .map(([key]) => key)
      expect(stemsForElement.length).toBe(2)
    }
  })
})
