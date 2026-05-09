import { describe, it, expect } from 'vitest'
import {
  calculateZodiacalReleasing,
  getActiveZRPeriod,
  getZRPeriodInterpretation,
} from '@/lib/astrology/foundation/zodiacalReleasing'

describe('zodiacal releasing', () => {
  it('Aries 시작 → Mars 15년', () => {
    const periods = calculateZodiacalReleasing('Aries', 90)
    expect(periods[0].sign).toBe('Aries')
    expect(periods[0].ruler).toBe('Mars')
    expect(periods[0].durationYears).toBe(15)
    expect(periods[0].startYear).toBe(0)
    expect(periods[0].endYear).toBe(15)
  })

  it('Taurus 시작 → Venus 8년', () => {
    const periods = calculateZodiacalReleasing('Taurus', 30)
    expect(periods[0].ruler).toBe('Venus')
    expect(periods[0].durationYears).toBe(8)
  })

  it('순환: Aries → Taurus → Gemini …', () => {
    const periods = calculateZodiacalReleasing('Aries', 50)
    expect(periods[0].sign).toBe('Aries')
    expect(periods[1].sign).toBe('Taurus')
    expect(periods[2].sign).toBe('Gemini')
  })

  it('Pisces 다음 → Aries 순환', () => {
    const periods = calculateZodiacalReleasing('Pisces', 100)
    expect(periods[0].sign).toBe('Pisces')
    // Pisces 12년 후 다음 = Aries
    expect(periods[1].sign).toBe('Aries')
  })

  it('yearsToProject 작동', () => {
    const short = calculateZodiacalReleasing('Aries', 15)
    expect(short.length).toBe(1)  // Mars 15년만
  })

  it('getActiveZRPeriod: 5세 = 첫 period', () => {
    const periods = calculateZodiacalReleasing('Aries', 50)
    const active = getActiveZRPeriod(periods, 5)
    expect(active?.sign).toBe('Aries')
  })

  it('getActiveZRPeriod: 16세 = 두번째 period (Aries 후)', () => {
    const periods = calculateZodiacalReleasing('Aries', 50)
    const active = getActiveZRPeriod(periods, 16)
    expect(active?.sign).toBe('Taurus')
  })

  it('Interpretation 텍스트 포함', () => {
    const periods = calculateZodiacalReleasing('Aries', 30)
    const text = getZRPeriodInterpretation(periods[0])
    expect(text).toContain('Aries')
    expect(text).toContain('Mars')
    expect(text).toContain('15')
  })
})
