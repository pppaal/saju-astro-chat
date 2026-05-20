# API Audit Report

## Summary

- Total Next.js API routes: 85
- Uses middleware/guards: 82 (96.5%)
- Has validation signals: 64 (75.3%)
- Rate limited (guard or option): 77 (90.6%)
- Credit consumption configured: 7 (8.2%)
- Requires auth: 44 (51.8%)
- Requires token: 22 (25.9%)
- skipCsrf enabled: 2 (2.4%)

## Method Distribution

- GET: 45
- POST: 57
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

## Public Mutations (No Auth/Token) (11)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/auth/register/route.ts [POST]
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
