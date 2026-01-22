import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { prisma } from "@/lib/db/prisma"
import { logger } from '@/lib/logger';

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

// Format destiny map summary based on theme
function formatDestinyMapSummary(theme?: string | null): string {
  if (!theme) return "Destiny Map 분석을 이용했습니다"

  const themeLabels: Record<string, string> = {
    "focus_overall": "종합 운세",
    "focus_love": "연애운",
    "focus_career": "직장/사업운",
    "focus_money": "재물운",
    "focus_health": "건강운",
    "dream": "꿈 해석",
  }

  const label = themeLabels[theme] || theme
  return `${label} 분석을 이용했습니다`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all service records from different tables
    const [readings, tarotReadings, consultations, interactions, dailyFortunes, calendarDates, icpResults, compatibilityResults, matrixReports] = await Promise.all([
      // Readings (astrology, dream, etc.)
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
      // Tarot readings (separate table with AI interpretation)
      prisma.tarotReading.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          question: true,
          theme: true,
          spreadTitle: true,
          overallMessage: true,
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
      // Saved calendar dates
      prisma.savedCalendarDate.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          date: true,
          grade: true,
          title: true,
          summary: true,
        },
      }),
      // ICP results
      prisma.iCPResult.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          primaryStyle: true,
          secondaryStyle: true,
        },
      }),
      // Compatibility results
      prisma.compatibilityResult.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          crossSystemScore: true,
          person1Name: true,
          person2Name: true,
        },
      }),
      // Destiny Matrix reports
      prisma.destinyMatrixReport.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          reportType: true,
          period: true,
          theme: true,
          title: true,
          summary: true,
          overallScore: true,
          grade: true,
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
      ...tarotReadings.map((t) => ({
        id: t.id,
        date: t.createdAt.toISOString().split("T")[0],
        service: "tarot",
        theme: t.theme || undefined,
        summary: t.question || t.spreadTitle || "타로 리딩",
        type: "tarot-reading",
      })),
      ...consultations.map((c) => ({
        id: c.id,
        date: c.createdAt.toISOString().split("T")[0],
        service: c.theme === "dream" ? "dream"
          : c.theme === "life-prediction-timing" ? "life-prediction-timing"
          : c.theme === "life-prediction" ? "life-prediction"
          : "destiny-map",
        theme: c.theme === "dream" ? undefined : c.theme,
        summary: c.theme === "dream" ? (c.summary || "꿈 해석")
          : c.theme?.startsWith("life-prediction") ? (c.summary || "인생 예측")
          : formatDestinyMapSummary(c.theme),
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
      ...calendarDates.map((c) => ({
        id: c.id,
        date: c.date,
        service: "destiny-calendar",
        theme: c.grade <= 2 ? "좋은 날" : c.grade === 4 ? "주의 날" : "보통 날",
        summary: c.title || c.summary || "저장된 날짜",
        type: "calendar",
      })),
      ...icpResults.map((i) => ({
        id: i.id,
        date: i.createdAt.toISOString().split("T")[0],
        service: "personality-icp",
        theme: i.primaryStyle,
        summary: `${i.primaryStyle}${i.secondaryStyle ? ` / ${i.secondaryStyle}` : ''} 스타일`,
        type: "icp-result",
      })),
      ...compatibilityResults.map((c) => ({
        id: c.id,
        date: c.createdAt.toISOString().split("T")[0],
        service: "personality-compatibility",
        theme: undefined,
        summary: `${c.person1Name || 'Person 1'} & ${c.person2Name || 'Person 2'} - 궁합 ${c.crossSystemScore}점`,
        type: "compatibility-result",
      })),
      ...matrixReports.map((m) => ({
        id: m.id,
        date: m.createdAt.toISOString().split("T")[0],
        service: "destiny-matrix",
        theme: m.reportType === "timing" ? m.period : m.theme,
        summary: m.summary || m.title || `${m.grade || ''} ${m.overallScore || ''}점`,
        type: "destiny-matrix-report",
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
    logger.error("Error fetching history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
