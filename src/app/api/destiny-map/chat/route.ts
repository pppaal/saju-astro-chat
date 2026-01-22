import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createAuthenticatedGuard } from "@/lib/api/middleware";
import { apiClient } from "@/lib/api/ApiClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { buildAllDataPrompt } from "@/lib/destiny-map/prompt/fortune/base";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import Stripe from "stripe";
import { guardText, cleanText as _cleanText, PROMPT_BUDGET_CHARS, safetyMessage, containsForbidden } from "@/lib/textGuards";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-10-29.clover";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type BackendReply = { fusion_layer?: string; report?: string };

const ALLOWED_LANG = new Set(["ko", "en"]);
const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);
const MAX_THEME = 40;
const MAX_MESSAGES = 10;
const ALLOWED_GENDER = new Set(["male", "female", "other", "prefer_not"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_NAME = 80;
const MAX_CV = 1200;

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

function buildChatPrompt(lang: string, theme: string, snapshot: string, history: ChatMessage[]) {
  const historyText = history
    .map((m) => `${m.role.toUpperCase()}: ${guardText(m.content, 400)}`)
    .join("\n")
    .slice(0, 2000); // guard length

  const lastUser = [...history].reverse().find((m) => m.role === "user");

  return [
    "You are DestinyPal's chat guide. Stay consistent with the provided astrology+saju snapshot. Do not ask for birth data unless missing.",
    "Forbidden: medical diagnosis/treatment, legal advice, financial/investment decisions, self-harm encouragement.",
    "Always ground claims in chart factors (planets/houses/aspects/elements/saju pillars) and name them explicitly.",
    "Response format:",
    "1) One-line key message (cite which chart insight you are using).",
    "2) Brief reasoning (2–3 lines) grounded in astro/saju factors.",
    "3) 2–3 actionable steps with concrete timing/examples.",
    "4) End with one follow-up question.",
    "Safety: add a short disclaimer + suggest professional help for medical/legal/finance/emergency.",
    "Length: ~140 words; concise, supportive, specific.",
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
  const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
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

export async function POST(request: NextRequest) {
  try {
    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: "destiny-map-chat",
      limit: 45,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "followUp", // 운명 지도 상담은 followUp 타입 사용
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(request, guardOptions);
    if (error) return error;

    // Lazy-load heavy astro engine to avoid resolving swisseph during build/deploy
    const { computeDestinyMap } = await import("@/lib/destiny-map/astrologyengine");

    // DEV MODE: Skip Stripe check for local development
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : undefined;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const birthTime = typeof body.birthTime === "string" ? body.birthTime.trim() : "";
    const gender = typeof body.gender === "string" && ALLOWED_GENDER.has(body.gender) ? body.gender : "male";
    const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
    const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
    const theme = typeof body.theme === "string" ? body.theme.trim().slice(0, MAX_THEME) : "life";
    const lang = typeof body.lang === "string" && ALLOWED_LANG.has(body.lang) ? body.lang : "ko";
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const cvText = typeof body.cvText === "string" ? body.cvText : "";

    if (!birthDate || !birthTime || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!DATE_RE.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
      return NextResponse.json({ error: "Invalid birthDate" }, { status: 400 });
    }
    if (!TIME_RE.test(birthTime)) {
      return NextResponse.json({ error: "Invalid birthTime" }, { status: 400 });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
    }

    // Normalize messages
    const normalizedMessages: ChatMessage[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      const record = m as Record<string, unknown>;
      const role = typeof record.role === "string" && ALLOWED_ROLE.has(record.role)
        ? (record.role as ChatMessage["role"])
        : null;
      const content = typeof record.content === "string" ? record.content.trim() : "";
      if (!role || !content) continue;
      normalizedMessages.push({ role, content: content.slice(0, 2000) });
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

    // v3.1: Full snapshot without truncation - backend will use this as authoritative prompt
    const snapshot = buildAllDataPrompt(lang, theme, result);
    const trimmedHistory = clampMessages(normalizedMessages);

    // 2) build chat prompt
    const cvSnippet = guardText(cvText || "", MAX_CV);
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

    // 3) call backend fusion
    const fallbackReply =
      lang === "ko"
        ? "AI 분석 서비스가 일시적으로 불가합니다. 잠시 후 다시 시도해 주세요."
        : "AI analysis service is temporarily unavailable. Please try again later.";

    const response = await apiClient.post("/ask", {
      theme: theme || "chat",
      prompt: chatPrompt,
      saju: result.saju,
      astro: result.astrology,
      locale: lang,
    }, { timeout: 60000 });

    const success = response.ok;
    const rawReply = response.ok && response.data
      ? response.data?.fusion_layer || response.data?.report || fallbackReply
      : fallbackReply;
    const reply = maskTextWithName(sanitizeLocaleText(rawReply, lang), name);

    const res = NextResponse.json({
      reply,
      fallback: !success, // Indicate if using fallback
      backendAvailable: success,
    });
    res.headers.set("X-Fallback", success ? "0" : "1");
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[DestinyMap chat API error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
