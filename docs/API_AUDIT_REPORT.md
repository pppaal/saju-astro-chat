# API Audit Report

Generated: 2026-04-01 09:15:19.543 UTC

## Summary

- Total Next.js API routes: 140
- Uses middleware/guards: 138 (98.6%)
- Has validation signals: 114 (81.4%)
- Rate limited (guard or option): 131 (93.6%)
- Credit consumption configured: 14 (10.0%)
- Requires auth: 71 (50.7%)
- Requires token: 45 (32.1%)
- skipCsrf enabled: 2 (1.4%)

## Method Distribution

- GET: 73
- POST: 105
- PUT: 0
- PATCH: 3
- DELETE: 16

## Missing Middleware (2)

- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\review\assessment\route.ts [GET,POST]

## Missing Validation (4)

- src\app\api\destiny-feedback\route.ts [POST]
- src\app\api\icp\analytics\route.ts [POST]
- src\app\api\review\assessment\route.ts [GET,POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Public Mutations (No Auth/Token) (12)

- src\app\api\auth\register\route.ts [POST]
- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\cron\daily-fortune-post\route.ts [GET,POST]
- src\app\api\cron\notifications\route.ts [GET,POST]
- src\app\api\cron\reset-credits\route.ts [GET,POST]
- src\app\api\cron\weekly-fortune\route.ts [GET,POST]
- src\app\api\csp-report\route.ts [POST,GET]
- src\app\api\destiny-map\route.ts [POST]
- src\app\api\icp\analytics\route.ts [POST]
- src\app\api\metrics\track\route.ts [POST]
- src\app\api\review\assessment\route.ts [GET,POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
