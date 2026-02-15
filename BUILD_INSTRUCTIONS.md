# Build Instructions

Last audited: 2026-02-15 (Asia/Seoul)

This document is the canonical setup and build guide for the current repository state.

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.10+
- PostgreSQL (or Supabase Postgres)
- Optional: Redis/Upstash, Stripe CLI, Playwright browsers, k6

## Install

```bash
npm ci
```

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Set required values first:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `ADMIN_API_TOKEN`
- `PUBLIC_API_TOKEN`
- `CRON_SECRET`
- `AI_BACKEND_URL`

3. Validate configuration:

```bash
npm run check:env
```

### Required in production

- Redis/Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Cookie domain: `NEXTAUTH_COOKIE_DOMAIN`

## Database Setup

Generate Prisma client:

```bash
npm run postinstall
```

Run migrations:

```bash
npm run db:migrate
```

Migration status:

```bash
npm run db:status
```

## Local Development

Start Next.js app:

```bash
npm run dev
```

Start backend AI service:

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

## Build And Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Tests:

```bash
npm test
npm run test:e2e:smoke:public
npm run test:backend
```

## Deployment Notes (Vercel + Backend)

- Vercel deploys Next.js app (`npm run vercel-build`).
- Python backend (`backend_ai`) is deployed separately (Docker/Fly/VPS).
- Set `AI_BACKEND_URL` to backend service URL.
- Ensure Stripe webhook endpoint points to `/api/webhook/stripe` with `STRIPE_WEBHOOK_SECRET` configured.
- Demo routes require `DEMO_TOKEN`.

## Troubleshooting

### Missing env variables

Symptoms:

- startup failure
- auth/session errors
- webhook failures

Fix:

```bash
npm run check:env
```

Then fill missing keys in `.env.local`.

### Database connection or migration failures

Symptoms:

- Prisma connect timeout
- migration errors

Fix:

- Verify `DATABASE_URL` and `DIRECT_DATABASE_URL`
- Confirm DB is reachable
- Re-run `npm run db:status` and `npm run db:migrate`

### Stripe webhook issues

Symptoms:

- `/api/webhook/stripe` returns 400/500

Fix:

- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- Forward events with Stripe CLI in local testing
- Confirm webhook signing secret matches endpoint

### SSE/streaming issues

Symptoms:

- stream endpoints return fallback/errors
- no `text/event-stream` data

Fix:

- confirm `AI_BACKEND_URL` is reachable
- check backend logs in `backend_ai`
- verify auth/token headers for protected routes

### Demo routes return 404

Expected behavior when token is missing or invalid.

Fix:

- set `DEMO_TOKEN`
- pass `?token=...` or header `x-demo-token`

## Command Baseline (2026-02-15)

Commands executed during doc audit:

- `npm ci` -> pass
- `npm run -s typecheck` -> pass
- `npm run -s lint` -> pass
- `npm test` -> fail (existing suites, documented in `docs/DOCS_AUDIT_REPORT_2026-02-15.md`)
