# API Audit Report

## Summary

- Total Next.js API routes: 75
- Uses middleware/guards: 73 (97.3%)
- Has validation signals: 56 (74.7%)
- Rate limited (guard or option): 67 (89.3%)
- Credit consumption configured: 4 (5.3%)
- Requires auth: 40 (53.3%)
- Requires token: 18 (24.0%)
- skipCsrf enabled: 2 (2.7%)

## Method Distribution

- GET: 41
- POST: 48
- PUT: 0
- PATCH: 4
- DELETE: 11

## Missing Middleware (2)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/review/assessment/route.ts [GET,POST]

## Missing Validation (3)

- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/review/assessment/route.ts [GET,POST]
- src/app/api/webhook/stripe/route.ts [POST]

## Public Mutations (No Auth/Token) (10)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/cron/daily-fortune-post/route.ts [GET,POST]
- src/app/api/cron/notifications/route.ts [GET,POST]
- src/app/api/cron/reset-credits/route.ts [GET,POST]
- src/app/api/csp-report/route.ts [POST,GET]
- src/app/api/destiny-map/route.ts [POST]
- src/app/api/metrics/track/route.ts [POST]
- src/app/api/review/assessment/route.ts [GET,POST]
- src/app/api/webhook/stripe/route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
