import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock middleware as passthrough - must be before route import
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('@/lib/auth/session')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
          { status: 500 }
        )
      }

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'not_authenticated' } },
          { status: 401 }
        )
      }

      const context = {
        userId: session.user.id,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }

      const result = await handler(req, context, ...args)

      if (result instanceof Response) {
        return result
      }

      if (result.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          NOT_FOUND: 404,
          INTERNAL_ERROR: 500,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any, options?: any) => ({
    data,
    status: options?.status,
    meta: options?.meta,
  })),
  apiError: vi.fn((code: string, message?: string, details?: any) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Mock Prisma — models the route touches, plus the preserved-log models so we
// can assert they are NOT deleted (C-option: keep accounting/security logs).
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), delete: vi.fn() },
    sharedResult: { deleteMany: vi.fn() },
    bonusCreditPurchase: { deleteMany: vi.fn() },
    securityAuditLog: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { DELETE } from '@/app/api/me/account/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const USER_ID = 'user-1'
const mockSession = { user: { id: USER_ID } }

function makeRequest(body?: unknown, opts?: { invalidJson?: boolean }): NextRequest {
  return {
    json: async () => {
      if (opts?.invalidJson) throw new Error('invalid json')
      return body ?? {}
    },
  } as unknown as NextRequest
}

describe('Account API – DELETE /api/me/account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'me@example.com' } as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{ count: 0 }, { count: 0 }, {}] as any)
  })

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await DELETE(makeRequest({ confirm: 'me@example.com' }))
      expect(res.status).toBe(401)
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })

    it('returns 500 when getServerSession throws', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('boom'))
      const res = await DELETE(makeRequest({ confirm: 'me@example.com' }))
      expect(res.status).toBe(500)
    })
  })

  describe('Confirmation guard', () => {
    it('rejects when confirm is missing', async () => {
      const res = await DELETE(makeRequest({}))
      const data = await res.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })

    it('rejects when the body is invalid JSON', async () => {
      const res = await DELETE(makeRequest(undefined, { invalidJson: true }))
      const data = await res.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects when confirm does not match the account email', async () => {
      const res = await DELETE(makeRequest({ confirm: 'wrong@example.com' }))
      const data = await res.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects "DELETE" when the account has an email (must match email)', async () => {
      const res = await DELETE(makeRequest({ confirm: 'DELETE' }))
      const data = await res.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('accepts a matching email (case-insensitive, trimmed)', async () => {
      const res = await DELETE(makeRequest({ confirm: '  Me@Example.COM  ' }))
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.data.deleted).toBe(true)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('accepts "DELETE" when the account has no email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null } as any)
      const res = await DELETE(makeRequest({ confirm: 'delete' }))
      expect(res.status).toBe(200)
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } })
    })

    it('rejects a wrong phrase when the account has no email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null } as any)
      const res = await DELETE(makeRequest({ confirm: 'nope' }))
      const data = await res.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Not found', () => {
    it('returns NOT_FOUND and does not delete when the user is gone', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      const res = await DELETE(makeRequest({ confirm: 'me@example.com' }))
      const data = await res.json()
      expect(data.error.code).toBe('NOT_FOUND')
      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })
  })

  describe('Deletion behavior', () => {
    it('deletes SharedResult and the user in one transaction', async () => {
      const res = await DELETE(makeRequest({ confirm: 'me@example.com' }))
      expect(res.status).toBe(200)
      // EmailLog 모델 제거(2026-06-06) — 이제 SharedResult + user.delete(cascade) 만.
      expect(prisma.sharedResult.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } })
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('preserves accounting/security logs (does not delete them)', async () => {
      await DELETE(makeRequest({ confirm: 'me@example.com' }))
      expect(prisma.bonusCreditPurchase.deleteMany).not.toHaveBeenCalled()
      expect(prisma.securityAuditLog.deleteMany).not.toHaveBeenCalled()
    })

    it('returns { deleted: true } on success', async () => {
      const res = await DELETE(makeRequest({ confirm: 'me@example.com' }))
      const data = await res.json()
      expect(data).toEqual({ success: true, data: { deleted: true } })
    })
  })

  describe('Error handling', () => {
    it('returns DATABASE_ERROR when the transaction throws', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB down'))
      const res = await DELETE(makeRequest({ confirm: 'me@example.com' }))
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })
})
