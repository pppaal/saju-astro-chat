// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createSimpleGuard } from "@/lib/api/middleware";
import { apiClient } from "@/lib/api/ApiClient";

const MAX_ID_LEN = 64;
type TarotPrefetchBody = {
  categoryId?: string;
  spreadId?: string;
};

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: public token auth + rate limiting (no credits for prefetch)
    const guardOptions = createSimpleGuard({
      route: "tarot-prefetch",
      limit: 30,
      windowSeconds: 60,
      requireCredits: false, // Tarot prefetch doesn't consume credits
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    const body = (await req.json().catch(() => null)) as TarotPrefetchBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const categoryIdRaw = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const spreadIdRaw = typeof body.spreadId === "string" ? body.spreadId.trim() : "";
    const categoryId = categoryIdRaw.slice(0, MAX_ID_LEN);
    const spreadId = spreadIdRaw.slice(0, MAX_ID_LEN);
    if (!categoryId || !spreadId) {
      return NextResponse.json({ error: "categoryId and spreadId are required" }, { status: 400 });
    }

    // Fire-and-forget prefetch to backend
    apiClient.post('/api/tarot/prefetch', {
      categoryId,
      spreadId
    }, { timeout: 10000 }).catch(() => {}); // Ignore errors silently

    return NextResponse.json({ status: "prefetching" });
  } catch {
    return NextResponse.json({ status: "ok" });
  }
}
