# Destiny Logging

Last audited: 2026-06-15 (Asia/Hong_Kong)

## Status

The `src/lib/destiny-matrix` engine was removed during the early-June 2026
restructure. The old version of this doc described a _plan_ to log a "canonical
destiny envelope" into the `UserInteraction` table via
`src/lib/destiny-matrix/core/logging.ts` and a `buildDestinyInteractionMetadata(...)`
builder. None of that was implemented, and the module it referenced no longer
exists. This doc now describes the logging that the codebase actually has.

There is no destiny-specific product-event log. Runtime logging is generic
(structured logger + in-process metrics), and the only persisted per-request
analytics is the anonymous `PageView` beacon.

## Structured Logger

The single logging entry point is `src/lib/logger/index.ts`. It exports a
`logger` singleton plus pre-bound domain loggers
(`authLogger`, `paymentLogger`, `apiLogger`, `dbLogger`, `sajuLogger`,
`astroLogger`, `tarotLogger`). It is imported by ~140 files across `src/`,
including every real service route.

API:

- `logger.debug(message, context?)`
- `logger.info(message, context?)`
- `logger.warn(message, contextOrError?)`
- `logger.error(message, contextOrError?)`
- `logger.domain(name)` → a `DomainLogger` that prefixes `[name]`

Behavior:

- Test env (`NODE_ENV=test`): only `error` is emitted.
- Development: human-readable lines with emoji + pretty-printed context.
- Production: single-line JSON (`level`, `message`, `timestamp`, `context`, `error`)
  for log collectors.
- `warn` and `error` in production are additionally forwarded to Sentry via
  `@/lib/telemetry` (`captureServerError`). Forwarding failures are swallowed to
  avoid a logging loop.

The logger writes to the console / Sentry only. It does **not** write to the
database, and there is no `UserInteraction` (or destiny-envelope) write path.

## What The Real Routes Log

The verified current service routes use the structured logger for diagnostics
only — not for product analytics:

- `src/app/api/counselor/realtime/route.ts` — `logger.warn`/`logger.info`/`logger.error`
  for validation failures, idempotent credit-skip, context-compute failure, and
  refund failures.
- `src/app/api/compatibility/counselor/route.ts` — same logger.
- `src/app/api/tarot/interpret-stream/route.ts` — same logger.

These are transport/diagnostic logs (who failed, why), not a per-answer
decision trace.

## In-Process Metrics

`src/lib/metrics.ts` is an in-memory counter/timer/gauge registry
(`recordCounter`, `recordTiming`, `recordGauge`, `getMetricsSnapshot`,
`resetMetrics`, `toPrometheus`, `toOtlp`). `src/lib/metrics/index.ts` re-exports
it and adds standardized helpers (`recordApiRequest`, `recordServiceOperation`,
`recordAuthEvent`, `recordRateLimitHit`, `recordCreditUsage`, `recordExternalCall`,
`recordCacheOperation`). `src/lib/metrics/schema.ts` defines the metric registry,
standard labels, and SLA thresholds (p95 < 700ms, error rate < 0.5%).

Metrics live in process memory (not persisted) and are exposed through
`src/app/api/admin/metrics/route.ts` (admin-only):

- default JSON dashboard summary
- `?format=prometheus`
- `?format=otlp`

`destiny.report.*`, `tarot.reading.*`, and `astrology.chart.*` metric names are
defined in the registry, but emission is sparse — only a few routes record
metrics today (e.g. `src/app/api/tarot/route.ts`). Treat the metrics surface as
operational monitoring, not a complete per-feature event stream.

## Persisted Analytics: PageView

The only persisted per-request log is the anonymous visit beacon:

- Route: `src/app/api/track/visit/route.ts`
- Model: `PageView` (`prisma/schema.prisma`)

It stores a daily-rotating salted visitor hash (no raw IP/UA), pathname,
referrer host, login flag, optional `userId`, coarse country, and device class.
Writes are best-effort (DB failure is swallowed and returns `200`). Admin funnel
and visitor dashboards read from this table
(`src/app/api/admin/metrics/funnel/route.ts`, `src/app/api/admin/visitors/route.ts`).

## UserInteraction Model

`model UserInteraction` still exists in `prisma/schema.prisma` (id, userId,
createdAt, type, service, rating, metadata, with two indexes). It has **zero
callers in `src/`** — nothing reads or writes it. It is a dormant table, not the
destiny logging mechanism the old doc proposed. Do not document it as active.

## Summary

- Diagnostics: `src/lib/logger` → console + Sentry (warn/error in prod).
- Monitoring: `src/lib/metrics` → in-memory, exposed at `/api/admin/metrics`.
- Persisted analytics: `PageView` via `/api/track/visit`.
- Not implemented: the destiny-envelope / `UserInteraction` event schema and the
  per-answer decision trace described in the pre-restructure plan.
