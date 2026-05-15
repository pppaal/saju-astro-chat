// Smoke tests for /api/counselor/session/list (GET / DELETE / PATCH).
// The route persists chat metadata for the counselor sidebar (display
// title, list, delete). These tests stub the Prisma client + auth
// middleware so the handler can be exercised without a real DB.

import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselorChatSession: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

vi.mock('@/lib/api/middleware', async () => {
  return {
    withApiMiddleware: <T>(
      handler: (
        req: NextRequest,
        ctx: { userId: string; locale: string }
      ) => Promise<T>
    ) =>
      async (req: NextRequest): Promise<T> =>
        handler(req, { userId: 'user_test_1', locale: 'en' }),
    createAuthenticatedGuard: vi.fn(() => ({})),
    extractLocale: vi.fn(() => 'en'),
  }
})

import {
  GET,
  DELETE,
  PATCH,
} from '@/app/api/counselor/session/list/route'

beforeEach(() => {
  mockFindMany.mockReset()
  mockFindFirst.mockReset()
  mockUpdate.mockReset()
  mockDelete.mockReset()
})

function jsonRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('counselor/session/list GET', () => {
  it('returns the user sessions list including title', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'cm_a',
        title: 'My promotion chat',
        locale: 'ko',
        messageCount: 4,
        summary: null,
        keyTopics: null,
        createdAt: new Date('2026-05-10'),
        updatedAt: new Date('2026-05-14'),
        lastMessageAt: new Date('2026-05-14'),
      },
    ])
    const res = await GET(jsonRequest('GET', 'http://localhost/api/counselor/session/list'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessions: Array<Record<string, unknown>> }
    expect(body.sessions).toHaveLength(1)
    expect(body.sessions[0]).toMatchObject({
      id: 'cm_a',
      title: 'My promotion chat',
    })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_test_1' },
        select: expect.objectContaining({ title: true }),
      })
    )
  })
})

describe('counselor/session/list DELETE', () => {
  it('deletes a session owned by the user', async () => {
    mockFindFirst.mockResolvedValue({ id: 'cm_target' })
    mockDelete.mockResolvedValue({ id: 'cm_target' })

    const res = await DELETE(
      jsonRequest(
        'DELETE',
        'http://localhost/api/counselor/session/list?sessionId=cm_target'
      )
    )
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'cm_target' } })
  })

  it('refuses to delete a session not owned by the user', async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await DELETE(
      jsonRequest(
        'DELETE',
        'http://localhost/api/counselor/session/list?sessionId=cm_other'
      )
    )
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('rejects missing sessionId param', async () => {
    const res = await DELETE(
      jsonRequest(
        'DELETE',
        'http://localhost/api/counselor/session/list'
      )
    )
    // Missing required field → MISSING_FIELD (400)
    expect(res.status).toBe(400)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})

describe('counselor/session/list PATCH (rename)', () => {
  it('renames a session owned by the user', async () => {
    mockFindFirst.mockResolvedValue({ id: 'cm_target' })
    mockUpdate.mockResolvedValue({
      id: 'cm_target',
      title: 'New title',
      updatedAt: new Date('2026-05-15'),
    })

    const res = await PATCH(
      jsonRequest('PATCH', 'http://localhost/api/counselor/session/list', {
        sessionId: 'cm_target',
        title: '  New title  ', // verify trim()
      })
    )
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'cm_target' },
      data: { title: 'New title' }, // trimmed
      select: expect.any(Object),
    })
  })

  it('refuses to rename a session not owned by the user', async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await PATCH(
      jsonRequest('PATCH', 'http://localhost/api/counselor/session/list', {
        sessionId: 'cm_other',
        title: 'Whatever',
      })
    )
    expect(res.status).toBe(404)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only title (after trim → empty)', async () => {
    const res = await PATCH(
      jsonRequest('PATCH', 'http://localhost/api/counselor/session/list', {
        sessionId: 'cm_target',
        title: '   ',
      })
    )
    // VALIDATION_ERROR → 422 per project convention
    expect(res.status).toBe(422)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects title over 80 chars', async () => {
    const res = await PATCH(
      jsonRequest('PATCH', 'http://localhost/api/counselor/session/list', {
        sessionId: 'cm_target',
        title: 'a'.repeat(81),
      })
    )
    expect(res.status).toBe(422)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/counselor/session/list', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
