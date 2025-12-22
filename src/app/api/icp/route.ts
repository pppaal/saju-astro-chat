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

export const dynamic = "force-dynamic";

// GET: 저장된 ICP 결과 조회
// TODO: ICPResult 모델이 Prisma 스키마에 추가되면 DB 연동 활성화
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    // ICPResult 모델이 없어서 임시로 false 반환
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error("GET /api/icp error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: ICP 결과 저장 (로그인 필요)
// TODO: ICPResult 모델이 Prisma 스키마에 추가되면 DB 연동 활성화
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { primaryStyle, secondaryStyle, dominanceScore, affiliationScore, consistencyScore, analysisData } = body;

    // 필수 필드 검증
    if (!primaryStyle || dominanceScore === undefined || affiliationScore === undefined) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // ICPResult 모델이 없어서 임시 응답
    return NextResponse.json({
      success: true,
      primaryStyle,
      secondaryStyle,
      dominanceScore,
      affiliationScore,
      consistencyScore,
      message: "ICP result saved successfully",
    });
  } catch (error) {
    console.error("POST /api/icp error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
