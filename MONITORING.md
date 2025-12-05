# Monitoring & Alerts

Minimal guide to expose `/api/metrics` to a monitoring stack and wire alerts.

## 1) Endpoint
- Path: `/api/metrics`
- Auth: Bearer token `METRICS_TOKEN` (set in env and passed as `Authorization: Bearer <token>`).
- Formats: `?format=prom` (Prometheus text), `?format=otlp` (JSON).

## 2) Prometheus scrape example
```yaml
- job_name: saju-astro-chat
  metrics_path: /api/metrics
  params:
    format: [prom]
  static_configs:
    - targets: ["localhost:3000"]   # adjust host/port
  authorization:
    type: bearer
    credentials: "${METRICS_TOKEN}" # inject via env/secret
  scrape_interval: 30s
  scrape_timeout: 10s
```

## 3) Sample alerts (Prometheus rule file)
```yaml
groups:
  - name: saju-astro-chat.rules
    rules:
      - alert: DestinyReportFailures
        expr: increase(destiny_report_failure[5m]) > 3
        labels: { severity: warning }
        annotations:
          summary: "Destiny report failures >3 in 5m"
          description: "Check backend AI and db connectivity."

      - alert: BackendHealthFlapping
        expr: increase(backend_health_failure[5m]) > 5
        labels: { severity: critical }
        annotations:
          summary: "Backend health failures >5 in 5m"
          description: "Backend AI unhealthy; investigate /api/lib-health and infra."
```
> Metric names must match what you emit. Our current counters include `destiny.report.*` and `backend.health.*`; rename to underscores in the rule if you sanitize names in your Prom config.

## 4) Visitors counter endpoint
`/api/visitors-today` is token-protected via `x-metrics-token` (`PUBLIC_METRICS_TOKEN` or `NEXT_PUBLIC_PUBLIC_METRICS_TOKEN`). It does **not** contribute to `/api/metrics` counters unless you add instrumentation.

## 5) Next steps to make it “prod-grade”
- Wire the scrape job to Alertmanager/Slack (or your APM) with the above rules.
- Add SLOs (e.g., p95 latency on chat/report) and alert on burn rates.
- Run a short load test (smoke) and validate scrape/alerts fire as expected.
