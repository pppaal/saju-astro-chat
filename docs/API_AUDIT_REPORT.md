# API Audit Report

Generated: 2026-02-09 07:03:04.605 UTC

## Summary

- Total Next.js API routes: 135
- Uses middleware/guards: 134 (99.3%)
- Has validation signals: 112 (83.0%)
- Rate limited (guard or option): 127 (94.1%)
- Credit consumption configured: 16 (11.9%)
- Requires auth: 70 (51.9%)
- Requires token: 45 (33.3%)
- skipCsrf enabled: 2 (1.5%)

## Method Distribution

- GET: 72
- POST: 100
- PUT: 0
- PATCH: 3
- DELETE: 15

## Missing Middleware (1)

- src\app\api\auth\[...nextauth]\route.ts [GET,POST]

## Missing Validation (1)

- src\app\api\webhook\stripe\route.ts [POST]

## Public Mutations (No Auth/Token) (9)

- src\app\api\auth\register\route.ts [POST]
- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\cron\daily-fortune-post\route.ts [GET,POST]
- src\app\api\cron\notifications\route.ts [GET,POST]
- src\app\api\cron\reset-credits\route.ts [GET,POST]
- src\app\api\cron\weekly-fortune\route.ts [GET,POST]
- src\app\api\csp-report\route.ts [POST,GET]
- src\app\api\metrics\track\route.ts [POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.