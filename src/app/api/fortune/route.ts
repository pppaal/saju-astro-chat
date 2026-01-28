// app/api/fortune/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { prisma } from "@/lib/db/prisma"
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED })
  }

  try {
    const { date, kind = "daily", title, content } = await req.json()
    if (!date || !content) {
      return NextResponse.json({ error: "date and content are required" }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const d = new Date(date)
    const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

    const saved = await prisma.fortune.upsert({
      where: {
        userId_date_kind: {
          userId: session.user.id,
          date: normalized,
          kind,
        },
      },
      update: { title: title ?? null, content },
      create: {
        userId: session.user.id,
        date: normalized,
        kind,
        title: title ?? null,
        content,
      },
    })

    return NextResponse.json(saved)
  } catch (e) {
    logger.error("[Fortune API] Failed to save fortune:", e)
    return NextResponse.json({ error: "Failed to save fortune" }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED })
  }

  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    const kind = searchParams.get("kind") || "daily"
    if (!date) {return NextResponse.json({ error: "date is required" }, { status: HTTP_STATUS.BAD_REQUEST })}

    const d = new Date(date)
    const normalized = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

    const row = await prisma.fortune.findUnique({
      where: {
        userId_date_kind: {
          userId: session.user.id,
          date: normalized,
          kind,
        },
      },
    })
    return NextResponse.json({ fortune: row ?? null })
  } catch (e) {
    logger.error("[Fortune API] Failed to fetch fortune:", e)
    return NextResponse.json({ error: "Failed to fetch fortune" }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
