// tests/app/api/me/route.mega.test.ts
// Comprehensive tests for User Me API

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ✨ REFACTORED: Use centralized mocks
import { mockNextAuth } from '../../../mocks'

// Initialize auth mock
mockNextAuth()

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

import { GET } from '@/app/api/me/route'
import { getServerSession } from 'next-auth'

const mockGetServerSession = vi.mocked(getServerSession)

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user name when authenticated with name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('John Doe')
  })

  it('should return email when name is not available', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '123',
        email: 'jane@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('jane@example.com')
  })

  it('should prioritize name over email when both available', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '456',
        name: 'Alice Smith',
        email: 'alice@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(data.name).toBe('Alice Smith')
    expect(data.name).not.toBe('alice@example.com')
  })

  it('should return 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 when session is undefined', async () => {
    mockGetServerSession.mockResolvedValue(undefined)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle empty user object', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {},
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeNull()
  })

  it('should handle missing user object', async () => {
    mockGetServerSession.mockResolvedValue({
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeNull()
  })

  it('should handle null name and email', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '789',
        name: null,
        email: null,
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeNull()
  })

  it('should handle undefined name and email', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '101',
        name: undefined,
        email: undefined,
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeNull()
  })

  it('should handle empty string name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '202',
        name: '',
        email: 'user@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('user@example.com')
  })

  it('should handle empty string email', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '303',
        name: null,
        email: '',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeNull()
  })

  it('should return 401 when getServerSession throws error', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Session decryption failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 when getServerSession throws non-Error', async () => {
    mockGetServerSession.mockRejectedValue('String error')

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle special characters in name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '404',
        name: 'José García-López',
        email: 'jose@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(data.name).toBe('José García-López')
  })

  it('should handle Korean characters in name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '505',
        name: '김철수',
        email: 'kim@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(data.name).toBe('김철수')
  })

  it('should handle emoji in name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '606',
        name: 'User 😊',
        email: 'emoji@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(data.name).toBe('User 😊')
  })

  it('should handle very long names', async () => {
    const longName = 'A'.repeat(200)
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '707',
        name: longName,
        email: 'long@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(data.name).toBe(longName)
    expect(data.name.length).toBe(200)
  })

  it('should handle whitespace-only name', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '808',
        name: '   ',
        email: 'whitespace@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    // Whitespace is truthy, so it's returned as-is
    expect(data.name).toBe('   ')
  })

  it('should return JSON content type', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '909',
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const contentType = response.headers.get('content-type')

    expect(contentType).toContain('application/json')
  })

  it('should only include name field in success response', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '010',
        name: 'Simple User',
        email: 'simple@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    const keys = Object.keys(data)
    expect(keys).toEqual(['name'])
    expect(keys.length).toBe(1)
  })

  it('should include error field in error response', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(data).toHaveProperty('error')
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle session with extra fields', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '111',
        name: 'Extra Fields',
        email: 'extra@example.com',
        image: 'https://example.com/avatar.jpg',
        role: 'admin',
      },
      expires: '2024-12-31',
      accessToken: 'token123',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Extra Fields')
    // Should not leak extra fields
    expect(data).not.toHaveProperty('id')
    expect(data).not.toHaveProperty('email')
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('role')
  })

  it('should handle numeric name values', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '212',
        name: 123,
        email: 'number@example.com',
      },
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    // Coerced to string by || operator
    expect(data.name).toBe(123)
  })

  it('should call getServerSession with authOptions', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '313',
        name: 'Auth Test',
        email: 'auth@example.com',
      },
      expires: '2024-12-31',
    })

    await GET()

    expect(mockGetServerSession).toHaveBeenCalledWith({})
    expect(mockGetServerSession).toHaveBeenCalledTimes(1)
  })

  it('should handle null user in session', async () => {
    mockGetServerSession.mockResolvedValue({
      user: null,
      expires: '2024-12-31',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBeNull()
  })

  it('should handle different email formats', async () => {
    const testCases = [
      'simple@example.com',
      'user+tag@example.com',
      'user.name@sub.domain.com',
      'user_name@example.co.uk',
    ]

    for (const email of testCases) {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'test',
          email,
        },
        expires: '2024-12-31',
      })

      const response = await GET()
      const data = await response.json()

      expect(data.name).toBe(email)
    }
  })

  it('should be consistent across multiple calls', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: '414',
        name: 'Consistent User',
        email: 'consistent@example.com',
      },
      expires: '2024-12-31',
    })

    const response1 = await GET()
    const data1 = await response1.json()

    const response2 = await GET()
    const data2 = await response2.json()

    expect(data1.name).toBe(data2.name)
  })
})
