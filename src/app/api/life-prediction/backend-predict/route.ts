// src/app/api/life-prediction/backend-predict/route.ts
// 백엔드 Flask prediction API 프록시 - RAG 기반 예측 시스템 사용

import { NextRequest, NextResponse } from 'next/server';
import { scoreToGrade as standardScoreToGrade, type PredictionGrade } from '@/lib/prediction';
import { logger } from '@/lib/logger';

// ============================================================
// 타입 정의
// ============================================================
interface PredictRequest {
  question: string;
  birthYear: number;
  birthMonth: number;
  birthDay?: number;
  birthHour?: number;
  gender?: 'male' | 'female' | 'unknown';
  locale?: 'ko' | 'en';
  type?: 'timing' | 'forecast' | 'luck';
}

interface BackendResponse {
  status: 'success' | 'error';
  message?: string;
  // timing 응답
  question?: string;
  event_type?: string;
  search_period?: {
    start: string;
    end: string;
  };
  recommendations?: Array<{
    start_date: string;
    end_date: string;
    quality: string;
    quality_display: string;
    score: number;
    reasons: {
      astro: string[];
      saju: string[];
    };
    advice: string;
  }>;
  avoid_dates?: Array<{
    date: string;
    reason: string;
    factors: string[];
  }>;
  general_advice?: string;
  natural_answer?: string;
  // forecast 응답
  predictions?: {
    current_daeun?: Record<string, unknown>;
    current_seun?: Record<string, unknown>;
    five_year_outlook?: Array<Record<string, unknown>>;
    timing_recommendation?: Record<string, unknown>;
  };
  ai_interpretation?: string;
}

// ============================================================
// 환경 변수
// ============================================================
const BACKEND_URL = process.env.BACKEND_AI_URL || 'http://localhost:5000';

// ============================================================
// POST 핸들러
// ============================================================
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PredictRequest = await request.json();
    const {
      question,
      birthYear,
      birthMonth,
      birthDay = 15,
      birthHour = 12,
      gender = 'unknown',
      type = 'timing',
    } = body;

    // 필수 파라미터 검증
    if (!question) {
      return NextResponse.json(
        { success: false, error: '질문이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!birthYear || !birthMonth) {
      return NextResponse.json(
        { success: false, error: '생년월일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 백엔드 API 엔드포인트 선택
    let endpoint: string;
    let requestBody: Record<string, unknown>;

    switch (type) {
      case 'timing':
        endpoint = `${BACKEND_URL}/api/prediction/timing`;
        requestBody = {
          question,
          year: birthYear,
          month: birthMonth,
          day: birthDay,
          hour: birthHour,
          gender,
        };
        break;

      case 'forecast':
        endpoint = `${BACKEND_URL}/api/prediction/forecast`;
        requestBody = {
          question,
          year: birthYear,
          month: birthMonth,
          day: birthDay,
          hour: birthHour,
          gender,
          include_timing: true,
        };
        break;

      case 'luck':
        endpoint = `${BACKEND_URL}/api/prediction/luck`;
        requestBody = {
          year: birthYear,
          month: birthMonth,
          day: birthDay,
          hour: birthHour,
          gender,
          years_ahead: 5,
        };
        break;

      default:
        endpoint = `${BACKEND_URL}/api/prediction/timing`;
        requestBody = { question, year: birthYear, month: birthMonth };
    }

    logger.info(`[Backend Predict] Calling ${endpoint}`);

    // 백엔드 API 호출
    const apiKey = process.env.ADMIN_API_TOKEN || '';
    const backendRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      logger.error('[Backend Predict] Backend error:', errorText);
      // 백엔드 오류 시에도 폴백 사용하도록
      return NextResponse.json(
        {
          success: false,
          error: '백엔드 서버 오류',
          fallback: true,
        },
        { status: 503 }
      );
    }

    const backendData: BackendResponse = await backendRes.json();

    if (backendData.status === 'error') {
      return NextResponse.json(
        { success: false, error: backendData.message || '예측 실패' },
        { status: 500 }
      );
    }

    // 프론트엔드 형식으로 변환
    const response = transformBackendResponse(backendData, type);

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    logger.error('[Backend Predict] Error:', error);

    // 백엔드 연결 실패 시 에러 반환
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json(
        {
          success: false,
          error: '예측 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          fallback: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: '예측 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// ============================================================
// 백엔드 응답 변환
// ============================================================
function transformBackendResponse(
  data: BackendResponse,
  type: string
): Record<string, unknown> {
  if (type === 'timing' && data.recommendations) {
    // timing 응답을 프론트엔드 형식으로 변환
    const optimalPeriods = data.recommendations.map((rec, index) => ({
      startDate: rec.start_date,
      endDate: rec.end_date,
      score: rec.score,
      grade: scoreToGrade(rec.score),
      reasons: formatReasons(rec.reasons, rec.advice),
      specificDays: [], // 백엔드에서 제공되지 않으면 빈 배열
      rank: index + 1,
    }));

    return {
      eventType: data.event_type || 'general',
      optimalPeriods,
      generalAdvice: data.general_advice || '',
      naturalAnswer: data.natural_answer || '',
      avoidDates: data.avoid_dates || [],
      searchPeriod: data.search_period,
    };
  }

  if (type === 'forecast' && data.predictions) {
    return {
      predictions: data.predictions,
      aiInterpretation: data.ai_interpretation || '',
    };
  }

  // 기본 반환
  return data as unknown as Record<string, unknown>;
}

// ============================================================
// 헬퍼 함수
// ============================================================
function scoreToGrade(score: number): PredictionGrade {
  return standardScoreToGrade(score);
}

function formatReasons(
  reasons: { astro: string[]; saju: string[] },
  advice: string
): string[] {
  const result: string[] = [];

  // 점성술 이유
  if (reasons.astro && reasons.astro.length > 0) {
    reasons.astro.forEach(r => {
      result.push(`🌟 ${r}`);
    });
  }

  // 사주 이유
  if (reasons.saju && reasons.saju.length > 0) {
    reasons.saju.forEach(r => {
      result.push(`🔮 ${r}`);
    });
  }

  // 조언 추가
  if (advice && !result.some(r => r.includes(advice))) {
    result.push(`💡 ${advice}`);
  }

  return result.length > 0 ? result : ['✨ 좋은 시기입니다'];
}
