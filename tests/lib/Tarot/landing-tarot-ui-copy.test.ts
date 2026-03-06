import { describe, expect, it } from 'vitest'
import koLanding from '@/i18n/locales/ko/landing.json'
import enLanding from '@/i18n/locales/en/landing.json'

describe('Tarot landing UI copy coverage', () => {
  it('keeps tarot interaction keys aligned across ko/en locales', () => {
    const keys = [
      'tarotSectionTitle',
      'tarotSectionSubtitle',
      'tarotDeckLabel',
      'tarotDeckReset',
      'tarotPast',
      'tarotPresent',
      'tarotFuture',
      'tarotAdvice',
      'tarotInteractionHint',
    ] as const

    for (const key of keys) {
      expect(koLanding.landing[key]).toBeTruthy()
      expect(enLanding.landing[key]).toBeTruthy()
    }
  })

  it('ensures tarot interaction hint is meaningful copy, not placeholder text', () => {
    expect(koLanding.landing.tarotInteractionHint.length).toBeGreaterThan(10)
    expect(enLanding.landing.tarotInteractionHint.length).toBeGreaterThan(10)
    expect(koLanding.landing.tarotInteractionHint).not.toMatch(/TODO|TBD/i)
    expect(enLanding.landing.tarotInteractionHint).not.toMatch(/TODO|TBD/i)
  })
})
