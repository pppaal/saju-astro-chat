# Typecheck Ops

This repo now includes operational scripts for TypeScript error budget tracking.

## Commands

- `npm run ops:typecheck:update-baseline`
  - Writes baseline snapshot to `reports/typecheck/baseline.json`.
- `npm run ops:typecheck:metrics`
  - Refreshes metrics snapshot (same default output path).
- `npm run ops:typecheck:hotspots`
  - Writes top file/code hotspots to `reports/typecheck/hotspots.json`.
- `npm run ops:typecheck:gate`
  - Compares current typecheck result vs baseline and fails on regression.

## Expected Workflow

1. After intentional cleanup, refresh baseline:
   - `npm run ops:typecheck:update-baseline`
2. In CI or pre-release checks, enforce non-regression:
   - `npm run ops:typecheck:gate`
3. For prioritization, inspect hotspots:
   - `npm run ops:typecheck:hotspots`

## Notes

- Scripts run `tsc -p tsconfig.json --noEmit --pretty false` internally.
- Baseline is a budget control point, not a quality target.
- Current target remains: `npm run typecheck` must pass with zero errors.
