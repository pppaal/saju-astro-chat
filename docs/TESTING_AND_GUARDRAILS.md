# Testing And Guardrails

Last audited: 2026-11-26 (D9 final sweep: knip production run, madge cycle check, e2e jobs)

## Status

The `src/lib/destiny-matrix` engine was removed in the early-June 2026
restructure. Earlier versions of this doc pointed at destiny QA scripts and
paths that no longer exist. This doc describes the checks and CI gates that are
verified against the current `package.json`, `.github/workflows/`, and
`vitest.config.ts`.

Note: `scripts/ops/qa-destiny-three-services.ts` and
`scripts/ops/qa-counselor-questions.ts` were **removed** in this cleanup. They
imported the deleted `src/lib/destiny-matrix` engine, so they could no longer
load or run, and they were not wired into any npm script or CI workflow.

## Required Local Checks

Run from repo root before opening a PR:

```bash
npm run lint
npm run lint:mojibake
npm run typecheck
npm test
```

`npm run check:all` runs exactly that bundle (`lint && lint:mojibake &&
typecheck && test`). ESLint's `no-console` is an error everywhere in `src`
(no `warn`/`error` allowance); the only exceptions are the logger sink itself and
two documented lines (the telemetry recursion terminal and the edge proxy's CSRF
rejection log), each with an inline reason. The PR `quick-checks` job also rejects
any newly added `console.log`/`console.debug` outside `src/lib/logger/` and
`scripts/` — use the structured logger instead.

For destiny/report changes, also run the release gate (below).

## Destiny Release Gate

`npm run ops:destiny:release` is the destiny release gate. It runs:

```
npm run typecheck && npm run test:destiny:release
```

`test:destiny:release` pins real values on the real Swiss Ephemeris (engine audit
F10/F11, stage E16), not counts on the mocked one:

```
vitest run tests/golden/ real.node \
  tests/lib/report/integratedReport.real.test.ts \
  tests/lib/report/integratedReport.render.test.ts \
  tests/lib/calendar-engine/buildCalendar.determinism.test.ts \
  tests/lib/astrology/real-ephemeris-correctness.test.ts \
  tests/lib/card/ \
  tests/lib/report/lifeCrossCheck.parity.test.ts \
  tests/lib/report/tallyCrossRows.test.ts \
  tests/lib/calendar-view/lifetimeViewModel.test.ts \
  tests/lib/astrology/eclipses.test.ts \
  tests/lib/astrology/foundation/eclipses.test.ts \
  tests/lib/astrology/foundation/astroBugfixes.regression.test.ts
```

- `tests/golden/` — the engine golden set (`engine-golden.json`, written by
  `npm run golden:build` from independent references only: astronomy-engine,
  KASI-checked 節 instants, the JDN day pillar, cited classical tables). Saju
  pillars and 대운, derived saju (relations, shinsal, 화기격국, 용신 invariants),
  astrology positions, angles, cusps and houses, timing (profection, solar arc,
  returns, planetary hours, VoC, sect, ZR), calendar cross invariants and report
  cross rows. `goldenMarkers.guard.test.ts` keeps expected-failure, skip and
  known-defect markers out of `tests/golden` and checks that this script still
  lists the real-ephemeris suites.
- `*.real.node.test.ts` — real-ephemeris astrology and calendar checks
  (planetary day by real sunrise, sect by Sun altitude, VoC, outer-planet
  milestones, solar arc, transit formatter).
- `integratedReport.real.test.ts` — the production report path
  (`buildReportContext` → `natalToReportData` / `buildCrossRows`) with exact
  pillars, planet signs and houses, ASC/MC and all cross-row tones for a sample
  chart and for the reference charts R01, R06, R11, R13, R16 and R17. The five
  element-family rows (identity, needs, karma, growth, yin-yang) are recomputed
  from independent inputs (golden pillars, astronomy-engine Sun, Moon, true node
  and sect).
- `buildCalendar.determinism.test.ts` — the calendar cell digest on the real
  ephemeris, with an injected `now`, and a check that it does not depend on the
  server clock.
- `real-ephemeris-correctness.test.ts` — planet longitudes against
  astronomy-engine within 0.02°.
- `tests/lib/card/` — the Saju Card builder (`buildSajuCardData`: pillars, big
  three, Saju type, identity verdict with the Western element on the stars side,
  agreement line) and the home sample card golden (`sampleCard.ts` = engine
  output for the fixed sample and `now`).
- The remaining real-ephemeris files whose names do not end in `.real.node`:
  `lifeCrossCheck.parity.test.ts` (Life cross-check = report cross rows, and the
  time-unknown sign-only Sun/Moon), `tallyCrossRows.test.ts`,
  `lifetimeViewModel.test.ts` (Life view model on the sample: next life turn
  2033 / age 35, time-unknown Moon caveat, a 1930 birth past the curve span),
  `eclipses.test.ts` and `foundation/eclipses.test.ts`, and
  `astroBugfixes.regression.test.ts`.

