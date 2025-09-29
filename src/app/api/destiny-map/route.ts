// src/app/api/destiny-map/route.ts
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { NextResponse } from "next/server";

const envPath = path.join(process.cwd(), ".env.local");
const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
console.log("[api] pre-dotenv .env.local exists:", fs.existsSync(envPath), "len:", raw.length);
console.log("[api] pre-dotenv first line:", raw.split(/\r?\n/)[0] || "(empty)");

dotenv.config({ path: ".env.local", override: true, debug: true });
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: ".env", override: false, debug: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

console.log("[api] cwd:", process.cwd());
console.log("[api] GEMINI len(final):", (process.env.GEMINI_API_KEY || "").length);
console.log("[api] boot. GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "set" : "missing");

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
    const raw = await res.text().catch(() => "");
    if (!res.ok) {
      if ((res.status === 429 || res.status === 503) && attempt < 3) {
        await new Promise((r) => setTimeout(r, Math.min(2000 * 2 ** attempt, 8000)));
        return tryOnce(model, attempt + 1);
      }
      throw new Error(`Gemini(${model}@v1) ${res.status}: ${raw.slice(0, 500)}`);
    }
    let text = "No response";
    try {
      const j = raw ? JSON.parse(raw) : {};
      const parts = (j?.candidates?.[0]?.content?.parts ?? []) as any[];
      text = parts.map((p: any) => (typeof p?.text === "string" ? p.text : typeof p === "string" ? p : "")).join("").trim() || "No response";
    } catch {
      text = raw || "No response";
    }
    return { text, model };
  }

  let last = "";
  for (const m of MODELS) {
    try {
      const r = await tryOnce(m);
      if (r.text && r.text !== "No response") return r;
    } catch (e: any) {
      last = String(e?.message || e);
    }
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
    console.error("[/api/destiny-map] error:", e?.message || e);
    const msg = String(e?.message || e);
    const status = /Missing GEMINI_API_KEY/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}