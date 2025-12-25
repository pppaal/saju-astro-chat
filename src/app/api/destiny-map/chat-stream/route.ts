import { getServerSession } from "next-auth";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText } from "@/lib/destiny-map/sanitize";
import { maskTextWithName } from "@/lib/security";
import { enforceBodySize } from "@/lib/http";
import { calculateSajuData } from "@/lib/Saju/saju";
import { calculateNatalChart, calculateTransitChart, findMajorTransits, toChart } from "@/lib/astrology";
import { buildAllDataPrompt } from "@/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt";
import { buildFewShotPrompt } from "@/lib/destiny-map/counselor-examples";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";
import {
  isValidDate,
  isValidTime,
  isValidLatitude,
  isValidLongitude,
  LIMITS,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const ALLOWED_LANG = new Set(["ko", "en"]);
const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);
const ALLOWED_GENDER = new Set(["male", "female", "other", "prefer_not"]);
const MAX_MESSAGES = 10;
const MAX_CV = 1200;

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

function counselorSystemPrompt(lang: string) {
  const base = [
    "You are DestinyPal's counselor combining Eastern (Saju) and Western (Astrology) wisdom.",
    "",
    "⚠️ CRITICAL DATA ACCURACY ⚠️",
    "- NEVER fabricate or guess 대운/운세 data!",
    "- ONLY quote 대운 from the [전체 장기 흐름 - 10년 주기] section",
    "- If asked about daeun at a specific age, find the matching age range from the data",
    "- If data is missing, say 'Not available in current data'",
    "",
    "ABSOLUTE RULES:",
    "1. NO GREETING - Jump straight to answering",
    "2. NO IDENTITY RECAP - User knows their chart",
    "3. ONLY use data provided - NEVER invent",
    "4. Use BOTH saju AND astrology equally",
    "5. NO ** bold markdown",
    "",
    "FUTURE PREDICTIONS - USE BOTH SYSTEMS:",
    "",
    "[SAJU 사주]",
    "- Check [미래 예측용 운세 데이터] for daeun/annual/monthly",
    "- Quote EXACT periods from data (look for ★현재★ marker)",
    "- Match age range to find correct 대운 (e.g., if user is 35, find 32-41세 range)",
    "",
    "[ASTROLOGY 점성술]",
    "- Solar Return: Year themes, SR Sun/Moon house for annual trends",
    "- Lunar Return: Monthly themes",
    "- Progressions: Progressed Moon phase = life cycle stage",
    "- Transits: Jupiter/Saturn transits for timing (7H=marriage, 10H=career, 2H=money)",
    "- Venus transit to 7H = love opportunity",
    "- Jupiter transit to 10H = career growth",
    "- Saturn return (age 29, 58) = major life restructuring",
    "",
    "TIMING EXAMPLES:",
    "- Marriage: Saju 관성 활성화 + Venus/Jupiter 7H transit",
    "- Career: Saju 관성/식상 + Jupiter/Saturn 10H transit",
    "- Money: Saju 재성 + Jupiter 2H/8H transit",
    "",
    "Response: 250-400 words, specific dates/periods, detailed analysis, 3-4 actionable tips at end.",
  ];
  return lang === "ko"
    ? [
        "너는 DestinyPal 상담사다.",
        "",
        "⚠️ 데이터 정확성 필수 ⚠️",
        "- 절대로 대운/운세 데이터를 추측하거나 만들어내지 마세요!",
        "- 대운은 반드시 [전체 장기 흐름 - 10년 주기] 섹션에서만 인용하세요",
        "- 특정 나이의 대운을 물으면, 해당 나이 범위에 맞는 데이터를 찾아 답변하세요",
        "- ★현재★ 표시가 있는 항목이 현재 운세입니다",
        "- 데이터에 없는 정보는 '해당 정보가 없습니다'라고 솔직히 말하세요",
        "",
        "절대 규칙:",
        "1. 인사 금지 - 바로 답변",
        "2. 신상 소개 금지",
        "3. 제공된 데이터만 사용 (절대 추측 금지!)",
        "4. 사주와 점성술 모두 활용",
        "5. ** 마크다운 금지",
        "",
        "미래 예측 - 두 시스템 함께 사용:",
        "",
        "[사주]",
        "- [미래 예측용 운세 데이터]에서 대운/연운/월운 확인",
        "- 정확한 시기 인용 (데이터에 있는 그대로 사용)",
        "",
        "[점성술]",
        "- Solar Return: 연간 테마, SR 태양/달 하우스",
        "- Lunar Return: 월간 테마",
        "- Progressions: 진행 달 위상 = 인생 주기",
        "- Transits: 목성/토성 트랜짓으로 시기 파악",
        "  - 7하우스 = 결혼/파트너십",
        "  - 10하우스 = 커리어",
        "  - 2하우스 = 재물",
        "- 금성 7하우스 트랜짓 = 연애 기회",
        "- 목성 10하우스 트랜짓 = 커리어 성장",
        "- 토성 리턴(29세, 58세) = 인생 재구성",
        "",
        "타이밍 예시:",
        "- 결혼: 사주 관성 활성화 + 금성/목성 7H 트랜짓",
        "- 취업: 사주 관성/식상 + 목성/토성 10H 트랜짓",
        "- 재물: 사주 재성 + 목성 2H/8H 트랜짓",
        "",
        "응답 형식:",
        "- 250-400단어로 충분히 설명",
        "- 사주와 점성술 각각의 관점에서 분석",
        "- 구체적인 시기와 근거 제시",
        "- 마지막에 실천 가능한 팁 3-4개",
      ].join("\n")
    : base.join("\n");
}

