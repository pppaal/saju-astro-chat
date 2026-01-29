# Architecture

> **Last Updated**: 2026-01-29
> 최신 개선사항 반영: 보안 강화, 성능 최적화, 통합 시스템 구축

---

## System Overview

```
[Browser / Mobile App (Capacitor)]
   |
   v
[Next.js 16 App Router] ──── [PostgreSQL (Supabase)]
   |          |                    └─ Prisma ORM (35 models)
   |          |
   |          └── [Redis (Upstash)]
   |                ├─ Caching (versioned keys)
   |                ├─ Rate Limiting (distributed)
   |                └─ Circuit Breaker (distributed)
   |
   ├── [128 API Routes]
   |    ├─ Authentication (NextAuth 4)
   |    ├─ Divination Services (Saju, Tarot, I Ching, etc.)
   |    ├─ Payments (Stripe)
   |    ├─ User Management
   |    └─ Admin Dashboard
   |
   ├── [Flask AI Backend]
   |    ├─ RAG Pipeline
   |    ├─ LLM Providers (OpenAI, Replicate)
   |    ├─ Compatibility Analysis (v1 integrated)
   |    └─ Graph RAG + Rule Engine
   |
   └── [Third-party Services]
        ├─ Stripe (Payments)
        ├─ Resend (Email)
        ├─ Firebase (Auth/Storage)
        ├─ Sentry (Error Tracking)
        └─ Analytics (GA, Kakao, Clarity)
```

---

## Core Components

### 1. Frontend (Next.js 16 + React 19)

#### Directory Structure
```
src/
├── app/                    # App Router pages & API routes
│   ├── (main)/            # Main app pages
│   ├── api/               # 128 API endpoints
│   └── layout.tsx         # Root layout
├── components/            # 317 React components
│   ├── compatibility/     # Compatibility analysis UI
│   ├── saju/             # Saju display components
│   ├── tarot/            # Tarot reading UI
│   └── ...
└── lib/                   # Shared utilities
    ├── auth/             # Authentication logic
    ├── cache/            # Redis caching (v1 versioning)
    ├── api/              # API middleware & error handling
    ├── security/         # CSRF, rate limiting, sanitization
    └── ...
```

#### Key Features
- **App Router**: File-system based routing with layouts
- **Server Components**: Optimal performance with RSC
- **Streaming**: Real-time AI responses via SSE
- **PWA**: Offline support with service workers
- **Mobile**: Capacitor for iOS/Android apps

### 2. Backend AI (Flask)

#### Directory Structure
```
backend_ai/
├── main.py               # Flask entry point
├── app/
│   ├── app.py           # Main application
│   ├── compatibility/   # Compatibility analysis module (NEW)
│   │   ├── __init__.py  # Module exports
│   │   ├── compatibility_logic.py  # Core logic
│   │   └── ...
│   ├── routers/         # API route handlers
│   └── ...
└── data/                # RAG corpus & rules
    ├── graph/           # Graph RAG data
    │   ├── rules/       # Rule-based logic
    │   └── persona/     # Persona configurations
    └── ...
```

#### Key Features
- **RAG Pipeline**: Retrieval-Augmented Generation for contextual responses
- **Compatibility Module**: Integrated 2-5 person analysis (2주차 완료)
- **Rule Engine**: Domain-specific logic for divination
- **Graph RAG**: Multi-layer knowledge graph

### 3. Database (PostgreSQL + Prisma)

#### Schema Overview (35 Models)
```prisma
model User {
  id            String
  email         String
  credits       Int           // Credit balance
  planType      PlanType      // free, starter, pro, premium
  subscriptions Subscription[]
  readings      Reading[]
  ...
}

model Reading {
  id       String
  userId   String
  type     ReadingType  // saju, tarot, iching, etc.
  data     Json
  credits  Int
  ...
}

model Subscription {
  userId        String
  planType      PlanType
  stripeId      String
  status        SubscriptionStatus
  currentPeriodEnd DateTime
  ...
}
```

