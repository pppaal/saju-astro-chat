# API 에러 응답 가이드

## 개요

이 문서는 모든 API 에러 응답의 표준 규칙과 구현 방법을 정의합니다.

---

## 에러 응답 표준 구조

### 기본 구조

```typescript
{
  success: false,
  error: {
    code: string,      // 에러 코드 (예: "UNAUTHORIZED", "VALIDATION_ERROR")
    message: string,   // 사용자 친화적 메시지 (다국어)
    status: number,    // HTTP 상태 코드
    details?: unknown  // 상세 정보 (개발 환경에서만)
  }
}
```

### Zod 스키마 정의

```typescript
import { ErrorResponseSchema } from '@/lib/api/response-schemas';

// 런타임 검증
const validatedError = ErrorResponseSchema.parse(errorResponse);
```

---

## 에러 코드별 상세 가이드

### 1. 400 BAD_REQUEST

**사용 시점**: 잘못된 요청 형식, 필수 파라미터 누락

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "잘못된 요청입니다. 입력을 확인해주세요.",
    "status": 400
  }
}
```

**구현 코드**:
```typescript
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler';

return createErrorResponse({
  code: ErrorCodes.BAD_REQUEST,
  locale: context.locale,
  route: 'api/example'
});
```

---

### 2. 401 UNAUTHORIZED

**사용 시점**:
- 로그인이 필요한 API에 비로그인 사용자가 접근
- 유효하지 않은 인증 토큰
- 세션 만료

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "계속하려면 로그인해주세요.",
    "status": 401
  }
}
```

**구현 코드**:
```typescript
// Middleware에서 자동 처리
const guardOptions = createAuthenticatedGuard({
  route: 'api/protected',
  requireAuth: true, // 자동으로 401 반환
});

const { context, error } = await initializeApiContext(req, guardOptions);
if (error) return error; // 이미 401 응답 포함
```

**수동 구현**:
```typescript
if (!session?.user) {
  return createErrorResponse({
    code: ErrorCodes.UNAUTHORIZED,
    message: "로그인이 필요합니다",
    locale: context.locale,
  });
}
```

---

### 3. 402 Payment Required (크레딧 부족)

**사용 시점**: 사용자 크레딧이 부족할 때

**특별 응답 구조**:
```json
{
  "error": "이번 달 리딩 횟수를 모두 사용했습니다.",
  "code": "no_credits",
  "remaining": 0,
  "upgradeUrl": "/pricing"
}
```

**에러 코드 종류**:
- `no_credits`: 리딩 크레딧 부족
- `compatibility_limit`: 궁합 분석 크레딧 부족
- `followup_limit`: 후속 질문 크레딧 부족
- `not_authenticated`: 로그인 필요 (401로 변환)

**구현 코드**:
```typescript
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits';

const creditResult = await checkAndConsumeCredits("reading", 1);

if (!creditResult.allowed) {
  return creditErrorResponse(creditResult); // 자동으로 402 반환
}
```

**Middleware 자동 처리**:
```typescript
const guardOptions = createAuthenticatedGuard({
  route: 'api/dream',
  requireCredits: true,
  creditType: "reading",
  creditAmount: 1,
});

// 크레딧 부족 시 자동으로 402 반환
const { context, error } = await initializeApiContext(req, guardOptions);
if (error) return error;
```

---

### 4. 403 FORBIDDEN

**사용 시점**:
- 인증은 되었지만 권한이 없는 리소스 접근
- 관리자 전용 API에 일반 사용자 접근

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "이 리소스에 대한 권한이 없습니다.",
    "status": 403
  }
}
```

**구현 코드**:
```typescript
if (!context.isPremium) {
  return createErrorResponse({
    code: ErrorCodes.FORBIDDEN,
    message: "프리미엄 사용자만 이용할 수 있습니다",
    locale: context.locale,
  });
}
```

---

### 5. 404 NOT_FOUND

**사용 시점**: 요청한 리소스를 찾을 수 없을 때

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "요청하신 리소스를 찾을 수 없습니다.",
    "status": 404
  }
}
```

**구현 코드**:
```typescript
const record = await db.consultation.findUnique({ where: { id } });

if (!record) {
  return createErrorResponse({
    code: ErrorCodes.NOT_FOUND,
    locale: context.locale,
  });
}
```

---

### 6. 413 PAYLOAD_TOO_LARGE

