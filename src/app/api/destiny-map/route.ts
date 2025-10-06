import { NextResponse } from "next/server";
import { calculateAstrologyData } from "@/lib/destiny-map/astrologyengine";

type CityInfo = { tz: string; lon: number; lat: number; name: string };
const GEO_DB: Record<string, CityInfo> = {
  seoul: { tz: "Asia/Seoul", lon: 126.9780, lat: 37.5665, name: "Seoul" },
};

function resolveCityInfo(city: string): CityInfo {
  const k = (city || "").trim().toLowerCase();
  return GEO_DB[k] || GEO_DB["seoul"];
}

const ATTEMPT_SUFFIXES = [
  "",
  `
---

# Concision Directive
The previous attempt overflowed max tokens before producing visible text. Re-satisfy the exact same contract, but keep sentences compact and aim for ≈550 words (not exceeding 700). Deliver tables in lean rows and avoid redundancies.`,
  `
---

# Emergency Compression
Earlier attempts exceeded token limits. Fulfil the same structure, but cap the total output at ≤500 words while still covering every heading, every table row (Jan–Dec), and all dual-sourced insights. Use short, information-dense sentences.`,
] as const;

async function callGeminiAPI(prompt: string, attempt = 0): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Server Configuration Error: GEMINI_API_KEY is missing from .env.local.");
  }

  if (attempt >= ATTEMPT_SUFFIXES.length) {
    throw new Error("Gemini API Error: Exhausted retries due to repeated max-token truncation.");
  }

  const promptWithDirective = `${prompt}${ATTEMPT_SUFFIXES[attempt]}`;

  const modelName = "gemini-2.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

  const maxOutputTokens =
    attempt === 0 ? 2048 : attempt === 1 ? 3072 : 2304;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: promptWithDirective }],
      },
    ],
    generationConfig: {
      temperature: 0.65,
      topP: 0.9,
      maxOutputTokens,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  if (process.env.NODE_ENV !== "production") {
    console.dir({ attempt, maxOutputTokens, geminiRaw: data }, { depth: null });
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason ?? "UNKNOWN";
    const ratings = (data.promptFeedback?.safetyRatings || [])
      .map((r: any) => `${r.category}:${r.probability}`)
      .join(", ");
    throw new Error(
      `Gemini returned no candidates (blockReason=${blockReason}${ratings ? `, ratings=[${ratings}]` : ""}).`
    );
  }

  const fullText =
    candidate.content?.parts
      ?.map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim() ?? "";

  if (!fullText) {
    const finishReason = candidate.finishReason ?? candidate.finish_reason ?? "UNKNOWN";

    if (finishReason === "MAX_TOKENS") {
      console.warn(
        `Gemini truncated output at attempt ${attempt} (finishReason=MAX_TOKENS). Retrying with adjusted directives.`
      );
      return callGeminiAPI(prompt, attempt + 1);
    }

    throw new Error(
      `Gemini candidate missing text (finishReason=${finishReason}). Raw payload: ${JSON.stringify(data)}`
    );
  }

  return fullText;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { birthDate, birthTime, city, gender, name } = body;

    if (!birthDate || !birthTime || !gender || !city) {
      return NextResponse.json({ error: "Required fields are missing." }, { status: 400 });
    }

    const cityInfo = resolveCityInfo(city);
    const { lat: latitude, lon: longitude, tz: timezone } = cityInfo;

    const host = request.headers.get("host");
    const protocol = host?.startsWith("localhost") ? "http" : "https";
    const absoluteUrl = `${protocol}://${host}`;

    const astrologyPromise = calculateAstrologyData({
      date: birthDate,
      time: birthTime,
      latitude,
      longitude,
    });

    const sajuPromise = fetch(`${absoluteUrl}/api/saju`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate,
        birthTime,
        gender,
        calendarType: "solar",
        timezone,
      }),
    }).then((res) => res.json());

    const [astrologyResult, sajuResult] = await Promise.all([astrologyPromise, sajuPromise]);

    if (astrologyResult.error || sajuResult.error) {
      throw new Error(`Data calculation failed: ${astrologyResult.error || sajuResult.error}`);
    }

    const currentYear = new Date().getFullYear();
    const prompt = `
You are "Destiny Navigator AI," a bilingual strategist who fuses Korean Four Pillars (Saju) with Western Astrology. 
Write exclusively in polished, natural American English.
Reference both datasets in every section—explain how the elemental balance (오행, yin/yang, ten gods) interlocks with planetary positions, aspects, and houses.

### OUTPUT CONTRACT
- Use Markdown headings exactly as defined below.
- Minimum total length: 550 words.
- Provide at least two explicit cross-links between the Saju elements and the astrological chart in each major section.
- Include concrete recommendations with timelines where relevant.
- Tone: insightful, practical, motivational, never mystical.

### STRUCTURE
# Executive Overview (≈150 words)
Summarize the life headline for ${currentYear}. Highlight one dominant Saju element and one standout astrological signature that reinforce each other.

# Integrated Element Dynamics
- Subsection: "Elemental & Planetary Balance"
  * Discuss the Saju five-element distribution (strength/weakness) together with natal planetary placements and house emphasis.
- Subsection: "Cycle Intersections"
  * Tie the current fortune pillars (대운/세운) to transits or progressions affecting the same themes.

# Strategic Focus Areas
Create three subsections: Career & Wealth, Relationships & Collaboration, Vitality & Inner Alignment.
For each:
1. Diagnose the situation with explicit Saju pillars and astrological houses/planets.
2. Provide 2–3 actionable strategies with time frames (e.g., “Q4 2025”, “next 6 weeks”).

# Month-by-Month Navigator
Create a table with columns: Month, Energy Theme, Action Cue, Saju Reference, Astro Trigger.
Cover all 12 months from Jan–Dec ${currentYear}. Tie each row to both systems.

# Action Playbook (Bullet list)
List 5 high-leverage habits. For each habit, cite the Saju driver and the astrological rationale.

# Contingency Signals
Identify 3 warning signs to watch. Explain how both Saju and astrology signal these risks, plus a mitigation step.

Ensure every insight is dual-sourced (Saju + Astrology).`;

    const interpretation = await callGeminiAPI(prompt);

    return NextResponse.json({
      gemini: { text: interpretation },
      saju: sajuResult,
      astrology: astrologyResult,
    });
  } catch (error: any) {
    console.error("Destiny Map API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}