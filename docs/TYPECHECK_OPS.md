# Typecheck Ops

This repo now includes operational scripts for TypeScript error budget tracking.

## Commands

- `npm run ops:typecheck:update-baseline`
  - Writes baseline snapshot (error codes + top 20 file hotspots) to
    `reports/typecheck/baseline.json`.
- `npm run ops:typecheck:gate`
  - Compares current typecheck result vs baseline and fails on regression.

## Expected Workflow

1. After intentional cleanup, refresh baseline:
   - `npm run ops:typecheck:update-baseline`
2. In CI or pre-release checks, enforce non-regression:
   - `npm run ops:typecheck:gate`
3. For prioritization, inspect the `hotspots` list in a fresh snapshot:
   - `node scripts/typecheck-metrics.mjs --out reports/typecheck/current.json`

## Notes

- Scripts run `tsc -p tsconfig.json --noEmit --pretty false` internally.
- Baseline is a budget control point, not a quality target.
- Current target remains: `npm run typecheck` must pass with zero errors.
- The `ops:typecheck:metrics` / `ops:typecheck:hotspots` duplicates and the
  weekly SLO report (`ops:slo:report`) were removed (2026-11): they wrote to
  paths nothing read, and the SLO job failed on a metrics file nothing produced.
