# Redis 분산 캐시 - 빠른 시작 가이드

## 🚀 5분 설정

### 1. 환경 변수 설정 (.env)

```env
# Primary Redis (IORedis - 빠름)
REDIS_URL=redis://default:password@your-redis-host:6379/0

# Fallback (Upstash - 안정적)
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 2. Redis 인스턴스 선택

**Option A: Upstash (권장 - 프로덕션)**
1. https://console.upstash.com 접속
2. Create Database → Redis URL 복사
3. REST URL도 함께 복사

**Option B: Local (개발)**
```bash
docker run -d -p 6379:6379 redis:7-alpine
REDIS_URL=redis://localhost:6379/0
```

### 3. 테스트

```bash
# Health check
curl -H "Authorization: Bearer $NEXT_PUBLIC_API_TOKEN" \
  http://localhost:3000/api/health/redis

# 테스트 실행
npm test tests/lib/cache/
```

---

## 📚 주요 사용법

### Session Cache
```typescript
import { setSession, getSession } from '@/lib/cache/redis-session';

await setSession('user-123', { userId: '123', name: 'John' }, 86400);
const session = await getSession('user-123');
```

### Rate Limiting
```typescript
import { rateLimit } from '@/lib/rateLimit';

const result = await rateLimit(`api:${ip}`, { limit: 60, windowSeconds: 60 });
if (!result.allowed) {
  return Response.json({ error: 'Too many requests' }, {
    status: 429,
    headers: result.headers
  });
}
```

### Chart Cache (Client)
```typescript
import { loadChartData, saveChartData } from '@/lib/cache/chart-cache-client';

const cached = await loadChartData(birthDate, birthTime, lat, lng);
if (!cached) {
  const result = await calculateChart();
  await saveChartData(birthDate, birthTime, lat, lng, result);
}
```

### Chart Cache (Server)
```typescript
import { cacheOrCalculateChart } from '@/lib/cache/chart-cache-server';

const result = await cacheOrCalculateChart(
  birthDate, birthTime, lat, lng,
  async () => await expensiveCalculation(),
  'saju'
);
```

---

## 🔍 모니터링

### Health Check
```bash
GET /api/health/redis
```

### 로그 확인
```bash
# 정상
[RedisSession] Connected to Redis
[RateLimit] Using redis backend

# Fallback
[RateLimit] Redis unavailable, falling back to upstash
[RedisSession] Using in-memory fallback
```

---

## 🛠️ 트러블슈팅

### Redis 연결 실패
```bash
# 1. URL 확인
echo $REDIS_URL

# 2. Redis 서버 상태
redis-cli ping  # PONG 응답 확인

# 3. 방화벽 확인
telnet your-redis-host 6379
```

### Rate Limiting 작동 안함
```bash
# 개발 환경에서는 기본 비활성화
NODE_ENV=production  # 프로덕션으로 설정
```

---

## 📊 성능 벤치마크

| Operation | Redis (IORedis) | Upstash REST | In-Memory |
|-----------|-----------------|--------------|-----------|
| Rate Limit | ~2ms | ~50ms | <1ms |
| Session Get | ~2ms | N/A | <1ms |
| Cache Get | ~2ms | ~50ms | <1ms |

---

## 🔐 보안 체크리스트

- [ ] Redis 비밀번호 설정
- [ ] TLS/SSL 연결 (프로덕션)
- [ ] IP whitelist 설정
- [ ] 환경 변수 암호화
- [ ] Rate limiting 활성화

---

## 📖 상세 문서

- [종합 가이드](docs/REDIS_CACHE_GUIDE.md)
- [마이그레이션 보고서](REDIS_MIGRATION_SUMMARY.md)
- [API Reference](docs/REDIS_CACHE_GUIDE.md#사용-방법)

---

**작성일:** 2025-01-17
