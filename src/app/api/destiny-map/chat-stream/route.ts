import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createAuthenticatedGuard } from "@/lib/api/middleware";
import { createTransformedSSEStream, createFallbackSSEStream } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText } from "@/lib/destiny-map/sanitize";
import { maskTextWithName } from "@/lib/security";
import { enforceBodySize } from "@/lib/http";
import { jsonErrorResponse } from "@/lib/api/response-builders";
import { calculateSajuData } from "@/lib/Saju/saju";
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  toChart,
} from "@/lib/astrology";
import { buildAllDataPrompt } from "@/lib/destiny-map/prompt/fortune/base";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import {
  isValidDate,
  isValidTime,
  isValidLatitude,
  isValidLongitude,
  LIMITS,
} from "@/lib/validation";
import { generateYearlyPrediction, generatePredictionPromptContext, type FiveElement } from "@/lib/prediction/timingScore";
import {
  calculateAdvancedMonthlyScore,
  generateAdvancedTimingPromptContext,
  type LayeredTimingScore,
} from "@/lib/prediction/advancedTimingEngine";
import {
  generateWeeklyPrediction,
  generateUltraPrecisionPromptContext,
} from "@/lib/prediction/ultraPrecisionEngine";
import {
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
  calculateDailyPillar,
} from "@/lib/prediction/ultra-precision-daily";
import {
  findBestDates,
  findYongsinActivationPeriods,
  generateSpecificDatePromptContext,
  generateYongsinPromptContext,
  type ActivityType,
} from "@/lib/prediction/specificDateEngine";
import {
  analyzeMultiYearTrend,
  generateLifePredictionPromptContext,
  findOptimalEventTiming,
  generateEventTimingPromptContext,
  analyzePastDate,
  generatePastAnalysisPromptContext,
  type LifePredictionInput,
  type EventType,
} from "@/lib/prediction/lifePredictionEngine";
import {
  convertSajuDaeunToInfo,
  analyzeDaeunTransitSync,
  type DaeunInfo,
} from "@/lib/prediction/daeunTransitSync";
import { logger } from '@/lib/logger';
import { toSajuDataStructure } from '@/lib/destiny-map/type-guards';
import {
  parseDateComponents,
  parseTimeComponents,
  extractBirthYear,
  extractBirthMonth,
  extractBirthDay,
  formatDateByLocale,
} from '@/lib/prediction/utils';
import { analyzeActivityIntent } from '@/lib/destiny-map/chat-stream/helpers/activityDetector';
import {
  buildDateRecommendationSection,
  extractSajuDataForRecommendation,
} from '@/lib/destiny-map/chat-stream/builders/dateRecommendationBuilder';

// Local modules (extracted from this file)
import {
  type ChatMessage,
  type SajuDataStructure,
  type AstroDataStructure,
  ALLOWED_LANG,
  ALLOWED_GENDER,
  MAX_MESSAGES,
  clampMessages,
  counselorSystemPrompt,
  loadUserProfile,
  loadPersonaMemory,
} from "./lib";
import {
  generateTier3Analysis,
  generateTier4Analysis,
} from "./analysis";

// Handlers
import { loadOrComputeAllData } from "./handlers/dataLoader";

// Builders
import { buildAdvancedTimingSection } from "./builders/advancedTimingBuilder";
import { buildDailyPrecisionSection } from "./builders/dailyPrecisionBuilder";
import { buildDaeunTransitSection } from "./builders/daeunTransitBuilder";
import { buildPastAnalysisSection, buildMultiYearTrendSection } from "./builders/lifeAnalysisBuilder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Constants that are only used locally in this file
const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);

