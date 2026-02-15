# Demo And SEO

## Demo Access Model

Demo pages and APIs are token-protected for external review.

### Pages

- `/demo/icp?token=...`
- `/demo/personality?token=...`
- `/demo/combined?token=...`
- `/demo/combined.pdf?token=...`

Additional demo review pages also exist (`/demo/tarot`, `/demo/destiny-map`, `/demo/calendar`).

### APIs

- `/api/demo/icp`
- `/api/demo/personality`
- `/api/demo/combined`
- `/api/demo/combined-pdf`
- `/api/demo/_health`

## Token Validation

Server helper: `src/lib/demo/requireDemoToken.ts`

Validation sources:

- query param: `token`
- header: `x-demo-token`

Rules:

- required env: `DEMO_TOKEN`
- invalid/missing token returns `404` (not `401`)
- no token logging

## Middleware Behavior

`middleware.ts` bypasses extra checks for `/demo` and `/api/demo` paths.  
Token enforcement remains in route handlers via `requireDemoTokenForApi` and page guards.

## SEO Protection

`src/app/robots.ts` disallows `/demo/` for crawlers.

## Public UX Regression Guardrails

### Playwright smoke

Command:

```bash
npm run test:e2e:smoke:public
```

Primary checks in `e2e/public-pages-smoke.spec.ts`:

- no i18n key leaks on public pages
- no mojibake corruption patterns
- no stuck `Loading...` state
- blog index not empty
- demo token behavior (`404` invalid, PDF valid with token)

### Pricing i18n key guard

Command:

```bash
npx vitest run tests/i18n/pricing-keys-required.test.ts
```

Verifies required public keys across `en` and `ko` locale packs to prevent raw key leaks on `/pricing` and shared public UI.
