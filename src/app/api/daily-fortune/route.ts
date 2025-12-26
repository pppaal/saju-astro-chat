import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { sendNotification } from "@/lib/notifications/sse";
import { isValidDate, isValidTime } from "@/lib/validation";
import { getNowInTimezone, formatDateString } from "@/lib/datetime";
import { getDailyFortuneScore } from "@/lib/destiny-map/destinyCalendar";

export const dynamic = "force-dynamic";

// Fortune data type
interface FortuneData {
  love: number;
  career: number;
  wealth: number;
  health: number;
  overall: number;
  luckyColor: string;
  luckyNumber: number;
  date: string;
  userTimezone?: string;
  alerts?: { type: "warning" | "positive" | "info"; msg: string; icon?: string }[];
  source?: string;
}

/**
 * 오늘의 운세 점수 계산 (AI 없이 사주+점성학 기반)
 * POST /api/daily-fortune
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      birthDate: _birthDate,
      birthTime: _birthTime,
      sendEmail = false,
      userTimezone,
    } = body;

    const birthDate = typeof _birthDate === "string" ? _birthDate.trim() : "";
    const birthTime = typeof _birthTime === "string" && _birthTime.trim() ? _birthTime.trim() : undefined;

    if (!isValidDate(birthDate)) {
      return NextResponse.json({ error: "Birth date required" }, { status: 400 });
    }
    if (birthTime && !isValidTime(birthTime)) {
      return NextResponse.json({ error: "Invalid birth time" }, { status: 400 });
    }

    // ========================================
    // 1️⃣ 오늘의 운세 점수 계산 (destinyCalendar 로직 직접 사용)
    // ========================================
    const userNow = getNowInTimezone(userTimezone);
    const targetDate = new Date(userNow.year, userNow.month - 1, userNow.day);

    // destinyCalendar의 getDailyFortuneScore 사용 (빠른 계산)
    const fortuneResult = getDailyFortuneScore(birthDate, birthTime, targetDate);

    const fortune = {
      love: fortuneResult.love,
      career: fortuneResult.career,
      wealth: fortuneResult.wealth,
      health: fortuneResult.health,
      overall: fortuneResult.overall,
      luckyColor: fortuneResult.luckyColor,
      luckyNumber: fortuneResult.luckyNumber,
      date: formatDateString(userNow.year, userNow.month, userNow.day),
      userTimezone: userTimezone || 'Asia/Seoul',
      alerts: fortuneResult.alerts || [],
      source: 'destinyCalendar',
    };

    // ========================================
    // 2️⃣ 데이터베이스에 저장
    // ========================================
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      await prisma.dailyFortune.create({
        data: {
          userId: user.id,
          date: fortune.date, // 사용자 타임존 기준 날짜
          loveScore: fortune.love,
          careerScore: fortune.career,
          wealthScore: fortune.wealth,
          healthScore: fortune.health,
          overallScore: fortune.overall,
          luckyColor: fortune.luckyColor,
          luckyNumber: fortune.luckyNumber,
        },
      }).catch(() => {
        // 이미 오늘 운세가 있으면 무시
      });
    }

    // ========================================
    // 3️⃣ 알림 전송
    // ========================================
    sendNotification(session.user.email, {
      type: "system",
      title: "🌟 Today's Fortune Ready!",
      message: `Overall: ${fortune.overall}점 | Love: ${fortune.love} | Career: ${fortune.career} | Wealth: ${fortune.wealth}`,
      link: "/myjourney",
    });

    // ========================================
    // 4️⃣ 이메일 전송 (선택)
    // ========================================
    if (sendEmail) {
      await sendFortuneEmail(session.user.email, fortune);
    }

    return NextResponse.json({
      success: true,
      fortune,
      message: sendEmail ? "Fortune sent to your email!" : "Fortune calculated!",
    });
  } catch (error: unknown) {
    console.error("[Daily Fortune Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * 이메일로 운세 전송
 */
async function sendFortuneEmail(email: string, fortune: FortuneData) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "DestinyPal | Today's Fortune",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 8px;">
            <h1 style="color: #6c5ce7; margin-bottom: 4px;">Today's Fortune</h1>
            <p style="margin-top: 0; color: #444;">${fortune.date}</p>

            <div style="background: #f5f5f8; padding: 16px; border-radius: 12px; margin: 16px 0;">
              <h2 style="color: #1e293b; margin: 0 0 8px;">Overall: ${fortune.overall}/100</h2>
              <p style="margin: 4px 0;">Love: ${fortune.love}/100</p>
              <p style="margin: 4px 0;">Career: ${fortune.career}/100</p>
              <p style="margin: 4px 0;">Wealth: ${fortune.wealth}/100</p>
              <p style="margin: 4px 0;">Health: ${fortune.health}/100</p>
            </div>

            <div style="background: linear-gradient(135deg, #4f46e5, #8b5cf6); color: #fff; padding: 16px; border-radius: 12px;">
              <p style="margin: 0;">Lucky Color: <strong>${fortune.luckyColor}</strong></p>
              <p style="margin: 4px 0 0;">Lucky Number: <strong>${fortune.luckyNumber}</strong></p>
            </div>

            <p style="margin-top: 20px; color: #475569;">Have a great day with DestinyPal.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error("Email send failed");
    }

    console.log("[Daily Fortune] Email sent to:", email);
  } catch (error) {
    console.warn("[Daily Fortune] Email send failed:", error);
  }
}
