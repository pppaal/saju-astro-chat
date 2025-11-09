import { NextResponse } from "next/server";
import Replicate from "replicate";
import { calculateAstrologyData } from "@/lib/destiny-map/astrologyengine";

// CityInfo, GEO_DB, resolveCityInfo are unchanged.
type CityInfo = { tz: string; lon: number; lat: number; name: string };
const GEO_DB: Record<string, CityInfo> = {
  seoul: { tz: "Asia/Seoul", lon: 126.9780, lat: 37.5665, name: "Seoul" },
};

function resolveCityInfo(city: string): CityInfo {
  const k = (city || "").trim().toLowerCase();
  return GEO_DB[k] || GEO_DB["seoul"];
}

// ----- i18n 지원: 언어 키와 라벨 -----
type LangKey = "en" | "ko" | "ja" | "zh" | "es";

const HEADINGS: Record<LangKey, string[]> = {
  en: [
    "Core Identity: The Innovative & Humanistic Visionary",
    "Emotional World & Inner Self: The Cautious seeker of Stability",
    "Intellect & Communication: The Sharp & Analytical Communicator",
    "Love & Relationships: Valuing Independence & Intellectual Connection",
    "Drive & Passion: The Goal-Oriented Strategist",
    "Career & Social Achievement: A Blend of Originality & Leadership",
    "Life's Key Challenges & Potential",
  ],
  ko: [
    "핵심 정체성: 혁신적이고 인본주의적 비전",
    "정서 세계와 내면: 안정성을 추구하는 신중함",
    "지성·소통: 예리하고 분석적인 커뮤니케이터",
    "사랑과 관계: 독립성과 지적 연결을 중시",
    "추진력과 열정: 목표 지향 전략가",
    "커리어·사회적 성취: 독창성과 리더십의 조화",
    "핵심 과제와 잠재력",
  ],
  ja: [
    "コア・アイデンティティ：革新的で人道的なビジョナリー",
    "感情世界と内面：安定を求める慎重さ",
    "知性とコミュニケーション：鋭敏で分析的なコミュニケーター",
    "愛と関係：独立性と知的なつながりを重視",
    "情熱と推進力：目標志向のストラテジスト",
    "キャリアと社会的達成：独創性とリーダーシップの調和",
    "主要な課題と可能性",
  ],
  zh: [
    "核心身份：创新且人本的愿景者",
    "情感世界与内在：追求稳定的谨慎者",
    "思维与沟通：敏锐而分析型的沟通者",
    "爱情与关系：重视独立与智性连接",
    "驱动力与激情：目标导向的战略家",
    "事业与社会成就：原创性与领导力的融合",
    "关键挑战与潜能",
  ],
  es: [
    "Identidad central: visionario innovador y humanista",
    "Mundo emocional e interior: prudencia que busca estabilidad",
    "Intelecto y comunicación: comunicador agudo y analítico",
    "Amor y relaciones: valoración de la independencia y conexión intelectual",
    "Impulso y pasión: estratega orientado a objetivos",
    "Carrera y logro social: mezcla de originalidad y liderazgo",
    "Retos clave y potencial",
  ],
};

// 언어별 시스템 프롬프트
function systemPromptFor(lang: LangKey) {
  const base =
    "You are a world-class psychological astrologer and Saju master with deep insight and a warm, empathetic writing style. Synthesize the provided Saju and Astrology data into a comprehensive, narrative life path analysis.";
  const enforce = {
    en: "Always respond in English.",
    ko: "항상 한국어로 답변하세요.",
    ja: "常に日本語で回答してください。",
    zh: "请始终使用中文回答。",
    es: "Responde siempre en español.",
  }[lang];
  return `${base} ${enforce}`;
}

// 다국어 분석 프롬프트
function createNarrativePrompt(lang: LangKey, sajuResult: any, astrologyResult: any, name: string): string {
  const sajuJson = JSON.stringify(sajuResult);
  const astroJson = JSON.stringify({
    dominantElement: astrologyResult.dominantElement,
    modalityEmphasis: astrologyResult.modalityEmphasis,
    planets: astrologyResult.planets,
    ascendantSign: astrologyResult.houses?.[0]?.sign,
  });
  const userName = name || (lang === "ko" ? "의뢰인" : "The Querent");

  const headings = HEADINGS[lang];
  const languageLine: Record<LangKey, string> = {
    en: `Please write the analysis for a person named "${userName}" in ${lang.toUpperCase()}.`,
    ko: `이 분석은 "${userName}"님을 위한 한국어 보고서입니다.`,
    ja: `この分析は「${userName}」さんのための日本語レポートです。`,
    zh: `此分析为“${userName}”的中文报告。`,
    es: `Este análisis es un informe en español para "${userName}".`,
  };

  return `
### Data for Analysis:
- Saju Data: ${sajuJson}
- Astrology Data: ${astroJson}

### Required Output Structure and Tone:
${languageLine[lang]} Follow these exact Markdown headings. Do not add any text before the first heading. Be insightful, empowering, and avoid overly technical jargon.

# ${headings[0]}
# ${headings[1]}
# ${headings[2]}
# ${headings[3]}
# ${headings[4]}
# ${headings[5]}
# ${headings[6]}
`.trim();
}

// Initialize the Replicate client once with the API token from .env.local
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Replicate 호출
 */
async function callReplicateLlama(prompt: string, lang: LangKey): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set in .env.local");
  }

  const systemPrompt = systemPromptFor(lang);

  try {
    const output = await replicate.run("meta/meta-llama-3-70b-instruct", {
      input: {
        prompt,
        system_prompt: systemPrompt,
        max_new_tokens: 4096,
        temperature: 0.75,
      },
    });
    const text = (output as string[]).join("");
    if (!text) throw new Error("Replicate returned an empty response.");
    return text;
  } catch (error) {
    console.error("Replicate run failed.", error);
    throw new Error(`Replicate API call failed: ${error}`);
  }
}

// 동적 렌더
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chatPrompt } = body;

    // 언어 파라미터 수신: 기본 en
    const rawLang = String(body?.lang || "").toLowerCase();
    const lang: LangKey = (["en", "ko", "ja", "zh", "es"].includes(rawLang) ? (rawLang as LangKey) : "en");

    if (chatPrompt) {
      if (typeof chatPrompt !== "string") throw new Error("Invalid chat prompt.");
      // 채팅은 프롬프트 자체에 언어 지시가 있을 수 있지만, 시스템에서도 한 번 더 강제
      const chatResponse = await callReplicateLlama(chatPrompt, lang);
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
      }).then((res) => {
        if (!res.ok) throw new Error(`Saju API failed with status ${res.status}`);
        return res.json();
      });

      const [astrologyResult, sajuResult] = await Promise.all([astrologyPromise, sajuPromise]);

      if (astrologyResult?.error || sajuResult?.error) {
        throw new Error(`Data calculation failed: ${astrologyResult?.error || sajuResult?.error}`);
      }

      // 언어별 프롬프트 생성
      const prompt = createNarrativePrompt(lang, sajuResult, astrologyResult, name);
      const analysis = await callReplicateLlama(prompt, lang);

      return NextResponse.json({
        interpretation: analysis,
        saju: sajuResult,
        astrology: astrologyResult,
        lang, // 응답에도 넣어두면 디버깅 쉬움
      });
    }
  } catch (error: any) {
    console.error("Destiny Map API Error:", error?.message || error);
    return NextResponse.json({ error: error?.message || "An internal server error occurred." }, { status: 500 });
  }
}