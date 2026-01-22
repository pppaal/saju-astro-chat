# API Migration Guide - Standard Error Response Format

## 🎯 목표
모든 API 라우트를 표준화된 에러 응답 형식으로 마이그레이션

---

## 📦 새로운 도구

### 1. API Handler Wrapper
**파일**: `src/lib/api/apiHandler.ts`

**기능**:
- 자동 Rate Limiting
- 자동 Authentication 체크
- 자동 Request Body/Query Validation (Zod)
- 표준화된 Success/Error Response
- 자동 Error Logging

### 2. Error Response System
**파일**: `src/lib/api/errorResponse.ts`

**제공 함수**:
- `createSuccessResponse<T>(data)` - 성공 응답
- `validationError(message, details)` - 400 검증 실패
- `unauthorizedError(message)` - 401 인증 필요
- `insufficientCreditsError(required, available)` - 403 크레딧 부족
- `rateLimitError(retryAfter)` - 429 요청 제한
- `notFoundError(resourceType)` - 404 리소스 없음
- `internalError(message, details)` - 500 서버 에러

---

## 🔄 마이그레이션 전/후 비교

### Before (기존 방식) ❌

```typescript
// src/app/api/example/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';

export async function POST(request: Request) {
  try {
    // Manual rate limiting
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`example:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Manual authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manual body parsing & validation
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 3 || name.length > 100) {
      return NextResponse.json({ error: "Name must be 3-100 characters" }, { status: 400 });
    }

    // Business logic
    const result = await createSomething({ name, userId: session.user.id });

    // Manual success response (inconsistent format)
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**문제점**:
- 코드 중복 (rate limit, auth, validation)
- 에러 응답 형식 불일치
- 타입 안전성 부족
- 에러 로깅 불일치
- requestId, timestamp 누락

---

### After (표준화된 방식) ✅

```typescript
// src/app/api/example/route.ts
import { z } from 'zod';
import { withAuth } from '@/lib/api/apiHandler';

// 1. Define validation schema
const requestSchema = z.object({
  name: z.string().min(3).max(100),
});

// 2. Use withAuth wrapper (includes rate limiting + auth + validation)
export const POST = withAuth(
  {
    bodySchema: requestSchema,
    rateLimit: {
      key: 'create-example',
      limit: 10,
      windowSeconds: 60,
    },
  },
  async ({ body, session }) => {
    // Business logic only - validation & auth already done
    const result = await createSomething({
      name: body.name, // Type-safe!
      userId: session.user.id,
    });

    return { result }; // Automatically wrapped in standard success response
  }
);
```

**개선 사항**:
- ✅ 코드 70% 단축
- ✅ 타입 안전 (Zod 스키마)
- ✅ 표준화된 응답 형식
- ✅ 자동 에러 로깅
- ✅ requestId, timestamp 자동 추가
- ✅ 재사용 가능한 코드

---

## 📝 표준 응답 형식

### Success Response (200)
```json
{
  "data": { /* your data */ },
  "requestId": "abc123xyz",
  "timestamp": "2026-01-22T12:00:00.000Z"
}
```

### Error Response (4xx/5xx)
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "requestId": "abc123xyz",
  "timestamp": "2026-01-22T12:00:00.000Z",
  "details": {
    "errors": [
      { "path": "name", "message": "Name must be at least 3 characters" }
    ]
  },
  "suggestedAction": "Please check your input and try again"
}
```

---

## 🚀 마이그레이션 단계

### Step 1: Import 추가
```typescript
import { z } from 'zod';
import { withAuth, withPublicApi } from '@/lib/api/apiHandler';
// OR import specific error helpers
import { validationError, unauthorizedError } from '@/lib/api/errorResponse';
```

### Step 2: 스키마 정의 (선택)
```typescript
const bodySchema = z.object({
  field1: z.string(),
  field2: z.number(),
});
```

### Step 3: Handler 래핑

**인증 필요 + Rate Limit**:
```typescript
export const POST = withAuth(
  {
    bodySchema,
    rateLimit: { key: 'route-name', limit: 10, windowSeconds: 60 },
  },
  async ({ body, session }) => {
    // Business logic
    return { success: true };
  }
);
```

**Public API (인증 불필요)**:
```typescript
export const POST = withPublicApi(
  {
    bodySchema,
    rateLimit: { key: 'public-route', limit: 30, windowSeconds: 60 },
  },
  async ({ body, ip }) => {
    // Business logic
    return { result: 'data' };
  }
);
```

**수동 제어 (기존 로직 유지하면서 에러 응답만 표준화)**:
```typescript
import { createSuccessResponse, validationError } from '@/lib/api/errorResponse';

