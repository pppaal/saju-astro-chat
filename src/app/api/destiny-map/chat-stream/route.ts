import { getServerSession } from "next-auth";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText } from "@/lib/destiny-map/sanitize";
import { maskTextWithName } from "@/lib/security";
import { enforceBodySize } from "@/lib/http";
import { calculateSajuData } from "@/lib/Saju/saju";
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  toChart,
} from "@/lib/astrology";
import { buildAllDataPrompt } from "@/lib/destiny-map/prompt/fortune/base";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";
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
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
  calculateDailyPillar,
} from "@/lib/prediction/ultraPrecisionEngine";
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Constants that are only used locally in this file
const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);

export async function POST(request: Request) {
  try {
    const oversized = enforceBodySize(request, 256 * 1024); // 256KB for large chart data
    if (oversized) return oversized;

    const guard = await apiGuard(request, { path: "destiny-map-chat-stream", limit: 60, windowSeconds: 60 });
    if (guard instanceof Response) return guard;

    // Authentication check - always required unless explicitly bypassed for testing
    const allowDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV === "development";
    let userId: string | null = null;
    const session = await getServerSession(authOptions);

    if (!allowDevBypass && !session?.user?.email) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    userId = session?.user?.id || null;

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
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidDate(effectiveBirthDate)) {
      return new Response(JSON.stringify({ error: "Invalid birthDate" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidTime(effectiveBirthTime)) {
      return new Response(JSON.stringify({ error: "Invalid birthTime" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidLatitude(effectiveLatitude)) {
      return new Response(JSON.stringify({ error: "Invalid latitude" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!isValidLongitude(effectiveLongitude)) {
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
        const [year, month, day] = effectiveBirthDate.split("-").map(Number);
        const [hour, minute] = effectiveBirthTime.split(":").map(Number);
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
    // 📅 ADVANCED TIMING SCORE: Multi-layer + Branch Interactions
    // ========================================
    // 천간→오행 매핑 (로컬 헬퍼)
    const STEMS_MAP: Record<string, FiveElement> = {
      '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
      '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
    };

    let timingScoreSection = "";
    if (saju?.dayMaster && (theme === "year" || theme === "month" || theme === "today" || theme === "life" || theme === "chat")) {
      try {
        const dayStem = saju.dayMaster?.heavenlyStem || '甲';
        const dayBranch = saju?.pillars?.day?.earthlyBranch?.name || '子';
        const dayElement = (saju.dayMaster?.element as FiveElement) || '토';
        const yongsin: FiveElement[] = saju?.advancedAnalysis?.yongsin?.primary
          ? [saju.advancedAnalysis.yongsin.primary]
          : [];
        const kisin: FiveElement[] = saju?.advancedAnalysis?.yongsin?.avoid
          ? [saju.advancedAnalysis.yongsin.avoid]
          : [];

        // 현재 대운 추출
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const birthYear = effectiveBirthDate ? parseInt(effectiveBirthDate.split("-")[0]) : undefined;
        const currentAge = birthYear ? currentYear - birthYear : undefined;
        let currentDaeun: { stem: string; branch: string } | undefined;

        if (saju?.unse?.daeun && currentAge) {
          const daeunList = saju.unse.daeun as Array<{ startAge?: number; stem?: string; heavenlyStem?: string; branch?: string; earthlyBranch?: string }>;
          for (const d of daeunList) {
            const startAge = d.startAge ?? 0;
            if (currentAge >= startAge && currentAge < (startAge + 10)) {
              currentDaeun = {
                stem: d.stem || d.heavenlyStem || '甲',
                branch: d.branch || d.earthlyBranch || '子',
              };
              break;
            }
          }
        }

        // 고급 월별 점수 계산 (향후 6개월)
        const advancedScores: LayeredTimingScore[] = [];
        for (let i = 0; i < 6; i++) {
          let targetMonth = currentMonth + i;
          let targetYear = currentYear;
          if (targetMonth > 12) {
            targetMonth -= 12;
            targetYear++;
          }

          const score = calculateAdvancedMonthlyScore({
            year: targetYear,
            month: targetMonth,
            dayStem,
            dayBranch,
            daeun: currentDaeun,
            yongsin,
            kisin,
          });
          advancedScores.push(score);
        }

        // 기본 연간 예측도 병행 (호환성 유지)
        const yearlyPrediction = generateYearlyPrediction({
          year: currentYear,
          dayStem,
          dayElement,
          yongsin,
          kisin,
          currentDaeunElement: currentDaeun ? (STEMS_MAP[currentDaeun.stem] || '토') : undefined,
          birthYear,
        });

        // ========================================
        // 🔮 TIER 1 개선: 공망/신살/에너지/시간대 분석 (모든 테마에 추가)
        // ========================================
        let enhancedAnalysisSection = "";
        try {
          const today = new Date();
          const dailyPillar = calculateDailyPillar(today);
          const monthBranchVal = saju?.pillars?.month?.earthlyBranch?.name || '子';
          const yearBranchVal = saju?.pillars?.year?.earthlyBranch?.name || '子';
          const allStemsArr = [
            saju?.pillars?.year?.heavenlyStem?.name,
            saju?.pillars?.month?.heavenlyStem?.name,
            dayStem,
            saju?.pillars?.time?.heavenlyStem?.name,
          ].filter((x): x is string => Boolean(x));
          const allBranchesArr = [yearBranchVal, monthBranchVal, dayBranch, saju?.pillars?.time?.earthlyBranch?.name].filter((x): x is string => Boolean(x));

          // 공망 분석
          const gongmangResult = analyzeGongmang(dayStem, dayBranch, dailyPillar.branch);

          // 신살 분석
          const shinsalResult = analyzeShinsal(dayBranch, dailyPillar.branch);

          // 에너지 흐름 분석
          const energyResult = analyzeEnergyFlow(dayStem, allStemsArr, allBranchesArr);

          // 시간대별 조언
          const hourlyResult = generateHourlyAdvice(dailyPillar.stem, dailyPillar.branch);
          const excellentHours = hourlyResult.filter(h => h.quality === 'excellent').map(h => `${h.hour}시(${h.siGan})`);
          const goodHours = hourlyResult.filter(h => h.quality === 'good').map(h => `${h.hour}시`);
          const cautionHours = hourlyResult.filter(h => h.quality === 'caution').map(h => `${h.hour}시`);

          const enhancedParts: string[] = [
            "",
            "═══════════════════════════════════════════════════════════════",
            lang === "ko" ? "[🔮 오늘의 정밀 분석 - 공망/신살/에너지/시간대]" : "[🔮 TODAY'S PRECISION ANALYSIS - Gongmang/Shinsal/Energy/Hours]",
            "═══════════════════════════════════════════════════════════════",
            "",
            lang === "ko" ? `📅 오늘 일진: ${dailyPillar.stem}${dailyPillar.branch}` : `📅 Today: ${dailyPillar.stem}${dailyPillar.branch}`,
          ];

          // 공망 상태
          if (gongmangResult.isToday空) {
            enhancedParts.push(lang === "ko"
              ? `⚠️ 공망: ${gongmangResult.emptyBranches.join(', ')} 공망 - ${gongmangResult.affectedAreas.join(', ')} 관련 신중히`
              : `⚠️ Gongmang: ${gongmangResult.emptyBranches.join(', ')} empty - Be careful with ${gongmangResult.affectedAreas.join(', ')}`);
          } else {
            enhancedParts.push(lang === "ko"
              ? `✅ 공망: 영향 없음 (${gongmangResult.emptyBranches.join(', ')}는 공망이나 오늘과 무관)`
              : `✅ Gongmang: No effect today`);
          }

          // 신살 분석
          if (shinsalResult.active.length > 0) {
            const luckyShinsals = shinsalResult.active.filter(s => s.type === 'lucky');
            const unluckyShinsals = shinsalResult.active.filter(s => s.type === 'unlucky');
            const specialShinsals = shinsalResult.active.filter(s => s.type === 'special');

            if (luckyShinsals.length > 0) {
              enhancedParts.push(lang === "ko"
                ? `✨ 길신: ${luckyShinsals.map(s => `${s.name}(${s.affectedArea})`).join(', ')}`
                : `✨ Lucky: ${luckyShinsals.map(s => `${s.name}(${s.affectedArea})`).join(', ')}`);
            }
            if (unluckyShinsals.length > 0) {
              enhancedParts.push(lang === "ko"
                ? `⚠️ 흉신: ${unluckyShinsals.map(s => `${s.name}(${s.affectedArea})`).join(', ')}`
                : `⚠️ Caution: ${unluckyShinsals.map(s => `${s.name}(${s.affectedArea})`).join(', ')}`);
            }
            if (specialShinsals.length > 0) {
              enhancedParts.push(lang === "ko"
                ? `🔄 특수: ${specialShinsals.map(s => `${s.name}(${s.affectedArea})`).join(', ')}`
                : `🔄 Special: ${specialShinsals.map(s => `${s.name}(${s.affectedArea})`).join(', ')}`);
            }
          } else {
            enhancedParts.push(lang === "ko" ? `📊 신살: 특별한 신살 없음` : `📊 Shinsal: None active`);
          }

          // 에너지 강도
          const energyLabels: Record<string, { ko: string; en: string }> = {
            'very_strong': { ko: '매우 강함', en: 'Very Strong' },
            'strong': { ko: '강함', en: 'Strong' },
            'moderate': { ko: '보통', en: 'Moderate' },
            'weak': { ko: '약함', en: 'Weak' },
            'very_weak': { ko: '매우 약함', en: 'Very Weak' },
          };
          const energyLabel = energyLabels[energyResult.energyStrength] || { ko: '보통', en: 'Moderate' };
          enhancedParts.push(lang === "ko"
            ? `⚡ 에너지: ${energyResult.dominantElement} 기운 ${energyLabel.ko} (통근 ${energyResult.tonggeun.length}개, 투출 ${energyResult.tuechul.length}개)`
            : `⚡ Energy: ${energyResult.dominantElement} ${energyLabel.en} (Roots: ${energyResult.tonggeun.length}, Revealed: ${energyResult.tuechul.length})`);

          // 최적 시간대
          enhancedParts.push("");
          if (excellentHours.length > 0) {
            enhancedParts.push(lang === "ko"
              ? `🌟 최적 시간: ${excellentHours.slice(0, 4).join(', ')}`
              : `🌟 Best Hours: ${excellentHours.slice(0, 4).join(', ')}`);
          }
          if (goodHours.length > 0) {
            enhancedParts.push(lang === "ko"
              ? `👍 좋은 시간: ${goodHours.slice(0, 4).join(', ')}`
              : `👍 Good Hours: ${goodHours.slice(0, 4).join(', ')}`);
          }
          if (cautionHours.length > 0) {
            enhancedParts.push(lang === "ko"
              ? `⚠️ 주의 시간: ${cautionHours.slice(0, 3).join(', ')}`
              : `⚠️ Caution Hours: ${cautionHours.slice(0, 3).join(', ')}`);
          }

          enhancedParts.push("");
          enhancedAnalysisSection = enhancedParts.join("\n");
          logger.warn(`[chat-stream] Enhanced analysis: Gongmang=${gongmangResult.isToday空}, Shinsal=${shinsalResult.active.length}, Energy=${energyResult.energyStrength}`);
        } catch (e) {
          logger.warn("[chat-stream] Failed to generate enhanced analysis:", e);
        }

        // ========================================
        // 🔮 TIER 2 개선: 대운-트랜짓 동기화 + 과거 분석
        // ========================================
        let daeunTransitSection = "";
        try {
          // 대운 리스트가 있으면 트랜짓 동기화 분석
          if (saju?.unse?.daeun && currentAge) {
            const daeunList: DaeunInfo[] = convertSajuDaeunToInfo(saju.unse.daeun);
            if (daeunList.length > 0) {
              const syncAnalysis = analyzeDaeunTransitSync(daeunList, birthYear || currentYear - (currentAge || 30), currentAge);

              const daeunParts: string[] = [
                "",
                "═══════════════════════════════════════════════════════════════",
                lang === "ko" ? "[🌟 대운-트랜짓 동기화 분석 - 동양+서양 통합]" : "[🌟 DAEUN-TRANSIT SYNC - East+West Integration]",
                "═══════════════════════════════════════════════════════════════",
                "",
              ];

              // 인생 패턴
              daeunParts.push(lang === "ko"
                ? `📈 인생 패턴: ${syncAnalysis.lifeCyclePattern}`
                : `📈 Life Pattern: ${syncAnalysis.lifeCyclePattern}`);
              daeunParts.push(lang === "ko"
                ? `📊 분석 신뢰도: ${syncAnalysis.overallConfidence}%`
                : `📊 Confidence: ${syncAnalysis.overallConfidence}%`);

              // 주요 전환점 (최대 3개)
              if (syncAnalysis.majorTransitions.length > 0) {
                daeunParts.push("");
                daeunParts.push(lang === "ko" ? "--- 주요 전환점 ---" : "--- Major Transitions ---");
                for (const point of syncAnalysis.majorTransitions.slice(0, 3)) {
                  const marker = point.age === currentAge ? "★현재★ " : "";
                  daeunParts.push(lang === "ko"
                    ? `${marker}${point.age}세 (${point.year}년): ${point.synergyType} | 점수 ${point.synergyScore}`
                    : `${marker}Age ${point.age} (${point.year}): ${point.synergyType} | Score ${point.synergyScore}`);
                  if (point.themes.length > 0) {
                    daeunParts.push(`  → ${point.themes.slice(0, 2).join(', ')}`);
                  }
                }
              }

              // 피크/도전 연도
              if (syncAnalysis.peakYears.length > 0) {
                daeunParts.push("");
                daeunParts.push(lang === "ko"
                  ? `🌟 최고 시기: ${syncAnalysis.peakYears.slice(0, 3).map(p => `${p.age}세(${p.year}년)`).join(', ')}`
                  : `🌟 Peak Years: ${syncAnalysis.peakYears.slice(0, 3).map(p => `Age ${p.age}(${p.year})`).join(', ')}`);
              }
              if (syncAnalysis.challengeYears.length > 0) {
                daeunParts.push(lang === "ko"
                  ? `⚡ 도전 시기: ${syncAnalysis.challengeYears.slice(0, 3).map(p => `${p.age}세(${p.year}년)`).join(', ')}`
                  : `⚡ Challenge Years: ${syncAnalysis.challengeYears.slice(0, 3).map(p => `Age ${p.age}(${p.year})`).join(', ')}`);
              }

              daeunParts.push("");
              daeunTransitSection = daeunParts.join("\n");
              logger.warn(`[chat-stream] Daeun-Transit sync: ${syncAnalysis.majorTransitions.length} transitions, confidence ${syncAnalysis.overallConfidence}%`);
            }
          }
        } catch (e) {
          logger.warn("[chat-stream] Failed to generate daeun-transit sync:", e);
        }

        // ========================================
        // 🔮 TIER 3: 고급 점성술 + 사주 패턴 분석 (모듈화)
        // ========================================
        let advancedAstroSection = "";
        try {
          const tier3Result = generateTier3Analysis({ saju, astro, lang });
          advancedAstroSection = tier3Result.section;
          logger.warn(`[chat-stream] TIER 3 analysis completed`);
        } catch (e) {
          logger.warn("[chat-stream] Failed to generate TIER 3 analysis:", e);
        }

        // ========================================
        // 🌟 TIER 4: 고급 점성술 확장 (모듈화)
        // ========================================
        let tier4AdvancedSection = "";
        try {
          const userAge = currentAge || (birthYear ? currentYear - birthYear : undefined);
          const tier4Result = generateTier4Analysis({
            natalChartData: natalChartData || null,
            userAge,
            currentYear,
            lang,
          });
          tier4AdvancedSection = tier4Result.section;
          logger.warn(`[chat-stream] TIER 4 analysis completed`);
        } catch (e) {
          logger.warn("[chat-stream] Failed to generate TIER 4 analysis:", e);
        }

        // 구체적 날짜 추천 (질문에 특정 활동이 포함된 경우)
        let specificDateSection = "";
        const questionLower = userQuestion?.toLowerCase() || "";

        // 과거 분석 (과거 날짜 질문인 경우)
        let pastAnalysisSection = "";
        const pastKeywords = ['그때', '그 때', '그날', '과거', '전에', '이전', 'back then', 'that time', 'in the past', '왜 그랬', '무슨 일', '작년', '재작년', '몇년전', '몇 년 전'];
        const isPastQuestion = pastKeywords.some(kw => questionLower.includes(kw));

        // 과거 분석 활성화 (TIER 2)
        if (isPastQuestion && birthYear) {
          try {
            const monthBranchVal = saju?.pillars?.month?.earthlyBranch?.name || '子';
            const yearBranchVal = saju?.pillars?.year?.earthlyBranch?.name || '子';
            const allStemsArr = [
              saju?.pillars?.year?.heavenlyStem?.name,
              saju?.pillars?.month?.heavenlyStem?.name,
              dayStem,
              saju?.pillars?.time?.heavenlyStem?.name,
            ].filter((x): x is string => Boolean(x));
            const allBranchesArr = [yearBranchVal, monthBranchVal, dayBranch, saju?.pillars?.time?.earthlyBranch?.name].filter((x): x is string => Boolean(x));

            // 작년 또는 재작년 분석 (기본값)
            const yearsAgoMatch = questionLower.match(/(\d+)\s*년\s*전|(\d+)\s*years?\s*ago/);
            let targetYear = currentYear - 1; // 기본: 작년

            if (yearsAgoMatch) {
              const yearsAgo = parseInt(yearsAgoMatch[1] || yearsAgoMatch[2]);
              targetYear = currentYear - yearsAgo;
            } else if (questionLower.includes('재작년') || questionLower.includes('year before last')) {
              targetYear = currentYear - 2;
            }

            // 과거 날짜 분석
            const pastDate = new Date(targetYear, 6, 1); // 해당 연도 중간
            const predictionInput: LifePredictionInput = {
              birthYear,
              birthMonth: parseInt(effectiveBirthDate.split("-")[1]),
              birthDay: parseInt(effectiveBirthDate.split("-")[2]),
              gender: effectiveGender as 'male' | 'female',
              dayStem,
              dayBranch,
              monthBranch: monthBranchVal,
              yearBranch: yearBranchVal,
              allStems: allStemsArr,
              allBranches: allBranchesArr,
            };

            const retrospective = analyzePastDate(predictionInput, pastDate);
            const pastParts: string[] = [
              "",
              "═══════════════════════════════════════════════════════════════",
              lang === "ko" ? `[📚 과거 회고 분석 - ${targetYear}년]` : `[📚 PAST RETROSPECTIVE - ${targetYear}]`,
              "═══════════════════════════════════════════════════════════════",
              "",
              generatePastAnalysisPromptContext(retrospective, lang as "ko" | "en"),
              "",
              lang === "ko"
                ? "위 과거 분석을 참고하여 그 시기에 무슨 일이 있었을지, 왜 그랬는지 설명해주세요."
                : "Use the retrospective above to explain what happened during that period and why.",
              "",
            ];

            pastAnalysisSection = pastParts.join("\n");
            logger.warn(`[chat-stream] Past analysis: ${targetYear}, score ${retrospective.score}`);
          } catch (e) {
            logger.warn("[chat-stream] Failed to generate past analysis:", e);
          }
        }

        const activityKeywords: { keywords: string[]; activity: ActivityType }[] = [
          { keywords: ['결혼', '혼례', '웨딩', 'marry', 'wedding', 'marriage'], activity: 'marriage' },
          { keywords: ['약혼', 'engage', 'engagement'], activity: 'engagement' },
          { keywords: ['이사', 'move', 'moving', '입주'], activity: 'moving' },
          { keywords: ['사업', '창업', '개업', 'business', 'start company', 'opening'], activity: 'opening' },
          { keywords: ['계약', 'contract', '서명', 'sign'], activity: 'contract' },
          { keywords: ['면접', 'interview', '취업'], activity: 'interview' },
          { keywords: ['투자', 'invest', '주식', 'stock', '부동산'], activity: 'investment' },
          { keywords: ['여행', 'travel', 'trip', '휴가'], activity: 'travel' },
          { keywords: ['수술', 'surgery', '치료', 'operation'], activity: 'surgery' },
          { keywords: ['미팅', 'meeting', '회의', '상담'], activity: 'meeting' },
          { keywords: ['고백', '프로포즈', 'propose', 'confession', '데이트'], activity: 'proposal' },
          { keywords: ['시험', '공부', 'exam', 'test', 'study', '학습'], activity: 'study' },
          { keywords: ['이직', 'job change', 'career change', '퇴사', '전직'], activity: 'career_change' },
          { keywords: ['협상', 'negotiation', '거래'], activity: 'negotiation' },
        ];

        let detectedActivity: ActivityType | null = null;
        for (const { keywords, activity } of activityKeywords) {
          if (keywords.some(kw => questionLower.includes(kw))) {
            detectedActivity = activity;
            break;
          }
        }

        // 날짜 관련 질문인지 확인
        const isDateQuestion = [
          '언제', '날짜', '시기', '때', 'when', 'date', 'time', 'timing',
          '좋은 날', '길일', '최적', 'best day', 'good day', '추천'
        ].some(kw => questionLower.includes(kw));

        if (detectedActivity && isDateQuestion) {
          try {
            const monthBranch = saju?.pillars?.month?.earthlyBranch?.name || '子';
            const yearBranch = saju?.pillars?.year?.earthlyBranch?.name || '子';
            const allStems = [
              saju?.pillars?.year?.heavenlyStem?.name,
              saju?.pillars?.month?.heavenlyStem?.name,
              dayStem,
              saju?.pillars?.time?.heavenlyStem?.name,
            ].filter((x): x is string => Boolean(x));
            const allBranches = [yearBranch, monthBranch, dayBranch, saju?.pillars?.time?.earthlyBranch?.name].filter((x): x is string => Boolean(x));

            // 용신 추출
            const primaryYongsin = saju?.advancedAnalysis?.yongsin?.primary;

            const recommendations = findBestDates({
              activity: detectedActivity,
              dayStem,
              dayBranch,
              monthBranch,
              yearBranch,
              allStems,
              allBranches,
              yongsin: primaryYongsin,
              startDate: new Date(),
              searchDays: 60,
              topN: 5,
            });

            if (recommendations.length > 0) {
              specificDateSection = [
                "",
                "═══════════════════════════════════════════════════════════════",
                lang === "ko" ? `[📅 ${detectedActivity} 최적 날짜 추천]` : `[📅 Best Dates for ${detectedActivity}]`,
                "═══════════════════════════════════════════════════════════════",
                generateSpecificDatePromptContext(recommendations, detectedActivity, lang as "ko" | "en"),
                "",
                lang === "ko"
                  ? "위 구체적 날짜와 시간을 기반으로 사용자에게 추천하세요. 각 날짜의 점수와 이유를 설명하세요."
                  : "Recommend specific dates and times based on the above. Explain the scores and reasons.",
                "",
              ].join("\n");

              logger.warn(`[chat-stream] Specific date recommendations: ${recommendations.length} for ${detectedActivity}`);
            }

            // 용신 활성화 시점도 추가
            if (primaryYongsin) {
              const activations = findYongsinActivationPeriods(
                primaryYongsin,
                dayStem,
                new Date(),
                60
              );

              if (activations.length > 0) {
                specificDateSection += [
                  "",
                  generateYongsinPromptContext(activations.slice(0, 5), primaryYongsin, lang as "ko" | "en"),
                ].join("\n");
                logger.warn(`[chat-stream] Yongsin activation periods: ${activations.length} for ${primaryYongsin}`);
              }
            }
          } catch (e) {
            logger.warn("[chat-stream] Failed to generate specific date recommendations:", e);
          }
        }

        // 초정밀 일별 분석 (today 테마일 경우)
        let dailyAnalysisSection = "";
        if (theme === "today") {
          try {
            const monthBranch = saju?.pillars?.month?.earthlyBranch?.name || '子';
            const yearBranch = saju?.pillars?.year?.earthlyBranch?.name || '子';
            const allStems = [
              saju?.pillars?.year?.heavenlyStem?.name,
              saju?.pillars?.month?.heavenlyStem?.name,
              dayStem,
              saju?.pillars?.time?.heavenlyStem?.name,
            ].filter((x): x is string => Boolean(x));
            const allBranches = [yearBranch, monthBranch, dayBranch, saju?.pillars?.time?.earthlyBranch?.name].filter((x): x is string => Boolean(x));

            const weeklyScores = generateWeeklyPrediction(
              new Date(),
              dayStem,
              dayBranch,
              monthBranch,
              yearBranch,
              allStems,
              allBranches
            );

            dailyAnalysisSection = [
              "",
              "--- 초정밀 일별 분석 (일진+공망+신살+통근투출) ---",
              generateUltraPrecisionPromptContext(weeklyScores, lang as "ko" | "en"),
            ].join("\n");

            logger.warn(`[chat-stream] Ultra-precision daily analysis: ${weeklyScores.length} days`);
          } catch (e) {
            logger.warn("[chat-stream] Failed to generate daily analysis:", e);
          }
        }

        // 🔮 다년간 인생 예측 분석 (theme이 future, life-plan, career, marriage 등일 때)
        let lifePredictionSection = "";
        const lifePredictionThemes = ["future", "life-plan", "career", "marriage", "investment", "money", "love"];
        if (lifePredictionThemes.includes(theme) || theme === "general") {
          try {
            const birthYear = parseInt(effectiveBirthDate.split("-")[0]);
            const birthMonth = parseInt(effectiveBirthDate.split("-")[1]);
            const birthDayNum = parseInt(effectiveBirthDate.split("-")[2]);
            const monthBranch = saju?.pillars?.month?.earthlyBranch?.name || '子';
            const yearBranchVal = saju?.pillars?.year?.earthlyBranch?.name || '子';
            const allStems = [
              saju?.pillars?.year?.heavenlyStem?.name,
              saju?.pillars?.month?.heavenlyStem?.name,
              dayStem,
              saju?.pillars?.time?.heavenlyStem?.name,
            ].filter((x): x is string => Boolean(x));
            const allBranches = [yearBranchVal, monthBranch, dayBranch, saju?.pillars?.time?.earthlyBranch?.name].filter((x): x is string => Boolean(x));

            // 대운 정보 추출
            const daeunData = (saju?.daeun?.cycles || saju?.daeunCycles || []) as unknown[];
            const daeunList = daeunData.length > 0 ? convertSajuDaeunToInfo(daeunData as DaeunInfo[]) : undefined;

            // 용신/기신 추출
            const yongsinData = (saju?.yongsin as { elements?: unknown })?.elements || saju?.yongsin;
            const kisinData = (saju?.kisin as { elements?: unknown })?.elements || saju?.kisin;

            const predictionInput: LifePredictionInput = {
              birthYear,
              birthMonth,
              birthDay: birthDayNum,
              gender: effectiveGender as 'male' | 'female',
              dayStem,
              dayBranch,
              monthBranch,
              yearBranch: yearBranchVal,
              allStems,
              allBranches,
              daeunList,
              yongsin: yongsinData as FiveElement[] | undefined,
              kisin: kisinData as FiveElement[] | undefined,
            };

            const currentYear = new Date().getFullYear();
            const multiYearTrend = analyzeMultiYearTrend(predictionInput, currentYear - 2, currentYear + 8);

            const lifePredictionParts: string[] = [
              "",
              "═══════════════════════════════════════════════════════════════",
              lang === "ko" ? "[🔮 다년간 인생 예측 - 트렌드 + 대운 전환점]" : "[🔮 MULTI-YEAR LIFE PREDICTION - Trends + Daeun Transitions]",
              "═══════════════════════════════════════════════════════════════",
              generateLifePredictionPromptContext({
                input: predictionInput,
                generatedAt: new Date(),
                multiYearTrend,
                upcomingHighlights: [],
                confidence: daeunList ? 85 : 70,
              }, lang as "ko" | "en"),
            ];

            // 테마별 이벤트 타이밍 분석 추가
            const eventTypeMap: Record<string, EventType> = {
              'marriage': 'marriage',
              'love': 'relationship',
              'career': 'career',
              'investment': 'investment',
              'money': 'investment',
            };
            const eventType = eventTypeMap[theme];
            if (eventType) {
              const eventTiming = findOptimalEventTiming(predictionInput, eventType, currentYear, currentYear + 3);
              lifePredictionParts.push("");
              lifePredictionParts.push(lang === "ko" ? `--- ${eventType} 최적 타이밍 ---` : `--- ${eventType} Optimal Timing ---`);
              lifePredictionParts.push(generateEventTimingPromptContext(eventTiming, lang as "ko" | "en"));
            }

            lifePredictionParts.push("");
            lifePredictionParts.push(
              lang === "ko"
                ? "위 다년간 트렌드와 대운 전환점을 참고하여 장기적 관점의 조언을 제공하세요."
                : "Use the multi-year trends and daeun transitions above for long-term perspective advice."
            );

            lifePredictionSection = lifePredictionParts.join("\n");
            logger.warn(`[chat-stream] Life prediction: ${multiYearTrend.yearlyScores.length} years, trend: ${multiYearTrend.overallTrend}`);
          } catch (e) {
            logger.warn("[chat-stream] Failed to generate life prediction:", e);
          }
        }

        // 프롬프트용 컨텍스트 생성 (고급 + 기본 + 일별 + 구체적 날짜 + 인생 예측 + 강화 분석 + 고급 사주 + TIER 4 병합)
        timingScoreSection = [
          "",
          "═══════════════════════════════════════════════════════════════",
          lang === "ko" ? "[📅 정밀 월별 타이밍 분석 - 다층 레이어 + 합충형]" : "[📅 ADVANCED MONTHLY TIMING - Multi-layer + Branch Interactions]",
          "═══════════════════════════════════════════════════════════════",
          generateAdvancedTimingPromptContext(advancedScores, lang as "ko" | "en"),
          enhancedAnalysisSection,  // 🔮 오늘의 공망/신살/에너지/시간대 분석
          daeunTransitSection,      // 🌟 대운-트랜짓 동기화 분석
          advancedAstroSection,     // 🌙 고급 점성술 (달 위상/역행/패턴)
          tier4AdvancedSection,     // 🌟 TIER 4 (하모닉/이클립스/항성)
          dailyAnalysisSection,
          specificDateSection,      // 📅 구체적 날짜/시간 추천 추가
          lifePredictionSection,    // 🔮 다년간 인생 예측 추가
          pastAnalysisSection,      // 📚 과거 분석 (있을 경우)
          "",
          "--- 연간 종합 ---",
          generatePredictionPromptContext(yearlyPrediction, lang as "ko" | "en"),
          "",
          lang === "ko"
            ? "위 정밀 점수(12운성, 합충형, 다층 레이어, 일진, 공망, 신살, 대운-트랜짓, 달위상, 역행, 사주 패턴, 하모닉, 이클립스, 항성, 구체적 날짜 추천)를 참고하여 '3월 15일 오전 10시' 같은 구체적 시기를 제안하세요. 공망일에는 해당 영역 일을 피하고, 역행 시에는 계약/연애 결정을 미루라고 조언하세요. 이클립스 시즌에는 주요 변화에 대비하세요. 희귀 사주 패턴이나 왕의 별 영향이 있으면 특별히 언급하세요."
            : "Use the precise scores above to recommend specific dates and times like 'March 15th at 10 AM'. Advise avoiding activities in gongmang-affected areas. During retrogrades, advise delaying contracts/love decisions. Prepare for major changes during eclipse seasons. Mention rare Saju patterns or royal star influences if present.",
          "",
        ].join("\n");

        logger.warn(`[chat-stream] Advanced timing generated: ${advancedScores.length} months, avg confidence ${Math.round(advancedScores.reduce((s, m) => s + m.confidence, 0) / advancedScores.length)}%`);
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
      // 🔮 고급 분석 - 공망/신살/에너지/시간대/대운/트랜짓/하모닉/이클립스/항성
      timingScoreSection ? `\n${timingScoreSection}` : "",
      // 🧠 장기 기억 - 이전 상담 컨텍스트
      longTermMemorySection ? `\n${longTermMemorySection}` : "",
      // 📊 인생 예측 컨텍스트 (프론트엔드에서 전달된 경우)
      predictionSection ? `\n${predictionSection}` : "",
      // 📜 대화 히스토리
      historyText ? `\n대화:\n${historyText}` : "",
      `\n질문: ${userQuestion}`,
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
        birth: { date: effectiveBirthDate, time: effectiveBirthTime, gender: effectiveGender, lat: effectiveLatitude, lon: effectiveLongitude },
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
        let isClosed = false;
        const read = (): void => {
          reader.read().then(({ done, value }) => {
            if (isClosed) return;
            if (done) {
              isClosed = true;
              try { controller.close(); } catch { /* already closed */ }
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name);
            try { controller.enqueue(encoder.encode(masked)); } catch { /* already closed */ }
            read();
          }).catch((err) => {
            if (!isClosed) {
              logger.error("[chat-stream sanitize error]", err);
              isClosed = true;
              try { controller.close(); } catch { /* already closed */ }
            }
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
    logger.error("[Chat-Stream API error]", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
