// src/app/api/tarot/route.ts
import { NextResponse } from "next/server";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { Card, DrawnCard } from "@/lib/Tarot/tarot.types";
import { tarotDeck } from "@/lib/Tarot/tarot-data"; // named export

function drawCards(count: number): DrawnCard[] {
  const shuffled = [...tarotDeck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((card: Card) => ({
    card,
    isReversed: Math.random() < 0.5,
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, spreadId } = body;

    if (!categoryId || !spreadId) {
      return NextResponse.json(
        { error: "categoryId and spreadId are required" },
        { status: 400 }
      );
    }

    const theme = tarotThemes.find((t) => t.id === categoryId);
    if (!theme) return NextResponse.json({ error: "Invalid category" }, { status: 404 });

    const spread = theme.spreads.find((s) => s.id === spreadId);
    if (!spread) return NextResponse.json({ error: "Invalid spread" }, { status: 404 });

    const drawnCards = drawCards(spread.cardCount);

    return NextResponse.json({
      category: theme.category,
      spread,
      drawnCards,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}