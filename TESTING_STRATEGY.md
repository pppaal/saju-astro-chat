# Testing & CI Strategy

## Frontend (Next.js)
- **Unit**: `npm run test:unit` (ts-node tests).
- **Integration/E2E-lite**: `npm run test:e2e` (Vitest in `tests/integration` for API/contracts and critical flows).
- **Lint/Build**: `npm run lint`, `npm run build` before deploy.
- **Manual smoke**: Stripe test-mode checkout, webhook replay, and key pages load.

## Backend AI (Python)
- **Smoke/Domain**: `pytest backend_ai/tests`.
- **Data integrity**: graph/rule validation scripts in `backend_ai/tools`.
- **Perf**: run targeted benchmarks before heavy releases (e.g., long-running generation paths).

## CI
- Node job: install, lint, build, unit + integration tests.
- Python job: install `backend_ai/requirements.txt`, run `pytest backend_ai/tests`.
- Add future jobs: scheduled perf smoke, dependency audit, DAST/SAST (e.g., `npm audit`, bandit).

## Security/Perf Scan (recommended cadence)
- Weekly: `npm audit --production`, `pip-audit` for backend_ai.
- Monthly: DAST (OWASP ZAP) against staging, Lighthouse perf budget, Stripe webhook replay check.
