import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const theme = searchParams.get("theme");
    const helpful = searchParams.get("helpful");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: { service?: string; theme?: string; helpful?: boolean } = {};
    if (service) {where.service = service;}
    if (theme) {where.theme = theme;}
    if (helpful !== null) {where.helpful = helpful === "true";}

    const records = await prisma.sectionFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
      select: {
        id: true,
        service: true,
        theme: true,
        sectionId: true,
        helpful: true,
        dayMaster: true,
        sunSign: true,
        locale: true,
        userHash: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ records });
  } catch (error: unknown) {
    logger.error("[Feedback Records Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
