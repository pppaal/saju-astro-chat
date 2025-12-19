// src/lib/destiny-matrix/errors.ts
// Destiny Fusion Matrix™ - Error Handling System
// 구조화된 에러 처리 시스템

// ===========================
// 에러 코드 정의
// ===========================

export const ErrorCodes = {
  // 검증 에러 (1xxx)
  VALIDATION_ERROR: 'DFM_1000',
  MISSING_REQUIRED_FIELD: 'DFM_1001',
  INVALID_FIELD_VALUE: 'DFM_1002',
  INVALID_ELEMENT: 'DFM_1003',
  INVALID_SIBSIN: 'DFM_1004',
  INVALID_GEOKGUK: 'DFM_1005',
  INVALID_PLANET: 'DFM_1006',
  INVALID_HOUSE: 'DFM_1007',
  INVALID_TRANSIT: 'DFM_1008',
  INVALID_SHINSAL: 'DFM_1009',

  // 계산 에러 (2xxx)
  CALCULATION_ERROR: 'DFM_2000',
  LAYER_CALCULATION_FAILED: 'DFM_2001',
  WEIGHT_CALCULATION_FAILED: 'DFM_2002',
  INSIGHT_GENERATION_FAILED: 'DFM_2003',
  REPORT_GENERATION_FAILED: 'DFM_2004',

  // 데이터 에러 (3xxx)
  DATA_NOT_FOUND: 'DFM_3000',
  MATRIX_DATA_MISSING: 'DFM_3001',
  LAYER_DATA_MISSING: 'DFM_3002',

  // 시스템 에러 (9xxx)
  INTERNAL_ERROR: 'DFM_9000',
  UNKNOWN_ERROR: 'DFM_9999',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ===========================
// 에러 메시지 (한/영)
// ===========================

export const ErrorMessages: Record<ErrorCode, { ko: string; en: string }> = {
  DFM_1000: { ko: '입력 데이터 검증에 실패했습니다.', en: 'Input validation failed.' },
  DFM_1001: { ko: '필수 필드가 누락되었습니다.', en: 'Required field is missing.' },
  DFM_1002: { ko: '필드 값이 유효하지 않습니다.', en: 'Field value is invalid.' },
  DFM_1003: { ko: '유효하지 않은 오행입니다. (목/화/토/금/수)', en: 'Invalid element. (Wood/Fire/Earth/Metal/Water)' },
  DFM_1004: { ko: '유효하지 않은 십신입니다.', en: 'Invalid Sibsin.' },
  DFM_1005: { ko: '유효하지 않은 격국입니다.', en: 'Invalid Geokguk.' },
  DFM_1006: { ko: '유효하지 않은 행성입니다.', en: 'Invalid planet name.' },
  DFM_1007: { ko: '유효하지 않은 하우스 번호입니다. (1-12)', en: 'Invalid house number. (1-12)' },
  DFM_1008: { ko: '유효하지 않은 트랜짓 주기입니다.', en: 'Invalid transit cycle.' },
  DFM_1009: { ko: '유효하지 않은 신살입니다.', en: 'Invalid Shinsal.' },

  DFM_2000: { ko: '계산 중 오류가 발생했습니다.', en: 'Calculation error occurred.' },
  DFM_2001: { ko: '레이어 계산에 실패했습니다.', en: 'Layer calculation failed.' },
  DFM_2002: { ko: '가중치 계산에 실패했습니다.', en: 'Weight calculation failed.' },
  DFM_2003: { ko: '인사이트 생성에 실패했습니다.', en: 'Insight generation failed.' },
  DFM_2004: { ko: '리포트 생성에 실패했습니다.', en: 'Report generation failed.' },

  DFM_3000: { ko: '데이터를 찾을 수 없습니다.', en: 'Data not found.' },
  DFM_3001: { ko: '매트릭스 데이터가 누락되었습니다.', en: 'Matrix data is missing.' },
  DFM_3002: { ko: '레이어 데이터가 누락되었습니다.', en: 'Layer data is missing.' },

  DFM_9000: { ko: '내부 서버 오류가 발생했습니다.', en: 'Internal server error.' },
  DFM_9999: { ko: '알 수 없는 오류가 발생했습니다.', en: 'Unknown error occurred.' },
};

// ===========================
// 커스텀 에러 클래스
// ===========================

export class DestinyMatrixError extends Error {
  public readonly code: ErrorCode;
  public readonly field?: string;
  public readonly details?: unknown;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    options?: {
      field?: string;
      details?: unknown;
      message?: string;
      lang?: 'ko' | 'en';
    }
  ) {
    const lang = options?.lang || 'ko';
    const defaultMessage = ErrorMessages[code]?.[lang] || ErrorMessages.DFM_9999[lang];
    const message = options?.message || defaultMessage;

    super(message);
    this.name = 'DestinyMatrixError';
    this.code = code;
    this.field = options?.field;
    this.details = options?.details;
    this.timestamp = new Date();

    // Error 상속 시 프로토타입 체인 수정
    Object.setPrototypeOf(this, DestinyMatrixError.prototype);
  }

  /**
   * JSON 형식으로 변환
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        field: this.field,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }

  /**
   * HTTP 상태 코드 가져오기
   */
  getHttpStatus(): number {
    const codeNum = parseInt(this.code.replace('DFM_', ''), 10);

    if (codeNum >= 1000 && codeNum < 2000) return 400; // 검증 에러 → Bad Request
    if (codeNum >= 2000 && codeNum < 3000) return 422; // 계산 에러 → Unprocessable Entity
    if (codeNum >= 3000 && codeNum < 4000) return 404; // 데이터 에러 → Not Found
    return 500; // 시스템 에러 → Internal Server Error
  }
}

