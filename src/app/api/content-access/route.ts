import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// POST: 프리미엄 콘텐츠 열람 기록 저장
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      service,      // astrology, saju, tarot, dream, destiny-map
      contentType,  // details, advanced, full_report
      contentId,    // 특정 콘텐츠 ID (선택)
      locale = "ko",
      metadata,     // 추가 정보
      creditUsed = 0,
    } = body;

    // 필수 필드 검증
    if (!service || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: service, contentType" },
        { status: 400 }
      );
    }

    // 유효한 서비스 검증
    const validServices = ["astrology", "saju", "tarot", "dream", "destiny-map", "numerology", "iching", "compatibility"];
    if (!validServices.includes(service)) {
      return NextResponse.json(
        { error: `Invalid service. Must be one of: ${validServices.join(", ")}` },
        { status: 400 }
      );
    }

    // 열람 기록 저장
    const accessLog = await (prisma as any).premiumContentAccess.create({
      data: {
        userId: session.user.id,
        service,
        contentType,
        contentId: contentId || null,
        locale,
        metadata: metadata || null,
        creditUsed,
      },
    });

    return NextResponse.json({
      success: true,
      id: accessLog.id,
      createdAt: accessLog.createdAt,
    });
  } catch (err: any) {
    console.error("[ContentAccess POST error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET: 내 콘텐츠 열람 기록 조회
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // 쿼리 빌드
    const where: any = { userId: session.user.id };
    if (service) {
      where.service = service;
    }

    const [accessLogs, total] = await Promise.all([
      (prisma as any).premiumContentAccess.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          service: true,
          contentType: true,
          contentId: true,
          createdAt: true,
          locale: true,
          creditUsed: true,
        },
      }),
      (prisma as any).premiumContentAccess.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: accessLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + accessLogs.length < total,
      },
    });
  } catch (err: any) {
    console.error("[ContentAccess GET error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
