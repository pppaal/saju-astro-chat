"use server";

import * as SajuLib from "@/lib/Saju/saju";
import * as AstroLib from "@/lib/Astrology/astrology";

/* ===== Types ===== */
export type DestinyInput = {
  name: string;        // "ae"
  birthDate: string;   // "YYYY-MM-DD"
  birthTime: string;   // "HH:mm"
  city: string;        // "Seoul"
  gender: string;      // "male" | "female" | others
};

type SajuCore =
  | {
      pillars?: {
        year?: { stem?: string; branch?: string };
        month?: { stem?: string; branch?: string };
        day?: { stem?: string; branch?: string };
        time?: { stem?: string; branch?: string };
        raw?: any; // 원본 보관(십성/지장간 포함)
      };
      luckPillars?: {
        stem: string;
        branch: string;
        startAge: number;
        sibsin?: any;
      }[];
      summary?: {
        dayPillar?: string;   // 예: 辛未
        monthPillar?: string; // 예: 戊寅
        yearPillar?: string;  // 예: 乙亥
        dayStem?: string;
        dayBranch?: string;
      };
      error?: never;
    }
  | {
      error: string;
      pillars?: never;
      luckPillars?: never;
      summary?: never;
    };

export type DestinyResult = {
  profile: DestinyInput;
  sajuCore?: SajuCore;
  astrologyCore?: { prompt: string } | undefined;
  evidence: string;
  gemini: { text: string; highlights: string[]; debug?: string };
};

/* ===== Utils ===== */
function jsonOk(v: unknown) { try { JSON.stringify(v); return true; } catch { return false; } }
function isEmpty(v: unknown) {
  if (v == null) return true;
  if (!jsonOk(v)) return true;
  const s = JSON.stringify(v);
  return s === "{}" || s === "[]" || s.length < 5;
}
function safeTrim(v: unknown, limit = 12000) {
  try { return JSON.stringify(v ?? {}, null, 2).slice(0, limit); } catch { return "{}"; }
}
function normalizeInput(input: DestinyInput): DestinyInput {
  const name = (input.name || "").trim();
  const birthDate = (input.birthDate || "").trim();
  let birthTime = (input.birthTime || "").trim();
  const city = (input.city || "").trim();
  let gender = (input.gender || "").trim().toLowerCase();

  if (/^\d{1}:\d{2}$/.test(birthTime)) birthTime = "0" + birthTime;
  if (/^\d{1,2}$/.test(birthTime)) birthTime = birthTime.padStart(2, "0") + ":00";
  if (!/^\d{2}:\d{2}$/.test(birthTime)) birthTime = "06:00";

  if (["m","남","male","man"].includes(gender)) gender = "male";
  else if (["f","여","female","woman"].includes(gender)) gender = "female";
  else gender = "unknown";

  return { name, birthDate, birthTime, city, gender };
}

/* ===== Geo/Timezone helpers =====
   필요 도시는 여기에 lat/lon/tz/name만 추가하세요. */
type CityInfo = { tz: string; lon: number; lat: number; name: string };
const GEO_DB: Record<string, CityInfo> = {
  seoul: { tz: "Asia/Seoul", lon: 126.9780, lat: 37.5665, name: "Seoul" },
  // 예시:
  // busan: { tz: "Asia/Seoul", lon: 129.0756, lat: 35.1796, name: "Busan" },
  // tokyo: { tz: "Asia/Tokyo", lon: 139.6917, lat: 35.6895, name: "Tokyo" },
};
function resolveCityInfo(city: string): CityInfo {
  const k = (city || "").trim().toLowerCase();
  return GEO_DB[k] || GEO_DB["seoul"];
}
function splitDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  return { year: y, month: m, date: d };
}
function splitTime(timeStr: string) {
  const [h, mi] = timeStr.split(":").map((x) => parseInt(x, 10));
  return { hour: h, minute: mi };
}

