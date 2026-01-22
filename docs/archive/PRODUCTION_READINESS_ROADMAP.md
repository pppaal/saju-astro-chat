# 🚀 Production Readiness Roadmap

> **현재 상태**: 7.5/10 (MVP/Beta 수준)
> **목표**: 9/10 (Production-Grade, 스케일 가능)
> **예상 기간**: 4-6주 집중 작업

---

## 📊 현재 상태 요약

### ✅ 강점
- 독특한 AI 기반 운세 플랫폼 (타로/사주/점성술 통합)
- TypeScript strict mode + Prisma ORM
- 15,923개 테스트 케이스
- Sentry 에러 추적 + 구조화된 로깅

### ❌ 치명적 문제
- 🔴 **성능**: RAG 순차 처리로 2-3배 느림
- 🔴 **보안**: XSS 취약 (unsafe CSP)
- 🔴 **확장성**: 메모리 캐시로 다중 서버 불가
- 🔴 **코드 품질**: 164KB 모놀리식 파일
- 🔴 **테스트**: 45% 커버리지 (업계 표준 70%)

---

## 🎯 Week 1: Critical Fixes (필수)

### Day 1-2: 보안 강화 🔒
**Priority**: CRITICAL
**Impact**: XSS 공격 방지, 규정 준수

#### Task 1.1: CSP 강화
**파일**: `next.config.ts:78-79`

```typescript
// ❌ 현재 (취약)
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net"

// ✅ 목표 (안전)
// 1. nonce 생성 미들웨어 추가
// 2. CSP 헤더에 nonce 적용
// 3. inline script 제거 또는 nonce 추가
```

**작업 체크리스트**:
- [ ] `src/middleware.ts` 생성 - nonce 생성 로직
- [ ] `next.config.ts` 수정 - CSP에 nonce 적용
- [ ] `src/app/layout.tsx` - Script 태그에 nonce 추가
- [ ] 모든 inline script 제거 또는 nonce 추가
- [ ] `npm run build` 테스트
- [ ] Browser console에서 CSP 오류 확인

**검증**:
```bash
# 브라우저 개발자도구 Console 탭에서 CSP 오류 없어야 함
# Security Headers 검사: https://securityheaders.com
```

---

#### Task 1.2: Input Validation 추가
**파일**: `src/app/api/icp/route.ts:2`, 기타 API routes

```typescript
// ❌ 현재
export async function POST(req: Request) {
  const body = await req.json(); // 검증 없음
  // ...
}

// ✅ 목표
import { validateBirthData } from '@/lib/api/validation';

export async function POST(req: Request) {
  const { data, error } = await parseJsonBody(req);
  if (error) return createErrorResponse({ code: ErrorCodes.BAD_REQUEST });

  const validated = validateBirthData(data);
  if (!validated.success) {
    return createErrorResponse({
      code: ErrorCodes.VALIDATION_ERROR,
      details: validated.errors
    });
  }
  // ...
}
```

**작업 체크리스트**:
- [ ] `src/lib/api/validation.ts` - 생년월일 스키마 추가
- [ ] 모든 API routes에 validation 적용 (20개 파일)
  - [ ] `/api/saju/route.ts`
  - [ ] `/api/tarot/interpret/route.ts`
  - [ ] `/api/compatibility/route.ts`
  - [ ] `/api/destiny-map/route.ts`
  - [ ] 나머지 16개...
- [ ] E2E 테스트로 검증

**파일 목록**:
```
src/app/api/
├── astrology/route.ts
├── calendar/route.ts
├── compatibility/route.ts
├── daily-fortune/route.ts
├── destiny-map/route.ts
├── destiny-match/profile/route.ts
├── icp/route.ts
└── tarot/
    ├── analyze-question/route.ts
    └── interpret/route.ts
```

---

### Day 3-4: 성능 병목 해결 ⚡

**Priority**: CRITICAL
**Impact**: 응답 시간 1500ms → 500ms (3배 개선)

