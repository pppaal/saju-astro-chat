/**
 * Test Helpers Index
 * Central export for all test utilities
 */

// API Route Mocks
export {
  // Logger
  mockLogger,
  // Telemetry
  mockCaptureServerError,
  mockRecordCounter,
  mockRecordHistogram,
  // Auth
  mockGetServerSession,
  mockAuthOptions,
  createMockSession,
  mockAuthSession,
  type MockSession,
  // Headers
  mockHeadersGet,
  mockHeadersHas,
  createMockHeaders,
  // Middleware
  mockWithApiMiddleware,
  mockCreateAuthenticatedGuard,
  mockApiSuccess,
  mockApiError,
  mockErrorCodes,
  // Credit Service
  mockCheckCredits,
  mockConsumeCredits,
  mockRefundCredits,
  mockUpgradePlan,
  mockAddBonusCredits,
  // Email Service
  mockSendEmail,
  mockSendPaymentReceiptEmail,
  mockSendSubscriptionConfirmEmail,
  mockSendSubscriptionCancelledEmail,
  mockSendPaymentFailedEmail,
  // Backend API Client
  mockApiClient,
  mockBackendResponse,
  type MockBackendResponse,
  // Setup
  setupApiMocks,
  resetApiMocks,
  // Request Helpers
  createMockRequest,
  createAuthenticatedRequest,
  // Response Helpers
  getResponseData,
  expectResponseStatus,
  // Test Data
  testBirthInfo,
  testPersonInfo,
  testChatMessage,
  testChatMessages,
} from '../mocks/api-route-mocks'

// Assertions
export {
  // API Response
  expectStatus,
  expectSuccess,
  expectError,
  expectValidationError,
  expectUnauthorized,
  expectForbidden,
  expectNotFound,
  expectRateLimited,
  // Mock Assertions
  expectCalledWith,
  expectCalledTimes,
  expectCalledOnce,
  expectNotCalled,
  expectFirstCallIncluded,
  expectCalledWithPartial,
  // Data Structure
  expectKeys,
  expectLength,
  expectNonEmpty,
  expectEmpty,
  expectInRange,
  expectValidDate,
  expectMatch,
  expectPartial,
  // Async
  expectResolves,
  expectRejects,
  expectThrows,
  // Type
  expectDefined,
  expectNullish,
  expectType,
  expectArray,
  // Saju/Astrology
  expectValidPillar,
  expectValidFourPillars,
  expectValidScore,
  expectValidElement,
  // Snapshot
  sanitizeForSnapshot,
  expectSanitizedSnapshot,
  // Timing
  expectCompletesWithin,
  // Combined
  expectSuccessWithData,
  expectPaginatedResponse,
} from './assertions'