/* ===== Library adapters (project-specific) ===== */
// 1) Saju: calculateSajuData(birthDate, birthTime, gender, calendarType, timezone, longitude)
async function getSajuCore(input: DestinyInput): Promise<SajuCore> {
  const calc: any = (SajuLib as any).calculateSajuData;
  if (!calc) return { error: "Saju.calculateSajuData not found" };

  const city = resolveCityInfo(input.city);

  try {
    // 올바른 시그니처로 호출
    const full = await calc(
      input.birthDate,                         // birthDate: "YYYY-MM-DD"
      input.birthTime,                         // birthTime: "HH:mm"
      input.gender === "female" ? "female" : "male",
      "solar",                                 // calendarType: 'solar' 기준
      city.tz,                                 // timezone
      city.lon                                 // longitude (시지간 계산에서 사용)
    );

    // 네 라이브 결과를 공통 포맷으로 매핑
    const dayStem = full?.dayPillar?.stem?.name;
    const dayBranch = full?.dayPillar?.branch?.name;
    const monthStem = full?.monthPillar?.stem?.name;
    const monthBranch = full?.monthPillar?.branch?.name;
    const yearStem = full?.yearPillar?.stem?.name;
    const yearBranch = full?.yearPillar?.branch?.name;

    const pillars = {
      year: { stem: yearStem, branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day: { stem: dayStem, branch: dayBranch },
      time: {
        stem: full?.timePillar?.stem?.name,
        branch: full?.timePillar?.branch?.name,
      },
      raw: {
        yearPillar: full?.yearPillar,
        monthPillar: full?.monthPillar,
        dayPillar: full?.dayPillar,
        timePillar: full?.timePillar,
        fiveElements: full?.fiveElements,
        dayMaster: full?.dayMaster,
      },
    };

    const luckPillars =
      full?.daeWoon?.list?.map((d: any) => ({
        stem: d.heavenlyStem,
        branch: d.earthlyBranch,
        startAge: d.age,
        sibsin: d.sibsin,
      })) ?? [];

    const summary = {
      dayPillar: dayStem && dayBranch ? `${dayStem}${dayBranch}` : undefined,
      monthPillar: monthStem && monthBranch ? `${monthStem}${monthBranch}` : undefined,
      yearPillar: yearStem && yearBranch ? `${yearStem}${yearBranch}` : undefined,
      dayStem,
      dayBranch,
    };

    return { pillars, luckPillars, summary };
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

// 2) Astrology: generatePromptForGemini({ year, month, date, hour, minute, latitude, longitude, locationName })
async function getAstrologyCore(input: DestinyInput): Promise<{ prompt: string } | undefined> {
  const gen: any = (AstroLib as any).generatePromptForGemini;
  if (!gen) return undefined;

  const city = resolveCityInfo(input.city);
  const d = splitDate(input.birthDate);
  const t = splitTime(input.birthTime);

  try {
    const prompt: string = await gen({
      year: d.year,
      month: d.month,
      date: d.date,
      hour: t.hour,
      minute: t.minute,
      latitude: city.lat,
      longitude: city.lon,
      locationName: city.name,
    });
    if (typeof prompt === "string" && prompt.trim()) return { prompt: prompt.trim() };
    return undefined;
  } catch {
    return undefined;
  }
}

/* ===== Evidence (from Saju only: JSON 근거) ===== */
function take<T>(x: any, ...keys: string[]): T | undefined {
  for (const k of keys) if (x && x[k] != null) return x[k] as T;
  return undefined;
}
function extractSajuKeypoints(sajuCore: any) {
  const k: string[] = [];
  if (!sajuCore) return k;

  const p: any = sajuCore.pillars ?? {};
  const dayStem = take<string>(p.day || p, "stem", "dayStem", "gan");
  const dayBranch = take<string>(p.day || p, "branch", "dayBranch", "ji");
  const monthStem = take<string>(p.month || p, "stem", "monthStem", "gan");
  const monthBranch = take<string>(p.month || p, "branch", "monthBranch", "ji");
  const yearStem = take<string>(p.year || p, "stem", "yearStem", "gan");
  const yearBranch = take<string>(p.year || p, "branch", "yearBranch", "ji");

  if (dayStem || dayBranch) k.push(`[사주] 일주=${(dayStem||"")}${(dayBranch||"")}`);
  if (monthStem || monthBranch) k.push(`[사주] 월주=${(monthStem||"")}${(monthBranch||"")}`);
  if (yearStem || yearBranch) k.push(`[사주] 년주=${(yearStem||"")}${(yearBranch||"")}`);

  const raw = p.raw || {};
  if (raw?.fiveElements) {
    const fe = raw.fiveElements;
    k.push(`[사주] 오행분포 목${fe.wood}/화${fe.fire}/토${fe.earth}/금${fe.metal}/수${fe.water}`);
  }

  return k;
}
function buildEvidence(sajuCore: any) {
  const a: string[] = extractSajuKeypoints(sajuCore);
  return a.length ? `핵심 근거:\n- ${a.join("\n- ")}` : "핵심 근거: (추출 불가)";
}

/* ===== Gemini call (2.x, v1) ===== */
async function callGemini(prompt: string): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const CANDIDATES = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] as const;

  async function tryOnce(model: string) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.48, topP: 0.9, topK: 64, maxOutputTokens: 8192 },
    };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`${model} ${r.status} ${await r.text().catch(()=> "")}`);
    const j = await r.json();
    const text =
      (j?.candidates?.[0]?.content?.parts as any[] | undefined)?.map((p: any) => p?.text ?? "").join("") ||
      "No response";
    return { text, model };
  }

  let last = "";
  for (const m of CANDIDATES) {
    try { return await tryOnce(m); }
    catch (e: any) { last = String(e?.message || e); }
  }
  return { text: `모델 호출 실패: ${last}`, model: "gemini-fallback" };
}

