// src/app/api/icp/route.ts
/**
 * ICP (Interpersonal Circumplex) Analysis API
 * 대인관계 원형 모델 분석 API - 설문 기반 ICP 스타일 분석
 *
 * 8개 옥탄트:
 * - PA: Dominant-Assured (지배적-확신형)
 * - BC: Competitive-Arrogant (경쟁적-거만형)
 * - DE: Cold-Distant (냉담-거리형)
 * - FG: Submissive-Introverted (복종적-내향형)
 * - HI: Submissive-Unassured (복종적-불확신형)
 * - JK: Cooperative-Agreeable (협력적-동조형)
 * - LM: Warm-Friendly (따뜻-친화형)
 * - NO: Nurturant-Extroverted (양육적-외향형)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma, Prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { parseJsonBody, validateFields } from '@/lib/api/validation';
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler';

export const dynamic = "force-dynamic";

// GET: 저장된 ICP 결과 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const latestResult = await prisma.iCPResult.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        primaryStyle: true,
        secondaryStyle: true,
        dominanceScore: true,
        affiliationScore: true,
        octantScores: true,
        analysisData: true,
        locale: true,
        createdAt: true,
      },
    });

    if (!latestResult) {
      return NextResponse.json({ saved: false });
    }

    return NextResponse.json({ saved: true, result: latestResult });
  } catch (error) {
    logger.error("GET /api/icp error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: ICP 결과 저장 (로그인 필요)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Authentication required",
      });
    }

    // Parse and validate JSON body
    const { data, error } = await parseJsonBody(request);
    if (error) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: error,
      });
    }

    // Validate ICP data
    if (!data) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "ICP data is required",
      });
    }

    const validation = validateFields(data, {
      primaryStyle: {
        required: true,
        type: "string",
        enum: ["PA", "BC", "DE", "FG", "HI", "JK", "LM", "NO"],
      },
      secondaryStyle: {
        type: "string",
        enum: ["PA", "BC", "DE", "FG", "HI", "JK", "LM", "NO"],
      },
      dominanceScore: {
        required: true,
        type: "number",
        min: -100,
        max: 100,
      },
      affiliationScore: {
        required: true,
        type: "number",
        min: -100,
        max: 100,
      },
      octantScores: {
        type: "object",
      },
      analysisData: {
        type: "object",
      },
      answers: {
        type: "object",
      },
      locale: {
        type: "string",
      },
    });

    if (!validation.valid) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Invalid ICP data",
        details: validation.errors,
      });
    }

    const icpData = data as {
      primaryStyle: string;
      secondaryStyle?: string;
      dominanceScore: number;
      affiliationScore: number;
      octantScores?: Record<string, number>;
      analysisData?: Record<string, unknown>;
      answers?: Record<string, unknown>;
      locale?: string;
    };

    // Save to database
    const result = await prisma.iCPResult.create({
      data: {
        userId: session.user.id,
        primaryStyle: icpData.primaryStyle,
        secondaryStyle: icpData.secondaryStyle,
        dominanceScore: icpData.dominanceScore,
        affiliationScore: icpData.affiliationScore,
        octantScores: (icpData.octantScores || {}) as Prisma.JsonObject,
        analysisData: (icpData.analysisData || {}) as Prisma.JsonObject,
        answers: (icpData.answers || {}) as Prisma.JsonObject,
        locale: icpData.locale || 'en',
      },
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      primaryStyle: result.primaryStyle,
      secondaryStyle: result.secondaryStyle,
      dominanceScore: result.dominanceScore,
      affiliationScore: result.affiliationScore,
      message: "ICP result saved successfully",
    });
  } catch (error) {
    logger.error("POST /api/icp error:", error);
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Failed to save ICP result",
      originalError: error as Error,
    });
  }
}
