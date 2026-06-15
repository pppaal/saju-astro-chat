# API Security Audit Report

Last audited: 2026-06-15 (Asia/Hong_Kong)

Code-derived review of all current API routes after the 2026-06 restructure.
Supersedes the 2026-02 audit (summarized at the bottom). The route inventory and
machine signals live in the auto-generated `docs/API_AUDIT_REPORT.md`
(`npm run audit:api`); this document is the human security assessment.

## Method

- `npm run audit:api` for the route inventory and middleware/validation/rate-limit signals.
- Manual read-through of every route under `src/app/api/**`, grouped into three
  surfaces: (1) money/auth/admin, (2) user-owned data/content, (3) public/compute/cron.
- Shared guards reviewed: `src/lib/api/**` (middleware, guards, validators),
  `src/lib/security/csrf.ts`, `src/lib/auth/admin.ts`, `src/lib/credits/**`,
  `src/lib/config/pricing.ts`, `src/lib/payments/prices.ts`.

## Snapshot (`audit:api`, 2026-06-15)

- Total API routes: 76
- Uses middleware/guards: 69 (90.8%)
- Has validation signals: 59 (77.6%)
- Rate limited (guard or option): 68 (89.5%)
- Requires auth: 47 (61.8%) — the remainder are intentionally public (see below)
- skipCsrf enabled: 2 (2.6%) — Stripe webhook + CSP report (both correct)

## Result

**No Critical / High / Medium vulnerabilities found.** The codebase shows strong,
consistent security fundamentals. One cosmetic robustness nit (Low) is noted.

### AuthN

Authentication is enforced on every state-mutating and sensitive-read route via
`createAuthenticatedGuard()` / session checks. The ~38% of routes without auth are
public **by design** and rate-limited: pure calculators (`saju`, `astrology`),
public lookups (`cities`), tarot draw/interpret (credit-gated), analytics beacon
(`track/visit`), `csp-report`, and public `share/[id]`. Cron routes authenticate
with `CRON_SECRET` (timing-safe); the Stripe webhook authenticates by signature.

### AuthZ / IDOR

All user-owned resources are scoped to the authenticated user. Prisma reads/writes
by id consistently include `userId` in the `where` clause
(`counselor/session/*`, `tarot/save/[id]`, `me/*`, `referral/*`). Cache-recovery
endpoints key by `userId` (`tarotTurnResultKey(userId, turnId)`,
`compatTurnResultKey(userId, turnId)`), so a guessed `turnId` cannot reach another
user's result. `tarot/save` reading ids are hashes that include `userId`, making
cross-user collisions infeasible. `share/[id]` is public by design and returns only
`{ type, title, description, data, createdAt }` (no `userId`). Admin routes gate on
`isAdminUser()` (email allowlist + DB role, fail-closed).

### Payment integrity

Amounts and credit quantities come exclusively from server config
(`CREDIT_PACKS` in `src/lib/config/pricing.ts`, price ids from `STRIPE_PRICE_*`
env via `src/lib/payments/prices.ts`). The client only sends a pack identifier
(`mini`/`standard`/`plus`/`mega`/`ultimate`); no client-controlled price or credit
amount reaches checkout, the webhook, or admin grants. Admin grants are range-checked
(1–10000) with a per-admin daily cap and audit logging. Refunds compute amounts from
the actual Stripe balance transaction, never from request input.

### Stripe webhook

Hardened with: signature verification (`stripe.webhooks.constructEvent`), livemode
check (rejects test events in prod), timestamp/replay window (~5 min), idempotency
via a unique `stripeEventLog` constraint, and out-of-order handling
(refund-before-purchase) via `PendingCreditRevocation`. Credit grant + event log are
transactional.

### Abuse / rate limiting

All public endpoints are rate-limited (Upstash Redis with in-memory fallback;
`RATE_LIMIT_FAIL_CLOSED` available). Expensive LLM paths
(`tarot/interpret-stream`, `tarot/followup`, `compatibility/counselor`) are
credit-gated with single-use draw nonces and idempotent refunds on failed/short
streams, preventing free-replay and charge-without-delivery.

### Input validation

Zod schemas are applied broadly (77.6% audit signal; the gap is mostly GET routes
and the signature-validated Stripe webhook). User text destined for the LLM is
sanitized (e.g. `sanitizeForXmlTagBoundary`) and body sizes are enforced.

### SSRF / injection / info-leak

No route fetches a user-supplied URL (no SSRF surface). No raw SQL / shell sinks.
`passwordHash` is never returned (collapsed to a `hasPassword` boolean). Error
responses are sanitized — no stack traces or internal details to clients in
production. Token/secret comparisons are timing-safe (`timingSafeCompare`).

## Findings

| #   | Severity       | Area            | Location                             | Note                                                                                                                                                                                              |
| --- | -------------- | --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Low (cosmetic) | Maintainability | `src/lib/api/zodValidation/index.ts` | `citiesSearchQuerySchema` is re-exported only via `export * from './saju'`. It works today; an explicit re-export would harden it against a future switch to named exports. Not a security issue. |

## Intentional / accepted design

- `skipCsrf` on `webhook/stripe` (signature-authenticated) and `csp-report`
  (browser-posted reports) — correct.
- ~38% of routes are unauthenticated by design (public calculators, lookups,
  share links, analytics) — all rate-limited; none expose user-owned data.

## Prior audit (2026-02-15, historical)

The previous audit covered a different route set (145 routes; subscriptions rather
than one-time credit packs). Its three "RESOLVED" findings referenced routes that
have since been **removed** in the 2026-06 restructure (`content-access`,
`calendar/save`, `admin/refund-subscription`). That report is superseded by this one.
