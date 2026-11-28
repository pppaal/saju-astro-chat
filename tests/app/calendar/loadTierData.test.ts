// @vitest-environment node
/**
 * loadTierData — /calendar 서버 로더의 결정론(주입식 now).
 *
 * 계약: ① '오늘'(대상 월·포커스 일)은 주입된 now 를 출생 타임존으로 읽어 정한다
 * (시계를 따로 두 번 읽지 않는다) ② 같은 입력 + 같은 now 면 결과가 deep-equal
 * ③ 익명 + 무입력은 'guest' (예전 'login' 변형은 없다).
 *
 * 세션·로케일·rate-limit·헤더만 mock 하고, NatalContext·월 cells 는 실제
 * persistence 경로로 빌드한다(Prisma 는 tests/setup.ts 가 mock → 캐시 미스 → 새로
 * 빌드, Swiss Ephemeris 도 setup mock).
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))
vi.mock('@/i18n/server', () => ({
  detectServerLocale: vi.fn(async () => 'ko'),
}))
vi.mock('@/lib/cache/redis-rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true })),
}))
vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(async () => null),
}))

import { loadTierData, type BirthOverride } from '@/app/calendar/loadTierData'

// v9 샘플 본명(합성) — /calendar/preview 와 같은 사람.
const OVERRIDE: BirthOverride = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  timeUnknown: false,
  gender: 'female',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  place: '서울',
}
// 2026-11-19 12:00 Asia/Seoul.
const NOW = new Date('2026-11-19T03:00:00Z')

describe('loadTierData — 주입식 now 결정론', () => {
  it('같은 override + 같은 now 면 두 번 호출해도 결과가 deep-equal 이다', async () => {
    const a = await loadTierData(OVERRIDE, NOW)
    const b = await loadTierData(OVERRIDE, NOW)
    expect(a.kind).toBe('ok')
    expect(b).toEqual(a)
    if (a.kind !== 'ok') return
    // '오늘' 은 주입된 now 를 출생 타임존(서울)으로 읽은 날 — 서버 시계와 무관.
    expect(a.month.ym).toBe('2026-11')
    expect(a.day.date).toBe('2026-11-19')
    // 캘린더 페이로드엔 숨은 인생 티어가 없다.
    expect(a).not.toHaveProperty('lifetime')
  }, 120000)

  it('UTC 로는 전날이어도 출생 타임존 자정을 넘긴 now 면 그 다음 날·다음 달이 대상이다', async () => {
    // 2026-11-30T15:30Z = 2026-12-01 00:30 Asia/Seoul — UTC 기준 날짜(11-30)가 아니라
    // 주입된 같은 인스턴트를 서울 벽시계로 읽은 날짜로 월/일 티어를 고른다.
    const r = await loadTierData(OVERRIDE, new Date('2026-11-30T15:30:00Z'))
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.month.ym).toBe('2026-12')
    expect(r.day.date).toBe('2026-12-01')
  }, 120000)

  it('익명 + 무입력은 guest (login 변형 없음)', async () => {
    await expect(loadTierData(null, NOW)).resolves.toEqual({ kind: 'guest', lang: 'ko' })
  })
})
