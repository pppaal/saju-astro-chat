# API Security Audit Report

Last audited: 2026-02-15 (Asia/Seoul)

## Audit Inputs

Commands run:

```bash
npm run audit:api
npm run -s typecheck
npm run -s lint
npm test
```

Source artifacts:

- `docs/API_AUDIT_REPORT.md` (generated 2026-02-15)
- Route implementations under `src/app/api/**`

## Current Snapshot (from `audit:api`)

- Total API route files: `145`
- Uses middleware/guards: `136` (93.8%)
- Has validation signals: `113` (77.9%)
- Rate limited (guard/option): `129` (89.0%)
- Requires auth: `70` (48.3%)
- Requires token: `46` (31.7%)
- skipCsrf enabled: `2` (1.4%)

## Re-validation Of Prior Findings (2026-02-03 report)

### RESOLVED

1. Admin refund route lacked robust controls -> RESOLVED

- Evidence: `src/app/api/admin/refund-subscription/route.ts`
- Current state:
  - admin role check via `isAdminUser(...)`
  - rate limiting via `rateLimit(...)`
  - wrapped by `withApiMiddleware(...)`

2. Content access route lacked middleware controls -> RESOLVED

- Evidence: `src/app/api/content-access/route.ts`
- Current state:
  - `withApiMiddleware(...)`
  - `createAuthenticatedGuard(...)`
  - request/query validation via Zod schemas

3. Calendar save routes lacked middleware/validation/rate limits -> RESOLVED

- Evidence: `src/app/api/calendar/save/route.ts`
- Evidence: `src/app/api/calendar/save/[id]/route.ts`
- Current state:
  - authenticated guards
  - Zod validation
  - route-level rate limits

### OPEN

1. Non-middleware demo and NextAuth routes remain

- Evidence from `docs/API_AUDIT_REPORT.md` -> "Missing Middleware (9)"
- Includes:
  - `src/app/api/auth/[...nextauth]/route.ts`
  - demo endpoints under `src/app/api/demo/**`
- Assessment: expected for framework handler/demo use in many cases, but still a coverage gap to track.

2. Validation signals missing for two routes

- Evidence from `docs/API_AUDIT_REPORT.md` -> "Missing Validation (2)"
- Routes:
  - `src/app/api/icp/analytics/route.ts`
  - `src/app/api/webhook/stripe/route.ts`
- Assessment: webhook route can be acceptable with signature validation, but this remains a formal validation-coverage gap.

## Test/Quality Notes

- `npm run -s typecheck` -> pass
- `npm run -s lint` -> pass
- `npm test` -> fail in existing suites not limited to security concerns (see `docs/DOCS_AUDIT_REPORT_2026-02-15.md`)

## Recommendations

1. Keep `npm run audit:api` in CI for drift detection.
2. Decide whether demo routes should be explicitly exempted or migrated to standardized guard wrappers.
3. Add schema-level validation to `icp/analytics` route for parity.
4. Keep webhook security based on signature verification and event idempotency, while documenting validation exception rationale.
