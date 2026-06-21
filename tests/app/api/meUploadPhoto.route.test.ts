/**
 * Tests for /api/me/upload-photo — Vercel Blob 으로 프로필 사진 서버 측 업로드(POST).
 *
 * 커버:
 *  - 인증 없으면 401
 *  - BLOB_READ_WRITE_TOKEN 없으면 INTERNAL_ERROR (미설정)
 *  - formData 파싱 실패 → VALIDATION_ERROR
 *  - file 필드 없음/File 아님 → VALIDATION_ERROR
 *  - 허용 안 된 타입 → VALIDATION_ERROR
 *  - 5MB 초과 → VALIDATION_ERROR
 *  - 정상 업로드 → url/pathname 반환 + put 호출 인자 검증
 *  - 확장자 sanitize (이상한 확장자면 jpg fallback)
 *  - put 실패 → INTERNAL_ERROR
 *
 * @vercel/blob 의 put 은 모킹한다 (네트워크 금지).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
}

const ctxOverride: { userId: string | null } = { userId: 'user_123' }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      if (!ctxOverride.userId) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', status: 401 } },
          { status: 401 }
        )
      }
      const context = {
        userId: ctxOverride.userId,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      try {
        const result = await handler(req, context, ...args)
        if (result instanceof Response) return result
        if (result?.error) {
          const status = STATUS_MAP[result.error.code] || 500
          return NextResponse.json(
            { success: false, error: { ...result.error, status } },
            { status }
          )
        }
        return NextResponse.json(
          { success: true, data: result.data },
          { status: result.status || 200 }
        )
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', status: 500 } },
          { status: 500 }
        )
      }
    }
  }),
  createAuthenticatedGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/me/upload-photo/route'
import { put } from '@vercel/blob'

// FormData 를 가진 NextRequest 를 만든다. 일부 케이스에선 formData() 가
// throw 하도록 직접 오버라이드한다.
function reqWithForm(form: FormData) {
  const req = new NextRequest('http://localhost:3000/api/me/upload-photo', {
    method: 'POST',
  })
  Object.defineProperty(req, 'formData', {
    value: async () => form,
    configurable: true,
  })
  return req
}

function reqWithBadForm() {
  const req = new NextRequest('http://localhost:3000/api/me/upload-photo', {
    method: 'POST',
  })
  Object.defineProperty(req, 'formData', {
    value: async () => {
      throw new Error('not multipart')
    },
    configurable: true,
  })
  return req
}

function makeFile(opts: { type: string; size: number; name?: string }) {
  const bytes = new Uint8Array(opts.size)
  return new File([bytes], opts.name ?? 'photo.jpg', { type: opts.type })
}

const ORIGINAL_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = 'user_123'
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
})

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) {
    delete process.env.BLOB_READ_WRITE_TOKEN
  } else {
    process.env.BLOB_READ_WRITE_TOKEN = ORIGINAL_TOKEN
  }
})

describe('POST /api/me/upload-photo', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const form = new FormData()
    form.set('file', makeFile({ type: 'image/jpeg', size: 10 }))
    const res = await POST(reqWithForm(form))
    expect(res.status).toBe(401)
  })

  it('BLOB_READ_WRITE_TOKEN 없으면 INTERNAL_ERROR', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const form = new FormData()
    form.set('file', makeFile({ type: 'image/jpeg', size: 10 }))
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(put).not.toHaveBeenCalled()
  })

  it('formData 파싱 실패면 VALIDATION_ERROR', async () => {
    const res = await POST(reqWithBadForm())
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('file 필드 없으면 VALIDATION_ERROR (No file uploaded)', async () => {
    const form = new FormData()
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('No file uploaded')
  })

  it('file 이 File 아니면 VALIDATION_ERROR', async () => {
    const form = new FormData()
    form.set('file', 'just-a-string')
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toBe('No file uploaded')
  })

  it('허용 안 된 타입이면 VALIDATION_ERROR', async () => {
    const form = new FormData()
    form.set('file', makeFile({ type: 'application/pdf', size: 10, name: 'doc.pdf' }))
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toContain('Unsupported file type')
    expect(put).not.toHaveBeenCalled()
  })

  it('5MB 초과면 VALIDATION_ERROR', async () => {
    const form = new FormData()
    form.set('file', makeFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1, name: 'big.png' }))
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toContain('File too large')
    expect(put).not.toHaveBeenCalled()
  })

  it('정상 업로드면 url/pathname 반환 + put 인자 검증', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.example/profile.jpg',
      pathname: 'profile-photos/user_123/123.jpg',
    } as any)
    const form = new FormData()
    form.set('file', makeFile({ type: 'image/jpeg', size: 1000, name: 'me.JPG' }))
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.url).toBe('https://blob.example/profile.jpg')
    expect(data.data.pathname).toBe('profile-photos/user_123/123.jpg')

    const [pathname, , opts] = vi.mocked(put).mock.calls[0] as any
    expect(pathname).toMatch(/^profile-photos\/user_123\/\d+\.jpg$/)
    expect(opts.access).toBe('public')
    expect(opts.contentType).toBe('image/jpeg')
    expect(opts.addRandomSuffix).toBe(true)
  })

  it('이상한 확장자면 jpg fallback 으로 경로 생성', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.example/x',
      pathname: 'p',
    } as any)
    const form = new FormData()
    // 확장자에 허용 안 되는 문자 포함 → safeExt 가 jpg 로 fallback
    form.set('file', makeFile({ type: 'image/webp', size: 100, name: 'weird.we!rd' }))
    const res = await POST(reqWithForm(form))
    expect(res.status).toBe(200)
    const [pathname] = vi.mocked(put).mock.calls[0] as any
    expect(pathname).toMatch(/\.jpg$/)
  })

  it('put 실패면 INTERNAL_ERROR', async () => {
    vi.mocked(put).mockRejectedValue(new Error('blob down'))
    const form = new FormData()
    form.set('file', makeFile({ type: 'image/png', size: 100, name: 'x.png' }))
    const res = await POST(reqWithForm(form))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toContain('Upload failed')
  })
})
