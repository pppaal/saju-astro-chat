import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { sendNotification } from "@/lib/notifications/sse";

export const dynamic = "force-dynamic";

/**
 * 타임존 기반 현재 날짜 헬퍼
 */
function getNowInTimezone(tz?: string) {
  const now = new Date();
  const effectiveTz = tz || 'Asia/Seoul';
  try {
    const y = Number(new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz, year: 'numeric' }).format(now));
    const m = Number(new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz, month: '2-digit' }).format(now));
    const d = Number(new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz, day: '2-digit' }).format(now));
    return { year: y, month: m, day: d };
  } catch {
    const y = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now));
    const m = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: '2-digit' }).format(now));
    const d = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', day: '2-digit' }).format(now));
    return { year: y, month: m, day: d };
  }
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
    const { birthDate, birthTime: _birthTime, latitude: _latitude, longitude: _longitude, sendEmail = false, userTimezone } = body;

    if (!birthDate) {
      return NextResponse.json({ error: "Birth date required" }, { status: 400 });
    }

    // ========================================
    // 1️⃣ 오늘의 운세 점수 계산 (백엔드 Fortune Score Engine 사용)
    // ========================================
    const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || 'http://127.0.0.1:5000';
    let fortune;

    try {
      // Try to use the new comprehensive fortune score engine
      const scoreResponse = await fetch(`${backendUrl}/api/fortune/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime: _birthTime,
        }),
      });

      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json();
        if (scoreData.status === 'success' && scoreData.fortune) {
          const userNow = getNowInTimezone(userTimezone);
          fortune = {
            ...scoreData.fortune,
            date: `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`,
            userTimezone: userTimezone || 'Asia/Seoul',
            alerts: scoreData.alerts || [],
            source: 'backend-engine',
          };
        } else {
          throw new Error('Invalid response from fortune engine');
        }
      } else {
        throw new Error('Fortune engine unavailable');
      }
    } catch (backendErr) {
      console.warn('[Daily Fortune API] Backend fortune engine failed, using fallback:', backendErr);
      // Fallback to simple calculation
      fortune = calculateDailyFortune(birthDate, _birthTime, _latitude, _longitude, userTimezone);
    }

    // ========================================
    // 1.5️⃣ AI 백엔드 호출 (GPT로 운세 해석)
    // ========================================
    let aiInterpretation = '';
    let aiModelUsed = '';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiToken = process.env.ADMIN_API_TOKEN;
      if (apiToken) {
        headers['X-API-KEY'] = apiToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Build prompt for daily fortune
      const fortunePrompt = `오늘의 운세를 분석해주세요:
날짜: ${fortune.date}
생년월일: ${birthDate}

운세 점수:
- 연애운: ${fortune.love}/100
- 직업운: ${fortune.career}/100
- 재물운: ${fortune.wealth}/100
- 건강운: ${fortune.health}/100
- 종합운: ${fortune.overall}/100

행운의 색상: ${fortune.luckyColor}
행운의 숫자: ${fortune.luckyNumber}

각 분야별 상세 해석과 오늘의 조언을 제공해주세요.`;

      const aiResponse = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          theme: 'daily-fortune',
          prompt: fortunePrompt,
          saju: {
            birthDate,
            birthTime: _birthTime,
          },
          locale: body.locale || 'ko',
          fortune,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiInterpretation = aiData?.data?.fusion_layer || aiData?.data?.report || '';
        aiModelUsed = aiData?.data?.model || 'gpt-4o';
      }
    } catch (aiErr) {
      console.warn('[Daily Fortune API] AI backend call failed:', aiErr);
      aiInterpretation = '';
      aiModelUsed = 'error-fallback';
    }

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
      aiInterpretation,
      aiModelUsed,
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
  _longitude?: number,
  userTimezone?: string
) {
  // 사용자 타임존 기준 현재 날짜
  const userNow = getNowInTimezone(userTimezone);
  const birth = new Date(birthDate);

  // 사주 기반 계산
  const birthYear = birth.getFullYear();
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();

  const currentYear = userNow.year;
  const currentMonth = userNow.month;
  const currentDay = userNow.day;

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

  // 분석 기준일 (사용자 타임존)
  const analysisDate = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`;

  return {
    love,
    career,
    wealth,
    health,
    overall,
    luckyColor,
    luckyNumber,
    date: analysisDate,
    userTimezone: userTimezone || 'Asia/Seoul',
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
