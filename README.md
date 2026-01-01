# DestinyPal (Saju-Astro-Chat)

AI-assisted astrology, saju, tarot, and dream counseling platform with a Next.js app and a Flask AI backend.

## Docs
- docs/ARCHITECTURE.md
- docs/EXECUTION_GUIDE.md
- docs/ENVIRONMENT_CHECKLIST.md
- backend_ai/README_TESTING.md

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

## Key scripts
- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run lint` - lint
- `npm run typecheck` - TypeScript checks
- `npm run test` - unit tests
- `npm run test:coverage` - coverage
- `npm run test:e2e:api` - API e2e tests
- `npm run check:env` - validate required env vars
