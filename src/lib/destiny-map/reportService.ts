//src/lib/destiny-map/reportService.ts

'use server';

import { computeDestinyMap } from "./astrologyengine";
import { buildPromptByTheme } from "@/lib/destiny-map/prompt/fortune";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🧭 DestinyMap Report Service – Flask Fusion AI Version
 */

export interface ReportOutput {
  meta: {
    generator: string;
    generatedAt: string;
    theme: string;
    lang: string;
    name?: string;
    gender?: string;
    modelUsed?: string;
  };
  summary: string;
  report: string;
  raw: any;
}

/* 🔹 fallback 오행 탐지 */
function extractElements(text: string) {
  const m = text.match(/목\s?(\d+).*?화\s?(\d+).*?토\s?(\d+).*?금\s?(\d+).*?수\s?(\d+)/s);
  if (m) {
    return { fiveElements: { 목: +m[1], 화: +m[2], 토: +m[3], 금: +m[4], 수: +m[5] } };
  }
  return { fiveElements: { 목: 25, 화: 25, 토: 20, 금: 20, 수: 15 } };
}

/* ✅ 텍스트 정화 함수 */
function cleanseText(raw: string) {
  if (!raw) return "";
  return raw
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/@import.*?;/gi, "")
    .replace(/(html|body|svg|button|form|document\.write|style|font\-family|background)/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[{}<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function generateReport({
  name,
  birthDate,
  birthTime,
  latitude,
  longitude,
  gender = "male",
  theme,
  lang = "ko",
  extraPrompt,
}: {
  name?: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  gender?: "male" | "female";
  theme: string;
  lang?: string;
  extraPrompt?: string;
}): Promise<ReportOutput> {
  // -----------------------------------------------------------------------
  // 1️⃣ 사주 + 점성 전체 데이터 계산
  // -----------------------------------------------------------------------
  const result: CombinedResult = await computeDestinyMap({
    name,
    birthDate,
    birthTime,
    latitude,
    longitude,
    gender,
    theme,
  });

  // -----------------------------------------------------------------------
  // 2️⃣ 테마 프롬프트 생성
  // -----------------------------------------------------------------------
  const themePrompt = buildPromptByTheme(theme, lang, result);
  const fullPrompt = extraPrompt ? `${themePrompt}\n\n${extraPrompt}` : themePrompt;

  // -----------------------------------------------------------------------
  // 3️⃣ Flask 백엔드 /ask 엔드포인트로 요청
  // -----------------------------------------------------------------------
  const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";

  let aiText = "";
  let modelUsed = "";

  try {
    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        prompt: fullPrompt,       // ✅ 프론트 프롬프트 전달
        saju: result.saju,
        astro: result.astrology,
      }),
    });

    if (!response.ok) throw new Error(`Flask server error: ${response.status}`);

    const data = await response.json();
    aiText =
      data?.data?.fusion_layer ||
      data?.data?.report ||
      "⚠️ Flask 응답에서 결과를 찾을 수 없습니다.";
    modelUsed = data?.data?.model || "Flask‑Fusion‑LLM";
  } catch (err) {
    console.error("🛑 Flask AI 요청 실패:", err);
    aiText = "⚠️ AI 서버 연결 에러입니다.";
    modelUsed = "Error‑Fallback";
  }

  // -----------------------------------------------------------------------
  // 4️⃣ 결과 반환
  // -----------------------------------------------------------------------
  return {
    meta: {
      generator: "DestinyMap Report via Flask‑Fusion",
      generatedAt: new Date().toISOString(),
      theme,
      lang,
      name,
      gender,
      modelUsed,
    },
    summary: result.summary,
    report: cleanseText(aiText),
    raw: { ...result, saju: result.saju ?? extractElements(aiText) },
  };
}