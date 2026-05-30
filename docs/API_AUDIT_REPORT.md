# API Audit Report

## Summary

- Total Next.js API routes: 73
- Uses middleware/guards: 71 (97.3%)
- Has validation signals: 55 (75.3%)
- Rate limited (guard or option): 65 (89.0%)
- Credit consumption configured: 4 (5.5%)
- Requires auth: 41 (56.2%)
- Requires token: 17 (23.3%)
- skipCsrf enabled: 2 (2.7%)

## Method Distribution

- GET: 41
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
