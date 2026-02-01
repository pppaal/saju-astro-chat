/**
 * Request Validator
 *
 * 요청 검증 및 파싱
 */

import { NextRequest } from 'next/server';
import { isValidDate, isValidTime, isValidLatitude, isValidLongitude, LIMITS } from '@/lib/validation';
import { ALLOWED_LANG, ALLOWED_GENDER, type SajuDataStructure, type AstroDataStructure } from '../lib';
import { parseRequestBody } from '@/lib/api/requestParser';

export interface ValidatedRequest {
  name?: string;
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  latitude: number;
  longitude: number;
  theme: string;
  lang: string;
  messages: unknown[];
  saju?: SajuDataStructure;
  astro?: AstroDataStructure;
  advancedAstro?: unknown;
  predictionContext?: unknown;
  userContext?: unknown;
  cvText?: string;
}

export interface ValidationError {
  error: string;
  status: number;
}

/**
 * 요청 본문 검증 및 파싱
 */
export async function validateRequest(
  req: NextRequest
): Promise<{ data: ValidatedRequest } | { error: ValidationError }> {
  const body = await parseRequestBody<Record<string, unknown>>(req, { context: 'Destiny Map chat stream validation' });
  if (!body) {
    return {
      error: { error: 'invalid_body', status: 400 },
    };
  }

  const name =
    typeof body.name === 'string' ? body.name.trim().slice(0, LIMITS.NAME) : undefined;
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : '';
  const birthTime = typeof body.birthTime === 'string' ? body.birthTime.trim() : '';
  const gender =
    typeof body.gender === 'string' && ALLOWED_GENDER.has(body.gender)
      ? (body.gender as 'male' | 'female')
      : 'male';
  const latitude =
    typeof body.latitude === 'number' ? body.latitude : Number(body.latitude);
  const longitude =
    typeof body.longitude === 'number' ? body.longitude : Number(body.longitude);
  const theme =
    typeof body.theme === 'string' ? body.theme.trim().slice(0, LIMITS.THEME) : 'chat';
  const lang =
    typeof body.lang === 'string' && ALLOWED_LANG.has(body.lang) ? body.lang : 'ko';
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const saju = body.saju as SajuDataStructure | undefined;
  const astro = body.astro as AstroDataStructure | undefined;
  const advancedAstro = body.advancedAstro;
  const predictionContext = body.predictionContext;
  const userContext = body.userContext;
  const cvText = typeof body.cvText === 'string' ? body.cvText : '';

  // Basic validation
  if (!birthDate || !birthTime || !isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return {
      error: { error: 'Missing required fields', status: 400 },
    };
  }

  if (!isValidDate(birthDate)) {
    return {
      error: { error: 'Invalid birthDate', status: 400 },
    };
  }

  if (!isValidTime(birthTime)) {
    return {
      error: { error: 'Invalid birthTime', status: 400 },
    };
  }

  if (!isValidLatitude(latitude)) {
    return {
      error: { error: 'Invalid latitude', status: 400 },
    };
  }

  if (!isValidLongitude(longitude)) {
    return {
      error: { error: 'Invalid longitude', status: 400 },
    };
  }

  return {
    data: {
      name,
      birthDate,
      birthTime,
      gender,
      latitude,
      longitude,
      theme,
      lang,
      messages,
      saju,
      astro,
      advancedAstro,
      predictionContext,
      userContext,
      cvText,
    },
  };
}
