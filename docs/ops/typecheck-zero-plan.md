# Typecheck Zero Plan

## Current State (2026-03-05)

- `npm run typecheck`: pass
- baseline: `reports/typecheck/baseline.json`
- current total errors: `0`

## Goal

Keep TypeScript error count at `0` and block regressions in CI.

## Execution Plan

### Month 1 (Week 1-4): Stabilize baseline and prevent regressions

1. Keep baseline refreshed after intentional cleanup.
2. Run `ops:typecheck:gate` in CI/PR checks.
3. Generate hotspot snapshots every CI run for trend tracking.
4. Reject PRs that increase TypeScript error budget.

Done criteria:

- baseline remains `0`
- no CI regressions from typecheck gate

### Month 2 (Week 5-8): Operationalize SLO reporting

1. Generate weekly SLO report using `ops:slo:report`.
2. Track availability, p95 latency, and error rate against thresholds.
3. Keep typecheck health included in weekly SLO output.
4. Upload reports as CI artifacts and keep runbook updated.

Done criteria:

- weekly SLO report automation enabled
- monthly SLO review has complete data for `availability/p95/error_rate`

## Commands

```bash
npm run ops:typecheck:metrics
npm run ops:typecheck:hotspots
npm run ops:typecheck:gate
npm run ops:slo:report
```

## KPI

- Typecheck total errors: `0` (maintain)
- TS7006: `0` (maintain)
- TS2305: `0` (maintain)
- Weekly SLO report run rate: `100%`
- Monthly SLO violation trend: non-increasing
