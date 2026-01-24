/**
 * Type Guards and Type Utilities
 *
 * Safe type checking functions to replace 'any' types and improve type safety
 */

// ============ Basic Type Guards ============

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number (and not NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value exists (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is an object (excluding null and arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Check if value is a Date object
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid Date string (ISO 8601 or YYYY-MM-DD)
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return isDate(date);
}

/**
 * Check if value is an Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// ============ Complex Type Guards ============

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return isArray(value) && value.length > 0;
}

/**
 * Check if object has a specific property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Check if object has multiple properties
 */
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  if (!isObject(obj)) return false;
  return keys.every((key) => key in obj);
}

/**
 * Check if value matches a specific shape
 *
 * @example
 * const user = isShape<User>(data, {
 *   id: isNumber,
 *   name: isString,
 *   email: isString
 * });
 */
export function isShape<T>(
  value: unknown,
  shape: { [K in keyof T]: (value: unknown) => boolean }
): value is T {
  if (!isObject(value)) return false;

  return Object.entries(shape).every(([key, validator]) => {
    const val = (value as Record<string, unknown>)[key];
    return (validator as (v: unknown) => boolean)(val);
  });
}

// ============ Application-Specific Type Guards ============

/**
 * Birth info type guard
 */
export interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export function isBirthInfo(value: unknown): value is BirthInfo {
  return isShape<BirthInfo>(value, {
    birthDate: isDateString,
    birthTime: isString,
    birthPlace: isNonEmptyString,
    gender: (v): v is 'Male' | 'Female' => v === 'Male' || v === 'Female',
    latitude: (v) => isNumber(v) || isNullish(v),
    longitude: (v) => isNumber(v) || isNullish(v),
    timezone: (v) => isString(v) || isNullish(v),
  });
}

/**
 * Coordinates type guard
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function isCoordinates(value: unknown): value is Coordinates {
  return isShape<Coordinates>(value, {
    latitude: (v) => isNumber(v) && v >= -90 && v <= 90,
    longitude: (v) => isNumber(v) && v >= -180 && v <= 180,
  });
}

/**
 * Chat message type guard
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export function isChatMessage(value: unknown): value is ChatMessage {
  return isShape<ChatMessage>(value, {
    role: (v) => v === 'user' || v === 'assistant' || v === 'system',
    content: isNonEmptyString,
    timestamp: (v) => isString(v) || isNullish(v),
  });
}

/**
 * API Error response type guard
 */
export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export function isApiError(value: unknown): value is ApiError {
  return isShape<ApiError>(value, {
    code: isNonEmptyString,
    message: isNonEmptyString,
    requestId: (v) => isString(v) || isNullish(v),
    details: (v) => isObject(v) || isNullish(v),
  });
}

// ============ Assertion Functions ============

/**
 * Assert that value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is required'
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message);
  }
}

/**
 * Assert that value is a string
 */
export function assertString(
  value: unknown,
  message = 'Value must be a string'
): asserts value is string {
  if (!isString(value)) {
    throw new TypeError(message);
  }
}

/**
 * Assert that value is a number
 */
export function assertNumber(
  value: unknown,
  message = 'Value must be a number'
): asserts value is number {
  if (!isNumber(value)) {
    throw new TypeError(message);
  }
}

/**
 * Assert that value is an object
 */
export function assertObject(
  value: unknown,
  message = 'Value must be an object'
): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new TypeError(message);
  }
}

// ============ Safe Parsing Functions ============

/**
 * Safely parse JSON with type checking
 */
export function parseJSON<T>(
  json: string,
  validator?: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    if (validator && !validator(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Safely parse number
 */
export function parseNumber(value: unknown): number | null {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = Number(value);
    return isNumber(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Safely parse boolean
 */
export function parseBoolean(value: unknown): boolean | null {
  if (isBoolean(value)) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 1) return true;
  if (value === 0) return false;
  return null;
}

/**
 * Safely get object property
 */
export function getProperty<T>(
  obj: unknown,
  key: string,
  validator: (value: unknown) => value is T
): T | null {
  if (!isObject(obj)) return null;
  const value = obj[key];
  return validator(value) ? value : null;
}

// ============ Type Narrowing Utilities ============

/**
 * Filter array to only defined values
 */
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isDefined);
}

/**
 * Filter array by type guard
 */
export function filterByType<T>(
  array: unknown[],
  guard: (value: unknown) => value is T
): T[] {
  return array.filter(guard);
}

/**
 * Map with type safety
 */
export function safeMap<T, U>(
  array: unknown[],
  guard: (value: unknown) => value is T,
  mapper: (value: T) => U
): U[] {
  return filterByType(array, guard).map(mapper);
}
