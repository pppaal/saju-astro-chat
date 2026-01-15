// src/app/api/life-prediction/save/route.ts
// Life Prediction 결과 저장 API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { saveConsultation } from '@/lib/consultation/saveConsultation';
import { logger } from '@/lib/logger';

interface SaveLifePredictionRequest {
  multiYearTrend: {
    startYear: number;
    endYear: number;
    overallTrend: string;
    peakYears: number[];
    lowYears: number[];
    summary: string;
    yearlyScores?: Array<{
      year: number;
      score: number;
      grade: string;
      themes?: string[];
    }>;
    daeunTransitions?: Array<{
      year: number;
      description: string;
    }>;
  };
  saju?: Record<string, unknown>;
  astro?: Record<string, unknown>;
  locale?: 'ko' | 'en';
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as SaveLifePredictionRequest;
    const { multiYearTrend, saju, astro, locale = 'ko' } = body;

    if (!multiYearTrend) {
      return NextResponse.json(
        { success: false, error: 'multiYearTrend is required' },
        { status: 400 }
      );
    }

    // 요약 및 전체 리포트 생성
    const summary = multiYearTrend.summary || generateSummary(multiYearTrend, locale);
    const fullReport = generateFullReport(multiYearTrend, locale);

    // 상담 기록 저장
    const result = await saveConsultation({
      userId: session.user.id,
      theme: 'life-prediction',
      summary,
      fullReport,
      signals: {
        saju: saju || null,
        astro: astro || null,
        multiYearTrend: {
          startYear: multiYearTrend.startYear,
          endYear: multiYearTrend.endYear,
          overallTrend: multiYearTrend.overallTrend,
          peakYears: multiYearTrend.peakYears,
          lowYears: multiYearTrend.lowYears,
        },
      },
      locale,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        consultationId: result.consultationId,
        message: locale === 'ko' ? '예측 결과가 저장되었습니다' : 'Prediction saved successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to save prediction' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('[life-prediction/save API error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

function generateSummary(trend: SaveLifePredictionRequest['multiYearTrend'], locale: 'ko' | 'en'): string {
  const trendLabel = {
    ascending: locale === 'ko' ? '상승세' : 'ascending',
    descending: locale === 'ko' ? '하락세' : 'descending',
    stable: locale === 'ko' ? '안정세' : 'stable',
    volatile: locale === 'ko' ? '변동적' : 'volatile',
  }[trend.overallTrend] || trend.overallTrend;

  if (locale === 'ko') {
    return `${trend.startYear}~${trend.endYear}년 인생 예측: ${trendLabel}. 최고의 해: ${trend.peakYears.join(', ')}년`;
  } else {
    return `${trend.startYear}-${trend.endYear} Life Prediction: ${trendLabel}. Peak years: ${trend.peakYears.join(', ')}`;
  }
}

function generateFullReport(trend: SaveLifePredictionRequest['multiYearTrend'], locale: 'ko' | 'en'): string {
  const lines: string[] = [];

  if (locale === 'ko') {
    lines.push(`📈 ${trend.startYear}~${trend.endYear}년 인생 예측 분석`);
    lines.push('');
    lines.push(`전체 흐름: ${trend.overallTrend}`);
    lines.push(`최고의 해: ${trend.peakYears.join(', ')}년`);
    if (trend.lowYears.length > 0) {
      lines.push(`주의가 필요한 해: ${trend.lowYears.join(', ')}년`);
    }
    lines.push('');
    lines.push(trend.summary);
  } else {
    lines.push(`📈 ${trend.startYear}-${trend.endYear} Life Prediction Analysis`);
    lines.push('');
    lines.push(`Overall Trend: ${trend.overallTrend}`);
    lines.push(`Peak Years: ${trend.peakYears.join(', ')}`);
    if (trend.lowYears.length > 0) {
      lines.push(`Years to Watch: ${trend.lowYears.join(', ')}`);
    }
    lines.push('');
    lines.push(trend.summary);
  }

  // 연도별 점수 추가
  if (trend.yearlyScores && trend.yearlyScores.length > 0) {
    lines.push('');
    lines.push(locale === 'ko' ? '--- 연도별 상세 ---' : '--- Yearly Details ---');
    trend.yearlyScores.forEach(y => {
      lines.push(`${y.year}: ${y.grade} (${y.score}점)${y.themes?.length ? ` - ${y.themes.join(', ')}` : ''}`);
    });
  }

  return lines.join('\n');
}
