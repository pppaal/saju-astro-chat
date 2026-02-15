# Testing And Guardrails

## Policy

Use two levels:

- Required checks: release gate for most changes
- Full suite: broad regression coverage (slower, larger blast radius)

## Required Checks

Run from repo root:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e:smoke:public
npx vitest run tests/i18n/pricing-keys-required.test.ts
python scripts/self_check.py
```

Expected baseline:

- web build succeeds
- public smoke passes
- pricing i18n key test passes
- `self_check.py` ends in overall `PASS`

## Full Suite (Optional / Extended)

```bash
npm test
npm run test:e2e:browser
npm run test:backend
```

Notes:

- Full suites include broad legacy and integration coverage.
- Pre-existing failures may exist depending on branch state and environment.
- Treat required checks as merge gate unless your task explicitly includes full-suite stabilization.

## Playwright Local/CI Execution

Public smoke command:

```bash
npm run test:e2e:smoke:public
```

Current Playwright config (`playwright.config.ts`) starts local web server via:

- `npm run dev`
- test env defaults include `DEMO_TOKEN` and `SUPPORT_EMAIL`

Useful variants:

```bash
npm run test:e2e:browser
npm run test:e2e:browser:headed
npm run test:e2e:browser:debug
```

## RAG/Quality Guardrail

Always run the canonical diagnostic when touching AI retrieval, cross reasoning, or report generation:

```bash
python scripts/self_check.py
```

Use runtime evidence mode for deeper checks:

```bash
python scripts/self_check.py --runtime-evidence
```

## Failure Triage Order

1. `self_check.py` failures (data/index quality)
2. build/type/lint failures
3. public smoke regressions (SEO/i18n/loading)
4. full-suite failures (if scope requires)
