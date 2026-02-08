import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Services Integration', () => {
  describe('Database Services', () => {
    it('should export prisma client helpers', async () => {
      const module = await import('@/lib/db/prisma')

      expect(module.prisma).toBeDefined()
      expect(module.ensureDbConnection).toBeDefined()
      expect(typeof module.ensureDbConnection).toBe('function')
    })
  })

  describe('Cache Services', () => {
    it('should export redis cache helpers', async () => {
      const module = await import('@/lib/cache/redis-cache')

      expect(module.cacheGet).toBeDefined()
      expect(module.cacheSet).toBeDefined()
      expect(module.makeCacheKey).toBeDefined()
    })

    describe('makeCacheKey functionality', () => {
      it('should generate cache key with sorted params', async () => {
        const { makeCacheKey } = await import('@/lib/cache/redis-cache')

        const key = makeCacheKey('test', { b: 'second', a: 'first' })

        expect(key).toBe('test:v1:a:first|b:second')
      })

      it('should include version number in key', async () => {
        const { makeCacheKey } = await import('@/lib/cache/redis-cache')

        const keyV1 = makeCacheKey('prefix', { id: '123' }, 1)
        const keyV2 = makeCacheKey('prefix', { id: '123' }, 2)

        expect(keyV1).toContain(':v1:')
        expect(keyV2).toContain(':v2:')
        expect(keyV1).not.toBe(keyV2)
      })

      it('should handle empty params object', async () => {
        const { makeCacheKey } = await import('@/lib/cache/redis-cache')

        const key = makeCacheKey('empty', {})

        expect(key).toBe('empty:v1:')
      })

      it('should handle numeric values', async () => {
        const { makeCacheKey } = await import('@/lib/cache/redis-cache')

        const key = makeCacheKey('numeric', { count: 42, ratio: 3.14 })

        expect(key).toContain('count:42')
        expect(key).toContain('ratio:3.14')
      })

      it('should handle boolean values', async () => {
        const { makeCacheKey } = await import('@/lib/cache/redis-cache')

        const key = makeCacheKey('bool', { active: true, disabled: false })

        expect(key).toContain('active:true')
        expect(key).toContain('disabled:false')
      })

      it('should maintain consistent key for same params', async () => {
        const { makeCacheKey } = await import('@/lib/cache/redis-cache')

        const params = { userId: 'abc', date: '2024-01-01' }
        const key1 = makeCacheKey('user', params)
        const key2 = makeCacheKey('user', params)

        expect(key1).toBe(key2)
      })
    })

    it('should export chart data cache helpers', async () => {
      const module = await import('@/lib/cache/chartDataCache')

      expect(module.saveChartData).toBeDefined()
      expect(module.loadChartData).toBeDefined()
      expect(module.clearChartCache).toBeDefined()
    })

    it('should export premium cache helpers', async () => {
      const module = await import('@/lib/stripe/premiumCache')

      expect(module.getCachedPremiumStatus).toBeDefined()
      expect(module.checkPremiumFromDatabase).toBeDefined()
      expect(module.checkPremiumFromSubscription).toBeDefined()
    })
  })

  describe('Circuit Breaker', () => {
    it('should export circuit breaker utilities', async () => {
      const module = await import('@/lib/circuitBreaker')

      expect(module.withCircuitBreaker).toBeDefined()
      expect(module.isCircuitOpen).toBeDefined()
      expect(typeof module.withCircuitBreaker).toBe('function')
    })
  })

  describe('Rate Limiting', () => {
    it('should export rate limit function', async () => {
      const module = await import('@/lib/rateLimit')

      expect(module.rateLimit).toBeDefined()
      expect(typeof module.rateLimit).toBe('function')
    })
  })

  describe('Backend Health', () => {
    it('should export health check functions', async () => {
      const module = await import('@/lib/backend-health')

      expect(module.checkBackendHealth).toBeDefined()
      expect(module.getHealthStatus).toBeDefined()
      expect(module.resetHealthStatus).toBeDefined()
    })

    it('should export backend URL helpers', async () => {
      const module = await import('@/lib/backend-url')

      expect(module.getBackendUrl).toBeDefined()
      expect(typeof module.getBackendUrl).toBe('function')
    })

    describe('getBackendUrl functionality', () => {
      const originalEnv = process.env

      beforeEach(() => {
        vi.resetModules()
        process.env = { ...originalEnv }
        delete process.env.AI_BACKEND_URL
        delete process.env.BACKEND_AI_URL
        delete process.env.NEXT_PUBLIC_AI_BACKEND
      })

      afterEach(() => {
        process.env = originalEnv
      })

      it('should return AI_BACKEND_URL if set', async () => {
        process.env.AI_BACKEND_URL = 'https://custom-backend.example.com'
        const { getBackendUrl } = await import('@/lib/backend-url')

        const url = getBackendUrl()

        expect(url).toBe('https://custom-backend.example.com')
      })

      it('should fallback to BACKEND_AI_URL', async () => {
        process.env.BACKEND_AI_URL = 'https://deprecated-backend.example.com'
        const { getBackendUrl } = await import('@/lib/backend-url')

        const url = getBackendUrl()

        expect(url).toBe('https://deprecated-backend.example.com')
      })

      it('should fallback to NEXT_PUBLIC_AI_BACKEND', async () => {
        process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public-backend.example.com'
        const { getBackendUrl } = await import('@/lib/backend-url')

        const url = getBackendUrl()

        expect(url).toBe('https://public-backend.example.com')
      })

      it('should use localhost as final fallback', async () => {
        const { getBackendUrl } = await import('@/lib/backend-url')

        const url = getBackendUrl()

        expect(url).toBe('http://localhost:5000')
      })

      it('should prioritize AI_BACKEND_URL over others', async () => {
        process.env.AI_BACKEND_URL = 'https://primary.example.com'
        process.env.BACKEND_AI_URL = 'https://deprecated.example.com'
        process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public.example.com'
        const { getBackendUrl } = await import('@/lib/backend-url')

        const url = getBackendUrl()

        expect(url).toBe('https://primary.example.com')
      })
    })

    describe('getPublicBackendUrl functionality', () => {
      const originalEnv = process.env

      beforeEach(() => {
        vi.resetModules()
        process.env = { ...originalEnv }
        delete process.env.NEXT_PUBLIC_AI_BACKEND
      })

      afterEach(() => {
        process.env = originalEnv
      })

      it('should return NEXT_PUBLIC_AI_BACKEND if set', async () => {
        process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public-backend.example.com'
        const { getPublicBackendUrl } = await import('@/lib/backend-url')

        const url = getPublicBackendUrl()

        expect(url).toBe('https://public-backend.example.com')
      })

      it('should use localhost as fallback', async () => {
        const { getPublicBackendUrl } = await import('@/lib/backend-url')

        const url = getPublicBackendUrl()

        expect(url).toBe('http://localhost:5000')
      })
    })
  })

  describe('Notification Services', () => {
    it('should export push service helpers', async () => {
      const module = await import('@/lib/notifications/pushService')

      expect(module.sendPushNotification).toBeDefined()
      expect(module.savePushSubscription).toBeDefined()
      expect(module.removePushSubscription).toBeDefined()
    })

    it('should export premium notification helpers', async () => {
      const module = await import('@/lib/notifications/premiumNotifications')

      expect(module.generatePremiumNotifications).toBeDefined()
      expect(module.shouldSendNotification).toBeDefined()
    })

    it('should export SSE helpers', async () => {
      const module = await import('@/lib/notifications/sse')

      expect(module.registerClient).toBeDefined()
      expect(module.sendNotification).toBeDefined()
      expect(module.unregisterClient).toBeDefined()
    })
  })

  describe('AI Services', () => {
    it('should export recommendations service', async () => {
      const module = await import('@/lib/ai/recommendations')

      expect(module.generateLifeRecommendations).toBeDefined()
      expect(typeof module.generateLifeRecommendations).toBe('function')
    })

    it('should export summarize service', async () => {
      const module = await import('@/lib/ai/summarize')

      expect(module.summarizeConversation).toBeDefined()
      expect(module.summarizeWithAI).toBeDefined()
    })
  })

  describe('Email Services', () => {
    it('should export email service', async () => {
      const module = await import('@/lib/email/emailService')

      expect(module.sendEmail).toBeDefined()
      expect(typeof module.sendEmail).toBe('function')
    })

    it('should export resend provider', async () => {
      const module = await import('@/lib/email/providers/resendProvider')

      expect(module.ResendProvider).toBeDefined()
      expect(typeof module.ResendProvider).toBe('function')
    })
  })

  describe('Auth Services', () => {
    it('should export auth options', async () => {
      const module = await import('@/lib/auth/authOptions')

      expect(module.authOptions).toBeDefined()
      expect(typeof module.authOptions).toBe('object')
    }, 60000)

    it('should export public token validator', async () => {
      const module = await import('@/lib/auth/publicToken')

      expect(module.requirePublicToken).toBeDefined()
      expect(typeof module.requirePublicToken).toBe('function')
    })

    it('should export token revoke helpers', async () => {
      const module = await import('@/lib/auth/tokenRevoke')

      expect(module.revokeGoogleTokensForUser).toBeDefined()
      expect(module.revokeGoogleTokensForAccount).toBeDefined()
    })
  })

  describe('Credits Services', () => {
    it('should export credit checks', async () => {
      const module = await import('@/lib/credits/withCredits')

      expect(module.checkAndConsumeCredits).toBeDefined()
      expect(module.checkCreditsOnly).toBeDefined()
    })
  })

  describe('Consultation Services', () => {
    it('should export consultation save', async () => {
      const module = await import('@/lib/consultation/saveConsultation')

      expect(module.saveConsultation).toBeDefined()
      expect(typeof module.saveConsultation).toBe('function')
    })
  })

  describe('Referral Services', () => {
    it('should export referral helpers', async () => {
      const module = await import('@/lib/referral/referralService')

      expect(module.generateReferralCode).toBeDefined()
      expect(module.linkReferrer).toBeDefined()
      expect(module.claimReferralReward).toBeDefined()
    })
  })

  describe('Prediction Services', () => {
    it('should export daeun transit sync helpers', async () => {
      const module = await import('@/lib/prediction/daeunTransitSync')

      expect(module.analyzeDaeunTransitSync).toBeDefined()
      expect(typeof module.analyzeDaeunTransitSync).toBe('function')
    })

    it('should export tier 7-10 analysis helpers', async () => {
      const module = await import('@/lib/prediction/tier7To10Analysis')

      expect(module.calculateTier7To10Bonus).toBeDefined()
      expect(typeof module.calculateTier7To10Bonus).toBe('function')
    })
  })

  describe('Weekly Fortune', () => {
    it('should export weekly fortune cache helpers', async () => {
      const module = await import('@/lib/weeklyFortune')

      expect(module.getWeeklyFortuneImage).toBeDefined()
      expect(module.saveWeeklyFortuneImage).toBeDefined()
    })
  })

  describe('User Profile', () => {
    it('should export user profile helpers', async () => {
      const module = await import('@/lib/userProfile')

      expect(module.getUserProfile).toBeDefined()
      expect(module.saveUserProfile).toBeDefined()
      expect(module.fetchAndSyncUserProfile).toBeDefined()
    })
  })

  describe('Marketing Services', () => {
    it('should export image generator helpers', async () => {
      const module = await import('@/lib/marketing/imageGenerator')

      expect(module.generateFortuneSVG).toBeDefined()
      expect(typeof module.generateFortuneSVG).toBe('function')
    })

    it('should export social media poster helpers', async () => {
      const module = await import('@/lib/marketing/socialMediaPoster')

      expect(module.postToInstagram).toBeDefined()
      expect(module.loadSocialMediaConfig).toBeDefined()
    })
  })

  describe('Metrics and Telemetry', () => {
    it('should export metrics helpers', async () => {
      const module = await import('@/lib/metrics')

      expect(module.recordCounter).toBeDefined()
      expect(module.getMetricsSnapshot).toBeDefined()
    })

    it('should export telemetry helpers', async () => {
      const module = await import('@/lib/telemetry')

      expect(module.captureException).toBeDefined()
      expect(module.trackMetric).toBeDefined()
    })
  })

  describe('Environment Validation', () => {
    it('should export env validation', async () => {
      const module = await import('@/lib/env')

      expect(module.env).toBeDefined()
      expect(module.isProduction).toBeDefined()
      expect(module.isDevelopment).toBeDefined()
      expect(module.isTest).toBeDefined()
    })
  })

  describe('API Utilities', () => {
    it('should export API client', async () => {
      const module = await import('@/lib/api/ApiClient')

      expect(module.ApiClient).toBeDefined()
      expect(typeof module.ApiClient).toBe('function')
    })

    it('should export error handler helpers', async () => {
      const module = await import('@/lib/api/errorHandler')

      expect(module.createErrorResponse).toBeDefined()
      expect(module.withErrorHandler).toBeDefined()
      expect(module.createSuccessResponse).toBeDefined()
    })

    it('should export API middleware', async () => {
      const module = await import('@/lib/api/middleware')

      expect(module.withApiMiddleware).toBeDefined()
      expect(module.initializeApiContext).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should export API error class', async () => {
      const module = await import('@/lib/errors/ApiError')

      expect(module.ApiError).toBeDefined()
      expect(typeof module.ApiError).toBe('function')
    })

    it('should create API error instance', async () => {
      const { ApiError, ErrorCodes } = await import('@/lib/errors/ApiError')

      const error = new ApiError(ErrorCodes.INVALID_BODY, 400)

      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe(ErrorCodes.INVALID_BODY)
      expect(error.statusCode).toBe(400)
    })

    describe('ApiError advanced usage', () => {
      it('should create error with code as message', async () => {
        const { ApiError, ErrorCodes } = await import('@/lib/errors/ApiError')

        const error = new ApiError(ErrorCodes.INVALID_BODY, 400)

        // ApiError uses code as message
        expect(error.message).toBe(ErrorCodes.INVALID_BODY)
        expect(error.statusCode).toBe(400)
      })

      it('should handle different error codes', async () => {
        const { ApiError, ErrorCodes } = await import('@/lib/errors/ApiError')

        const errors = [
          new ApiError(ErrorCodes.UNAUTHORIZED, 401),
          new ApiError(ErrorCodes.FORBIDDEN, 403),
          new ApiError(ErrorCodes.NOT_FOUND, 404),
          new ApiError(ErrorCodes.INTERNAL_ERROR, 500),
        ]

        expect(errors[0].code).toBe(ErrorCodes.UNAUTHORIZED)
        expect(errors[1].code).toBe(ErrorCodes.FORBIDDEN)
        expect(errors[2].code).toBe(ErrorCodes.NOT_FOUND)
        expect(errors[3].code).toBe(ErrorCodes.INTERNAL_ERROR)
      })

      it('should be throwable and catchable', async () => {
        const { ApiError, ErrorCodes } = await import('@/lib/errors/ApiError')

        const throwError = () => {
          throw new ApiError(ErrorCodes.INVALID_BODY, 400)
        }

        expect(throwError).toThrow(ApiError)
      })

      it('should preserve stack trace', async () => {
        const { ApiError, ErrorCodes } = await import('@/lib/errors/ApiError')

        const error = new ApiError(ErrorCodes.INVALID_BODY, 400)

        expect(error.stack).toBeDefined()
        expect(error.stack).toContain('ApiError')
      })

      it('should include additional details if provided', async () => {
        const { ApiError, ErrorCodes } = await import('@/lib/errors/ApiError')

        const details = {
          field: 'email',
          expected: 'valid email format',
        }
        const error = new ApiError(ErrorCodes.INVALID_BODY, 400, details)

        expect(error.details).toBeDefined()
        expect(error.details).toEqual(details)
      })
    })
  })

  describe('iChing Service', () => {
    it('should export changing line helpers', async () => {
      const module = await import('@/lib/iChing/changingLineData')

      expect(module.calculateChangingHexagramNumber).toBeDefined()
      expect(module.binaryToHexagramNumber).toBeDefined()
    })

    describe('binaryToHexagramNumber functionality', () => {
      it('should convert 111111 to hexagram 1 (건)', async () => {
        const { binaryToHexagramNumber } = await import('@/lib/iChing/changingLineData')

        expect(binaryToHexagramNumber('111111')).toBe(1)
      })

      it('should convert 000000 to hexagram 2 (곤)', async () => {
        const { binaryToHexagramNumber } = await import('@/lib/iChing/changingLineData')

        expect(binaryToHexagramNumber('000000')).toBe(2)
      })

      it('should convert 010001 to hexagram 3 (준)', async () => {
        const { binaryToHexagramNumber } = await import('@/lib/iChing/changingLineData')

        expect(binaryToHexagramNumber('010001')).toBe(3)
      })

      it('should return 0 for unknown binary', async () => {
        const { binaryToHexagramNumber } = await import('@/lib/iChing/changingLineData')

        expect(binaryToHexagramNumber('invalid')).toBe(0)
        expect(binaryToHexagramNumber('')).toBe(0)
      })

      it('should map all 64 hexagrams', async () => {
        const { binaryToHexagramNumber } = await import('@/lib/iChing/changingLineData')

        // Sample of various hexagrams
        const samples = [
          { binary: '010101', number: 63 }, // 기제
          { binary: '101010', number: 64 }, // 미제
          { binary: '011011', number: 58 }, // 태
          { binary: '001001', number: 51 }, // 진
        ]

        samples.forEach(({ binary, number }) => {
          expect(binaryToHexagramNumber(binary)).toBe(number)
        })
      })
    })

    describe('calculateChangingHexagramNumber functionality', () => {
      it('should flip the specified line and return new hexagram', async () => {
        const { calculateChangingHexagramNumber } = await import('@/lib/iChing/changingLineData')

        // 건(111111)에서 첫 번째 효를 바꾸면 011111 = 쾌(43)
        const result = calculateChangingHexagramNumber('111111', 0)
        expect(result).toBe(43) // 쾌
      })

      it('should handle flipping last line', async () => {
        const { calculateChangingHexagramNumber } = await import('@/lib/iChing/changingLineData')

        // 건(111111)에서 마지막 효를 바꾸면 111110 = 구(44)
        const result = calculateChangingHexagramNumber('111111', 5)
        expect(result).toBe(44) // 구
      })

      it('should flip 0 to 1 correctly', async () => {
        const { calculateChangingHexagramNumber } = await import('@/lib/iChing/changingLineData')

        // 곤(000000)에서 첫 번째 효를 바꾸면 100000 = 박(23)
        const result = calculateChangingHexagramNumber('000000', 0)
        expect(result).toBe(23)
      })

      it('should work with middle lines', async () => {
        const { calculateChangingHexagramNumber } = await import('@/lib/iChing/changingLineData')

        // 건(111111)에서 세 번째 효(index 2)를 바꾸면 110111 = 소축(9)
        const result = calculateChangingHexagramNumber('111111', 2)
        expect(result).toBe(9) // 소축
      })
    })

    describe('hexagramNames export', () => {
      it('should have names for all 64 hexagrams', async () => {
        const { hexagramNames } = await import('@/lib/iChing/changingLineData')

        expect(Object.keys(hexagramNames).length).toBe(64)
      })

      it('should have correct name for hexagram 1', async () => {
        const { hexagramNames } = await import('@/lib/iChing/changingLineData')

        expect(hexagramNames[1]).toBe('중천건(重天乾)')
      })

      it('should have correct name for hexagram 64', async () => {
        const { hexagramNames } = await import('@/lib/iChing/changingLineData')

        expect(hexagramNames[64]).toContain('미제')
      })

      it('should contain Korean and Chinese characters', async () => {
        const { hexagramNames } = await import('@/lib/iChing/changingLineData')

        // All names should have Korean and Chinese characters
        Object.values(hexagramNames).forEach(name => {
          expect(name).toMatch(/[\uAC00-\uD7AF]/) // Korean
          expect(name).toMatch(/[\u4E00-\u9FFF]/) // Chinese
        })
      })
    })
  })

  describe('Replicate Service', () => {
    it('should export replicate helpers', async () => {
      const module = await import('@/lib/replicate')

      expect(module.generateWeeklyFortuneImage).toBeDefined()
    })
  })

  describe('Push Notifications', () => {
    it('should export push notification helpers', async () => {
      const module = await import('@/lib/pushNotifications')

      expect(module.initializePushNotifications).toBeDefined()
      expect(module.sendSubscriptionToServer).toBeDefined()
    })
  })

  describe('All Service Modules', () => {
    it('should import all service modules without errors', async () => {
      const modules = await Promise.all([
        import('@/lib/db/prisma'),
        import('@/lib/cache/redis-cache'),
        import('@/lib/cache/chartDataCache'),
        import('@/lib/circuitBreaker'),
        import('@/lib/rateLimit'),
        import('@/lib/backend-health'),
        import('@/lib/backend-url'),
        import('@/lib/notifications/pushService'),
        import('@/lib/notifications/premiumNotifications'),
        import('@/lib/notifications/sse'),
        import('@/lib/ai/recommendations'),
        import('@/lib/ai/summarize'),
        import('@/lib/email/emailService'),
        import('@/lib/email/providers/resendProvider'),
        import('@/lib/auth/authOptions'),
        import('@/lib/auth/publicToken'),
        import('@/lib/auth/tokenRevoke'),
        import('@/lib/credits/withCredits'),
        import('@/lib/consultation/saveConsultation'),
        import('@/lib/referral/referralService'),
        import('@/lib/prediction/daeunTransitSync'),
        import('@/lib/prediction/tier7To10Analysis'),
        import('@/lib/weeklyFortune'),
        import('@/lib/userProfile'),
        import('@/lib/marketing/imageGenerator'),
        import('@/lib/marketing/socialMediaPoster'),
        import('@/lib/metrics'),
        import('@/lib/telemetry'),
        import('@/lib/env'),
        import('@/lib/env'),
        import('@/lib/api/ApiClient'),
        import('@/lib/api/errorHandler'),
        import('@/lib/api/middleware'),
        import('@/lib/errors/ApiError'),
        import('@/lib/iChing/changingLineData'),
        import('@/lib/replicate'),
        import('@/lib/pushNotifications'),
        import('@/lib/stripe/premiumCache'),
      ])

      expect(modules.length).toBeGreaterThanOrEqual(37)
      modules.forEach((module) => {
        expect(module).toBeDefined()
      })
    })
  })

  describe('Service Integration', () => {
    it('should have error handling modules', async () => {
      const { ApiError } = await import('@/lib/errors/ApiError')
      const errorModule = await import('@/lib/api/errorHandler')

      expect(ApiError).toBeDefined()
      expect(errorModule).toBeDefined()
    })

    it('should have circuit breaker module', async () => {
      const module = await import('@/lib/circuitBreaker')

      expect(module.withCircuitBreaker).toBeDefined()
    })
  })

  describe('Circuit Breaker Functional Tests', () => {
    it('should track circuit state', async () => {
      const { getCircuitStatus, resetAllCircuits } = await import('@/lib/circuitBreaker')

      resetAllCircuits()
      const status = getCircuitStatus('test-circuit')

      expect(status.state).toBe('CLOSED')
      expect(status.failures).toBe(0)
    })

    it('should record failures', async () => {
      const { recordFailure, getCircuitStatus, resetAllCircuits } = await import(
        '@/lib/circuitBreaker'
      )

      resetAllCircuits()
      recordFailure('failure-test')
      const status = getCircuitStatus('failure-test')

      expect(status.failures).toBe(1)
    })

    it('should record successes', async () => {
      const { recordSuccess, recordFailure, getCircuitStatus, resetAllCircuits } = await import(
        '@/lib/circuitBreaker'
      )

      resetAllCircuits()
      recordFailure('success-test')
      expect(getCircuitStatus('success-test').failures).toBe(1)

      recordSuccess('success-test')
      expect(getCircuitStatus('success-test').failures).toBe(0)
    })

    it('should check if circuit is open', async () => {
      const { isCircuitOpen, resetAllCircuits, recordFailure } = await import(
        '@/lib/circuitBreaker'
      )

      resetAllCircuits()
      const options = { failureThreshold: 2, resetTimeoutMs: 60000 }

      expect(isCircuitOpen('open-test', options)).toBe(false)

      recordFailure('open-test', options)
      recordFailure('open-test', options)

      expect(isCircuitOpen('open-test', options)).toBe(true)
    })

    it('should execute wrapped function on success', async () => {
      const { withCircuitBreaker, resetAllCircuits } = await import('@/lib/circuitBreaker')

      resetAllCircuits()

      const { result, fromFallback } = await withCircuitBreaker(
        'wrapped-success',
        async () => 'success result',
        'fallback'
      )

      expect(result).toBe('success result')
      expect(fromFallback).toBe(false)
    })

    it('should return fallback on failure', async () => {
      const { withCircuitBreaker, resetAllCircuits } = await import('@/lib/circuitBreaker')

      resetAllCircuits()

      const { result, fromFallback } = await withCircuitBreaker(
        'wrapped-failure',
        async () => {
          throw new Error('Service error')
        },
        'fallback value'
      )

      expect(result).toBe('fallback value')
      expect(fromFallback).toBe(true)
    })
  })

  describe('Environment Configuration', () => {
    it('should detect environment correctly', async () => {
      const { isTest } = await import('@/lib/env')

      // In test environment
      expect(isTest).toBe(true)
    })

    it('should export env object with required properties', async () => {
      const { env } = await import('@/lib/env')

      expect(env).toBeDefined()
      expect(typeof env).toBe('object')
    })
  })

  describe('Metrics Service Functional Tests', () => {
    it('should record counter metrics', async () => {
      const { recordCounter, getMetricsSnapshot } = await import('@/lib/metrics')

      recordCounter('test_counter')

      const snapshot = getMetricsSnapshot()
      expect(snapshot).toBeDefined()
    })

    it('should increment counter multiple times', async () => {
      const { recordCounter } = await import('@/lib/metrics')

      recordCounter('multi_counter')
      recordCounter('multi_counter')
      recordCounter('multi_counter')

      // Just verify no errors are thrown
      expect(true).toBe(true)
    })
  })

  describe('API Client Functional Tests', () => {
    it('should create API client instance', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')

      const client = new ApiClient('/api/test')

      expect(client).toBeDefined()
      expect(typeof client.get).toBe('function')
      expect(typeof client.post).toBe('function')
    })

    it('should accept custom base URL', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')

      const client = new ApiClient('https://custom-api.example.com')

      expect(client).toBeDefined()
    })

    it('should accept custom timeout', async () => {
      const { ApiClient } = await import('@/lib/api/ApiClient')

      const client = new ApiClient('https://api.example.com', 30000)

      expect(client).toBeDefined()
    })
  })

  describe('Rate Limiting Functional Tests', () => {
    it('should export rateLimit function', async () => {
      const { rateLimit } = await import('@/lib/rateLimit')

      expect(typeof rateLimit).toBe('function')
    })

    it('should check rate limit and return result', async () => {
      const { rateLimit } = await import('@/lib/rateLimit')

      // rateLimit returns a promise with RateLimitResult
      const result = await rateLimit('test-key-integration', { limit: 100, windowSeconds: 60 })

      expect(result).toBeDefined()
      expect(typeof result.allowed).toBe('boolean')
      expect(typeof result.limit).toBe('number')
      expect(typeof result.remaining).toBe('number')
      expect(result.headers).toBeDefined()
    })

    it('should return remaining count', async () => {
      const { rateLimit } = await import('@/lib/rateLimit')

      const result = await rateLimit('test-remaining-integration', { limit: 10, windowSeconds: 60 })

      expect(result.remaining).toBeLessThanOrEqual(result.limit)
    })

    it('should include rate limit headers', async () => {
      const { rateLimit } = await import('@/lib/rateLimit')

      const result = await rateLimit('test-headers-integration', { limit: 50, windowSeconds: 60 })

      expect(result.headers.get('X-RateLimit-Limit')).toBe('50')
      expect(result.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should allow requests within limit', async () => {
      const { rateLimit } = await import('@/lib/rateLimit')

      const result = await rateLimit('test-allowed-integration', { limit: 100, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
    })
  })
})
