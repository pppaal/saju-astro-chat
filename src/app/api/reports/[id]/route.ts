// src/app/api/reports/[id]/route.ts
// 저장된 AI 프리미엄 리포트 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

// ===========================
// GET - 리포트 조회
// ===========================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id: reportId } = await params;

    // 2. 리포트 조회
    const report = await prisma.destinyMatrixReport.findFirst({
      where: {
        id: reportId,
        userId, // 본인 리포트만 조회 가능
      },
      select: {
        id: true,
        reportType: true,
        period: true,
        theme: true,
        reportData: true,
        title: true,
        summary: true,
        overallScore: true,
        grade: true,
        pdfGenerated: true,
        pdfUrl: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '리포트를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 3. 응답 형식 변환
    const reportData = report.reportData as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        type: report.reportType,
        period: report.period,
        theme: report.theme,
        title: report.title,
        summary: report.summary || reportData?.summary,
        score: report.overallScore,
        grade: report.grade,
        createdAt: report.createdAt.toISOString(),
        sections: reportData?.sections || [],
        keywords: reportData?.keywords || [],
        insights: reportData?.insights || [],
        actionItems: reportData?.actionItems || [],
        // 전체 데이터도 포함 (상세 표시용)
        fullData: reportData,
      },
    });

  } catch (error) {
    logger.error('Report Fetch Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '리포트 조회 중 오류가 발생했습니다.'
        }
      },
      { status: 500 }
    );
  }
}

// ===========================
// DELETE - 리포트 삭제
// ===========================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id: reportId } = await params;

    // 2. 본인 리포트인지 확인 후 삭제
    const deleted = await prisma.destinyMatrixReport.deleteMany({
      where: {
        id: reportId,
        userId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '리포트를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '리포트가 삭제되었습니다.',
    });

  } catch (error) {
    logger.error('Report Delete Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '리포트 삭제 중 오류가 발생했습니다.'
        }
      },
      { status: 500 }
    );
  }
}
