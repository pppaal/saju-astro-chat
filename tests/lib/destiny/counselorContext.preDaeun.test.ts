/**
 * 첫 대운 전 아이 — sajuFacts·상담사 컨텍스트가 '현재 대운'을 만들지 않는다
 * (엔진 감사 E14 · SAJU-7, OD-12).
 *
 * 2022-06-15 10:00 M 서울(골든 G22): 대운수 7, 첫 대운 丁未. 2026-11-24 에는 만 4세라
 * 대운 전이다 — facts.daeun.current = null, preDaeun = { startsAtAge: 7 }, 상담사 타이밍
 * 블록은 '현재' 표시 없이 '첫 대운 전' 줄을 싣는다(ko/en).
 */
import { describe, it, expect } from 'vitest'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { buildDestinyContext, type DestinyBirth } from '@/lib/destiny/counselorContext'

const CHILD: DestinyBirth = {
  birthDate: '2022-06-15',
  birthTime: '10:00',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
}
const SAJU_ONLY = { saju: true, astro: false }
// buildDestinyContext 의 now 는 사용자 tz 날짜의 UTC 정오(ensureCounselorContext 규약).
const BEFORE = new Date('2026-11-24T12:00:00Z')
const AFTER = new Date('2029-07-01T12:00:00Z')

describe('첫 대운 전 — sajuFacts', () => {
  it('current null + preDaeun 7 (2026-11-24), 丁未@7 + preDaeun null (2029-07-01)', async () => {
    const input = {
      birthDate: CHILD.birthDate,
      birthTime: CHILD.birthTime,
      gender: 'male' as const,
      timezone: CHILD.timezone!,
      longitude: CHILD.longitude,
    }
    const before = await collectSajuFacts({ ...input, now: BEFORE })
    expect(before.daeun.current).toBeNull()
    expect(before.daeun.preDaeun).toEqual({ startsAtAge: 7 })
    const after = await collectSajuFacts({ ...input, now: AFTER })
    expect(after.daeun.current?.heavenlyStem).toBe('丁')
    expect(after.daeun.current?.earthlyBranch).toBe('未')
    expect(after.daeun.preDaeun).toBeNull()
  })
})

describe('첫 대운 전 — 상담사 타이밍 블록', () => {
  it('ko: 현재 표시 없음 + "첫 대운 전: 7세부터 첫 대운"', async () => {
    const ctx = await buildDestinyContext(CHILD, BEFORE, 'ko', undefined, SAJU_ONLY)
    const daeunLine = ctx.daily.split('\n').find((l) => l.startsWith('대운:'))
    expect(daeunLine).toBeDefined()
    expect(daeunLine).not.toContain('현재')
    expect(ctx.daily).toContain('첫 대운 전: 7세부터 첫 대운')
  }, 60000)

  it('en: no "now" marker + "before the first daeun: it starts at age 7"', async () => {
    const ctx = await buildDestinyContext(CHILD, BEFORE, 'en', undefined, SAJU_ONLY)
    const daeunLine = ctx.daily.split('\n').find((l) => l.startsWith('daeun:'))
    expect(daeunLine).toBeDefined()
    expect(daeunLine).not.toContain('(now ')
    expect(ctx.daily).toContain('before the first daeun: it starts at age 7')
  }, 60000)

  it('대운이 시작한 뒤(2029-07-01)에는 현재 표시가 붙고 "첫 대운 전" 줄이 없다', async () => {
    const ctx = await buildDestinyContext(CHILD, AFTER, 'ko', undefined, SAJU_ONLY)
    const daeunLine = ctx.daily.split('\n').find((l) => l.startsWith('대운:'))
    expect(daeunLine).toContain('丁未(현재 ')
    expect(ctx.daily).not.toContain('첫 대운 전')
  }, 60000)
})
