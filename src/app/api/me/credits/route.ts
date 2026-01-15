import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import {
  getCreditBalance,
  canUseCredits,
  canUseFeature,
  PLAN_CONFIG,
  type FeatureType,
} from "@/lib/credits/creditService";
import { enforceBodySize } from "@/lib/http";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

const ALLOWED_CREDIT_TYPES = new Set<("reading" | "compatibility" | "followUp")>([
  "reading",
  "compatibility",
  "followUp",
]);
const ALLOWED_FEATURES = new Set<FeatureType>(Object.keys(PLAN_CONFIG.free.features) as FeatureType[]);
const MAX_CREDIT_AMOUNT = 10;
type CreditType = "reading" | "compatibility" | "followUp";
const isCreditType = (value: string): value is CreditType =>
  ALLOWED_CREDIT_TYPES.has(value as CreditType);
const isFeatureType = (value: string): value is FeatureType =>
  ALLOWED_FEATURES.has(value as FeatureType);

// GET: 현재 크레딧 상태 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // 비로그인 유저는 free 플랜 정보 반환
      return NextResponse.json({
        isLoggedIn: false,
        plan: "free",
        ...PLAN_CONFIG.free,
        remainingCredits: 0,
        compatibility: { used: 0, limit: 0, remaining: 0 },
        followUp: { used: 0, limit: 0, remaining: 0 },
      });
    }

    const balance = await getCreditBalance(session.user.id);
    const planConfig = PLAN_CONFIG[balance.plan];

    return NextResponse.json({
      isLoggedIn: true,
      plan: balance.plan,
      features: planConfig.features,
      credits: {
        monthly: balance.monthlyCredits,
        used: balance.usedCredits,
        bonus: balance.bonusCredits,
        remaining: balance.remainingCredits,
        total: balance.totalCredits,
      },
      compatibility: balance.compatibility,
      followUp: balance.followUp,
      historyRetention: balance.historyRetention,
      periodEnd: balance.periodEnd,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[Credits GET error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST: 크레딧 사용 가능 여부 확인 (pre-check)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "not_authenticated", allowed: false },
        { status: 401 }
      );
    }

    const oversized = enforceBodySize(request, 4 * 1024);
    if (oversized) return oversized;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_body", allowed: false },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;
    const typeRaw = typeof bodyObj.type === "string" ? bodyObj.type : undefined;
    if (typeRaw && !isCreditType(typeRaw)) {
      return NextResponse.json(
        { error: "invalid_type", allowed: false },
        { status: 400 }
      );
    }

    const type: CreditType = typeRaw && isCreditType(typeRaw)
      ? typeRaw
      : "reading";
    const parsedAmount = typeof bodyObj.amount === "number" || typeof bodyObj.amount === "string"
      ? Number(bodyObj.amount)
      : 1;
    const amount = Number.isFinite(parsedAmount)
      ? Math.min(Math.max(Math.trunc(parsedAmount), 1), MAX_CREDIT_AMOUNT)
      : 1;
    const featureRaw = typeof bodyObj.feature === "string" ? bodyObj.feature : undefined;
    const feature = featureRaw && isFeatureType(featureRaw)
      ? featureRaw
      : undefined;
    if (featureRaw && !feature) {
      return NextResponse.json(
        { error: "invalid_feature", allowed: false },
        { status: 400 }
      );
    }

    // 기능 체크
    if (feature) {
      const canUse = await canUseFeature(session.user.id, feature as FeatureType);
      return NextResponse.json({
        feature,
        allowed: canUse,
        reason: canUse ? undefined : "feature_not_available",
      });
    }

    // 크레딧 체크
    const result = await canUseCredits(session.user.id, type, amount);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[Credits POST error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
