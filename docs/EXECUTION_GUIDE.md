# Execution Guide

## Prerequisites
- Node.js 20
- Python 3.10
- Postgres (local or hosted)
- Redis (optional)

## Frontend setup
1. Install deps:
   - `npm install` (or `npm ci`)
2. Create `.env.local` from `.env.example`.
3. Configure `DATABASE_URL` and auth secrets.
4. Optional: run Prisma migrations:
   - `npx prisma migrate dev`

## Backend AI setup
1. Create `backend_ai/.env` with at least:
   - `OPENAI_API_KEY`
   - `ADMIN_API_TOKEN`
2. Install deps and start:
   ```bash
   cd backend_ai
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt -r requirements-dev.txt
   python main.py
   ```

## Local run
1. Start backend AI on `http://localhost:5000`.
2. Set one of:
   - `AI_BACKEND_URL` (server-only, preferred)
   - `NEXT_PUBLIC_AI_BACKEND` (public, fallback)
3. Start the Next.js dev server:
   - `npm run dev`

## Tests
- Frontend/unit:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:coverage`
- E2E API:
  - `npm run test:e2e:api`
- Backend AI:
  - `python -m pytest backend_ai/tests`

## Validation
- Env checks:
  - `npm run check:env`
- Use `docs/ENVIRONMENT_CHECKLIST.md` to verify secrets and optional integrations.