**사용 시점**: 요청 Body 크기가 제한을 초과할 때

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "요청 데이터가 너무 큽니다.",
    "status": 413
  }
}
```

**구현 코드**:
```typescript
import { enforceBodySize } from '@/lib/api/middleware';

// Body 크기 제한 (예: 10MB)
const sizeCheck = await enforceBodySize(req, 10 * 1024 * 1024);
if (!sizeCheck.valid) {
  return createErrorResponse({
    code: ErrorCodes.PAYLOAD_TOO_LARGE,
    locale: context.locale,
  });
}
```

---

### 7. 422 VALIDATION_ERROR

**사용 시점**:
- Zod 스키마 검증 실패
- 입력 데이터 형식 오류
- 비즈니스 로직 검증 실패

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력 검증에 실패했습니다.",
    "status": 422,
    "details": {
      "field": "birthDate",
      "issue": "Invalid date format",
      "expected": "YYYY-MM-DD",
      "received": "2023/01/01"
    }
  }
}
```

**구현 코드 (Zod 사용)**:
```typescript
import { DreamRequestSchema } from '@/lib/api/schemas';

const validation = DreamRequestSchema.safeParse(body);

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
```

**구현 코드 (수동 검증)**:
```typescript
import { validateRequired } from '@/lib/api/middleware';

const check = validateRequired(body, ['birthDate', 'birthTime']);

if (!check.valid) {
  return createErrorResponse({
    code: ErrorCodes.VALIDATION_ERROR,
    message: `Missing fields: ${check.missing.join(', ')}`,
    details: { missing: check.missing },
    locale: context.locale,
  });
}
```

---

### 8. 429 RATE_LIMITED

**사용 시점**: Rate limit을 초과했을 때

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    "status": 429
  }
}
```

**필수 헤더**:
```http
Retry-After: 60
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
```

**구현 코드**:
```typescript
// Middleware에서 자동 처리
const guardOptions = createPublicStreamGuard({
  route: 'api/tarot',
  limit: 30,
  windowSeconds: 60,
});

// Rate limit 초과 시 자동으로 429 + 헤더 반환
const { context, error } = await initializeApiContext(req, guardOptions);
if (error) return error;
```

**수동 구현**:
```typescript
import { rateLimit } from '@/lib/rateLimit';

const result = await rateLimit(`api:${route}:${ip}`, {
  limit: 30,
  windowSeconds: 60
});

if (!result.allowed) {
  return createErrorResponse({
    code: ErrorCodes.RATE_LIMITED,
    locale: context.locale,
    headers: {
      "Retry-After": String(result.retryAfter || 60),
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": "0",
    }
  });
}
```

---

### 9. 500 INTERNAL_ERROR

**사용 시점**:
- 예상치 못한 서버 오류
- Catch되지 않은 예외

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "예상치 못한 오류가 발생했습니다. 다시 시도해주세요.",
    "status": 500
  }
}
```

**구현 코드**:
```typescript
// withApiMiddleware 사용 시 자동 처리
export const POST = withApiMiddleware(
  async (req, context) => {
    // 여기서 발생한 에러는 자동으로 500으로 변환
    throw new Error("Something went wrong");
  },
  { route: 'api/example' }
);
```

**수동 처리**:
```typescript
try {
  // API 로직
} catch (error) {
  logger.error('API error:', error);

  return createErrorResponse({
    code: ErrorCodes.INTERNAL_ERROR,
    originalError: error as Error,
    locale: context.locale,
    route: 'api/example',
  });
}
```

---

### 10. 502 BACKEND_ERROR

**사용 시점**:
- AI 서비스 (Flask, OpenAI) 장애
- 외부 API 호출 실패

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "BACKEND_ERROR",
    "message": "AI 서비스가 일시적으로 사용 불가합니다.",
    "status": 502
  }
}
```

**구현 코드 (Circuit Breaker 사용)**:
```typescript
import { withCircuitBreaker } from '@/lib/circuitBreaker';

const { result, fromFallback } = await withCircuitBreaker(
  'flask-dream',
  async () => {
    // AI 서비스 호출
    return await callAIService();
  },
  generateFallbackResponse, // 장애 시 대체 응답
  {
    failureThreshold: 3,
    resetTimeoutMs: 60000,
  }
);

// fromFallback이 true면 백엔드 에러 발생했지만 대체 응답 사용
```

---

### 11. 503 SERVICE_UNAVAILABLE

**사용 시점**:
- 서비스 점검 중
- 시스템 과부하

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "서비스가 일시적으로 사용 불가합니다.",
    "status": 503
  }
}
```

