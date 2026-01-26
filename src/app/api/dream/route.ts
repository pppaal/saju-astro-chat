import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/ApiClient';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { saveConsultation, extractSummary } from '@/lib/consultation/saveConsultation';
import { withCircuitBreaker } from '@/lib/circuitBreaker';
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits';
import { logger } from '@/lib/logger';
import { sanitizeError } from '@/lib/security/errorSanitizer';
import { DreamRequestSchema, type DreamRequest } from '@/lib/validation';
import type { ZodIssue } from 'zod';
import { recordApiRequest } from '@/lib/metrics/index';

type SymbolCombination = {
  combination: string;
  meaning: string;
  interpretation: string;
  fortune_type: string;
  is_lucky: boolean;
  lucky_score: number;
};

type TaemongSymbol = {
  symbol: string;
  child_trait: string;
  gender_hint: string;
  interpretation: string;
  celebrity_examples: string[];
  lucky_score: number;
};

type TaemongResult = {
  is_taemong: boolean;
  symbols: TaemongSymbol[];
  primary_symbol: TaemongSymbol | null;
};

type LuckyNumbersResult = {
  numbers: number[];
  matched_symbols: string[];
  dominant_element: string | null;
  element_analysis: string | null;
  confidence: number;
};

type PremiumFeatures = {
  combinations?: SymbolCombination[] | null;
  taemong?: TaemongResult | null;
  lucky_numbers?: LuckyNumbersResult | null;
};

type MoonPhase = {
  name: string;
  korean: string;
  emoji: string;
  illumination: number;
  age_days: number;
  dream_quality: string;
  dream_meaning: string;
  favorable_symbols: string[];
  intensified_symbols: string[];
  advice: string;
  weight_modifier: number;
  enhanced_themes: string[];
};

type MoonSign = {
  sign: string;
  korean: string;
  dream_flavor: string;
  enhanced_symbols: string[];
};

type RetrogradeEffect = {
  planet: string;
  korean: string;
  emoji?: string;
  themes: string[];
  common_symbols?: string[];
  interpretation?: string;
};

type PlanetaryAspect = {
  aspect: string;
  themes: string[];
  special_note?: string;
  interpretation?: string;
};

type PlanetPosition = {
  name: string;
  name_ko: string;
  sign: string;
  sign_ko: string;
  retrograde: boolean;
};

type CelestialContext = {
  timestamp: string;
  moon_phase: MoonPhase;
  moon_sign: MoonSign;
  retrogrades: RetrogradeEffect[];
  significant_aspects: PlanetaryAspect[];
  planets: PlanetPosition[];
  source: string;
};

type InsightResponse = {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  astrology?: { highlights: string[]; sun?: string; moon?: string; asc?: string };
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[];
  culturalNotes?: {
    korean?: string;
    chinese?: string;
    islamic?: string;
    western?: string;
  };
  luckyElements?: {
    isLucky?: boolean;
    luckyNumbers?: number[];
    luckyColors?: string[];
    advice?: string;
    matchedSymbols?: string[];
    elementAnalysis?: string;
    confidence?: number;
  };
  premiumFeatures?: PremiumFeatures;
  celestial?: CelestialContext | null;
  saved?: boolean;
  fromFallback?: boolean;
  error?: string;
};


