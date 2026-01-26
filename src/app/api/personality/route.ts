import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { enforceBodySize } from "@/lib/http";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// GET: fetch personality result
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const result = await prisma.personalityResult.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        typeCode: true,
        personaName: true,
        avatarGender: true,
        energyScore: true,
        cognitionScore: true,
        decisionScore: true,
        rhythmScore: true,
        consistencyScore: true,
        analysisData: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!result) {
      return NextResponse.json({ saved: false });
    }

    return NextResponse.json({ saved: true, result });
  } catch (error) {
    logger.error("GET /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: store personality result
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const oversized = enforceBodySize(request, 16 * 1024);
    if (oversized) {return oversized;}

    const body = await request.json().catch(() => null);

    // Validate required fields
    const typeCode = typeof body?.typeCode === "string" ? body.typeCode.trim().slice(0, 4).toUpperCase() : "";
    const personaName = typeof body?.personaName === "string" ? body.personaName.trim().slice(0, 100) : "";
    const avatarGender = typeof body?.avatarGender === "string" ? body.avatarGender.trim() : "M";

    const energyScore = typeof body?.energyScore === "number" ? Math.max(0, Math.min(100, body.energyScore)) : 0;
    const cognitionScore = typeof body?.cognitionScore === "number" ? Math.max(0, Math.min(100, body.cognitionScore)) : 0;
    const decisionScore = typeof body?.decisionScore === "number" ? Math.max(0, Math.min(100, body.decisionScore)) : 0;
    const rhythmScore = typeof body?.rhythmScore === "number" ? Math.max(0, Math.min(100, body.rhythmScore)) : 0;
    const consistencyScore = typeof body?.consistencyScore === "number" ? Math.max(0, Math.min(100, body.consistencyScore)) : null;

    if (!typeCode || !personaName) {
      return NextResponse.json({ error: "missing_fields", message: "typeCode and personaName are required" }, { status: 400 });
    }

    // Validate typeCode format: must be 4 characters [R|G][V|S][L|H][A|F]
    const VALID_TYPE_CODE_PATTERN = /^[RG][VS][LH][AF]$/;
    if (!VALID_TYPE_CODE_PATTERN.test(typeCode)) {
      return NextResponse.json({
        error: "invalid_type_code",
        message: `Invalid typeCode format: "${typeCode}". Expected pattern: [R|G][V|S][L|H][A|F] (e.g., RVLA, GSHF)`,
      }, { status: 400 });
    }

    // Validate avatarGender
    if (!["M", "F"].includes(avatarGender)) {
      return NextResponse.json({
        error: "invalid_avatar_gender",
        message: `Invalid avatarGender: "${avatarGender}". Expected "M" or "F"`,
      }, { status: 400 });
    }

    // Validate analysisData
    if (!body?.analysisData || typeof body.analysisData !== "object") {
      return NextResponse.json({ error: "invalid_analysis_data" }, { status: 400 });
    }

    // Upsert personality result
    const result = await prisma.personalityResult.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        typeCode,
        personaName,
        avatarGender,
        energyScore: Math.round(energyScore),
        cognitionScore: Math.round(cognitionScore),
        decisionScore: Math.round(decisionScore),
        rhythmScore: Math.round(rhythmScore),
        consistencyScore: consistencyScore !== null ? Math.round(consistencyScore) : null,
        analysisData: body.analysisData,
        answers: body.answers || null,
      },
      update: {
        typeCode,
        personaName,
        avatarGender,
        energyScore: Math.round(energyScore),
        cognitionScore: Math.round(cognitionScore),
        decisionScore: Math.round(decisionScore),
        rhythmScore: Math.round(rhythmScore),
        consistencyScore: consistencyScore !== null ? Math.round(consistencyScore) : null,
        analysisData: body.analysisData,
        answers: body.answers || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        typeCode: result.typeCode,
        personaName: result.personaName,
      },
    });
  } catch (error) {
    logger.error("POST /api/personality error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
