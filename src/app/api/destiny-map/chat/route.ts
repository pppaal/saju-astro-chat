import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { buildAllDataPrompt } from "@/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import Stripe from "stripe";
import { apiGuard } from "@/lib/apiGuard";
import { callBackendWithFallback } from "@/lib/backend-health";
import { guardText, cleanText as _cleanText, PROMPT_BUDGET_CHARS, safetyMessage, containsForbidden } from "@/lib/textGuards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type BackendReply = { fusion_layer?: string; report?: string };

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://127.0.0.1:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[destiny-map chat] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[destiny-map chat] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

function buildChatPrompt(lang: string, theme: string, snapshot: string, history: ChatMessage[]) {
  const historyText = history
    .map((m) => `${m.role.toUpperCase()}: ${guardText(m.content, 400)}`)
    .join("\n")
    .slice(0, 2000); // guard length

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  return [
    "You are DestinyPal's chat guide. Stay consistent with the provided astrology+saju snapshot. Do not ask for birth data unless missing. No medical/legal/financial advice.",
    `Locale: ${lang}`,
    `Theme: ${theme}`,
    "User snapshot (authoritative):",
    snapshot,
    "Recent conversation:",
    historyText || "(none yet)",
    "Respond briefly (<=140 words) in the target locale. Keep tone supportive and specific.",
    lastUser ? `Latest user message: ${guardText(lastUser.content, 400)}` : "",
    `Respond in ${lang}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// 이메일 형식 검증 (Stripe 쿼리 인젝션 방지)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

async function checkStripeActive(email?: string) {
  if (!process.env.REQUIRE_PAID_CHAT || process.env.REQUIRE_PAID_CHAT === "false") return true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !email || !isValidEmail(email)) return false;
  const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
  const customers = await stripe.customers.search({
    query: `email:'${email}'`,
    limit: 3,
  });
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 5,
    });
    const active = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
    if (active) return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "destiny-map-chat", limit: 45, windowSeconds: 60 });
    if (guard instanceof NextResponse) return guard;

    // Lazy-load heavy astro engine to avoid resolving swisseph during build/deploy
    const { computeDestinyMap } = await import("@/lib/destiny-map/astrologyengine");

    // DEV MODE: Skip auth check for local development
    const isDev = process.env.NODE_ENV === "development";

    let userEmail: string | undefined;
    if (!isDev) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
      }
      userEmail = session.user.email;

      const paid = await checkStripeActive(userEmail);
      if (!paid) {
        return NextResponse.json({ error: "payment_required" }, { status: 402 });
      }
    }

    const body = await request.json();
    const {
      name,
      birthDate,
      birthTime,
      gender = "male",
      latitude,
      longitude,
      theme = "life",
      lang = "ko",
      messages = [],
      cvText = "",
    } = body;

    if (!birthDate || !birthTime || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1) compute snapshot
    const result: CombinedResult = await computeDestinyMap({
      name,
      birthDate,
      birthTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      gender,
      theme,
    });

    const snapshot = buildAllDataPrompt(lang, theme, result).slice(0, 2500);
    const trimmedHistory = clampMessages(messages);

    // 2) build chat prompt
    const cvSnippet = guardText(cvText || "", 1200);
    const safetyFlag =
      containsForbidden(cvSnippet) ||
      [...trimmedHistory, { role: "user", content: cvSnippet }].some((m) => m.content.includes("[filtered]"));
    if (safetyFlag) {
      const msg = safetyMessage(lang);
      return NextResponse.json({ reply: msg, fallback: true, safety: true });
    }

    const chatPrompt = [
      buildChatPrompt(lang, theme, snapshot, trimmedHistory),
      cvSnippet ? `User CV (partial):\n${cvSnippet}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, PROMPT_BUDGET_CHARS);

    // 3) call backend fusion with health check
    const backendUrl = pickBackendUrl();

    const fallbackReply =
      lang === "ko"
        ? "AI 분석 서비스가 일시적으로 불가합니다. 잠시 후 다시 시도해 주세요."
        : "AI analysis service is temporarily unavailable. Please try again later.";
    const fallbackPayload: BackendReply = { fusion_layer: fallbackReply };

    const { success, data } = await callBackendWithFallback<BackendReply>(
      backendUrl,
      "/ask",
      {
        theme: theme || "chat",
        prompt: chatPrompt,
        saju: result.saju,
        astro: result.astrology,
        locale: lang,
      },
      fallbackPayload
    );

    const reply = data?.fusion_layer || data?.report || fallbackReply;

    return NextResponse.json({
      reply,
      fallback: !success, // Indicate if using fallback
    });
  } catch (err: any) {
    console.error("[DestinyMap chat API error]", err);
    return NextResponse.json({ error: err.message ?? "Internal Server Error" }, { status: 500 });
  }
}
