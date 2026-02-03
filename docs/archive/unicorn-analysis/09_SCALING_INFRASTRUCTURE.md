# 09. 인프라 스케일링 (Scaling Infrastructure)

**작성일**: 2026-01-31
**버전**: 1.0
**목적**: 10k → 1M DAU 스케일링 전략 및 인프라 설계

---

## 목차

1. [현재 인프라 구성](#1-현재-인프라-구성)
2. [트래픽 레벨별 인프라](#2-트래픽-레벨별-인프라)
3. [데이터베이스 스케일링](#3-데이터베이스-스케일링)
4. [캐싱 전략](#4-캐싱-전략)
5. [모니터링 및 알림](#5-모니터링-및-알림)

---

## 1. 현재 인프라 구성

### 1.1 기술 스택

**Frontend**:

- Next.js 16 (App Router)
- React 19
- Vercel (호스팅)

**Backend**:

- Next.js API Routes
- Prisma ORM
- TypeScript

**Database**:

- PostgreSQL (Supabase)
- Redis (Upstash)

**AI/ML**:

- OpenAI GPT-4o/GPT-4o-mini
- Custom 점성술 알고리즘 (1,450+ 라인)

**Infrastructure**:

- Vercel (Edge Functions)
- Supabase (Database + Auth)
- Upstash Redis (Caching)
- Sentry (Error Tracking)

---

## 2. 트래픽 레벨별 인프라

### 2.1 Level 1: 10k DAU (현재)

**인프라 구성**:

```
Vercel Pro: $20/월
Supabase Pro: $25/월
Redis: $10/월
OpenAI API: $9,000/월 (Phase 1 최적화 후)
Total: $9,055/월
```

**성능 목표**:

- 응답 시간: < 2초 (P95)
- 가용성: 99.9%
- 동시접속: 1,000명

**병목 지점**:

- ❌ 없음 (여유 있음)

---

### 2.2 Level 2: 50k DAU (Year 2 Q2)

**인프라 구성**:

```
Vercel Pro: $20/월
Supabase Team: $599/월 (더 많은 connections)
Redis Pro: $100/월
OpenAI API: $45,000/월
Total: $45,719/월
```

**성능 목표**:

- 응답 시간: < 2초 (P95)
- 가용성: 99.95%
- 동시접속: 5,000명

**병목 지점**:

- ⚠️ PostgreSQL Connection Pool (max 100)
- ⚠️ Redis 메모리 (4GB)

**완화 전략**:

- [ ] Connection Pooling 최적화 (PgBouncer)
- [ ] Read Replica 추가
- [ ] Redis 클러스터 고려

---

### 2.3 Level 3: 100k DAU (Year 2 Q4)

**인프라 구성**:

```
Vercel Enterprise: 협의 (Auto-scaling)
Supabase Pro + Read Replicas: $2,000/월
Redis Pro Cluster: $500/월
OpenAI API: $54,000/월 (Phase 2 최적화)
Total: ~$57,000/월
```

**성능 목표**:

- 응답 시간: < 1.5초 (P95)
- 가용성: 99.99%
- 동시접속: 10,000명

**병목 지점**:

- ⚠️ PostgreSQL 쓰기 병목 (Write-heavy)
- ⚠️ OpenAI API Rate Limit

**완화 전략**:

- [ ] 데이터베이스 파티셔닝 (`UserInteraction`, `Reading`)
- [ ] Write Queue 도입 (BullMQ)
- [ ] OpenAI Tier 증가 (Enterprise)

---

### 2.4 Level 4: 500k DAU (Year 3-4)

**인프라 구성**:

```
Vercel Enterprise: 협의
Citus (분산 PostgreSQL): $5,000/월
Redis Cluster: $2,000/월
OpenAI API: $270,000/월 or 독자 AI: $90,000/월
Total: ~$297,000/월 (독자 AI 사용 시)
```

**성능 목표**:

- 응답 시간: < 1초 (P95)
- 가용성: 99.995%
- 동시접속: 50,000명

**병목 지점**:

- ⚠️ 단일 PostgreSQL 한계 도달
- ⚠️ AI 비용 폭증

**완화 전략**:

- [ ] Citus (분산 PostgreSQL) 전환
- [ ] 독자 AI 모델 도입 (비용 -70%)
- [ ] CDN 캐싱 강화 (Vercel Edge)

---

### 2.5 Level 5: 1M+ DAU (Year 5, Unicorn)

**인프라 구성**:

```
Multi-region Deployment
Kubernetes (GKE/EKS): $10,000/월
CockroachDB (글로벌 분산 DB): $10,000/월
Redis Cluster (Multi-AZ): $5,000/월
독자 AI 모델 (자체 호스팅): $180,000/월
CDN (Cloudflare Enterprise): $2,000/월
Total: ~$207,000/월
```

**성능 목표**:

- 응답 시간: < 500ms (P95)
- 가용성: 99.99%
- 동시접속: 100,000명

**아키텍처 변화**:

- 마이크로서비스 전환
- Event-driven Architecture
- CQRS 패턴

---

## 3. 데이터베이스 스케일링

### 3.1 현재 스키마 최적화

**인덱싱 전략**:

```prisma
model Reading {
  id        String   @id @default(cuid())
  userId    String
  type      String
  createdAt DateTime @default(now())

  // 복합 인덱스: userId + createdAt 조회 최적화
  @@index([userId, createdAt])
  @@index([userId, type])
}

model UserInteraction {
  userId    String
  feature   String
  timestamp DateTime

  // 시계열 데이터 최적화
  @@index([userId, timestamp(sort: Desc)])
}
```

**파티셔닝 전략** (100k+ DAU):

```sql
-- Reading 테이블 월별 파티셔닝
CREATE TABLE reading_2026_01 PARTITION OF reading
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE reading_2026_02 PARTITION OF reading
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

### 3.2 Read Replica 전략

**50k DAU 시 구성**:

```
Master (Write)
└─ Replica 1 (Read) - 사주 분석 조회
└─ Replica 2 (Read) - 점성술 조회
└─ Replica 3 (Read) - 대시보드/통계
```

**Prisma 설정**:

```typescript
const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_REPLICA_URL,
    },
  },
});

// Read 작업
const users = await prismaRead.user.findMany();

// Write 작업
const user = await prisma.user.create({...});
```

---

### 3.3 Connection Pooling

**PgBouncer 설정** (50k+ DAU):

```ini
[databases]
destinypal = host=db.supabase.co port=5432 dbname=postgres

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 100
```

**효과**:

- Connection 재사용 → DB 부하 ↓
- 동시 연결 1000+ 지원

---

## 4. 캐싱 전략

### 4.1 Redis 캐시 구조

**캐시 키 패턴**:

```typescript
export const CACHE_KEYS = {
  SAJU: (userId: string, birthDate: string) => `saju:v1:${userId}:${birthDate}`,
  TAROT: (readingId: string) => `tarot:v1:${readingId}`,
  COMPATIBILITY: (ids: string[]) => `compat:v1:${ids.sort().join(':')}`,
  CHART: (birthData: string) => `chart:v1:${birthData}`,
  DAILY_FORTUNE: (userId: string, date: string) => `fortune:v1:${userId}:${date}`,
}
```

**TTL 설정**:

```typescript
export const CACHE_TTL = {
  SAJU_RESULT: 60 * 60 * 24 * 7, // 7일 (불변)
  TAROT_READING: 60 * 60 * 24, // 1일
  COMPATIBILITY: 60 * 60 * 24 * 7, // 7일
  CHART: 60 * 60 * 24 * 30, // 30일
  DAILY_FORTUNE: 60 * 60 * 6, // 6시간
}
```

---

### 4.2 캐시 전략별 히트율

| 전략           | 히트율 | 설명            |
| -------------- | ------ | --------------- |
| 사주 계산 결과 | 85%    | 생년월일은 고정 |
| AI 응답        | 30%    | 동일 질문 반복  |
| 점성술 차트    | 70%    | 날짜별 재사용   |
| 호환성 분석    | 60%    | 조합 패턴 반복  |

**총 캐시 절감**:

- DB 부하: -60%
- AI 비용: -30%
- 응답 시간: -40%

---

### 4.3 분산 레이트 리미팅

**Redis 기반 Rate Limiter**:

```typescript
export async function checkRateLimit(
  identifier: string, // IP 또는 userId
  endpoint: string,
  limit: number,
  window: number // 초
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${endpoint}:${identifier}`

  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, window)
  }

  const allowed = current <= limit
  const remaining = Math.max(0, limit - current)

  return { allowed, remaining }
}
```

**적용**:

- 타로: 60초당 40회
- 사주: 60초당 30회
- 기본: 60초당 20회

---

## 5. 모니터링 및 알림

### 5.1 핵심 지표 대시보드

**실시간 모니터링** (Grafana/Datadog):

```
📊 Infrastructure Dashboard

응답 시간:
- P50: 450ms
- P95: 1.8s
- P99: 3.2s

에러율:
- 4xx: 0.2%
- 5xx: 0.01%

DB 성능:
- Connection Pool: 72/100 (72% 사용)
- Query Time (P95): 120ms
- Slow Queries: 3/min

Redis:
- 메모리 사용: 3.2GB / 4GB (80%)
- Hit Rate: 68%

AI API:
- 요청: 20,000/일
- 비용: $600/일
- 평균 응답: 2.1s
```

---

### 5.2 알림 설정

**Critical Alerts** (즉시 대응):

```yaml
- Response Time P95 > 3s
- Error Rate > 1%
- DB Connection Pool > 95%
- Redis Memory > 90%
```

**Warning Alerts** (24시간 내 대응):

```yaml
- Response Time P95 > 2s
- Error Rate > 0.5%
- DB Connection Pool > 80%
- Redis Memory > 80%
```

**슬랙 알림 예시**:

```
🚨 Critical Alert

Response Time P95: 3.2s (목표: 2s)
Time: 2026-01-31 14:30 KST

Possible causes:
- DB slow query detected
- Spike in traffic (+50%)

Action required: Check DB performance
```

---

## 6. 비용 최적화 전략

### 6.1 레벨별 비용 분석

| DAU  | 인프라  | AI       | 총 비용  | 사용자당 비용 |
| ---- | ------- | -------- | -------- | ------------- |
| 10k  | $55     | $9,000   | $9,055   | $0.91         |
| 50k  | $719    | $45,000  | $45,719  | $0.91         |
| 100k | $3,000  | $54,000  | $57,000  | $0.57         |
| 500k | $27,000 | $270,000 | $297,000 | $0.59         |
| 1M   | $27,000 | $180,000 | $207,000 | $0.21         |

**인사이트**:

- 스케일 이코노미: 사용자당 비용 $0.91 → $0.21 (77% 감소)
- AI 비용 최적화 필수 (독자 모델)

---

### 6.2 예약 인스턴스 활용

**500k+ DAU 시**:

- AWS Reserved Instances (1-3년)
- 비용 절감: 40-60%
- 예상 절감: $10,000/월

---

## 7. 재해 복구 (DR)

### 7.1 백업 전략

**데이터베이스**:

- 자동 백업: 매일 02:00 AM (UTC)
- Retention: 30일
- PITR (Point-in-Time Recovery): 지원

**Redis**:

- RDB 스냅샷: 매 1시간
- AOF (Append-Only File): 활성화

---

### 7.2 재해 시나리오

**시나리오 1: DB 장애**

**복구 시간 목표 (RTO)**: 15분
**복구 지점 목표 (RPO)**: 5분

**절차**:

1. Read Replica를 Master로 승격
2. DNS 변경 (Supabase 자동)
3. 애플리케이션 재시작

---

**시나리오 2: 전체 리전 장애**

**RTO**: 1시간
**RPO**: 1시간

**절차**:

1. Multi-region 장애 조치 (1M+ DAU 시)
2. 백업 리전으로 트래픽 라우팅
3. 데이터 복구

---

## 8. 실행 체크리스트

### 50k DAU 준비

- [ ] Supabase Team 플랜 업그레이드
- [ ] Read Replica 1개 추가
- [ ] PgBouncer 설정
- [ ] Redis Pro 업그레이드
- [ ] 모니터링 대시보드 구축
- [ ] 알림 설정 (Critical + Warning)

### 100k DAU 준비

- [ ] Vercel Enterprise 협의
- [ ] Read Replica 2개 추가 (총 3개)
- [ ] 데이터베이스 파티셔닝 (Reading, UserInteraction)
- [ ] Write Queue 도입 (BullMQ)
- [ ] Redis Cluster 전환
- [ ] OpenAI Enterprise Tier

### 500k+ DAU 준비

- [ ] Citus (분산 PostgreSQL) 전환
- [ ] 독자 AI 모델 개발 완료
- [ ] Multi-region 아키텍처 설계
- [ ] Kubernetes 도입 검토
- [ ] DR 계획 수립

---

**관련 문서**:

- [08_AI_COST_OPTIMIZATION.md](./08_AI_COST_OPTIMIZATION.md)
- [10_TECHNICAL_ROADMAP.md](./10_TECHNICAL_ROADMAP.md)
- [06_FINANCIAL_MODEL.md](./06_FINANCIAL_MODEL.md)
