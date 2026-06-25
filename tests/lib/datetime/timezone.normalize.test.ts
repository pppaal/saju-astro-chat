import { describe, it, expect } from 'vitest'
import { isValidTimeZone, normalizeTimeZone } from '@/lib/datetime/timezone'
import { calculateSajuData } from '@/lib/saju/saju'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'

describe('isValidTimeZone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimeZone('Asia/Seoul')).toBe(true)
    expect(isValidTimeZone('America/New_York')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
  })
  it('rejects empty / junk / nullish', () => {
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('XYZ/Nowhere')).toBe(false)
    expect(isValidTimeZone('junk')).toBe(false)
    expect(isValidTimeZone(null)).toBe(false)
    expect(isValidTimeZone(undefined)).toBe(false)
  })
})

describe('normalizeTimeZone', () => {
  it('passes valid zones through', () => {
    expect(normalizeTimeZone('America/New_York')).toBe('America/New_York')
  })
  it('falls back to Asia/Seoul for invalid input', () => {
    expect(normalizeTimeZone('junk')).toBe('Asia/Seoul')
    expect(normalizeTimeZone('')).toBe('Asia/Seoul')
    expect(normalizeTimeZone(undefined)).toBe('Asia/Seoul')
  })
  it('honors a custom fallback', () => {
    expect(normalizeTimeZone('junk', 'UTC')).toBe('UTC')
  })
})

// Regression: a malformed/legacy timezone must NOT take down the birth
// engines (it used to throw RangeError deep inside, crashing every
// report/calendar/destiny request that touched it).
describe('engines tolerate an invalid timezone', () => {
  const bad = 'XYZ/Nowhere'
  it('calculateSajuData does not throw on a junk tz', () => {
    expect(() =>
      calculateSajuData('1990-05-15', '14:30', 'male', 'solar', bad, undefined, 126.978)
    ).not.toThrow()
  })
  it('collectAstroFacts returns facts (not null) on a junk tz', async () => {
    const facts = await collectAstroFacts({
      birthDate: '1990-05-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: bad,
    } as Parameters<typeof collectAstroFacts>[0])
    expect(facts).not.toBeNull()
  })
})
