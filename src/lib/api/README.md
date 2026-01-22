# API 유틸리티 가이드

이 디렉토리는 API route 개발을 위한 재사용 가능한 유틸리티들을 제공합니다.

## 📚 목차

- [Middleware](#middleware) - 인증, Rate Limiting, 크레딧 처리
- [API Client](#api-client) - 백엔드 호출 표준화
- [Streaming](#streaming) - SSE 스트림 유틸리티
- [예제](#예제)

---

## Middleware

### 개요

API route의 공통 관심사(인증, rate limiting, 크레딧)를 처리하는 통합 미들웨어입니다.

### 주요 기능

- ✅ Rate Limiting (IP 기반)
- ✅ 인증 (Public Token / Session / Custom Token)
- ✅ 크레딧 자동 체크 및 소비
- ✅ Locale 자동 추출
- ✅ 타입 안전성 보장

### 프리셋 함수

#### 1. `createPublicStreamGuard`

공개 스트리밍 API용 (타로, 주역, 꿈해몽 등)

```typescript
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";

const guardOptions = createPublicStreamGuard({
  route: "tarot-stream",           // 필수: 로깅/메트릭용 route 이름
  limit: 30,                        // 선택: 요청 제한 (기본: 30)
  windowSeconds: 60,                // 선택: 시간 윈도우 (기본: 60초)
  requireCredits: true,             // 선택: 크레딧 필요 여부
  creditType: "reading",            // 선택: 크레딧 타입 (기본: "reading")
  creditAmount: 1,                  // 선택: 소비 크레딧 수 (기본: 1)
});

const { context, error } = await initializeApiContext(req, guardOptions);
if (error) return error;

// context 사용 가능:
// - context.ip: 클라이언트 IP
// - context.locale: 추출된 locale (ko/en/ja/zh)
// - context.userId: 사용자 ID (크레딧 사용 시)
// - context.creditInfo: 남은 크레딧 정보
```

#### 2. `createAuthenticatedGuard`

인증 필수 API용 (사주, 궁합 등)

```typescript
const guardOptions = createAuthenticatedGuard({
  route: "saju-chat",
  limit: 60,                        // 기본: 60/60s
  requireCredits: true,
  creditType: "reading",
});

const { context, error } = await initializeApiContext(req, guardOptions);
if (error) return error;

// context에서 사용 가능:
// - context.userId: 사용자 ID (인증 필수이므로 항상 존재)
// - context.isAuthenticated: true
// - context.isPremium: 프리미엄 여부
// - context.session: NextAuth 세션
```

#### 3. `createSimpleGuard`

단순 rate limit만 필요한 API용

```typescript
const guardOptions = createSimpleGuard({
  route: "health-check",
  limit: 100,
  windowSeconds: 60,
});
```

### 완전한 예제

```typescript
import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";

export async function POST(req: NextRequest) {
  try {
    // 1. Middleware 적용
    const guardOptions = createPublicStreamGuard({
      route: "my-api",
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    // 2. 요청 처리
    const body = await req.json();

    // context 활용
    const locale = context.locale; // "ko" | "en" | "ja" | "zh"
    const userId = context.userId; // 크레딧 사용 시 userId 보장

    // ... 비즈니스 로직 ...

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

---

## API Client

### 개요

백엔드 호출을 표준화하고 타임아웃, 인증, 에러 처리를 자동화합니다.

### 기본 사용법

```typescript
import { apiClient } from "@/lib/api/ApiClient";

// JSON POST 요청
const result = await apiClient.post("/api/endpoint", {
  data: "value"
});

if (result.ok) {
  console.log(result.data);
} else {
  console.error(result.error, result.status);
}

// GET 요청
const result = await apiClient.get("/api/endpoint");
```

### SSE 스트리밍 요청 ⭐

```typescript
import { apiClient } from "@/lib/api/ApiClient";
import { createSSEStreamProxy, createFallbackSSEStream } from "@/lib/streaming";

// SSE 스트림 요청
const streamResult = await apiClient.postSSEStream("/api/stream-endpoint", {
  question: "질문",
  locale: "ko"
});

if (!streamResult.ok) {
  // 에러 시 Fallback 스트림 반환
  return createFallbackSSEStream({
    content: "서비스를 일시적으로 이용할 수 없습니다.",
    done: true,
    error: streamResult.error
  });
}

// 성공 시 프록시
return createSSEStreamProxy({
  source: streamResult.response,
  route: "MyStream",
});
```

### 특징

- ✅ 자동 Authorization Bearer 헤더 추가
- ✅ 타임아웃 자동 처리 (기본 60초)
- ✅ SSE 응답 자동 검증
- ✅ 타입 안전 응답

---

## Streaming

### 개요

SSE(Server-Sent Events) 스트림을 쉽게 생성하고 프록시합니다.

### 주요 함수

#### 1. `createSSEStreamProxy`

백엔드 스트림을 클라이언트로 프록시

```typescript
import { createSSEStreamProxy } from "@/lib/streaming";

return createSSEStreamProxy({
  source: backendResponse,          // Response 객체
  route: "TarotStream",              // 로깅용 route 이름
  additionalHeaders: {               // 선택: 추가 헤더
    "X-Custom": "value"
  }
});
```

#### 2. `createFallbackSSEStream`

에러 시 Fallback 스트림 생성

```typescript
import { createFallbackSSEStream } from "@/lib/streaming";

return createFallbackSSEStream({
  content: "에러 메시지",
  done: true,
  error: "상세 에러"
});
```

#### 3. SSE 이벤트 생성

```typescript
import {
  createSSEEvent,
  createSSEDoneEvent,
  createSSEErrorEvent
} from "@/lib/streaming";

// 데이터 이벤트
const event = createSSEEvent({ message: "Hello" });
// 결과: "data: {\"message\":\"Hello\"}\n\n"

// 완료 이벤트
const done = createSSEDoneEvent();
// 결과: "data: [DONE]\n\n"

// 에러 이벤트
const error = createSSEErrorEvent("Error message");
// 결과: "data: [ERROR] Error message\n\n"
```

---

## 예제

### 예제 1: 기본 스트리밍 API

```typescript
// src/app/api/my-stream/route.ts
import { NextRequest } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy, createFallbackSSEStream } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";

export async function POST(req: NextRequest) {
  try {
    // 1. Middleware
    const guardOptions = createPublicStreamGuard({
      route: "my-stream",
      limit: 30,
      windowSeconds: 60,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    // 2. 요청 파싱
    const body = await req.json();
    const { question } = body;

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    // 3. 백엔드 호출
    const streamResult = await apiClient.postSSEStream("/backend/stream", {
      question,
      locale: context.locale
    });

    // 4. 에러 처리
    if (!streamResult.ok) {
      return createFallbackSSEStream({
        content: context.locale === "ko"
          ? "일시적으로 서비스를 이용할 수 없습니다."
          : "Service temporarily unavailable.",
        done: true,
        error: streamResult.error
      });
    }

    // 5. 스트림 프록시
    return createSSEStreamProxy({
      source: streamResult.response,
      route: "MyStream",
    });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

### 예제 2: 크레딧 소비 + DB 저장

```typescript
// src/app/api/premium-stream/route.ts
import { NextRequest } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    // Middleware with 크레딧
    const guardOptions = createPublicStreamGuard({
      route: "premium-stream",
      limit: 10,
      windowSeconds: 60,
      requireCredits: true,          // 크레딧 자동 소비
      creditType: "reading",
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    const body = await req.json();

    // 백엔드 호출
    const streamResult = await apiClient.postSSEStream("/backend/premium", body);
    if (!streamResult.ok) {
      return createFallbackSSEStream({
        content: "Error occurred",
        done: true,
        error: streamResult.error
      });
    }

    // DB 저장 (선택사항)
    if (context.userId) {
      await prisma.reading.create({
        data: {
          userId: context.userId,
          type: 'premium',
          title: '프리미엄 리딩',
          content: JSON.stringify(body),
        },
      });
    }

    return createSSEStreamProxy({
      source: streamResult.response,
      route: "PremiumStream",
    });

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

### 예제 3: 인증 필수 API

```typescript
// src/app/api/my-auth-api/route.ts
import { NextRequest } from "next/server";
import { initializeApiContext, createAuthenticatedGuard } from "@/lib/api/middleware";
import { apiClient } from "@/lib/api/ApiClient";

export async function POST(req: NextRequest) {
  try {
    // 인증 필수
    const guardOptions = createAuthenticatedGuard({
      route: "my-auth-api",
      limit: 60,
      requireCredits: true,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    // context.userId 보장됨 (인증 필수)
    const result = await apiClient.post("/backend/user-data", {
      userId: context.userId,
      isPremium: context.isPremium,
    });

    return NextResponse.json(result.data);

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

---

## 🎯 모범 사례

### ✅ DO

1. **항상 미들웨어 먼저 적용**
   ```typescript
   const { context, error } = await initializeApiContext(req, guardOptions);
   if (error) return error;
   ```

2. **context의 locale 활용**
   ```typescript
   const locale = context.locale; // "ko" | "en" | "ja" | "zh"
   ```

3. **에러 시 Fallback 제공**
   ```typescript
   if (!streamResult.ok) {
     return createFallbackSSEStream({
       content: locale === "ko" ? "한글 메시지" : "English message",
       done: true
     });
   }
   ```

4. **크레딧 필요 시 requireCredits 사용**
   ```typescript
   createPublicStreamGuard({
     route: "premium",
     requireCredits: true,
   });
   ```

### ❌ DON'T

1. **수동으로 rate limiting 구현하지 말 것**
   ```typescript
   // ❌ 나쁜 예
   const ip = getClientIp(req.headers);
   const limit = await rateLimit(`my-api:${ip}`, ...);

   // ✅ 좋은 예
   const guardOptions = createPublicStreamGuard({ route: "my-api" });
   ```

2. **fetch 직접 사용하지 말 것**
   ```typescript
   // ❌ 나쁜 예
   const response = await fetch(`${BACKEND_URL}/api`, { ... });

   // ✅ 좋은 예
   const result = await apiClient.postSSEStream("/api", data);
   ```

3. **수동 스트림 프록시 작성하지 말 것**
   ```typescript
   // ❌ 나쁜 예 (50+ 줄의 보일러플레이트)
   const stream = new ReadableStream({ ... });

   // ✅ 좋은 예 (3줄)
   return createSSEStreamProxy({ source: response, route: "MyAPI" });
   ```

---

## 📝 마이그레이션 가이드

### 기존 코드를 새 패턴으로 변환

**Before:**
```typescript
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`api:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
  }

  const tokenCheck = requirePublicToken(req);
  if (!tokenCheck.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendResponse = await fetch(`${BACKEND_URL}/api/endpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN}`
    },
    body: JSON.stringify(data)
  });

  // ... 많은 보일러플레이트 코드 ...
}
```

**After:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const guardOptions = createPublicStreamGuard({
      route: "my-endpoint",
      limit: 30,
      windowSeconds: 60,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    const streamResult = await apiClient.postSSEStream("/api/endpoint", data);

    if (!streamResult.ok) {
      return createFallbackSSEStream({
        content: "Error",
        done: true,
        error: streamResult.error
      });
    }

    return createSSEStreamProxy({
      source: streamResult.response,
      route: "MyEndpoint",
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

**절감: ~100줄 → ~30줄 (70% 감소)**

---

## 🔧 고급 사용법

### 커스텀 인증

```typescript
const guardOptions: MiddlewareOptions = {
  route: "custom-auth",
  rateLimit: { limit: 60, windowSeconds: 60 },
  auth: { type: 'custom-token', envVar: 'MY_API_TOKEN' },
};
```

### 크레딧만 체크 (소비하지 않음)

```typescript
const guardOptions = createPublicStreamGuard({
  route: "check-only",
  requireCredits: true,
  creditType: "reading",
});

// middleware.ts에서:
credits: {
  type: "reading",
  amount: 1,
  checkOnly: true,  // 소비하지 않음
}
```

---

## 📚 관련 문서

- [Middleware 소스](./middleware.ts)
- [API Client 소스](./ApiClient.ts)
- [Streaming 유틸리티](../streaming/)
- [에러 핸들러](./errorHandler.ts)

---

**작성일**: 2026-01-21
**마지막 업데이트**: 2026-01-21
