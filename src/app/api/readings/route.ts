import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`readings:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers });
    }

    const body = await req.json();
    const { type, title, content } = body;

    if (!type || !content) {
      return NextResponse.json({ error: "type and content are required" }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const reading = await prisma.reading.create({
      data: {
        userId: session.user.id,
        type,
        title: title || null,
        content,
      },
    });

    return NextResponse.json({ success: true, id: reading.id }, { headers: limit.headers });
  } catch (error) {
    logger.error("Failed to save reading:", error);
    return NextResponse.json({ error: "Failed to save reading" }, { status: HTTP_STATUS.SERVER_ERROR });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`readings:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);

    const readings = await prisma.reading.findMany({
      where: {
        userId: session.user.id,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limitParam, 50),
    });

    return NextResponse.json({ readings }, { headers: limit.headers });
  } catch (error) {
    logger.error("Failed to fetch readings:", error);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: HTTP_STATUS.SERVER_ERROR });
  }
}
