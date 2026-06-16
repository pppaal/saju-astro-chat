/**
 * Language-purity guard: the EN destiny-counselor context must not leak Korean
 * (Hangul) into the data injected for English users. The prompt instructs the
 * model to answer in English from this context, so any Hangul here risks
 * bleeding into the English reply. Hanja (사주 stems/branches like 甲戌) is
 * universal saju notation and intentionally kept.
 *
 * NOTE: a single birthdate is NOT enough — Korean leaked from chart-specific
 * branches (special 격국 like 양인격/종왕격, and 12운성 stages 임관/왕지) that
 * only appear for some charts. This sweeps a spread of birthdates so those
 * code paths are actually exercised. Regression cases that previously leaked
 * are pinned explicitly below.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext, type DestinyBirth } from '@/lib/destiny/counselorContext'

const HANGUL = /[가-힣]/
const NOW = new Date('2026-06-16T00:00:00Z')

const base = (over: Partial<DestinyBirth>): DestinyBirth => ({
  birthDate: '1990-05-15',
  birthTime: '08:30',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  ...over,
})

// A spread that exercises varied 격국 / 12운성 / 신살 / 대운 paths.
// The first two previously leaked: 2001-08-09 → 왕지(stage), 1996-12-31 → 양인격.
const BIRTHS: DestinyBirth[] = [
  base({ birthDate: '2001-08-09', birthTime: '06:45', gender: 'female' }),
  base({ birthDate: '1996-12-31', birthTime: '12:00', gender: 'male' }),
  base({ birthDate: '1972-02-04', birthTime: '23:55', gender: 'male' }),
  base({ birthDate: '1985-11-23', birthTime: '03:10', gender: 'female' }),
  base({ birthDate: '1990-05-15', birthTime: '08:30', gender: 'male' }),
  base({ birthDate: '1980-07-21', birthTime: '18:20', gender: 'female' }),
  base({ birthDate: '2008-04-14', birthTime: '00:10', gender: 'male' }),
  base({ birthDate: '1966-08-08', birthTime: '14:30', gender: 'female' }),
]

describe('destiny counselor context language purity', () => {
  it('EN context contains no Hangul across varied charts', async () => {
    const offenders: string[] = []
    for (const birth of BIRTHS) {
      const ctx = await buildDestinyContext(birth, NOW, 'en')
      for (const l of (ctx.stable + '\n' + ctx.daily).split('\n')) {
        if (HANGUL.test(l)) offenders.push(`[${birth.birthDate} ${birth.birthTime}] ${l.trim()}`)
      }
    }
    expect(offenders, `Hangul leaked into EN context:\n${offenders.join('\n')}`).toEqual([])
  }, 60000)

  it('KO context still renders Korean (no regression)', async () => {
    const ctx = await buildDestinyContext(base({}), NOW, 'ko')
    expect(ctx.stable.length).toBeGreaterThan(0)
    expect(HANGUL.test(ctx.stable + ctx.daily)).toBe(true)
  }, 60000)
})
