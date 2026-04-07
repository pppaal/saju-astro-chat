# 2-Month execution plan (Typecheck 0 + Stability SLO + Ops metrics)

## Goal

- Reach **global TypeScript 0 errors**
- Keep service reliability at or above baseline SLO targets
- Make operational metrics visible and reviewable every week

## Current baseline (auto-generated)

- Source: `reports/typecheck/baseline.json`
- Command: `pnpm -s ops:typecheck:metrics`
- Current: `totalErrors=80` (`TS7006=68`, `TS2305=12`)

## Week-by-week plan

### Week 1 — Prisma export and import unification

- Remove all `TS2305` errors first.
- Apply consistent Prisma type import strategy in top hotspots from `ops:typecheck:hotspots`.
- Target outcome: `TS2305 -> 0`

### Week 2 — Top hotspot batch #1

- Fix `TS7006` in:
  - `src/app/api/admin/metrics/comprehensive/route.ts`
  - `src/app/api/me/history/route.ts`
- Add focused tests around modified payload mappings.
- Target outcome: total errors `< 45`

### Week 3 — Top hotspot batch #2

- Fix `TS7006` in:
  - `src/lib/credits/creditService.ts`
  - `src/app/api/tarot/couple-reading/route.ts`
  - `src/lib/referral/referralService.ts`
- Target outcome: total errors `< 20`

### Week 4 — Remaining TS errors to zero

- Resolve remaining TS7006 and edge typing errors from hotspot output.
- Enforce `pnpm -s exec tsc --noEmit` pass in PR checks.
- Target outcome: `totalErrors = 0`

### Week 5 — SLO instrumentation hardening

- Wire request counters + latency histograms to production source of truth.
- Feed metrics snapshot for `ops:slo:report` from runtime data (not static file).

### Week 6 — SLO burn-rate alerting

- Add budget burn alerts for:
  - availability below target
  - p95 latency above target
  - error rate above target
- Create runbook links in alerts.

### Week 7 — Operational dashboard and review cadence

- Publish weekly dashboard:
  - typecheck debt trend
  - SLO pass/fail trend
  - error budget consumption
- Start weekly 30-minute reliability review.

### Week 8 — Freeze and gate

- Require all merges to satisfy:
  - `tsc --noEmit` pass
  - SLO report generation
  - no regression in typecheck metrics
- Finalize documentation and owner rotation.

## Weekly command checklist

```bash
pnpm -s ops:typecheck:metrics
pnpm -s ops:typecheck:hotspots
pnpm -s ops:slo:report
pnpm -s exec tsc --noEmit
```

## Exit criteria

- `reports/typecheck/baseline.json` reports `totalErrors=0`
- SLO report remains in-target for at least 2 consecutive weekly checkpoints
- CI gates enforce both conditions
