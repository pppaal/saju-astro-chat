// src/app/api/tarot/route.ts
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { Card, DrawnCard } from "@/lib/Tarot/tarot.types";
import { tarotDeck } from "@/lib/Tarot/tarot-data";

function drawCards(count: number): DrawnCard[] {
  const shuffled = [...tarotDeck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((card: Card) => ({
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
    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await req.json();
    const { categoryId, spreadId } = body;

    if (!categoryId || !spreadId) {
      return NextResponse.json(
        { error: "categoryId and spreadId are required" },
        { status: 400, headers: limit.headers }
      );
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
  } catch (err: any) {
    captureServerError(err, { route: "/api/tarot" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
