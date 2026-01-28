// src/app/api/numerology/route.ts
/**
 * Numerology Analysis API
 * 수비학 분석 API - 생년월일/이름 기반 수비학 프로필 및 궁합 분석
 */

import { NextResponse } from 'next/server';
import { apiClient } from "@/lib/api";
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
// Backend response types
interface NumerologyProfile {
  life_path?: { life_path: number };
  expression?: { expression: number };
  soul_urge?: { soul_urge: number };
  personality?: { personality: number };
  personal_year?: { personal_year: number; calculation?: string };
  personal_month?: { personal_month: number };
  personal_day?: { personal_day: number };
  korean_name_number?: { name_number: number; total_strokes: number };
}

interface NumerologyInterpretation {
  meaning?: string;
  description?: string;
  theme?: string;
}

interface NumerologyInterpretations {
  life_path?: NumerologyInterpretation;
  expression?: NumerologyInterpretation;
  soul_urge?: NumerologyInterpretation;
  personality?: NumerologyInterpretation;
  personal_year?: NumerologyInterpretation;
  personal_month?: NumerologyInterpretation;
  personal_day?: NumerologyInterpretation;
  korean_name?: NumerologyInterpretation;
}

interface NumerologyBackendData {
  profile?: NumerologyProfile;
  interpretations?: NumerologyInterpretations;
}

// Frontend response types
interface NumerologyNumberResult {
  number: number | undefined;
  meaning: string;
  description?: string;
  theme?: string;
  strokes?: number;
}

interface NumerologyTransformedResponse {
  lifePath: NumerologyNumberResult;
  expression?: NumerologyNumberResult;
  soulUrge?: NumerologyNumberResult;
  personality?: NumerologyNumberResult;
  personalYear?: { number: number | undefined; theme: string };
  personalMonth?: { number: number | undefined; theme: string };
  personalDay?: { number: number | undefined; theme: string };
  koreanName?: { number: number | undefined; strokes: number | undefined; meaning: string };
}

