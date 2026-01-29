/**
 * Tarot API Smoke Tests
 * Ensures API doesn't crash and returns appropriate HTTP status codes
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '../src/app/api/tarot/route'
import { NextRequest } from 'next/server'

// Mock auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { email: 'test@example.com', id: 'user123' }
  }))
}))

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(() => Promise.resolve({
        id: 'user123',
        email: 'test@example.com',
        credits: 100,
        planType: 'free'
      }))
    },
    tarotReading: {
      create: vi.fn(() => Promise.resolve({ id: 'reading123' }))
    }
  }
}))

describe('Tarot API smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error for request without question', async () => {
    const request = new NextRequest('http://localhost/api/tarot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spread: 'one-card',
        question: ''
      })
    })

    const response = await POST(request)
    const data = await response.json()

    // Should reject with 4xx error
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(data.error).toBeDefined()
  })

  it('does not crash on valid one-card request', async () => {
    const request = new NextRequest('http://localhost/api/tarot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spread: 'one-card',
        question: 'What guidance do I need today?',
        category: 'daily'
      })
    })

    // Should not throw
    const response = await POST(request)
    expect(response).toBeDefined()
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })
})
