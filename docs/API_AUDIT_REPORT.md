# API Audit Report

## Summary

- Total Next.js API routes: 74
- Uses middleware/guards: 72 (97.3%)
- Has validation signals: 55 (74.3%)
- Rate limited (guard or option): 66 (89.2%)
- Credit consumption configured: 5 (6.8%)
- Requires auth: 42 (56.8%)
- Requires token: 17 (23.0%)
- skipCsrf enabled: 2 (2.7%)

## Method Distribution

- GET: 42
- POST: 45
- PUT: 0
- PATCH: 5
- DELETE: 10

## Missing Middleware (2)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/result/route.ts [GET]

## Missing Validation (3)

- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/webhook/stripe/route.ts [POST]

## Public Mutations (No Auth/Token) (7)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/cron/daily-fortune-post/route.ts [GET,POST]
- src/app/api/cron/notifications/route.ts [GET,POST]
- src/app/api/cron/reset-credits/route.ts [GET,POST]
- src/app/api/csp-report/route.ts [POST,GET]
- src/app/api/webhook/stripe/route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