// ===========================
// 에러 응답 타입
// ===========================

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: unknown;
    timestamp: string;
  };
}

// ===========================
// 에러 생성 헬퍼 함수
// ===========================

export function createValidationError(
  field: string,
  details?: unknown,
  lang: 'ko' | 'en' = 'ko'
): DestinyMatrixError {
  return new DestinyMatrixError(ErrorCodes.INVALID_FIELD_VALUE, {
    field,
    details,
    lang,
  });
}

export function createMissingFieldError(
  field: string,
  lang: 'ko' | 'en' = 'ko'
): DestinyMatrixError {
  return new DestinyMatrixError(ErrorCodes.MISSING_REQUIRED_FIELD, {
    field,
    message: lang === 'ko'
      ? `필수 필드 '${field}'가 누락되었습니다.`
      : `Required field '${field}' is missing.`,
    lang,
  });
}

export function createCalculationError(
  layer: number,
  details?: unknown,
  lang: 'ko' | 'en' = 'ko'
): DestinyMatrixError {
  return new DestinyMatrixError(ErrorCodes.LAYER_CALCULATION_FAILED, {
    field: `layer${layer}`,
    details,
    lang,
  });
}

// ===========================
// 에러 래핑 유틸리티
// ===========================

/**
 * 에러를 DestinyMatrixError로 래핑
 */
export function wrapError(error: unknown, lang: 'ko' | 'en' = 'ko'): DestinyMatrixError {
  if (error instanceof DestinyMatrixError) {
    return error;
  }

  if (error instanceof Error) {
    return new DestinyMatrixError(ErrorCodes.INTERNAL_ERROR, {
      message: error.message,
      details: { originalError: error.name, stack: error.stack },
      lang,
    });
  }

  return new DestinyMatrixError(ErrorCodes.UNKNOWN_ERROR, {
    details: error,
    lang,
  });
}

/**
 * 안전하게 함수 실행
 */
export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
  lang: 'ko' | 'en' = 'ko'
): Promise<{ success: true; data: T } | ErrorResponse> {
  try {
    const result = await fn();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DestinyMatrixError) {
      return error.toJSON();
    }

    const wrapped = new DestinyMatrixError(errorCode, {
      details: error instanceof Error ? error.message : error,
      lang,
    });

    return wrapped.toJSON();
  }
}

/**
 * 동기 버전
 */
export function safeExecuteSync<T>(
  fn: () => T,
  errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
  lang: 'ko' | 'en' = 'ko'
): { success: true; data: T } | ErrorResponse {
  try {
    const result = fn();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DestinyMatrixError) {
      return error.toJSON();
    }

    const wrapped = new DestinyMatrixError(errorCode, {
      details: error instanceof Error ? error.message : error,
      lang,
    });

    return wrapped.toJSON();
  }
}
