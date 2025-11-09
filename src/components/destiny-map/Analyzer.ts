export type DestinyInput = {
  name: string;
  birthDate: string;
  birthTime: string;
  city: string;
  gender: string;
  lang?: "en" | "ko" | "ja" | "zh" | "es"; // 추가
};

export type DestinyResult = {
  profile: DestinyInput;
  interpretation: string;
  saju?: any;
  astrology?: any;
  error?: string;
  lang?: DestinyInput["lang"];
};

export async function analyzeDestiny(input: DestinyInput): Promise<DestinyResult> {
  try {
    // Vercel 환경: VERCEL_URL은 보통 도메인만 오므로 스킴을 붙여줍니다.
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    // lang 기본값: 없으면 'en'
    const payload = { ...input, lang: input.lang ?? "en" };

    const response = await fetch(`${baseUrl}/api/destiny-map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // lang 포함
      cache: "no-store",
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const msg =
        result?.error?.message ||
        result?.error ||
        `API Error: ${response.status}`;
      throw new Error(msg);
    }

    return {
      profile: input,
      interpretation: result?.interpretation || "No analysis text received.",
      saju: result?.saju,
      astrology: result?.astrology,
      lang: result?.lang ?? payload.lang, // 디버깅용
    };
  } catch (error: any) {
    console.error("Analyzer Error:", error);
    return {
      profile: input,
      interpretation: `Analysis Error:\n${error?.message || String(error)}`,
      error: error?.message || String(error),
      lang: input.lang,
    };
  }
}