#### Key Tables
- **Users**: Authentication, credits, subscriptions
- **Readings**: Historical consultations
- **SavedPersons**: Family, friends, partners
- **Calendar**: Destiny calendar events
- **Messages**: User messaging system
- **Admin**: Metrics, feedback, refunds

### 4. Caching Layer (Redis + Upstash)

#### Cache Strategy (NEW: Version Management)
```typescript
// Cache keys with versioning for auto-invalidation
CacheKeys = {
  saju: (birthDate, birthTime, gender) =>
    `saju:v1:${birthDate}:${birthTime}:${gender}`,

  tarot: (userId, question, spread) =>
    `tarot:v1:${userId}:${hash(question)}:${spread}`,

  compatibility: (person1, person2) =>
    `compat:v1:${person1}:${person2}`,

  // v2 when logic changes → automatic cache invalidation
}
```

#### TTL Configuration
```typescript
CACHE_TTL = {
  SAJU_RESULT: 7 days,      // Immutable (birth data)
  TAROT_READING: 1 day,     // Daily variation
  COMPATIBILITY: 7 days,
  GRADING_RESULT: 1 day,
}
```

### 5. Security Infrastructure

#### Layers
1. **Authentication**
   - NextAuth 4 with OAuth (Google, Kakao)
   - AES-256-GCM token encryption
   - Secure session management

2. **Rate Limiting** (NEW: Unified System - 2주차 완료)
   ```typescript
   // Distributed Redis-based rate limiting
   rateLimit({
     key: userIp,
     limit: 100,
     window: '1h',
     redis: upstashRedis
   })
   ```

3. **Input Validation**
   - Zod schema validation
   - Environment variable type-checking
   - Request sanitization

4. **Error Handling**
   - Auto-sanitized logs (no secrets)
   - Stack trace filtering
   - Sentry integration

5. **Security Headers**
   - CSP (Content Security Policy)
   - HSTS, X-Frame-Options
   - CSRF protection

---

## Request Flows

### AI Counseling Flow
```
1. Client Request
   └─> Next.js API Route (/api/saju, /api/tarot, etc.)

2. Authentication & Rate Limiting
   ├─> NextAuth session validation
   ├─> Redis rate limit check (distributed)
   └─> Credit balance verification

3. Cache Check
   └─> Redis: versioned cache lookup (e.g., saju:v1:...)

4. Cache Miss → Backend AI
   ├─> Flask /api/compatibility endpoint
   ├─> RAG context retrieval
   ├─> LLM generation (OpenAI/Replicate)
   └─> Streaming response

5. Cache Write
   └─> Redis: store result with TTL

6. Response
   └─> Stream to client via SSE
```

### Compatibility Analysis Flow (NEW)
```
1. POST /api/compatibility
   ├─ Validate: 2-5 persons required
   ├─ Check: user credits
   └─ Rate limit: distributed Redis

2. Backend AI Integration
   ├─ backend_ai.app.compatibility.interpret_compatibility()
   │   ├─ Saju analysis (10 Gods, Shinsals)
   │   ├─ Astrology analysis (aspects, houses)
   │   └─ Cross-system fusion
   │
   └─ interpret_compatibility_group() for 3+ people

3. Response
   ├─ Comprehensive compatibility score
   ├─ Element balance analysis
   ├─ Timing compatibility
   └─ Action items & growth points
```

### Payment Flow
```
1. Client Checkout
   └─> Stripe Checkout Session

2. Webhook Event
   ├─> /api/stripe/webhooks
   ├─> Signature verification
   └─> Update subscription in DB

3. Credit Allocation
   ├─> Plan credits added
   └─> User notified
```

---

## Deployment Architecture

### Production Environment
```
[Vercel Edge Network]
   ├─ Next.js Frontend (SSR + SSG)
   ├─ API Routes (Serverless Functions)
   └─ Static Assets (CDN)

[Backend Services]
   ├─ Flask AI Backend (Docker / Cloud Run)
   ├─ PostgreSQL (Supabase)
   ├─ Redis (Upstash)
   └─ Stripe Webhooks
```

