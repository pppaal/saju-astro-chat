# Project Audit & Improvement Plan

## Snapshot
- Stack: Next.js 15 (App Router, TS), Prisma/PostgreSQL, Firebase (visitors), Stripe, NextAuth (Google), Three.js visualizations, Python Flask fusion backend.
- Features: astrology, saju, numerology, tarot, destiny-map, aura quiz, community/pricing/auth flows.
- Current issues: user-facing text is garbled in many locales, several public APIs lack auth/rate limits, secrets and data files live in the repo, heavy client-side rendering with little testing.

## High Priority (security, reliability)
- Secrets in repo: `tests/test.py` embeds a Together API key; `.env`, `.env.local`, `final_data.db`, and dozens of JSON logs are committed. Remove from git history, rotate keys, and gitignore secrets/artifacts.
- Unauthenticated/open APIs: `src/app/api/dream/route.ts`, `src/app/api/tarot/route.ts`, `src/app/api/compatibility/route.ts`, `src/app/api/astrology/route.ts`, `src/app/api/astrology/details/route.ts`, `src/app/api/latlon-to-timezone/route.ts`, `src/app/api/db-ping/route.ts`, and `src/app/api/visitors-today/route.ts` accept arbitrary POST/GET traffic with no auth, rate limiting, or abuse protection. Add authentication where appropriate, request validation, per-IP throttling, and CAPTCHA or signed tokens for public counters.
- Encoding/i18n corruption: user-facing strings and API error messages are mojibake in `src/app/api/astrology/route.ts`, `src/app/api/astrology/details/route.ts`, `src/app/(main)/page.tsx`, `src/i18n/I18nProvider.tsx`, and multiple comments. Re-save files as UTF-8, restore real translations, and add automated encoding checks.
- Sensitive logging: `src/app/api/auth/[...nextauth]/route.ts` logs parts of `DATABASE_URL`; `src/app/api/db-ping/route.ts` logs cert length; Firebase init in `src/app/api/visitors-today/route.ts` logs init messages. Remove logging of secrets and wrap diagnostics behind a debug flag.
- Birth info update validation: `src/app/api/user/update-birth-info/route.ts` trusts client payloads; normalize and validate date/time/tz/gender, enforce ownership, and audit logs for PII handling.
- Stripe checkout hardening: `src/app/api/checkout/route.ts` assumes envs exist and has no webhook signature handling noted. Validate base URL/price IDs, ensure success/cancel redirect safety, and add webhook verification for subscription lifecycle.

## UX/Performance
- Heavy client rendering: `src/app/(main)/page.tsx` canvas background and `src/components/destiny-map/DestinyVisualizer.tsx` load particle/Three.js effects on every visit. Lazy-load with `next/dynamic`, gate on viewport visibility, and provide static fallbacks for low-end/mobile devices.
- Accessibility: Back buttons (`src/components/ui/BackButton.tsx`, `src/app/saju/page.tsx`) lack proper aria labels/text; navigation links lack focus styles; canvas-only visuals need descriptive text. Add ARIA, keyboard focus order, and prefers-reduced-motion handling.
- SEO and metadata: `src/app/layout.tsx` uses minimal metadata and omits `lang/dir` on `<html>` tied to the current locale. Add per-page titles/descriptions/open graph tags and set html `lang`/`dir` from I18n.
- Design consistency: globals and per-page CSS mix fonts/colors; no shared theme tokens. Establish a design system (spacing/type/color components), and replace inline styles with reusable primitives.

## Code Quality/Architecture
- Duplicate auth configs: both `src/app/api/auth/[...nextauth]/options.ts` and `src/lib/auth/authOptions.ts` define providers; keep a single source to avoid drift.
- Data layer hygiene: Prisma schema (`prisma/schema.prisma`) lacks explicit JSON schemas for user-generated content; add Zod/Yup validation on inputs, ensure `Reading`/`Fortune` content is sanitized before storage/render.
- Dangerous HTML injection: `src/components/destiny-map/DestinyVisualizer.tsx` uses `dangerouslySetInnerHTML` for tooltips; sanitize content or render React nodes to prevent XSS.
- Firebase visitor counter: `src/app/api/visitors-today/route.ts` signs in anonymously per request and writes arbitrary counts; move to server-only service account, enforce quotas, and consider swapping to server-side analytics instead of public writes.
- Error handling/localization: many endpoints return mixed-language/gibberish errors; centralize error messages and respond in the user locale. Add structured error types.
- Repository bloat: `.next`, `logs/*.json`, `final_data.db`, `astro-debug.json`, and venv artifacts inflate the repo. Add to `.gitignore`, prune history, and store data in object storage.

## Data/AI flows
- Python backend (`backend_ai/app/app.py`) runs Flask with wide-open CORS and no auth. Restrict origins, add auth tokens, and document how Next.js calls it (or migrate logic into Next API routes for simpler deployment).
- Graph/rule assets under `backend_ai/data/graph` are checked in without versioning metadata; consider packaging them or serving from a CDN with checksums.
- OpenAI/LLM usage is scattered (e.g., `tests/test_together.py`, `scripts/dev-astro.ts`); add a single client wrapper with observability, rate limiting, and safety filters.

## Testing/Observability
- No automated tests cover Next.js components or API routes. Add unit tests for lib functions, contract tests for APIs (e.g., astrology/saju/fortune), and visual snapshots for key flows.
- Missing lint/type coverage for Python backend; add mypy/ruff and align formatting across TS/Python.
- Sentry is a dependency but not configured. Enable Sentry/Logging/Tracing for both Next and Flask, and add health checks with authentication.

## Modernization Roadmap (to be “as good as Google”)
- Build trust: secure secrets management, HTTPS-only cookies, CSRF/rate limiting for public endpoints, and privacy-first telemetry.
- Ship quality UI: performant, accessible design system, localized content without encoding bugs, and responsive fallbacks for graphics-heavy views.
- Reliable backend: authenticated, validated APIs; consolidated service boundaries; observability and error budgets; resilient retries and caching on expensive astrology calculations.
- Growth tooling: analytics with consent, experiment flags, high-quality content translations, and CI/CD with quality gates (lint, tests, type checks, bundle-size guardrails).
