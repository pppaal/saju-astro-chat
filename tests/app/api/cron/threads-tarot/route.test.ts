/**
 * /api/cron/threads-tarot — 타로 공유 결과 Threads 자동 게시 cron 테스트.
 *
 * 보안(429/401), 토큰 미설정(503), 슬롯 1회 가드(skip), 빌드 실패(500),
 * 발행 성공/실패를 어댑터·빌더 mock 으로 검증.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const publish = vi.fn()
const isConfigured = vi.fn(() => true)
vi.mock('@/lib/social/publish/threads', () => ({
  threadsAdapter: {
    platform: 'threads',
    isConfigured: () => isConfigured(),
    publish: (input: unknown) => publish(input),
  },
}))

const buildTarotThreadPost = vi.fn()
vi.mock('@/lib/social/tarotThread', () => ({
  buildTarotThreadPost: (...a: unknown[]) => buildTarotThreadPost(...a),
  slotFromKst: () => 'morning',
  isThreadSlot: (v: unknown) => v === 'morning' || v === 'afternoon' || v === 'evening',
}))

const claimDailyOnce = vi.fn()
vi.mock('@/lib/cron/dailyOnce', () => ({
  claimDailyOnce: (...a: unknown[]) => claimDailyOnce(...a),
}))

import { GET, POST } from '@/app/api/cron/threads-tarot/route'
import { rateLimit } from '@/lib/rateLimit'

const SECRET = 'cron-secret-for-test'

function makeRequest(auth?: string, slot?: string) {
  const url = slot
    ? `http://localhost:3000/api/cron/threads-tarot?slot=${slot}`
    : 'http://localhost:3000/api/cron/threads-tarot'
  return new Request(url, { method: 'GET', headers: auth ? { authorization: auth } : {} })
}

const SAMPLE_POST = {
  slot: 'morning',
  locale: 'ko',
  cardName: 'The Star',
  isReversed: false,
  caption: '🔮 오늘 하루를 여는 한 장\n\nThe Star\n\n🔗 https://destinypal.com/r/tok123',
  hashtags: ['#오늘의타로', '#타로'],
  imageUrl: 'https://destinypal.com/images/tarot/star.webp',
  shareUrl: 'https://destinypal.com/r/tok123',
}

describe('/api/cron/threads-tarot', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: SECRET }
    isConfigured.mockReturnValue(true)
    claimDailyOnce.mockResolvedValue(true)
    buildTarotThreadPost.mockResolvedValue(SAMPLE_POST)
    publish.mockResolvedValue({
      ok: true,
      platform: 'threads',
      externalId: 'x1',
      url: 'https://www.threads.net/t/x1',
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('IP 한도 초과면 429 + 발행 없음', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({ allowed: false } as never)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(429)
    expect(publish).not.toHaveBeenCalled()
  })

  it('잘못된 시크릿은 401', async () => {
    const res = await GET(makeRequest('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(publish).not.toHaveBeenCalled()
  })

  it('Threads 토큰 미설정이면 503 (throw 금지)', async () => {
    isConfigured.mockReturnValue(false)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(503)
    expect(claimDailyOnce).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })

  it('이 슬롯을 이미 게시했으면 스킵 — 빌드/발행 없음', async () => {
    claimDailyOnce.mockResolvedValueOnce(false)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true, skipped: 'already_posted', posted: false })
    expect(buildTarotThreadPost).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })

  it('공유 결과 빌드 실패면 500', async () => {
    buildTarotThreadPost.mockResolvedValueOnce(null)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json).toMatchObject({ success: false, error: 'build_failed' })
    expect(publish).not.toHaveBeenCalled()
  })

  it('정상 — Threads 에 게시하고 공유 URL 반환', async () => {
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toMatchObject({
      success: true,
      slot: 'morning',
      posted: true,
      card: 'The Star',
      shareUrl: 'https://destinypal.com/r/tok123',
    })
    // 어댑터에 caption/hashtags/imageUrl 전달
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        caption: SAMPLE_POST.caption,
        hashtags: SAMPLE_POST.hashtags,
        imageUrl: SAMPLE_POST.imageUrl,
      })
    )
  })

  it('?slot= 으로 슬롯 수동 지정 — 가드 키에 그 슬롯 사용', async () => {
    await GET(makeRequest(`Bearer ${SECRET}`, 'evening'))
    expect(claimDailyOnce).toHaveBeenCalledWith('threads-tarot:evening', expect.any(Date))
  })

  it('발행 실패(ok:false)면 502', async () => {
    publish.mockResolvedValueOnce({ ok: false, platform: 'threads', error: 'container: 400' })
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()
    expect(res.status).toBe(502)
    expect(json).toMatchObject({ success: false, error: 'container: 400' })
  })

  it('POST 도 GET 과 동일', async () => {
    const res = await POST(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
  })
})
