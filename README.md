# DestinyPal

> 📘 **[→ 전체 프로젝트 개요 보기 (OVERVIEW.md)](OVERVIEW.md)** - 모든 정보를 한 곳에서!

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7.3-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

[![Security](https://img.shields.io/badge/security-hardened-green)](#security)
[![Secrets Scanning](https://img.shields.io/badge/secrets-gitleaks-blue)](https://github.com/gitleaks/gitleaks)
[![Token Encryption](https://img.shields.io/badge/encryption-AES--256--GCM-brightgreen)](#oauth--authentication)

AI 기반 운세/점술 종합 상담 플랫폼. 사주, 타로, 주역, 수비학, 꿈해몽, 전생분석, 궁합, 서양점성술 등 8개 이상의 점술 시스템을 AI와 결합한 SaaS 서비스.

---

## Project Scale

| Category              | Count                              |
| --------------------- | ---------------------------------- |
| App Router Pages      | 75 (`page.*`)                      |
| API Route Handlers    | 135 (`src/app/api/**/route.*`)     |
| React Components      | 306 (`src/components/**/*.tsx`)    |
| Library Modules       | 44 top-level (`src/lib/*`)         |
| Database Models       | 42 (Prisma)                        |
| Test Files            | 1005 unit/integration + 54 E2E     |
| Dependencies          | 81 (prod + dev)                    |
| Languages (i18n)      | 2 (ko, en)                         |
| CI/CD Workflows       | 12                                 |
| Environment Variables | 65 (.env.example)                  |

---

## Architecture

```
[Browser / Mobile App (Capacitor)]
   |
   v
[Next.js 16 App Router] ──── [PostgreSQL (Supabase / Prisma ORM)]
   |          |
   |          └── [Redis (Upstash, optional)]
   |
   ├── [135 API Routes] ──── [Flask AI Backend] ──── [LLM Providers]
   |                                                   ├─ OpenAI
   |                                                   ├─ Replicate
   |                                                   └─ Together
   |
   └── [Third-party Services]
        ├─ NextAuth (OAuth)
        ├─ Stripe (Payments)
        ├─ Resend (Email)
        ├─ Firebase (Auth/Storage)
        ├─ Sentry (Error Tracking)
        └─ Analytics (GA, Kakao, Clarity)
```

---

## Core Features

### Divination Systems (8+)

- **사주 (Four Pillars)** - 한국 전통 사주팔자 분석, 일주론, 대운/세운
- **타로 (Tarot)** - 다중 스프레드, 3종 카드 덱 (Modern, Mystic, Nouveau)
- **주역 (I Ching)** - 64괘 해석, 변효 분석
- **수비학 (Numerology)** - 생명수, 운명수, 성격수 분석
- **꿈해몽 (Dream)** - AI 기반 꿈 해석
- **전생분석 (Past Life)** - AI 전생 분석
- **궁합 (Compatibility)** - 관계 궁합 분석, 상담사 모드
- **서양점성술 (Western Astrology)** - 출생 차트, 행성, 하우스, 프로그레션, 소행성, 이클립스 등 고급 분석

### AI & Streaming

- 3개 LLM 프로바이더 통합 (OpenAI, Replicate, Together)
- 실시간 스트리밍 응답 (SSE)
- RAG (Retrieval-Augmented Generation) 파이프라인
- 페르소나 메모리 (대화 맥락 축적)

### Premium & Monetization

- 크레딧 기반 과금 시스템
- Stripe 구독 관리
- 프리미엄 리포트 생성
- 컨텐츠 접근 제어
- 리퍼럴 보상 시스템

### User Features

- 운명 캘린더 (일정 저장)
- 상담 히스토리 (요약 포함)
- 저장된 인물 관리 (가족, 친구, 파트너)
- 매칭 프로필 & 메시징
- 푸시 알림 (Web Push)

### Platform

- PWA (오프라인 지원)
- 모바일 앱 (Capacitor - iOS/Android)
- 다국어 지원 (현재 ko/en, 추가 예정)
- 관리자 대시보드 (메트릭스, 퍼널 분석, 환불 관리)

---

## Tech Stack

### Frontend

- **Framework:** Next.js 16.1 (App Router), React 19.2, TypeScript 5.9
- **Styling:** Tailwind CSS 3.4, CSS Modules, Framer Motion 12
- **State:** React Context, Server Components
- **Mobile:** Capacitor 8 (Android/iOS)
- **PWA:** @ducanh2912/next-pwa

### Backend

- **API:** Next.js API Routes (135 endpoints)
- **AI Server:** Python Flask (RAG pipeline, LLM orchestration)
- **Database:** PostgreSQL (Supabase) + Prisma 7.3 ORM (42 models)
- **Cache:** Redis (Upstash) - optional
- **Auth:** NextAuth 4.24 + Firebase

### Infrastructure

- **Hosting:** Vercel (Frontend), Docker (Backend)
- **Payments:** Stripe
- **Email:** Resend
- **Monitoring:** Sentry, Vercel Speed Insights
- **Analytics:** Google Analytics, Kakao Analytics, Microsoft Clarity
- **CI/CD:** GitHub Actions (12 workflows)

### Testing

- **Unit/Integration:** Vitest (1005 test files)
- **E2E:** Playwright (54 specs)
- **Load:** k6 (basic, stress, spike, endurance)
- **Accessibility:** vitest-axe, axe-core
- **Security:** OWASP ZAP scanning

### Security

- **Token Encryption:** AES-256-GCM for OAuth tokens
- **Secrets Scanning:** Gitleaks (pre-commit & CI/CD)
- **Environment Validation:** Runtime type-safe env vars (Zod)
- **Rate Limiting:** Redis-based IP & user throttling
- **CSRF Protection:** Origin/Referer validation
- **Security Headers:** CSP, X-Frame-Options, HSTS
- **Logging:** Structured logging with auto-sanitization (no secrets in logs)
- **Pre-commit Hooks:** Automatic secret detection & console.log prevention
- **CI/CD Checks:** Token encryption validation, secret scanning, env validation

**Security Resources:**

- [Security Best Practices](docs/SECURITY_BEST_PRACTICES.md)
- [Security Hardening Guide](docs/SECURITY_HARDENING.md)
- [Security Cleanup Scripts](.security-cleanup/)

---

## Quickstart (Local)

### Prerequisites

- Node.js 20+
- Python 3.10+
- PostgreSQL (or Supabase account)

### Frontend

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill required values in .env.local

# 3. Setup database
npx prisma migrate dev

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000
```

### Backend AI

```bash
cd backend_ai
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt -r requirements-dev.txt
python main.py
```

### Docker Compose

```bash
docker compose up --build
```

---

## Scripts

### Development

| Command                   | Description            |
| ------------------------- | ---------------------- |
| `npm run dev`             | Next.js 개발 서버 시작 |
| `npm run test:watch`      | 테스트 워치 모드       |
| `npm run typecheck:watch` | 실시간 TypeScript 체크 |

### Quality

| Command                 | Description                        |
| ----------------------- | ---------------------------------- |
| `npm run lint`          | ESLint 실행                        |
| `npm run lint:fix`      | ESLint 자동 수정                   |
| `npm run typecheck`     | TypeScript 타입 체크               |
| `npm run check:all`     | lint + typecheck + tests 전체 실행 |
| `npm run quality:check` | 커버리지 포함 품질 체크            |

### Testing

| Command                    | Description          |
| -------------------------- | -------------------- |
| `npm test`                 | 전체 테스트 실행     |
| `npm run test:coverage`    | 커버리지 리포트 생성 |
| `npm run test:e2e`         | E2E 테스트 실행      |
| `npm run test:performance` | 성능 테스트 실행     |
| `npm run test:a11y`        | 접근성 테스트 실행   |

### Build & Deploy

| Command                 | Description          |
| ----------------------- | -------------------- |
| `npm run build`         | 프로덕션 빌드        |
| `npm run build:analyze` | 번들 분석 빌드       |
| `npm run start`         | 프로덕션 서버 시작   |
| `npm run check:env`     | 환경변수 유효성 검증 |

---

## Project Structure

```
saju-astro-chat/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (main)/             # Main layout group
│   │   ├── api/                # 135 API endpoints
│   │   ├── admin/              # Admin dashboard
│   │   ├── tarot/              # Tarot readings
│   │   ├── saju/               # Four Pillars analysis
│   │   ├── astrology/          # Western astrology
│   │   ├── iching/             # I Ching divination
│   │   ├── numerology/         # Numerology
│   │   ├── dream/              # Dream interpretation
│   │   ├── past-life/          # Past life analysis
│   │   ├── compatibility/      # Compatibility analysis
│   │   ├── destiny-map/        # Life blueprint
│   │   ├── destiny-matrix/     # Matrix analysis
│   │   ├── pricing/            # Pricing page
│   │   └── ...                 # 35+ route groups
│   ├── components/             # 306 React components
│   ├── lib/                    # 44 library modules
│   │   ├── Saju/               # Four Pillars engine
│   │   ├── Tarot/              # Tarot deck & logic
│   │   ├── iChing/             # I Ching hexagram data
│   │   ├── ai/                 # LLM integration
│   │   ├── auth/               # Authentication
│   │   ├── payments/           # Stripe integration
│   │   ├── cache/              # Redis caching
│   │   ├── i18n/               # Internationalization
│   │   ├── streaming/          # SSE streaming
│   │   ├── security/           # Security utilities
│   │   └── ...                 # 35+ modules
│   └── types/                  # TypeScript type definitions
├── backend_ai/                 # Python AI backend (Flask)
│   ├── app/                    # Application logic & RAG
│   └── data/                   # Corpus & rules data
├── prisma/
│   └── schema.prisma           # 35 database models
├── tests/                      # 1005 test files
│   ├── lib/                    # Unit tests
│   ├── e2e/                    # API E2E tests
│   ├── performance/            # Performance & load tests
│   └── a11y/                   # Accessibility tests
├── e2e/                        # Playwright browser tests (54 specs)
├── public/                     # Static assets, blog content
├── docs/                       # Documentation guides (active + archive)
└── .github/workflows/          # 12 CI/CD workflows
```

---

## Documentation

### 📚 Main Docs

- **[Documentation Hub](docs/README.md)** - Central index for all documentation
- **[Roadmap](ROADMAP.md)** - Technical development roadmap (2026-2030)
- **[Unicorn Strategy](UNICORN_STRATEGY.md)** - Business strategy & KPI targets
- **[Refactoring Guide](REFACTORING_GUIDE.md)** - Code improvement strategy

### 🎯 Feature Docs

- **[Credit Error Messages](docs/CREDIT_ERROR_MESSAGES.md)** - Improved UX for credit limits (NEW ✨)

### 🔧 Technical Guides

- **[API Guide](src/lib/api/README.md)** - API design principles
- **[Cache Versioning](src/lib/cache/CACHE_VERSIONING.md)** - Cache management
- **[AI Backend](backend_ai/APP_PY_REFACTORING_COMPLETE.md)** - Python backend structure

### 📦 Archived

- **[Old Docs](docs/archive/)** - Legacy documentation (placeholder files moved here)

---

## Recent Improvements (as of 2026-02-02)

### Week 1: Security & Foundation ✅

- **npm Vulnerabilities**: Reduced from 16 HIGH → 3 moderate (81% improvement)
  - Updated Next.js 16.0.10 → 16.1.6
  - Fixed lodash, tar, diff security issues
- **Environment Validation**: Extended Zod schema for 8 critical API keys
- **TypeScript**: 0 type errors confirmed
- **Tests**: All 49 credit system tests passing

### Week 2: Performance & Integration ✅

- **Compatibility Backend**: Integrated Python compatibility module
  - Module structure with `__init__.py`
  - 5/5 integration tests passing
- **Rate Limiting**: Unified system (deprecated old in-memory)
  - Redis-based distributed rate limiting
  - Consistent across all 135 endpoints
- **Bundle Size CI**: Automatic enforcement
  - Main bundle: <500KB
  - Total JS: <3MB

### Week 3: Testing & Documentation ✅

- **Cache Versioning**: Auto-invalidation system
  - Versioned cache keys (e.g., `saju:v1:...`)
  - [CACHE_VERSIONING.md](src/lib/cache/CACHE_VERSIONING.md) documentation
- **API Smoke Tests**: Extended coverage
  - Compatibility: 3 tests
  - Tarot: 2 tests
  - Saju: 3 tests
  - Total: 8/8 passing
- **Architecture Documentation**: Updated [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Quick Links

- **[Documentation Hub](docs/README.md)** - All technical documentation
- **[Roadmap](ROADMAP.md)** - Development priorities
- **[API Guide](src/lib/api/README.md)** - API design
- **[Tests](tests/README.md)** - Test strategy

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Standards

- TypeScript strict mode
- ESLint + Prettier
- 100% test coverage for critical paths
- Pre-commit hooks (Husky)
- Secret scanning (Gitleaks)

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

For issues and questions:

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/saju-astro-chat/issues)
- **Email**: support@destinypal.com
- **Documentation**: [docs/](docs/)

---

## Acknowledgments

- Next.js team for excellent React framework
- Prisma for type-safe database access
- Vercel for hosting platform
- OpenAI for LLM capabilities
- All open-source contributors

---

**Built with ❤️ in South Korea**
