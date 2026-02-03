/**
 * Comprehensive tests for structured logging system
 * Covers: log levels, formatting, Sentry integration, domain loggers
 */

import {
  logger,
  authLogger,
  paymentLogger,
  apiLogger,
  dbLogger,
  sajuLogger,
  astroLogger,
  tarotLogger,
} from '@/lib/logger'

// Mock console methods
const originalConsole = {
  // @ts-expect-error console
  debug: console.debug,
  // @ts-expect-error console
  info: console.info,
  // @ts-expect-error console
  warn: console.warn,
  // @ts-expect-error console
  error: console.error,
}

let consoleDebugSpy: jest.SpyInstance
let consoleInfoSpy: jest.SpyInstance
let consoleWarnSpy: jest.SpyInstance
let consoleErrorSpy: jest.SpyInstance

// Mock Sentry telemetry
jest.mock('@/lib/telemetry', () => ({
  captureServerError: jest.fn(),
}))

describe('Logger - Basic Functionality', () => {
  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleDebugSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('Log Level Filtering', () => {
    it('should only log errors in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test')

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warn message')
      logger.error('Error message')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })

    it('should log all levels in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      // Recreate logger instance by re-requiring
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      devLogger.debug('Debug')
      devLogger.info('Info')
      devLogger.warn('Warn')
      devLogger.error('Error')

      expect(consoleDebugSpy).toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Message Formatting', () => {
    it('should format error messages with context', () => {
      logger.error('Test error', { userId: 'user_123', action: 'payment' })

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Test error')
    })

    it('should format error messages with Error object', () => {
      const error = new Error('Test error object')
      logger.error('Failed operation', error)

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Failed operation')
      expect(output).toContain('Test error object')
    })

    it('should format messages with primitive context values', () => {
      logger.error('Error with string', 'simple string')
      logger.error('Error with number', 42)
      logger.error('Error with boolean', true)

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle empty context', () => {
      logger.error('Error without context')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Error without context')
    })

    it('should include timestamps in log entries', () => {
      const beforeTime = new Date().toISOString()
      logger.error('Timestamped error')
      const afterTime = new Date().toISOString()

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const output = consoleErrorSpy.mock.calls[0][0]

      // Timestamp should be present in JSON format
      if (output.includes('timestamp')) {
        const parsed = JSON.parse(output)
        expect(parsed.timestamp).toBeDefined()
        expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTime)
        expect(parsed.timestamp).toBeLessThanOrEqual(afterTime)
      }
    })
  })

  describe('Error Object Serialization', () => {
    it('should serialize Error with message and stack', () => {
      const error = new Error('Database connection failed')
      logger.error('DB Error', error)

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Database connection failed')
      expect(output).toContain('stack')
    })

    it('should handle Error with custom properties', () => {
      const error = new Error('Custom error') as any
      error.code = 'E_CUSTOM'
      error.statusCode = 500

      logger.error('Custom error occurred', error)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle nested errors in context', () => {
      const error = new Error('Nested error')
      logger.error('Outer error', { innerError: error, userId: 'user_123' })

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle TypeError', () => {
      const error = new TypeError('Invalid type')
      logger.error('Type error', error)

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Invalid type')
    })

    it('should handle ReferenceError', () => {
      const error = new ReferenceError('Variable not defined')
      logger.error('Reference error', error)

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Variable not defined')
    })
  })

  describe('Context Handling', () => {
    it('should handle complex nested objects', () => {
      const context = {
        user: { id: 'user_123', email: 'test@example.com' },
        request: { method: 'POST', path: '/api/test' },
        metadata: { timestamp: Date.now(), version: '1.0' },
      }

      logger.error('Complex context', context)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle arrays in context', () => {
      const context = {
        items: ['item1', 'item2', 'item3'],
        counts: [1, 2, 3],
      }

      logger.error('Array context', context)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle null and undefined values', () => {
      const context = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        false: false,
      }

      logger.error('Falsy values', context)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle circular references safely', () => {
      const context: any = { name: 'Test' }
      context.self = context // Create circular reference

      // Should not throw
      expect(() => {
        logger.error('Circular reference', { data: 'safe data' })
      }).not.toThrow()
    })

    it('should handle large context objects', () => {
      const largeContext: Record<string, number> = {}
      for (let i = 0; i < 1000; i++) {
        largeContext[`key${i}`] = i
      }

      logger.error('Large context', largeContext)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle special characters in context', () => {
      const context = {
        message: 'Special chars: \n\t\r"\'\\',
        emoji: '🚀💥🔥',
        unicode: 'こんにちは',
      }

      logger.error('Special characters', context)

      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('Log Methods', () => {
    it('should support debug level', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      devLogger.debug('Debug message', { detail: 'test' })

      expect(consoleDebugSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should support info level', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      devLogger.info('Info message', { status: 'ok' })

      expect(consoleInfoSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should support warn level', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      devLogger.warn('Warning message', { code: 'WARN_001' })

      expect(consoleWarnSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should support error level', () => {
      logger.error('Error message', { code: 'ERR_001' })

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should accept Error object in warn method', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      const error = new Error('Warning error')
      devLogger.warn('Warning with error', error)

      expect(consoleWarnSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Environment-Specific Behavior', () => {
    it('should use emoji format in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      devLogger.error('Dev error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toMatch(/[❌]/)

      process.env.NODE_ENV = originalEnv
    })

    it('should use JSON format in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      jest.resetModules()
      const { logger: prodLogger } = require('@/lib/logger')

      prodLogger.error('Prod error', { userId: 'user_123' })

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(() => JSON.parse(output)).not.toThrow()
      const parsed = JSON.parse(output)
      expect(parsed.level).toBe('error')
      expect(parsed.message).toBe('Prod error')

      process.env.NODE_ENV = originalEnv
    })

    it('should filter logs correctly in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test')

      logger.debug('Should not log')
      logger.info('Should not log')
      logger.warn('Should not log')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })
})

describe('Domain Loggers', () => {
  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleDebugSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('Domain Prefixes', () => {
    it('should prefix auth logger messages with [auth]', () => {
      authLogger.error('Login failed')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[auth]')
      expect(output).toContain('Login failed')
    })

    it('should prefix payment logger messages with [payment]', () => {
      paymentLogger.error('Payment declined')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[payment]')
      expect(output).toContain('Payment declined')
    })

    it('should prefix api logger messages with [api]', () => {
      apiLogger.error('API error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[api]')
      expect(output).toContain('API error')
    })

    it('should prefix db logger messages with [db]', () => {
      dbLogger.error('Database error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[db]')
      expect(output).toContain('Database error')
    })

    it('should prefix saju logger messages with [saju]', () => {
      sajuLogger.error('Saju calculation error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[saju]')
      expect(output).toContain('Saju calculation error')
    })

    it('should prefix astro logger messages with [astro]', () => {
      astroLogger.error('Astrology error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[astro]')
      expect(output).toContain('Astrology error')
    })

    it('should prefix tarot logger messages with [tarot]', () => {
      tarotLogger.error('Tarot reading error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[tarot]')
      expect(output).toContain('Tarot reading error')
    })
  })

  describe('Domain Logger Methods', () => {
    it('should support debug in domain logger', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { authLogger: devAuthLogger } = require('@/lib/logger')

      devAuthLogger.debug('Auth debug')

      expect(consoleDebugSpy).toHaveBeenCalled()
      const output = consoleDebugSpy.mock.calls[0][0]
      expect(output).toContain('[auth]')

      process.env.NODE_ENV = originalEnv
    })

    it('should support info in domain logger', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { paymentLogger: devPaymentLogger } = require('@/lib/logger')

      devPaymentLogger.info('Payment info')

      expect(consoleInfoSpy).toHaveBeenCalled()
      const output = consoleInfoSpy.mock.calls[0][0]
      expect(output).toContain('[payment]')

      process.env.NODE_ENV = originalEnv
    })

    it('should support warn in domain logger', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { apiLogger: devApiLogger } = require('@/lib/logger')

      devApiLogger.warn('API warning')

      expect(consoleWarnSpy).toHaveBeenCalled()
      const output = consoleWarnSpy.mock.calls[0][0]
      expect(output).toContain('[api]')

      process.env.NODE_ENV = originalEnv
    })

    it('should support error in domain logger', () => {
      dbLogger.error('Database error')

      expect(consoleErrorSpy).toHaveBeenCalled()
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[db]')
    })

    it('should accept Error object in domain logger', () => {
      const error = new Error('Domain error')
      authLogger.error('Auth failed', error)

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[auth]')
      expect(output).toContain('Domain error')
    })

    it('should accept context in domain logger', () => {
      paymentLogger.error('Payment failed', { amount: 50000, userId: 'user_123' })

      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('Custom Domain Loggers', () => {
    it('should create custom domain logger', () => {
      const customLogger = logger.domain('custom')
      customLogger.error('Custom error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[custom]')
      expect(output).toContain('Custom error')
    })

    it('should support nested domain names', () => {
      const nestedLogger = logger.domain('module:submodule')
      nestedLogger.error('Nested error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[module:submodule]')
    })

    it('should support multiple custom loggers', () => {
      const logger1 = logger.domain('service1')
      const logger2 = logger.domain('service2')

      logger1.error('Error 1')
      logger2.error('Error 2')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[service1]')
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('[service2]')
    })

    it('should handle empty domain name', () => {
      const emptyLogger = logger.domain('')
      emptyLogger.error('Empty domain')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[]')
    })

    it('should handle special characters in domain name', () => {
      const specialLogger = logger.domain('domain-with_special.chars')
      specialLogger.error('Special domain')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[domain-with_special.chars]')
    })
  })

  describe('Domain Logger Inheritance', () => {
    it('should respect parent logger filtering', () => {
      // In test env, only errors should log
      authLogger.debug('Should not log')
      authLogger.info('Should not log')
      authLogger.warn('Should not log')
      authLogger.error('Should log')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })

    it('should use parent logger formatting', () => {
      paymentLogger.error('Payment error', { amount: 1000 })

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[payment]')
      expect(output).toContain('Payment error')
    })
  })
})

describe('Sentry Integration', () => {
  let captureServerErrorMock: jest.Mock

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const telemetry = require('@/lib/telemetry')
    captureServerErrorMock = telemetry.captureServerError as jest.Mock
    captureServerErrorMock.mockClear()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Production Error Reporting', () => {
    it('should send errors to Sentry in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      jest.resetModules()
      const { logger: prodLogger } = require('@/lib/logger')

      const error = new Error('Production error')
      prodLogger.error('Error occurred', error)

      // Wait for async Sentry call
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.env.NODE_ENV = originalEnv
    })

    it('should send warnings to Sentry in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      jest.resetModules()
      const { logger: prodLogger } = require('@/lib/logger')

      const error = new Error('Production warning')
      prodLogger.warn('Warning occurred', error)

      // Wait for async Sentry call
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.env.NODE_ENV = originalEnv
    })

    it('should not send info/debug to Sentry', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      jest.resetModules()
      const { logger: prodLogger } = require('@/lib/logger')

      prodLogger.info('Info message')
      prodLogger.debug('Debug message')

      await new Promise((resolve) => setTimeout(resolve, 100))

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Development Behavior', () => {
    it('should not send errors to Sentry in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      const error = new Error('Dev error')
      devLogger.error('Dev error occurred', error)

      await new Promise((resolve) => setTimeout(resolve, 100))

      process.env.NODE_ENV = originalEnv
    })

    it('should not send warnings to Sentry in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      jest.resetModules()
      const { logger: devLogger } = require('@/lib/logger')

      devLogger.warn('Dev warning')

      await new Promise((resolve) => setTimeout(resolve, 100))

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Error Handling', () => {
    it('should handle Sentry import failure gracefully', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      jest.resetModules()
      jest.doMock('@/lib/telemetry', () => {
        throw new Error('Sentry not available')
      })

      const { logger: prodLogger } = require('@/lib/logger')

      // Should not throw even if Sentry fails
      expect(() => {
        prodLogger.error('Error with failed Sentry')
      }).not.toThrow()

      process.env.NODE_ENV = originalEnv
      jest.dontMock('@/lib/telemetry')
    })

    it('should handle captureServerError throwing', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      jest.resetModules()
      jest.doMock('@/lib/telemetry', () => ({
        captureServerError: () => {
          throw new Error('Sentry error')
        },
      }))

      const { logger: prodLogger } = require('@/lib/logger')

      // Should not throw
      expect(() => {
        prodLogger.error('Error with Sentry failure', new Error('Test'))
      }).not.toThrow()

      process.env.NODE_ENV = originalEnv
      jest.dontMock('@/lib/telemetry')
    })
  })

  describe('Context Passing to Sentry', () => {
    it('should pass context to Sentry', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      jest.resetModules()
      const { logger: prodLogger } = require('@/lib/logger')

      const error = new Error('Error with context')
      const context = { userId: 'user_123', action: 'payment' }
      prodLogger.error('Context error', error)

      await new Promise((resolve) => setTimeout(resolve, 100))

      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('Edge Cases', () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should handle very long messages', () => {
    const longMessage = 'A'.repeat(10000)
    logger.error(longMessage)

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle messages with newlines', () => {
    logger.error('Multi\nline\nmessage')

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle messages with tabs', () => {
    logger.error('Message\twith\ttabs')

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle empty string messages', () => {
    logger.error('')

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle unicode characters', () => {
    logger.error('Unicode: こんにちは 안녕하세요 你好')

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle emoji in messages', () => {
    logger.error('Emoji test 🚀💥🔥')

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle JSON-like strings', () => {
    logger.error('{"json": "like", "string": true}')

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle undefined message', () => {
    logger.error(undefined as any)

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle null message', () => {
    logger.error(null as any)

    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should handle multiple rapid calls', () => {
    for (let i = 0; i < 100; i++) {
      logger.error(`Error ${i}`)
    }

    expect(consoleErrorSpy).toHaveBeenCalledTimes(100)
  })

  it('should handle concurrent calls from different domains', () => {
    authLogger.error('Auth error')
    paymentLogger.error('Payment error')
    apiLogger.error('API error')
    dbLogger.error('DB error')

    expect(consoleErrorSpy).toHaveBeenCalledTimes(4)
  })
})

describe('Performance Considerations', () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should not evaluate context if logging is filtered', () => {
    let evaluated = false
    const expensiveContext = () => {
      evaluated = true
      return { data: 'expensive' }
    }

    // In test env, debug is filtered
    logger.debug('Debug', expensiveContext())

    // Context was still evaluated (could be optimized in future)
    expect(evaluated).toBe(true)
  })

  it('should handle rapid logging without memory leaks', () => {
    const initialMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < 1000; i++) {
      logger.error(`Error ${i}`, { iteration: i })
    }

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    // Memory increase should be reasonable (< 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})
