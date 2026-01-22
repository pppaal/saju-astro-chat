import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { TimingAIPremiumReport, ThemedAIPremiumReport } from '@/lib/destiny-matrix/ai-report/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SaveDestinyMatrixRequest {
  reportType: 'timing' | 'themed';
  period?: 'daily' | 'monthly' | 'yearly' | 'comprehensive';
  theme?: 'love' | 'career' | 'wealth' | 'health' | 'family';
  reportData: TimingAIPremiumReport | ThemedAIPremiumReport;
  title: string;
  summary?: string;
  overallScore?: number;
  grade?: string;
  locale?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SaveDestinyMatrixRequest = await req.json();
    const {
      reportType,
      period,
      theme,
      reportData,
      title,
      summary,
      overallScore,
      grade,
      locale = 'ko',
    } = body;

    // Validate required fields
    if (!reportType || !reportData || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: reportType, reportData, title' },
        { status: 400 }
      );
    }

    // Validate reportType and corresponding fields
    if (reportType === 'timing' && !period) {
      return NextResponse.json(
        { error: 'Period is required for timing reports' },
        { status: 400 }
      );
    }

    if (reportType === 'themed' && !theme) {
      return NextResponse.json(
        { error: 'Theme is required for themed reports' },
        { status: 400 }
      );
    }

    // Save Destiny Matrix report to database
    const matrixReport = await prisma.destinyMatrixReport.create({
      data: {
        userId: session.user.id,
        reportType,
        period: period || null,
        theme: theme || null,
        reportData,
        title,
        summary: summary || null,
        overallScore: overallScore || null,
        grade: grade || null,
        pdfGenerated: false,
        locale,
      },
    });

    logger.info('Destiny Matrix report saved', {
      userId: session.user.id,
      id: matrixReport.id,
      reportType,
      period: period || null,
      theme: theme || null,
    });

    return NextResponse.json({
      success: true,
      id: matrixReport.id,
      createdAt: matrixReport.createdAt,
    });
  } catch (error) {
    logger.error('Error saving Destiny Matrix report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve Destiny Matrix report by ID
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    const matrixReport = await prisma.destinyMatrixReport.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!matrixReport) {
      return NextResponse.json(
        { error: 'Destiny Matrix report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      result: matrixReport,
    });
  } catch (error) {
    logger.error('Error retrieving Destiny Matrix report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