#### Task 2.1: RAG 병렬 처리 구현
**파일**: `backend_ai/app/app.py:1254-1273`

**문제점**:
```python
# 현재: 순차 처리 (thread-safety 문제)
_graph_rag_inst = get_graph_rag()  # 300ms
_corpus_rag_inst = get_corpus_rag()  # 200ms
_persona_rag_inst = get_persona_embed_rag()  # 200ms
_domain_rag = get_domain_rag()  # 150ms
# 총: 850ms (+ OpenAI 호출 650ms) = 1500ms
```

**해결 방안 A: AsyncIO + 스레드 안전 모델**
```python
import asyncio
from sentence_transformers import SentenceTransformer

# 각 RAG에 전용 모델 인스턴스 할당
class ThreadSafeRAGManager:
    def __init__(self):
        self._models = {
            'graph': SentenceTransformer('model-name'),
            'corpus': SentenceTransformer('model-name'),
            'persona': SentenceTransformer('model-name'),
            'domain': SentenceTransformer('model-name'),
        }

    async def fetch_all(self, query: str):
        tasks = [
            self._fetch_graph(query),
            self._fetch_corpus(query),
            self._fetch_persona(query),
            self._fetch_domain(query),
        ]
        return await asyncio.gather(*tasks)
```

**해결 방안 B: 별도 Model Server (권장)**
```
┌─────────────┐      HTTP      ┌──────────────┐
│  Flask App  │ ────────────> │ Model Server │
│ (backend_ai)│               │  (FastAPI)   │
└─────────────┘               └──────────────┘
                              ├─ GraphRAG
                              ├─ CorpusRAG
                              ├─ PersonaRAG
                              └─ DomainRAG
```

**작업 체크리스트** (방안 A 선택 시):
- [ ] `backend_ai/app/rag_manager.py` 생성
- [ ] `ThreadSafeRAGManager` 클래스 구현
- [ ] `app.py`의 `prefetch_all_rag_data()` 함수 수정
- [ ] 메모리 사용량 모니터링 (각 모델당 +300MB)
- [ ] pytest로 성능 측정
  ```bash
  pytest tests/performance/test_rag_performance.py
  ```

**작업 체크리스트** (방안 B 선택 시):
- [ ] `backend_ai/model_server/` 디렉토리 생성
- [ ] FastAPI 앱 설정 (`main.py`)
- [ ] RAG 엔드포인트 구현 (`/v1/rag/query`)
- [ ] `app.py`에서 HTTP 클라이언트로 호출
- [ ] Docker Compose로 두 서비스 연결
- [ ] 배포 설정 업데이트 (fly.toml)

---

### Day 5: 분산 캐시 구현 ☁️

**Priority**: CRITICAL
**Impact**: 다중 서버 환경 지원

#### Task 3.1: Redis 마이그레이션
**파일**: `backend_ai/app/app.py:749-751`

**현재**:
```python
_SESSION_RAG_CACHE = {}  # ❌ 메모리 캐시 (단일 서버만)
_SESSION_CACHE_LOCK = Lock()
```

**목표**:
```python
import redis
from redis import Redis

_redis_client: Redis = redis.from_url(os.getenv("REDIS_URL"))

def get_session_cache(session_id: str, key: str):
    cache_key = f"session:{session_id}:{key}"
    data = _redis_client.get(cache_key)
    return json.loads(data) if data else None

def set_session_cache(session_id: str, key: str, value: dict, ttl: int = 3600):
    cache_key = f"session:{session_id}:{key}"
    _redis_client.setex(cache_key, ttl, json.dumps(value))
```

**작업 체크리스트**:
- [ ] Redis 인스턴스 준비 (Railway Redis addon 또는 Upstash)
- [ ] `backend_ai/requirements.txt` - redis 패키지 추가
- [ ] `backend_ai/app/cache/redis_cache.py` 생성
- [ ] Session 캐시 마이그레이션
  - [ ] `_SESSION_RAG_CACHE` → Redis
  - [ ] `_SESSION_CACHE_LOCK` 제거 (Redis atomic ops)
