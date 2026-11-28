// @vitest-environment node
/**
 * "오늘의 큰 날" 푸시 ↔ 웹 캘린더 본명 패리티 (엔진 감사 F1).
 *
 * 예전 cron/keyday-push 는 프로필의 원시 birthTime 을 그대로 엔진에 넣었다 — 시간 미상
 * 사용자는 웹 캘린더(정오 앵커 + birthTimeUnknown → 삼주·placeUnreliable)와 다른 본명과
 * 다른 birthKey 로 "큰 날"을 판정했다. 이제 두 경로가 같은 profileToCalendarBirth 를 쓴다.
 *
 * 실제 persistence.birthKeyFor 가 돈다 — Prisma 캐시 조회에 실린 birthKey 를 붙잡아 비교한다.
 * 캐시 hit(빈 natal·빈 월 cells)을 돌려줘 엔진 빌드 없이 키만 본다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(async () => ({ user: { id: 'u1' } })),
}))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock('@/i18n/server', () => ({ detectServerLocale: vi.fn(async () => 'ko') }))
vi.mock('@/lib/cache/redis-rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true })),
}))
// cron 인증은 cronAuth.all.test 가 잠근다 — 여기선 핸들러만 본다.
vi.mock('@/lib/api/middleware/cronGuard', () => ({
  withCronAuth: (_name: string, handler: (req: Request) => Promise<Response>) => handler,
}))
vi.mock('@/lib/push/sender', () => ({
  sendPushToTargets: vi.fn(async () => ({ sent: 0, failed: 0, pruned: 0 })),
}))

import { prisma } from '@/lib/db/prisma'
import { CALENDAR_ENGINE_VERSION } from '@/lib/cache/engineVersions'
import { loadSessionBirth } from '@/app/calendar/loadTierData'
import { getOrBuildNatalContext } from '@/lib/calendar-engine/persistence'
import { profileToCalendarBirth } from '@/lib/calendar-engine/profileBirth'
import { GET as keydayPush } from '@/app/api/cron/keyday-push/route'

type Profile = {
  birthDate: string
  birthTime: string
  birthTimeUnknown: boolean | null
  gender: string
  birthCity: string | null
  latitude: number
  longitude: number
  tzId: string
}

const natalKeys: string[] = []
const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>

function primeCacheHits() {
  natalKeys.length = 0
  db.natalContextCache.findUnique.mockImplementation(
    async ({ where }: { where: { birthKey: string } }) => {
      natalKeys.push(where.birthKey)
      return { engineSignature: CALENDAR_ENGINE_VERSION, data: {} }
    }
  )
  // 빈 월 cells → buildKeyDayPayload 는 null(푸시 없음). 키만 본다.
  db.calendarBuildCache = {
    findUnique: vi.fn(async () => ({ data: [] })),
    upsert: vi.fn(async () => ({})),
  }
}

/** 웹 캘린더 세션 경로의 birthKey — loadTierData 가 하는 그대로(loadSessionBirth → natal). */
async function webBirthKey(profile: Profile): Promise<string> {
  db.user.findUnique.mockResolvedValueOnce({ profile })
  const r = await loadSessionBirth()
  if (r.kind !== 'ok') throw new Error(`web birth not ok: ${r.kind}`)
  natalKeys.length = 0
  await getOrBuildNatalContext(r.birth)
  return natalKeys[0]
}

/** 푸시 cron 경로의 birthKey — 구독 1건으로 핸들러를 돌린다. */
async function pushBirthKey(profile: Profile): Promise<string> {
  db.pushSubscription.findMany.mockResolvedValueOnce([
    {
      id: 's1',
      endpoint: 'https://push.example/s1',
      p256dh: 'k',
      auth: 'a',
      failCount: 0,
      locale: 'ko',
      user: { profile },
    },
  ])
  natalKeys.length = 0
  const res = await keydayPush(new Request('http://localhost/api/cron/keyday-push'))
  expect(res.status).toBe(200)
  expect(natalKeys).toHaveLength(1)
  return natalKeys[0]
}

const BASE: Omit<Profile, 'birthTime' | 'birthTimeUnknown'> = {
  birthDate: '1990-01-15',
  gender: 'F',
  birthCity: '서울',
  latitude: 37.5665,
  longitude: 126.978,
  tzId: 'Asia/Seoul',
}

beforeEach(() => {
  primeCacheHits()
})

describe('keyday-push birthKey = 웹 캘린더 birthKey (F1)', () => {
  it('명시 플래그 시간 미상(birthTimeUnknown=true, 시각 09:15 잔존) — 같은 키, 정오 앵커 + tu', async () => {
    const profile: Profile = { ...BASE, birthTime: '09:15', birthTimeUnknown: true }
    const web = await webBirthKey(profile)
    const push = await pushBirthKey(profile)
    expect(push).toBe(web)

    // 그 키는 정오 앵커 + 미상 플래그 본명의 키다.
    natalKeys.length = 0
    await getOrBuildNatalContext({
      birthDate: '1990-01-15',
      birthTime: '12:00',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      birthTimeUnknown: true,
    })
    expect(natalKeys[0]).toBe(push)

    // 옛 푸시 입력(원시 시각, 플래그 없음)과는 다르다 — 수정 전에는 갈렸다.
    natalKeys.length = 0
    await getOrBuildNatalContext({
      birthDate: '1990-01-15',
      birthTime: '09:15',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    expect(natalKeys[0]).not.toBe(push)
  })

  it("레거시 행('00:00', 플래그 NULL) = 미상 — 웹과 같은 키", async () => {
    const profile: Profile = { ...BASE, birthTime: '00:00', birthTimeUnknown: null }
    const web = await webBirthKey(profile)
    const push = await pushBirthKey(profile)
    expect(push).toBe(web)
    expect(profileToCalendarBirth(profile)).toMatchObject({
      birthTime: '12:00',
      birthTimeUnknown: true,
    })
  })

  it("실제 자정 출생('00:00', 플래그 false)과 시각을 아는 프로필도 웹과 같은 키 — 미상 키와는 다르다", async () => {
    const midnight: Profile = { ...BASE, birthTime: '00:00', birthTimeUnknown: false }
    const mWeb = await webBirthKey(midnight)
    const mPush = await pushBirthKey(midnight)
    expect(mPush).toBe(mWeb)

    const known: Profile = { ...BASE, birthTime: '12:00', birthTimeUnknown: false }
    const kWeb = await webBirthKey(known)
    const kPush = await pushBirthKey(known)
    expect(kPush).toBe(kWeb)

    const unknown: Profile = { ...BASE, birthTime: '12:00', birthTimeUnknown: true }
    expect(await pushBirthKey(unknown)).not.toBe(kPush) // 정오 앵커 미상 ≠ 실제 정오
  })

  it('본명이 완비되지 않은 프로필은 웹(no-birth)과 푸시(제외) 모두 건너뛴다', async () => {
    const incomplete = { ...BASE, birthTime: '', birthTimeUnknown: true } as Profile
    db.user.findUnique.mockResolvedValueOnce({ profile: incomplete })
    await expect(loadSessionBirth()).resolves.toEqual({ kind: 'no-birth' })

    db.pushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 's1',
        endpoint: 'e',
        p256dh: 'k',
        auth: 'a',
        failCount: 0,
        locale: 'ko',
        user: { profile: incomplete },
      },
    ])
    natalKeys.length = 0
    const res = await keydayPush(new Request('http://localhost/api/cron/keyday-push'))
    expect(res.status).toBe(200)
    expect(natalKeys).toHaveLength(0)
  })
})
