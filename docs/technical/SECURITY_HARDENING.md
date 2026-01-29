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

- [x] Baseline scan 실행
- [x] 리포트 검토
- [x] High/Medium 이슈 해결 (0 FAIL)
- [x] CI/CD 통합

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

## 9. OWASP ZAP 스캔 결과 (2026-01-20)

### 9.1 요약

```
FAIL-NEW: 0    WARN-NEW: 7    PASS: 60
```

**목표 달성: 보안 스캔 0 FAIL** ✅

### 9.2 통과 항목 (60개)

주요 통과 항목:
- Vulnerable JS Library [10003] ✅
- Cookie No HttpOnly Flag [10010] ✅
- Cookie Without Secure Flag [10011] ✅
- Anti-clickjacking Header [10020] ✅
- X-Content-Type-Options Header [10021] ✅
- Strict-Transport-Security Header [10035] ✅
- Server Leaks X-Powered-By [10037] ✅
- Content Security Policy Header [10038] ✅
- Absence of Anti-CSRF Tokens [10202] ✅
- SQL Injection [40018-40024] ✅
- XSS (Reflected/Persistent) [40012-40014] ✅

### 9.3 경고 항목 (7개) - 예상된 경고

| Alert ID | 설명 | 원인 | 조치 |
|----------|------|------|------|
| 10017 | Cross-Domain JS | Kakao SDK 등 외부 CDN | 의도적 허용 |
| 10027 | Suspicious Comments | 개발용 주석 | 프로덕션 빌드 시 제거 |
| 10049 | Non-Storable Content | 일부 동적 리소스 | 정상 동작 |
| 10055 | CSP Wildcard | `img-src https:` | 이미지 호스팅 다양성 |
| 10110 | Dangerous JS Functions | Next.js 번들 내부 | 프레임워크 제공 |
| 90003 | SRI Missing | 외부 스크립트 | 향후 개선 예정 |
| 90004 | Spectre Isolation | COEP 헤더 없음 | 향후 개선 예정 |

### 9.4 리포트 파일

- `reports/owasp/zap-baseline.html` - HTML 리포트
- `reports/owasp/zap-baseline.json` - JSON 리포트
- `reports/owasp/zap-baseline.md` - Markdown 리포트

---

## 10. Week 3 구현 완료 (2026-01-21)

### 10.1 API Key Rotation ✅

**파일**: [tokenRotation.ts](../src/lib/auth/tokenRotation.ts)

```typescript
// 토큰 설정 (환경 변수)
PUBLIC_API_TOKEN=current_token_value
PUBLIC_API_TOKEN_LEGACY=old_token_for_migration  // 선택
PUBLIC_API_TOKEN_VERSION=2
PUBLIC_API_TOKEN_EXPIRES_AT=1735689600000  // Unix ms (선택)

// 사용법
import { validatePublicToken, validateAdminToken } from '@/lib/auth/tokenRotation';

const result = validatePublicToken(req, clientIp);
if (!result.valid) {
  return NextResponse.json({ error: result.reason }, { status: 401 });
}
if (result.version === 'legacy') {
  // 클라이언트에게 토큰 업데이트 권장
}
```

**기능**:
- 현재 토큰 + 레거시 토큰 동시 지원 (무중단 마이그레이션)
- 토큰 버전 추적
- 만료 시간 지원
- Timing-safe 비교 (타이밍 공격 방지)
- 토큰 감사 로깅

### 10.2 Audit Logging ✅

**파일**: [auditLog.ts](../src/lib/security/auditLog.ts)

```typescript
import { auditAuth, auditAdmin, auditSecurity } from '@/lib/security/auditLog';

// 인증 실패 로깅
auditAuth({
  action: 'login',
  success: false,
  userEmail: 'user@example.com',
  ip: clientIp,
  error: 'Invalid password',
});

// 관리자 작업 로깅
auditAdmin({
  action: 'user_delete',
  success: true,
  userId: adminId,
  ip: clientIp,
  details: { targetUserId: '...' },
});

// 의심스러운 활동 로깅
auditSuspicious({
  type: 'injection_attempt',
  ip: clientIp,
  path: '/api/search',
  details: { payload: '...' },
});
```

**감사 카테고리**:
- `auth`: 인증 시도 (로그인, 로그아웃, 등록)
- `admin`: 관리자 작업
- `token`: 토큰 검증/회전/폐기
- `data`: 민감한 데이터 접근
- `security`: 보안 이벤트 (rate limit, 의심스러운 활동)

### 10.3 SRI (Subresource Integrity) ✅

**파일**: [sri.ts](../src/lib/security/sri.ts)

```typescript
import { SRI_HASHES, getSRIAttributes } from '@/lib/security/sri';

// SRI 해시 조회
const kakaoSRI = getSRIAttributes('kakaoSdk');
// { integrity: 'sha384-...', crossOrigin: 'anonymous' }
```

**참고**:
- Google Analytics, Microsoft Clarity는 동적 스크립트로 SRI 적용 불가
- Kakao SDK는 공식 SRI 해시 미제공 (직접 생성 필요)

### 10.4 COEP/COOP Headers (Spectre 방지) ✅

**파일**: [middleware.ts](../src/middleware.ts)

```typescript
// 프로덕션에서 적용되는 헤더
Cross-Origin-Opener-Policy: same-origin-allow-popups
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Resource-Policy: same-site
```

| 헤더 | 값 | 목적 |
|------|-----|------|
| COOP | `same-origin-allow-popups` | 브라우징 컨텍스트 격리, OAuth 팝업 허용 |
| COEP | `credentialless` | 외부 리소스 로드 허용 (credentials 없이) |
| CORP | `same-site` | 자원이 다른 사이트에서 로드되는 것 방지 |

**Benefits**:
- SharedArrayBuffer 안전하게 사용 가능
- 고해상도 타이머 안전하게 사용 가능
- Spectre 스타일 공격 방지
- 교차 출처 정보 유출 방지

---

## 11. 다음 단계 (Week 4+)

1. **DDoS Protection** - 적응형 rate limiting
2. **Database Encryption** - PII 컬럼 암호화
3. **Secret Rotation Automation** - 자동화된 키 교체 스케줄링
4. **Security Monitoring Dashboard** - 실시간 보안 대시보드
