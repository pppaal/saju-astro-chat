// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextResponse } from "next/server";

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[tarot prefetch] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[tarot prefetch] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, spreadId } = body;

    // Fire-and-forget prefetch to backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(`${pickBackendUrl()}/api/tarot/prefetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({ categoryId, spreadId }),
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => {}).finally(() => clearTimeout(timeoutId)); // Ignore errors silently

    return NextResponse.json({ status: "prefetching" });
  } catch {
    return NextResponse.json({ status: "ok" });
  }
}
