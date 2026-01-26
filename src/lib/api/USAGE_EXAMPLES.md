# API 사용 예시 가이드

## 목차
1. [기본 API 구현](#기본-api-구현)
2. [크레딧 기반 API](#크레딧-기반-api)
3. [스트리밍 API](#스트리밍-api)
4. [응답 검증](#응답-검증)
5. [에러 처리](#에러-처리)

---

## 기본 API 구현

### 예시 1: 간단한 Public API (Rate Limit만)

```typescript
// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware, createSimpleGuard, apiSuccess } from '@/lib/api/middleware';

export const GET = withApiMiddleware(
  async (req, context) => {
    // 간단한 헬스 체크
    return apiSuccess({
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'saju-astro-chat',
    });
  },
  createSimpleGuard({
    route: 'api/health',
    limit: 60,
    windowSeconds: 60,
  })
);
```

**특징**:
- Rate limiting만 적용 (60req/60s)
- 인증 불필요
- 자동 에러 처리

---

### 예시 2: 인증 필요 API

```typescript
// src/app/api/user/profile/route.ts
import { withApiMiddleware, createAuthenticatedGuard, apiSuccess, apiError } from '@/lib/api/middleware';
import { ErrorCodes } from '@/lib/api/errorHandler';
import { db } from '@/lib/db';

export const GET = withApiMiddleware(
  async (req, context) => {
    // context.userId는 자동으로 제공됨 (인증된 사용자만)
    const user = await db.user.findUnique({
      where: { id: context.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!user) {
      return apiError(ErrorCodes.NOT_FOUND, "사용자를 찾을 수 없습니다");
    }

    return apiSuccess(user);
  },
  createAuthenticatedGuard({
    route: 'api/user/profile',
    limit: 100,
    windowSeconds: 60,
  })
);
```

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "name": "홍길동",
    "plan": "premium",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 크레딧 기반 API

### 예시 3: Dream Analysis API (크레딧 소비)

```typescript
// src/app/api/dream/route.ts
import { NextRequest } from 'next/server';
import { withApiMiddleware, createAuthenticatedGuard, apiSuccess, apiError } from '@/lib/api/middleware';
import { DreamRequestSchema } from '@/lib/api/schemas';
import { ErrorCodes } from '@/lib/api/errorHandler';
import { analyzeDream } from '@/services/dreamService';

export const POST = withApiMiddleware(
  async (req, context) => {
    // 1. 요청 Body 파싱
    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError(ErrorCodes.BAD_REQUEST, "Invalid request body");
    }

    // 2. Zod 스키마 검증
    const validation = DreamRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${errors}`,
        validation.error.issues
      );
    }

    const { dream, symbols, emotions, locale } = validation.data;

    try {
      // 3. AI 분석 수행
      const analysis = await analyzeDream({
        dream,
        symbols,
        emotions,
        locale: locale || context.locale,
        userId: context.userId!,
      });

      // 4. 결과 저장 (선택)
      const saved = await saveDreamAnalysis(context.userId!, analysis);

      // 5. 성공 응답
      return apiSuccess({
        ...analysis,
        saved,
      });

    } catch (error) {
      // 에러 발생 시 크레딧 자동 환불
      if (context.refundCreditsOnError) {
        await context.refundCreditsOnError(
          "Dream analysis failed",
          { error: (error as Error).message }
        );
      }

      throw error; // withApiMiddleware가 에러 처리
    }
  },
  createAuthenticatedGuard({
    route: 'api/dream',
    limit: 30,
    windowSeconds: 60,
    requireCredits: true,      // ✅ 크레딧 자동 소비
    creditType: 'reading',
    creditAmount: 1,
  })
);
```

**성공 응답**:
```json
{
  "success": true,
  "data": {
    "analysis": "당신의 꿈은...",
    "symbols": [
      {
        "symbol": "물",
        "meaning": "정서적 흐름",
        "significance": "high"
      }
    ],
    "emotions": ["평온", "호기심"],
    "recommendations": ["명상 시간 갖기"],
    "saved": true
  }
}
```

**크레딧 부족 시 (402)**:
```json
{
  "error": "이번 달 리딩 횟수를 모두 사용했습니다.",
  "code": "no_credits",
  "remaining": 0,
  "upgradeUrl": "/pricing"
}
```

---

### 예시 4: 수동 크레딧 체크 (사전 검증)

```typescript
// src/app/api/tarot/preview/route.ts
import { checkCreditsOnly } from '@/lib/credits';
import { withApiMiddleware, createAuthenticatedGuard, apiSuccess } from '@/lib/api/middleware';

export const GET = withApiMiddleware(
  async (req, context) => {
    // 크레딧 소비 없이 체크만
    const creditCheck = await checkCreditsOnly("reading", 1);

    return apiSuccess({
      canProceed: creditCheck.allowed,
      remaining: creditCheck.remaining || 0,
      requiresUpgrade: !creditCheck.allowed,
    });
  },
  createAuthenticatedGuard({
    route: 'api/tarot/preview',
    limit: 100,
    windowSeconds: 60,
    // requireCredits: false (체크만 하고 소비 안 함)
  })
);
```

---

## 스트리밍 API

### 예시 5: SSE 스트리밍 (Destiny Map Chat)

```typescript
// src/app/api/destiny-map/chat-stream/route.ts
import { NextRequest } from 'next/server';
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware';
import { streamDestinyMapChat } from '@/services/destinyMapService';

export const POST = async (req: NextRequest) => {
  // 1. Middleware 초기화
  const guardOptions = createAuthenticatedGuard({
    route: 'destiny-map-chat-stream',
    limit: 60,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  });

  const { context, error } = await initializeApiContext(req, guardOptions);
  if (error) return error;

  // 2. Body 파싱 및 검증
  const body = await req.json().catch(() => null);
  if (!body || !body.userInput) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400 }
    );
  }

  // 3. 스트리밍 응답 생성
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await streamDestinyMapChat({
          userInput: body.userInput,
          birthData: body.birthData,
          userId: context.userId!,
          locale: context.locale,
        });

        // AI 응답을 SSE 형식으로 변환
        for await (const chunk of aiStream) {
          const sseData = `data: ${JSON.stringify({ chunk })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }

        // 완료 신호
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();

      } catch (error) {
        // 스트리밍 에러 처리
        const errorMsg = {
          event: 'error',
          data: JSON.stringify({
            error: '처리 중 오류가 발생했습니다',
            code: 'STREAM_ERROR'
          })
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`)
        );
        controller.close();

        // 크레딧 환불
        if (context.refundCreditsOnError) {
          await context.refundCreditsOnError(
            "Streaming failed",
            { error: (error as Error).message }
          );
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
```

**SSE 응답 형식**:
```
data: {"chunk":"운명의 흐름을 "}

data: {"chunk":"살펴보면..."}

data: [DONE]
```

---

## 응답 검증

### 예시 6: Zod 스키마로 응답 검증

```typescript
// src/app/api/compatibility/route.ts
import { z } from 'zod';
import { createValidatedSuccessResponse } from '@/lib/api/response-schemas';
import { withApiMiddleware, createAuthenticatedGuard } from '@/lib/api/middleware';

// 응답 데이터 스키마 정의
const CompatibilityDataSchema = z.object({
  score: z.number().min(0).max(100),
  analysis: z.string(),
  strengths: z.array(z.string()),
  challenges: z.array(z.string()),
  advice: z.string(),
});

export const POST = withApiMiddleware(
  async (req, context) => {
    const body = await req.json();

    const result = await analyzeCompatibility(
      body.person1,
      body.person2
    );

    // 스키마 검증 + 타입 안전 응답
    const validatedResponse = createValidatedSuccessResponse(
      CompatibilityDataSchema,
      result
    );

    // NextResponse로 변환
    return NextResponse.json(validatedResponse);
  },
  createAuthenticatedGuard({
    route: 'api/compatibility',
    requireCredits: true,
    creditType: 'compatibility',
    creditAmount: 1,
  })
);
```

---

### 예시 7: 클라이언트에서 응답 검증

```typescript
// src/hooks/useCompatibilityAnalysis.ts
import { CompatibilityResponseSchema } from '@/lib/api/response-schemas';
import { isSuccessResponse, isErrorResponse } from '@/lib/api/response-schemas';

export async function fetchCompatibility(data: CompatibilityRequest) {
  const response = await fetch('/api/compatibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await response.json();

  // 타입 가드로 응답 확인
  if (isSuccessResponse(json)) {
    // 스키마 검증
    const validated = CompatibilityResponseSchema.parse(json);
    return validated.data;
  }

  if (isErrorResponse(json)) {
    throw new Error(json.error.message);
  }

  throw new Error('Invalid response format');
}
```

---

## 에러 처리

### 예시 8: 다양한 에러 케이스 처리

```typescript
// src/app/api/saju/analysis/route.ts
import { withApiMiddleware, createAuthenticatedGuard, apiSuccess, apiError } from '@/lib/api/middleware';
import { ErrorCodes } from '@/lib/api/errorHandler';
import { SajuRequestSchema } from '@/lib/api/schemas';
import { analyzeSaju } from '@/services/sajuService';
import { withCircuitBreaker } from '@/lib/circuitBreaker';

export const POST = withApiMiddleware(
  async (req, context) => {
    // 1. Body 검증
    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError(ErrorCodes.BAD_REQUEST);
    }

    // 2. Zod 검증
    const validation = SajuRequestSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "입력 데이터를 확인해주세요",
        validation.error.issues
      );
    }

    const { birthData, question } = validation.data;

    // 3. 비즈니스 로직 검증
    const birthYear = parseInt(birthData.year);
    if (birthYear < 1900 || birthYear > 2100) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "생년월일이 유효하지 않습니다"
      );
    }

    // 4. Circuit Breaker로 외부 서비스 호출
    const { result, fromFallback } = await withCircuitBreaker(
      'saju-service',
      async () => {
        return await analyzeSaju(birthData, question, context.locale);
      },
      generateSajuFallback, // 장애 시 대체 응답
      {
        failureThreshold: 3,
        resetTimeoutMs: 60000,
      }
    );

    // 5. 백엔드 에러 발생했지만 대체 응답 사용
    if (fromFallback) {
      // 크레딧 환불
      if (context.refundCreditsOnError) {
        await context.refundCreditsOnError(
          "Backend service unavailable, using fallback",
          { service: 'saju-service' }
        );
      }

      // 대체 응답 반환 (200 OK지만 fromFallback: true 포함)
      return apiSuccess({
        ...result,
        fromFallback: true,
        notice: "일시적으로 간소화된 분석을 제공합니다",
      });
    }

    // 6. 정상 응답
    return apiSuccess(result);
  },
  createAuthenticatedGuard({
    route: 'api/saju/analysis',
    limit: 30,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  })
);

