import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
export const dynamic = "force-dynamic";

type ContentAccessBody = {
  service?: string;
  contentType?: string;
  contentId?: string;
  locale?: string;
  metadata?: unknown;
  creditUsed?: number;
};

type PremiumContentAccessRecord = {
  id: string;
  createdAt: Date;
  service: string;
  contentType: string;
  contentId: string | null;
  locale: string;
  creditUsed: number;
};

type PremiumContentAccessDelegate = {
  create: (args: {
    data: {
      userId: string;
      service: string;
      contentType: string;
      contentId: string | null;
      locale: string;
      metadata: unknown;
      creditUsed: number;
    };
  }) => Promise<PremiumContentAccessRecord>;
  findMany: (args: {
    where: { userId: string; service?: string };
    orderBy: { createdAt: "desc" | "asc" };
    take: number;
    skip: number;
    select: {
      id: boolean;
      service: boolean;
      contentType: boolean;
      contentId: boolean;
      createdAt: boolean;
      locale: boolean;
      creditUsed: boolean;
    };
  }) => Promise<PremiumContentAccessRecord[]>;
  count: (args: { where: { userId: string; service?: string } }) => Promise<number>;
};

const premiumContentAccess = (prisma as unknown as { premiumContentAccess: PremiumContentAccessDelegate }).premiumContentAccess;

// POST: 프리미엄 콘텐츠 열람 기록 저장
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ContentAccessBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const service = typeof body.service === "string" ? body.service : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const contentId = typeof body.contentId === "string" ? body.contentId : null;
    const locale = typeof body.locale === "string" ? body.locale : "ko";
    const metadata = body.metadata ?? null;
    const creditUsed = typeof body.creditUsed === "number" ? body.creditUsed : 0;

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
    const accessLog = await premiumContentAccess.create({
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
  } catch (err: unknown) {
    logger.error("[ContentAccess POST error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
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
    const where: { userId: string; service?: string } = { userId: session.user.id };
    if (service) {
      where.service = service;
    }

    const [accessLogs, total] = await Promise.all([
      premiumContentAccess.findMany({
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
      premiumContentAccess.count({ where }),
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
  } catch (err: unknown) {
    logger.error("[ContentAccess GET error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
