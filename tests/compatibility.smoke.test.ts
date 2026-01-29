/**
 * Compatibility API Smoke Tests
 * Ensures API doesn't crash and returns appropriate HTTP status codes
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { POST } from '../src/app/api/compatibility/route'
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
    }
  }
}))

describe('Compatibility API smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error for empty persons array', async () => {
    const request = new NextRequest('http://localhost/api/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persons: [] })
    })

    const response = await POST(request)
    const data = await response.json()

    // Should reject with 4xx error (validation or auth)
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(data.error).toBeDefined()
  })

  it('returns error for single person', async () => {
    const request = new NextRequest('http://localhost/api/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persons: [{
          name: 'Person A',
          birthDate: '1990-01-01',
          birthTime: '10:00',
          gender: 'M'
        }]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    // Should reject with 4xx error
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(data.error).toBeDefined()
  })

  it('does not crash on valid 2-person request', async () => {
    const request = new NextRequest('http://localhost/api/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persons: [
          {
            name: 'Person A',
            birthDate: '1990-05-15',
            birthTime: '10:00',
            gender: 'M',
            birthPlace: 'Seoul'
          },
          {
            name: 'Person B',
            birthDate: '1992-08-20',
            birthTime: '14:30',
            gender: 'F',
            birthPlace: 'Seoul'
          }
        ],
        relationshipType: 'lover'
      })
    })

    // Should not throw
    const response = await POST(request)
    expect(response).toBeDefined()
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })
})
