# CLAUDE.md

Orientation for anyone — human or AI agent — working in this repo. Read this
first, then follow the pointers into the canonical docs. Keep it short; link,
don't duplicate.

## What this is

**DestinyPal** — Saju (사주, Korean four-pillars) · Western astrology · Tarot ·
AI counseling, served as a Next.js app. The defining idea:

> The **judgment** (which signals matter, how Saju and astrology reinforce or
> contradict, what the timing is) is computed by a **deterministic engine in
> code**. The LLM only puts that judgment into warm, readable language.

So the engine is the product, and the LLM is a presentation layer. The whole
architecture follows from that split — see `OVERVIEW.md` and
`docs/DESTINY_ENGINE_ARCHITECTURE.md`.

## Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Framework | Next.js 16 (App Router) · React 19 · TypeScript (strict)     |
| AI        | Claude (Anthropic Messages API over HTTP), streamed over SSE |
| Auth      | Auth.js v5 (NextAuth) — Google OAuth only (JWT sessions)     |
| Payments  | Stripe one-time **credit packs** (no subscriptions)          |
| Data      | Prisma 7 + Postgres (Neon)                                   |
| Cache/RL  | Upstash Redis (in-memory fallback)                           |
| Mobile    | Capacitor (iOS/Android)                                      |

Node **20** (`.nvmrc`; `engines: >=20 <21`). Package manager: **npm** (`npm ci`).

## Setup

```bash
nvm use                 # Node 20
npm ci                  # installs + runs prisma generate (postinstall)
cp .env.example .env    # fill in secrets — see below
npm run check:env       # validates required env vars
npm run db:migrate      # apply Prisma migrations (needs DATABASE_URL)
npm run dev             # http://localhost:3000
```

Minimum env to boot (see `.env.example` for the full annotated list):
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TOKEN_ENCRYPTION_KEY`
(32-byte base64 or ≥32-char ASCII), plus Google OAuth + Stripe + Anthropic
keys for those features. `BUILD_INSTRUCTIONS.md` has the deep setup/troubleshooting.

## Commands you'll actually use

| Command                    | What                                                     |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Dev server (Turbopack)                                   |
| `npm run build`            | Production build                                         |
| `npm run lint`             | ESLint                                                   |
| `npm run lint:mojibake`    | Encoding/mojibake check (CI-enforced — see Conventions)  |
| `npm run typecheck`        | `tsc --noEmit` (must stay at **0 errors**)               |
| `npm test`                 | Vitest unit/integration (`vitest run`)                   |
| `npm run test:coverage`    | Vitest with V8 coverage                                  |
| `npm run test:e2e:browser` | Playwright E2E                                           |
| **`npm run check:all`**    | **lint + mojibake + typecheck + test — run before a PR** |
| `npm run format`           | Prettier write                                           |
| `npm run db:studio`        | Prisma Studio                                            |

CI additionally runs `ops:typecheck:gate` (no new type errors vs baseline) and
the destiny quality/release gates. See `docs/TESTING_AND_GUARDRAILS.md` for the
full gate list.

## Where things live

```
src/
  app/                 Next.js App Router — pages + 76 API route handlers (api/**/route.ts)
  components/          React UI
  lib/
    saju/              Saju four-pillars engine (deterministic) — 39 files
    astrology/         Western astrology; foundation/ wraps Swiss Ephemeris
    calendar-engine/   "운흐름" timing calendar (extractors → derivers)
    cross/             Saju × astrology fusion (pure)
    compatibility/     궁합 (synastry) formatters + facts
    destiny/           fact collectors feeding counselors/reports
    counselor/         counselor context + chat plumbing
    credits/           credit ledger, charge/refund, idempotency  ← money
    payments/ stripe/  Stripe packs, prices, checkout              ← money
    api/               middleware (auth/csrf/rate-limit/credits), zod validation
    security/          token crypto, csrf
    llm/               Claude client, SSE streaming, prompt safety
    config/            pricing.ts (SSOT for credit packs) + other constants
docs/                  canonical docs — start at docs/DOCS_INDEX.md
prisma/                schema (24 models) + migrations
tests/ e2e/            ~548 test files; e2e/critical-flows are the money paths
```

`docs/REPO_STRUCTURE.md` defines source-vs-generated boundaries.

## Conventions & invariants (don't break these)

**Determinism.** Engine code must be pure and reproducible. Natal pillars depend
only on birth input. Anything that needs "now" (대운/세운/transits/age) takes an
**injectable `now: Date = new Date()`** — never read the clock deep inside a calc
so production keeps working but tests can pin a date. See `src/lib/saju/saju.ts`
(`calculateSajuData(..., now)`) and `docs/SOLAR_TIME_CONVENTION.md`.

**Money is charged once, refunded safely.**

- Per-result idempotency uses **atomic create-as-lock**, not read-then-write:
  `claim()`/`release()` in `src/lib/api/idempotency.ts`, `refundCreditsOnce`,
  and the Stripe-event log. If you add a charge path, claim _before_ charging
  and release on failure.
- Credit deduction is atomic in one `prisma.$transaction`.
- Stripe webhook verifies signature on the **raw body**, dedupes by event id,
  and any handler that hits a transient DB error must **throw** so Stripe retries
  (never swallow into a success). See `docs/architecture/credits.md`.

**Security.** API routes go through `withApiMiddleware`, which composes CSRF,
auth, rate limiting, and credit gating. Admin auth is centralized in
`createAdminGuard`/`isAdminUser` (fail-closed). OAuth tokens are AES-256-GCM
encrypted; `encryptToken` **throws in production** if `TOKEN_ENCRYPTION_KEY` is
missing — don't reintroduce a plaintext fallback. See
`docs/SECURITY_AUDIT_REPORT.md`.

**i18n.** Korean + English. User-facing strings come in ko/en pairs; prompts live
in `src/lib/prompts` as co-located ko/en so they can't drift.

**Encoding.** `lint:mojibake` blocks mangled multibyte text — this is a Korean
product, so corrupted Hangul is a real failure class. Korean comments in code are
fine (the pre-commit hook only _warns_); avoid `console.*` (use `@/lib/logger`).

**pricing.ts is the single source of truth** for credit packs (starter 8 · mini 12
· standard 30 · plus 70 · mega 140 · ultimate 280; `starter` is a first-purchase-only
impulse pack, excluded from the /pricing grid). Docs and the Stripe webhook read from
it — don't hardcode pack sizes elsewhere.

## Deeper reading

- `docs/DOCS_INDEX.md` — the map of every canonical doc (start here)
- `docs/DESTINY_ENGINE_ARCHITECTURE.md` / `docs/DESTINY_MATRIX.md` — engine pipeline
- `docs/doctrine/{saju,astrology,tarot-doctrine,calculation-standards}.md` — domain rules
- `docs/CALCULATION_SPEC.md` — deterministic calculation pipeline
- `docs/TESTING_AND_GUARDRAILS.md` — required checks, goldens, release gate
- `docs/RUNBOOK.md` / `docs/DEPLOYMENT.md` — ops
- `CONTRIBUTING.md` — branch/PR/commit workflow
