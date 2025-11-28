// src/components/destiny-map/Analyzer.ts

export type LangKey = "en" | "ko" | "ja" | "zh" | "es";

export type DestinyInput = {
  name: string;
  birthDate: string;
  birthTime: string;
  city: string;
  latitude: number;
  longitude: number;
  gender: string;
  lang?: LangKey;
  theme?: string;     // 단일 테마 (사용자 선택)
  themes?: string[];  // 멀티 테마 (옵션)
};

export type ThemedBlock = {
  scores?: Record<string, number>;
  interpretation?: string;
  highlights?: string[];
};

export type DestinyResult = {
  profile?: DestinyInput;
  interpretation?: string;
  saju?: any;
  astrology?: any;
  error?: string;
  errorMessage?: string;
  lang?: LangKey;
  themes?: Record<string, ThemedBlock>;
  defaultTheme?: string;
  requestedThemes?: string[];
  usedFabricator?: boolean;
};

// 🔮 Client‑side Destiny Analyzer
export async function analyzeDestiny(input: DestinyInput): Promise<DestinyResult> {
  try {
    // ✅ base URL 자동 감지
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const lang: LangKey = input.lang ?? "ko";

    // ✅ 사용자 선택 테마 또는 기본 'life' 사용
    let themes: string[] = [];
    if (input.themes && input.themes.length > 0) {
      themes = input.themes;
    } else if (input.theme) {
      themes = [input.theme];
    }

    // ✅ 사용자가 선택한 테마 (없으면 기본 life)
    const activeTheme = themes[0] ?? "life";

    if (!input.latitude || !input.longitude) {
      console.warn(
        "[Analyzer] 좌표(latitude/longitude)가 비어 있습니다. 도시 선택이 완료되었는지 확인하세요."
      );
    }

    // ✅ 전체 요청 페이로드
    const payload = {
      name: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      gender: input.gender,
      lang,
      theme: activeTheme,   // ✅ 사용자 지정 테마 반영!
      themes,
    };

    console.log("[Analyzer] Sending payload to API:", payload);

    const response = await fetch(`${baseUrl}/api/destiny-map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const msg =
        result?.error?.message ||
        result?.error ||
        `API Error: ${response.status}`;
      console.error("[Analyzer] API Error:", msg, "Response:", result);
      return {
        profile: input,
        interpretation: `⚠️ API 요청 실패: ${msg}`,
        error: msg,
        errorMessage: msg,
        lang,
      };
    }

    // ✅ 정상 결과 반환
    return {
      ...result,
      profile: input,
      lang: result?.lang ?? lang,
    } as DestinyResult;
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("[Analyzer] Exception caught:", msg);
    return {
      profile: input,
      interpretation: `⚠️ Analysis Error:\n${msg}`,
      error: msg,
      errorMessage: msg,
      lang: input.lang ?? "ko",
    };
  }
}