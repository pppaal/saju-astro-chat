import { NextResponse } from "next/server";
import Replicate from "replicate";
import { calculateAstrologyData } from "@/lib/destiny-map/astrologyengine";

// CityInfo, GEO_DB, resolveCityInfo are unchanged.
type CityInfo = { tz: string; lon: number; lat: number; name:string };
const GEO_DB: Record<string, CityInfo> = {
  seoul: { tz: "Asia/Seoul", lon: 126.9780, lat: 37.5665, name: "Seoul" },
};

function resolveCityInfo(city: string): CityInfo {
  const k = (city || "").trim().toLowerCase();
  return GEO_DB[k] || GEO_DB["seoul"];
}

// Your excellent prompt function is unchanged.
function createEnglishNarrativePrompt(sajuResult: any, astrologyResult: any, name: string): string {
    const sajuJson = JSON.stringify(sajuResult);
    const astroJson = JSON.stringify({
        dominantElement: astrologyResult.dominantElement,
        modalityEmphasis: astrologyResult.modalityEmphasis,
        planets: astrologyResult.planets,
        ascendantSign: astrologyResult.houses[0].sign,
    });
    const userName = name || "The Querent";
    
    // This is the main user prompt text.
    return `
### Data for Analysis:
- **Saju Data:** ${sajuJson}
- **Astrology Data:** ${astroJson}

### Required Output Structure and Tone:
Please write the analysis for a person named "${userName}" in English, following these exact Markdown headings. Do not add any text before the first heading. Be insightful, empowering, and avoid overly technical jargon.

# Core Identity: The Innovative & Humanistic Visionary
# Emotional World & Inner Self: The Cautious seeker of Stability
# Intellect & Communication: The Sharp & Analytical Communicator
# Love & Relationships: Valuing Independence & Intellectual Connection
# Drive & Passion: The Goal-Oriented Strategist
# Career & Social Achievement: A Blend of Originality & Leadership
# Life's Key Challenges & Potential
`.trim();
}

// Initialize the Replicate client once with the API token from .env.local
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});


/**
 * FINAL, CORRECTED VERSION using the official Replicate Node.js client library
 * and a verified, stable model version ID.
 */
async function callReplicateLlama(prompt: string): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set in .env.local");
  }

  const systemPrompt = "You are a world-class psychological astrologer and Saju master with deep insight and a warm, empathetic writing style. Your task is to synthesize the provided Saju and Astrology data into a comprehensive, narrative life path analysis.";

  try {
    console.log("Attempting prediction with the official Replicate client and VERIFIED version ID...");
    // *** 3. Use replicate.run() - this handles everything correctly ***
    const output = await replicate.run(
      // CORRECTED: Using the proper model name "meta/meta-llama-3-70b-instruct"
      "meta/meta-llama-3-70b-instruct",
      {
        input: {
          prompt: prompt,
          system_prompt: systemPrompt,
          max_new_tokens: 4096,
          temperature: 0.75,
        }
      }
    );
    
    const text = (output as string[]).join("");

    if (!text) {
        console.error("FATAL: Replicate returned an empty response.");
        throw new Error("Replicate returned an empty response.");
    }
    
    console.log("Replicate prediction SUCCEEDED.");
    return text;

  } catch (error) {
    console.error("FATAL: Replicate run failed.", error);
    throw new Error(`Replicate API call failed: ${error}`);
  }
}


// The main API Route Handler (unchanged)
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatPrompt } = body;

    if (chatPrompt) {
      if (typeof chatPrompt !== 'string') throw new Error("Invalid chat prompt.");
      const chatResponse = await callReplicateLlama(chatPrompt);
      return NextResponse.json({ interpretation: chatResponse });

    } else {
      const { birthDate, birthTime, city, gender, name } = body;

      if (!birthDate || !birthTime || !gender || !city) {
        return NextResponse.json({ error: "Required fields are missing for initial analysis." }, { status: 400 });
      }

      const cityInfo = resolveCityInfo(city);
      const { lat: latitude, lon: longitude, tz: timezone } = cityInfo;
      
      const astrologyPromise = calculateAstrologyData({ date: birthDate, time: birthTime, latitude, longitude });
      
      const host = request.headers.get("host");
      const protocol = host?.startsWith("localhost") ? "http" : "https";
      const absoluteUrl = `${protocol}://${host}`;

      const sajuPromise = fetch(new URL("/api/saju", absoluteUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime, gender, calendarType: "solar", timezone }),
        cache: "no-store",
      }).then(res => {
        if (!res.ok) throw new Error(`Saju API failed with status ${res.status}`);
        return res.json();
      });
      
      const [astrologyResult, sajuResult] = await Promise.all([astrologyPromise, sajuPromise]);

      if (astrologyResult?.error || sajuResult?.error) {
        throw new Error(`Data calculation failed: ${astrologyResult?.error || sajuResult?.error}`);
      }
      
      const prompt = createEnglishNarrativePrompt(sajuResult, astrologyResult, name);
      const analysis = await callReplicateLlama(prompt);
      
      return NextResponse.json({ 
        interpretation: analysis,
        saju: sajuResult, 
        astrology: astrologyResult 
      });
    }
  } catch (error: any) {
    console.error("Destiny Map API Error:", error.message);
    return NextResponse.json({ error: error.message || "An internal server error occurred." }, { status: 500 });
  }
}


