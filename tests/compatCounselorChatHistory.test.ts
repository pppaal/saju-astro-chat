// Test the compat-counselor (type='compat') save path on
// /api/counselor/chat-history. The destiny path is exercised by
// `tests/app/api/counselor/chat-history/route.test.ts`; this file
// covers the bits we just added (type discriminator + meta JSON +
// persona-memory skip for compat).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockPersonaUpsert = vi.fn()
const mockPersonaFindUnique = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselorChatSession: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    personaMemory: {
      findUnique: (...a: unknown[]) => mockPersonaFindUnique(...a),
      upsert: (...a: unknown[]) => mockPersonaUpsert(...a),
    },
  },
}))

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: (req: NextRequest, ctx: { userId: string }) => unknown) => {
    return async (req: NextRequest) => {
      const result = await handler(req, { userId: 'user_test_1' })
      if (result instanceof Response) return result
      return NextResponse.json(result, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  extractLocale: vi.fn(() => 'en'),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/counselor/chat-history/route'

function jsonRequest(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/counselor/chat-history', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockFindMany.mockReset()
  mockFindFirst.mockReset()
  mockCreate.mockReset()
  mockUpdate.mockReset()
  mockPersonaUpsert.mockReset()
  mockPersonaFindUnique.mockReset()
})

describe('POST /api/counselor/chat-history — compat type', () => {
  it('writes type="compat" + meta on first save', async () => {
    mockPersonaFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 'cm_compat_new',
      type: 'compat',
      messages: [],
      meta: null,
    })

    const meta = {
      persons: [
        { name: 'A', date: '1995-02-09', time: '06:40' },
        { name: 'B', date: '1996-08-15', time: '14:20' },
      ],
    }

    const res = await POST(
      jsonRequest('POST', {
        locale: 'ko',
        userMessage: '둘 사이 갈등은 왜 반복돼?',
        assistantMessage: '관계 결을 보면 …',
        type: 'compat',
        meta,
      })
    )
    expect(res.status).toBe(200)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_test_1',
          type: 'compat',
          meta,
        }),
      })
    )

    // Persona memory must NOT be touched for compat (it is a destiny-
    // specific single-user recall feature).
    expect(mockPersonaUpsert).not.toHaveBeenCalled()
  })

  it('defaults type to "destiny" when omitted (back-compat)', async () => {
    mockPersonaFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'cm_destiny', type: 'destiny', messages: [] })

    const res = await POST(
      jsonRequest('POST', {
        locale: 'ko',
        userMessage: '인사',
        assistantMessage: '안녕하세요',
        // no type → defaults to 'destiny'
      })
    )
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'destiny' }),
      })
    )
    // Destiny path *does* touch persona memory (existing behavior).
    expect(mockPersonaUpsert).toHaveBeenCalled()
  })

  it('updates existing compat session without touching persona memory', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cm_compat_existing',
      type: 'compat',
      messages: [{ role: 'user', content: '이전 질문' }],
    })
    mockUpdate.mockResolvedValue({ id: 'cm_compat_existing' })

    const res = await POST(
      jsonRequest('POST', {
        sessionId: 'cm_compat_existing',
        locale: 'ko',
        userMessage: '후속',
        assistantMessage: '응답',
        type: 'compat',
      })
    )
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockPersonaUpsert).not.toHaveBeenCalled()
  })

  it('rejects request with no message body', async () => {
    const res = await POST(
      jsonRequest('POST', {
        locale: 'ko',
        type: 'compat',
        // userMessage + assistantMessage both missing → refine fails
      })
    )
    // VALIDATION_ERROR or MISSING_FIELD — either 4xx is acceptable signal
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rejects invalid type value', async () => {
    const res = await POST(
      jsonRequest('POST', {
        locale: 'ko',
        userMessage: 'hi',
        type: 'unknown-service',
      })
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
