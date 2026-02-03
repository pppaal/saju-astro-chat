/**
 * Comprehensive tests for /api/tarot/save
 * Tests POST/GET operations, validation, pagination, and data integrity
 */

import { POST, GET } from '@/app/api/tarot/save/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('/api/tarot/save', () => {
  const mockUserId = 'user-123'
  const mockContext = { userId: mockUserId }

  const validTarotData = {
    question: 'What does the future hold?',
    theme: 'Future',
    spreadId: 'three-card',
    spreadTitle: 'Three Card Spread',
    cards: [
      {
        cardId: 'major-0',
        name: 'The Fool',
        image: '/cards/fool.jpg',
        isReversed: false,
        position: 'Past',
      },
      {
        cardId: 'major-1',
        name: 'The Magician',
        image: '/cards/magician.jpg',
        isReversed: true,
        position: 'Present',
      },
    ],
    overallMessage: 'A journey begins with courage and wisdom.',
    cardInsights: [
      {
        position: 'Past',
        card_name: 'The Fool',
        is_reversed: false,
        interpretation: 'New beginnings and innocence.',
      },
    ],
    guidance: 'Trust your intuition.',
    affirmation: 'I am open to new possibilities.',
    source: 'standalone' as const,
    locale: 'ko',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/tarot/save', () => {
    describe('Validation - Required Fields', () => {
      it('should reject missing question', async () => {
        const data = { ...validTarotData, question: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toContain('invalid_question')
      })

      it('should reject empty question', async () => {
        const data = { ...validTarotData, question: '' }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
      })

      it('should reject non-string question', async () => {
        const data = { ...validTarotData, question: 123 }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
      })

      it('should reject missing spreadId', async () => {
        const data = { ...validTarotData, spreadId: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_spreadId')
      })

      it('should reject missing spreadTitle', async () => {
        const data = { ...validTarotData, spreadTitle: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_spreadTitle')
      })

      it('should reject missing cards', async () => {
        const data = { ...validTarotData, cards: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_cards')
      })

      it('should reject empty cards array', async () => {
        const data = { ...validTarotData, cards: [] }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
      })
    })

    describe('Validation - Field Length Limits', () => {
      it('should reject question longer than 1000 characters', async () => {
        const data = { ...validTarotData, question: 'a'.repeat(1001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_question')
      })

      it('should accept question at exactly 1000 characters', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, question: 'a'.repeat(1000) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(200)
      })

      it('should reject spreadId longer than 100 characters', async () => {
        const data = { ...validTarotData, spreadId: 'a'.repeat(101) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
      })

      it('should reject spreadTitle longer than 200 characters', async () => {
        const data = { ...validTarotData, spreadTitle: 'a'.repeat(201) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
      })

      it('should reject theme longer than 100 characters', async () => {
        const data = { ...validTarotData, theme: 'a'.repeat(101) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_theme')
      })

      it('should reject overallMessage longer than 5000 characters', async () => {
        const data = { ...validTarotData, overallMessage: 'a'.repeat(5001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_overallMessage')
      })

      it('should reject guidance longer than 2000 characters', async () => {
        const data = { ...validTarotData, guidance: 'a'.repeat(2001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_guidance')
      })

      it('should reject affirmation longer than 500 characters', async () => {
        const data = { ...validTarotData, affirmation: 'a'.repeat(501) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_affirmation')
      })

      it('should reject more than 20 cards', async () => {
        const cards = Array(21).fill(validTarotData.cards[0])
        const data = { ...validTarotData, cards }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(400)
      })
    })

    describe('Validation - Optional Fields', () => {
      it('should accept request without theme', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, theme: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(200)
      })

      it('should accept request without overallMessage', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, overallMessage: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(200)
      })

      it('should accept request without cardInsights', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, cardInsights: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(200)
      })

      it('should use default source "standalone"', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, source: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        await POST(req, mockContext)

        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ source: 'standalone' }),
        })
      })

      it('should use default locale "ko"', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, locale: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        await POST(req, mockContext)

        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ locale: 'ko' }),
        })
      })
    })

    describe('Database Operations', () => {
      it('should save tarot reading successfully', async () => {
        const mockReading = {
          id: 'reading-123',
          userId: mockUserId,
          ...validTarotData,
        }

        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue(mockReading)

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const response = await POST(req, mockContext)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.readingId).toBe('reading-123')
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: {
            userId: mockUserId,
            ...validTarotData,
          },
        })
      })

      it('should save counselor session data', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockResolvedValue({
          id: 'reading-123',
        })

        const counselorData = {
          ...validTarotData,
          source: 'counselor' as const,
          counselorSessionId: 'session-456',
        }

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(counselorData),
        })

        await POST(req, mockContext)

        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            source: 'counselor',
            counselorSessionId: 'session-456',
          }),
        })
      })

      it('should handle database errors', async () => {
        ;(prisma.tarotReading.create as jest.Mock).mockRejectedValue(new Error('Database error'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const response = await POST(req, mockContext)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('GET /api/tarot/save', () => {
    const mockReadings = [
      {
        id: 'reading-1',
        createdAt: new Date('2024-01-01'),
        question: 'Question 1',
        theme: 'Love',
        spreadTitle: 'Three Card',
        cards: [],
        overallMessage: 'Message 1',
        source: 'standalone',
      },
      {
        id: 'reading-2',
        createdAt: new Date('2024-01-02'),
        question: 'Question 2',
        theme: 'Career',
        spreadTitle: 'Celtic Cross',
        cards: [],
        overallMessage: 'Message 2',
        source: 'counselor',
      },
    ]

    describe('Basic Retrieval', () => {
      it('should retrieve user readings with default pagination', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue(mockReadings)
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(2)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const response = await GET(req, mockContext)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.readings).toEqual(mockReadings)
        expect(data.total).toBe(2)
        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith({
          where: { userId: mockUserId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          skip: 0,
          select: expect.any(Object),
        })
      })

      it('should return correct hasMore flag', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue(mockReadings.slice(0, 1))
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(10)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const response = await GET(req, mockContext)
        const data = await response.json()

        expect(data.hasMore).toBe(true)
      })

      it('should return hasMore false when no more readings', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue(mockReadings)
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(2)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const response = await GET(req, mockContext)
        const data = await response.json()

        expect(data.hasMore).toBe(false)
      })
    })

    describe('Pagination', () => {
      it('should respect limit parameter', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=5')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 5 })
        )
      })

      it('should respect offset parameter', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?offset=20')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 20 })
        )
      })

      it('should clamp limit to maximum of 100', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=500')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 100 })
        )
      })

      it('should clamp limit to minimum of 1', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=0')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 1 })
        )
      })

      it('should handle negative offset', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?offset=-10')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0 })
        )
      })

      it('should parse invalid limit as default', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=invalid')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 10 })
        )
      })
    })

    describe('Filtering', () => {
      it('should filter by theme', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?theme=Love')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId, theme: 'Love' },
          })
        )
        expect(prisma.tarotReading.count).toHaveBeenCalledWith({
          where: { userId: mockUserId, theme: 'Love' },
        })
      })

      it('should reject theme longer than 100 characters', async () => {
        const longTheme = 'a'.repeat(101)
        const req = new NextRequest(`http://localhost:3000/api/tarot/save?theme=${longTheme}`)
        const response = await GET(req, mockContext)

        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('invalid_theme')
      })

      it('should handle empty theme parameter', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?theme=')
        await GET(req, mockContext)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId },
          })
        )
      })
    })

    describe('Error Handling', () => {
      it('should handle database query errors', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockRejectedValue(new Error('Query failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const response = await GET(req, mockContext)

        expect(response.status).toBe(500)
      })

      it('should handle database count errors', async () => {
        ;(prisma.tarotReading.findMany as jest.Mock).mockResolvedValue([])
        ;(prisma.tarotReading.count as jest.Mock).mockRejectedValue(new Error('Count failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const response = await GET(req, mockContext)

        expect(response.status).toBe(500)
      })
    })
  })
})
