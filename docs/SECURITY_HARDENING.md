# Security Hardening Guide - Week 2

> **Goal**: CSP/입력검증/레이트리밋 완료 + 보안 스캔 0 이슈

## Overview

이 문서는 DestinyPal 프로젝트의 보안 강화 작업을 정리합니다.

---

## 1. Content Security Policy (CSP)

### 1.1 Nonce 기반 CSP 구현

**파일**: [middleware.ts](../src/middleware.ts)

```typescript
// 암호학적으로 안전한 nonce 생성
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}
```

### 1.2 CSP 디렉티브

| 디렉티브 | 설정 | 목적 |
|----------|------|------|
| `default-src` | `'self'` | 기본 리소스 제한 |
| `script-src` | `'self' 'nonce-...' 'strict-dynamic'` | XSS 방지 |
| `style-src` | `'self' 'nonce-...' 'unsafe-inline'` | 스타일 제한 |
| `frame-ancestors` | `'none'` | 클릭재킹 방지 |
| `base-uri` | `'self'` | Base tag 인젝션 방지 |
| `form-action` | `'self'` | Form 타겟 제한 |
| `object-src` | `'none'` | 플러그인 차단 |
| `upgrade-insecure-requests` | 적용 | HTTP→HTTPS 강제 |

### 1.3 Nonce 적용 위치

**파일**: [layout.tsx](../src/app/layout.tsx)

```tsx
// Get nonce from middleware
const headersList = await headers();
const nonce = headersList.get('x-nonce') || '';

// Apply to scripts
<script defer src="..." nonce={nonce} />
<GoogleAnalytics gaId={...} nonce={nonce} />
<MicrosoftClarity clarityId={...} nonce={nonce} />
```

### 1.4 CSP 위반 리포트

**엔드포인트**: `/api/csp-report`

- CSP 위반 수집 및 로깅
- Rate limiting (100 req/min per IP)
- 브라우저 확장 프로그램 필터링
- 프로덕션에서 자동 활성화

**환경 변수**:
```env
# 외부 CSP 리포트 서비스 사용 시 (선택)
CSP_REPORT_URI=https://your-csp-reporting-service.com/report
```

---

## 2. Input Validation (입력검증)

### 2.1 Zod 기반 스키마 검증

**파일**: [validator.ts](../src/lib/api/validator.ts)

```typescript
// 공통 스키마
export const DateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format required")
  .refine(date => year >= 1900 && year <= 2100);

export const SafeTextSchema = z.string()
  .refine(text => !/<script|javascript:|on\w+\s*=/i.test(text));
```

### 2.2 검증 스키마 목록

| 스키마 | 용도 |
|--------|------|
| `DateSchema` | 날짜 (YYYY-MM-DD) |
| `TimeSchema` | 시간 (HH:MM) |
| `TimezoneSchema` | IANA 타임존 |
| `LatitudeSchema` | 위도 (-90 ~ 90) |
| `LongitudeSchema` | 경도 (-180 ~ 180) |
| `SafeTextSchema` | XSS 방지 텍스트 |
| `EmailSchema` | 이메일 형식 |
| `UuidSchema` | UUID v4 |
| `BirthDataSchema` | 출생 정보 복합 |
| `PaginationSchema` | 페이지네이션 |

### 2.3 API 라우트 검증 패턴

```typescript
// 표준 검증 패턴
export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const limit = await rateLimit(`endpoint:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // 2. Token validation
  const tokenCheck = requirePublicToken(req);
  if (!tokenCheck.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 3. Body size limit
  const oversized = enforceBodySize(req, MAX_BODY_SIZE);
  if (oversized) return oversized;

  // 4. Schema validation
  const result = await parseAndValidate(req, MySchema);
  if (result.error) return createErrorResponse(result.error);

  // 5. Business logic...
}
```

### 2.4 Backend Sanitization (Python)

**파일**: [sanitizer.py](../backend_ai/app/sanitizer.py)

```python
# 프롬프트 인젝션 방지
def sanitize_user_input(text: str, max_length: int = 1200) -> str:
    # Code blocks, system prompts, injection patterns 제거
    ...

# 의심스러운 입력 탐지
def is_suspicious_input(text: str) -> bool:
    # "ignore instructions", "system:", etc. 패턴 탐지
    ...
```

---

## 3. Rate Limiting

### 3.1 구현 구조

```
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IORedis        │ ← 1차 시도 (가장 빠름)
└────────┬────────┘
         │ 실패 시
         ▼
┌─────────────────┐
│  Upstash REST   │ ← 2차 시도 (Serverless 호환)
└────────┬────────┘
         │ 실패 시
         ▼