function generateSajuFallback(birthData: any, question: string) {
  return {
    analysis: "현재 상세 분석이 어려운 상황입니다. 잠시 후 다시 시도해주세요.",
    elements: [],
    recommendations: ["나중에 다시 확인해보세요"],
  };
}
```

---

### 예시 9: 커스텀 에러 응답

```typescript
// src/app/api/admin/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // 인증 체크
  if (!session?.user) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      locale: 'ko',
    });
  }

  // 관리자 권한 체크
  const userRole = await getUserRole(session.user.id);
  if (userRole !== 'admin') {
    return createErrorResponse({
      code: ErrorCodes.FORBIDDEN,
      message: "관리자만 접근할 수 있습니다",
      locale: 'ko',
    });
  }

  // 메트릭 조회
  const metrics = await getSystemMetrics();

  return NextResponse.json({
    success: true,
    data: metrics,
  });
}
```

---

## 전체 플로우 예시

### 예시 10: 완전한 Tarot Reading API

```typescript
// src/app/api/tarot/interpret/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  initializeApiContext,
  createPublicStreamGuard,
  parseJsonBody,
  validateRequired,
} from '@/lib/api/middleware';
import { TarotInterpretRequestSchema } from '@/lib/api/schemas';
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler';
import { interpretTarot } from '@/services/tarotService';
import { saveConsultation } from '@/services/consultationService';