- [ ] Rate limiting도 Redis로 마이그레이션
  - [ ] `_rate_state` → Redis sorted sets
- [ ] 환경 변수 설정 `.env`
  ```bash
  REDIS_URL=redis://localhost:6379
  ```
- [ ] 테스트
  ```bash
  pytest tests/unit/test_redis_cache.py
  ```

**프론트엔드 캐시**:
파일: `src/lib/chartDataCache.ts`, `src/lib/stripe/premiumCache.ts`

- [ ] Redis 클라이언트 설정 (Upstash for Vercel)
- [ ] 캐시 로직 Redis로 교체
- [ ] TTL 전략 수립 (차트: 1시간, Premium: 5분)

---

## 🎯 Week 2: Code Quality & Refactoring

### Day 6-8: 모놀리식 파일 리팩토링 📦

**Priority**: HIGH
**Impact**: 유지보수성 대폭 개선

#### Task 4.1: template_renderer.py 분해
**파일**: `backend_ai/app/template_renderer.py` (164KB, 3000+ lines)

**목표 구조**:
```
backend_ai/app/rendering/
├── __init__.py
├── base.py                    # 공통 유틸리티
├── saju_renderer.py           # 사주 템플릿 (500 lines)
├── astro_renderer.py          # 점성술 템플릿 (500 lines)
├── tarot_renderer.py          # 타로 템플릿 (400 lines)
├── compatibility_renderer.py  # 궁합 템플릿 (400 lines)
├── dream_renderer.py          # 꿈해몽 템플릿 (300 lines)
├── iching_renderer.py         # 주역 템플릿 (300 lines)
└── templates/                 # Jinja2 템플릿 파일
    ├── saju.j2
    ├── astro.j2
    └── ...
```

**단계별 작업**:
1. **Day 6**: 분석 및 계획
   - [ ] template_renderer.py 함수 목록 추출
   - [ ] 도메인별 그룹핑 (saju, astro, tarot, etc.)
   - [ ] 공통 함수 식별

2. **Day 7**: 추출 및 테스트
   - [ ] `rendering/base.py` - 공통 함수 이동
   - [ ] `rendering/saju_renderer.py` - 사주 관련 함수 이동
   - [ ] 기존 테스트 통과 확인
   - [ ] import 경로 업데이트

3. **Day 8**: 나머지 도메인 완료
   - [ ] astro, tarot, compatibility, dream, iching 렌더러 생성
   - [ ] 원본 `template_renderer.py` 삭제
   - [ ] 전체 테스트 실행
   ```bash
   pytest tests/unit/test_rendering.py -v
   ```

**검증**:
```bash
# 각 파일 크기 확인 (500 lines 이하)
wc -l backend_ai/app/rendering/*.py

# 전체 테스트 통과
pytest tests/unit/test_rendering*.py
```

---

#### Task 4.2: app.py 최종 리팩토링
**파일**: `backend_ai/app/app.py` (1638 lines)

**목표**: 500 lines 이하 (핵심 라우팅만)

**현재 구조**:
```python
app.py
├── Config & Setup (50 lines)
├── Lazy Loaders (200 lines)        # ← services/로 이동
├── Helper Functions (300 lines)    # ← utils/로 이동
├── RAG Orchestration (400 lines)   # ← services/rag_orchestrator.py
├── API Routes (500 lines)          # ← routers/로 이미 분리 중
└── Error Handlers (50 lines)
```

**목표 구조**:
```python
# app.py (500 lines)
from backend_ai.app.routers import (
    core_routes, tarot_routes, saju_routes,
    compatibility_routes, dream_routes, iching_routes
)
from backend_ai.app.services import RAGOrchestrator

app = Flask(__name__)
# Config
# Blueprints 등록
# Error handlers
```

