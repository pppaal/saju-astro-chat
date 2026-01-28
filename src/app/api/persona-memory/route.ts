import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

export const dynamic = "force-dynamic";

// GET: 페르소나 기억 조회 (로그인 필요)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const memory = await prisma.personaMemory.findUnique({
      where: { userId: session.user.id },
    });

    if (!memory) {
      // 기억이 없으면 빈 객체 반환 (새 사용자)
      return NextResponse.json({
        success: true,
        data: null,
        isNewUser: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: memory,
      isNewUser: false,
    });
  } catch (err: unknown) {
    logger.error("[PersonaMemory GET error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// POST: 페르소나 기억 생성/업데이트
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const body = await request.json();
    const {
      dominantThemes,
      keyInsights,
      emotionalTone,
      growthAreas,
      lastTopics,
      recurringIssues,
      birthChart,
      sajuProfile,
    } = body;

    const existing = await prisma.personaMemory.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      // 기존 기억 업데이트 (병합)
      const updated = await prisma.personaMemory.update({
        where: { userId: session.user.id },
        data: {
          dominantThemes: dominantThemes ?? existing.dominantThemes,
          keyInsights: keyInsights ?? existing.keyInsights,
          emotionalTone: emotionalTone ?? existing.emotionalTone,
          growthAreas: growthAreas ?? existing.growthAreas,
          lastTopics: lastTopics ?? existing.lastTopics,
          recurringIssues: recurringIssues ?? existing.recurringIssues,
          birthChart: birthChart ?? existing.birthChart,
          sajuProfile: sajuProfile ?? existing.sajuProfile,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        action: "updated",
      });
    } else {
      // 새 기억 생성
      const created = await prisma.personaMemory.create({
        data: {
          userId: session.user.id,
          dominantThemes,
          keyInsights,
          emotionalTone,
          growthAreas,
          lastTopics,
          recurringIssues,
          sessionCount: 0,
          birthChart,
          sajuProfile,
        },
      });

      return NextResponse.json({
        success: true,
        data: created,
        action: "created",
      });
    }
  } catch (err: unknown) {
    logger.error("[PersonaMemory POST error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

// PATCH: 페르소나 기억 부분 업데이트 (통찰 추가 등)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const body = await request.json();
    const { action, data } = body;

    const existing = await prisma.personaMemory.findUnique({
      where: { userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "not_found", message: "페르소나 기억이 없습니다. 먼저 생성해주세요." },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const updateData: Record<string, unknown> = {};

    switch (action) {
      case "add_insight":
        // 새 통찰 추가
        const currentInsights = (existing.keyInsights as string[]) || [];
        if (data.insight && !currentInsights.includes(data.insight)) {
          updateData.keyInsights = [...currentInsights, data.insight];
        }
        break;

      case "add_growth_area":
        // 성장 영역 추가
        const currentGrowth = (existing.growthAreas as string[]) || [];
        if (data.area && !currentGrowth.includes(data.area)) {
          updateData.growthAreas = [...currentGrowth, data.area];
        }
        break;

      case "add_recurring_issue":
        // 반복 이슈 추가
        const currentIssues = (existing.recurringIssues as string[]) || [];
        if (data.issue && !currentIssues.includes(data.issue)) {
          updateData.recurringIssues = [...currentIssues, data.issue];
        }
        break;

      case "update_emotional_tone":
        // 감정 톤 업데이트
        if (data.tone) {
          updateData.emotionalTone = data.tone;
        }
        break;

      case "increment_session":
        // 세션 카운트 증가
        updateData.sessionCount = existing.sessionCount + 1;
        break;

      case "update_birth_chart":
        // 출생 차트 캐싱
        if (data.birthChart) {
          updateData.birthChart = data.birthChart;
        }
        break;

      case "update_saju_profile":
        // 사주 프로필 캐싱
        if (data.sajuProfile) {
          updateData.sajuProfile = data.sajuProfile;
        }
        break;

      default:
        return NextResponse.json(
          { error: "invalid_action", message: "지원하지 않는 액션입니다." },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: "변경 사항이 없습니다.",
        data: existing,
      });
    }

    const updated = await prisma.personaMemory.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      action,
    });
  } catch (err: unknown) {
    logger.error("[PersonaMemory PATCH error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
