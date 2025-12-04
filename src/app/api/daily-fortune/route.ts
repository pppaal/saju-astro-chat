import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { calculateSajuData } from "@/lib/Saju";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { birthDate, birthTime, sendEmail = false } = body;
    if (!birthDate) {
      return NextResponse.json({ error: "Birth date required" }, { status: 400 });
    }

    const fortune = await calculateDailyFortune(birthDate, birthTime);

    return NextResponse.json({
      success: true,
      fortune,
      message: sendEmail ? "Fortune calculated (email optional not implemented)." : "Fortune calculated!",
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
 * Saju-based daily fortune: simple bias from dayMaster element + today date hashing
 */
async function calculateDailyFortune(birthDate: string, birthTime?: string) {
  const today = new Date();
  const birth = new Date(birthDate);

  const birthYear = birth.getFullYear();
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // base deterministic scores
  const dayScore = (currentDay * 7 + birthDay * 3) % 100;
  const monthScore = (currentMonth * 11 + birthMonth * 5) % 100;
  const yearScore = ((currentYear - birthYear) * 13) % 100;

  // dayMaster bias
  let dmElement: string | undefined;
  try {
    const saju = await calculateSajuData(
      birthDate.trim(),
      (birthTime || "12:00").padEnd(5, "0"),
      "male",
      "solar",
      "Asia/Seoul"
    );
    dmElement = saju?.dayMaster?.element?.toLowerCase();
  } catch {
    dmElement = undefined;
  }

  const dayIdx = today.getDay(); // 0=Sun
  const elementBias: Record<string, number[]> = {
    wood: [6, 4, 5, 6, 7, 5, 4],
    fire: [4, 5, 7, 6, 5, 6, 4],
    earth: [5, 6, 6, 5, 6, 6, 5],
    metal: [6, 7, 5, 4, 5, 7, 6],
    water: [7, 6, 4, 5, 6, 5, 7],
  };
  const bias = dmElement && elementBias[dmElement] ? elementBias[dmElement][dayIdx] : 0;

  const love = clampScore(Math.floor((dayScore + monthScore) / 2 + bias));
  const career = clampScore(Math.floor((monthScore + yearScore) / 2 + bias / 2));
  const wealth = clampScore(Math.floor((dayScore + yearScore) / 2 + bias / 2));
  const health = clampScore(Math.floor((dayScore + monthScore + yearScore) / 3));
  let overall = clampScore(Math.floor((love + career + wealth + health) / 4));

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
    dayMasterElement: dmElement,
  };
}

function clampScore(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(99, Math.max(0, n));
}
