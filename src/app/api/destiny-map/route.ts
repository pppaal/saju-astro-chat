import { NextResponse } from "next/server";

const MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] as const;

async function callGeminiText(prompt: string, maxOutputTokens = 1024) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  async function tryOnce(model: string, attempt = 0) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.48, topP: 0.9, topK: 64, maxOutputTokens },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if ((res.status === 429 || res.status === 503) && attempt < 3) {
        await new Promise(r => setTimeout(r, Math.min(2000 * 2 ** attempt, 8000)));
        return tryOnce(model, attempt + 1);
      }
      throw new Error(`Gemini(${model}@v1) ${res.status}: ${txt}`);
    }

    const j = await res.json();
    const parts = (j?.candidates?.[0]?.content?.parts ?? []) as any[];
    const text = parts
      .map((p: any) => (typeof p?.text === "string" ? p.text : typeof p === "string" ? p : ""))
      .join("")
      .trim();

    return { text: text || "No response", model };
  }

  let last = "";
  for (const m of MODELS) {
    try { return await tryOnce(m); }
    catch (e: any) { last = String(e?.message || e); }
  }
  throw new Error(`All models failed. Last=${last}`);
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }
    const { text, model } = await callGeminiText(prompt, 1024);
    return NextResponse.json({ text, model });
  } catch (e: any) {
    console.error("[/api/destiny-map] error:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}