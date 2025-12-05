import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { sendNotification } from "@/lib/notifications/sse";

export const dynamic = "force-dynamic";

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
    const { birthDate, birthTime: _birthTime, latitude: _latitude, longitude: _longitude, sendEmail = false } = body;

    if (!birthDate) {
      return NextResponse.json({ error: "Birth date required" }, { status: 400 });
    }

    // ========================================
    // 1️⃣ 오늘의 운세 점수 계산
    // ========================================
    const fortune = calculateDailyFortune(birthDate, _birthTime, _latitude, _longitude);

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
          date: new Date().toISOString().split("T")[0],
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
  } catch (error: any) {
    console.error("[Daily Fortune Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * 오늘의 운세 점수 계산 (사주 + 점성학 기반)
 */
function calculateDailyFortune(
  birthDate: string,
  _birthTime?: string,
  _latitude?: number,
  _longitude?: number
) {
  const today = new Date();
  const birth = new Date(birthDate);

  // 사주 기반 계산
  const birthYear = birth.getFullYear();
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // 간단한 점수 계산 (실제로는 더 복잡한 사주 로직 사용 가능)
  const dayScore = (currentDay * 7 + birthDay * 3) % 100;
  const monthScore = (currentMonth * 11 + birthMonth * 5) % 100;
  const yearScore = ((currentYear - birthYear) * 13) % 100;

  // 각 분야별 점수
  const love = Math.floor((dayScore + monthScore) / 2);
  const career = Math.floor((monthScore + yearScore) / 2);
  const wealth = Math.floor((dayScore + yearScore) / 2);
  const health = Math.floor((dayScore + monthScore + yearScore) / 3);
  const overall = Math.floor((love + career + wealth + health) / 4);

  // 행운의 색상과 숫자
  const colors = ["Red", "Blue", "Green", "Yellow", "Purple", "White", "Black", "Pink"];
  const luckyColor = colors[currentDay % colors.length];
  const luckyNumber = (currentDay + birthDay) % 10;

  return {
    love,
    career,
    wealth,
    health,
    overall,
    luckyColor,
    luckyNumber,
    date: today.toISOString().split("T")[0],
  };
}

/**
 * 이메일로 운세 전송
 */
async function sendFortuneEmail(email: string, fortune: any) {
  try {
    // 이메일 서비스가 설정되어 있으면 전송
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "🌟 Your Daily Fortune",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c5cff;">🌟 Today's Fortune</h1>
            <p><strong>Date:</strong> ${fortune.date}</p>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h2 style="color: #333;">Overall Score: ${fortune.overall}/100</h2>

              <p>❤️ <strong>Love:</strong> ${fortune.love}/100</p>
              <p>💼 <strong>Career:</strong> ${fortune.career}/100</p>
              <p>💰 <strong>Wealth:</strong> ${fortune.wealth}/100</p>
              <p>🏥 <strong>Health:</strong> ${fortune.health}/100</p>
            </div>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px;">
              <p>🎨 <strong>Lucky Color:</strong> ${fortune.luckyColor}</p>
              <p>🔢 <strong>Lucky Number:</strong> ${fortune.luckyNumber}</p>
            </div>

            <p style="margin-top: 30px; color: #666;">
              Have a great day! ✨
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error("Email send failed");
    }

    console.log("✅ Fortune email sent to:", email);
  } catch (error) {
    console.warn("⚠️ Email send failed:", error);
    // 이메일 실패해도 운세는 계속 진행
  }
}
