# QA Fix Plan

Source of truth:

- `qa-dumps/AUDIT_SUMMARY.md` (generated 2026-02-16T09:02:18.649Z)
- Per-page evidence in `qa-dumps/pages`, `qa-dumps/html`, `qa-dumps/screens`

## P0 (Trust Breakers)

No open P0 items in the latest audit run.

Resolved in this pass:

- `/demo/*` 500 errors caused by passing function props from Server Components to a Client Component
  - Evidence (before): `qa-dumps/AUDIT_SUMMARY.md` from prior run at 2026-02-16T08:47:40.069Z
  - Fix files:
    - `src/app/demo/_components/DemoServiceRunner.tsx`
    - `src/app/demo/calendar/page.tsx`
    - `src/app/demo/destiny-map/page.tsx`
    - `src/app/demo/destiny-matrix/page.tsx`
    - `src/app/demo/report/page.tsx`
    - `src/app/demo/tarot/page.tsx`
- Broken community route `/community/matching` and stale link breakage
  - Evidence (before): same prior summary
  - Fix file:
    - `src/app/community/matching/page.tsx`

## P1 (Conversion Risks)

No open P1 items in the latest audit run.

## P2 (Polish / Follow-up)

### 1) Mixed-language heuristic flags on several pages

- Where found:
  - `/`, `/about/features`, `/api-docs`, `/astrology`, `/astrology/counselor`, `/policy/privacy`, `/policy/terms`, `/openapi.json`, `/blog/personality-types-astrology-mbti-zodiac`
- Evidence:
  - `qa-dumps/AUDIT_SUMMARY.md`
  - `qa-dumps/pages/root.json`
  - `qa-dumps/pages/about-features.json`
  - `qa-dumps/pages/api-docs.json`
  - `qa-dumps/pages/astrology.json`
  - `qa-dumps/pages/astrology-counselor.json`
  - `qa-dumps/pages/policy-privacy.json`
  - `qa-dumps/pages/policy-terms.json`
  - `qa-dumps/pages/openapi.json.json`
  - `qa-dumps/pages/blog-personality-types-astrology-mbti-zodiac.json`
- Code owner files:
  - `e2e/site-audit.spec.ts` (heuristic logic)
  - Locale/content under `src/i18n/locales`
- Proposed minimal fix:
  - Tune heuristic threshold/exclusions for docs+JSON pages and mixed intentional bilingual content.

### 2) Public-page console noise from blocked metrics/session/background requests

- Where found:
  - Primarily `/`, `/pricing`, `/about`, `/astrology*`, `/dream`, `/iching`
- Evidence:
  - `qa-dumps/AUDIT_SUMMARY.md` sections “Top Console Errors” and “Top Network Failures”
- Code owner files:
  - `middleware.ts` (CSRF policy on tracking routes)
  - `src/app/api/metrics/track/route.ts`
  - Public page client callers under `src/app/*` and shared UI components
- Proposed minimal fix:
  - Guard non-critical client tracking/session calls in anonymous contexts and reduce noisy error logging in production UI.
