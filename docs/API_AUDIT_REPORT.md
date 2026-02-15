# API Audit Report

Generated: 2026-02-15 11:11:40.502 UTC

## Summary

- Total Next.js API routes: 145
- Uses middleware/guards: 136 (93.8%)
- Has validation signals: 113 (77.9%)
- Rate limited (guard or option): 129 (89.0%)
- Credit consumption configured: 16 (11.0%)
- Requires auth: 70 (48.3%)
- Requires token: 46 (31.7%)
- skipCsrf enabled: 2 (1.4%)

## Method Distribution

- GET: 80
- POST: 102
- PUT: 0
- PATCH: 3
- DELETE: 15

## Missing Middleware (9)

- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\demo\calendar\route.ts [GET]
- src\app\api\demo\combined\route.ts [GET]
- src\app\api\demo\combined-pdf\route.ts [GET]
- src\app\api\demo\destiny-map\route.ts [GET]
- src\app\api\demo\icp\route.ts [GET]
- src\app\api\demo\personality\route.ts [GET]
- src\app\api\demo\tarot\route.ts [GET]
- src\app\api\demo_health\route.ts [GET]

## Missing Validation (2)

- src\app\api\icp\analytics\route.ts [POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Public Mutations (No Auth/Token) (10)

- src\app\api\auth\register\route.ts [POST]
- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\cron\daily-fortune-post\route.ts [GET,POST]
- src\app\api\cron\notifications\route.ts [GET,POST]
- src\app\api\cron\reset-credits\route.ts [GET,POST]
- src\app\api\cron\weekly-fortune\route.ts [GET,POST]
- src\app\api\csp-report\route.ts [POST,GET]
- src\app\api\icp\analytics\route.ts [POST]
- src\app\api\metrics\track\route.ts [POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
