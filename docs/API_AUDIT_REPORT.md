---
title: API Audit Report
tags: [reference, api, security, auto]
status: auto-generated
---

# API Audit Report

> ⚙️ 자동 생성 (`npm run audit:api`). 라우트 **인벤토리**는 [[api-routes]],
> 여기는 **보안 감사**(미들웨어·인증·검증·public mutation) 관점.

## Summary

- Total Next.js API routes: 71
- Uses middleware/guards: 65 (91.5%)
- Has validation signals: 45 (63.4%)
- Rate limited (guard or option): 61 (85.9%)
- Credit consumption configured: 7 (9.9%)
- Requires auth: 40 (56.3%)
- Requires token: 16 (22.5%)
- skipCsrf enabled: 2 (2.8%)

## Method Distribution

- GET: 41
- POST: 38
- PUT: 0
- PATCH: 5
- DELETE: 5

## Missing Middleware (6)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/compatibility/counselor/result/route.ts [GET]
- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/tarot/couple-reading/route.ts [GET,POST,DELETE]
- src/app/api/tarot/couple-reading/[readingId]/route.ts [GET]
- src/app/api/tarot/interpret-stream/result/route.ts [GET]

## Missing Validation (11)

- src/app/api/admin/anomalies/route.ts [GET]
- src/app/api/admin/audit-log/route.ts [GET]
- src/app/api/admin/funnel/route.ts [GET]
- src/app/api/admin/revenue/route.ts [GET]
- src/app/api/admin/usage/route.ts [GET]
- src/app/api/admin/webhook-events/route.ts [GET]
- src/app/api/compatibility/counselor/result/route.ts [GET]
- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/tarot/interpret-stream/result/route.ts [GET]
- src/app/api/webhook/stripe/route.ts [POST]

## Public Mutations (No Auth/Token) (6)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/cron/reset-credits/route.ts [GET,POST]
- src/app/api/csp-report/route.ts [POST,GET]
- src/app/api/tarot/couple-reading/route.ts [GET,POST,DELETE]
- src/app/api/webhook/stripe/route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