**작업 체크리스트**:
- [ ] `services/lazy_loader.py` 생성 - 모든 lazy loader 이동
- [ ] `services/rag_orchestrator.py` 생성 - RAG 로직 이동
- [ ] `utils/helpers.py` 생성 - 헬퍼 함수 이동
- [ ] `app.py` 정리 - 핵심 설정만 남김
- [ ] Import 경로 업데이트
- [ ] 전체 테스트 실행

---

### Day 9-10: 테스트 커버리지 개선 🧪

**Priority**: HIGH
**Impact**: 45% → 60% (1차 목표)

#### Task 5.1: 핵심 비즈니스 로직 테스트
**목표 파일** (커버리지 낮은 순):

```bash
# 커버리지 리포트 생성
npm run test:coverage

# 커버리지 낮은 파일 확인
open coverage/index.html
```

**우선순위 파일**:
1. `src/lib/destiny-map/calendar/grading.ts` (방금 열었던 파일)
2. `src/lib/destiny-map/astrology/engine-core.ts`
3. `src/lib/compatibility/cosmicCompatibility.ts`
4. `src/lib/prediction/ultraPrecisionEngine.ts`
5. `src/lib/Tarot/questionClassifiers.ts`

**작업 체크리스트**:
- [ ] `tests/lib/destiny-map/calendar/grading.test.ts` 보강
  - [ ] Edge cases: 경계값 (0, 100, -1, 101)
  - [ ] 날짜 경계: 2024-12-31 → 2025-01-01
  - [ ] 윤년: 2024-02-29
  - [ ] 타임존: UTC vs Asia/Seoul
- [ ] `tests/lib/destiny-map/astrology/engine-core.test.ts` 생성
  - [ ] 각 행성 계산 정확도 테스트
  - [ ] Midpoint 계산 검증
- [ ] `tests/lib/compatibility/cosmicCompatibility.test.ts` 보강
  - [ ] 모든 궁합 조합 테스트
  - [ ] 극단적 케이스 (동일 생일, 100년 차이)
- [ ] `tests/lib/prediction/ultraPrecisionEngine.test.ts` 보강
  - [ ] 시간별 운세 정확도
  - [ ] 캐싱 로직 검증

**목표 커버리지**:
```json
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 60,      // 45% → 60%
    functions: 75,  // 68% → 75%
    branches: 85,   // 78% → 85%
    statements: 60  // 45% → 60%
  }
}
```

---

## 🎯 Week 3: Infrastructure & DevOps

### Day 11-13: CI/CD 파이프라인 완성 🚢

**Priority**: HIGH
**Impact**: 배포 자동화, 안정성 향상

#### Task 6.1: 배포 자동화
**파일**: `.github/workflows/ci.yml`

**현재 워크플로우**:
```yaml
jobs:
  build-and-test:
    - Checkout
    - Lint
    - Test
    - Build
    # ❌ 배포 단계 없음
```

**목표 워크플로우**:
```yaml
jobs:
  test:
    # 기존 테스트

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    steps:
      - Deploy to Railway Staging
      - Run smoke tests

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - Deploy to Railway Production
      - Run smoke tests
      - Notify Slack/Discord
```

**작업 체크리스트**:
- [ ] Railway 배포 토큰 생성
- [ ] GitHub Secrets 등록
  - `RAILWAY_TOKEN`
  - `SLACK_WEBHOOK` (선택)
- [ ] `.github/workflows/deploy-staging.yml` 생성
- [ ] `.github/workflows/deploy-production.yml` 생성
- [ ] Smoke test 스크립트 작성
  ```bash
  # scripts/smoke-test.sh
  curl -f https://api.destinypal.com/health || exit 1
  curl -f https://destinypal.com || exit 1
  ```
- [ ] 배포 후 자동 테스트 실행

---

#### Task 6.2: 환경 분리
**파일**: `.env.example`, `fly.toml`

**목표**:
```
환경:
├── Development (로컬)
├── Staging (Railway staging)
└── Production (Railway production)
```

