# API Audit Report

Generated: 2026-02-09 01:49:02.436 UTC

## Summary

- Total Next.js API routes: 135
- Uses middleware/guards: 120 (88.9%)
- Has validation signals: 103 (76.3%)
- Rate limited (guard or option): 103 (76.3%)
- Credit consumption configured: 16 (11.9%)
- Requires auth: 69 (51.1%)
- Requires token: 16 (11.9%)
- skipCsrf enabled: 0 (0.0%)

## Method Distribution

- GET: 72
- POST: 100
- PUT: 0
- PATCH: 3
- DELETE: 15

## Missing Middleware (15)

- src\app\api\astrology\advanced\eclipses\route.ts [POST]
- src\app\api\astrology\advanced\fixed-stars\route.ts [POST]
- src\app\api\astrology\advanced\lunar-return\route.ts [POST]
- src\app\api\astrology\advanced\midpoints\route.ts [POST]
- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\csp-report\route.ts [POST,GET]
- src\app\api\feedback\records\route.ts [GET]
- src\app\api\lib-health\route.ts [GET]
- src\app\api\metrics\public\route.ts [GET]
- src\app\api\metrics\track\route.ts [POST]
- src\app\api\notifications\stream\route.ts [GET]
- src\app\api\precompute-chart\route.ts [POST]
- src\app\api\stats\route.ts [GET]
- src\app\api\tarot\interpret\route.ts [POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Missing Validation (32)

- src\app\api\admin\metrics\sla\route.ts [GET]
- src\app\api\astrology\chat-stream\route.ts [POST]
- src\app\api\astrology\route.ts [POST]
- src\app\api\auth\revoke\route.ts [POST]
- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\cron\daily-fortune-post\route.ts [GET,POST]
- src\app\api\cron\reset-credits\route.ts [GET,POST]
- src\app\api\cron\weekly-fortune\route.ts [GET,POST]
- src\app\api\dates\route.ts [GET]
- src\app\api\db-ping\route.ts [GET]
- src\app\api\destiny-map\chat-stream\route.ts [POST]
- src\app\api\destiny-matrix\ai-report\route.ts [POST,GET]
- src\app\api\destiny-matrix\report\route.ts [POST,GET]
- src\app\api\dream\stream\route.ts [POST]
- src\app\api\health\redis\route.ts [GET]
- src\app\api\iching\stream\route.ts [POST]
- src\app\api\lib-health\route.ts [GET]
- src\app\api\me\premium\route.ts [GET]
- src\app\api\me\route.ts [GET]
- src\app\api\me\saju\route.ts [GET]
- src\app\api\metrics\public\route.ts [GET]
- src\app\api\metrics\track\route.ts [POST]
- src\app\api\notifications\stream\route.ts [GET]
- src\app\api\referral\claim\route.ts [POST]
- src\app\api\referral\create-code\route.ts [POST]
- src\app\api\referral\me\route.ts [GET]
- src\app\api\referral\stats\route.ts [GET]
- src\app\api\saju\chat-stream\route.ts [POST]
- src\app\api\stats\route.ts [GET]
- src\app\api\user\upload-photo\route.ts [POST]
- src\app\api\webhook\stripe\route.ts [POST]
- src\app\api\weekly-fortune\route.ts [GET]

## Public Mutations (No Auth/Token) (38)

- src\app\api\astrology\advanced\asteroids\route.ts [POST]
- src\app\api\astrology\advanced\draconic\route.ts [POST]
- src\app\api\astrology\advanced\eclipses\route.ts [POST]
- src\app\api\astrology\advanced\electional\route.ts [POST]
- src\app\api\astrology\advanced\fixed-stars\route.ts [POST]
- src\app\api\astrology\advanced\harmonics\route.ts [POST]
- src\app\api\astrology\advanced\lunar-return\route.ts [POST]
- src\app\api\astrology\advanced\midpoints\route.ts [POST]
- src\app\api\astrology\advanced\progressions\route.ts [POST]
- src\app\api\astrology\advanced\rectification\route.ts [POST,GET]
- src\app\api\astrology\advanced\solar-return\route.ts [POST]
- src\app\api\astrology\details\route.ts [POST]
- src\app\api\auth\register\route.ts [POST]
- src\app\api\auth\[...nextauth]\route.ts [GET,POST]
- src\app\api\cron\daily-fortune-post\route.ts [GET,POST]
- src\app\api\cron\notifications\route.ts [GET,POST]
- src\app\api\cron\reset-credits\route.ts [GET,POST]
- src\app\api\cron\weekly-fortune\route.ts [GET,POST]
- src\app\api\csp-report\route.ts [POST,GET]
- src\app\api\destiny-map\route.ts [POST]
- src\app\api\destiny-matrix\report\route.ts [POST,GET]
- src\app\api\destiny-matrix\route.ts [GET,POST]
- src\app\api\dream\route.ts [POST,GET]
- src\app\api\iching\changing-line\route.ts [POST]
- src\app\api\life-prediction\analyze-question\route.ts [POST]
- src\app\api\life-prediction\backend-predict\route.ts [POST]
- src\app\api\life-prediction\explain-results\route.ts [POST]
- src\app\api\life-prediction\route.ts [POST,GET]
- src\app\api\metrics\track\route.ts [POST]
- src\app\api\numerology\route.ts [POST,GET]
- src\app\api\past-life\route.ts [POST]
- src\app\api\personality-compatibility\route.ts [POST]
- src\app\api\precompute-chart\route.ts [POST]
- src\app\api\share\generate-image\route.ts [POST]
- src\app\api\tarot\analyze-question\route.ts [POST]
- src\app\api\tarot\interpret\route.ts [POST]
- src\app\api\tarot\prefetch\route.ts [POST]
- src\app\api\webhook\stripe\route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports and safeParse calls; some manual validation may be missed.
