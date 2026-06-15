# Testing And Guardrails

Last audited: 2026-06-15 (Asia/Hong_Kong)

## Status

The `src/lib/destiny-matrix` engine was removed in the early-June 2026
restructure. Earlier versions of this doc pointed at destiny QA scripts and
paths that no longer exist. This doc describes the checks and CI gates that are
verified against the current `package.json`, `.github/workflows/`, and
`vitest.config.ts`.

Important: `scripts/ops/qa-destiny-three-services.ts` and
`scripts/ops/qa-counselor-questions.ts` are **broken** — both still import
deleted modules (`src/lib/destiny-matrix/core/runDestinyCore`,
`.../core/adapters`, `.../counselorEvidence`, `.../ai-report/aiReportService`).
That entire directory is gone, so the scripts cannot load or run. Do not use
them as a release gate. They are not wired into any npm script or CI workflow.

## Required Local Checks

Run from repo root before opening a PR:

```bash
npm run lint
npm run lint:mojibake
npm run typecheck
npm test
```

`npm run check:all` runs exactly that bundle (`lint && lint:mojibake &&
typecheck && test`). The PR `quick-checks` job also rejects any newly added
`console.log`/`console.debug` outside `src/lib/logger/` and `scripts/` — use the
structured logger instead.

For destiny/report changes, also run the release gate (below).

## Destiny Release Gate

`npm run ops:destiny:release` is the destiny release gate. It runs:

```
npm run typecheck && npm run test:destiny:release
```

`test:destiny:release` runs the integrated-report regression suite:

```
vitest run tests/lib/report/integratedReport.real.test.ts \
            tests/lib/report/integratedReport.render.test.ts \
            --pool forks --poolOptions.forks.singleFork --testTimeout 120000
```

Both test files exist and are the surviving guard for the report stack. The gate
does **not** run the old `qa-destiny-three-services.ts` script (it is broken, see
Status). This gate is enforced in CI on every non-draft PR (the
`destiny-release-gate` job in `pr-checks.yml` and the `Destiny release gate` step
in `ci.yml`).

## Destiny Quality Gate

`npm run ops:destiny:gate:quick` and `npm run ops:destiny:gate` run
`scripts/ops/destiny-quality-gate.mjs`. Because the destiny-matrix engine was
removed, this script now only runs **mojibake-lint + typecheck**. Its former
golden/consistency suites imported the deleted engine and could no longer load,
so they were intentionally dropped rather than pointed at missing modules. The
`--quick` and `--full` flags are currently equivalent in effect.

`npm run ops:destiny:nightly` chains a full Vitest shard with the full gate
(`test:nightly:shard` + `ops:destiny:gate`).

## Determinism Golden Tests

Astronomical determinism is locked by golden suites that pin exact outputs:

- `tests/lib/Saju/determinism-golden.test.ts` — pins year/month/day/time
  pillars, day master, and daeun start age/direction against
  `@/lib/saju/saju` (`calculateSajuData`).
- `tests/lib/astrology/foundation/determinism-golden.test.ts` — pins
  astrology foundation output.

Additional locked-value coverage lives in
`tests/lib/Saju/saju-singlesource.daeun.test.ts` and
`tests/lib/Saju/edge-cases.test.ts` (day-boundary / midnight transitions).

These run as part of `npm test` (the full Vitest suite). Separately,
`npm run test:ephemeris-golden` (`scripts/ephemeris-golden.mts`) is a Swiss
Ephemeris golden run — Vitest mocks the ephemeris, so raw astronomical accuracy
is only verified by this script. It is enforced in the `pr-checks.yml`
`build-check` job.

## CI Gates

### `ci.yml` (push to main, PRs)

Single `build-and-test` job: token-encryption verify, `check:env`, `lint`,
`lint:mojibake`, `typecheck`, `ops:typecheck:gate`, `ops:destiny:gate:quick`,
`ops:destiny:release`, `test:destiny-map` (critical smoke), `test:a11y`,
coverage upload + threshold check (read from `vitest.config.ts`), `build`, SSR
placeholder + mojibake smoke against a running server, bundle-size check, and an
E2E API run (`test:e2e:api`).

### `pr-checks.yml` (PRs)

- `quick-checks`: conventional-commit title, large-file warning, console-log
  block, ESLint on changed files, API-audit drift warning (non-blocking).
- `test-matrix`: `unit` (`npm test`) and `integration` (`npm run test:integration`
  against a Postgres service).
- `build-check`: `typecheck`, `test:ephemeris-golden`, `ops:typecheck:gate`,
  `ops:destiny:gate:quick`, `build`, SSR placeholder gate, bundle-size budget.
- `destiny-release-gate`: `npm run ops:destiny:release`.
- `security-check`: `npm audit` (moderate/high, non-blocking), `audit:unused`
  (knip), changed-file secret scan.
- `coverage`: `test:coverage` + PR comment.

### `security.yml` (PRs, weekly, manual)

Production-only `npm audit` (fails on critical) plus a secret scan.

### `e2e-browser.yml` (PRs, push to main, manual)

Builds and runs the public smoke suite via Playwright
(`playwright.ci.config.ts e2e/public-pages-smoke.spec.ts`) across `chromium`
and `mobile-chrome`.

### `performance-tests.yml` (PRs touching `src/**`, weekly, manual)

k6 load suites (`basic`/`stress`/`spike`/`realistic`).

### `accessibility.yml` (PRs touching components/app, daily, manual)

`npm run test:a11y` (axe-core).

### `destiny-nightly.yml` (nightly, manual)

Three-shard full Vitest run (`test:nightly:shard`) with per-shard failure
analysis (`scripts/ops/analyze-vitest-json.mjs`), a `Destiny Gate Nightly` job
running `ops:destiny:gate`, and an aggregated summary that buckets failures by
category and top files.

## Coverage Floors

Coverage thresholds are enforced **only** on `npm run test:coverage`
(`vitest.config.ts`, gated on `npm_lifecycle_event === 'test:coverage'`). Current
global floors: lines 61, statements 61, branches 77, functions 85. Per-path
floors: `src/lib/auth/**`, `src/lib/credits/**`, `src/lib/payments/**`,
`src/lib/security/**`, and `src/app/api/**` (50/45/50). CI reads these same
values from `vitest.config.ts` so the gate never drifts from the config.

## Other Real Test/QA Scripts

These exist and run:

- `npm run test`, `test:fast`, `test:coverage`, `test:a11y`, `test:integration`
- `npm run test:e2e:browser`, `test:e2e:smoke:public`, `test:e2e:critical`,
  and the per-flow `test:e2e:*` Playwright specs
- `npm run test:tarot*` (incl. `test:tarot:question-golden`,
  `test:tarot:fallback-quality`, `test:tarot:interpret-quality`)
- `npm run test:destiny-map` (destiny-map API/sanitize/calendar smoke)
- `npm run test:ephemeris-golden`
- `npm run qa:tarot:engine`, `qa:tarot:full`, `qa:counselor-calendar:report`
- `npm run eval:strategy:batch`, `eval:deterministic:batch`, `eval:tarot:export`
- `scripts/ops/qa-counselor-questions.ts` — **broken** (imports removed engine);
  not wired to any npm script.

## Failure Triage Order

1. typecheck / build failures in touched files
2. determinism golden failures (`determinism-golden.test.ts`, ephemeris golden)
3. destiny release gate (`ops:destiny:release`) failures
4. unit/integration suite failures (`npm test`, `test:integration`)
5. public smoke / E2E failures
6. nightly full-suite failures — triage by the nightly analyzer's category
   buckets before treating as release blockers
