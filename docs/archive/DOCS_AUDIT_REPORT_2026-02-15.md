# Docs Audit Report (2026-02-15)

Last audited: 2026-02-15 (Asia/Seoul)

## Scope Covered

- Root docs: `README.md`, `BUILD_INSTRUCTIONS.md`, `OVERVIEW.md`, `ROADMAP.md`, `SECURITY_AUDIT_REPORT.md`, `UNICORN_STRATEGY.md`, `PROJECT_IMPROVEMENT_STATUS_2026-02-03.md`, `PHOTO_UPLOAD_SETUP.md`
- Docs folder: `docs/README.md` and cross-referenced core docs
- Library docs: `src/lib/api/README.md`
- Test docs with broken links: `tests/performance/README.md`, `tests/performance/TROUBLESHOOTING.md`
- Environment template: `.env.example`

## Commands Executed

```bash
npm ci
npm run -s typecheck
npm run -s lint
npm test
npm run -s docs:check-links
npm run -s audit:api
npm run -s docs:stats
```

## Command Results

- `npm ci`: pass
- `npm run -s typecheck`: pass
- `npm run -s lint`: pass
- `npm test`: fail (pre-existing failing suites)
  - `tests/lib/icp/analysis.test.ts`
  - `tests/app/api/astrology/advanced/routes.integration.test.ts`
  - `tests/app/api/auth/register/route.comprehensive.test.ts`
  - `tests/app/api/metrics/public/route.test.ts`
  - `tests/app/api/tarot/analyze-question/route.test.ts`
  - `tests/app/api/user/update-birth-info/route.test.ts`
- `npm run -s docs:check-links`: pass
- `npm run -s audit:api`: pass, regenerated `docs/API_AUDIT_REPORT.md`
- `npm run -s docs:stats`: pass

## Key Corrections Made

1. Root docs normalized and re-audited

- Added explicit audited date to primary docs
- Removed stale or garbled content and outdated hardcoded claims

2. Security report aligned to current code

- Replaced stale narrative with current `audit:api` metrics
- Marked historical findings as `RESOLVED` or `OPEN` with code evidence

3. Setup/deployment instructions corrected

- Updated build guide with required env vars, DB flow, deployment notes, and troubleshooting

4. Environment template aligned

- Added missing vars actively used by code or validation:
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_STARTER_*`, `STRIPE_PRICE_PRO_*`
  - `STRIPE_PRICE_PREMIUM_YEARLY`
  - `STRIPE_PRICE_CREDIT_*`

5. Broken documentation links fixed

- `PHOTO_UPLOAD_SETUP.md` now points to `docs/archive/DEPLOYMENT_PHOTO_UPLOAD.md`
- `tests/performance/*.md` links updated to `docs/archive/*` paths
- Removed stale `response-builders.ts` reference from `src/lib/api/README.md`

6. Metrics refresh support added

- Added deterministic script: `scripts/repo-stats.mjs`
- Added npm script: `docs:stats`
- README now includes a generated repository snapshot

## Remaining Gaps / TODO

- Full test suite is not green due to pre-existing failures unrelated to docs-only changes.
- Archive docs under `docs/archive/*` were not rewritten; they are explicitly treated as non-normative historical context.
- Some historical root reports remain archived context and may contain old point-in-time metrics.
