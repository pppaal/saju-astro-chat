// @vitest-environment node
/**
 * Tests for POST /api/compatibility/share/invite — 초대 링크 궁합 서버 페어링.
 *
 * 받은 사람은 토큰 + 자기 출생정보만 보내고, 서버가 공유 레코드의 공유자(초대자)
 * 출생정보로 궁합을 계산해 결과만 돌려준다. 여기서 잠그는 것:
 *  - 초대 흐름이 실제 엔진(사주·Swiss Ephemeris)으로 리포트를 만든다.
 *  - 같은 두 사람이면 수동 입력 경로(/api/compatibility/report)와 같은 리포트.
 *  - 응답 어디에도 공유자의 생년월일·시각·성별·도시·좌표·타임존이 없다.
 *  - 만료·미동의·궁합 아님 토큰은 모두 404, 잘못된 본문은 422.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
}

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: null,
        session: null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: false,
        isPremium: false,
      }
      const result = await handler(req, context, ...args)
      if (result instanceof Response) return result
      if (result?.error) {
        const status = STATUS_MAP[result.error.code] || 500
        return NextResponse.json({ success: false, error: { ...result.error, status } }, { status })
      }
      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAstrologyGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

// Redis 없이 — 캐시는 그대로 계산으로 통과.
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: async (_key: string, fn: () => Promise<unknown>) => fn(),
  CacheKeys: { natalChart: (...a: unknown[]) => `natal:${a.join(':')}` },
  CACHE_TTL: { NATAL_CHART: 1 },
}))

const getShareLink = vi.fn(async (_token: string): Promise<any> => null)
vi.mock('@/lib/tarot/shareLink', () => ({
  getShareLink: (token: string) => getShareLink(token),
  isCompatShare: (p: any) => p?.kind === 'compatibility',
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/compatibility/share/invite/route'
import { POST as REPORT_POST } from '@/app/api/compatibility/report/route'
import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'

// 공유자(초대자) — 공유 레코드에만 있는 출생정보. 응답에 이 값들이 나오면 안 된다.
const INVITER = {
  name: '지민',
  birthDate: '1994-03-03',
  birthTime: '14:37',
  timeUnknown: false,
  gender: 'female' as const,
  city: 'Busan',
  lat: 35.1796,
  lon: 129.0756,
  tz: 'Asia/Seoul',
}

const SHARE = {
  v: 1,
  kind: 'compatibility',
  isKo: true,
  nameA: '지민',
  nameB: '수현',
  verdict: '불꽃은 튀는데 서로 못 참는 조합이에요.',
  verdictTone: 'mixed',
  inviter: INVITER,
}

// 받은 사람 본인 — 요청 본문에 직접 싣는 값.
const ME = {
  birthDate: '1996-11-20',
  birthTime: '08:15',
  timeUnknown: false,
  gender: 'male' as const,
  lat: 37.5665,
  lon: 126.978,
  tz: 'Asia/Seoul',
}

function makeReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost:3000/api/compatibility/share/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

/** 응답 JSON 안의 모든 키 (중첩 포함). */
function allKeys(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => allKeys(x, out))
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      out.add(k)
      allKeys(x, out)
    }
  }
  return out
}

beforeEach(() => {
  vi.clearAllMocks()
  getShareLink.mockImplementation(async (token: string) => (token === 'tok_inv' ? SHARE : null))
})

