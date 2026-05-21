# DestinyPal

Last updated: 2026-05-21 (Asia/Seoul)

DestinyPal is a Next.js (App Router) application for **Saju (사주, Korean four‑pillars), Western astrology, Tarot, and AI counseling**, with a calendar/timing layer on top of a deterministic destiny engine. AI calls go directly through `@anthropic-ai/sdk` (Claude) from Next.js route handlers and are streamed to the client over SSE.

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **AI:** Claude via `@anthropic-ai/sdk`, streamed as SSE
- **Auth:** NextAuth (Google OAuth, JWT sessions) — OAuth is the only sign‑in method
- **Payments:** Stripe one‑time **credit packs** (no subscriptions sold)
- **Data:** Prisma (42 models)
- **Cache / rate limit:** Upstash Redis with an in‑memory fallback
- **Tests:** Vitest

## Quick start

```bash
npm ci                       # install
cp .env.example .env.local   # configure environment
npm run db:migrate           # apply Prisma migrations
npm run dev                  # start the app
```

## Required environment variables

Minimum for local development:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `PUBLIC_API_TOKEN`
- `ADMIN_API_TOKEN`
- `CRON_SECRET`
- `ANTHROPIC_API_KEY`

Production additionally needs Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, credit‑pack price IDs), Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`), and Google OAuth credentials. Optional hardening: set `RATE_LIMIT_FAIL_CLOSED=true` to deny (instead of using the per‑instance in‑memory fallback) when Redis is unavailable — recommended for multi‑instance/serverless deployments. See `.env.example` for the full list.

## Architecture

The deterministic core produces a judgment, and thin presentation adapters render it per surface:

```
Raw input → Feature → Rule → Pattern → Scenario → Verdict → Evaluation
```

- Core judgment entry: `src/lib/destiny-matrix/core/runDestinyCore.ts`
- Presentation adapters (calendar / counselor / report) live under `src/lib/destiny-matrix/core/`
- Role split: the core makes timing/judgment decisions; calendar, counselor, and report layers are presentation only.

## Auth & payments

- **Sign‑in:** Google OAuth only. There is no password/credentials login.
- **Credits:** one‑time credit packs purchased via Stripe Checkout — `mini` (5), `standard` (15), `plus` (40), `mega` (100), `ultimate` (250). Pack definitions live in `src/lib/config/pricing.ts` (single source of truth, also used by the Stripe webhook).
- **What costs credits (the paid surfaces):**
  - **Tarot** — `POST /api/tarot/interpret-stream` (large spreads of 8+ cards cost 2 credits)
  - **운명 (Destiny) counselor** — `POST /api/counselor/realtime`, billed **per session** (1 credit opens a session; turns within the session window are free)
  - **궁합 (Compatibility) counselor** — `POST /api/compatibility/counselor`
- **Refunds:** if a counselor SSE stream fails or returns empty, the charged credit is auto‑refunded.
- Subscription billing is **not** sold; webhook/reset plumbing is retained only for any pre‑existing subscribers.

## Repository snapshot

Measured with `npm run docs:stats` on 2026-05-21:

- API routes: `81`
- App pages: `51`
- Component files: `112`
- Prisma models: `42`
- Test files: `648`
- Markdown docs: `144`
- `.env.example` variables: `60`

API route audit (`npm run audit:api`, 2026-05-21):

- Total routes: `81`
- Uses middleware/guards: `78` (96.3%)
- Has validation signals: `60` (74.1%)
- Rate limited: `73` (90.1%)

## Quality checks

Run before pushing:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
```

## Documentation

- `docs/README.md` — documentation hub
- `docs/DESTINY_MATRIX.md` — destiny engine architecture and service wiring
- `docs/CALCULATION_SPEC.md` — calculation spec for the pipeline
- `docs/TAROT_OVERVIEW.md` — tarot routes, prompt rules, and assets
- `docs/API_AUDIT_REPORT.md` — generated per‑route middleware/validation/rate‑limit audit