export async function POST(req: NextRequest) {
  // 1. Middleware 초기화 (토큰 + Rate Limit + 크레딧)
  const guardOptions = createPublicStreamGuard({
    route: 'api/tarot/interpret',
    limit: 30,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  });

  const { context, error } = await initializeApiContext(req, guardOptions);
  if (error) return error; // 자동 에러 응답 (401/402/429 등)

  try {
    // 2. Body 파싱
    const body = await parseJsonBody<unknown>(req);

    // 3. Zod 스키마 검증
    const validation = TarotInterpretRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Validation failed: ${errors}`,
        details: validation.error.issues,
        locale: context.locale,
      });
    }

    const {
      cards,
      category,
      spread_id,
      user_question,
      language,
    } = validation.data;

    // 4. 비즈니스 로직 검증
    if (cards.length < 1 || cards.length > 10) {
      return createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "카드는 1~10장 선택 가능합니다",
        locale: context.locale,
      });
    }

    // 5. Tarot 해석 수행
    const interpretation = await interpretTarot({
      cards,
      category,
      spreadId: spread_id,
      question: user_question,
      language: language || context.locale,
      userId: context.userId, // 로그인한 경우만 제공
    });

    // 6. 결과 저장 (인증된 사용자만)
    let saved = false;
    if (context.isAuthenticated && context.userId) {
      await saveConsultation({
        userId: context.userId,
        theme: 'tarot',
        category,
        summary: interpretation.overall,
        fullReport: JSON.stringify(interpretation),
        locale: context.locale,
      });
      saved = true;
    }

    // 7. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        ...interpretation,
        saved,
      },
      meta: {
        timestamp: new Date().toISOString(),
        creditsRemaining: context.creditInfo?.remaining,
      },
    });

  } catch (error) {
    const e = error as Error;

    // 크레딧 환불 (서버 에러인 경우만)
    if (context.refundCreditsOnError) {
      await context.refundCreditsOnError(
        "Tarot interpretation failed",
        { error: e.message, stack: e.stack }
      );
    }

    // 에러 분류 및 응답
    let code = ErrorCodes.INTERNAL_ERROR;
    if (e.message?.includes('timeout')) {
      code = ErrorCodes.TIMEOUT;
    } else if (e.message?.includes('backend')) {
      code = ErrorCodes.BACKEND_ERROR;
    }

    return createErrorResponse({
      code,
      originalError: e,
      locale: context.locale,
      route: 'api/tarot/interpret',
    });
  }
}
```

---

## 테스트 예시

### 예시 11: API 엔드포인트 테스트

```typescript
// tests/api/dream.test.ts
import { POST } from '@/app/api/dream/route';
import { DreamAnalysisResponseSchema } from '@/lib/api/response-schemas';

describe('Dream API', () => {
  it('should return valid dream analysis', async () => {
    const req = new Request('http://localhost/api/dream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Public-Token': process.env.PUBLIC_API_TOKEN!,
      },
      body: JSON.stringify({
        dream: '하늘을 나는 꿈을 꿨습니다',
        symbols: ['하늘', '비행'],
        locale: 'ko',
      }),
    });

    const response = await POST(req);
    const json = await response.json();

    // 스키마 검증
    expect(() => {
      DreamAnalysisResponseSchema.parse(json);
    }).not.toThrow();

    expect(json.success).toBe(true);
    expect(json.data.analysis).toBeDefined();
  });

  it('should return 422 for invalid input', async () => {
    const req = new Request('http://localhost/api/dream', {
      method: 'POST',
      body: JSON.stringify({
        dream: '', // 너무 짧음
      }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 402 when credits exhausted', async () => {
    // 크레딧 모두 소진된 사용자로 테스트
    const req = new Request('http://localhost/api/dream', {
      method: 'POST',
      // ... exhausted user credentials
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(402);
    expect(json.code).toBe('no_credits');
    expect(json.upgradeUrl).toBe('/pricing');
  });
});
```

---

## 참고 자료

- **정책 문서**: [API_POLICY.md](./API_POLICY.md)
- **에러 가이드**: [ERROR_RESPONSE_GUIDE.md](./ERROR_RESPONSE_GUIDE.md)
- **스키마 정의**: [response-schemas.ts](./response-schemas.ts)
- **미들웨어**: [middleware.ts](./middleware.ts)

---

**마지막 업데이트**: 2026-01-26
