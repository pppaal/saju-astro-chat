import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * Structured output format for fortune prompts with date recommendations
 */
export interface StructuredFortuneOutput {
  sections: {
    id: string;
    title: string;
    icon: string;
    content: string;
    reasoning?: string;
    terminology?: Array<{ term: string; explanation: string }>;
  }[];
  dateRecommendations: {
    lucky: Array<{
      date: string;
      reason: string;
      sajuFactor?: string;
      astroFactor?: string;
      rating: 1 | 2 | 3 | 4 | 5;
    }>;
    caution: Array<{
      date: string;
      reason: string;
      sajuFactor?: string;
      astroFactor?: string;
    }>;
    bestPeriod?: {
      start: string;
      end: string;
      reason: string;
    };
  };
  keyInsights: Array<{
    type: "strength" | "opportunity" | "caution" | "advice";
    text: string;
    icon: string;
  }>;
  sajuHighlight?: {
    pillar: string;
    element: string;
    meaning: string;
  };
  astroHighlight?: {
    planet: string;
    sign: string;
    meaning: string;
  };
}

/**
 * Build structured fortune prompt that returns JSON with date recommendations
 */
export function buildStructuredFortunePrompt(
  lang: string,
  theme: string,
  data: CombinedResult
): string {
  const { astrology = {}, saju = {} } = data ?? {};
  const {
    planets = [],
    houses = {},
    aspects = [],
    ascendant,
    mc,
    facts,
    transits = [],
  } = astrology;
  const { pillars, dayMaster, unse, sinsal } = saju;

  // Extract key data
  const sun = planets.find((p: any) => p.name === "Sun");
  const moon = planets.find((p: any) => p.name === "Moon");
  const venus = planets.find((p: any) => p.name === "Venus");
  const mars = planets.find((p: any) => p.name === "Mars");
  const jupiter = planets.find((p: any) => p.name === "Jupiter");
  const saturn = planets.find((p: any) => p.name === "Saturn");

  // Pillars data
  const pillarText = [
    pillars?.year?.ganji,
    pillars?.month?.ganji,
    pillars?.day?.ganji,
    pillars?.time?.ganji,
  ].filter(Boolean).join(" / ") || "-";

  // Daeun (대운)
  const currentDaeun = (unse?.daeun ?? []).find((d: any) => {
    const now = new Date().getFullYear();
    return d.startYear <= now && d.endYear >= now;
  });

  // Annual (세운)
  const currentYear = new Date().getFullYear();
  const currentAnnual = (unse?.annual ?? []).find((a: any) => a.year === currentYear);

  // Monthly (월운)
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthly = (unse?.monthly ?? []).find(
    (m: any) => m.year === currentYear && m.month === currentMonth
  );

  // Upcoming months for date recommendations
  const upcomingMonths = (unse?.monthly ?? [])
    .filter((m: any) => {
      if (m.year > currentYear) return true;
      if (m.year === currentYear && m.month >= currentMonth) return true;
      return false;
    })
    .slice(0, 6);

  // Lucky/Unlucky from sinsal
  const luckyList = (sinsal?.luckyList ?? []).map((x: any) => x.name).join(", ");
  const unluckyList = (sinsal?.unluckyList ?? []).map((x: any) => x.name).join(", ");

  // Transit aspects (current planetary transits)
  const significantTransits = transits
    .filter((t: any) => ["conjunction", "trine", "sextile"].includes(t.type))
    .slice(0, 5);

  // Build the structured prompt
  const dateText = data.analysisDate ?? new Date().toISOString().slice(0, 10);
  const tzInfo = data.userTimezone ? ` (${data.userTimezone})` : "";

  const themeInstructions: Record<string, string> = {
    today: "Focus on today's energy and micro-actions. Give specific timing advice for the day.",
    love: "Focus on relationships, attraction, and emotional connections. Give date recommendations for romantic activities.",
    career: "Focus on work, professional growth, and opportunities. Give timing for important meetings, negotiations, or job changes.",
    health: "Focus on physical and mental wellness. Give timing for starting new health routines or rest periods.",
    wealth: "Focus on finances, investments, and abundance. Give timing for financial decisions and opportunities.",
    family: "Focus on family dynamics and relationships. Give timing for family gatherings or important conversations.",
    month: "Focus on the month's overall energy. Give week-by-week date recommendations.",
    year: "Focus on the year's themes. Give month-by-month recommendations for major decisions.",
    newyear: "Focus on new year prospects. Give quarterly recommendations for the year ahead.",
    life: "Focus on life purpose and direction. Give timing for major life transitions.",
  };

  const instruction = themeInstructions[theme] || themeInstructions.today;

  return `
[STRUCTURED FORTUNE ANALYSIS - ${theme.toUpperCase()}]
Date: ${dateText}${tzInfo}
Locale: ${lang}

=== BIRTH DATA ===
Day Master (일간): ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"})
Four Pillars (사주): ${pillarText}
Current Daeun (대운): ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? ""}-${currentDaeun?.endYear ?? ""})
Annual Fortune (세운): ${currentAnnual?.element ?? "-"} ${currentAnnual?.year ?? ""}
Monthly Fortune (월운): ${currentMonthly?.element ?? "-"} ${currentMonthly?.year ?? ""}-${currentMonthly?.month ?? ""}

Sun: ${sun?.sign ?? "-"} (House ${sun?.house ?? "-"})
Moon: ${moon?.sign ?? "-"} (House ${moon?.house ?? "-"})
Ascendant: ${ascendant?.sign ?? "-"}
MC: ${mc?.sign ?? "-"}
Venus: ${venus?.sign ?? "-"} | Mars: ${mars?.sign ?? "-"}
Jupiter: ${jupiter?.sign ?? "-"} | Saturn: ${saturn?.sign ?? "-"}

Lucky Factors: ${luckyList || "-"}
Caution Factors: ${unluckyList || "-"}

=== UPCOMING ENERGY (for date recommendations) ===
${upcomingMonths.map((m: any) => `${m.year}-${String(m.month).padStart(2, "0")}: ${m.element ?? "-"} (${m.heavenlyStem ?? ""} ${m.earthlyBranch ?? ""})`).join("\n")}

=== CURRENT TRANSITS ===
${significantTransits.map((t: any) => `${t.type}: ${t.from?.name ?? "?"} -> ${t.to?.name ?? "?"}`).join("\n") || "No significant transits"}

=== TASK ===
${instruction}

You MUST return a valid JSON object with this exact structure:

{
  "sections": [
    {
      "id": "unique-id",
      "title": "Section Title in ${lang}",
      "icon": "emoji",
      "content": "Main content text (2-3 sentences). Use simple, accessible language.",
      "reasoning": "Brief explanation of WHY this is relevant based on the data above",
      "terminology": [
        { "term": "Technical term", "explanation": "Simple explanation in ${lang}" }
      ]
    }
  ],
  "dateRecommendations": {
    "lucky": [
      {
        "date": "YYYY-MM-DD",
        "reason": "Why this date is favorable in ${lang}",
        "sajuFactor": "e.g., 월운과 일간의 조화",
        "astroFactor": "e.g., Jupiter trine Sun",
        "rating": 5
      }
    ],
    "caution": [
      {
        "date": "YYYY-MM-DD or date range",
        "reason": "Why to be cautious",
        "sajuFactor": "e.g., 충 관계",
        "astroFactor": "e.g., Saturn square Moon"
      }
    ],
    "bestPeriod": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "reason": "Why this period is optimal"
    }
  },
  "keyInsights": [
    {
      "type": "strength",
      "text": "Key strength or advantage in ${lang}",
      "icon": "emoji"
    },
    {
      "type": "opportunity",
      "text": "Opportunity to leverage",
      "icon": "emoji"
    },
    {
      "type": "caution",
      "text": "What to watch out for",
      "icon": "emoji"
    },
    {
      "type": "advice",
      "text": "Actionable advice",
      "icon": "emoji"
    }
  ],
  "sajuHighlight": {
    "pillar": "e.g., 일주 甲子",
    "element": "e.g., 목(木)",
    "meaning": "What this means for the user in ${lang}"
  },
  "astroHighlight": {
    "planet": "e.g., Venus",
    "sign": "e.g., Libra",
    "meaning": "What this means for the user in ${lang}"
  }
}

IMPORTANT GUIDELINES:
1. DATE RECOMMENDATIONS are the most important - analyze both saju (오행 flow, 충/합 relations) and astrology (transits, aspects) to find optimal dates
2. Explain terminology in simple terms - no jargon without explanation
3. Give reasoning for each section based on the actual data
4. Keep content concise but meaningful
5. All text should be in ${lang}
6. Return ONLY the JSON object, no markdown formatting

CROSS-ANALYSIS FOR DATES:
- Check element compatibility between day master and monthly elements
- Look for 합 (harmony) dates and avoid 충 (clash) dates
- Consider planetary transits to natal planets
- Factor in daeun/seun/wolun energy flow

Respond in ${lang} for all text content.
`.trim();
}

/**
 * Parse the structured JSON response from the AI
 */
export function parseStructuredResponse(response: string): StructuredFortuneOutput | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.sections || !Array.isArray(parsed.sections)) return null;
    if (!parsed.dateRecommendations) return null;

    return parsed as StructuredFortuneOutput;
  } catch (error) {
    console.error("[parseStructuredResponse] Error:", error);
    return null;
  }
}
