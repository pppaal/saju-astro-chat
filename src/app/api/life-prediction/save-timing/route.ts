// src/app/api/life-prediction/save-timing/route.ts
// Life Prediction 타이밍 결과 저장 API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

interface TimingResult {
  startDate: string;
  endDate: string;
  score: number;
  grade: string;
  reasons: string[];
}

interface SaveTimingRequest {
  question: string;
  eventType: string;
  results: TimingResult[];
  birthDate: string;
  gender: 'M' | 'F';
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

    const body = await request.json() as SaveTimingRequest;
    const { question, eventType, results, birthDate, gender, locale = 'ko' } = body;

    if (!question || !results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'question and results are required' },
        { status: 400 }
      );
    }

    // 최고 결과
    const topResult = results[0];
    const startDate = new Date(topResult.startDate);
    const endDate = new Date(topResult.endDate);

    // 요약 생성
    const summary = locale === 'ko'
      ? `"${question}" - ${topResult.grade}등급 (${topResult.score}점)`
      : `"${question}" - Grade ${topResult.grade} (${topResult.score}pts)`;

    // 상세 리포트 생성
    const fullReport = generateFullReport(question, eventType, results, locale);

    // ConsultationHistory에 저장
    const signals = {
      question,
      eventType,
      birthDate,
      gender,
      topResult: {
        startDate: topResult.startDate,
        endDate: topResult.endDate,
        score: topResult.score,
        grade: topResult.grade,
        reasons: topResult.reasons,
      },
      totalResults: results.length,
      allResults: results.slice(0, 5).map(r => ({
        startDate: r.startDate,
        endDate: r.endDate,
        score: r.score,
        grade: r.grade,
        reasons: r.reasons,
      })),
    };

    const consultation = await prisma.consultationHistory.create({
      data: {
        userId: session.user.id,
        theme: 'life-prediction-timing',
        summary,
        fullReport,
        signals: signals as Prisma.InputJsonValue,
        locale,
      },
    });

    return NextResponse.json({
      success: true,
      consultationId: consultation.id,
      message: locale === 'ko' ? '예측 결과가 저장되었습니다' : 'Prediction saved successfully',
    });

  } catch (error) {
    console.error('[life-prediction/save-timing API error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

function generateFullReport(
  question: string,
  eventType: string,
  results: TimingResult[],
  locale: 'ko' | 'en'
): string {
  const lines: string[] = [];

  const eventTypeLabels: Record<string, { ko: string; en: string }> = {
    marriage: { ko: '결혼', en: 'Marriage' },
    career: { ko: '취업/이직', en: 'Career' },
    investment: { ko: '투자', en: 'Investment' },
    move: { ko: '이사', en: 'Moving' },
    study: { ko: '시험/학업', en: 'Study' },
    health: { ko: '건강', en: 'Health' },
    relationship: { ko: '연애', en: 'Relationship' },
    general: { ko: '일반', en: 'General' },
  };

  const eventLabel = eventTypeLabels[eventType]?.[locale] || eventType;

  if (locale === 'ko') {
    lines.push(`🔮 인생 예측 결과`);
    lines.push('');
    lines.push(`질문: "${question}"`);
    lines.push(`카테고리: ${eventLabel}`);
    lines.push('');
    lines.push(`📊 추천 시기 (총 ${results.length}개)`);
    lines.push('');

    results.slice(0, 5).forEach((r, i) => {
      const start = new Date(r.startDate).toLocaleDateString('ko-KR');
      const end = new Date(r.endDate).toLocaleDateString('ko-KR');
      lines.push(`${i + 1}. ${start} ~ ${end}`);
      lines.push(`   등급: ${r.grade} (${r.score}점)`);
      if (r.reasons.length > 0) {
        lines.push(`   분석: ${r.reasons.slice(0, 2).join(' / ')}`);
      }
      lines.push('');
    });
  } else {
    lines.push(`🔮 Life Prediction Result`);
    lines.push('');
    lines.push(`Question: "${question}"`);
    lines.push(`Category: ${eventLabel}`);
    lines.push('');
    lines.push(`📊 Recommended Periods (${results.length} total)`);
    lines.push('');

    results.slice(0, 5).forEach((r, i) => {
      const start = new Date(r.startDate).toLocaleDateString('en-US');
      const end = new Date(r.endDate).toLocaleDateString('en-US');
      lines.push(`${i + 1}. ${start} ~ ${end}`);
      lines.push(`   Grade: ${r.grade} (${r.score} pts)`);
      if (r.reasons.length > 0) {
        lines.push(`   Analysis: ${r.reasons.slice(0, 2).join(' / ')}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}
