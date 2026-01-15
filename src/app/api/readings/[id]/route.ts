import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { logger } from '@/lib/logger';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`readings:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
    }

    const { id } = await params;

    const reading = await prisma.reading.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!reading) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }

    return NextResponse.json({ reading }, { headers: limit.headers });
  } catch (error) {
    logger.error("Failed to fetch reading:", error);
    return NextResponse.json({ error: "Failed to fetch reading" }, { status: 500 });
  }
}
