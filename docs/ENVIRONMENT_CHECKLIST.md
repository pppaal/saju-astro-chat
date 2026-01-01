# Environment Checklist

## How to use
1. Copy `.env.example` to `.env.local`.
2. Create `backend_ai/.env` for the Flask service.
3. Fill required values, then run:
   - `npm run check:env`
4. For production parity:
   - `NODE_ENV=production npm run check:env`

## Required (all environments)
- `NEXTAUTH_SECRET` (min 32 chars)
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `TOKEN_ENCRYPTION_KEY` (min 32 chars)
- `ADMIN_API_TOKEN`
- `PUBLIC_API_TOKEN`
- `PUBLIC_METRICS_TOKEN` (or legacy `METRICS_TOKEN`)
- `CRON_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## Required in production
- `NEXTAUTH_COOKIE_DOMAIN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`

## Backend URL selection
- `AI_BACKEND_URL` (server-only, preferred)
- `BACKEND_AI_URL` (used by some Next.js API routes)
- `NEXT_PUBLIC_AI_BACKEND` (public fallback for client)

## Public token pairing
- If `PUBLIC_API_TOKEN` is set, set `NEXT_PUBLIC_API_TOKEN` to the same value for browser calls.
- If `PUBLIC_METRICS_TOKEN` is set, set `NEXT_PUBLIC_PUBLIC_METRICS_TOKEN` to the same value for browser metrics calls.

## Email provider (conditional)
- `EMAIL_PROVIDER=resend` -> `RESEND_API_KEY`
- `EMAIL_PROVIDER=sendgrid` -> `SENDGRID_API_KEY`
- `EMAIL_PROVIDER=nodemailer` -> `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

## Recommended
- `AI_BACKEND_URL`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`
- `NEXT_PUBLIC_FIREBASE_CONFIG` (for visitors stats)
- `DIRECT_DATABASE_URL` (migrations)

## Backend AI (backend_ai/.env)
- `OPENAI_API_KEY`
- `ADMIN_API_TOKEN`
- `COUNSELOR_MODEL` (optional)
- `REDIS_URL` (optional)
- `CACHE_TTL` (optional)
- `CORS_ALLOWED_ORIGINS` (optional)
- `SENTRY_DSN` (optional)
- `API_RATE_PER_MIN` (optional)
- `WARMUP_ON_START` (optional)
- `RAG_DEVICE`, `RAG_CPU_THREADS`, `RAG_MODEL` (optional)
- `SANITIZER_MAX_INPUT`, `SANITIZER_MAX_DREAM`, `SANITIZER_MAX_NAME` (optional)
- `ASTRONOMY_API_ID`, `ASTRONOMY_API_SECRET` (optional)

## Checklist
- `.env` files are not committed
- Secrets are stored in a secret manager in prod
- `npm run check:env` passes
- `NODE_ENV=production npm run check:env` passes for prod
