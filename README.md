<div align="center">

<img src="public/logo.png" alt="DestinyPal logo" width="112" />

# DestinyPal

**Saju · Astrology · Tarot · AI counseling — built on a deterministic destiny engine, not a prompt wrapper.**

[![CI](https://github.com/pppaal/saju-astro-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/pppaal/saju-astro-chat/actions/workflows/ci.yml)
[![PR Checks](https://github.com/pppaal/saju-astro-chat/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/pppaal/saju-astro-chat/actions/workflows/pr-checks.yml)
[![Security Scan](https://github.com/pppaal/saju-astro-chat/actions/workflows/security.yml/badge.svg)](https://github.com/pppaal/saju-astro-chat/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Claude-D97757?logo=anthropic&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)

[**Live demo → destinypal.com**](https://destinypal.com) &nbsp;·&nbsp; [Documentation](docs/README.md) &nbsp;·&nbsp; [Architecture](docs/DESTINY_MATRIX.md)

</div>

---

## Why DestinyPal

Most "AI fortune" apps are a thin wrapper around a single prompt: they paste a birth date into an LLM and hope. DestinyPal is the opposite. The **judgment** — which signals matter, how Saju and astrology reinforce or contradict each other, what the timing is — is computed by a **deterministic engine** in code. The LLM only puts that judgment into warm, readable language.

That split is the whole point:

- **Reproducible.** The same input yields the same verdict — it's code, not vibes.
- **One core, many surfaces.** A single destiny core powers the calendar, the counselors, and the reports, so they never disagree with each other.
- **Honest money model.** Credits are charged once per result, failed AI streams refund automatically, and pack sizes have a single source of truth.

## Screenshots

<p align="center">
  <img src="docs/assets/home.jpg"  width="32%" alt="Home — AI destiny chat over a constellation sky" />
  <img src="docs/assets/tarot.jpg" width="32%" alt="Tarot — deck & spread picker with streamed readings" />
  <img src="docs/assets/about.jpg" width="32%" alt="About — Saju, astrology and tarot on one screen" />
</p>

## Features

- **Saju (사주)** — Korean four‑pillars chart, ten gods, luck pillars, and current timing.
- **Western astrology** — natal chart, transits, returns, and advanced techniques.
- **Tarot** — multiple spreads with streamed, personalized interpretations.
- **AI counselors** — a unified **Destiny (운명)** counselor and a **Compatibility (궁합)** counselor that fuse Saju + astrology into one conversation.
- **Fortune calendar** — day‑level "good / neutral / careful" guidance from the same engine.

## Tech stack

| Layer              | Choice                                                       |
| ------------------ | ------------------------------------------------------------ |
| Framework          | Next.js 16 (App Router) · React 19 · TypeScript              |
| AI                 | Claude via `@anthropic-ai/sdk`, streamed over SSE            |
| Auth               | Auth.js v5 (NextAuth) — Google OAuth only (JWT sessions)     |
| Payments           | Stripe one‑time **credit packs** (no subscriptions)          |
| Data               | Prisma 7 (22 models)                                         |
| Cache / rate limit | Upstash Redis + in‑memory fallback                           |
| Tests              | Vitest (≈16,000 unit tests) · Playwright E2E · k6 load tests |

## Architecture

The deterministic core produces a verdict; thin adapters render it per surface.

```mermaid
flowchart LR
    IN[Birth data / question] --> CORE
    subgraph CORE["Destiny core — runDestinyCore.ts"]
      direction LR
      F[Feature] --> R[Rule] --> P[Pattern] --> S[Scenario] --> V[Verdict]
    end
    CORE --> CAL[Calendar adapter]
    CORE --> CNS[Counselor adapter]
    CORE --> REP[Report adapter]
    CNS --> LLM[Claude · SSE]
    REP --> LLM
```

- Core judgment entry: `src/lib/destiny-matrix/core/runDestinyCore.ts`
- Presentation adapters live under `src/lib/destiny-matrix/core/`
- The core decides timing/judgment; calendar, counselor, and report layers are **presentation only**.

## Quick start

```bash
npm ci                       # install
cp .env.example .env.local   # configure environment
npm run db:migrate           # apply Prisma migrations
npm run dev                  # start the app at http://localhost:3000
```

### Required environment variables

Minimum for local development:

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_BASE_URL
TOKEN_ENCRYPTION_KEY
PUBLIC_API_TOKEN
ADMIN_API_TOKEN
CRON_SECRET
ANTHROPIC_API_KEY
```

Production additionally needs Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, credit‑pack price IDs), Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`), and Google OAuth credentials. Optional: `RATE_LIMIT_FAIL_CLOSED=true` denies requests (instead of using the per‑instance in‑memory fallback) when Redis is down — recommended for multi‑instance/serverless. See `.env.example` for the full list.

## Auth & credits

- **Sign‑in:** Google OAuth only — there is no password/credentials login.
- **Credits:** one‑time packs via Stripe Checkout — `mini` (10) · `standard` (40) · `plus` (100) · `mega` (240) · `ultimate` (500). Defined once in `src/lib/config/pricing.ts` (also used by the Stripe webhook).
- **Paid surfaces:**
  - **Tarot** — `POST /api/tarot/interpret-stream` (spreads of 5+ cards cost 2 credits, smaller spreads 1)
  - **Destiny counselor** — `POST /api/counselor/realtime`, billed **per message** (1 credit per turn)
  - **Compatibility counselor** — `POST /api/compatibility/counselor`
- **Refunds:** a counselor stream that fails or returns empty auto‑refunds the charged credit.

## Repository snapshot

Measured with `npm run docs:stats` on 2026-06-11:

| Metric          | Count |
| --------------- | ----: |
| API routes      |    70 |
| App pages       |    39 |
| Component files |   123 |
| Prisma models   |    22 |
| Test files      |   511 |
| Markdown docs   |   161 |

API route audit (`npm run audit:api`, 2026-06-11): **63 / 70** use middleware guards (90.0%), **62** are rate‑limited (88.6%), **43** have validation signals (61.4%). Full per‑route table: [`docs/API_AUDIT_REPORT.md`](docs/API_AUDIT_REPORT.md).

## Quality engineering

The deterministic-engine claim is enforced, not aspirational:

- **≈16,000 unit tests** across 440+ files run on every PR — including **determinism goldens** that lock the Saju/astrology verdicts (same birth data ⇒ byte-identical judgment).
- **27 CI checks per PR**: unit + integration + Playwright E2E (desktop/mobile), coverage gates with per-domain floors (auth/credits/payments/security), OWASP ZAP baseline, SAST, secret scan, dependency audit, Lighthouse accessibility, k6 performance smoke.
- **Money paths are locked**: Stripe webhook idempotency & replay-attack tests, refund eligibility matrix, stream-failure auto-refund, race-condition suites for credit consumption.
- **Docs drift gate**: generated reference docs (routes, costs, calculation standards) fail CI when they diverge from code.

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # vitest run (~2.5 min for the full suite)
```

## Documentation

- [`docs/README.md`](docs/README.md) — documentation hub
- [`docs/DESTINY_MATRIX.md`](docs/DESTINY_MATRIX.md) — destiny engine architecture
- [`docs/CALCULATION_SPEC.md`](docs/CALCULATION_SPEC.md) — calculation spec
- [`docs/TAROT_OVERVIEW.md`](docs/TAROT_OVERVIEW.md) — tarot routes, prompts, and assets
- [`docs/API_AUDIT_REPORT.md`](docs/API_AUDIT_REPORT.md) — generated per‑route audit

## License

[MIT](LICENSE) © 2026 DestinyPal
