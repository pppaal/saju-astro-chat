import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET: 저장된 성격 유형 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const result = await prisma.personalityResult.findUnique({
      where: { userId: session.user.id },
    });

    if (!result) {
      return NextResponse.json({ saved: false });
    }

    return NextResponse.json({
      saved: true,
      data: {
        typeCode: result.typeCode,
        personaName: result.personaName,
        avatarGender: result.avatarGender,
        energyScore: result.energyScore,
        cognitionScore: result.cognitionScore,
        decisionScore: result.decisionScore,
        rhythmScore: result.rhythmScore,
        consistencyScore: result.consistencyScore,
        analysisData: result.analysisData,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: 성격 유형 저장 (로그인 필요)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      typeCode,
      personaName,
      avatarGender,
      energyScore,
      cognitionScore,
      decisionScore,
      rhythmScore,
      consistencyScore,
      analysisData,
    } = body;

    // 필수 필드 검증
    if (!typeCode || !personaName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // upsert: 있으면 업데이트, 없으면 생성
    const result = await prisma.personalityResult.upsert({
      where: { userId: session.user.id },
      update: {
        typeCode,
        personaName,
        avatarGender: avatarGender || "M",
        energyScore: energyScore ?? 50,
        cognitionScore: cognitionScore ?? 50,
        decisionScore: decisionScore ?? 50,
        rhythmScore: rhythmScore ?? 50,
        consistencyScore: consistencyScore ?? null,
        analysisData: analysisData ?? null,
      },
      create: {
        userId: session.user.id,
        typeCode,
        personaName,
        avatarGender: avatarGender || "M",
        energyScore: energyScore ?? 50,
        cognitionScore: cognitionScore ?? 50,
        decisionScore: decisionScore ?? 50,
        rhythmScore: rhythmScore ?? 50,
        consistencyScore: consistencyScore ?? null,
        analysisData: analysisData ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      typeCode: result.typeCode,
      personaName: result.personaName,
    });
  } catch (error) {
    console.error("POST /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