**작업 체크리스트**:
- [ ] `.env.development` 생성
- [ ] `.env.staging.example` 생성
- [ ] `.env.production.example` 생성
- [ ] Railway 프로젝트 2개 생성 (staging, production)
- [ ] 환경별 변수 설정
  - DATABASE_URL (Staging DB vs Production DB)
  - REDIS_URL
  - OPENAI_API_KEY (별도 계정 권장)
  - SENTRY_DSN (환경 구분)
- [ ] Next.js 환경 변수 설정
  ```typescript
  // next.config.ts
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    ENVIRONMENT: process.env.NODE_ENV,
  }
  ```

---

### Day 14-15: 모니터링 & Observability 📊

**Priority**: MEDIUM
**Impact**: 장애 조기 발견, 성능 추적

#### Task 7.1: APM 도구 통합

**옵션 A: New Relic** (무료 티어 100GB/월)
**옵션 B: Datadog** (무료 티어 제한적)
**옵션 C: 오픈소스 - Grafana + Prometheus**

**권장: New Relic** (가성비 + 쉬운 설정)

**작업 체크리스트**:
- [ ] New Relic 계정 생성
- [ ] Frontend APM 설정
  ```bash
  npm install @newrelic/next
  ```
  ```typescript
  // next.config.ts
  const nrConfig = require('./.newrelic');
  ```
- [ ] Backend APM 설정
  ```bash
  pip install newrelic
  ```
  ```bash
  # 서버 실행 시
  NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program gunicorn app:app
  ```
- [ ] 대시보드 설정
  - Response time (p50, p95, p99)
  - Error rate
  - Database query time
  - External API calls (OpenAI)

---

#### Task 7.2: 커스텀 메트릭 추가
**파일**: `src/lib/metrics.ts`, `backend_ai/app/metrics.py`

**현재**:
```typescript
// src/lib/metrics.ts
recordCounter("api.error", 1);
recordHistogram("api.response_time", duration);
```

**목표 메트릭**:
```typescript
// 비즈니스 메트릭
recordCounter("tarot.reading.completed", 1, { spread_type: "celtic_cross" });
recordCounter("saju.calculation.success", 1);
recordHistogram("openai.response_time", duration, { model: "gpt-4" });
recordGauge("active_sessions", sessionCount);

// 시스템 메트릭
recordGauge("cache.hit_rate", hitRate);
recordHistogram("db.query_time", duration, { table: "users" });
recordCounter("rag.cache.miss", 1, { rag_type: "graph" });
```

**작업 체크리스트**:
- [ ] `src/lib/metrics.ts` - 비즈니스 메트릭 추가
- [ ] `backend_ai/app/metrics.py` - Python 메트릭 추가
- [ ] New Relic에 커스텀 이벤트 전송
- [ ] 대시보드에 차트 추가
  - 타로 읽기 성공률
  - RAG 캐시 히트율
  - OpenAI API 응답 시간

---

## 🎯 Week 4: Security & Performance Optimization

### Day 16-17: 보안 강화 (심화) 🛡️

#### Task 8.1: 보안 스캔 도구 통합
**파일**: `.github/workflows/security.yml`

**작업 체크리스트**:
- [ ] Snyk 통합 (의존성 취약점 스캔)
  ```yaml
  # .github/workflows/security.yml
  - name: Run Snyk test
    uses: snyk/actions/node@master
    env:
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  ```
- [ ] OWASP Dependency-Check
  ```bash
  npm install -g dependency-check
  dependency-check --project "DestinyPal" --scan ./
  ```
- [ ] Semgrep (정적 코드 분석)
  ```bash
  npx semgrep --config=auto src/
  ```
- [ ] 주간 자동 스캔 스케줄
  ```yaml
  on:
    schedule:
      - cron: '0 0 * * 0'  # 매주 일요일
  ```

---

