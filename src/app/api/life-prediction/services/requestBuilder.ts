/**
 * Request Builder Service
 * API 요청 빌드 및 유효성 검사
 */

import {
  convertSajuDaeunToInfo,
  type LifePredictionInput,
} from '@/lib/prediction';
import { NextResponse } from 'next/server';
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler';
import type { BaseRequest } from '../types';

/**
 * 요청 데이터를 LifePredictionInput으로 변환
 */
export function buildPredictionInput(req: BaseRequest): LifePredictionInput {
  const daeunList = req.daeunList
    ? convertSajuDaeunToInfo(req.daeunList)
    : undefined;

  const astroChart = req.astroChart ? {
    sun: req.astroChart.sun,
    moon: req.astroChart.moon,
    venus: req.astroChart.venus,
    mars: req.astroChart.mars,
    jupiter: req.astroChart.jupiter,
    saturn: req.astroChart.saturn,
    mercury: req.astroChart.mercury,
    ascendant: req.astroChart.ascendant,
    planets: req.astroChart.planets,
  } : undefined;

  const advancedAstro = req.advancedAstro ? {
    electional: req.advancedAstro.electional,
    solarReturn: req.advancedAstro.solarReturn,
    lunarReturn: req.advancedAstro.lunarReturn,
    progressions: req.advancedAstro.progressions,
    eclipses: req.advancedAstro.eclipses,
    extraPoints: req.advancedAstro.extraPoints,
  } : undefined;

  return {
    birthYear: req.birthYear,
    birthMonth: req.birthMonth,
    birthDay: req.birthDay,
    birthHour: req.birthHour,
    gender: req.gender,
    dayStem: req.dayStem,
    dayBranch: req.dayBranch,
    monthBranch: req.monthBranch,
    yearBranch: req.yearBranch,
    allStems: req.allStems || [req.dayStem],
    allBranches: req.allBranches || [req.dayBranch, req.monthBranch, req.yearBranch],
    daeunList,
    yongsin: req.yongsin as LifePredictionInput['yongsin'],
    kisin: req.kisin as LifePredictionInput['kisin'],
    astroChart,
    advancedAstro,
  };
}

/**
 * 요청 유효성 검사
 */
export function validateRequest(body: unknown): { valid: true } | { valid: false; errorResponse: NextResponse } {
  if (!body || typeof body !== 'object') {
    return { valid: false, errorResponse: createErrorResponse({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request body' }) };
  }

  const req = body as Record<string, unknown>;

  if (!req.type) {
    return { valid: false, errorResponse: createErrorResponse({ code: ErrorCodes.MISSING_FIELD, message: 'type is required (multi-year, past-analysis, event-timing, comprehensive)' }) };
  }

  if (!req.birthYear || !req.birthMonth || !req.birthDay) {
    return { valid: false, errorResponse: createErrorResponse({ code: ErrorCodes.MISSING_FIELD, message: 'birthYear, birthMonth, birthDay are required' }) };
  }

  if (!req.dayStem || !req.dayBranch) {
    return { valid: false, errorResponse: createErrorResponse({ code: ErrorCodes.MISSING_FIELD, message: 'dayStem and dayBranch are required' }) };
  }

  if (!req.gender || !['male', 'female'].includes(req.gender as string)) {
    return { valid: false, errorResponse: createErrorResponse({ code: ErrorCodes.MISSING_FIELD, message: 'gender is required (male or female)' }) };
  }

  return { valid: true };
}
