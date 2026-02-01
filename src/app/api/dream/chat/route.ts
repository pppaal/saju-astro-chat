// src/app/api/dream/chat/route.ts
// Dream Follow-up Chat API - Enhanced with RAG, Celestial, and Saju context

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { enforceBodySize } from "@/lib/http";
import {
  cleanStringArray,
  normalizeMessages as normalizeMessagesBase,
  type ChatMessage,
} from "@/lib/api";
import { logger } from '@/lib/logger';


import { parseRequestBody } from '@/lib/api/requestParser';
// Message type imported from @/lib/api as ChatMessage, aliased below

interface CulturalNotes {
  korean?: string;
  western?: string;
  chinese?: string;
  islamic?: string;
}

interface MoonPhase {
  name?: string;
  korean?: string;
  emoji?: string;
  illumination?: number;
  dream_quality?: string;
  dream_meaning?: string;
  advice?: string;
}

interface MoonSign {
  sign?: string;
  korean?: string;
  dream_flavor?: string;
  enhanced_symbols?: string[];
}

interface Retrograde {
  planet?: string;
  korean?: string;
  emoji?: string;
  themes?: string[];
  interpretation?: string;
}

interface CelestialContext {
  moon_phase?: MoonPhase;
  moon_sign?: MoonSign;
  retrogrades?: Retrograde[];
}

interface SajuContext {
  birth_date?: string;
  birth_time?: string;
  birth_city?: string;
  timezone?: string;
}

interface PreviousConsultation {
  summary?: string;
  dreamText?: string;
  date?: string;
}

interface PersonaMemory {
  sessionCount?: number;
  keyInsights?: string[];
  emotionalTone?: string;
}

interface EnhancedDreamContext {
  dreamText: string;
  summary?: string;
  symbols?: string[];
  emotions?: string[];
  themes?: string[];
  recommendations?: string[];
  cultural_notes?: CulturalNotes;
  celestial?: CelestialContext;
  saju?: SajuContext;
  previous_consultations?: PreviousConsultation[];
  persona_memory?: PersonaMemory;
}

import { ALLOWED_LOCALES, MESSAGE_LIMITS, TEXT_LIMITS, LIST_LIMITS, BODY_LIMITS } from '@/lib/constants/api-limits';
import { HTTP_STATUS } from '@/lib/constants/http';
const ALLOWED_CHAT_LOCALES = ALLOWED_LOCALES;
const MAX_MESSAGES = MESSAGE_LIMITS.MAX_MESSAGES;
const MAX_MESSAGE_LENGTH = MESSAGE_LIMITS.MAX_MESSAGE_LENGTH;
const MAX_CONTEXT_FIELD = TEXT_LIMITS.MAX_CONTEXT;
const _MAX_CONTEXT_ITEMS = LIST_LIMITS.MAX_CONTEXT_ITEMS;
const _MAX_CONTEXT_ITEM_LEN = 200;
const MAX_CHAT_BODY = BODY_LIMITS.LARGE;

// Type alias for local usage (Message = ChatMessage from @/lib/api)
type Message = ChatMessage;

// Use shared normalizeMessages with local config
function normalizeMessages(raw: unknown): Message[] {
  return normalizeMessagesBase(raw, {
    maxMessages: MAX_MESSAGES,
    maxLength: MAX_MESSAGE_LENGTH,
  });
}