export async function POST(request: Request) {
  try {
    // ... 기존 로직 ...

    if (!isValid) {
      return validationError('Invalid input', { field: 'name' });
    }

    const result = await doSomething();
    return createSuccessResponse(result);
  } catch (error) {
    return internalError();
  }
}
```

---

## 📋 우선순위별 마이그레이션 목록

### 🔴 HIGH Priority (사용자 대면 API)

1. ✅ `/api/astrology/route.ts` - 부분 적용 (validation 완료)
2. `/api/saju/route.ts` - 마이그레이션 필요
3. `/api/tarot/interpret/route.ts` - 마이그레이션 필요
4. `/api/dream/route.ts` - 마이그레이션 필요
5. `/api/compatibility/route.ts` - 마이그레이션 필요
6. `/api/iching/stream/route.ts` - 마이그레이션 필요
7. `/api/destiny-map/route.ts` - 마이그레이션 필요

### 🟡 MEDIUM Priority (Chat/Profile API)

8. `/api/chat/*` - 표준화 필요
9. `/api/me/profile/route.ts` - 표준화 필요
10. `/api/feedback/route.ts` - 표준화 필요

### 🟢 LOW Priority (Admin/Cron)

11. `/api/admin/*` - 선택적 표준화
12. `/api/cron/*` - 선택적 표준화

---

## 🧪 테스트 예시

### 성공 케이스
```bash
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'

# Response (200)
{
  "data": { "result": "..." },
  "requestId": "abc123",
  "timestamp": "2026-01-22T12:00:00.000Z"
}
```

### 검증 실패
```bash
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"name": "ab"}'

# Response (400)
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "requestId": "xyz789",
  "timestamp": "2026-01-22T12:00:00.000Z",
  "details": {
    "errors": [
      {"path": "name", "message": "String must contain at least 3 character(s)"}
    ]
  },
  "suggestedAction": "Please check your input and try again"
}
```

### Rate Limit 초과
```bash
# After 10 requests in 60 seconds
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"name": "John"}'

# Response (429)
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "requestId": "lmn456",
  "timestamp": "2026-01-22T12:01:00.000Z",
  "retryAfter": 45,
  "suggestedAction": "Please wait 45 seconds before trying again"
}
```

---

## 📊 예상 효과

| 항목 | 개선 전 | 개선 후 | 효과 |
|------|---------|---------|------|
| 코드 중복 | 높음 (각 API마다 반복) | 낮음 (재사용) | **-70%** |
| 에러 응답 일관성 | 부분적 | 100% | ⭐⭐⭐⭐⭐ |
| 디버깅 시간 | 긴 (requestId 없음) | 짧은 (requestId 추적) | **-50%** |
| 타입 안전성 | 부분적 | 완전 | ⭐⭐⭐⭐⭐ |
| 개발 속도 | 느림 (반복 코드) | 빠름 (Wrapper 사용) | **+40%** |

---

## 🎯 다음 단계

1. **Week 1**: High Priority 7개 API 마이그레이션
2. **Week 2**: Medium Priority API 마이그레이션 + 테스트
3. **Week 3**: Low Priority API 선택적 마이그레이션 + 문서화

---

## 💡 팁

### 점진적 마이그레이션
- 한 번에 모든 API를 바꾸지 말고 하나씩 마이그레이션
- 각 API 마이그레이션 후 테스트 실행
- 기존 클라이언트 코드 호환성 확인

### 에러 코드 일관성
- `ERROR_CODES` 상수 사용 (src/lib/api/errorResponse.ts)
- 새로운 에러 타입 추가 시 해당 파일에 추가

### 모니터링
- Production 환경에서 `requestId`로 에러 추적
- Sentry/CloudWatch 등과 연동 시 `requestId` 활용

---

## 📚 참고 자료

- [API Error Response System](./src/lib/api/errorResponse.ts)
- [API Handler Wrapper](./src/lib/api/apiHandler.ts)
- [Zod Validation Schemas](./src/lib/api/zodValidation.ts)
- [Phase 7 Input Validation](./PHASE_7_INPUT_VALIDATION.md)

---

**작성일**: 2026-01-22
**작성자**: Claude Sonnet 4.5
