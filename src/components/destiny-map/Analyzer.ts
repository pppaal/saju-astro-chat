"use server";

import * as AstroLib from "@/lib/astrology/astrology";
import * as SajuLib from "@/lib/Saju/saju";

export type DestinyInput = {
  name: string;
  birthDate: string;   // "YYYY-MM-DD"
  birthTime: string;   // "HH:mm"
  city: string;        // "Seoul"
  gender: string;      // "male" | "female" | "unknown"
};

type SajuCore =
  | {
      pillars?: {
        year?: { stem?: string; branch?: string };
        month?: { stem?: string; branch?: string };
        day?: { stem?: string; branch?: string };
        time?: { stem?: string; branch?: string };
        raw?: any;
      };
      luckPillars?: { stem: string; branch: string; startAge: number; sibsin?: any }[];
      summary?: {
        dayPillar?: string;
        monthPillar?: string;
        yearPillar?: string;
        dayStem?: string;
        dayBranch?: string;
      };
      error?: never;
    }
  | { error: string; pillars?: never; luckPillars?: never; summary?: never };

export type DestinyResult = {
  profile: DestinyInput;
  sajuCore?: SajuCore;
  astrologyCore?: { prompt: string } | undefined;
  evidence: string;
  gemini: { text: string; highlights: string[]; debug?: string };
};

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

type CityInfo = { tz: string; lon: number; lat: number; name: string };
const GEO_DB: Record<string, CityInfo> = {
  seoul: { tz: "Asia/Seoul", lon: 126.9780, lat: 37.5665, name: "Seoul" },
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

async function getSajuCore(input: DestinyInput): Promise<SajuCore> {
  const calc: any = (SajuLib as any).calculateSajuData;
  if (!calc) return { error: "Saju.calculateSajuData not found" };

  const city = resolveCityInfo(input.city);
  try {
    const full = await calc(
      input.birthDate,
      input.birthTime,
      input.gender === "female" ? "female" : "male",
      "solar",
      city.tz,
      city.lon
    );

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
      time: { stem: full?.timePillar?.stem?.name, branch: full?.timePillar?.branch?.name },
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

function buildEvidence(sajuCore: any) {
  const p: any = sajuCore?.pillars ?? {};
  const fe = p?.raw?.fiveElements;
  const bits: string[] = [];
  const dp = p?.day ? `${p.day.stem ?? ""}${p.day.branch ?? ""}` : "";
  if (dp) bits.push(`[사주] 일주=${dp}`);
  if (fe) bits.push(`[사주] 오행분포 목${fe.wood}/화${fe.fire}/토${fe.earth}/금${fe.metal}/수${fe.water}`);
  return bits.length ? `핵심 근거:\n- ${bits.join("\n- ")}` : "핵심 근거: (추출 불가)";
}

// 내부 API 호출 전용
async function callGemini(prompt: string): Promise<{ text: string; model: string }> {
  const base =
    (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.trim()) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const url = `${base.replace(/\/+$/, "")}/api/destiny-map`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    cache: "no-store",
  });

  const txt = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`API /api/destiny-map ${res.status}: ${txt}`);
  return JSON.parse(txt);
}

export async function analyzeDestiny(raw: DestinyInput): Promise<DestinyResult> {
  const input = normalizeInput(raw);

  const sajuCore = await getSajuCore(input);
  const astrologyCore = await getAstrologyCore(input);

  const expectedDay =
    sajuCore && "summary" in (sajuCore as any) ? (sajuCore as any).summary?.dayPillar : undefined;

  const evidence = buildEvidence(sajuCore && !(sajuCore as any).error ? sajuCore : undefined);

  const name = input.name || "사용자";

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

  let text = "";
  let model = "";
  try {
    const r = await callGemini(prompt);
    text = r.text;
    model = r.model;
  } catch (e: any) {
    // Fallback: API 불가 시에도 UX 유지
    const fallback = [
      `${name} 안녕하세요`,
      `${name}의 인생은 이렇습니다 (사주/점성학 기반)`,
      "",
      "핵심 관찰:",
      "- 집중·통찰이 강점입니다.",
      "- 활동 리듬(화 기운) 보강이 장기적으로 유리합니다.",
      "- 관계에서는 명확한 소통 규칙이 효과적입니다.",
      "",
      "빠른 제안:",
      "- 주 3회 20분 유산소로 화(火) 기운 보강",
      "- 주간 리플렉션 15분으로 의사결정 또렷하게",
    ].join("\n");
    text = fallback;
    model = "fallback-local";
  }

  let finalText = text;
  if (expectedDay) {
    const expectedRe = new RegExp(expectedDay.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const mentionsExpected = expectedRe.test(text);
    if (!mentionsExpected) {
      finalText = `[확인] 정답 일주: ${expectedDay}. 아래 내용 중 일주가 다르면 이 값을 우선하세요.\n\n${text}`;
    }
  }

  const highlights: string[] = finalText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-•]\s/.test(l))
    .slice(0, 3)
    .map((l) => l.replace(/^[-•]\s?/, ""));

  const debug = `expectedDay=${expectedDay} astroPrompt=${astrologyCore ? "yes" : "no"} model=${model}`;

  return {
    profile: input,
    sajuCore,
    astrologyCore,
    evidence,
    gemini: { text: finalText, highlights, debug },
  };
}