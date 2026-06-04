# API Audit Report

## Summary

- Total Next.js API routes: 80
- Uses middleware/guards: 75 (93.8%)
- Has validation signals: 54 (67.5%)
- Rate limited (guard or option): 71 (88.8%)
- Credit consumption configured: 7 (8.8%)
- Requires auth: 49 (61.3%)
- Requires token: 16 (20.0%)
- skipCsrf enabled: 2 (2.5%)

## Method Distribution

- GET: 47
- POST: 43
- PUT: 0
- PATCH: 5
- DELETE: 10

## Missing Middleware (5)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/compatibility/counselor/result/route.ts [GET]
- src/app/api/counselor/realtime/refund-guest-turn/route.ts [POST]
- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/tarot/interpret-stream/result/route.ts [GET]

## Missing Validation (12)

- src/app/api/admin/anomalies/route.ts [GET]
- src/app/api/admin/audit-log/route.ts [GET]
- src/app/api/admin/funnel/route.ts [GET]
- src/app/api/admin/revenue/route.ts [GET]
- src/app/api/admin/usage/route.ts [GET]
- src/app/api/admin/webhook-events/route.ts [GET]
- src/app/api/compatibility/counselor/result/route.ts [GET]
- src/app/api/counselor/realtime/refund-guest-turn/route.ts [POST]
- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/tarot/interpret-stream/result/route.ts [GET]
- src/app/api/webhook/stripe/route.ts [POST]

## Public Mutations (No Auth/Token) (6)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/refund-guest-turn/route.ts [POST]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/cron/reset-credits/route.ts [GET,POST]
- src/app/api/csp-report/route.ts [POST,GET]
- src/app/api/webhook/stripe/route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
