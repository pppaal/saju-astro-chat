---
title: API Audit Report
tags: [reference, api, security, auto]
status: auto-generated
---

# API Audit Report

> ⚙️ 자동 생성 (`npm run audit:api`). 라우트 **인벤토리**는 [[api-routes]],
> 여기는 **보안 감사**(미들웨어·인증·검증·public mutation) 관점.

## Summary

- Total Next.js API routes: 76
- Uses middleware/guards: 69 (90.8%)
- Has validation signals: 59 (77.6%)
- Rate limited (guard or option): 68 (89.5%)
- Credit consumption configured: 9 (11.8%)
- Requires auth: 47 (61.8%)
- Requires token: 16 (21.1%)
- skipCsrf enabled: 2 (2.6%)

## Method Distribution

- GET: 41
- POST: 44
- PUT: 0
- PATCH: 5
- DELETE: 6

## Missing Middleware (7)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/compatibility/counselor/result/route.ts [GET]
- src/app/api/counselor/realtime/result/route.ts [GET]
- src/app/api/counselor/warm/route.ts [POST]
- src/app/api/tarot/couple-reading/[readingId]/route.ts [GET]
- src/app/api/tarot/couple-reading/route.ts [GET,POST,DELETE]
- src/app/api/tarot/interpret-stream/result/route.ts [GET]

## Missing Validation (1)

- src/app/api/webhook/stripe/route.ts [POST]

## Public Mutations (No Auth/Token) (9)

- src/app/api/auth/[...nextauth]/route.ts [GET,POST]
- src/app/api/counselor/realtime/route.ts [POST]
- src/app/api/counselor/warm/route.ts [POST]
- src/app/api/cron/daily-fortune/route.ts [GET,POST]
- src/app/api/cron/reset-credits/route.ts [GET,POST]
- src/app/api/csp-report/route.ts [POST,GET]
- src/app/api/tarot/couple-reading/route.ts [GET,POST,DELETE]
- src/app/api/track/visit/route.ts [POST]
- src/app/api/webhook/stripe/route.ts [POST]

## Notes

- This report uses static pattern detection. Manual verification is required.
- Guard usage implies rate limiting by default, but custom overrides may change behavior.
- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.
- Missing validation only flagged when the route parses body or query input.
