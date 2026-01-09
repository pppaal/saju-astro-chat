// src/app/api/tarot/route.ts
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { Card, DrawnCard } from "@/lib/Tarot/tarot.types";
import { tarotDeck } from "@/lib/Tarot/tarot-data";
import { checkCreditsOnly, creditErrorResponse } from "@/lib/credits/withCredits";

const MAX_ID_LEN = 64;
const BODY_LIMIT = 8 * 1024;
type TarotBody = {
  categoryId?: string;
  spreadId?: string;
};

function drawCards(count: number): DrawnCard[] {
  const deck = [...tarotDeck];
  // Fisher-Yates 셔플 - 완벽한 랜덤 분포
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count).map((card: Card) => ({
    card,
    isReversed: Math.random() < 0.5,
  }));
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot:${ip}`, { limit: 40, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(req); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(req, BODY_LIMIT, limit.headers);
    if (oversized) return oversized;

    const body = (await req.json().catch(() => null)) as TarotBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: limit.headers });
    }

    const categoryIdRaw = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const spreadIdRaw = typeof body.spreadId === "string" ? body.spreadId.trim() : "";
    const categoryId = categoryIdRaw.slice(0, MAX_ID_LEN);
    const spreadId = spreadIdRaw.slice(0, MAX_ID_LEN);

    if (!categoryId || !spreadId) {
      return NextResponse.json(
        { error: "categoryId and spreadId are required" },
        { status: 400, headers: limit.headers }
      );
    }

    const creditResult = await checkCreditsOnly("reading", 1);
    if (!creditResult.allowed) {
      const res = creditErrorResponse(creditResult);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    const theme = tarotThemes.find((t) => t.id === categoryId);
    if (!theme) return NextResponse.json({ error: "Invalid category" }, { status: 404, headers: limit.headers });

    const spread = theme.spreads.find((s) => s.id === spreadId);
    if (!spread) return NextResponse.json({ error: "Invalid spread" }, { status: 404, headers: limit.headers });

    const drawnCards = drawCards(spread.cardCount);

    const res = NextResponse.json({
      category: theme.category,
      spread,
      drawnCards,
    });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (err: unknown) {
    captureServerError(err, { route: "/api/tarot" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