┌─────────────────┐
│  In-Memory      │ ← 3차 fallback (개발용)
└─────────────────┘
```

### 3.2 Rate Limit 헤더

모든 API 응답에 포함:

| 헤더 | 설명 |
|------|------|
| `X-RateLimit-Limit` | 허용 요청 수 |
| `X-RateLimit-Remaining` | 남은 요청 수 |
| `X-RateLimit-Reset` | 리셋 시간 (Unix timestamp) |
| `X-RateLimit-Backend` | 백엔드 (redis/upstash/memory) |
| `Retry-After` | 재시도 대기 시간 (초) |

### 3.3 엔드포인트별 제한

| 엔드포인트 | 제한 | 윈도우 |
|------------|------|--------|
| `/api/tarot` | 40 | 60s |
| `/api/dream/*` | 10 | 60s |
| `/api/compatibility` | 30 | 60s |
| `/api/calendar` | 60 | 60s |
| `/api/csp-report` | 100 | 60s |
| 기본값 | 60 | 60s |

### 3.4 Backend Rate Limiting (Python)

**파일**: [rate_limit_service.py](../backend_ai/app/services/rate_limit_service.py)

- Redis 기반 분산 rate limiting
- Sliding window 알고리즘
- 메모리 fallback (LRU 500 항목)
- `API_RATE_PER_MIN` 환경변수로 설정 (기본: 60)

---

## 4. Security Headers

### 4.1 적용된 헤더

| 헤더 | 값 | 목적 |
|------|-----|------|
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑 방지 |
| `X-Frame-Options` | `DENY` | 클릭재킹 방지 |
| `X-XSS-Protection` | `1; mode=block` | 레거시 XSS 방지 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer 제어 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | API 비활성화 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | HSTS (prod) |

### 4.2 적용 위치

1. **middleware.ts** - 동적 헤더 (CSP with nonce)
2. **next.config.ts** - 정적 헤더 (캐시, 보안)

---

## 5. OWASP ZAP 스캔 가이드

### 5.1 설치

```bash
# Docker 사용 (권장)
docker pull ghcr.io/zaproxy/zaproxy:stable

# 또는 직접 설치
# https://www.zaproxy.org/download/
```

### 5.2 Baseline Scan 실행

```bash
# 로컬 개발 서버 스캔
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://host.docker.internal:3000 \
  -r zap-report.html

# 프로덕션 스캔 (주의: 적절한 권한 필요)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://destinypal.com \
  -r zap-report.html
```

### 5.3 Full Scan 실행

```bash
# API 스캔 (OpenAPI spec 사용 시)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \
  -t http://host.docker.internal:3000/api/openapi.json \
  -f openapi \
  -r zap-api-report.html

# 전체 스캔 (시간이 오래 걸림)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t http://host.docker.internal:3000 \
  -r zap-full-report.html
```

### 5.4 CI/CD 통합

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 0'  # 매주 일요일 02:00
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'https://destinypal.com'
          rules_file_name: '.zap/rules.tsv'

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: report_html.html
```

### 5.5 알려진 이슈 및 해결책

| ZAP Alert | 상태 | 해결 방법 |
|-----------|------|-----------|
| Missing Anti-CSRF Tokens | ✅ 해결 | Origin validation in [csrf.ts](../src/lib/security/csrf.ts) |
| X-Frame-Options Header Not Set | ✅ 해결 | `DENY` in middleware.ts |
| X-Content-Type-Options Header Missing | ✅ 해결 | `nosniff` in middleware.ts |
| Content Security Policy Header Not Set | ✅ 해결 | Nonce-based CSP in middleware.ts |
| Strict-Transport-Security Header Not Set | ✅ 해결 | HSTS in production |
| Cookie Without Secure Flag | ✅ 해결 | NextAuth secure cookies in production |
| Information Disclosure - Server Header | ✅ 해결 | `poweredByHeader: false` in next.config.ts |

---

## 6. 체크리스트

### 6.1 CSP

- [x] Nonce 생성 (crypto.getRandomValues)
- [x] script-src with nonce + strict-dynamic
- [x] style-src with nonce
- [x] frame-ancestors 'none'
- [x] upgrade-insecure-requests
- [x] report-uri / report-to 설정
- [x] CSP report endpoint 구현

### 6.2 입력 검증

- [x] Zod 스키마 정의
- [x] Body size 제한
- [x] 날짜/시간 형식 검증
- [x] 좌표 범위 검증
- [x] HTML/Script 인젝션 방지
- [x] Backend sanitization

### 6.3 Rate Limiting

- [x] Redis 기반 구현
- [x] Fallback 메커니즘
- [x] X-RateLimit 헤더
- [x] 엔드포인트별 설정
- [x] 프로덕션 fail-secure

### 6.4 보안 헤더

- [x] X-Content-Type-Options
- [x] X-Frame-Options
- [x] X-XSS-Protection
- [x] Referrer-Policy
- [x] Permissions-Policy
- [x] Strict-Transport-Security (HSTS)
- [x] Content-Security-Policy

### 6.5 OWASP ZAP

- [ ] Baseline scan 실행
- [ ] 리포트 검토
- [ ] High/Medium 이슈 해결
- [ ] CI/CD 통합

---

## 7. 환경 변수

```env
# Rate Limiting
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
API_RATE_PER_MIN=60

# CSP Reporting (optional - defaults to /api/csp-report)
CSP_REPORT_URI=https://your-csp-service.com/report

# Authentication
NEXTAUTH_SECRET=your-secret-key
ADMIN_API_TOKEN=your-admin-token
PUBLIC_API_TOKEN=your-public-token
```

---

## 8. 모니터링

### 8.1 CSP 위반 모니터링

CSP 위반은 `/api/csp-report`에서 로깅됩니다:

```typescript
logger.warn("[CSP Violation]", {
  ip,
  documentUri,
  violatedDirective,
  blockedUri,
  timestamp,
});
```

### 8.2 Rate Limit 모니터링

```typescript
recordCounter('api.rate_limit.exceeded', 1, { backend, key });
recordCounter('api.rate_limit.fallback', 1, { from, to });
```

### 8.3 권장 알림 설정

1. **CSP 위반 급증**: 5분 내 100건 이상
2. **Rate Limit 초과 급증**: 1분 내 1000건 이상
3. **Rate Limit Backend 장애**: `api.rate_limit.misconfig` 발생

---

## 9. 다음 단계 (Week 3+)

1. **API Key Rotation** - 토큰 자동 갱신
2. **Audit Logging** - 인증 실패, 관리자 작업 로깅
3. **DDoS Protection** - 적응형 rate limiting
4. **Database Encryption** - PII 컬럼 암호화
5. **Subresource Integrity (SRI)** - CDN 스크립트 해시
