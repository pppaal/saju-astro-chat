/**
 * Language-purity guard: the EN destiny-counselor context must not leak Korean
 * (Hangul) into the data injected for English users. The prompt instructs the
 * model to answer in English from this context, so any Hangul here risks
 * bleeding into the English reply. Hanja (사주 stems/branches like 甲戌) is
 * universal saju notation and intentionally kept.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext, type DestinyBirth } from '@/lib/destiny/counselorContext'

const HANGUL = /[가-힣]/
const BIRTH: DestinyBirth = {
  birthDate: '1990-05-15',
  birthTime: '08:30',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
}
const NOW = new Date('2026-06-16T00:00:00Z')

describe('destiny counselor context language purity', () => {
  it('EN context contains no Hangul', async () => {
    const ctx = await buildDestinyContext(BIRTH, NOW, 'en')
    const offenders = (ctx.stable + '\n' + ctx.daily)
      .split('\n')
      .filter((l) => HANGUL.test(l))
      .map((l) => l.trim())
    expect(offenders, `Hangul leaked into EN context:\n${offenders.join('\n')}`).toEqual([])
  }, 60000)

  it('KO context still renders Korean (no regression)', async () => {
    const ctx = await buildDestinyContext(BIRTH, NOW, 'ko')
    expect(ctx.stable.length).toBeGreaterThan(0)
    expect(HANGUL.test(ctx.stable + ctx.daily)).toBe(true)
  }, 60000)
})
