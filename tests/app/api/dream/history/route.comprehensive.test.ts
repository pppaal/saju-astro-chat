import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    consultationHistory: {
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, DELETE } from '@/app/api/dream/history/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

describe('/api/dream/history', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET - Fetch Dream History', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should fetch dream history with default pagination', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: new Date('2024-01-15'),
          summary: 'Flying dream',
          fullReport: 'Full interpretation...',
          signals: {
            dreamSymbols: [{ label: 'Sky' }, { label: 'Wings' }],
            themes: [{ label: 'Freedom', weight: 0.9 }],
            luckyElements: { luckyNumbers: [7, 14, 21] },
          },
          userQuestion: 'I had a dream about flying',
        },
        {
          id: 'dream-2',
          createdAt: new Date('2024-01-10'),
          summary: 'Water dream',
          fullReport: 'Full interpretation...',
          signals: {
            symbols: ['Ocean', 'Waves'],
            themes: [{ label: 'Emotions', weight: 0.8 }],
          },
          userQuestion: 'Dreamed of ocean',
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(2)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.history).toHaveLength(2)
      expect(data.history[0].id).toBe('dream-1')
      expect(data.history[0].symbols).toEqual(['Sky', 'Wings'])
      expect(data.history[0].themes).toEqual([{ label: 'Freedom', weight: 0.9 }])
      expect(data.history[0].luckyNumbers).toEqual([7, 14, 21])
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.limit).toBe(20)
      expect(data.pagination.offset).toBe(0)
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should handle custom pagination parameters', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(100)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=10&offset=20')

      const response = await GET(req)
      const data = await response.json()

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', theme: 'dream' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
        select: expect.any(Object),
      })
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.offset).toBe(20)
      expect(data.pagination.hasMore).toBe(true)
    })

    it('should limit maximum page size to 50', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=100')

      const response = await GET(req)
      const data = await response.json()

      expect(data.pagination.limit).toBe(50)
    })

    it('should enforce minimum page size of 1', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=0')

      const response = await GET(req)
      const data = await response.json()

      expect(data.pagination.limit).toBe(1)
    })

    it('should handle negative offset', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?offset=-10')

      const response = await GET(req)
      const data = await response.json()

      expect(data.pagination.offset).toBe(0)
    })

    it('should handle invalid limit parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=invalid')

      const response = await GET(req)
      const data = await response.json()

      expect(data.pagination.limit).toBe(20) // Default
    })

    it('should handle invalid offset parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?offset=NaN')

      const response = await GET(req)
      const data = await response.json()

      expect(data.pagination.offset).toBe(0) // Default
    })

    it('should filter by dream theme', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      await GET(req)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', theme: 'dream' },
        })
      )
    })

    it('should order by createdAt descending', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      await GET(req)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should handle empty history', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.history).toEqual([])
      expect(data.pagination.total).toBe(0)
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should handle null signals gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: new Date('2024-01-15'),
          summary: 'Dream summary',
          fullReport: null,
          signals: null,
          userQuestion: 'My dream',
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(1)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.history[0].symbols).toBeUndefined()
      expect(data.history[0].themes).toBeUndefined()
      expect(data.history[0].luckyNumbers).toBeUndefined()
    })

    it('should use default summary when null', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: new Date('2024-01-15'),
          summary: null,
          fullReport: null,
          signals: null,
          userQuestion: null,
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(1)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(data.history[0].summary).toBe('꿈 해석')
    })

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching dream history:',
        expect.any(Error)
      )
    })

    it('should format createdAt as ISO string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDate = new Date('2024-01-15T10:30:00Z')
      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: mockDate,
          summary: 'Test',
          fullReport: null,
          signals: null,
          userQuestion: null,
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(1)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(data.history[0].createdAt).toBe(mockDate.toISOString())
    })
  })

  describe('DELETE - Delete Dream History', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should require id parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing id parameter')
    })

    it('should reject overly long id parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const longId = 'a'.repeat(101)
      const req = new NextRequest(`http://localhost:3000/api/dream/history?id=${longId}`)

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing id parameter')
    })

    it('should successfully delete owned dream', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'dream-1',
          userId: 'user-123',
          theme: 'dream',
        },
      })
    })

    it('should return 404 if dream not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 0 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=nonexistent')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Dream not found')
    })

    it('should only delete dreams owned by user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      await DELETE(req)

      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'dream-1',
          userId: 'user-123',
          theme: 'dream',
        },
      })
    })

    it('should only delete dream theme entries', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      await DELETE(req)

      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            theme: 'dream',
          }),
        })
      )
    })

    it('should handle database errors on delete', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockRejectedValue(
        new Error('Database error')
      )

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalledWith('Error deleting dream:', expect.any(Error))
    })

    it('should handle empty id parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing id parameter')
    })
  })

  describe('Edge Cases', () => {
    it('should handle Infinity limit parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=Infinity')

      const response = await GET(req)
      const data = await response.json()

      expect(data.pagination.limit).toBe(20) // Default fallback
    })

    it('should handle session without user id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle large offset values', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(10)

      const req = new NextRequest('http://localhost:3000/api/dream/history?offset=10000')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.hasMore).toBe(false)
    })
  })
})
