# API Audit Report

## Summary

- Total Next.js API routes: 72
- Uses middleware/guards: 70 (97.2%)
- Has validation signals: 54 (75.0%)
- Rate limited (guard or option): 65 (90.3%)
- Credit consumption configured: 5 (6.9%)
- Requires auth: 41 (56.9%)
- Requires token: 17 (23.6%)
- skipCsrf enabled: 2 (2.8%)

## Method Distribution

- GET: 40
- POST: 44
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

## Public Mutations (No Auth/Token) (6)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/cron/daily-fortune-post/route.ts [GET,POST]
- src/app/api/cron/reset-credits/route.ts [GET,POST]
- src/app/api/csp-report/route.ts [POST,GET]
- src/app/api/webhook/stripe/route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
