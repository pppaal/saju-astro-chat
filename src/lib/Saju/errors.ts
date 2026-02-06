// src/lib/Saju/errors.ts
// Saju domain-specific error types

/**
 * Base error for all Saju-related errors
 */
export class SajuError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SajuError";
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SajuError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ============================================================
// Calculation Errors
// ============================================================

/**
 * Error during Saju calculation
 */
export class SajuCalculationError extends SajuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CALCULATION_ERROR", message, details);
    this.name = "SajuCalculationError";
  }

  static invalidInput(field: string, value: unknown): SajuCalculationError {
    return new SajuCalculationError(`Invalid input for ${field}`, { field, value });
  }

  static missingData(field: string): SajuCalculationError {
    return new SajuCalculationError(`Missing required data: ${field}`, { field });
  }

  static outOfRange(field: string, value: number, min: number, max: number): SajuCalculationError {
    return new SajuCalculationError(
      `${field} value ${value} is out of range [${min}, ${max}]`,
      { field, value, min, max }
    );
  }
}

/**
 * Error when lunar-solar conversion fails
 */
export class LunarConversionError extends SajuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("LUNAR_CONVERSION_ERROR", message, details);
    this.name = "LunarConversionError";
  }

  static unsupportedDate(date: string): LunarConversionError {
    return new LunarConversionError(`Cannot convert date: ${date}. Date may be out of supported range.`, { date });
  }

  static invalidLunarDate(year: number, month: number, day: number): LunarConversionError {
    return new LunarConversionError(
      `Invalid lunar date: ${year}-${month}-${day}`,
      { year, month, day }
    );
  }
}

// ============================================================
// Compatibility Errors
// ============================================================

/**
 * Error during compatibility analysis
 */
export class CompatibilityError extends SajuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("COMPATIBILITY_ERROR", message, details);
    this.name = "CompatibilityError";
  }

  static missingPillars(person: "person1" | "person2"): CompatibilityError {
    return new CompatibilityError(`Missing pillars data for ${person}`, { person });
  }

  static incompatibleData(reason: string): CompatibilityError {
    return new CompatibilityError(`Incompatible data for analysis: ${reason}`, { reason });
  }
}

// ============================================================
// Interpretation Errors
// ============================================================

/**
 * Error during interpretation/analysis
 */
export class InterpretationError extends SajuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("INTERPRETATION_ERROR", message, details);
    this.name = "InterpretationError";
  }

  static unknownGeokguk(geokguk: string): InterpretationError {
    return new InterpretationError(`Unknown geokguk type: ${geokguk}`, { geokguk });
  }

  static unknownShinsal(shinsal: string): InterpretationError {
    return new InterpretationError(`Unknown shinsal type: ${shinsal}`, { shinsal });
  }

  static missingInterpretation(type: string, key: string): InterpretationError {
    return new InterpretationError(`No interpretation found for ${type}: ${key}`, { type, key });
  }
}

// ============================================================
// Data Errors
// ============================================================

/**
 * Error when loading or accessing Saju data
 */
export class SajuDataError extends SajuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("DATA_ERROR", message, details);
    this.name = "SajuDataError";
  }

  static fileNotFound(path: string): SajuDataError {
    return new SajuDataError(`Data file not found: ${path}`, { path });
  }

  static invalidFormat(path: string, reason: string): SajuDataError {
    return new SajuDataError(`Invalid data format in ${path}: ${reason}`, { path, reason });
  }

  static missingField(source: string, field: string): SajuDataError {
    return new SajuDataError(`Missing field '${field}' in ${source}`, { source, field });
  }
}

// ============================================================
// Cache Errors
// ============================================================

/**
 * Error related to Saju caching
 */
export class SajuCacheError extends SajuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CACHE_ERROR", message, details);
    this.name = "SajuCacheError";
  }

  static serializationFailed(key: string, reason: string): SajuCacheError {
    return new SajuCacheError(`Failed to serialize cache entry: ${reason}`, { key, reason });
  }

  static deserializationFailed(key: string, reason: string): SajuCacheError {
    return new SajuCacheError(`Failed to deserialize cache entry: ${reason}`, { key, reason });
  }
}

// ============================================================
// Error Type Guards
// ============================================================

/**
 * Check if error is a SajuError
 */
export function isSajuError(error: unknown): error is SajuError {
  return error instanceof SajuError;
}

/**
 * Check if error is a SajuCalculationError
 */
export function isCalculationError(error: unknown): error is SajuCalculationError {
  return error instanceof SajuCalculationError;
}

/**
 * Check if error is a LunarConversionError
 */
export function isLunarConversionError(error: unknown): error is LunarConversionError {
  return error instanceof LunarConversionError;
}

/**
 * Check if error is a CompatibilityError
 */
export function isCompatibilityError(error: unknown): error is CompatibilityError {
  return error instanceof CompatibilityError;
}

// ============================================================
// Error Handler
// ============================================================

/**
 * Wrap a function to convert unknown errors to SajuError
 */
export function wrapSajuError<T>(fn: () => T, context: string): T {
  try {
    return fn();
  } catch (error) {
    if (isSajuError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      throw new SajuError("UNKNOWN_ERROR", `${context}: ${error.message}`, {
        originalError: error.name,
        stack: error.stack,
      });
    }

    throw new SajuError("UNKNOWN_ERROR", `${context}: Unknown error occurred`, {
      error: String(error),
    });
  }
}

/**
 * Async version of wrapSajuError
 */
export async function wrapSajuErrorAsync<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isSajuError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      throw new SajuError("UNKNOWN_ERROR", `${context}: ${error.message}`, {
        originalError: error.name,
        stack: error.stack,
      });
    }

    throw new SajuError("UNKNOWN_ERROR", `${context}: Unknown error occurred`, {
      error: String(error),
    });
  }
}

// ============================================================
// Error Messages (Localized)
// ============================================================

const ERROR_MESSAGES_KO: Record<string, string> = {
  CALCULATION_ERROR: "사주 계산 중 오류가 발생했습니다",
  LUNAR_CONVERSION_ERROR: "음력 변환 중 오류가 발생했습니다",
  COMPATIBILITY_ERROR: "궁합 분석 중 오류가 발생했습니다",
  INTERPRETATION_ERROR: "해석 중 오류가 발생했습니다",
  DATA_ERROR: "데이터 로드 중 오류가 발생했습니다",
  CACHE_ERROR: "캐시 처리 중 오류가 발생했습니다",
  UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다",
};

const ERROR_MESSAGES_EN: Record<string, string> = {
  CALCULATION_ERROR: "Error during Saju calculation",
  LUNAR_CONVERSION_ERROR: "Error during lunar calendar conversion",
  COMPATIBILITY_ERROR: "Error during compatibility analysis",
  INTERPRETATION_ERROR: "Error during interpretation",
  DATA_ERROR: "Error loading data",
  CACHE_ERROR: "Error processing cache",
  UNKNOWN_ERROR: "An unknown error occurred",
};

/**
 * Get localized error message
 */
export function getErrorMessage(error: SajuError, lang: "ko" | "en" = "ko"): string {
  const messages = lang === "ko" ? ERROR_MESSAGES_KO : ERROR_MESSAGES_EN;
  return messages[error.code] || error.message;
}