describe('POST /api/compatibility/share/invite — 서버 페어링', () => {
  it('토큰 + 내 출생정보만으로 궁합 리포트(결과)를 돌려준다', async () => {
    const res = await POST(makeReq({ token: 'tok_inv', person: ME, lang: 'ko' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(getShareLink).toHaveBeenCalledWith('tok_inv')
    expect(body.data.inviter).toEqual({ name: '지민', timeUnknown: false })
    const report = body.data.report
    // 사주측(일간·기둥 관계)과 점성측(시너스트리) 모두 실제 엔진으로 계산됐다.
    expect(report.dayMaster).toBeTruthy()
    expect(Array.isArray(report.pillarRelations)).toBe(true)
    expect(report.synView).toBeTruthy()
    expect(report.band).toBeTruthy()
  }, 30_000)

  it('같은 두 사람이면 수동 입력 경로(/api/compatibility/report)와 같은 리포트', async () => {
    const res = await POST(makeReq({ token: 'tok_inv', person: ME, lang: 'ko' }))
    const viaInvite = (await res.json()).data.report

    // 수동 경로 재현 — /api/saju·/api/astrology 가 내려주는 값(JSON 왕복)을
    // 무료 궁합 페이지처럼 pillars/natal 로 풀어 리포트 라우트에 그대로 보낸다.
    const pillarsOf = (p: typeof INVITER | typeof ME) => {
      const r = calculateSajuData(p.birthDate, p.birthTime, p.gender, 'solar', p.tz, false, p.lon)
      return [r.yearPillar, r.monthPillar, r.dayPillar, r.timePillar].map((x) => ({
        stem: x.heavenlyStem.name,
        branch: x.earthlyBranch.name,
      }))
    }
    const natalOf = async (p: typeof INVITER | typeof ME) => {
      const [year, month, date] = p.birthDate.split('-').map(Number)
      const [hour, minute] = p.birthTime.split(':').map(Number)
      const natal = await calculateNatalChart({
        year,
        month,
        date,
        hour,
        minute,
        latitude: p.lat,
        longitude: p.lon,
        timeZone: p.tz,
      })
      return JSON.parse(JSON.stringify(natal))
    }
    const manualRes = await REPORT_POST(
      new NextRequest('http://localhost:3000/api/compatibility/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          astroA: await natalOf(INVITER),
          astroB: await natalOf(ME),
          pillarsA: pillarsOf(INVITER),
          pillarsB: pillarsOf(ME),
          timeUnknownA: false,
          timeUnknownB: false,
          genderA: INVITER.gender,
          genderB: ME.gender,
          lang: 'ko',
        }),
      })
    )
    const viaManual = (await manualRes.json()).data
    expect(viaInvite).toEqual(viaManual)
  }, 30_000)

  it('응답에 공유자의 생년월일·시각·성별·도시·좌표·타임존이 없다', async () => {
    const res = await POST(makeReq({ token: 'tok_inv', person: ME, lang: 'ko' }))
    const body = await res.json()
    const keys = allKeys(body)
    for (const k of ['birthDate', 'birthTime', 'gender', 'city', 'lat', 'lon', 'tz']) {
      expect(keys.has(k)).toBe(false)
    }
    const text = JSON.stringify(body)
    expect(text).not.toContain(INVITER.birthDate)
    expect(text).not.toContain(INVITER.birthTime)
    expect(text).not.toContain(INVITER.city)
    expect(text).not.toContain(String(INVITER.lat))
    expect(text).not.toContain(String(INVITER.lon))
    expect(text).not.toContain(INVITER.tz)
  }, 30_000)

  it('공유자가 시간 미상이면 inviter.timeUnknown=true (시각 자체는 없음)', async () => {
    getShareLink.mockResolvedValue({
      ...SHARE,
      inviter: { ...INVITER, birthTime: undefined, timeUnknown: true },
    })
    const res = await POST(makeReq({ token: 'tok_inv', person: ME }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.inviter).toEqual({ name: '지민', timeUnknown: true })
    expect(body.data.report.dayMaster).toBeTruthy()
  }, 30_000)

  it('공유자 이름이 비면 공유 레코드의 nameA 로 표시', async () => {
    getShareLink.mockResolvedValue({ ...SHARE, nameA: 'A', inviter: { ...INVITER, name: '' } })
    const body = await (await POST(makeReq({ token: 'tok_inv', person: ME }))).json()
    expect(body.data.inviter.name).toBe('A')
  }, 30_000)
})

describe('POST /api/compatibility/share/invite — 404 / 422', () => {
  it('없는(만료된) 토큰이면 invite_not_found 404', async () => {
    const res = await POST(makeReq({ token: 'nope', person: ME }))
    expect(res.status).toBe(404)
    expect((await res.json()).error.message).toBe('invite_not_found')
  })

  it('공유자가 옵트인 안 한 공유(inviter 없음)도 404', async () => {
    const { inviter: _omit, ...optedOut } = SHARE
    getShareLink.mockResolvedValue(optedOut)
    const res = await POST(makeReq({ token: 'tok_inv', person: ME }))
    expect(res.status).toBe(404)
  })

  it('궁합 공유가 아닌 토큰(타로 등)도 404', async () => {
    getShareLink.mockResolvedValue({ v: 1, kind: 'tarot', inviter: INVITER })
    const res = await POST(makeReq({ token: 'tok_inv', person: ME }))
    expect(res.status).toBe(404)
  })

  it('생년월일 형식이 틀리면 invalid_invite_payload 422 (공유 레코드 조회 전)', async () => {
    const res = await POST(
      makeReq({ token: 'tok_inv', person: { ...ME, birthDate: '1996/11/20' } })
    )
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_invite_payload')
    expect(getShareLink).not.toHaveBeenCalled()
  })

  it('person 이 없으면 422', async () => {
    const res = await POST(makeReq({ token: 'tok_inv' }))
    expect(res.status).toBe(422)
    expect(getShareLink).not.toHaveBeenCalled()
  })

  it('잘못된 JSON 이면 invalid_json 422', async () => {
    const res = await POST(makeReq('{broken', true))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_json')
  })
})
