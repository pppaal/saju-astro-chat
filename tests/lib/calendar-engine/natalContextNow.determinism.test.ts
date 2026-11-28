/**
 * buildNatalContext — 주입형 now 결정론 (G12).
 *
 * 본명 컨텍스트에서 now 에 기대는 건 대운 목록 길이 하나다: 목록은 최소 10칸이고, 만 나이가
 * 첫 대운 + 100 을 넘으면 지금 흐르는 칸까지 늘어난다(daeunAge SSOT · daeunListLength).
 * 예전엔 BuildContextInput 에 now 가 없어 그 길이가 서버 시계를 따라갔다 — 같은 입력이
 * 언제 빌드하느냐에 따라 다른 컨텍스트가 됐고, 테스트로 고정할 수 없었다.
 *
 * 1925-03-30 08:44 F 뉴욕 — 첫 대운 1세, 만 101세(2026-11-25)에 庚寅@101 (currentDaeunParity).
 * 시스템 시계를 일부러 엉뚱한 해로 돌려 두고 now 만으로 결과가 정해지는지 본다.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { buildNatalContext, type BuildContextInput } from '@/lib/calendar-engine/context/build'
import { toLifetime } from '@/lib/calendar-view/toLifetime'

const BIRTH: BuildContextInput = {
  birthDate: '1925-03-30',
  birthTime: '08:44',
  gender: 'female',
  latitude: 40.4812,
  longitude: -73.8248,
  timeZone: 'America/New_York',
}
const AGE_99 = new Date('2024-11-25T03:00:00Z') // 뉴욕 2024-11-24 — 만 99세
const AGE_101 = new Date('2026-11-25T03:00:00Z') // 뉴욕 2026-11-24 — 만 101세

const lastCell = (n: Awaited<ReturnType<typeof buildNatalContext>>) => {
  const d = n.saju.daeun.at(-1)!
  return `${d.stem}${d.branch}@${d.startAge}`
}

afterEach(() => {
  vi.useRealTimers()
})

describe('buildNatalContext — now 주입 (G12)', () => {
  it('만 99세 now → 10칸(마지막 己丑@91), 시스템 시계가 2040 이어도', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2040-01-01T00:00:00Z') })
    const natal = await buildNatalContext({ ...BIRTH, now: AGE_99 })
    expect(natal.saju.daeun).toHaveLength(10)
    expect(lastCell(natal)).toBe('己丑@91')
  }, 60000)

  it('만 101세 now → 11칸(마지막 庚寅@101), 시스템 시계가 2020 이어도', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2020-01-01T00:00:00Z') })
    const natal = await buildNatalContext({ ...BIRTH, now: AGE_101 })
    expect(natal.saju.daeun).toHaveLength(11)
    expect(lastCell(natal)).toBe('庚寅@101')
    // Life 는 이 목록을 그대로 읽어도(재연장 없이) 지금 칸이 庚寅@101.
    const lt = toLifetime(natal, { birthYear: 1925, currentYear: 2026, manAge: 101 })
    expect(lt.daewoon.find((d) => d.now)?.gz.hanja).toBe('庚寅')
  }, 60000)

  it('같은 입력 + 같은 now → 같은 대운 목록 (시계와 무관)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2031-06-01T00:00:00Z') })
    const a = await buildNatalContext({ ...BIRTH, now: AGE_101 })
    vi.setSystemTime(new Date('2019-02-01T00:00:00Z'))
    const b = await buildNatalContext({ ...BIRTH, now: AGE_101 })
    expect(b.saju.daeun).toEqual(a.saju.daeun)
  }, 60000)

  it('보통 출생(만 99세 이하)은 now 와 무관하게 10칸', async () => {
    const young: BuildContextInput = {
      birthDate: '1990-05-15',
      birthTime: '08:30',
      gender: 'male',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    }
    const a = await buildNatalContext({ ...young, now: new Date('2000-01-01T00:00:00Z') })
    const b = await buildNatalContext({ ...young, now: new Date('2080-01-01T00:00:00Z') })
    expect(a.saju.daeun).toHaveLength(10)
    expect(b.saju.daeun).toEqual(a.saju.daeun)
  }, 60000)
})
