/**
 * API Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  extractLocale,
  initializeApiContext,
  withApiMiddleware,
  parseJsonBody,
  validateRequired,
  apiError,
  apiSuccess,
  ErrorCodes,
} from '@/lib/api/middleware'

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(),
}))

vi.mock('@/lib/auth/admin', () => ({
  isAdminUser: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/api/errorHandler', () => ({
  createErrorResponse: vi.fn((options) =>
    NextResponse.json({ error: options.code }, { status: 429 })
  ),
  createSuccessResponse: vi.fn((data) => NextResponse.json(data)),
  ErrorCodes: {
    RATE_LIMITED: 'RATE_LIMITED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

import { getServerSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { isAdminUser } from '@/lib/auth/admin'

describe('API Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      reset: Date.now() + 60000,
    })
    vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
    vi.mocked(getServerSession).mockResolvedValue(null)
  })

  describe('maxBodyBytes 가드', () => {
    // 런타임이 in-memory body 의 content-length 를 동기 설정 안 하므로, 헤더를
    // 명시 보존하는 Headers 로 mock req 구성(가드는 initializeApiContext *전*에
    // 반환하므로 url+headers 만 있으면 충분).
    const mockReq = (contentLength: number) =>
      ({
        url: 'http://localhost/api/test',
        method: 'POST',
        headers: new Headers({ 'content-length': String(contentLength) }),
      }) as unknown as NextRequest

    it('content-length 가 한도 초과면 핸들러 실행 전 413', async () => {
      const handler = vi.fn(async () => ({ data: { ok: true } }))
      const wrapped = withApiMiddleware(handler, { maxBodyBytes: 1024 })
      const res = await wrapped(mockReq(2048))
      expect(res.status).toBe(413)
      expect(handler).not.toHaveBeenCalled()
    })

    it('maxBodyBytes 미설정이면 본문 가드를 적용하지 않는다(opt-in)', async () => {
      // 가드 미적용 → 413 아님. (정상 처리 경로는 기존 라우트 테스트가 커버.)
      const handler = vi.fn(async () => ({ data: { ok: true } }))
      const wrapped = withApiMiddleware(handler, {})
      const res = await wrapped(mockReq(50 * 1024 * 1024))
      expect(res.status).not.toBe(413)
    })
  })

  describe('extractLocale', () => {
    it('extracts Korean from URL', () => {
      const req = new Request('http://localhost?locale=ko')
      expect(extractLocale(req)).toBe('ko')
    })

    it('extracts Korean from header', () => {
      const req = new Request('http://localhost', {
        headers: { 'accept-language': 'ko-KR' },
      })
      expect(extractLocale(req)).toBe('ko')
    })

    it('defaults to English', () => {
      const req = new Request('http://localhost')
      expect(extractLocale(req)).toBe('en')
    })
  })

  describe('initializeApiContext', () => {
    it('initializes basic context', async () => {
      const req = new NextRequest('http://localhost/api/test')
      const { context, error } = await initializeApiContext(req)

      expect(error).toBeUndefined()
      expect(context.ip).toBe('127.0.0.1')
      expect(context.isAuthenticated).toBe(false)
    })

    it('handles rate limiting', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: Date.now(),
      })

      const req = new NextRequest('http://localhost/api/test')
      const { error } = await initializeApiContext(req, {
        rateLimit: { limit: 10, windowSeconds: 60 },
      })

      expect(error).toBeDefined()
    })

    it('validates token when required', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Invalid',
      })

      const req = new NextRequest('http://localhost/api/test')
      const { error } = await initializeApiContext(req, {
        requireToken: true,
      })

      expect(error).toBeDefined()
    })

    it('attaches session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', plan: 'premium' },
        expires: '2025-12-31',
      })

      const req = new NextRequest('http://localhost/api/test')
      const { context } = await initializeApiContext(req)

      expect(context.userId).toBe('123')
      expect(context.isPremium).toBe(true)
    })

    describe('requireAdmin', () => {
      it('rejects unauthenticated requests without calling isAdminUser', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null)

        const req = new NextRequest('http://localhost/api/admin/test')
        const { error } = await initializeApiContext(req, { requireAdmin: true })

        expect(error).toBeDefined()
        expect(isAdminUser).not.toHaveBeenCalled()
      })

      it('rejects authenticated non-admin users', async () => {
        vi.mocked(getServerSession).mockResolvedValue({
          user: { id: 'user-1', email: 'user@example.com' },
          expires: '2099-12-31',
        })
        vi.mocked(isAdminUser).mockResolvedValue(false)

        const req = new NextRequest('http://localhost/api/admin/test')
        const { error } = await initializeApiContext(req, { requireAdmin: true })

        expect(error).toBeDefined()
        expect(isAdminUser).toHaveBeenCalledWith('user-1', 'user@example.com')
      })

      it('allows admin users through', async () => {
        vi.mocked(getServerSession).mockResolvedValue({
          user: { id: 'admin-1', email: 'admin@example.com' },
          expires: '2099-12-31',
        })
        vi.mocked(isAdminUser).mockResolvedValue(true)

        const req = new NextRequest('http://localhost/api/admin/test')
        const { context, error } = await initializeApiContext(req, { requireAdmin: true })

        expect(error).toBeUndefined()
        expect(context.userId).toBe('admin-1')
        expect(isAdminUser).toHaveBeenCalledWith('admin-1', 'admin@example.com')
      })
    })
  })

  describe('validateRequired', () => {
    it('validates present fields', () => {
      const result = validateRequired({ name: 'test' }, ['name'])
      expect(result.valid).toBe(true)
    })

    it('detects missing fields', () => {
      const result = validateRequired({}, ['name'])
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.missing).toContain('name')
      }
    })
  })

  describe('apiError', () => {
    it('creates error result', () => {
      const result = apiError(ErrorCodes.NOT_FOUND, 'Not found')
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND)
      expect(result.error?.message).toBe('Not found')
    })
  })

  describe('apiSuccess', () => {
    it('creates success result', () => {
      const result = apiSuccess({ id: '123' })
      expect(result.data).toEqual({ id: '123' })
    })
  })
})
