import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { saveConsultation, extractSummary } from '@/lib/consultation/saveConsultation';
import { withCircuitBreaker } from '@/lib/circuitBreaker';

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

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://localhost:5000';

// 서킷브레이커 설정: 3회 연속 실패 시 1분간 차단
const CIRCUIT_BREAKER_OPTIONS = {
  failureThreshold: 3,
  resetTimeoutMs: 60 * 1000,
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`dream-insight:${ip}`, { limit: 10, windowSeconds: 60 });

  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
  }

  if (!requirePublicToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
  }

  try {
    const body = await req.json();
    const { dream } = body;

    if (!dream || typeof dream !== 'string' || dream.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed dream description (at least 10 characters)' },
        { status: 400, headers: limit.headers }
      );
    }

    const acceptLanguage = req.headers.get('accept-language') || '';
    const locale = body.locale ||
      (acceptLanguage.includes('ko') ? 'ko' :
       acceptLanguage.includes('ja') ? 'ja' :
       acceptLanguage.includes('zh') ? 'zh' : 'en');

    // Fallback response generator
    const generateFallback = (): InsightResponse => ({
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
    });

    // Flask 백엔드 호출 (서킷브레이커 적용)
    const { result: response, fromFallback } = await withCircuitBreaker<InsightResponse>(
      'flask-dream',
      async () => {
        const flaskResponse = await fetch(`${FLASK_BACKEND_URL}/dream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN || ''}`,
          },
          body: JSON.stringify({
            dream: body.dream,
            symbols: body.symbols || [],
            emotions: body.emotions || [],
            themes: body.themes || [],
            context: body.context || [],
            locale,
            koreanTypes: body.koreanTypes || [],
            koreanLucky: body.koreanLucky || [],
            chinese: body.chinese || [],
            islamicTypes: body.islamicTypes || [],
            islamicBlessed: body.islamicBlessed || [],
            western: body.western || [],
            hindu: body.hindu || [],
            nativeAmerican: body.nativeAmerican || [],
            japanese: body.japanese || [],
            birth: body.birth,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!flaskResponse.ok) {
          throw new Error(`Flask returned ${flaskResponse.status}`);
        }

        const flaskData = await flaskResponse.json();
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
            symbols: body.symbols,
            emotions: body.emotions,
            themes: body.themes,
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
      console.warn('[dream-insight] Failed to save dream:', saveErr);
    }

    const res = NextResponse.json({ ...response, saved, fromFallback });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;

  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    captureServerError(error, { route: "/api/dream-insight", method: "POST" });
    return NextResponse.json(
      { error: error.message || "server error" },
      { status: 500 }
    );
  }
}
