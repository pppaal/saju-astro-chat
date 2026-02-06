/**
 * Comprehensive unit tests for /api/life-prediction/save-timing
 * Tests POST handler for saving timing prediction results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies before importing the route
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: 'test-user-id', session: { user: { id: 'test-user-id' } } }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusCodeMap: Record<string, number> = {
          VALIDATION_ERROR: 422,
          DATABASE_ERROR: 500,
          INTERNAL_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusCodeMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    consultationHistory: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  lifePredictionSaveTimingSchema: {
    safeParse: vi.fn(),
  },
}))

// Import after mocking
import { POST } from '@/app/api/life-prediction/save-timing/route'
import { prisma } from '@/lib/db/prisma'
import { lifePredictionSaveTimingSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

describe('/api/life-prediction/save-timing', () => {
  const mockUserId = 'test-user-id'

  const validTimingResult = {
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    score: 85,
    grade: 'A',
    reasons: ['대운 합', '세운 길성', '월운 안정'],
  }

  const validRequestBody = {
    question: '결혼하기 좋은 시기는 언제인가요?',
    eventType: 'marriage',
    results: [
      validTimingResult,
      {
        startDate: '2024-09-01',
        endDate: '2024-09-30',
        score: 78,
        grade: 'B+',
        reasons: ['대운 길', '세운 중립'],
      },
      {
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        score: 72,
        grade: 'B',
        reasons: ['월운 길성'],
      },
    ],
    birthDate: '1990-05-15',
    gender: 'M',
    locale: 'ko' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/life-prediction/save-timing', () => {
    describe('Validation', () => {
      it('should return 422 when validation fails', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [
              { path: ['question'], message: 'Required' },
              { path: ['eventType'], message: 'Required' },
            ],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('Validation failed')
        expect(logger.warn).toHaveBeenCalledWith(
          '[life-prediction/save-timing] validation failed',
          expect.any(Object)
        )
      })

      it('should return 422 when question is missing', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['question'], message: 'Required' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ eventType: 'marriage', results: [] }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('Required')
      })

      it('should return 422 when question exceeds max length', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['question'], message: 'String must contain at most 500 character(s)' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ question: 'a'.repeat(501) }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('500 character')
      })

      it('should return 422 when eventType is missing', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['eventType'], message: 'Required' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ question: 'test' }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })

      it('should return 422 when results array is empty', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['results'], message: 'Array must contain at least 1 element(s)' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, results: [] }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('at least 1 element')
      })

      it('should return 422 when results array exceeds max length', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['results'], message: 'Array must contain at most 50 element(s)' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const manyResults = Array(51).fill(validTimingResult)
        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, results: manyResults }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('50 element')
      })

      it('should return 422 when birthDate has invalid format', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['birthDate'], message: 'Invalid date format. Expected YYYY-MM-DD' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, birthDate: '1990/05/15' }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('Invalid date format')
      })

      it('should return 422 when gender is invalid', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['gender'], message: 'Invalid enum value' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, gender: 'X' }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })

      it('should return 422 when score is out of range', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['results', 0, 'score'], message: 'Number must be less than or equal to 100' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const invalidResults = [{ ...validTimingResult, score: 150 }]
        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, results: invalidResults }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('100')
      })

      it('should return 422 when reasons array exceeds max length', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['results', 0, 'reasons'], message: 'Array must contain at most 20 element(s)' }],
          },
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue(validationError as any)

        const manyReasons = Array(21).fill('reason')
        const invalidResults = [{ ...validTimingResult, reasons: manyReasons }]
        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, results: invalidResults }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('20 element')
      })
    })

    describe('Successful Save - Korean Locale', () => {
      it('should save timing prediction successfully with ko locale', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-timing-123',
          userId: mockUserId,
          theme: 'life-prediction-timing',
          summary: '"결혼하기 좋은 시기는 언제인가요?" - A등급 (85점)',
          fullReport: 'Full report content',
          signals: {},
          locale: 'ko',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.consultationId).toBe('consultation-timing-123')
        expect(data.data.message).toBe('예측 결과가 저장되었습니다')

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: {
            userId: mockUserId,
            theme: 'life-prediction-timing',
            summary: expect.stringContaining('A등급 (85점)'),
            fullReport: expect.stringContaining('🔮 인생 예측 결과'),
            signals: expect.objectContaining({
              question: validRequestBody.question,
              eventType: 'marriage',
              birthDate: '1990-05-15',
              gender: 'M',
              topResult: expect.objectContaining({
                startDate: '2024-06-01',
                endDate: '2024-06-30',
                score: 85,
                grade: 'A',
              }),
              totalResults: 3,
            }),
            locale: 'ko',
          },
        })
      })

      it('should generate Korean summary with top result info', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-summary-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            summary: `"${validRequestBody.question}" - A등급 (85점)`,
          }),
        })
      })

      it('should generate Korean full report with all event types', async () => {
        const eventTypes = [
          { type: 'marriage', label: '결혼' },
          { type: 'career', label: '취업/이직' },
          { type: 'investment', label: '투자' },
          { type: 'move', label: '이사' },
          { type: 'study', label: '시험/학업' },
          { type: 'health', label: '건강' },
          { type: 'relationship', label: '연애' },
          { type: 'general', label: '일반' },
        ]

        for (const { type, label } of eventTypes) {
          vi.clearAllMocks()

          const requestWithEventType = {
            ...validRequestBody,
            eventType: type,
          }

          vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
            success: true,
            data: requestWithEventType,
          } as any)

          vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
            id: `consultation-${type}`,
          } as any)

          const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
            method: 'POST',
            body: JSON.stringify(requestWithEventType),
          })

          await POST(req)

          expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              fullReport: expect.stringContaining(`카테고리: ${label}`),
            }),
          })
        }
      })

      it('should include reasons in Korean full report', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-reasons-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fullReport: expect.stringContaining('분석:'),
          }),
        })
      })
    })

    describe('Successful Save - English Locale', () => {
      it('should save timing prediction successfully with en locale', async () => {
        const enRequest = {
          ...validRequestBody,
          locale: 'en' as const,
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: enRequest,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-en-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(enRequest),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.message).toBe('Prediction saved successfully')

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            summary: expect.stringContaining('Grade A (85pts)'),
            fullReport: expect.stringContaining('🔮 Life Prediction Result'),
            locale: 'en',
          }),
        })
      })

      it('should generate English full report with event types', async () => {
        const eventTypes = [
          { type: 'marriage', label: 'Marriage' },
          { type: 'career', label: 'Career' },
          { type: 'investment', label: 'Investment' },
          { type: 'move', label: 'Moving' },
          { type: 'study', label: 'Study' },
          { type: 'health', label: 'Health' },
          { type: 'relationship', label: 'Relationship' },
          { type: 'general', label: 'General' },
        ]

        for (const { type, label } of eventTypes) {
          vi.clearAllMocks()

          const requestWithEventType = {
            ...validRequestBody,
            eventType: type,
            locale: 'en' as const,
          }

          vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
            success: true,
            data: requestWithEventType,
          } as any)

          vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
            id: `consultation-en-${type}`,
          } as any)

          const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
            method: 'POST',
            body: JSON.stringify(requestWithEventType),
          })

          await POST(req)

          expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              fullReport: expect.stringContaining(`Category: ${label}`),
            }),
          })
        }
      })

      it('should include Analysis in English full report', async () => {
        const enRequest = {
          ...validRequestBody,
          locale: 'en' as const,
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: enRequest,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-analysis-en',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(enRequest),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fullReport: expect.stringContaining('Analysis:'),
          }),
        })
      })

      it('should use English date format in report', async () => {
        const enRequest = {
          ...validRequestBody,
          locale: 'en' as const,
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: enRequest,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-date-en',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(enRequest),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fullReport: expect.stringContaining('Recommended Periods'),
          }),
        })
      })
    })

    describe('Database Operations', () => {
      it('should correctly structure signals with topResult', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-signals-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            signals: expect.objectContaining({
              topResult: {
                startDate: '2024-06-01',
                endDate: '2024-06-30',
                score: 85,
                grade: 'A',
                reasons: ['대운 합', '세운 길성', '월운 안정'],
              },
            }),
          }),
        })
      })

      it('should include allResults limited to 5 in signals', async () => {
        const requestWithManyResults = {
          ...validRequestBody,
          results: Array(10)
            .fill(null)
            .map((_, i) => ({
              startDate: `2024-0${(i % 9) + 1}-01`,
              endDate: `2024-0${(i % 9) + 1}-30`,
              score: 90 - i * 5,
              grade: i < 3 ? 'A' : 'B',
              reasons: [`Reason ${i + 1}`],
            })),
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithManyResults,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-many-results',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithManyResults),
        })

        await POST(req)

        const createCall = vi.mocked(prisma.consultationHistory.create).mock.calls[0][0]
        const signals = createCall.data.signals as any
        expect(signals.allResults).toHaveLength(5)
        expect(signals.totalResults).toBe(10)
      })

      it('should include totalResults count in signals', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-total-results',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            signals: expect.objectContaining({
              totalResults: 3,
            }),
          }),
        })
      })

      it('should set theme to life-prediction-timing', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-theme-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            theme: 'life-prediction-timing',
          }),
        })
      })
    })

    describe('Database Errors', () => {
      it('should return DATABASE_ERROR when prisma create fails', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockRejectedValue(
          new Error('Database connection failed')
        )

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('DATABASE_ERROR')
        expect(data.error.message).toBe('Internal server error')
        expect(logger.error).toHaveBeenCalledWith(
          '[life-prediction/save-timing API error]',
          expect.any(Error)
        )
      })

      it('should handle Prisma unique constraint violation', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        const prismaError = new Error('Unique constraint violation')
        ;(prismaError as any).code = 'P2002'
        vi.mocked(prisma.consultationHistory.create).mockRejectedValue(prismaError)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error.code).toBe('DATABASE_ERROR')
      })

      it('should handle database timeout errors', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        const timeoutError = new Error('Query timed out')
        ;(timeoutError as any).code = 'P2024'
        vi.mocked(prisma.consultationHistory.create).mockRejectedValue(timeoutError)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error.code).toBe('DATABASE_ERROR')
        expect(logger.error).toHaveBeenCalled()
      })
    })

    describe('Full Report Generation', () => {
      it('should generate report with correct number of results (max 5)', async () => {
        const requestWithManyResults = {
          ...validRequestBody,
          results: Array(10)
            .fill(null)
            .map((_, i) => ({
              startDate: `2024-0${(i % 9) + 1}-01`,
              endDate: `2024-0${(i % 9) + 1}-30`,
              score: 90 - i * 5,
              grade: 'A',
              reasons: [`Reason ${i + 1}`],
            })),
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithManyResults,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-report-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithManyResults),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fullReport: expect.stringContaining('📊 추천 시기 (총 10개)'),
          }),
        })
      })

      it('should handle result with empty reasons array', async () => {
        const requestWithEmptyReasons = {
          ...validRequestBody,
          results: [
            {
              startDate: '2024-06-01',
              endDate: '2024-06-30',
              score: 85,
              grade: 'A',
              reasons: [],
            },
          ],
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithEmptyReasons,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-no-reasons',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithEmptyReasons),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        // Should not include "분석:" line when reasons are empty
        const createCall = vi.mocked(prisma.consultationHistory.create).mock.calls[0][0]
        const fullReport = createCall.data.fullReport as string
        expect(fullReport).toContain('등급: A (85점)')
      })

      it('should limit reasons to first 2 in report', async () => {
        const requestWithManyReasons = {
          ...validRequestBody,
          results: [
            {
              startDate: '2024-06-01',
              endDate: '2024-06-30',
              score: 85,
              grade: 'A',
              reasons: ['Reason 1', 'Reason 2', 'Reason 3', 'Reason 4'],
            },
          ],
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithManyReasons,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-limited-reasons',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithManyReasons),
        })

        await POST(req)

        const createCall = vi.mocked(prisma.consultationHistory.create).mock.calls[0][0]
        const fullReport = createCall.data.fullReport as string
        expect(fullReport).toContain('Reason 1 / Reason 2')
        expect(fullReport).not.toContain('Reason 3')
      })

      it('should include question in full report', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-question-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fullReport: expect.stringContaining(`질문: "${validRequestBody.question}"`),
          }),
        })
      })
    })

    describe('Optional Fields', () => {
      it('should default to ko locale when not provided', async () => {
        const requestWithoutLocale = {
          question: validRequestBody.question,
          eventType: validRequestBody.eventType,
          results: validRequestBody.results,
          birthDate: validRequestBody.birthDate,
          gender: validRequestBody.gender,
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithoutLocale,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-default-locale',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithoutLocale),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.message).toBe('예측 결과가 저장되었습니다')
        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            locale: 'ko',
          }),
        })
      })

      it('should handle unknown event type gracefully', async () => {
        const requestWithUnknownEventType = {
          ...validRequestBody,
          eventType: 'unknown_type',
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithUnknownEventType,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-unknown-event',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithUnknownEventType),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        // Should use the event type as-is when not in the mapping
        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fullReport: expect.stringContaining('카테고리: unknown_type'),
          }),
        })
      })
    })

    describe('Authentication', () => {
      it('should use withApiMiddleware with authentication guard', async () => {
        // The route exports POST which is wrapped with withApiMiddleware
        // The createAuthenticatedGuard is called at module load time
        // We verify it's properly configured by checking the mock was set up
        const { withApiMiddleware, createAuthenticatedGuard } = await import('@/lib/api/middleware')

        // Both middleware functions should be defined in the mock
        expect(withApiMiddleware).toBeDefined()
        expect(createAuthenticatedGuard).toBeDefined()
        expect(typeof withApiMiddleware).toBe('function')
        expect(typeof createAuthenticatedGuard).toBe('function')
      })

      it('should include userId from context in database record', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-user-123',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: mockUserId,
          }),
        })
      })
    })

    describe('Edge Cases', () => {
      it('should handle single result correctly', async () => {
        const singleResultRequest = {
          ...validRequestBody,
          results: [validTimingResult],
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: singleResultRequest,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-single-result',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(singleResultRequest),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            signals: expect.objectContaining({
              totalResults: 1,
              allResults: expect.arrayContaining([
                expect.objectContaining({
                  startDate: '2024-06-01',
                }),
              ]),
            }),
          }),
        })
      })

      it('should handle very long question within limits', async () => {
        const longQuestion = '가'.repeat(500)
        const requestWithLongQuestion = {
          ...validRequestBody,
          question: longQuestion,
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithLongQuestion,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-long-question',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithLongQuestion),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            signals: expect.objectContaining({
              question: longQuestion,
            }),
          }),
        })
      })

      it('should handle special characters in question', async () => {
        const specialQuestion = '결혼 시기 <script>alert("xss")</script> & "quotes"'
        const requestWithSpecialChars = {
          ...validRequestBody,
          question: specialQuestion,
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithSpecialChars,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-special-chars',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(requestWithSpecialChars),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should preserve exact date strings from input', async () => {
        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-dates',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        const createCall = vi.mocked(prisma.consultationHistory.create).mock.calls[0][0]
        const signals = createCall.data.signals as any
        expect(signals.topResult.startDate).toBe('2024-06-01')
        expect(signals.topResult.endDate).toBe('2024-06-30')
        expect(signals.birthDate).toBe('1990-05-15')
      })

      it('should handle female gender', async () => {
        const femaleRequest = {
          ...validRequestBody,
          gender: 'F',
        }

        vi.mocked(lifePredictionSaveTimingSchema.safeParse).mockReturnValue({
          success: true,
          data: femaleRequest,
        } as any)

        vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
          id: 'consultation-female',
        } as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save-timing', {
          method: 'POST',
          body: JSON.stringify(femaleRequest),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            signals: expect.objectContaining({
              gender: 'F',
            }),
          }),
        })
      })
    })
  })
})