**구현 코드**:
```typescript
const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

if (isMaintenanceMode) {
  return createErrorResponse({
    code: ErrorCodes.SERVICE_UNAVAILABLE,
    locale: context.locale,
  });
}
```

---

### 12. 504 TIMEOUT

**사용 시점**:
- API 처리 시간 초과
- 외부 서비스 응답 지연

**응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "요청 시간이 초과되었습니다. 다시 시도해주세요.",
    "status": 504
  }
}
```

**구현 코드**:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    return createErrorResponse({
      code: ErrorCodes.TIMEOUT,
      locale: context.locale,
    });
  }
}
```

---

## 스트리밍 에러 처리

### SSE (Server-Sent Events) 에러

스트리밍 API에서는 JSON 응답 대신 SSE 형식으로 에러 전송:

```typescript
import { jsonErrorResponse } from '@/lib/api/response-builders';

// 스트리밍 중 에러 발생
return new Response(new ReadableStream({
  start(controller) {
    const errorMsg = jsonErrorResponse(
      "처리 중 오류가 발생했습니다",
      500
    );
    controller.enqueue(
      new TextEncoder().encode(`data: ${errorMsg}\n\n`)
    );
    controller.close();
  }
}), {
  headers: { "Content-Type": "text/event-stream" }
});
```

---

## 다국어 지원

### 자동 언어 감지

```typescript
// Accept-Language 헤더에서 자동 추출
const locale = extractLocale(req); // "ko", "en", "ja", "zh"

// 에러 메시지 자동 번역
return createErrorResponse({
  code: ErrorCodes.UNAUTHORIZED,
  locale, // 자동으로 해당 언어 메시지 사용
});
```

### 커스텀 메시지 (다국어)

```typescript
const messages = {
  ko: "이메일 형식이 올바르지 않습니다",
  en: "Invalid email format",
  ja: "メールアドレスの形式が正しくありません",
  zh: "电子邮件格式无效",
};

return createErrorResponse({
  code: ErrorCodes.VALIDATION_ERROR,
  message: messages[locale] || messages.en,
  locale,
});
```

---

## 개발 환경 vs 프로덕션

### Details 필드 제어

```typescript
// 개발 환경: details 포함
// 프로덕션: details 제외
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "서버 오류가 발생했습니다",
    "status": 500,
    "details": {  // NODE_ENV === 'development' 일 때만
      "stack": "Error: ...\n  at ...",
      "originalError": { ... }
    }
  }
}
```

### 로깅

```typescript
// 5xx 에러는 자동으로 로깅 + 모니터링 전송
import { captureServerError } from '@/lib/telemetry';

if (status >= 500 && originalError) {
  captureServerError(originalError, {
    route,
    code,
    status,
  });
}
```

---

## 크레딧 자동 환불

### API 실패 시 자동 환불

```typescript
// Middleware가 제공하는 자동 환불 함수
if (context.refundCreditsOnError) {
  await context.refundCreditsOnError(
    "AI 서비스 오류",
    { apiRoute: 'api/dream', errorCode: 'BACKEND_ERROR' }
  );
}

// 또는 수동 환불
import { refundCredits } from '@/lib/credits/creditRefund';

await refundCredits({
  userId: context.userId!,
  creditType: "reading",
  amount: 1,
  reason: "api_error",
  errorMessage: "처리 실패",
});
```

### 환불 조건

**자동 환불**:
- 500 Internal Error
- 502 Backend Error
- 504 Timeout
- Database Error

**환불 불가**:
- 400 Bad Request
- 401 Unauthorized
- 422 Validation Error
- 429 Rate Limited

---

## 체크리스트

새로운 API 에러를 추가할 때:

- [ ] 적절한 HTTP 상태 코드 선택
- [ ] ErrorCodes에 에러 코드 추가 (`errorHandler.ts`)
- [ ] 다국어 메시지 추가 (ko, en, ja, zh)
- [ ] Zod 스키마 정의 (필요 시)
- [ ] 크레딧 환불 조건 확인
- [ ] 로깅/모니터링 설정
- [ ] 문서 업데이트

---

**참고 파일**:
- `src/lib/api/errorHandler.ts` - 에러 생성 함수
- `src/lib/api/response-schemas.ts` - 응답 스키마
- `src/lib/api/middleware.ts` - 자동 에러 처리

**마지막 업데이트**: 2026-01-26
