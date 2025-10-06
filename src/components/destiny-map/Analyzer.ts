"use server";

export type DestinyInput = {
  name: string;
  birthDate: string; 
  birthTime: string; 
  city: string;
  gender: string;
};

export type DestinyResult = {
  profile: DestinyInput;
  gemini: { text: string; highlights?: string[]; };
  saju?: any;
  astrology?: any;
  error?: string;
};

export async function analyzeDestiny(input: DestinyInput): Promise<DestinyResult> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

    // 💡 --- 핵심 수정사항: 이제 Analyzer는 받은 정보를 그대로 전달하기만 합니다. ---
    const response = await fetch(`${baseUrl}/api/destiny-map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `API Error: ${response.status}`);
    }
    
    return {
      profile: input,
      ...result
    };

  } catch (error: any) {
    console.error("Analyzer Error:", error);
    return {
        profile: input,
        gemini: { 
            text: `Analysis Error:\n${error.message}` 
        },
        error: error.message 
    };
  }
}

