import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { prisma } from "@/lib/db/prisma"

type ServiceRecord = {
  id: string
  date: string
  service: string
  theme?: string
  summary?: string
  type: string
}

type DailyHistory = {
  date: string
  records: ServiceRecord[]
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all service records from different tables
    const [readings, consultations, interactions, dailyFortunes] = await Promise.all([
      // Readings (tarot, astrology, dream, etc.)
      prisma.reading.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          type: true,
          title: true,
        },
      }),
      // Consultation history
      prisma.consultationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          theme: true,
          summary: true,
        },
      }),
      // User interactions (views, clicks, etc.)
      prisma.userInteraction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          createdAt: true,
          type: true,
          service: true,
          theme: true,
        },
      }),
      // Daily fortunes
      prisma.dailyFortune.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          createdAt: true,
          date: true,
          overallScore: true,
        },
      }),
    ])

    // Combine and normalize all records
    const allRecords: ServiceRecord[] = [
      ...readings.map((r) => ({
        id: r.id,
        date: r.createdAt.toISOString().split("T")[0],
        service: r.type,
        theme: undefined,
        summary: r.title || undefined,
        type: "reading",
      })),
      ...consultations.map((c) => ({
        id: c.id,
        date: c.createdAt.toISOString().split("T")[0],
        service: "destiny-map",
        theme: c.theme,
        summary: c.summary,
        type: "consultation",
      })),
      ...interactions
        .filter((i) => i.type === "complete" || i.type === "view")
        .map((i) => ({
          id: i.id,
          date: i.createdAt.toISOString().split("T")[0],
          service: i.service,
          theme: i.theme || undefined,
          summary: undefined,
          type: "interaction",
        })),
      ...dailyFortunes.map((f) => ({
        id: f.id,
        date: f.date,
        service: "daily-fortune",
        theme: undefined,
        summary: `Overall score: ${f.overallScore}`,
        type: "fortune",
      })),
    ]

    // Group by date
    const byDate = allRecords.reduce((acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = []
      }
      acc[record.date].push(record)
      return acc
    }, {} as Record<string, ServiceRecord[]>)

    // Convert to array and sort by date (newest first)
    const history: DailyHistory[] = Object.entries(byDate)
      .map(([date, records]) => ({
        date,
        records: records.sort((a, b) => a.service.localeCompare(b.service)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