export async function POST(request: Request) {
  try {
    const oversized = enforceBodySize(request, 64 * 1024);
    if (oversized) return oversized;

    const guard = await apiGuard(request, { path: "destiny-map-chat-stream", limit: 60, windowSeconds: 60 });
    if (guard instanceof Response) return guard;

    // Dev mode: skip auth check (only for local dev)
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return new Response(JSON.stringify({ error: "not_authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "invalid_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, LIMITS.NAME) : undefined;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const birthTime = typeof body.birthTime === "string" ? body.birthTime.trim() : "";
    const gender = typeof body.gender === "string" && ALLOWED_GENDER.has(body.gender) ? body.gender : "male";
    const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
    const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
    const theme = typeof body.theme === "string" ? body.theme.trim().slice(0, LIMITS.THEME) : "chat";
    const lang = typeof body.lang === "string" && ALLOWED_LANG.has(body.lang) ? body.lang : "ko";
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    let saju = body.saju;
    let astro = body.astro;
    const advancedAstro = body.advancedAstro;  // Advanced astrology features
    const userContext = body.userContext;
    const cvText = typeof body.cvText === "string" ? body.cvText : "";

    if (!birthDate || !birthTime || latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidDate(birthDate)) {
      return new Response(JSON.stringify({ error: "Invalid birthDate" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidTime(birthTime)) {
      return new Response(JSON.stringify({ error: "Invalid birthTime" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidLatitude(latitude)) {
      return new Response(JSON.stringify({ error: "Invalid latitude" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidLongitude(longitude)) {
      return new Response(JSON.stringify({ error: "Invalid longitude" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 크레딧 체크 및 소비
    const creditResult = await checkAndConsumeCredits("reading", 1);
    if (!creditResult.allowed) {
      return creditErrorResponse(creditResult);
    }

    // Compute saju if not provided or empty
    if (!saju || !saju.dayMaster) {
      try {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
        saju = calculateSajuData(birthDate, birthTime, gender, "solar", userTz);
        console.warn("[chat-stream] Computed saju:", saju?.dayMaster?.heavenlyStem);
      } catch (e) {
        console.warn("[chat-stream] Failed to compute saju:", e);
      }
    }

    // 🔍 DEBUG: Log saju.unse to verify daeun data
    console.warn("[chat-stream] saju.unse exists:", !!(saju as any)?.unse);
    console.warn("[chat-stream] saju.unse.daeun count:", (saju as any)?.unse?.daeun?.length ?? 0);
    if ((saju as any)?.unse?.daeun?.[0]) {
      console.warn("[chat-stream] First daeun:", JSON.stringify((saju as any).unse.daeun[0]));
    }

    // Compute astro if not provided or empty
    let natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null = null;
    if (!astro || !astro.sun) {
      try {
        const [year, month, day] = birthDate.split("-").map(Number);
        const [hour, minute] = birthTime.split(":").map(Number);
        natalChartData = await calculateNatalChart({
          year,
          month,
          date: day,
          hour,
          minute,
          latitude,
          longitude,
          timeZone: "Asia/Seoul", // Default timezone
        });
        // Transform planets array to expected format
        const getPlanet = (name: string) => natalChartData!.planets.find((p) => p.name === name);
        astro = {
          sun: getPlanet("Sun"),
          moon: getPlanet("Moon"),
          mercury: getPlanet("Mercury"),
          venus: getPlanet("Venus"),
          mars: getPlanet("Mars"),
          jupiter: getPlanet("Jupiter"),
          saturn: getPlanet("Saturn"),
          ascendant: natalChartData.ascendant,
        };
        console.warn("[chat-stream] Computed astro:", astro?.sun?.sign);
      } catch (e) {
        console.warn("[chat-stream] Failed to compute astro:", e);
      }
    }

    // Compute current transits for future predictions
    let currentTransits: unknown[] = [];
    if (natalChartData) {
      try {
        const now = new Date();
        const isoNow = now.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
        const transitChart = await calculateTransitChart({
          iso: isoNow,
          latitude,
          longitude,
          timeZone: "Asia/Seoul",
        });

        const natalChart = toChart(natalChartData);
        const majorTransits = findMajorTransits(transitChart, natalChart);
        currentTransits = majorTransits.map(t => ({
          transitPlanet: t.transitPlanet,
          natalPoint: t.natalPoint,
          aspectType: t.type,
          orb: t.orb?.toFixed(1),
          isApplying: t.isApplying,
        }));
        console.warn("[chat-stream] Current transits found:", currentTransits.length);
      } catch (e) {
        console.warn("[chat-stream] Failed to compute transits:", e);
      }
    }

    const normalizedMessages: ChatMessage[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      const record = m as Record<string, unknown>;
      const role = typeof record.role === "string" && ALLOWED_ROLE.has(record.role)
        ? (record.role as ChatMessage["role"])
        : null;
      const content = typeof record.content === "string" ? record.content.trim() : "";
      if (!role || !content) continue;
      normalizedMessages.push({ role, content: content.slice(0, 2000) });
    }

    const trimmedHistory = clampMessages(normalizedMessages);

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === "user");
    if (lastUser && containsForbidden(lastUser.content)) {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${safetyMessage(lang)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    }

    // Build simple conversation context (NO heavy computation)
    const historyText = trimmedHistory
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Q" : "A"}: ${guardText(m.content, 300)}`)
      .join("\n")
      .slice(0, 1500);

    const userQuestion = lastUser ? guardText(lastUser.content, 500) : "";

    // v3.1: Build comprehensive data snapshot if saju/astro data is available
    // This is a lightweight string-building operation (no heavy computation)
    let v3Snapshot = "";
    if (saju || astro) {
      try {
        // Add transits to astrology object
        const astroWithTransits = astro ? {
          ...astro,
          transits: currentTransits,
        } : undefined;

        const combinedResult: CombinedResult = {
          saju: saju || undefined,
          astrology: astroWithTransits || undefined,
          extraPoints: advancedAstro?.extraPoints || undefined,
          asteroids: advancedAstro?.asteroids || undefined,
          solarReturn: advancedAstro?.solarReturn || undefined,
          lunarReturn: advancedAstro?.lunarReturn || undefined,
          progressions: advancedAstro?.progressions || undefined,
          draconic: advancedAstro?.draconic || undefined,
          harmonics: advancedAstro?.harmonics || undefined,
          fixedStars: advancedAstro?.fixedStars || undefined,
          eclipses: advancedAstro?.eclipses || undefined,
          electional: advancedAstro?.electional || undefined,
          midpoints: advancedAstro?.midpoints || undefined,
        } as CombinedResult;

        // 🔍 DEBUG: Check what advanced data is available
        console.warn(`[chat-stream] Advanced astro check:`, {
          hasExtraPoints: !!advancedAstro?.extraPoints,
          hasAsteroids: !!advancedAstro?.asteroids,
          hasSolarReturn: !!advancedAstro?.solarReturn,
          hasLunarReturn: !!advancedAstro?.lunarReturn,
          hasProgressions: !!advancedAstro?.progressions,
          hasDraconic: !!advancedAstro?.draconic,
          hasHarmonics: !!advancedAstro?.harmonics,
          hasFixedStars: !!advancedAstro?.fixedStars,
          hasEclipses: !!advancedAstro?.eclipses,
          hasElectional: !!advancedAstro?.electional,
          hasMidpoints: !!advancedAstro?.midpoints,
          hasTransits: currentTransits.length > 0,
        });

        v3Snapshot = buildAllDataPrompt(lang, theme, combinedResult);
        console.warn(`[chat-stream] v3.1 snapshot built: ${v3Snapshot.length} chars`);
      } catch (e) {
        console.warn("[chat-stream] Failed to build v3.1 snapshot:", e);
      }
    }

    // Few-shot examples for quality improvement
    const fewShotExamples = buildFewShotPrompt(lang as "ko" | "en", userQuestion);

    // Theme descriptions for context
    const themeDescriptions: Record<string, { ko: string; en: string }> = {
      love: { ko: "연애/결혼/배우자 관련 질문", en: "Love, marriage, partner questions" },
      career: { ko: "직업/취업/이직/사업 관련 질문", en: "Career, job, business questions" },
      wealth: { ko: "재물/투자/재정 관련 질문", en: "Money, investment, finance questions" },
      health: { ko: "건강/체력/웰빙 관련 질문", en: "Health, wellness questions" },
      family: { ko: "가족/인간관계 관련 질문", en: "Family, relationships questions" },
      today: { ko: "오늘의 운세/조언", en: "Today's fortune and advice" },
      month: { ko: "이번 달 운세/조언", en: "This month's fortune" },
      year: { ko: "올해 운세/연간 예측", en: "This year's fortune" },
      life: { ko: "인생 전반/종합 상담", en: "Life overview, general counseling" },
      chat: { ko: "자유 주제 상담", en: "Free topic counseling" },
    };
    const themeDesc = themeDescriptions[theme] || themeDescriptions.chat;
    const themeContext = lang === "ko"
      ? `현재 상담 테마: ${theme} (${themeDesc.ko})\n이 테마에 맞춰 답변해주세요.`
      : `Current theme: ${theme} (${themeDesc.en})\nFocus your answer on this theme.`;

    // Build prompt with v3.1 snapshot if available, otherwise fallback to simple prompt
    const chatPrompt = v3Snapshot
      ? [
          counselorSystemPrompt(lang),
          `Name: ${name || "User"}`,
          themeContext,
          "",
          "═══════════════════════════════════════════════════════════════",
          "[AUTHORITATIVE DATA SNAPSHOT v3.1]",
          "═══════════════════════════════════════════════════════════════",
          v3Snapshot,
          "",
          "═══════════════════════════════════════════════════════════════",
          "[FEW-SHOT EXAMPLES - Learn from these high-quality responses]",
          "═══════════════════════════════════════════════════════════════",
          fewShotExamples,
          "",
          cvText ? `CV/Resume:\n${guardText(cvText, MAX_CV)}` : "",
          historyText ? `\nConversation:\n${historyText}` : "",
          `\nQuestion: ${userQuestion}`,
        ].filter(Boolean).join("\n")
      : [
          counselorSystemPrompt(lang),
          `Name: ${name || "User"}`,
          `Birth: ${birthDate} ${birthTime}`,
          `Gender: ${gender}`,
          themeContext,
          cvText ? `\nCV/Resume:\n${guardText(cvText, MAX_CV)}` : "",
          historyText ? `\nConversation:\n${historyText}` : "",
          `\nQuestion: ${userQuestion}`,
        ].filter(Boolean).join("\n");

    // Call backend streaming endpoint IMMEDIATELY (no heavy computation)
    const backendUrl = pickBackendUrl();
    const apiKey = process.env.ADMIN_API_TOKEN || "";

    // Get session_id from header for RAG cache
    const sessionId = request.headers.get("x-session-id") || undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const backendResponse = await fetch(`${backendUrl}/ask-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        theme,
        prompt: chatPrompt,
        locale: lang,
        // Pass pre-computed chart data if available (instant response)
        saju: saju || undefined,
        astro: astro || undefined,
        // Advanced astrology features (draconic, harmonics, progressions, etc.)
        advanced_astro: advancedAstro || undefined,
        // Fallback: Pass birth info for backend to compute if needed
        birth: { date: birthDate, time: birthTime, gender, lat: latitude, lon: longitude },
        // Conversation history for context-aware responses
        history: trimmedHistory.filter((m) => m.role !== "system"),
        // Session ID for RAG cache
        session_id: sessionId,
        // Premium: user context for returning users
        user_context: userContext || undefined,
        // CV/Resume text for career-related questions
        cv_text: cvText || undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok || !backendResponse.body) {
      const encoder = new TextEncoder();
      const fallback = lang === "ko"
        ? "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
        : "Could not connect to AI service. Please try again.";
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Fallback": "1",
          },
        }
      );
    }

    // Relay the stream from backend to frontend
    // Sanitize/mask the stream on the fly
    const encoder = new TextEncoder();
    const sanitizedStream = new ReadableStream({
      start(controller) {
        const reader = backendResponse.body!.getReader();
        const decoder = new TextDecoder();
        const read = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name);
            controller.enqueue(encoder.encode(masked));
            read();
          }).catch((err) => {
            console.error("[chat-stream sanitize error]", err);
            controller.close();
          });
        };
        read();
      },
    });

    return new Response(sanitizedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Fallback": backendResponse.headers.get("x-fallback") || "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[Chat-Stream API error]", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