// 서킷브레이커 설정: 3회 연속 실패 시 1분간 차단
const CIRCUIT_BREAKER_OPTIONS = {
  failureThreshold: 3,
  resetTimeoutMs: 60 * 1000,
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`dream:${ip}`, { limit: 10, windowSeconds: 60 });

  if (!limit.allowed) {
    recordApiRequest('dream', 'analyze', 'rate_limited');
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
  }

  const tokenCheck = requirePublicToken(req);
  if (!tokenCheck.valid) {
    recordApiRequest('dream', 'analyze', 'error');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
  }

  try {
    // Parse and validate request body using Zod schema
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      recordApiRequest('dream', 'analyze', 'validation_error');
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: limit.headers }
      );
    }

    // Support legacy field name
    if (rawBody.dreamText && !rawBody.dream) {
      rawBody.dream = rawBody.dreamText;
    }

    // Detect locale from headers if not provided
    if (!rawBody.locale) {
      const acceptLanguage = req.headers.get('accept-language') || '';
      rawBody.locale = acceptLanguage.includes('ko') ? 'ko' :
                       acceptLanguage.includes('ja') ? 'ja' :
                       acceptLanguage.includes('zh') ? 'zh' : 'en';
    }

    // Validate with Zod schema
    const validation = DreamRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      const errors = validation.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      recordApiRequest('dream', 'analyze', 'validation_error');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400, headers: limit.headers }
      );
    }

    const validatedBody: DreamRequest = validation.data;
    const { dream, locale, symbols, emotions, themes, context, birth } = validatedBody;

    const creditResult = await checkAndConsumeCredits("reading", 1);
    if (!creditResult.allowed) {
      const res = creditErrorResponse(creditResult);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Fallback response generator - locale-aware
    const generateFallback = (): InsightResponse => {
      if (locale === 'ko') {
        return {
          summary: `"${dream.substring(0, 50)}..."에 대한 꿈은 개인적인 탐구와 내면의 지혜와 관련된 주제를 반영합니다. 상징들은 잠재의식으로부터의 의미 있는 메시지를 암시합니다.`,
          dreamSymbols: [
            { label: '핵심 주제', meaning: '개인적 성장과 자기 발견' },
            { label: '감정적 뉘앙스', meaning: '삶의 경험 처리' }
          ],
          themes: [
            { label: '자기 성찰', weight: 0.80 },
            { label: '변화', weight: 0.70 },
            { label: '인도', weight: 0.65 }
          ],
          astrology: {
            highlights: ['이 시기의 꿈은 더욱 깊은 의미를 지닙니다'],
            moon: '달의 에너지가 꿈의 명료함을 높여줍니다'
          },
          crossInsights: [
            '잠재의식이 중요한 삶의 주제를 처리하고 있습니다',
            '앞으로의 꿈에서 반복되는 상징에 주의를 기울이세요'
          ],
          recommendations: [
            '침대 옆에 꿈 일기를 두세요',
            '꿈을 꾸는 동안 느꼈던 감정을 되돌아보세요',
            '이 상징들과 관련될 수 있는 현재 삶의 상황을 생각해보세요'
          ],
          culturalNotes: {
            korean: '이 꿈은 내면의 지혜와 연결되어 있습니다.',
            western: '이 꿈은 통합을 추구하는 당신 내면의 측면을 나타냅니다.'
          }
        };
      }
      return {
        summary: `Your dream about "${dream.substring(0, 50)}..." reflects themes of personal exploration and inner wisdom. The symbols suggest meaningful messages from your subconscious.`,
        dreamSymbols: [
          { label: 'Core Theme', meaning: 'Personal growth and self-discovery' },
          { label: 'Emotional Undertone', meaning: 'Processing life experiences' }
        ],
        themes: [
          { label: 'Self-Reflection', weight: 0.80 },
          { label: 'Transformation', weight: 0.70 },
          { label: 'Guidance', weight: 0.65 }
        ],
        astrology: {
          highlights: ['Dreams at this time carry heightened significance'],
          moon: 'Lunar energy enhances dream clarity'
        },
        crossInsights: [
          'Your subconscious is processing important life themes',
          'Pay attention to recurring symbols in future dreams'
        ],
        recommendations: [
          'Keep a dream journal by your bed',
          'Reflect on the emotions you felt during the dream',
          'Consider what current life situations might relate to these symbols'
        ],
        culturalNotes: {
          korean: '이 꿈은 내면의 지혜와 연결되어 있습니다.',
          western: 'The dream represents aspects of your psyche seeking integration.'
        }
      };
    };

    // Flask 백엔드 호출 (서킷브레이커 적용)
    const { result: response, fromFallback } = await withCircuitBreaker<InsightResponse>(
      'flask-dream',
      async () => {
        const apiResponse = await apiClient.post('/api/dream', {
          dream,
          symbols: symbols || [],
          emotions: emotions || [],
          themes: themes || [],
          context: context || [],
          locale,
          koreanTypes: rawBody.koreanTypes || [],
          koreanLucky: rawBody.koreanLucky || [],
          chinese: rawBody.chinese || [],
          islamicTypes: rawBody.islamicTypes || [],
          islamicBlessed: rawBody.islamicBlessed || [],
          western: rawBody.western || [],
          hindu: rawBody.hindu || [],
          nativeAmerican: rawBody.nativeAmerican || [],
          japanese: rawBody.japanese || [],
          birth,
        }, { timeout: 30000 });

        if (!apiResponse.ok) {
          throw new Error(`Flask returned ${apiResponse.status}`);
        }

        const flaskData = apiResponse.data as { status: string; data: InsightResponse };
        if (flaskData.status !== 'success' || !flaskData.data) {
          throw new Error('Flask returned invalid response');
        }

        const data = flaskData.data;
        return {
          summary: data.summary,
          dreamSymbols: data.dreamSymbols,
          themes: data.themes,
          astrology: data.astrology,
          crossInsights: data.crossInsights,
          recommendations: data.recommendations,
          culturalNotes: data.culturalNotes,
          luckyElements: data.luckyElements,
          premiumFeatures: data.premium_features,
          celestial: data.celestial,
        };
      },
      generateFallback,
      CIRCUIT_BREAKER_OPTIONS
    );

    // 로그인된 사용자는 결과 저장
    let saved = false;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const fullReport = [
          response.summary,
          response.crossInsights?.join('\n'),
          response.recommendations?.join('\n'),
        ].filter(Boolean).join('\n\n');

        const result = await saveConsultation({
          userId: session.user.id,
          theme: 'dream',
          summary: extractSummary(response.summary || dream.substring(0, 100)),
          fullReport,
          signals: {
            symbols,
            emotions,
            themes,
            dreamSymbols: response.dreamSymbols,
            luckyElements: response.luckyElements,
            premiumFeatures: response.premiumFeatures,
            celestial: response.celestial,
          },
          userQuestion: dream,
          locale,
        });
        saved = result.success;
      }
    } catch (saveErr) {
      logger.warn('[Dream API] Failed to save dream:', saveErr);
    }

    // Record successful request with timing
    recordApiRequest('dream', 'analyze', 'success', Date.now() - startTime);

    const res = NextResponse.json({ ...response, saved, fromFallback });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;

  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    captureServerError(error, { route: "/api/dream", method: "POST" });
    recordApiRequest('dream', 'analyze', 'error', Date.now() - startTime);
    return NextResponse.json(
      { error: error.message || "server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`dream:get:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
  }
  const tokenCheck = requirePublicToken(req); if (!tokenCheck.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
  }
  try {
    const res = NextResponse.json({ message: 'Dream API alive!' });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    captureServerError(error, { route: "/api/dream", method: "GET" });
    const sanitized = sanitizeError(e, 'internal');
    return NextResponse.json(sanitized, { status: 500 });
  }
}
