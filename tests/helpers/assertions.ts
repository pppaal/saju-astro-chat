/**
 * Test Assertion Helpers
 * Consolidates duplicate assertion patterns across 200+ test files
 *
 * Common patterns consolidated:
 * - API response assertions
 * - Mock call verifications
 * - Error assertions
 * - Data structure validations
 */

import { expect, type Mock } from 'vitest'

// ============ API Response Assertions ============

/**
 * Asserts API response has expected status code
 */
export function expectStatus(response: Response, status: number): void {
  expect(response.status).toBe(status)
}

/**
 * Asserts successful API response (2xx)
 */
export async function expectSuccess<T = unknown>(
  response: Response,
  expectedStatus = 200
): Promise<T> {
  expect(response.ok).toBe(true)
  expect(response.status).toBe(expectedStatus)
  return response.json() as Promise<T>
}

/**
 * Asserts API error response
 */
export async function expectError(
  response: Response,
  expectedStatus: number,
  expectedCode?: string
): Promise<{ error: { code: string; message?: string } }> {
  expect(response.ok).toBe(false)
  expect(response.status).toBe(expectedStatus)
  const data = (await response.json()) as { error: { code: string; message?: string } }

  if (expectedCode) {
    expect(data.error?.code).toBe(expectedCode)
  }

  return data
}

/**
 * Asserts validation error response
 */
export async function expectValidationError(
  response: Response
): Promise<{ error: { code: string; details?: unknown[] } }> {
  return expectError(response, 400, 'VALIDATION_ERROR')
}

/**
 * Asserts unauthorized response
 */
export async function expectUnauthorized(response: Response): Promise<void> {
  expect(response.status).toBe(401)
}

/**
 * Asserts forbidden response
 */
export async function expectForbidden(response: Response): Promise<void> {
  expect(response.status).toBe(403)
}

/**
 * Asserts not found response
 */
export async function expectNotFound(response: Response): Promise<void> {
  expect(response.status).toBe(404)
}

/**
 * Asserts rate limited response
 */
export async function expectRateLimited(response: Response): Promise<void> {
  expect(response.status).toBe(429)
}

// ============ Mock Assertions ============

/**
 * Asserts mock was called with specific arguments
 */
export function expectCalledWith(mock: Mock, ...args: unknown[]): void {
  expect(mock).toHaveBeenCalledWith(...args)
}

/**
 * Asserts mock was called exactly n times
 */
export function expectCalledTimes(mock: Mock, times: number): void {
  expect(mock).toHaveBeenCalledTimes(times)
}

/**
 * Asserts mock was called once
 */
export function expectCalledOnce(mock: Mock): void {
  expect(mock).toHaveBeenCalledTimes(1)
}

/**
 * Asserts mock was never called
 */
export function expectNotCalled(mock: Mock): void {
  expect(mock).not.toHaveBeenCalled()
}

/**
 * Asserts mock's first call included specific arguments
 */
export function expectFirstCallIncluded(mock: Mock, partialArgs: Record<string, unknown>): void {
  expect(mock).toHaveBeenCalled()
  const firstCall = mock.mock.calls[0]
  expect(firstCall).toBeDefined()
  expect(firstCall[0]).toMatchObject(partialArgs)
}

/**
 * Asserts mock was called with object containing specific properties
 */
export function expectCalledWithPartial(mock: Mock, partial: Record<string, unknown>): void {
  expect(mock).toHaveBeenCalledWith(expect.objectContaining(partial))
}

// ============ Data Structure Assertions ============

/**
 * Asserts object has required keys
 */
export function expectKeys<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): void {
  keys.forEach((key) => {
    expect(obj).toHaveProperty(key as string)
  })
}

/**
 * Asserts array has expected length
 */
export function expectLength<T>(arr: T[], length: number): void {
  expect(arr).toHaveLength(length)
}

/**
 * Asserts array is not empty
 */
export function expectNonEmpty<T>(arr: T[]): void {
  expect(arr.length).toBeGreaterThan(0)
}

/**
 * Asserts array is empty
 */
export function expectEmpty<T>(arr: T[]): void {
  expect(arr).toHaveLength(0)
}

/**
 * Asserts value is within range
 */
export function expectInRange(value: number, min: number, max: number): void {
  expect(value).toBeGreaterThanOrEqual(min)
  expect(value).toBeLessThanOrEqual(max)
}

/**
 * Asserts date is valid ISO string
 */
export function expectValidDate(dateStr: string): void {
  const date = new Date(dateStr)
  expect(date.getTime()).not.toBeNaN()
}

/**
 * Asserts string matches pattern
 */
export function expectMatch(str: string, pattern: RegExp): void {
  expect(str).toMatch(pattern)
}

/**
 * Asserts object matches partial structure
 */
export function expectPartial<T extends Record<string, unknown>>(
  obj: T,
  partial: Partial<T>
): void {
  expect(obj).toMatchObject(partial)
}

// ============ Async Assertions ============

/**
 * Asserts promise resolves to expected value
 */
export async function expectResolves<T>(promise: Promise<T>, expected: T): Promise<void> {
  await expect(promise).resolves.toEqual(expected)
}

/**
 * Asserts promise rejects with expected error
 */
