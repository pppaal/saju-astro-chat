# Redis 분산 캐시 구현 가이드

## 개요

이 프로젝트는 Redis 기반 분산 캐싱 시스템을 구현하여 성능과 확장성을 향상시킵니다.

### 주요 기능

1. **Session Cache** - Redis 기반 세션 스토리지
2. **Rate Limiting** - IORedis + Upstash 폴백 기반 속도 제한
3. **Chart Data Cache** - 사주/운세 계산 결과 캐싱 (Hybrid: Redis + sessionStorage)

## 아키텍처

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │
         ├─→ sessionStorage (Local Cache)
         │
         ├─→ /api/cache/chart (Redis via API)
         │
         v
┌─────────────────┐
│   Backend       │
│  (Next.js API)  │
└────────┬────────┘
         │
         ├─→ IORedis (Primary)
         │
         ├─→ Upstash REST (Secondary)
         │
         └─→ In-Memory (Tertiary)
```

## 설치 및 설정

### 1. 패키지 설치

```bash
npm install ioredis @upstash/redis
```

### 2. 환경 변수 설정

`.env` 파일에 다음 변수를 추가:

```env
# Primary Redis (IORedis 사용)
REDIS_URL=redis://default:password@your-redis-host:6379/0

# Fallback Upstash (REST API)
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 3. Redis 서버 옵션

#### Option A: Local Redis (개발용)
```bash
# Docker로 로컬 Redis 실행
docker run -d -p 6379:6379 --name redis redis:7-alpine

# .env 설정
REDIS_URL=redis://localhost:6379/0
```

#### Option B: Upstash (프로덕션 권장)
1. [Upstash Console](https://console.upstash.com/) 접속
2. Redis 데이터베이스 생성
3. REST API 및 Redis URL 복사
4. `.env`에 두 URL 모두 설정

#### Option C: AWS ElastiCache / Azure Cache
- 클라우드 제공자의 Redis 서비스 사용
- 연결 URL을 `REDIS_URL`에 설정

## 사용 방법

### 1. Session Cache

```typescript
import {
  setSession,
  getSession,
  deleteSession,
  touchSession,
} from '@/lib/cache/redis-session';

// 세션 저장 (24시간 TTL)
await setSession('user-123', {
  userId: '123',
  username: 'john',
  isAdmin: false,
}, 86400);

// 세션 조회
const session = await getSession<SessionData>('user-123');

// 세션 삭제
await deleteSession('user-123');

// TTL 연장
await touchSession('user-123', 86400);
```

### 2. Rate Limiting

```typescript
import { rateLimit } from '@/lib/rateLimit';

// API 라우트에서 사용
const result = await rateLimit(`api:route:${ip}`, {
  limit: 60,
  windowSeconds: 60,
});

if (!result.allowed) {
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: result.headers,
    }
  );
}
```

### 3. Chart Data Cache (Server-side)

```typescript
import {
  saveChartData,
  loadChartData,
  cacheOrCalculateChart,
} from '@/lib/cache/chart-cache-server';

// 직접 저장/로드
await saveChartData(birthDate, birthTime, latitude, longitude, {
  saju: sajuResult,
  astro: astroResult,
});

const cached = await loadChartData(birthDate, birthTime, latitude, longitude);

// Cache-or-Calculate 패턴
const result = await cacheOrCalculateChart(
  birthDate,
  birthTime,
  latitude,
  longitude,
  async () => {
    // 비용이 큰 계산
    return await calculateSaju(...);
  },
  'saju'
);
```

### 4. Chart Data Cache (Client-side)

```typescript
'use client';

import {
  saveChartData,
  loadChartData,
  clearChartCache,
} from '@/lib/cache/chart-cache-client';

// 클라이언트에서 사용 (자동으로 sessionStorage + Redis API 호출)
const cached = await loadChartData(birthDate, birthTime, latitude, longitude);

if (!cached) {
  const result = await calculateChart();
  await saveChartData(birthDate, birthTime, latitude, longitude, result);
}
```

## Fallback 전략

### Rate Limiting
```
1. IORedis (Primary) - 가장 빠름, 지속 연결
   ↓ (실패 시)
2. Upstash REST (Secondary) - HTTP fallback, 안정적
   ↓ (실패 시)
3. In-Memory (Tertiary) - 메모리 기반, 단일 서버 한정
   ↓ (프로덕션에서 모두 실패)
4. Deny All (보안) - 속도 제한 불가 시 요청 거부
```

### Session Cache
```
1. IORedis (Primary) - 분산 세션
   ↓ (실패 시)
2. In-Memory Map (Fallback) - 로컬 메모리 저장
```

### Chart Data Cache
```
Frontend:
1. sessionStorage (Instant) - 브라우저 로컬 캐시
   ↓ (미스 시)
2. Redis via API (Distributed) - 서버 Redis 캐시
   ↓ (미스 시)
3. Calculate - 실제 계산 수행

Backend:
1. Redis (Primary) - 분산 캐시
   ↓ (실패 시)
2. Calculate - 실패 시 캐시 없이 계산
```

## 모니터링

### Health Check API

```bash
# Redis 상태 확인
curl -H "Authorization: Bearer $TOKEN" \
  https://your-app.com/api/health/redis
```

응답 예시:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-17T10:00:00.000Z",
    "session": {
      "redis": true,
      "memory": false,
      "sessionCount": 42
    },
    "rateLimit": {
      "redis": true,
      "upstash": true,
      "memory": false
    },
    "cache": {
      "info": "available"
    },
    "overall": {
      "status": "healthy",
      "redisAvailable": true,
      "fallbackActive": false
    }
  }
}
```

### 로그 모니터링

```typescript
// 로그에서 Redis 이벤트 추적
[RedisSession] Connected to Redis
[RateLimit] Using redis backend
[ChartCache] Cache hit for saju