/* ===== Main ===== */
export async function analyzeDestiny(raw: DestinyInput): Promise<DestinyResult> {
  const input = normalizeInput(raw);

  const sajuCore = await getSajuCore(input);
  const astrologyCore = await getAstrologyCore(input);

  const expectedDay =
    sajuCore && "summary" in (sajuCore as any)
      ? (sajuCore as any).summary?.dayPillar
      : undefined;

  const evidence = buildEvidence(
    sajuCore && "error" in sajuCore ? undefined : sajuCore
  );

  const name = input.name || "사용자";

  // 프롬프트: 사주 JSON(정답 일주 고정) + 점성 프롬프트 병합
  const prompt = `
주의: 아래 '확정 일주(dayPillar)' 값은 정답이다. 절대로 다른 일주로 바꾸지 마라.
- 확정 일주(dayPillar): ${expectedDay ?? "(미확정)"}

역할: 당신은 동서양 운명 분석가다. 출력은 한국어로만 작성한다.
규칙:
- 사주 파트: 아래 JSON과 Evidence만 근거로 사용. 임의 창작 금지.
- 점성 파트: 아래 'Astrology Prompt'를 반영하되, 사주와 모순되면 조화롭게 설명. 프롬프트가 없으면 임의 단정 금지.

프로필:
- 이름: ${name}
- 생년월일: ${input.birthDate}
- 출생시각: ${input.birthTime}
- 도시: ${input.city}
- 성별: ${input.gender}

사주 코어(JSON)
${safeTrim(sajuCore)}

Evidence
${evidence}

Astrology Prompt
${astrologyCore?.prompt ?? "(제공되지 않음)"} 
`.trim();

  const { text, model } = await callGemini(prompt);

  // 일주 가드: 모델이 다른 일주를 단정적으로 언급하면 경고 머리말
  let finalText = text;
  if (expectedDay) {
    const expectedRe = new RegExp(expectedDay.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const mentionsExpected = expectedRe.test(text);
    const mentionsWrong =
      /庚申|경신/.test(text) && !/辛未|신미/.test(text);
    if (!mentionsExpected || mentionsWrong) {
      finalText = `[확인] 정답 일주: ${expectedDay}. 모델 문구에 다른 일주가 보이면 이 값을 우선하세요.\n\n${text}`;
    }
  }

  const highlights: string[] = finalText
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter((l: string) => /^[-•]\s/.test(l))
    .slice(0, 3)
    .map((l: string) => l.replace(/^[-•]\s?/, ""));

  const debug =
    `expectedDay=${expectedDay} ` +
    `astroPrompt=${astrologyCore ? "yes" : "no"} ` +
    `model=${model}`;

  return {
    profile: input,
    sajuCore,
    astrologyCore,
    evidence,
    gemini: { text: finalText, highlights, debug },
  };
}