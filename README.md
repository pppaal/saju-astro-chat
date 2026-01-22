# DestinyPal (Saju-Astro-Chat)

[![Tests](https://img.shields.io/badge/tests-22k%2B%20passing-brightgreen)](./tests)
[![Coverage](https://img.shields.io/badge/coverage-81%25-brightgreen)](./coverage)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Quality](https://img.shields.io/badge/quality-8.5%2F10-success)](./QUALITY_IMPROVEMENTS_SUMMARY.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

AI-assisted astrology, saju, tarot, and dream counseling platform with a Next.js app and a Flask AI backend.

## 🎯 Project Quality: 8.5/10

**Recent Improvements:**
- ✅ 22,000+ automated tests (81% coverage)
- ✅ Structured logging system
- ✅ Standardized error handling
- ✅ Comprehensive documentation

**Roadmap to 10/10:** See [PROJECT_QUALITY_10_ROADMAP.md](./PROJECT_QUALITY_10_ROADMAP.md)

## 📚 Documentation

### 💼 For Leadership
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - CEO/경영진용 요약 (비즈니스 임팩트, ROI, 의사결정 포인트)

### 🎯 For Engineers
- **[PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md)** - 전체 구현 체크리스트 (보안, 접근성, 성능, 테스트)
- [Quick Start Guide](#quickstart-local) - 5분 만에 시작하기
- [EXECUTION_GUIDE.md](docs/EXECUTION_GUIDE.md) - 상세 설정 가이드
- [ENVIRONMENT_CHECKLIST.md](docs/ENVIRONMENT_CHECKLIST.md) - 환경변수 설정

### 🏗️ Architecture & API
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - 시스템 아키텍처
- [API Documentation](docs/API.md) - REST API 엔드포인트

### 🔒 Security & Performance
- [SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md) - 보안 강화 가이드
- [PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md) - 성능 최적화 (RAG 3배 속도 향상)
- [PERFORMANCE_TESTING.md](docs/PERFORMANCE_TESTING.md) - 성능 테스트
- [TRACING.md](docs/TRACING.md) - Distributed tracing (OpenTelemetry)
- [REDIS_CACHE_GUIDE.md](docs/REDIS_CACHE_GUIDE.md) - Redis 캐싱

### 🧪 Testing & CI/CD
- [E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md) - E2E 테스트 가이드
- [tests/load/README.md](tests/load/README.md) - Load testing (k6)
- [CI_CD_PIPELINE.md](docs/CI_CD_PIPELINE.md) - CI/CD 파이프라인
- [CI_CD_QUICK_REFERENCE.md](docs/CI_CD_QUICK_REFERENCE.md) - CI/CD 빠른 참조
- [GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md) - GitHub Actions 설정
- [Backend Testing Guide](backend_ai/README_TESTING.md) - AI 백엔드 테스트

## Quickstart (local)
1. Install frontend deps:
   - `npm install` (or `npm ci`)
2. Copy `.env.example` to `.env.local` and fill required values.
3. Start the backend AI server (see below).
4. Start the frontend:
   - `npm run dev`
5. Open `http://localhost:3000`.

## Backend AI (local)
```bash
cd backend_ai
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt -r requirements-dev.txt
python main.py
```

## Docker Compose (local)
```bash
docker compose up --build
```

## 🛠️ Key Scripts

### Development
- `npm run dev` - Start Next.js dev server
- `npm run test:watch` - Run tests in watch mode (recommended for development)
- `npm run typecheck:watch` - Real-time TypeScript checking

### Quality Checks
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run typecheck` - TypeScript type checking
- `npm run check:all` - Run lint + typecheck + tests
- `npm run quality:check` - Full quality check with coverage

### Testing
- `npm test` - Run all tests (22,000+ tests)
- `npm run test:coverage` - Run tests with coverage report (81% coverage)
- `npm run test:backend` - Run backend AI tests
- `npm run test:e2e:api` - Run API e2e tests

### Build & Deploy
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run check:env` - Validate required environment variables

### Utilities
- `npm run migrate:logger` - Migrate console.log to structured logger