export async function expectRejects(
  promise: Promise<unknown>,
  errorMatcher?: string | RegExp | Error
): Promise<void> {
  if (errorMatcher) {
    await expect(promise).rejects.toThrow(errorMatcher)
  } else {
    await expect(promise).rejects.toThrow()
  }
}

/**
 * Asserts async function throws
 */
export async function expectThrows(
  fn: () => Promise<unknown>,
  errorMatcher?: string | RegExp
): Promise<void> {
  if (errorMatcher) {
    await expect(fn()).rejects.toThrow(errorMatcher)
  } else {
    await expect(fn()).rejects.toThrow()
  }
}

// ============ Type Assertions ============

/**
 * Asserts value is defined (not undefined or null)
 */
export function expectDefined<T>(value: T | undefined | null): asserts value is T {
  expect(value).toBeDefined()
  expect(value).not.toBeNull()
}

/**
 * Asserts value is null or undefined
 */
export function expectNullish(value: unknown): void {
  expect(value == null).toBe(true)
}

/**
 * Asserts value is of expected type
 */
export function expectType(value: unknown, type: 'string' | 'number' | 'boolean' | 'object' | 'function'): void {
  expect(typeof value).toBe(type)
}

/**
 * Asserts value is an array
 */
export function expectArray(value: unknown): asserts value is unknown[] {
  expect(Array.isArray(value)).toBe(true)
}

// ============ Saju/Astrology Specific Assertions ============

/**
 * Asserts valid pillar structure (for Saju)
 */
export function expectValidPillar(pillar: {
  stem?: string
  branch?: string
  heavenlyStem?: string
  earthlyBranch?: string
}): void {
  const stem = pillar.stem || pillar.heavenlyStem
  const branch = pillar.branch || pillar.earthlyBranch

  expect(stem).toBeDefined()
  expect(branch).toBeDefined()
  expect(typeof stem).toBe('string')
  expect(typeof branch).toBe('string')
}

/**
 * Asserts valid saju four pillars
 */
export function expectValidFourPillars(pillars: {
  year?: unknown
  month?: unknown
  day?: unknown
  hour?: unknown
  yearPillar?: unknown
  monthPillar?: unknown
  dayPillar?: unknown
  hourPillar?: unknown
}): void {
  const year = pillars.year || pillars.yearPillar
  const month = pillars.month || pillars.monthPillar
  const day = pillars.day || pillars.dayPillar
  const hour = pillars.hour || pillars.hourPillar

  expect(year).toBeDefined()
  expect(month).toBeDefined()
  expect(day).toBeDefined()
  expect(hour).toBeDefined()
}

/**
 * Asserts valid score (typically 0-100)
 */
export function expectValidScore(score: number, min = 0, max = 100): void {
  expect(typeof score).toBe('number')
  expect(score).toBeGreaterThanOrEqual(min)
  expect(score).toBeLessThanOrEqual(max)
}

/**
 * Asserts valid element (오행)
 */
export function expectValidElement(element: string): void {
  const validElements = ['wood', 'fire', 'earth', 'metal', 'water', '목', '화', '토', '금', '수']
  expect(validElements).toContain(element.toLowerCase())
}

// ============ Snapshot Helpers ============

/**
 * Removes dynamic fields before snapshot comparison
 */
export function sanitizeForSnapshot<T extends Record<string, unknown>>(
  obj: T,
  dynamicFields: string[] = ['id', 'createdAt', 'updatedAt', 'timestamp']
): Partial<T> {
  const result = { ...obj }
  dynamicFields.forEach((field) => {
    delete result[field]
  })
  return result
}

/**
 * Asserts object matches snapshot after sanitizing dynamic fields
 */
export function expectSanitizedSnapshot<T extends Record<string, unknown>>(
  obj: T,
  dynamicFields?: string[]
): void {
  expect(sanitizeForSnapshot(obj, dynamicFields)).toMatchSnapshot()
}

// ============ Timing Assertions ============

/**
 * Asserts operation completed within timeout
 */
export async function expectCompletesWithin<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const start = Date.now()
  const result = await promise
  const elapsed = Date.now() - start
  expect(elapsed).toBeLessThan(timeoutMs)
  return result
}

// ============ Combined Assertions ============

/**
 * Asserts successful API response with specific data structure
 */
export async function expectSuccessWithData<T extends Record<string, unknown>>(
  response: Response,
  expectedKeys: (keyof T)[]
): Promise<T> {
  const data = await expectSuccess<T>(response)
  expectKeys(data, expectedKeys)
  return data
}

/**
 * Asserts paginated response structure
 */
export async function expectPaginatedResponse<T>(
  response: Response
): Promise<{
  items: T[]
  pagination: {
    limit: number
    offset: number
    count: number
    hasMore: boolean
  }
}> {
  const data = await expectSuccess<{
    items: T[]
    pagination: {
      limit: number
      offset: number
      count: number
      hasMore: boolean
    }
  }>(response)

  expect(data).toHaveProperty('items')
  expect(data).toHaveProperty('pagination')
  expect(Array.isArray(data.items)).toBe(true)
  expect(typeof data.pagination.limit).toBe('number')
  expect(typeof data.pagination.offset).toBe('number')

  return data
}
