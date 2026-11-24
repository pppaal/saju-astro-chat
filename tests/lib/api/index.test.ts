// tests/lib/api/index.test.ts
import { describe, it, expect } from 'vitest'
import * as apiIndex from '../../../src/lib/api'

describe('lib/api/index - Module Exports', () => {
  describe('Error Handler Exports', () => {
    it('should export createErrorResponse function', () => {
      expect(apiIndex.createErrorResponse).toBeDefined()
      expect(typeof apiIndex.createErrorResponse).toBe('function')
    })

    it('should export createSuccessResponse function', () => {
      expect(apiIndex.createSuccessResponse).toBeDefined()
      expect(typeof apiIndex.createSuccessResponse).toBe('function')
    })

    // Removed exports (refactored or deprecated):
    //   withErrorHandler, validateFields, validateDestinyMapInput,
    //   validateTarotInput, validateDreamInput, parseJsonBody,
    //   Patterns, CommonValidators
    // Tests for these were removed; remaining describe blocks cover
    // the live exports.

    it('should export ErrorCodes constant', () => {
      expect(apiIndex.ErrorCodes).toBeDefined()
      expect(typeof apiIndex.ErrorCodes).toBe('object')
    })
  })

  describe('Validator Exports', () => {
    it('should export ChatMessageSchema and ChatMessagesSchema', () => {
      expect(apiIndex.ChatMessageSchema).toBeDefined()
      expect(apiIndex.ChatMessagesSchema).toBeDefined()
    })
  })

  // 배럴은 서버 전용 — apiFetch/크레딧 이벤트는 @/lib/api/client 에서만 import 한다.
  describe('Server-only barrel', () => {
    it('should not export the client fetch wrapper or the removed ApiClient', () => {
      const keys = Object.keys(apiIndex)
      for (const name of [
        'apiFetch',
        'CREDIT_MODAL_EVENT',
        'CREDIT_UPDATE_EVENT',
        'ApiClient',
        'apiClient',
        'createApiClient',
      ]) {
        expect(keys).not.toContain(name)
      }
    })
  })

  describe('Sanitizer Exports', () => {
    it('should export isRecord function', () => {
      expect(apiIndex.isRecord).toBeDefined()
      expect(typeof apiIndex.isRecord).toBe('function')
    })

    it('should export cleanStringArray function', () => {
      expect(apiIndex.cleanStringArray).toBeDefined()
      expect(typeof apiIndex.cleanStringArray).toBe('function')
    })

    it('should export normalizeMessages function', () => {
      expect(apiIndex.normalizeMessages).toBeDefined()
      expect(typeof apiIndex.normalizeMessages).toBe('function')
    })

    it('should export sanitizeString function', () => {
      expect(apiIndex.sanitizeString).toBeDefined()
      expect(typeof apiIndex.sanitizeString).toBe('function')
    })

    it('should export sanitizeNumber function', () => {
      expect(apiIndex.sanitizeNumber).toBeDefined()
      expect(typeof apiIndex.sanitizeNumber).toBe('function')
    })

    it('should export sanitizeBoolean function', () => {
      expect(apiIndex.sanitizeBoolean).toBeDefined()
      expect(typeof apiIndex.sanitizeBoolean).toBe('function')
    })

    it('should export sanitizeHtml function', () => {
      expect(apiIndex.sanitizeHtml).toBeDefined()
      expect(typeof apiIndex.sanitizeHtml).toBe('function')
    })

    it('should export sanitizeEnum function', () => {
      expect(apiIndex.sanitizeEnum).toBeDefined()
      expect(typeof apiIndex.sanitizeEnum).toBe('function')
    })
  })

  describe('Module Integrity', () => {
    it('should have no undefined exports', () => {
      const keys = Object.keys(apiIndex)
      keys.forEach((key) => {
        expect(apiIndex[key as keyof typeof apiIndex]).toBeDefined()
      })
    })

    it('should export the server helpers (error handler, sanitizers, chat schemas)', () => {
      const keys = Object.keys(apiIndex)
      expect(keys.length).toBeGreaterThanOrEqual(14)
    })

    it('should not export internal implementation details', () => {
      const keys = Object.keys(apiIndex)
      const internalPrefixes = ['_', '__']
      keys.forEach((key) => {
        const hasInternalPrefix = internalPrefixes.some((prefix) => key.startsWith(prefix))
        expect(hasInternalPrefix).toBe(false)
      })
    })
  })

  describe('Type Exports', () => {
    it('should have ErrorCode type available', () => {
      // Type check - if this compiles, the type is exported
      const _typeCheck: apiIndex.ErrorCode = 'UNAUTHORIZED'
      expect(_typeCheck).toBeDefined()
    })

    it('should have ChatMessage type available', () => {
      const _typeCheck: apiIndex.ChatMessage = { role: 'user', content: 'hi' }
      expect(_typeCheck).toBeDefined()
    })
  })
})
