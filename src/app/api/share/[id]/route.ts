import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sharedResult = await prisma.sharedResult.findUnique({
      where: { id },
    });

    if (!sharedResult) {
      return NextResponse.json(
        { error: "Shared result not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (sharedResult.expiresAt && sharedResult.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Shared result has expired" },
        { status: 410 }
      );
    }

    // Increment view count
    await prisma.sharedResult.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      type: sharedResult.resultType,
      title: sharedResult.title,
      description: sharedResult.description,
      data: sharedResult.resultData,
      createdAt: sharedResult.createdAt,
    });
  } catch (error) {
    logger.error("Error fetching shared result:", { error });
    return NextResponse.json(
      { error: "Failed to fetch shared result" },
      { status: 500 }
    );
  }
}