Real-ephemeris files run under `@vitest-environment node` with
`vi.unmock('swisseph')` and `vi.unmock('@/lib/astrology/foundation/ephe')`, and
wrap their blocks in `describeRealEphemeris` (`tests/helpers/realEphemeris.ts`).
Without native swisseph they skip on a developer machine but **fail** in CI
(`CI=true`), in `test:destiny:release`, or with `REQUIRE_SWISSEPH=1`. CI jobs that
run tests build and load native swisseph right after `npm ci` ("Build and verify
native swisseph" step) and fail when it does not load.

This gate is enforced in CI on every non-draft PR (the `destiny-release-gate` job
in `pr-checks.yml` and the `Destiny release gate` step in `ci.yml`). It takes about
20 s on a 4-vCPU machine after typecheck.

The old destiny _quality_ gate (`ops:destiny:gate`, `ops:destiny:gate:quick`,
`ops:destiny:nightly`, `scripts/ops/destiny-quality-gate.mjs`) was removed
(2026-11). After the destiny-matrix engine was deleted it only re-ran
`lint:mojibake` + `typecheck`, which CI already runs as their own steps.

## Determinism Golden Tests

Astronomical determinism is locked by golden suites that pin exact outputs. The
independent-reference set lives in `tests/golden/` and runs in the release gate
(above); the older suites below pin engine output:

- `tests/lib/saju/determinism-golden.test.ts` — pins year/month/day/time
  pillars, day master, and daeun start age/direction against
  `@/lib/saju/saju` (`calculateSajuData`).
- `tests/lib/astrology/foundation/determinism-golden.test.ts` — pins
  astrology foundation output.

Additional locked-value coverage lives in
`tests/lib/saju/saju-singlesource.daeun.test.ts` and
`tests/lib/saju/edge-cases.test.ts` (day-boundary / midnight transitions).

These run as part of `npm test` (the full Vitest suite). Separately,
`npm run test:ephemeris-golden` (`scripts/ephemeris-golden.mts`) checks the real
Swiss Ephemeris outside Vitest against the independent astro charts in
`tests/golden/engine-golden.json` (planets, node, ASC/MC, cusps, houses and
retrograde flags, with the golden tolerances). It is enforced in the
`pr-checks.yml` `build-check` job.

## Recurrence Guards (source-level invariants)

These source-scanning tests make recurring bug _classes_ impossible to reintroduce
silently — they fail CI when a structural invariant is violated, rather than
catching one instance at a time:

- `tests/route-protection-guard.test.ts` — every mutating (`POST/PUT/PATCH/DELETE`)
  API route must go through `withApiMiddleware` or be an explicit, justified entry
  in the `HANDROLLED` allow-list (which must still carry a real protection token).
  There is no global edge `middleware.ts`, so protection is opt-in per route; this
  guard stops a new route shipping with no CSRF/auth/rate-limit.
- `tests/determinism-guard.test.ts` — bans argless `new Date()` / `Date.now()` in
  the engine dirs (`src/lib/{saju,astrology,calendar-engine}`); only injected-now
  (`= new Date()` / `?? new Date()`) and explicitly listed cache/persistence
  bookkeeping are allowed. Enforces the CLAUDE.md Determinism invariant.
- `tests/llm-cost-policy-guard.test.ts` — routes may not pick a model directly;
  model/cap/continuation come from `src/lib/config/llm-policy.ts`.
- `tests/paid-routes-money-guards.test.ts` — money-path charge/refund invariants.

When a fix lands for a duplicated/opt-in class, prefer adding (or extending) a
guard here so the _class_ closes, not just the instance.

## CI Gates

### `ci.yml` (push to main, PRs)

Single `build-and-test` job: token-encryption verify, `check:env`, `lint`,
`lint:mojibake`, `typecheck`, `ops:typecheck:gate`, a runtime import-cycle check
(`npx madge@8.0.0 --circular --extensions ts,tsx --ts-config tsconfig.json src`,
type-only imports skipped via `madge_detectiveOptions__*__skipTypeImports`),
`ops:destiny:release`,
`test:a11y`,
coverage upload + threshold check (read from `vitest.config.ts`), `build`, SSR
placeholder + mojibake smoke against a running server, bundle-size check, and an
E2E API run (`test:e2e:api`).

### `pr-checks.yml` (PRs)

- `quick-checks`: conventional-commit title, large-file warning, console-log
  block, ESLint on changed files, API-audit drift warning (non-blocking).
- `test-matrix`: `unit` (`npm test`) and `integration` (`npm run test:integration`
  against a Postgres service).
- `build-check`: `typecheck`, `test:ephemeris-golden`, `ops:typecheck:gate`,
  `lint:mojibake`, `build`, SSR placeholder gate, bundle-size budget.
- `destiny-release-gate`: `npm run ops:destiny:release`.
- `security-check`: `npm audit` (moderate/high, non-blocking), `audit:unused`
  (knip, normal graph: tests/e2e/scripts are entries), `knip --production`
  (production graph only — the `!` entries in `knip.json`; informational: unused
  files and dependencies are at 0 since H7 deleted the test-only modules, and it
  still lists exports that only tests or scripts use), changed-file secret scan.
  All three are `continue-on-error`. Script-only code under `src/` is excluded from
  the production project with a `!path!` pattern (`src/data/blog/buildIndex.ts`,
  used by `npm run blog:index`), and deps only scripts use carry a production-only
  ignore (`resend!`, `dotenv!`).
- `coverage`: `test:coverage` + PR comment.

### `security.yml` (PRs, weekly, manual)

Production-only `npm audit` (fails on critical) plus a secret scan.

### `e2e-browser.yml` (PRs, push to main, manual)

Builds the app, starts `next start`, and runs two jobs against it:

- `test` (blocking): `playwright.ci.config.ts e2e/public-pages-smoke.spec.ts
e2e/critical-flows/09-stripe-checkout-flow.spec.ts` across `chromium` and
  `mobile-chrome` (the money-path minimum: auth wall 401, SSOT pack grid, guest
  login modal — deterministic without a DB).
- `mobile-layout` (matrix, `continue-on-error`): the `mobile-visibility`
  (iPhone SE 375×667), `narrow-viewport` (Galaxy Z Fold outer 280×653) and
  `reduced-motion` (390×844, `prefers-reduced-motion: reduce`) projects, all on
  chromium emulation (`e2e/mobile-visibility.spec.ts`, `e2e/reduced-motion.spec.ts`).

Every other spec in `e2e/` runs only locally/manually. The v9.2 Life · Calendar
smoke (`e2e/life-calendar-smoke.spec.ts` + `calendar-check.spec.ts`,
`npm run test:e2e:calendar` → `playwright.calendar.config.ts`) checks
`/calendar/preview`, `/destiny?…` and `/calendar?…` overrides at 390 and 280 px:
an h1, no horizontal overflow, no lingering "Loading...". Specs that only targeted
removed routes (`/saju` form, `/dream`, `/iching`, `/numerology`, `/myjourney`,
`/astrology`, `/personality`, `/icp`, `/premium-reports`, `/shared/*`,
`/destiny-map/result`, …) were deleted in D9; `/destiny-map` tests now open
`/destiny-counselor`, which the old URL redirects to.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` overrides the chromium binary for local runs.

### `performance-tests.yml` (PRs touching `src/**`, weekly, manual)

k6 load suites (`basic`/`stress`/`spike`/`realistic`).

### `accessibility.yml` (PRs touching components/app, daily, manual)

`npm run test:a11y` (axe-core).

### `destiny-nightly.yml` (nightly, manual)

Three-shard full Vitest run (`test:nightly:shard`) with per-shard failure
analysis (`scripts/ops/analyze-vitest-json.mjs`) and an aggregated summary that
buckets failures by category and top files.

## Coverage Floors

Coverage thresholds are enforced **only** on `npm run test:coverage`
(`vitest.config.ts`, gated on `npm_lifecycle_event === 'test:coverage'`). Current
global floors: lines 87, functions 83, branches 71, statements 85. Per-path
floors: `src/lib/auth/**`, `src/lib/credits/**`, `src/lib/payments/**`,
`src/lib/security/**`, `src/lib/api/idempotency.ts`, `src/lib/referral/**`,
`src/lib/stripe/**`, `src/app/api/**`, and the astrology timing files that used to
run only on the mocked ephemeris — `almutenFiguris.ts`, `profections.ts` and
`calendar-engine/lifecycle/outerMilestones.ts` — whose floors sit ~2 points under
what the real-ephemeris release-gate suites alone reach (E16). The exact values
are in `vitest.config.ts`; CI reads them from there so the gate never drifts from
the config.

## Other Real Test/QA Scripts

These exist and run:

- `npm run test`, `test:fast`, `test:coverage`, `test:a11y`, `test:integration`
- `npm run test:e2e:browser`, `test:e2e:smoke:public`, `test:e2e:critical`,
  `test:e2e:calendar` (Life · Calendar smoke), and the per-flow `test:e2e:*`
  Playwright specs
- `npm run test:tarot` (`tests/lib/tarot`)
- `npm run test:ephemeris-golden`
- `npm run qa:counselor-calendar:report`
- Removed: `scripts/ops/qa-counselor-questions.ts` and the one-off
  `qa:tarot:*` / `eval:*` batch scripts (they imported removed engines and
  could no longer run).

## Failure Triage Order

1. typecheck / build failures in touched files
2. determinism golden failures (`determinism-golden.test.ts`, ephemeris golden)
3. destiny release gate (`ops:destiny:release`) failures
4. unit/integration suite failures (`npm test`, `test:integration`)
5. public smoke / E2E failures
6. nightly full-suite failures — triage by the nightly analyzer's category
   buckets before treating as release blockers
