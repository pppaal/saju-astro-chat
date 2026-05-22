# API Audit Report

## Summary

- Total Next.js API routes: 79
- Uses middleware/guards: 76 (96.2%)
- Has validation signals: 59 (74.7%)
- Rate limited (guard or option): 71 (89.9%)
- Credit consumption configured: 4 (5.1%)
- Requires auth: 40 (50.6%)
- Requires token: 21 (26.6%)
- skipCsrf enabled: 2 (2.5%)

## Method Distribution

- GET: 44
- POST: 52
- PUT: 0
- PATCH: 4
- DELETE: 11

## Missing Middleware (3)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/route.ts [POST]
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