// 기본 수비학 계산 fallback 함수
function calculateLifePathNumber(birthDate: string): number {
  const digits = birthDate.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

function getLifePathMeaning(num: number, locale: string): { meaning: string; description: string } {
  const meanings: Record<number, { ko: { meaning: string; description: string }; en: { meaning: string; description: string } }> = {
    1: { ko: { meaning: '리더', description: '독립적이고 창의적인 리더십을 가진 개척자입니다.' }, en: { meaning: 'Leader', description: 'Independent and creative pioneer with leadership qualities.' } },
    2: { ko: { meaning: '협력자', description: '조화와 균형을 추구하는 외교적인 중재자입니다.' }, en: { meaning: 'Cooperator', description: 'Diplomatic mediator seeking harmony and balance.' } },
    3: { ko: { meaning: '표현자', description: '창의적이고 사교적인 자기표현의 달인입니다.' }, en: { meaning: 'Expresser', description: 'Creative and social master of self-expression.' } },
    4: { ko: { meaning: '건설자', description: '실용적이고 체계적인 안정의 건설자입니다.' }, en: { meaning: 'Builder', description: 'Practical and systematic builder of stability.' } },
    5: { ko: { meaning: '자유인', description: '변화와 모험을 사랑하는 자유로운 영혼입니다.' }, en: { meaning: 'Freedom Seeker', description: 'Free spirit who loves change and adventure.' } },
    6: { ko: { meaning: '양육자', description: '책임감 있고 헌신적인 가정의 수호자입니다.' }, en: { meaning: 'Nurturer', description: 'Responsible and devoted guardian of the home.' } },
    7: { ko: { meaning: '탐구자', description: '분석적이고 직관적인 진리의 탐구자입니다.' }, en: { meaning: 'Seeker', description: 'Analytical and intuitive seeker of truth.' } },
    8: { ko: { meaning: '성취자', description: '야심차고 목표지향적인 물질적 성공의 달인입니다.' }, en: { meaning: 'Achiever', description: 'Ambitious and goal-oriented master of material success.' } },
    9: { ko: { meaning: '인도주의자', description: '이타적이고 관대한 인류애의 봉사자입니다.' }, en: { meaning: 'Humanitarian', description: 'Altruistic and generous servant of humanity.' } },
    11: { ko: { meaning: '영감자', description: '직관적이고 영적인 영감의 전달자입니다.' }, en: { meaning: 'Inspirer', description: 'Intuitive and spiritual messenger of inspiration.' } },
    22: { ko: { meaning: '마스터 건설자', description: '비전을 현실로 만드는 위대한 건설자입니다.' }, en: { meaning: 'Master Builder', description: 'Great builder who turns visions into reality.' } },
    33: { ko: { meaning: '마스터 교사', description: '사랑과 치유로 인류를 이끄는 스승입니다.' }, en: { meaning: 'Master Teacher', description: 'Teacher who guides humanity with love and healing.' } },
  };
  const data = meanings[num] || meanings[9];
  return locale === 'ko' ? data.ko : data.en;
}

function generateNumerologyFallback(birthDate: string, locale: string): NumerologyTransformedResponse {
  const lifePathNum = calculateLifePathNumber(birthDate);
  const { meaning, description } = getLifePathMeaning(lifePathNum, locale);

  // 개인년도 계산
  const currentYear = new Date().getFullYear();
  const [, month, day] = birthDate.split('-').map(Number);
  let personalYearSum = currentYear + month + day;
  while (personalYearSum > 9) {
    personalYearSum = personalYearSum.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  }

  return {
    lifePath: { number: lifePathNum, meaning, description },
    personalYear: {
      number: personalYearSum,
      theme: locale === 'ko'
        ? `${currentYear}년은 ${personalYearSum}의 에너지가 흐릅니다.`
        : `${currentYear} carries the energy of ${personalYearSum}.`
    },
  };
}

/**
 * POST /api/numerology
 *
 * Request body:
 * {
 *   "action": "analyze" | "compatibility",
 *   "birthDate": "YYYY-MM-DD",
 *   "englishName": "Full Name" (optional),
 *   "koreanName": "한글이름" (optional),
 *   "locale": "ko",
 *   // For compatibility:
 *   "person1": { "birthDate": "...", "name": "..." },
 *   "person2": { "birthDate": "...", "name": "..." }
 * }
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers as Headers);
    const rlKey = `numerology:${ip}`;
    const limit = await rateLimit(rlKey, { limit: 30, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: limit.reset },
        { status: 429 }
      );
    }

    const body = await parseRequestBody<any>(req, { context: 'Numerology' });
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const action = body.action || 'analyze';
    const locale = body.locale || 'ko';

    let endpoint = '';
    let requestBody: Record<string, unknown> = {};

    if (action === 'analyze') {
      // Single person numerology analysis
      if (!body.birthDate) {
        return NextResponse.json({ error: 'birthDate is required' }, { status: 400 });
      }

      endpoint = '/api/numerology/analyze';
      requestBody = {
        birthDate: body.birthDate,
        englishName: body.englishName,
        koreanName: body.koreanName,
        locale,
      };
    } else if (action === 'compatibility') {
      // Two-person compatibility analysis
      const p1 = body.person1;
      const p2 = body.person2;

      if (!p1?.birthDate || !p2?.birthDate) {
        return NextResponse.json(
          { error: 'Both person1.birthDate and person2.birthDate are required' },
          { status: 400 }
        );
      }

      endpoint = '/api/numerology/compatibility';
      requestBody = {
        person1: { birthDate: p1.birthDate, name: p1.name },
        person2: { birthDate: p2.birthDate, name: p2.name },
        locale,
      };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Call backend using ApiClient
    const result = await apiClient.post(endpoint, requestBody, { timeout: 30000 });

    if (!result.ok) {
      logger.error('[Numerology API] Backend error:', { status: result.status, error: result.error });

      // Fallback: 백엔드 실패 시 기본 수비학 계산 제공
      if (action === 'analyze' && body.birthDate) {
        const fallbackResponse = generateNumerologyFallback(body.birthDate, locale);
        return NextResponse.json({ ...fallbackResponse, fromFallback: true });
      }

      return NextResponse.json(
        { error: locale === 'ko' ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : 'Backend service error', status: result.status },
        { status: result.status }
      );
    }

    // Transform backend response to frontend format
    const backendData = result.data as NumerologyBackendData;

    if (action === 'analyze' && backendData.profile) {
      const profile = backendData.profile;
      const interpretations = backendData.interpretations || {};

      const transformed: NumerologyTransformedResponse = {
        lifePath: {
          number: profile.life_path?.life_path,
          meaning: interpretations.life_path?.meaning || '',
          description: interpretations.life_path?.description || ''
        }
      };

      // Optional expression number
      if (profile.expression) {
        transformed.expression = {
          number: profile.expression.expression,
          meaning: interpretations.expression?.meaning || '',
          description: interpretations.expression?.description || ''
        };
      }

      // Optional soul urge
      if (profile.soul_urge) {
        transformed.soulUrge = {
          number: profile.soul_urge.soul_urge,
          meaning: interpretations.soul_urge?.meaning || '',
          description: interpretations.soul_urge?.description || ''
        };
      }

      // Optional personality
      if (profile.personality) {
        transformed.personality = {
          number: profile.personality.personality,
          meaning: interpretations.personality?.meaning || '',
          description: interpretations.personality?.description || ''
        };
      }

      // Personal cycles
      if (profile.personal_year) {
        transformed.personalYear = {
          number: profile.personal_year.personal_year,
          theme: interpretations.personal_year?.theme || profile.personal_year.calculation || ''
        };
      }

      if (profile.personal_month) {
        transformed.personalMonth = {
          number: profile.personal_month.personal_month,
          theme: interpretations.personal_month?.theme || ''
        };
      }

      if (profile.personal_day) {
        transformed.personalDay = {
          number: profile.personal_day.personal_day,
          theme: interpretations.personal_day?.theme || ''
        };
      }

      // Korean name
      if (profile.korean_name_number) {
        transformed.koreanName = {
          number: profile.korean_name_number.name_number,
          strokes: profile.korean_name_number.total_strokes,
          meaning: interpretations.korean_name?.meaning || ''
        };
      }

      return NextResponse.json(transformed);
    }

    return NextResponse.json(result.data);

  } catch (error) {
    logger.error('[API /api/numerology] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal Server Error: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/numerology?birthDate=YYYY-MM-DD&name=...
 * Quick single-person analysis
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const birthDate = url.searchParams.get('birthDate');
    const englishName = url.searchParams.get('name') || url.searchParams.get('englishName');
    const koreanName = url.searchParams.get('koreanName');
    const locale = url.searchParams.get('locale') || 'ko';

    if (!birthDate) {
      return NextResponse.json({ error: 'birthDate query param is required' }, { status: 400 });
    }

    const ip = getClientIp(req.headers as Headers);
    const rlKey = `numerology-get:${ip}`;
    const limit = await rateLimit(rlKey, { limit: 60, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: limit.reset },
        { status: 429 }
      );
    }

    const result = await apiClient.post('/api/numerology/analyze', {
      birthDate,
      englishName,
      koreanName,
      locale,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Backend service error' },
        { status: result.status }
      );
    }

    // Transform backend response to frontend format
    const backendData = result.data as NumerologyBackendData;

    if (backendData.profile) {
      const profile = backendData.profile;
      const interpretations = backendData.interpretations || {};

      const transformed: NumerologyTransformedResponse = {
        lifePath: {
          number: profile.life_path?.life_path,
          meaning: interpretations.life_path?.meaning || '',
          description: interpretations.life_path?.description || ''
        }
      };

      // Optional fields
      if (profile.expression) {
        transformed.expression = {
          number: profile.expression.expression,
          meaning: interpretations.expression?.meaning || '',
          description: interpretations.expression?.description || ''
        };
      }

      if (profile.soul_urge) {
        transformed.soulUrge = {
          number: profile.soul_urge.soul_urge,
          meaning: interpretations.soul_urge?.meaning || '',
          description: interpretations.soul_urge?.description || ''
        };
      }

      if (profile.personality) {
        transformed.personality = {
          number: profile.personality.personality,
          meaning: interpretations.personality?.meaning || '',
          description: interpretations.personality?.description || ''
        };
      }

      if (profile.personal_year) {
        transformed.personalYear = {
          number: profile.personal_year.personal_year,
          theme: interpretations.personal_year?.theme || profile.personal_year.calculation || ''
        };
      }

      if (profile.personal_month) {
        transformed.personalMonth = {
          number: profile.personal_month.personal_month,
          theme: interpretations.personal_month?.theme || ''
        };
      }

      if (profile.personal_day) {
        transformed.personalDay = {
          number: profile.personal_day.personal_day,
          theme: interpretations.personal_day?.theme || ''
        };
      }

      if (profile.korean_name_number) {
        transformed.koreanName = {
          number: profile.korean_name_number.name_number,
          strokes: profile.korean_name_number.total_strokes,
          meaning: interpretations.korean_name?.meaning || ''
        };
      }

      return NextResponse.json(transformed);
    }

    return NextResponse.json(result.data);

  } catch (error) {
    logger.error('[API /api/numerology GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
