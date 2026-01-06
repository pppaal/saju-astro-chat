# DestinyPal (Saju-Astro-Chat)

[![Tests](https://img.shields.io/badge/tests-116%20passing-brightgreen)](./tests)
[![Coverage](https://img.shields.io/badge/coverage-4.5%25-yellow)](./coverage)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Quality](https://img.shields.io/badge/quality-8.5%2F10-success)](./QUALITY_IMPROVEMENTS_SUMMARY.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

AI-assisted astrology, saju, tarot, and dream counseling platform with a Next.js app and a Flask AI backend.

## 🎯 Project Quality: 8.5/10

**Recent Improvements:**
- ✅ 116 automated tests
- ✅ Structured logging system
- ✅ Standardized error handling
- ✅ Comprehensive documentation

**Roadmap to 10/10:** See [PROJECT_QUALITY_10_ROADMAP.md](./PROJECT_QUALITY_10_ROADMAP.md)

## 📚 Documentation
### Getting Started
- [Quick Start Guide](#quickstart-local) - Start developing in 5 minutes
- [EXECUTION_GUIDE.md](docs/EXECUTION_GUIDE.md) - Detailed setup instructions
- [ENVIRONMENT_CHECKLIST.md](docs/ENVIRONMENT_CHECKLIST.md) - Environment configuration

### Quality & Best Practices
- [QUALITY_IMPROVEMENTS_SUMMARY.md](./QUALITY_IMPROVEMENTS_SUMMARY.md) - Quality improvements overview
- [QUICK_WINS.md](./QUICK_WINS.md) - 30-minute improvements you can apply today
- [PROJECT_QUALITY_10_ROADMAP.md](./PROJECT_QUALITY_10_ROADMAP.md) - Path to 10/10 quality

### Architecture
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [Backend Testing Guide](backend_ai/README_TESTING.md) - AI backend testing

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
- `npm test` - Run all tests (116 tests)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:backend` - Run backend AI tests
- `npm run test:e2e:api` - Run API e2e tests

### Build & Deploy
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run check:env` - Validate required environment variables

### Utilities
- `npm run migrate:logger` - Migrate console.log to structured logger