#### Task 8.2: Rate Limiting 개선
**파일**: `backend_ai/app/app.py:1454`, `src/middleware.ts`

**현재**: IP 기반 60req/min (전역)

**목표**: 사용자별 + 엔드포인트별 차등 제한
```python
# backend_ai/app/rate_limit.py
RATE_LIMITS = {
    '/api/tarot/interpret': {'limit': 10, 'window': 3600},  # 10회/시간
    '/api/saju': {'limit': 30, 'window': 3600},             # 30회/시간
    '/api/calendar': {'limit': 100, 'window': 3600},        # 100회/시간
}

# Premium 사용자는 2배
```

**작업 체크리스트**:
- [ ] Redis로 rate limit 상태 관리
- [ ] 사용자 ID 기반 tracking (IP fallback)
- [ ] 엔드포인트별 설정
- [ ] Premium 사용자 우대
- [ ] Rate limit 헤더 추가
  ```
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1640000000
  ```

---

### Day 18-20: 성능 최적화 (심화) ⚡

#### Task 9.1: Database 쿼리 최적화
**파일**: Prisma schema, API routes

**작업 체크리스트**:
- [ ] Slow query 로그 활성화
  ```typescript
  // prisma/schema.prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
    // 느린 쿼리 로깅
    log      = ["query", "info", "warn", "error"]
  }
  ```
- [ ] N+1 쿼리 찾기
  ```bash
  # Prisma query 로그 분석
  npm run dev 2>&1 | grep "prisma:query"
  ```
- [ ] Include/Select 최적화
  ```typescript
  // ❌ 나쁜 예
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscriptions: true,  // 모든 컬럼
      tarotReadings: true,  // 수백 개 레코드
    }
  });

  // ✅ 좋은 예
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      subscriptions: {
        select: { status: true, currentPeriodEnd: true },
        where: { status: 'active' }
      }
    }
  });
  ```
- [ ] 인덱스 추가 (EXPLAIN ANALYZE 결과 기반)
- [ ] 연결 풀 크기 조정
  ```env
  DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
  ```

---

#### Task 9.2: 프론트엔드 번들 최적화
**파일**: `next.config.ts`, `package.json`

**현재 번들 크기 분석**:
```bash
npm run build
# .next/analyze/ 확인
```

**작업 체크리스트**:
- [ ] Bundle analyzer 설치
  ```bash
  npm install @next/bundle-analyzer
  ```
- [ ] 큰 라이브러리 dynamic import
  ```typescript
  // ❌ 나쁜 예
  import Chart from 'chart.js';

  // ✅ 좋은 예
  const Chart = dynamic(() => import('chart.js'), { ssr: false });
  ```
- [ ] 불필요한 dependency 제거
  ```bash
  npx depcheck
  ```
- [ ] Tree-shaking 확인
  ```typescript
  // next.config.ts
  experimental: {
    optimizePackageImports: ['lodash', 'date-fns'],
  }
  ```
- [ ] 이미지 최적화
  ```typescript
  <Image
    src="/hero.jpg"
    width={800}
    height={600}
    placeholder="blur"  // 추가
    priority  // Above-the-fold 이미지만
  />
  ```

**목표**:
- First Load JS: < 150KB (현재 확인 필요)
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1

---

## 🎯 Week 5-6: Documentation & Polish

### Day 21-23: API 문서화 📚

#### Task 10.1: OpenAPI/Swagger 문서 생성
**파일**: `docs/api/openapi.yaml`

**작업 체크리스트**:
- [ ] OpenAPI 3.0 스펙 작성
  ```yaml
  openapi: 3.0.0
  info:
    title: DestinyPal API
    version: 1.0.0
  paths:
    /api/tarot/interpret:
      post:
        summary: Get tarot reading
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TarotRequest'
  ```
- [ ] Swagger UI 호스팅
  ```bash
  npm install swagger-ui-react
  ```
  파일: `src/app/docs/page.tsx`
