// tests/lib/seo/indexnow.test.ts
//
// IndexNow 핑 — 핵심 계약: (1) 키 미설정이면 조용히 스킵, (2) 같은 호스트의
// 절대 URL 만 중복 없이 제출(타 호스트가 섞이면 IndexNow 가 전체 거부하므로),
// (3) 어떤 실패에도 throw 하지 않는다(best-effort).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pingIndexNow, isIndexNowConfigured, indexNowKey } from '@/lib/seo/indexnow'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  process.env.INDEXNOW_KEY = 'abc123def456'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.INDEXNOW_KEY
})

describe('indexNow config', () => {
  it('키 미설정이면 not configured', () => {
    delete process.env.INDEXNOW_KEY
    expect(isIndexNowConfigured()).toBe(false)
    expect(indexNowKey()).toBeNull()
  })

  it('공백만 있는 키는 미설정 취급', () => {
    process.env.INDEXNOW_KEY = '   '
    expect(isIndexNowConfigured()).toBe(false)
  })
})

describe('pingIndexNow', () => {
  it('키 미설정이면 fetch 없이 스킵', async () => {
    delete process.env.INDEXNOW_KEY
    const r = await pingIndexNow(['/fortune'])
    expect(r).toEqual({ ok: false, submitted: 0, skipped: 'not_configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('상대경로를 절대 URL 로 바꾸고, 타 호스트는 걸러내고, 중복 제거해 제출한다', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
    const r = await pingIndexNow([
      '/fortune',
      '/fortune', // 중복
      `${BASE}/fortune/rat`,
      'https://evil.example.com/x', // 타 호스트 — 제외돼야 함
    ])
    expect(r.ok).toBe(true)
    expect(r.submitted).toBe(2)
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.urlList).toEqual([`${BASE}/fortune`, `${BASE}/fortune/rat`])
    expect(body.key).toBe('abc123def456')
    expect(body.keyLocation).toBe(`${BASE}/indexnow.txt`)
    expect(body.host).toBe(BASE.replace(/^https?:\/\//, ''))
  })

  it('유효 URL 이 하나도 없으면 fetch 없이 스킵', async () => {
    const r = await pingIndexNow(['https://evil.example.com/x'])
    expect(r).toEqual({ ok: false, submitted: 0, skipped: 'no_urls' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('202(Accepted)도 성공', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 202 })
    const r = await pingIndexNow(['/'])
    expect(r.ok).toBe(true)
    expect(r.status).toBe(202)
  })

  it('4xx 거부는 ok:false + status/error 로 보고 (throw 금지)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden - key mismatch',
    })
    const r = await pingIndexNow(['/'])
    expect(r.ok).toBe(false)
    expect(r.status).toBe(403)
    expect(r.error).toContain('Forbidden')
  })

  it('네트워크 오류도 throw 하지 않는다', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))
    const r = await pingIndexNow(['/'])
    expect(r.ok).toBe(false)
    expect(r.error).toBe('ECONNRESET')
  })
})
