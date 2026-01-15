import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// GET - 특정 저장된 날짜 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const savedDate = await prisma.savedCalendarDate.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!savedDate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ savedDate });
  } catch (error) {
    logger.error("Failed to fetch saved calendar date:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// DELETE - 특정 저장된 날짜 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 본인의 데이터만 삭제 가능
    const existingDate = await prisma.savedCalendarDate.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingDate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedCalendarDate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete saved calendar date:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