export async function POST(req: NextRequest) {
  try {
    const oversized = enforceBodySize(req, 256 * 1024); // 256KB for large chart data
    if (oversized) return oversized;

    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: "destiny-map-chat-stream",
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "reading",
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    const userId = context.userId;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_body" },
        { status: 400 }
      );
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
    let saju = body.saju as SajuDataStructure | undefined;
    let astro = body.astro as AstroDataStructure | undefined;
    const advancedAstro = body.advancedAstro;  // Advanced astrology features
    const predictionContext = body.predictionContext;  // Life prediction TIER 1-10
    const userContext = body.userContext;
    const cvText = typeof body.cvText === "string" ? body.cvText : "";

    // ========================================
    // 🔄 AUTO-LOAD: Try to load birth info from user profile if missing
    // ========================================
    let effectiveBirthDate = birthDate;
    let effectiveBirthTime = birthTime;
    const effectiveLatitude = latitude;
    const effectiveLongitude = longitude;
    let effectiveGender = gender;

    if (userId && (!birthDate || !birthTime || !isValidLatitude(latitude) || !isValidLongitude(longitude))) {
      const profileResult = await loadUserProfile(userId, birthDate, birthTime, latitude, longitude, saju, astro);
      if (profileResult.saju) saju = profileResult.saju;
      if (profileResult.astro) astro = profileResult.astro as AstroDataStructure;
      if (profileResult.birthDate) effectiveBirthDate = profileResult.birthDate;
      if (profileResult.birthTime) effectiveBirthTime = profileResult.birthTime;
      if (profileResult.gender) effectiveGender = profileResult.gender;
    }

    if (!effectiveBirthDate || !effectiveBirthTime || !isValidLatitude(effectiveLatitude) || !isValidLongitude(effectiveLongitude)) {
      return jsonErrorResponse("Missing required fields");
    }
    if (!isValidDate(effectiveBirthDate)) {
      return jsonErrorResponse("Invalid birthDate");
    }
    if (!isValidTime(effectiveBirthTime)) {
      return jsonErrorResponse("Invalid birthTime");
    }
    if (!isValidLatitude(effectiveLatitude)) {
      return jsonErrorResponse("Invalid latitude");
    }
    if (!isValidLongitude(effectiveLongitude)) {
      return jsonErrorResponse("Invalid longitude");
    }

    // Credits already consumed by middleware

    // ========================================
    // 🧠 LONG-TERM MEMORY: Load PersonaMemory and recent session summaries
    // ========================================
    let personaMemoryContext = "";
    let recentSessionSummaries = "";

    if (userId) {
      const memoryResult = await loadPersonaMemory(userId, theme, lang);
      personaMemoryContext = memoryResult.personaMemoryContext;
      recentSessionSummaries = memoryResult.recentSessionSummaries;
    }

    // Compute saju if not provided or empty
    if (!saju || !saju.dayMaster) {
      try {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
        const computedSaju = calculateSajuData(effectiveBirthDate, effectiveBirthTime, effectiveGender as 'male' | 'female', "solar", userTz);
        const validatedSaju = toSajuDataStructure(computedSaju);
        if (validatedSaju) {
          saju = validatedSaju as SajuDataStructure;
        }
        logger.debug("[chat-stream] Computed saju:", saju?.dayMaster?.heavenlyStem);
      } catch (e) {
        logger.warn("[chat-stream] Failed to compute saju:", e);
      }
    }

    // 🔍 DEBUG: Log saju.unse to verify daeun data
    logger.warn("[chat-stream] saju.unse exists:", !!saju?.unse);
    logger.warn("[chat-stream] saju.unse.daeun count:", saju?.unse?.daeun?.length ?? 0);
    if (saju?.unse?.daeun?.[0]) {
      logger.warn("[chat-stream] First daeun:", JSON.stringify(saju.unse.daeun[0]));
    }

    // Compute astro if not provided or empty
    let natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null = null;
    if (!astro || !astro.sun) {
      try {
        const { year, month, day } = parseDateComponents(effectiveBirthDate);
        const { hour, minute } = parseTimeComponents(effectiveBirthTime);
        natalChartData = await calculateNatalChart({
          year,
          month,
          date: day,
          hour,
          minute,
          latitude: effectiveLatitude,
          longitude: effectiveLongitude,
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
        logger.warn("[chat-stream] Computed astro:", (astro?.sun as { sign?: string })?.sign);
      } catch (e) {
        logger.warn("[chat-stream] Failed to compute astro:", e);
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
          latitude: effectiveLatitude,
          longitude: effectiveLongitude,
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
        logger.warn("[chat-stream] Current transits found:", currentTransits.length);
      } catch (e) {
        logger.warn("[chat-stream] Failed to compute transits:", e);
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

        // CombinedResult 인터페이스에 맞게 구성 (saju/astrology는 빈 객체로 기본값)
        const combinedResult: CombinedResult = {
          saju: (saju ?? {}) as unknown as CombinedResult['saju'],
          astrology: (astroWithTransits ?? {}) as unknown as CombinedResult['astrology'],
          extraPoints: advancedAstro?.extraPoints,
          asteroids: advancedAstro?.asteroids,
          solarReturn: advancedAstro?.solarReturn,
          lunarReturn: advancedAstro?.lunarReturn,
          progressions: advancedAstro?.progressions,
          draconic: advancedAstro?.draconic,
          harmonics: advancedAstro?.harmonics,
          fixedStars: advancedAstro?.fixedStars,
          eclipses: advancedAstro?.eclipses,
          electional: advancedAstro?.electional,
          midpoints: advancedAstro?.midpoints,
          meta: { generator: "chat-stream", generatedAt: new Date().toISOString() },
          summary: "",
        };

        // 🔍 DEBUG: Check what advanced data is available
        logger.warn(`[chat-stream] Advanced astro check:`, {
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
        logger.warn(`[chat-stream] v3.1 snapshot built: ${v3Snapshot.length} chars`);
      } catch (e) {
        logger.warn("[chat-stream] Failed to build v3.1 snapshot:", e);
      }
    }

    // Build prediction context section if available (TIER 1-10 분석 결과)
    let predictionSection = "";
    if (predictionContext) {
      try {
        const pc = predictionContext as {
          eventType?: string;
          eventLabel?: string;
          optimalPeriods?: Array<{ startDate: string; endDate: string; score: number; grade: string; reasons?: string[] }>;
          avoidPeriods?: Array<{ startDate: string; score: number; reasons?: string[] }>;
          advice?: string;
          tierAnalysis?: { tier7to10?: { confidence: number } };
        };
        const lines: string[] = [];

        if (lang === "ko") {
          lines.push("\n\n[🔮 인생 예측 분석 결과 (TIER 1-10)]");
          if (pc.eventType) lines.push(`이벤트 유형: ${pc.eventLabel || pc.eventType}`);

          if (pc.optimalPeriods?.length) {
            lines.push("\n✅ 최적 시기:");
            for (const period of pc.optimalPeriods.slice(0, 5)) {
              const start = new Date(period.startDate).toLocaleDateString('ko-KR');
              const end = new Date(period.endDate).toLocaleDateString('ko-KR');
              lines.push(`• ${start} ~ ${end} (${period.grade}등급, ${period.score}점)`);
              if (period.reasons?.length) {
                lines.push(`  이유: ${period.reasons.slice(0, 3).join(', ')}`);
              }
            }
          }

          if (pc.avoidPeriods?.length) {
            lines.push("\n⚠️ 피해야 할 시기:");
            for (const period of pc.avoidPeriods.slice(0, 3)) {
              const start = new Date(period.startDate).toLocaleDateString('ko-KR');
              lines.push(`• ${start} (${period.score}점) - ${period.reasons?.slice(0, 2).join(', ')}`);
            }
          }

          if (pc.advice) lines.push(`\n💡 조언: ${pc.advice}`);
          if (pc.tierAnalysis?.tier7to10?.confidence) {
            lines.push(`\n📊 분석 신뢰도: ${Math.round(pc.tierAnalysis.tier7to10.confidence * 100)}%`);
          }
        } else {
          lines.push("\n\n[🔮 Life Prediction Analysis (TIER 1-10)]");
          if (pc.eventType) lines.push(`Event Type: ${pc.eventLabel || pc.eventType}`);

          if (pc.optimalPeriods?.length) {
            lines.push("\n✅ Optimal Periods:");
            for (const period of pc.optimalPeriods.slice(0, 5)) {
              const start = new Date(period.startDate).toLocaleDateString('en-US');
              const end = new Date(period.endDate).toLocaleDateString('en-US');
              lines.push(`• ${start} ~ ${end} (Grade ${period.grade}, Score ${period.score})`);
              if (period.reasons?.length) {
                lines.push(`  Reasons: ${period.reasons.slice(0, 3).join(', ')}`);
              }
            }
          }

          if (pc.avoidPeriods?.length) {
            lines.push("\n⚠️ Periods to Avoid:");
            for (const period of pc.avoidPeriods.slice(0, 3)) {
              const start = new Date(period.startDate).toLocaleDateString('en-US');
              lines.push(`• ${start} (Score ${period.score}) - ${period.reasons?.slice(0, 2).join(', ')}`);
            }
          }

          if (pc.advice) lines.push(`\n💡 Advice: ${pc.advice}`);
          if (pc.tierAnalysis?.tier7to10?.confidence) {
            lines.push(`\n📊 Analysis Confidence: ${Math.round(pc.tierAnalysis.tier7to10.confidence * 100)}%`);
          }
        }

        predictionSection = lines.join("\n");
        logger.warn(`[chat-stream] Prediction context built: ${predictionSection.length} chars`);
      } catch (e) {
        logger.warn("[chat-stream] Failed to build prediction context:", e);
      }
    }

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

    // ========================================
    // 📅 ADVANCED ANALYSIS SECTIONS: Using modular builders
    // ========================================
    let timingScoreSection = "";
    let enhancedAnalysisSection = "";
    let daeunTransitSection = "";
    let advancedAstroSection = "";
    let tier4AdvancedSection = "";
    let pastAnalysisSection = "";
    let lifePredictionSection = "";

    if (saju?.dayMaster) {
      try {
        // Current year and age calculation
        const currentYear = new Date().getFullYear();
        const birthYear = effectiveBirthDate ? extractBirthYear(effectiveBirthDate) : undefined;
        const currentAge = birthYear ? currentYear - birthYear : undefined;

        // Build all analysis sections using modular builders
        timingScoreSection = buildAdvancedTimingSection(
          saju,
          effectiveBirthDate,
          theme,
          lang
        );

        enhancedAnalysisSection = buildDailyPrecisionSection(
          saju,
          theme,
          lang
        );

        daeunTransitSection = buildDaeunTransitSection(
          saju,
          effectiveBirthDate,
          lang
        );

        pastAnalysisSection = buildPastAnalysisSection(
          saju,
          astro,
          effectiveBirthDate,
          lastUser?.content || '',
          lang
        );

        lifePredictionSection = buildMultiYearTrendSection(
          saju,
          astro,
          effectiveBirthDate,
          theme,
          lang
        );

        advancedAstroSection = generateTier3Analysis({ saju, astro, lang }).section;
        tier4AdvancedSection = generateTier4Analysis({
          natalChartData: natalChartData || null,
          userAge: currentAge,
          currentYear,
          lang,
        }).section;

        logger.warn('[chat-stream] All analysis sections built using modular builders');
      } catch (e) {
        logger.warn("[chat-stream] Failed to generate advanced timing scores:", e);
      }
    }

    // Build long-term memory context section
    let longTermMemorySection = "";
    if (personaMemoryContext || recentSessionSummaries) {
      const memoryParts: string[] = [];

      if (personaMemoryContext) {
        memoryParts.push(lang === "ko"
          ? `[사용자 프로필] ${personaMemoryContext}`
          : `[User Profile] ${personaMemoryContext}`);
      }

      if (recentSessionSummaries) {
        memoryParts.push(lang === "ko"
          ? `[이전 상담 기록]\n${recentSessionSummaries}`
          : `[Previous Sessions]\n${recentSessionSummaries}`);
      }

      longTermMemorySection = [
        "",
        "═══════════════════════════════════════════════════════════════",
        lang === "ko" ? "[🧠 장기 기억 - 이전 상담 컨텍스트]" : "[🧠 LONG-TERM MEMORY - Previous Context]",
        "═══════════════════════════════════════════════════════════════",
        lang === "ko"
          ? "아래 정보를 참고하여 더 개인화된 상담을 제공하세요:"
          : "Use this context for more personalized counseling:",
        ...memoryParts,
        "",
      ].join("\n");
    }

    // Build prompt - FULL analysis with all advanced engines
    const chatPrompt = [
      counselorSystemPrompt(lang),
      `Name: ${name || "User"}`,
      themeContext,
      "",
      // 기본 사주/점성 데이터
      v3Snapshot ? `[사주/점성 기본 데이터]\n${v3Snapshot.slice(0, 5000)}` : "",
      // 🔮 고급 분석 섹션들 (모듈화된 빌더 사용)
      timingScoreSection ? `\n${timingScoreSection}` : "",
      enhancedAnalysisSection ? `\n${enhancedAnalysisSection}` : "",
      daeunTransitSection ? `\n${daeunTransitSection}` : "",
      advancedAstroSection ? `\n${advancedAstroSection}` : "",
      tier4AdvancedSection ? `\n${tier4AdvancedSection}` : "",
      pastAnalysisSection ? `\n${pastAnalysisSection}` : "",
      lifePredictionSection ? `\n${lifePredictionSection}` : "",
      // 🧠 장기 기억 - 이전 상담 컨텍스트
      longTermMemorySection ? `\n${longTermMemorySection}` : "",
      // 📊 인생 예측 컨텍스트 (프론트엔드에서 전달된 경우)
      predictionSection ? `\n${predictionSection}` : "",
      // 📜 대화 히스토리
      historyText ? `\n대화:\n${historyText}` : "",
      `\n질문: ${userQuestion}`,
    ].filter(Boolean).join("\n");

    // Get session_id from header for RAG cache
    const sessionId = req.headers.get("x-session-id") || undefined;

    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream("/ask-stream", {
      theme,
      prompt: chatPrompt,
      locale: lang,
      // Pass pre-computed chart data if available (instant response)
      saju: saju || undefined,
      astro: astro || undefined,
      // Advanced astrology features (draconic, harmonics, progressions, etc.)
      advanced_astro: advancedAstro || undefined,
      // Fallback: Pass birth info for backend to compute if needed
      birth: { date: effectiveBirthDate, time: effectiveBirthTime, gender: effectiveGender, lat: effectiveLatitude, lon: effectiveLongitude },
      // Conversation history for context-aware responses
      history: trimmedHistory.filter((m) => m.role !== "system"),
      // Session ID for RAG cache
      session_id: sessionId,
      // Premium: user context for returning users
      user_context: userContext || undefined,
      // CV/Resume text for career-related questions
      cv_text: cvText || undefined,
    }, { timeout: 60000 });

    if (!streamResult.ok) {
      logger.error("[DestinyMapChatStream] Backend error:", { status: streamResult.status, error: streamResult.error });

      const fallback = lang === "ko"
        ? "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
        : "Could not connect to AI service. Please try again.";

      return createFallbackSSEStream({
        content: fallback,
        done: true,
        "X-Fallback": "1"
      });
    }

    // Relay the stream from backend to frontend with sanitization
    return createTransformedSSEStream({
      source: streamResult.response,
      transform: (chunk) => {
        const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name);
        return masked;
      },
      route: "DestinyMapChatStream",
      additionalHeaders: {
        "X-Fallback": streamResult.response.headers.get("x-fallback") || "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[Chat-Stream API error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
