# API Audit Report

## Summary

- Total Next.js API routes: 74
- Uses middleware/guards: 69 (93.2%)
- Has validation signals: 54 (73.0%)
- Rate limited (guard or option): 65 (87.8%)
- Credit consumption configured: 5 (6.8%)
- Requires auth: 41 (55.4%)
- Requires token: 17 (23.0%)
- skipCsrf enabled: 2 (2.7%)

## Method Distribution

- GET: 41
- POST: 44
- PUT: 0
- PATCH: 5
- DELETE: 10

## Missing Middleware (5)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/compatibility/counselor/result/route.ts [GET]
- src/app/api/counselor/realtime/refund-guest-turn/route.ts [POST]
- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/tarot/interpret-stream/result/route.ts [GET]

## Missing Validation (6)

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
