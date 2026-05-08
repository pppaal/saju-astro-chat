/**
 * Request Validator
 *
 * Zod 기반 요청 검증 및 파싱
 * - 중복 검증 제거: Zod 스키마로 통합
 * - 타입 안전성 보장
 * - 상세한 에러 메시지 제공
 */

import { z } from 'zod';
import { NextRequest } from 'next/server';
import {
  dateSchema,
  latitudeSchema,
  longitudeSchema,
} from '@/lib/api/zodValidation/common';
import { LIMITS } from '@/lib/validation';
import type { SajuDataStructure, AstroDataStructure } from '../lib';
import { parseRequestBody } from '@/lib/api/requestParser';

// ============================================================
// Zod Schemas (Single Source of Truth)
// ============================================================

/** 시간 스키마 - HH:MM 또는 HH:MM AM/PM 형식 */
const timeSchema = z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)(\s?(AM|PM))?$/i, {
  message: 'Time must be in HH:MM or HH:MM AM/PM format',
});

/** 지원 언어 */
const langSchema = z.enum(['ko', 'en']).default('ko');

/** 지원 성별 */
const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not']).default('male');

/** 채팅 메시지 스키마 */
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(LIMITS.MESSAGE),
});

/** Destiny Map Chat Stream 요청 스키마 */
const destinyMapChatRequestSchema = z.object({
  // 필수 필드
  birthDate: dateSchema,
  birthTime: timeSchema,
  latitude: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    latitudeSchema
  ),
  longitude: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    longitudeSchema
  ),

  // 선택 필드 (기본값 있음)
  name: z.string().max(LIMITS.NAME).optional(),
  gender: genderSchema,
  theme: z.string().max(LIMITS.THEME).default('chat'),
  lang: langSchema,
  messages: z.array(messageSchema).max(LIMITS.MAX_MESSAGES).default([]),

  // 컨텍스트 데이터 (타입은 런타임에서 결정)
  saju: z.unknown().optional(),
  astro: z.unknown().optional(),
  advancedAstro: z.unknown().optional(),
  predictionContext: z.unknown().optional(),
  userContext: z.unknown().optional(),
  cvText: z.string().max(LIMITS.CV_TEXT).default(''),
});

// ============================================================
// Types
// ============================================================

export type ValidatedRequest = z.infer<typeof destinyMapChatRequestSchema> & {
  saju?: SajuDataStructure;
  astro?: AstroDataStructure;
};

export interface ValidationError {
  error: string;
  status: number;
  /** 상세 필드별 에러 (디버깅용) */
  details?: Array<{ field: string; message: string }>;
}

// ============================================================
// Validation Function
// ============================================================

/**
 * 요청 본문 검증 및 파싱
 *
 * @description
 * Zod 스키마 기반 검증으로 중복 로직 제거
 * - 타입 변환 자동 처리 (string → number)
 * - 기본값 자동 적용
 * - 상세한 에러 메시지 제공
 */
export async function validateRequest(
  req: NextRequest
): Promise<{ data: ValidatedRequest } | { error: ValidationError }> {
  // 1. JSON 파싱
  const body = await parseRequestBody<Record<string, unknown>>(req, {
    context: 'Destiny Map chat stream validation',
  });

  if (!body) {
    return {
      error: {
        error: 'Invalid JSON body',
        status: 400,
      },
    };
  }

  // 2. Zod 검증 (단일 검증 지점)
  const result = destinyMapChatRequestSchema.safeParse(body);

  if (!result.success) {
    // 첫 번째 에러를 주 에러로 사용
    const firstIssue = result.error.issues[0];
    const fieldPath = firstIssue.path.join('.');
    const errorMessage = fieldPath
      ? `Invalid ${fieldPath}: ${firstIssue.message}`
      : firstIssue.message;

    // 모든 에러를 details로 포함 (디버깅용)
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));

    return {
      error: {
        error: errorMessage,
        status: 400,
        details,
      },
    };
  }

  // 3. 타입 캐스팅 (saju, astro는 런타임 타입)
  return {
    data: result.data as ValidatedRequest,
  };
}

// ============================================================
// Exports for Testing
// ============================================================

export { destinyMapChatRequestSchema };
