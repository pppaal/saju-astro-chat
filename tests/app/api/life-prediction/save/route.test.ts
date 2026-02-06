/**
 * Comprehensive unit tests for /api/life-prediction/save
 * Tests POST handler for saving multi-year trend predictions
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
        const statusMap: Record<string, number> = {
          VALIDATION_ERROR: 'VALIDATION_ERROR',
          DATABASE_ERROR: 'DATABASE_ERROR',
          INTERNAL_ERROR: 'INTERNAL_ERROR',
        }
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

vi.mock('@/lib/consultation/saveConsultation', () => ({
  saveConsultation: vi.fn(),
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
  lifePredictionMultiYearSaveSchema: {
    safeParse: vi.fn(),
  },
}))

// Import after mocking
import { POST } from '@/app/api/life-prediction/save/route'
import { saveConsultation } from '@/lib/consultation/saveConsultation'
import { lifePredictionMultiYearSaveSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

describe('/api/life-prediction/save', () => {
  const mockUserId = 'test-user-id'

  const validMultiYearTrend = {
    startYear: 2024,
    endYear: 2034,
    overallTrend: 'ascending',
    peakYears: [2026, 2030],
    lowYears: [2025, 2028],
    summary: '2024년부터 2034년까지의 인생 예측입니다. 전반적으로 상승세를 보입니다.',
  }

  const validRequestBody = {
    multiYearTrend: validMultiYearTrend,
    saju: { dayMaster: '甲', element: 'wood' },
    astro: { sunSign: 'Aries', moonSign: 'Taurus' },
    locale: 'ko' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/life-prediction/save', () => {
    describe('Validation', () => {
      it('should return 422 when validation fails', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [
              { path: ['multiYearTrend', 'startYear'], message: 'Required' },
              { path: ['multiYearTrend', 'endYear'], message: 'Required' },
            ],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
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
          '[LifePredictionSave] validation failed',
          expect.any(Object)
        )
      })

      it('should return 422 when startYear is invalid', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['multiYearTrend', 'startYear'], message: 'Invalid start year' }],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify({ multiYearTrend: { startYear: 1800 } }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('Invalid start year')
      })

      it('should return 422 when endYear is invalid', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['multiYearTrend', 'endYear'], message: 'Invalid end year' }],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify({ multiYearTrend: { endYear: 2200 } }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('Invalid end year')
      })

      it('should return 422 when overallTrend exceeds max length', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['multiYearTrend', 'overallTrend'], message: 'String must be at most 2000 characters' }],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify({ multiYearTrend: { overallTrend: 'a'.repeat(2001) } }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('2000 characters')
      })

      it('should return 422 when summary exceeds max length', async () => {
        const validationError = {
          success: false,
          error: {
            issues: [{ path: ['multiYearTrend', 'summary'], message: 'String must be at most 3000 characters' }],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue(validationError as any)

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify({ multiYearTrend: { summary: 'a'.repeat(3001) } }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(422)
        expect(data.error.message).toContain('3000 characters')
      })
    })

    describe('Successful Save - Korean Locale', () => {
      it('should save prediction successfully with ko locale', async () => {
        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-123',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.consultationId).toBe('consultation-123')
        expect(data.data.message).toBe('예측 결과가 저장되었습니다')

        expect(saveConsultation).toHaveBeenCalledWith({
          userId: mockUserId,
          theme: 'life-prediction',
          summary: validMultiYearTrend.summary,
          fullReport: expect.stringContaining('📈 2024~2034년 인생 예측 분석'),
          signals: {
            saju: validRequestBody.saju,
            astro: validRequestBody.astro,
            multiYearTrend: {
              startYear: 2024,
              endYear: 2034,
              overallTrend: 'ascending',
              peakYears: [2026, 2030],
              lowYears: [2025, 2028],
            },
          },
          locale: 'ko',
        })
      })

      it('should generate Korean summary when summary is empty', async () => {
        const requestWithoutSummary = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            summary: '',
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithoutSummary,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-456',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithoutSummary),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: expect.stringContaining('2024~2034년 인생 예측'),
          })
        )
      })

      it('should generate correct Korean trend labels', async () => {
        const trends = [
          { trend: 'ascending', label: '상승세' },
          { trend: 'descending', label: '하락세' },
          { trend: 'stable', label: '안정세' },
          { trend: 'volatile', label: '변동적' },
        ]

        for (const { trend, label } of trends) {
          vi.clearAllMocks()

          const requestWithTrend = {
            ...validRequestBody,
            multiYearTrend: {
              ...validMultiYearTrend,
              overallTrend: trend,
              summary: '', // Force summary generation
            },
          }

          vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
            success: true,
            data: requestWithTrend,
          } as any)

          vi.mocked(saveConsultation).mockResolvedValue({
            success: true,
            consultationId: 'consultation-test',
          })

          const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
            method: 'POST',
            body: JSON.stringify(requestWithTrend),
          })

          await POST(req)

          expect(saveConsultation).toHaveBeenCalledWith(
            expect.objectContaining({
              summary: expect.stringContaining(label),
            })
          )
        }
      })
    })

    describe('Successful Save - English Locale', () => {
      it('should save prediction successfully with en locale', async () => {
        const enRequest = {
          ...validRequestBody,
          locale: 'en' as const,
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: enRequest,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-789',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(enRequest),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.message).toBe('Prediction saved successfully')
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            locale: 'en',
            fullReport: expect.stringContaining('📈 2024-2034 Life Prediction Analysis'),
          })
        )
      })

      it('should generate English summary when summary is empty', async () => {
        const enRequestWithoutSummary = {
          ...validRequestBody,
          locale: 'en' as const,
          multiYearTrend: {
            ...validMultiYearTrend,
            summary: '',
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: enRequestWithoutSummary,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-en',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(enRequestWithoutSummary),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: expect.stringContaining('2024-2034 Life Prediction'),
          })
        )
      })

      it('should generate correct English trend labels', async () => {
        const trends = ['ascending', 'descending', 'stable', 'volatile']

        for (const trend of trends) {
          vi.clearAllMocks()

          const requestWithTrend = {
            ...validRequestBody,
            locale: 'en' as const,
            multiYearTrend: {
              ...validMultiYearTrend,
              overallTrend: trend,
              summary: '', // Force summary generation
            },
          }

          vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
            success: true,
            data: requestWithTrend,
          } as any)

          vi.mocked(saveConsultation).mockResolvedValue({
            success: true,
            consultationId: 'consultation-test',
          })

          const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
            method: 'POST',
            body: JSON.stringify(requestWithTrend),
          })

          await POST(req)

          expect(saveConsultation).toHaveBeenCalledWith(
            expect.objectContaining({
              summary: expect.stringContaining(trend),
            })
          )
        }
      })
    })

    describe('Database Errors', () => {
      it('should return DATABASE_ERROR when saveConsultation fails', async () => {
        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: false,
          error: new Error('Database connection failed'),
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('DATABASE_ERROR')
        expect(data.error.message).toBe('Failed to save prediction')
      })

      it('should handle exception in saveConsultation', async () => {
        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(saveConsultation).mockRejectedValue(new Error('Unexpected database error'))

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('INTERNAL_ERROR')
        expect(data.error.message).toBe('Internal server error')
        expect(logger.error).toHaveBeenCalledWith(
          '[life-prediction/save API error]',
          expect.any(Error)
        )
      })
    })

    describe('Summary Generation', () => {
      it('should generate summary correctly with peak years', async () => {
        const requestWithMultiplePeakYears = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            peakYears: [2026, 2028, 2030, 2032],
            summary: '',
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithMultiplePeakYears,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-peak',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithMultiplePeakYears),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: expect.stringContaining('2026, 2028, 2030, 2032'),
          })
        )
      })

      it('should use provided summary instead of generating one', async () => {
        const customSummary = '사용자 정의 요약 메시지입니다.'
        const requestWithCustomSummary = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            summary: customSummary,
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithCustomSummary,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-custom',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithCustomSummary),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: customSummary,
          })
        )
      })
    })

    describe('Full Report Generation', () => {
      it('should include yearlyScores in report when provided', async () => {
        const requestWithYearlyScores = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            yearlyScores: [
              { year: 2024, score: 75, grade: 'A', themes: ['career', 'health'] },
              { year: 2025, score: 60, grade: 'B', themes: ['relationship'] },
              { year: 2026, score: 85, grade: 'A+', themes: ['wealth', 'success'] },
            ],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithYearlyScores,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-scores',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithYearlyScores),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('--- 연도별 상세 ---'),
          })
        )
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('2024: A (75점)'),
          })
        )
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('career, health'),
          })
        )
      })

      it('should include English yearly details header when locale is en', async () => {
        const requestWithYearlyScoresEn = {
          ...validRequestBody,
          locale: 'en' as const,
          multiYearTrend: {
            ...validMultiYearTrend,
            yearlyScores: [
              { year: 2024, score: 75, grade: 'A' },
            ],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithYearlyScoresEn,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-en-scores',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithYearlyScoresEn),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('--- Yearly Details ---'),
          })
        )
      })

      it('should include low years in Korean report', async () => {
        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-low',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('주의가 필요한 해: 2025, 2028년'),
          })
        )
      })

      it('should include Years to Watch in English report', async () => {
        const enRequest = {
          ...validRequestBody,
          locale: 'en' as const,
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: enRequest,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-watch',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(enRequest),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('Years to Watch: 2025, 2028'),
          })
        )
      })

      it('should not include low years section when lowYears is empty', async () => {
        const requestNoLowYears = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            lowYears: [],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestNoLowYears,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-no-low',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestNoLowYears),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.not.stringContaining('주의가 필요한 해'),
          })
        )
      })
    })

    describe('Optional Fields', () => {
      it('should handle request without saju data', async () => {
        const requestWithoutSaju = {
          multiYearTrend: validMultiYearTrend,
          astro: validRequestBody.astro,
          locale: 'ko' as const,
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithoutSaju,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-no-saju',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithoutSaju),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            signals: expect.objectContaining({
              saju: null,
              astro: validRequestBody.astro,
            }),
          })
        )
      })

      it('should handle request without astro data', async () => {
        const requestWithoutAstro = {
          multiYearTrend: validMultiYearTrend,
          saju: validRequestBody.saju,
          locale: 'ko' as const,
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithoutAstro,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-no-astro',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithoutAstro),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            signals: expect.objectContaining({
              saju: validRequestBody.saju,
              astro: null,
            }),
          })
        )
      })

      it('should default to ko locale when not provided', async () => {
        const requestWithoutLocale = {
          multiYearTrend: validMultiYearTrend,
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithoutLocale,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-default-locale',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithoutLocale),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.message).toBe('예측 결과가 저장되었습니다')
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            locale: 'ko',
          })
        )
      })
    })

    describe('Yearly Scores Details', () => {
      it('should handle yearlyScores without themes', async () => {
        const requestWithScoresNoThemes = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            yearlyScores: [
              { year: 2024, score: 75, grade: 'A' },
              { year: 2025, score: 60, grade: 'B' },
            ],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithScoresNoThemes,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-no-themes',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithScoresNoThemes),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.stringContaining('2024: A (75점)'),
          })
        )
        // Should not have theme suffix
        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.not.stringContaining('2024: A (75점) -'),
          })
        )
      })

      it('should handle empty yearlyScores array', async () => {
        const requestWithEmptyScores = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            yearlyScores: [],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithEmptyScores,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-empty-scores',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithEmptyScores),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            fullReport: expect.not.stringContaining('--- 연도별 상세 ---'),
          })
        )
      })
    })

    describe('Signals Data', () => {
      it('should correctly structure signals in saveConsultation call', async () => {
        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: validRequestBody,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-signals',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        })

        await POST(req)

        expect(saveConsultation).toHaveBeenCalledWith(
          expect.objectContaining({
            signals: {
              saju: validRequestBody.saju,
              astro: validRequestBody.astro,
              multiYearTrend: {
                startYear: 2024,
                endYear: 2034,
                overallTrend: 'ascending',
                peakYears: [2026, 2030],
                lowYears: [2025, 2028],
              },
            },
          })
        )
      })

      it('should not include yearlyScores in signals multiYearTrend', async () => {
        const requestWithYearlyScores = {
          ...validRequestBody,
          multiYearTrend: {
            ...validMultiYearTrend,
            yearlyScores: [
              { year: 2024, score: 75, grade: 'A' },
            ],
          },
        }

        vi.mocked(lifePredictionMultiYearSaveSchema.safeParse).mockReturnValue({
          success: true,
          data: requestWithYearlyScores,
        } as any)

        vi.mocked(saveConsultation).mockResolvedValue({
          success: true,
          consultationId: 'consultation-signals-no-scores',
        })

        const req = new NextRequest('http://localhost:3000/api/life-prediction/save', {
          method: 'POST',
          body: JSON.stringify(requestWithYearlyScores),
        })

        await POST(req)

        const callArgs = vi.mocked(saveConsultation).mock.calls[0][0]
        expect(callArgs.signals).not.toHaveProperty('multiYearTrend.yearlyScores')
      })
    })
  })
})
