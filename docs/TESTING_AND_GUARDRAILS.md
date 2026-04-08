# Testing And Guardrails

Last audited: 2026-04-08 (Asia/Hong_Kong)

## Policy

Use two levels:

- Required checks: release gate for most changes
- Extended checks: slower regressions and diagnostics for higher-risk work

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

## Destiny-Engine Required Checks

If you touch any of the following areas, you should also run the destiny QA scripts before release:

- `src/lib/destiny-matrix/core/*`
- `src/lib/destiny-matrix/counselorEvidence.ts`
- `src/lib/destiny-matrix/ai-report/*`
- `src/app/api/calendar/*`
- `src/app/api/destiny-map/chat-stream/route.ts`

Run:

```bash
npx tsx scripts/ops/qa-destiny-three-services.ts --lang=both
npx tsx scripts/ops/qa-counselor-questions.ts --lang=both
```

Current verification snapshot on 2026-04-08:

- `python scripts/self_check.py`
  - overall `PASS`
- `npx tsc -p tsconfig.json --noEmit`
  - passed
- `npx tsx scripts/ops/qa-destiny-three-services.ts --lang=ko`
  - `PASS=5 WARN=0 FAIL=0`
- targeted regression bundle
  - `226 passed, 1 skipped`
  - includes the report stack, counselor chat-stream, calendar, action-plan, tarot interpret, life-prediction explain-results, premium report result page, and engine contracts

Current rule:

- Treat `tsc + destiny three-service QA + targeted regression bundle` as the practical release baseline for the destiny stack.
- Do not claim "full-suite green" unless the full Vitest matrix has been rerun on the same revision.

## Extended Checks

```bash
npm test
npm run test:e2e:browser
npm run test:backend
python scripts/self_check.py --runtime-evidence
npx tsx scripts/ops/trace-destinypal-pipeline.ts
```

Notes:

- Full suites include broad legacy and integration coverage.
- `trace-destinypal-pipeline.ts` is the main end-to-end inspection path for core, evaluation, input audit, GraphRAG, and service consistency.
- Treat destiny QA regressions as release blockers for counselor, calendar, and premium-report changes.

## Playwright Local/CI Execution

Public smoke command:

```bash
npm run test:e2e:smoke:public
```

Current Playwright config (`playwright.config.ts`) starts local web server via:

- `npm run dev`
- test env defaults include `SUPPORT_EMAIL`

Useful variants:

```bash
npm run test:e2e:browser
npm run test:e2e:browser:headed
npm run test:e2e:browser:debug
```

## Failure Triage Order

1. `self_check.py` failures (retrieval/data/index quality)
2. syntax/type/build failures in touched destiny files
3. destiny regression failures (`qa-destiny-three-services`, `qa-counselor-questions`)
4. public smoke regressions
5. full-suite failures if the task scope requires them

## Practical Release Rule

If the change affects destiny judgment, GraphRAG evidence ordering, or any of the three destiny surfaces, do not stop at smoke tests. Run the destiny QA scripts and confirm the baseline stays green.