// Fallback 발생 시
[RateLimit] Redis unavailable, falling back to upstash
[RedisSession] Redis error, using in-memory fallback
```

## 성능 최적화

### 1. Connection Pooling

IORedis는 자동으로 연결 풀링을 관리합니다:

```typescript
const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  keepAlive: 30000,
  lazyConnect: true,
});
```

### 2. TTL 설정

```typescript
// 캐시 TTL 상수 (src/lib/cache/redis-cache.ts)
export const CACHE_TTL = {
  SAJU_RESULT: 60 * 60 * 24 * 7,    // 7일 (불변 데이터)
  TAROT_READING: 60 * 60 * 24,      // 1일 (가변 데이터)
  DESTINY_MAP: 60 * 60 * 24 * 3,    // 3일
  GRADING_RESULT: 60 * 60 * 24,     // 1일
  CALENDAR_DATA: 60 * 60 * 24,      // 1일
  COMPATIBILITY: 60 * 60 * 24 * 7,  // 7일
};
```

### 3. Batch Operations

```typescript
import { cacheGetMany } from '@/lib/cache/redis-cache';

// 한 번에 여러 키 조회
const keys = ['key1', 'key2', 'key3'];
const results = await cacheGetMany<MyData>(keys);
```

## 테스트

```bash
# 전체 캐시 테스트 실행
npm test tests/lib/cache/

# 개별 테스트
npm test tests/lib/cache/redis-session.test.ts
npm test tests/lib/cache/redis-rate-limit.test.ts
npm test tests/lib/cache/chart-cache.test.ts
```

## 트러블슈팅

### 문제: Redis 연결 실패

```bash
# 로그 확인
[RedisSession] Failed to connect: ECONNREFUSED

# 해결:
1. REDIS_URL 환경 변수 확인
2. Redis 서버 실행 상태 확인
3. 방화벽/보안 그룹 설정 확인
4. Fallback이 자동으로 작동하는지 확인
```

### 문제: Rate Limiting이 작동하지 않음

```bash
# 개발 환경에서는 기본적으로 비활성화됨
# 프로덕션 환경 변수 확인
NODE_ENV=production

# Redis/Upstash URL 확인
echo $REDIS_URL
echo $UPSTASH_REDIS_REST_URL
```

### 문제: 캐시 미스율이 높음

```bash
# TTL 설정 확인
# 너무 짧은 TTL은 캐시 미스 증가

# 캐시 키 생성 로직 확인
# 동일한 데이터에 대해 다른 키가 생성되는지 확인
```

## 마이그레이션 가이드

### 기존 시스템에서 마이그레이션

1. **Rate Limiting 마이그레이션**
   ```typescript
   // Before (Upstash only)
   import { rateLimit } from '@/lib/rateLimit';

   // After (IORedis + Upstash fallback)
   import { rateLimit } from '@/lib/rateLimit'; // 동일한 API
   ```

2. **Chart Cache 마이그레이션**
   ```typescript
   // Before (sessionStorage only)
   import { loadChartData } from '@/lib/chartDataCache';

   // After (Redis + sessionStorage)
   import { loadChartData } from '@/lib/cache/chart-cache-client';
   // API는 동일, 내부적으로 Redis 사용
   ```

3. **환경 변수 추가**
   ```bash
   # .env에 추가
   REDIS_URL=redis://...
   ```

## 보안 고려사항

1. **Redis 인증**
   - 프로덕션 환경에서는 반드시 비밀번호 설정
   - TLS/SSL 연결 사용 권장

2. **Rate Limiting**
   - 프로덕션에서 Redis 미설정 시 자동으로 요청 거부
   - 보안 우선 정책

3. **데이터 격리**
   - Key prefix로 데이터 타입 구분
   - 세션, 캐시, Rate limit 각각 별도 prefix 사용

## 성능 벤치마크

### Rate Limiting
- IORedis: ~2ms
- Upstash REST: ~50ms
- In-Memory: <1ms

### Cache Operations
- Redis SET: ~3ms
- Redis GET: ~2ms
- sessionStorage: <1ms

## 참고 자료

- [IORedis Documentation](https://github.com/redis/ioredis)
- [Upstash Documentation](https://docs.upstash.com/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
