import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { computeDestinyMap } from "@/lib/destiny-map/astrologyengine";
import { buildAllDataPrompt } from "@/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import Stripe from "stripe";
import { apiGuard } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

function buildChatPrompt(lang: string, theme: string, snapshot: string, history: ChatMessage[]) {
  const historyText = history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
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
    lastUser ? `Latest user message: ${lastUser.content}` : "",
    `Respond in ${lang}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function checkStripeActive(email?: string) {
  if (!process.env.REQUIRE_PAID_CHAT || process.env.REQUIRE_PAID_CHAT === "false") return true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !email) return false;
  const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
  const customers = await stripe.customers.search({
    query: `email:'${email.replace(/'/g, "")}'`,
    limit: 3,
  });
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      status: "all",
      limit: 5,
    });
    const active = subs.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );
    if (active) return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "destiny-map-chat", limit: 45, windowSeconds: 60 });
    if (guard instanceof NextResponse) return guard;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const paid = await checkStripeActive(session.user.email);
    if (!paid) {
      return NextResponse.json({ error: "payment_required" }, { status: 402 });
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

    const snapshot = buildAllDataPrompt(lang, theme, result);
    const trimmedHistory = clampMessages(messages);

    // 2) build chat prompt
    const cvSnippet = (cvText || "").toString().slice(0, 1500);
    const chatPrompt = [
      buildChatPrompt(lang, theme, snapshot, trimmedHistory),
      cvSnippet ? `User CV (partial):\n${cvSnippet}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // 3) call backend fusion
    const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";
    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ADMIN_API_TOKEN
          ? { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        theme: theme || "chat",
        prompt: chatPrompt,
        saju: result.saju,
        astro: result.astrology,
        locale: lang,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Flask error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const reply =
      data?.data?.fusion_layer ||
      data?.data?.report ||
      (lang === "ko"
        ? "지금은 답변이 어렵습니다. 잠시 후 다시 시도해주세요."
        : "No response, please try again later.");

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[DestinyMap chat API error]", err);
    return NextResponse.json({ error: err.message ?? "Internal Server Error" }, { status: 500 });
  }
}
