# Build Instructions

Last audited: 2026-05-06 (Asia/Hong_Kong)

This document is the canonical setup and build guide for the current repository state.

## Prerequisites

- Node.js 20+
- npm 10+
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
- `ANTHROPIC_API_KEY`

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
```

## Deployment Notes (Vercel)

- Vercel deploys Next.js app (`npm run vercel-build`).
- AI calls go through `@anthropic-ai/sdk` directly — no separate backend service.
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

- confirm `ANTHROPIC_API_KEY` is set and valid
- check Next.js server logs for Claude API errors
- verify auth/token headers for protected routes

### Demo routes return 404

Expected behavior when token is missing or invalid.

Fix:

- set `DEMO_TOKEN`
- pass `?token=...` or header `x-demo-token`

## Verification Snapshot (2026-05-06)

Commands executed during the current documentation audit:

- `npm run docs:check-links` -> pass (8 files)
- `npx tsc -p tsconfig.json --noEmit` -> 0 errors
- `npm run lint` -> 0 errors
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both` -> `PASS=10 WARN=0 FAIL=0`
- `npx tsx scripts/ops/qa-counselor-questions.ts --lang=both` -> `PASS=42 WARN=0 FAIL=0`
