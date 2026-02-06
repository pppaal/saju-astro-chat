/**
 * Shared API Route Mocks
 * Eliminates duplicate mock setup across 100+ API route test files
 *
 * Usage:
 * import { setupApiMocks, mockAuthSession, mockPrismaModels } from '@/tests/mocks/api-route-mocks'
 * setupApiMocks()
 */

import { vi } from 'vitest'

// ============ Logger Mock ============

export const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

// ============ Telemetry & Metrics Mock ============

export const mockCaptureServerError = vi.fn()
export const mockRecordCounter = vi.fn()
export const mockRecordHistogram = vi.fn()

// ============ Auth Mock ============

export const mockGetServerSession = vi.fn()
export const mockAuthOptions = {}

export interface MockSession {
  user: {
    id: string
    email: string
    name?: string
    role?: string
  }
  expires: string
}

export const createMockSession = (overrides: Partial<MockSession['user']> = {}): MockSession => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    ...overrides,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

export const mockAuthSession = (session: MockSession | null = createMockSession()) => {
  mockGetServerSession.mockResolvedValue(session)
}

// ============ Headers Mock ============

export const mockHeadersGet = vi.fn()
export const mockHeadersHas = vi.fn()

export const createMockHeaders = (headers: Record<string, string> = {}) => ({
  get: (name: string) => headers[name] ?? null,
  has: (name: string) => name in headers,
})

// ============ Middleware Mock ============

export const mockWithApiMiddleware = vi.fn((handler: any) => handler)
export const mockCreateAuthenticatedGuard = vi.fn(() => ({}))
export const mockApiSuccess = vi.fn((data: any) => ({ data }))
export const mockApiError = vi.fn((code: string, message?: string) => ({ error: { code, message } }))

export const mockErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
}

// ============ Credit Service Mock ============

export const mockCheckCredits = vi.fn()
export const mockConsumeCredits = vi.fn()
export const mockRefundCredits = vi.fn()
export const mockUpgradePlan = vi.fn()
export const mockAddBonusCredits = vi.fn()

// ============ Email Service Mock ============

export const mockSendEmail = vi.fn().mockResolvedValue(undefined)
export const mockSendPaymentReceiptEmail = vi.fn().mockResolvedValue(undefined)
export const mockSendSubscriptionConfirmEmail = vi.fn().mockResolvedValue(undefined)
export const mockSendSubscriptionCancelledEmail = vi.fn().mockResolvedValue(undefined)
export const mockSendPaymentFailedEmail = vi.fn().mockResolvedValue(undefined)

// ============ Backend API Client Mock ============

export interface MockBackendResponse {
  ok: boolean
  status: number
  data?: unknown
}

export const mockApiClient = {
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

export const mockBackendResponse = (data: unknown, ok = true, status = 200): MockBackendResponse => ({
  ok,
  status,
  data,
})

// ============ Setup Function ============

/**
 * Sets up all common API route mocks.
 * Call this at the top of your test file, BEFORE importing the route handler.
 */
export function setupApiMocks() {
  // Middleware
  vi.mock('@/lib/api/middleware', () => ({
    withApiMiddleware: mockWithApiMiddleware,
    createAuthenticatedGuard: mockCreateAuthenticatedGuard,
    apiSuccess: mockApiSuccess,
    apiError: mockApiError,
    ErrorCodes: mockErrorCodes,
  }))

  // Auth
  vi.mock('next-auth', () => ({
    getServerSession: mockGetServerSession,
  }))

  vi.mock('@/lib/auth/authOptions', () => ({
    authOptions: mockAuthOptions,
  }))

  // Logger
  vi.mock('@/lib/logger', () => ({
    logger: mockLogger,
  }))

  // Telemetry & Metrics
  vi.mock('@/lib/telemetry', () => ({
    captureServerError: mockCaptureServerError,
  }))

  vi.mock('@/lib/metrics', () => ({
    recordCounter: mockRecordCounter,
    recordHistogram: mockRecordHistogram,
  }))

  // Request IP
  vi.mock('@/lib/request-ip', () => ({
    getClientIp: vi.fn(() => '127.0.0.1'),
  }))

  // Next.js Headers
  vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({
      get: mockHeadersGet,
      has: mockHeadersHas,
    })),
  }))

  // Credit Service
  vi.mock('@/lib/credits/creditService', () => ({
    checkCredits: mockCheckCredits,
    consumeCredits: mockConsumeCredits,
    refundCredits: mockRefundCredits,
    upgradePlan: mockUpgradePlan,
    addBonusCredits: mockAddBonusCredits,
  }))

  // Email Service
  vi.mock('@/lib/email', () => ({
    sendEmail: mockSendEmail,
    sendPaymentReceiptEmail: mockSendPaymentReceiptEmail,
    sendSubscriptionConfirmEmail: mockSendSubscriptionConfirmEmail,
    sendSubscriptionCancelledEmail: mockSendSubscriptionCancelledEmail,
    sendPaymentFailedEmail: mockSendPaymentFailedEmail,
  }))

  // Backend API Client
  vi.mock('@/lib/api/ApiClient', () => ({
    apiClient: mockApiClient,
    ApiClient: vi.fn().mockImplementation(() => mockApiClient),
  }))
}

/**
 * Resets all mocks to their initial state.
 * Call this in beforeEach() to ensure clean state between tests.
 */
export function resetApiMocks() {
  vi.clearAllMocks()

  // Reset default behaviors
  mockGetServerSession.mockResolvedValue(null)
  mockCheckCredits.mockResolvedValue({ hasCredits: true, remaining: 10 })
  mockConsumeCredits.mockResolvedValue({ success: true })
  mockApiClient.post.mockResolvedValue({ ok: true, status: 200, data: {} })
  mockApiClient.get.mockResolvedValue({ ok: true, status: 200, data: {} })
}

// ============ Request Helpers ============

/**
 * Creates a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
) {
  const { method = 'GET', body, headers = {} } = options

  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new Request(url, requestInit)
}

/**
 * Creates a mock NextRequest with auth headers
 */
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    userId?: string
    headers?: Record<string, string>
  } = {}
) {
  const { userId = 'test-user-id', headers = {}, ...rest } = options

  return createMockRequest(url, {
    ...rest,
    headers: {
      ...headers,
      'x-user-id': userId,
    },
  })
}

// ============ Response Helpers ============

/**
 * Extracts JSON data from a NextResponse
 */
export async function getResponseData<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

/**
 * Asserts response status and returns data
 */
export async function expectResponseStatus<T = unknown>(
  response: Response,
  expectedStatus: number
): Promise<T> {
  expect(response.status).toBe(expectedStatus)
  return getResponseData<T>(response)
}

// ============ Common Test Data ============

export const testBirthInfo = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'male',
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
}

export const testPersonInfo = {
  name: 'Test Person',
  ...testBirthInfo,
}

export const testChatMessage = {
  role: 'user' as const,
  content: 'Hello, this is a test message',
  timestamp: Date.now(),
}

export const testChatMessages = [
  { role: 'user' as const, content: 'Hello' },
  { role: 'assistant' as const, content: 'Hi there!' },
]
