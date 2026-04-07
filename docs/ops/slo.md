# Service SLO baseline

This project tracks three baseline service-level objectives (SLO):

1. **API availability**: `>= 99.5%` over 30-day rolling window
2. **P95 latency**: `<= 700ms` over 7-day rolling window
3. **Error rate**: `<= 1.0%` over 7-day rolling window

## Local usage

- Copy `scripts/ops/fixtures/service-metrics.example.json` to `reports/ops/service-metrics.json` and update it with latest snapshot numbers.
- Run:

```bash
pnpm -s ops:slo:report
```

This outputs normalized operational metrics in JSON for CI or dashboards.

## Code references

- SLO definitions/evaluation: `src/lib/ops/slo.ts`
- Reporter script: `scripts/ops/slo-report.mjs`
