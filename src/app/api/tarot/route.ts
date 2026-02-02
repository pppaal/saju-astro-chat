// src/app/api/tarot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from "@/lib/api/middleware";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { Card, DrawnCard } from "@/lib/Tarot/tarot.types";
import { tarotDeck } from "@/lib/Tarot/tarot-data";
import { checkCreditsOnly, creditErrorResponse } from "@/lib/credits/withCredits";

import { parseRequestBody } from '@/lib/api/requestParser';
import { LIMITS } from '@/lib/validation/patterns';
import { HTTP_STATUS } from '@/lib/constants/http';
import { recordApiRequest } from '@/lib/metrics/index';
const MAX_ID_LEN = LIMITS.ID;
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

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const startTime = Date.now();
    try {
      const body = await parseRequestBody<TarotBody>(req, { context: 'Tarot' });
      if (!body || typeof body !== "object") {
        recordApiRequest("tarot", "generate", "validation_error");
        return NextResponse.json({ error: "invalid_body" }, { status: HTTP_STATUS.BAD_REQUEST });
      }

      const categoryIdRaw = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
      const spreadIdRaw = typeof body.spreadId === "string" ? body.spreadId.trim() : "";
      const categoryId = categoryIdRaw.slice(0, MAX_ID_LEN);
      const spreadId = spreadIdRaw.slice(0, MAX_ID_LEN);

      if (!categoryId || !spreadId) {
        recordApiRequest("tarot", "generate", "validation_error");
        return NextResponse.json(
          { error: "categoryId and spreadId are required" },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const creditResult = await checkCreditsOnly("reading", 1);
      if (!creditResult.allowed) {
        recordApiRequest("tarot", "generate", "error");
        return creditErrorResponse(creditResult);
      }

      const theme = tarotThemes.find((t) => t.id === categoryId);
      if (!theme) {
        recordApiRequest("tarot", "generate", "error");
        return NextResponse.json({ error: "Invalid category" }, { status: HTTP_STATUS.NOT_FOUND });
      }

      const spread = theme.spreads.find((s) => s.id === spreadId);
      if (!spread) {
        recordApiRequest("tarot", "generate", "error");
        return NextResponse.json({ error: "Invalid spread" }, { status: HTTP_STATUS.NOT_FOUND });
      }

      const drawnCards = drawCards(spread.cardCount);

      recordApiRequest("tarot", "generate", "success", Date.now() - startTime);
      return NextResponse.json({
        category: theme.category,
        spread,
        drawnCards,
      });
    } catch (error) {
      recordApiRequest("tarot", "generate", "error", Date.now() - startTime);
      throw error;
    }
  },
  createPublicStreamGuard({
    route: '/api/tarot',
    limit: 40,
    windowSeconds: 60,
  })
)
