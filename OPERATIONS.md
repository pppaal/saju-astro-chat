# Operations & Runbook

## Architecture & Data Flow (high level)
- **Frontend**: Next.js (app router), dynamic API routes under `src/app/api`. Uses NextAuth with Prisma/Postgres.
- **Backend AI**: Python service in `backend_ai/` (FastAPI/Flask style) providing model/RAG logic; communicates via `NEXT_PUBLIC_AI_BACKEND`.
- **Data**: Postgres via Prisma; Stripe for billing; Redis/Upstash for rate limiting; Firebase (optional) for visitors metrics; push via Web Push.
- **Auth**: NextAuth (Google/Kakao), JWT sessions, token revoke helpers.
- **Payments**: Stripe Checkout + Webhook (`/api/checkout`, `/api/webhook/stripe`) with price whitelist and metadata.

## Deploy / Rollback
- **Deploy**: `npm run build` → push to main → CI → deploy (Vercel or container). Backend AI deploy via `backend_ai` Dockerfile (Railway/Render/etc).
- **Runtime envs**: Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, DB URL, `NEXTAUTH_SECRET`, `UPSTASH_REDIS_REST_*`, Firebase config, VAPID keys, Sentry DSN.
- **Rollback**: redeploy previous build (Vercel: promote previous deployment; container: roll back image tag). For DB, use Prisma migrations rollback plan or manual backups.
- **Feature flags**: prefer env toggles for risky changes (e.g., `ENABLE_WEBHOOKS`, `ENABLE_PUSH`).

## Monitoring / Alerts / SLOs
- **Service health**: `/api/lib-health`, `/api/db-ping` for DB; add uptime checks. Track P99 latency and 5xx rate.
- **Payments**: Stripe webhook delivery status; alert on failures/retries.
- **Auth**: login error rate, token revoke failures.
- **Content**: AI backend latency/error rate; cache hit ratio if enabled.
- **SLO suggestions**:
  - Availability: 99.5% monthly for public API routes.
  - Latency: P95 < 800ms for key APIs (`/api/saju`, `/api/astrology`, `/api/checkout`).
  - Error budget: <1% 5xx over 30d.
- **Dashboards**: wire Sentry/Logs for Next.js and backend_ai; Stripe dashboard for billing; Upstash metrics for rate limit. Add alerts on SLO burn rates and webhook failures.

## Incident & Rollback Steps
1) Identify blast radius (auth, payments, AI backend). 2) Roll back latest deploy. 3) Invalidate caches if bad content. 4) Re-run smoke tests (health, checkout test-mode, webhook replay). 5) Postmortem: capture timeline, root cause, follow-ups.

## Run / Smoke
- `npm run lint`, `npm run build`
- `npm run test` (unit), `npm run test:e2e` (integration/vitest)
- `pytest backend_ai/tests`
- Stripe test-mode checkout + webhook replay to confirm billing path.