### CI/CD Pipeline (13 Workflows)
```yaml
# .github/workflows/ci.yml
Build & Test:
  - Lint & Typecheck
  - Unit Tests (Vitest)
  - Integration Tests
  - E2E Tests (Playwright)
  - Coverage Report (Codecov)
  - Bundle Size Check (NEW - 2주차 완료)
    - Main: <500KB
    - Total JS: <3MB

Backend Tests:
  - Python pytest
  - Backend coverage

Deploy:
  - Vercel (automatic)
  - Docker build & push
```

---

## Performance Optimizations

### Frontend
- **Code Splitting**: Dynamic imports for heavy components
- **Bundle Size**: CI enforcement (<500KB main, <3MB total)
- **Lazy Loading**: Route-based & component-based
- **Server Components**: Minimal client JS
- **Image Optimization**: Next.js Image component

### Backend
- **Redis Caching**: Versioned keys with auto-invalidation (NEW)
- **Rate Limiting**: Distributed Redis-based (NEW)
- **Circuit Breaker**: Fault tolerance for external services
- **Connection Pooling**: Prisma connection management

### Database
- **Indexes**: Optimized queries on frequently accessed fields
- **Query Optimization**: Prisma select/include only needed fields
- **Connection Management**: Serverless-friendly pooling

---

## Scalability Considerations

### Horizontal Scaling
- **Stateless API Routes**: Scales with serverless functions
- **Distributed Cache**: Redis for shared state
- **Load Balancing**: Vercel edge network

### Vertical Scaling
- **Database**: Supabase auto-scaling
- **Redis**: Upstash auto-scaling
- **Backend AI**: Docker container scaling

---

## Monitoring & Observability

### Error Tracking
- **Sentry**: Real-time error monitoring
- **Auto-sanitization**: No secrets in logs
- **Stack traces**: Filtered for security

### Performance Monitoring
- **Vercel Speed Insights**: Core Web Vitals
- **Custom Metrics**: API response times
- **Cache Hit Rates**: Redis performance

### Analytics
- **Google Analytics**: User behavior
- **Kakao Analytics**: Korean market
- **Microsoft Clarity**: Session recordings

---

## Security Hardening (1주차 완료)

### Recent Improvements
1. **npm Vulnerabilities**: 16 HIGH → 3 moderate (81% reduction)
2. **Environment Validation**: Extended Zod schema for 8 critical keys
3. **Rate Limiting**: Unified Redis-based system (deprecated old in-memory)
4. **Bundle Size**: CI checks to prevent bloat
5. **Cache Versioning**: Auto-invalidation on logic changes

### Ongoing Security
- **Pre-commit Hooks**: Secret detection + lint
- **CI/CD Validation**: Token encryption + env checks
- **Secrets Scanning**: Gitleaks on every commit
- **Dependency Audits**: Weekly npm audit

---

## Development Workflow

### Local Development
```bash
# Frontend
npm run dev                # Next.js dev server (port 3000)

# Backend AI
cd backend_ai && python main.py  # Flask server (port 8000)

# Database
npx prisma studio          # DB GUI (port 5555)
```

### Testing
```bash
npm test                   # Unit/integration tests
npm run test:e2e          # Playwright E2E tests
npm run test:coverage     # Coverage report
npm run typecheck         # TypeScript validation
```

### Code Quality
```bash
npm run lint              # ESLint
npm run format            # Prettier
npm run check:env         # Environment validation
```

---

## Further Reading

- [API.md](./API.md) - API endpoints documentation
- [REDIS_CACHE_GUIDE.md](./REDIS_CACHE_GUIDE.md) - Caching strategies
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) - Security best practices
- [CACHE_VERSIONING.md](../src/lib/cache/CACHE_VERSIONING.md) - Cache version management
- [CI_CD_PIPELINE.md](./CI_CD_PIPELINE.md) - CI/CD workflows
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment guide