function normalizeCulturalNotes(raw: unknown): CulturalNotes | undefined {
  if (!raw || typeof raw !== "object") {return undefined;}
  const obj = raw as Record<string, unknown>;
  const result: CulturalNotes = {};

  if (typeof obj.korean === "string" && obj.korean.trim()) {
    result.korean = obj.korean.trim().slice(0, 500);
  }
  if (typeof obj.western === "string" && obj.western.trim()) {
    result.western = obj.western.trim().slice(0, 500);
  }
  if (typeof obj.chinese === "string" && obj.chinese.trim()) {
    result.chinese = obj.chinese.trim().slice(0, 500);
  }
  if (typeof obj.islamic === "string" && obj.islamic.trim()) {
    result.islamic = obj.islamic.trim().slice(0, 500);
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeCelestialContext(raw: unknown): CelestialContext | undefined {
  if (!raw || typeof raw !== "object") {return undefined;}
  const obj = raw as Record<string, unknown>;
  const result: CelestialContext = {};

  // Moon phase
  if (obj.moon_phase && typeof obj.moon_phase === "object") {
    const mp = obj.moon_phase as Record<string, unknown>;
    result.moon_phase = {
      name: typeof mp.name === "string" ? mp.name : undefined,
      korean: typeof mp.korean === "string" ? mp.korean : undefined,
      emoji: typeof mp.emoji === "string" ? mp.emoji : undefined,
      illumination: typeof mp.illumination === "number" ? mp.illumination : undefined,
      dream_quality: typeof mp.dream_quality === "string" ? mp.dream_quality : undefined,
      dream_meaning: typeof mp.dream_meaning === "string" ? mp.dream_meaning : undefined,
      advice: typeof mp.advice === "string" ? mp.advice : undefined,
    };
  }

  // Moon sign
  if (obj.moon_sign && typeof obj.moon_sign === "object") {
    const ms = obj.moon_sign as Record<string, unknown>;
    result.moon_sign = {
      sign: typeof ms.sign === "string" ? ms.sign : undefined,
      korean: typeof ms.korean === "string" ? ms.korean : undefined,
      dream_flavor: typeof ms.dream_flavor === "string" ? ms.dream_flavor : undefined,
      enhanced_symbols: Array.isArray(ms.enhanced_symbols)
        ? ms.enhanced_symbols.filter((s): s is string => typeof s === "string").slice(0, 10)
        : undefined,
    };
  }

  // Retrogrades
  if (Array.isArray(obj.retrogrades)) {
    result.retrogrades = obj.retrogrades
      .filter((r): r is Record<string, unknown> => r !== null && typeof r === "object")
      .slice(0, 5)
      .map(r => ({
        planet: typeof r.planet === "string" ? r.planet : undefined,
        korean: typeof r.korean === "string" ? r.korean : undefined,
        emoji: typeof r.emoji === "string" ? r.emoji : undefined,
        themes: Array.isArray(r.themes)
          ? r.themes.filter((t): t is string => typeof t === "string").slice(0, 5)
          : undefined,
        interpretation: typeof r.interpretation === "string" ? r.interpretation : undefined,
      }));
  }

  return (result.moon_phase || result.moon_sign || result.retrogrades) ? result : undefined;
}

function normalizeSajuContext(raw: unknown): SajuContext | undefined {
  if (!raw || typeof raw !== "object") {return undefined;}
  const obj = raw as Record<string, unknown>;

  // Must have at least birth_date
  if (typeof obj.birth_date !== "string" || !obj.birth_date.trim()) {
    return undefined;
  }

  return {
    birth_date: obj.birth_date.trim(),
    birth_time: typeof obj.birth_time === "string" ? obj.birth_time.trim() : undefined,
    birth_city: typeof obj.birth_city === "string" ? obj.birth_city.trim().slice(0, 100) : undefined,
    timezone: typeof obj.timezone === "string" ? obj.timezone.trim() : undefined,
  };
}

function normalizeEnhancedDreamContext(raw: unknown): EnhancedDreamContext | null {
  if (!raw || typeof raw !== "object") {return null;}
  const obj = raw as Record<string, unknown>;

  const dreamText = typeof obj.dreamText === "string" ? obj.dreamText.trim() : "";
  if (!dreamText || dreamText.length < 5) {return null;}

  const summary = typeof obj.summary === "string" ? obj.summary.trim().slice(0, MAX_CONTEXT_FIELD) : undefined;
  const symbols = cleanStringArray(obj.symbols);
  const emotions = cleanStringArray(obj.emotions);
  const themes = cleanStringArray(obj.themes);
  const recommendations = cleanStringArray(obj.recommendations);

  // Enhanced context
  const cultural_notes = normalizeCulturalNotes(obj.cultural_notes);
  const celestial = normalizeCelestialContext(obj.celestial);
  const saju = normalizeSajuContext(obj.saju);

  // Previous consultations for continuity
  let previous_consultations: PreviousConsultation[] | undefined;
  if (Array.isArray(obj.previous_consultations)) {
    previous_consultations = obj.previous_consultations
      .filter((c): c is Record<string, unknown> => c !== null && typeof c === "object")
      .slice(0, 5)
      .map(c => ({
        summary: typeof c.summary === "string" ? c.summary.slice(0, 300) : undefined,
        dreamText: typeof c.dreamText === "string" ? c.dreamText.slice(0, 200) : undefined,
        date: typeof c.date === "string" ? c.date : undefined,
      }));
  }

  // Persona memory for personalized responses
  let persona_memory: PersonaMemory | undefined;
  if (obj.persona_memory && typeof obj.persona_memory === "object") {
    const pm = obj.persona_memory as Record<string, unknown>;
    persona_memory = {
      sessionCount: typeof pm.sessionCount === "number" ? pm.sessionCount : undefined,
      keyInsights: Array.isArray(pm.keyInsights)
        ? pm.keyInsights.filter((i): i is string => typeof i === "string").slice(0, 5)
        : undefined,
      emotionalTone: typeof pm.emotionalTone === "string" ? pm.emotionalTone : undefined,
    };
  }

  return {
    dreamText: dreamText.slice(0, MAX_CONTEXT_FIELD),
    summary,
    symbols,
    emotions,
    themes,
    recommendations,
    cultural_notes,
    celestial,
    saju,
    previous_consultations,
    persona_memory,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth + credit consumption
    const guardOptions = createPublicStreamGuard({
      route: "dream-chat",
      limit: 20,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "followUp", // 꿈 해몽 후속 질문은 followUp 타입 사용
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) {return error;}

    const oversized = enforceBodySize(req, MAX_CHAT_BODY);
    if (oversized) {return oversized;}

    const body = await parseRequestBody<Record<string, unknown>>(req, { context: 'Dream Chat' });
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const locale = typeof body.locale === "string" && ALLOWED_CHAT_LOCALES.has(body.locale as string)
      ? body.locale as "ko" | "en"
      : (context.locale as "ko" | "en");
    const messages = normalizeMessages(body.messages);
    if (!messages.length) {
      return NextResponse.json({ error: "Messages required" }, { status: HTTP_STATUS.BAD_REQUEST });
    }
    const dreamContext = normalizeEnhancedDreamContext(body.dreamContext);
    if (!dreamContext) {
      return NextResponse.json({ error: "Invalid dream context" }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Credits already consumed by middleware

    // Build backend request with all context
    const backendPayload = {
      messages: messages,
      dream_context: {
        dream_text: dreamContext.dreamText,
        summary: dreamContext.summary,
        symbols: dreamContext.symbols,
        emotions: dreamContext.emotions,
        themes: dreamContext.themes,
        recommendations: dreamContext.recommendations,
        // Enhanced context for RAG + Saju + Celestial
        cultural_notes: dreamContext.cultural_notes,
        celestial: dreamContext.celestial,
        saju: dreamContext.saju,
        // Previous consultations for memory/continuity
        previous_consultations: dreamContext.previous_consultations,
        persona_memory: dreamContext.persona_memory,
      },
      language: locale
    };

    logger.info("[DreamChat] Sending enhanced context to backend:", {
      hasContext: !!dreamContext,
      hasCultural: !!dreamContext.cultural_notes,
      hasCelestial: !!dreamContext.celestial,
      hasSaju: !!dreamContext.saju,
      hasPreviousConsultations: !!dreamContext.previous_consultations?.length,
      hasPersonaMemory: !!dreamContext.persona_memory,
      symbolCount: dreamContext.symbols?.length || 0,
    });

    // Call backend streaming endpoint using apiClient (extended timeout for RAG)
    const streamResult = await apiClient.postSSEStream("/api/dream/chat-stream", backendPayload, { timeout: 45000 });

    if (!streamResult.ok) {
      logger.error("[DreamChat] Backend error:", { status: streamResult.status, error: streamResult.error });
      return NextResponse.json(
        { error: "Backend error", detail: streamResult.error },
        { status: streamResult.status || 500 }
      );
    }

    // Proxy the SSE stream from backend to client
    return createSSEStreamProxy({
      source: streamResult.response,
      route: "DreamChat"
    });

  } catch (err: unknown) {
    logger.error("Dream chat error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