- [ ] 각 엔드포인트 예제 추가
- [ ] Postman Collection 생성

---

#### Task 10.2: 개발자 가이드 작성
**파일**: `docs/`

**작업 체크리스트**:
- [ ] `docs/ARCHITECTURE.md` - 시스템 아키텍처
- [ ] `docs/API.md` - API 사용 가이드
- [ ] `docs/DEVELOPMENT.md` - 로컬 개발 환경 설정
- [ ] `docs/DEPLOYMENT.md` - 배포 가이드
- [ ] `docs/TESTING.md` - 테스트 전략
- [ ] `docs/SECURITY.md` - 보안 정책
- [ ] `README.md` 업데이트 - Quick Start 추가

---

### Day 24-25: 운영 Runbook 작성 📋

#### Task 11.1: 장애 대응 매뉴얼
**파일**: `docs/runbooks/`

**작업 체크리스트**:
- [ ] `runbooks/incident-response.md`
  - 장애 감지 → 알림 → 대응 → 복구 → 사후분석
- [ ] `runbooks/common-issues.md`
  - OpenAI API timeout 대응
  - Database 연결 오류
  - Redis 장애 시 fallback
  - 메모리 부족 (OOM) 대응
- [ ] `runbooks/scaling.md`
  - 트래픽 급증 시 대응
  - Database 스케일 업/아웃
  - Backend 인스턴스 추가
- [ ] `runbooks/rollback.md`
  - 배포 롤백 절차
  - Database 마이그레이션 롤백

---

### Day 26-28: 최종 검증 & 론칭 준비 🚀

#### Task 12.1: Load Testing
**파일**: `tests/performance/k6/`

**작업 체크리스트**:
- [ ] k6 스크립트 작성
  ```javascript
  // tests/performance/k6/production-load.js
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export const options = {
    stages: [
      { duration: '2m', target: 100 },  // Ramp-up
      { duration: '5m', target: 100 },  // Steady
      { duration: '2m', target: 0 },    // Ramp-down
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'],  // 95% under 500ms
      http_req_failed: ['rate<0.01'],    // 99% success
    },
  };

  export default function () {
    const res = http.post('https://api.destinypal.com/api/tarot/interpret', {
      // Test payload
    });
    check(res, {
      'status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }
  ```
- [ ] 목표 설정
  - 100 동시 사용자 처리
  - p95 응답 시간 < 500ms
  - 에러율 < 1%
- [ ] 실행 및 결과 분석
  ```bash
  k6 run tests/performance/k6/production-load.js
  ```
- [ ] 병목 지점 파악 및 개선

---

#### Task 12.2: Security Audit
**작업 체크리스트**:
- [ ] OWASP Top 10 체크리스트 검증
  - [ ] A01: Broken Access Control
  - [ ] A02: Cryptographic Failures
  - [ ] A03: Injection
  - [ ] A04: Insecure Design
  - [ ] A05: Security Misconfiguration
  - [ ] A06: Vulnerable Components
  - [ ] A07: Authentication Failures
  - [ ] A08: Software/Data Integrity Failures
  - [ ] A09: Security Logging Failures
  - [ ] A10: Server-Side Request Forgery
- [ ] Penetration Testing (자동)
  ```bash
  npx zap-cli quick-scan https://destinypal.com
  ```
- [ ] SSL/TLS 설정 검증
  ```bash
  # SSL Labs 테스트
  https://www.ssllabs.com/ssltest/
  ```

---

#### Task 12.3: 최종 체크리스트
**론칭 전 필수 확인사항**:

**인프라**:
- [ ] 프로덕션 DB 백업 자동화 (일 1회)
- [ ] Redis 백업 설정
- [ ] CDN 설정 (Vercel/Cloudflare)
- [ ] DNS failover 설정
- [ ] 모니터링 알림 설정 (Slack/Discord)

**보안**:
- [ ] 환경 변수 암호화 (Railway Secrets)
- [ ] API 키 로테이션 정책
- [ ] HTTPS 강제 (HSTS)
- [ ] CSP 헤더 검증
- [ ] Rate limiting 동작 확인

