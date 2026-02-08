/**
 * API Middleware - Re-export from modular structure
 *
 * This file maintains backward compatibility.
 * New code should import from '@/lib/api/middleware' which resolves to './middleware/index.ts'
 *
 * @deprecated Import from '@/lib/api/middleware' directly (same path, but cleaner)
 */

export {
  // Main wrapper
  withApiMiddleware,
  // Utility functions
  parseJsonBody,
  validateRequired,
  apiError,
  apiSuccess,
  // Context
  initializeApiContext,
  extractLocale,
  // Guard presets
  createPublicStreamGuard,
  createAuthenticatedGuard,
  createSimpleGuard,
  createSajuGuard,
  createAstrologyGuard,
  createTarotGuard,
  createAdminGuard,
  createAiGenerationGuard,
  createChatGuard,
  // Error codes
  ErrorCodes,
} from './middleware/index'

// Type exports
export type {
  ApiContext,
  ApiHandler,
  ApiHandlerResult,
  MiddlewareOptions,
  RateLimitOptions,
  CreditOptions,
  CreditType,
  ErrorCode,
} from './middleware/index'
