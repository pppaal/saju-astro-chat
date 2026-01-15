import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// POST - 날짜 저장
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`calendar-save:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
    }

    const body = await req.json();
    const {
      date,
      year,
      grade,
      score,
      title,
      description,
      summary,
      categories,
      bestTimes,
      sajuFactors,
      astroFactors,
      recommendations,
      warnings,
      birthDate,
      birthTime,
      birthPlace,
      locale = "ko",
    } = body;

    if (!date || grade === undefined || score === undefined || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert - 이미 있으면 업데이트, 없으면 생성
    const savedDate = await prisma.savedCalendarDate.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date,
        },
      },
      update: {
        year: year || new Date(date).getFullYear(),
        grade,
        score,
        title,
        description,
        summary,
        categories: categories || [],
        bestTimes,
        sajuFactors,
        astroFactors,
        recommendations,
        warnings,
        birthDate,
        birthTime,
        birthPlace,
        locale,
      },
      create: {
        userId: session.user.id,
        date,
        year: year || new Date(date).getFullYear(),
        grade,
        score,
        title,
        description,
        summary,
        categories: categories || [],
        bestTimes,
        sajuFactors,
        astroFactors,
        recommendations,
        warnings,
        birthDate,
        birthTime,
        birthPlace,
        locale,
      },
    });

    return NextResponse.json({ success: true, id: savedDate.id }, { headers: limit.headers });
  } catch (error) {
    logger.error("Failed to save calendar date:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// DELETE - 저장된 날짜 삭제
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    await prisma.savedCalendarDate.delete({
      where: {
        userId_date: {
          userId: session.user.id,
          date,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete calendar date:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// GET - 저장된 날짜 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const year = searchParams.get("year");
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = { userId: session.user.id };

    if (date) {
      where.date = date;
    } else if (year) {
      where.year = parseInt(year, 10);
    }

    const savedDates = await prisma.savedCalendarDate.findMany({
      where,
      orderBy: { date: "asc" },
      take: Math.min(limitParam, 365),
    });

    return NextResponse.json({ savedDates });
  } catch (error) {
    logger.error("Failed to fetch saved calendar dates:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
