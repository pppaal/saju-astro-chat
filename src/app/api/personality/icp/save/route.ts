import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma, Prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { ICPQuizAnswers } from '@/lib/icp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SaveICPRequest {
  primaryStyle: string;
  secondaryStyle: string | null;
  dominanceScore: number;
  affiliationScore: number;
  octantScores: Record<string, number>;
  analysisData: {
    description: string;
    descriptionKo?: string;
    strengths: string[];
    strengthsKo?: string[];
    challenges: string[];
    challengesKo?: string[];
    [key: string]: any;
  };
  answers?: ICPQuizAnswers;
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

    const body: SaveICPRequest = await req.json();
    const {
      primaryStyle,
      secondaryStyle,
      dominanceScore,
      affiliationScore,
      octantScores,
      analysisData,
      answers,
      locale = 'en',
    } = body;

    // Validate required fields
    if (!primaryStyle || dominanceScore === undefined || affiliationScore === undefined || !octantScores) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save ICP result to database
    const icpResult = await prisma.iCPResult.create({
      data: {
        userId: session.user.id,
        primaryStyle,
        secondaryStyle,
        dominanceScore,
        affiliationScore,
        octantScores,
        analysisData,
        answers: answers ? answers as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
        locale,
      },
    });

    logger.info('ICP result saved', { userId: session.user.id, id: icpResult.id });

    return NextResponse.json({
      success: true,
      id: icpResult.id,
      createdAt: icpResult.createdAt,
    });
  } catch (error) {
    logger.error('Error saving ICP result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve ICP result by ID
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

    const icpResult = await prisma.iCPResult.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!icpResult) {
      return NextResponse.json(
        { error: 'ICP result not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      result: icpResult,
    });
  } catch (error) {
    logger.error('Error retrieving ICP result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