**성능**:
- [ ] Lighthouse 점수 > 90
- [ ] Core Web Vitals 통과
- [ ] CDN 캐시 히트율 > 80%
- [ ] Database 쿼리 < 100ms (p95)

**법적 준수**:
- [ ] Privacy Policy 작성
- [ ] Terms of Service 작성
- [ ] Cookie 동의 배너
- [ ] GDPR 준수 (EU 사용자 대상 시)
- [ ] 데이터 삭제 프로세스

---

## 📈 진행 상황 추적

### Week 1 Progress
- [ ] Day 1-2: 보안 강화 (CSP, Input Validation)
- [ ] Day 3-4: 성능 병목 해결 (RAG 병렬화)
- [ ] Day 5: 분산 캐시 (Redis)

### Week 2 Progress
- [ ] Day 6-8: 코드 리팩토링 (template_renderer, app.py)
- [ ] Day 9-10: 테스트 커버리지 60%

### Week 3 Progress
- [ ] Day 11-13: CI/CD 파이프라인
- [ ] Day 14-15: APM 모니터링

### Week 4 Progress
- [ ] Day 16-17: 보안 스캔 & Rate Limiting
- [ ] Day 18-20: Database & 번들 최적화

### Week 5-6 Progress
- [ ] Day 21-23: API 문서화
- [ ] Day 24-25: 운영 Runbook
- [ ] Day 26-28: 최종 검증

---

## 🎯 최종 목표 지표

### Before (현재)
| 항목 | 점수 |
|------|------|
| 전체 평가 | 7.5/10 |
| 보안 | 6.5/10 |
| 성능 | 6.5/10 |
| 테스트 커버리지 | 45% |
| 응답 시간 (p95) | 1500ms |
| 에러율 | 2% |

### After (6주 후 목표)
| 항목 | 목표 |
|------|------|
| 전체 평가 | **9/10** |
| 보안 | **8.5/10** |
| 성능 | **8.5/10** |
| 테스트 커버리지 | **70%** |
| 응답 시간 (p95) | **< 500ms** |
| 에러율 | **< 0.5%** |

---

## 🆘 트러블슈팅 가이드

### 자주 발생하는 문제

#### 1. Redis 연결 오류
```bash
# 증상: ECONNREFUSED ::1:6379
# 해결:
export REDIS_URL=redis://localhost:6379
# 또는 Railway Redis addon 사용
```

#### 2. Prisma 마이그레이션 실패
```bash
# 증상: Migration failed to apply
# 해결:
npx prisma migrate reset  # 개발 환경만
npx prisma migrate deploy  # 프로덕션
```

#### 3. Next.js 빌드 메모리 부족
```bash
# 증상: JavaScript heap out of memory
# 해결:
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### 4. Python 메모리 부족 (OOM)
```python
# 증상: Railway 512MB 초과로 재시작
# 해결: 모델 lazy loading 확인 또는 플랜 업그레이드
```

---

## 📞 도움이 필요할 때

### 리소스
- **Next.js 문서**: https://nextjs.org/docs
- **Prisma 문서**: https://www.prisma.io/docs
- **Railway 문서**: https://docs.railway.app
- **k6 문서**: https://k6.io/docs

### 커뮤니티
- **Discord**: Next.js, Prisma 공식 서버
- **Stack Overflow**: `nextjs`, `prisma`, `flask` 태그

---

## ✅ 완료 기준

이 로드맵을 모두 완료하면:
- ✅ 프로덕션 환경에서 **1만 DAU** 처리 가능
- ✅ **99.9% 가용성** 달성
- ✅ **보안 감사** 통과 수준
- ✅ **시리즈 A 투자** 기술 실사 준비 완료

---

**마지막 업데이트**: 2026-01-17
**작성자**: Claude Code Analysis
**버전**: 1.0
