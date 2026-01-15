# Performance Baseline Tracking

Track performance metrics over time to detect regressions.

## How to Use This Document

1. Run baseline tests after major changes
2. Record results in the table below
3. Compare with previous baselines
4. Investigate significant degradations (>20% slower)

## Recording a Baseline

```bash
# 1. Start clean server
npm run dev

# 2. Run performance test
npm run test:performance 2>&1 | tee baseline-$(date +%Y%m%d).txt

# 3. Run basic load test (if k6 installed)
npm run test:load:basic 2>&1 | tee k6-baseline-$(date +%Y%m%d).txt

# 4. Record key metrics in table below
```

## Performance Baselines

### Session Check Endpoint

| Date | Version | Connections | Avg Latency | P95 Latency | P99 Latency | RPS | Error Rate | Notes |
|------|---------|-------------|-------------|-------------|-------------|-----|------------|-------|
| YYYY-MM-DD | v0.1.0 | 10 | - | - | - | - | - | Initial baseline |
| | | | | | | | | |

### Cities Search Endpoint

| Date | Version | Connections | Avg Latency | P95 Latency | P99 Latency | RPS | Error Rate | Notes |
|------|---------|-------------|-------------|-------------|-------------|-----|------------|-------|
| YYYY-MM-DD | v0.1.0 | 10 | - | - | - | - | - | Initial baseline |
| | | | | | | | | |

### Saju Calculation (Compute-Intensive)

| Date | Version | Connections | Avg Latency | P95 Latency | P99 Latency | RPS | Error Rate | Notes |
|------|---------|-------------|-------------|-------------|-------------|-----|------------|-------|
| YYYY-MM-DD | v0.1.0 | 10 | - | - | - | - | - | Initial baseline |
| | | | | | | | | |

### Astrology Calculation (Compute-Intensive)

| Date | Version | Connections | Avg Latency | P95 Latency | P99 Latency | RPS | Error Rate | Notes |
|------|---------|-------------|-------------|-------------|-------------|-----|------------|-------|
| YYYY-MM-DD | v0.1.0 | 10 | - | - | - | - | - | Initial baseline |
| | | | | | | | | |

## K6 Load Test Baselines

### Basic Load Test

| Date | Version | Max VUs | Avg Duration | P95 Duration | Success Rate | Total Requests | Notes |
|------|---------|---------|--------------|--------------|--------------|----------------|-------|
| YYYY-MM-DD | v0.1.0 | 50 | - | - | - | - | Initial baseline |
| | | | | | | | |

### Stress Test (Breaking Point)

| Date | Version | Max VUs Before Failure | P95 at Peak | Error Rate at Peak | Notes |
|------|---------|----------------------|-------------|-------------------|-------|
| YYYY-MM-DD | v0.1.0 | - | - | - | Initial baseline |
| | | | | | |

## Acceptable Performance Ranges

Based on your current thresholds:

### Public Endpoints
- ✅ **Good:** Avg < 100ms, P95 < 300ms, P99 < 500ms
- ⚠️ **Acceptable:** Avg < 200ms, P95 < 500ms, P99 < 1000ms
- ❌ **Poor:** Avg > 200ms, P95 > 500ms, P99 > 1000ms

### Compute-Intensive Endpoints
- ✅ **Good:** Avg < 500ms, P95 < 1000ms, P99 < 2000ms
- ⚠️ **Acceptable:** Avg < 1000ms, P95 < 2000ms, P99 < 3000ms
- ❌ **Poor:** Avg > 1000ms, P95 > 2000ms, P99 > 3000ms

### Error Rates
- ✅ **Good:** < 0.5%
- ⚠️ **Acceptable:** < 1%
- ❌ **Poor:** > 2%

## Regression Detection

### What Constitutes a Regression?

Compare with previous baseline:

- 🔴 **Critical Regression:** >50% slower or error rate >2x
- 🟡 **Significant Regression:** >20% slower or error rate >1.5x
- 🟢 **Minor Regression:** <20% slower, within acceptable range

### Example

**Previous Baseline:**
- Avg: 50ms, P95: 120ms, Error: 0.1%

**Current Results:**
- Avg: 65ms (+30%), P95: 150ms (+25%), Error: 0.15%

**Assessment:** 🟡 Significant regression - investigate

## Common Performance Improvements

Track what improvements worked:

| Date | Change Description | Metric Improvement | Notes |
|------|-------------------|-------------------|-------|
| YYYY-MM-DD | Added Redis caching to user profiles | P95: 500ms → 200ms (-60%) | Major win! |
| YYYY-MM-DD | Optimized Saju calculation | Avg: 2s → 800ms (-60%) | Cached intermediate results |
| YYYY-MM-DD | Added database indexes | Query time: 100ms → 20ms (-80%) | birth_date, user_id indexes |
| | | | |

## Performance Optimization Log

### Attempted Optimizations

| Date | Optimization | Expected Impact | Actual Impact | Keep? |
|------|-------------|-----------------|---------------|-------|
| YYYY-MM-DD | Response compression | -30% bandwidth | -25% bandwidth, +5ms latency | ✅ Yes |
| YYYY-MM-DD | Connection pooling | +20% throughput | +15% throughput | ✅ Yes |
| YYYY-MM-DD | Code minification | -10% load time | -5% load time | ✅ Yes |
| | | | | |

## Monthly Performance Summary

### YYYY-MM (Example: 2025-01)

**Highlights:**
- ✅ All endpoints within acceptable ranges
- ✅ Zero critical regressions
- ⚠️ Session endpoint 15% slower (still acceptable)

**Action Items:**
- [ ] Investigate session endpoint slowdown
- [ ] Add more caching to Saju calculations
- [ ] Consider CDN for static assets

**Overall Grade:** A- (Good performance, minor attention needed)

---

## Template for Recording Results

Copy this template when recording new baselines:

```
Date: YYYY-MM-DD
Version: vX.X.X
Environment: Development/Staging/Production
Node Version: X.X.X
Test Duration: Xm

=== Session Check Endpoint ===
Connections: 10
Average Latency: Xms
P95 Latency: Xms
P99 Latency: Xms
Requests/sec: X
Error Rate: X%

=== Cities Search Endpoint ===
Connections: 10
Average Latency: Xms
P95 Latency: Xms
P99 Latency: Xms
Requests/sec: X
Error Rate: X%

=== Saju Calculation ===
Connections: 10
Average Latency: Xms
P95 Latency: Xms
P99 Latency: Xms
Requests/sec: X
Error Rate: X%

=== K6 Basic Load Test ===
Max VUs: 50
Average Duration: Xms
P95 Duration: Xms
Total Requests: X
Success Rate: X%

Notes:
- Any issues or observations
- Environment conditions
- Recent changes that might affect performance
```

## Automated Tracking (Future Enhancement)

Consider implementing:

1. **Automated baseline storage** - Store results in JSON/database
2. **Performance dashboard** - Grafana/custom dashboard
3. **Automated alerts** - Slack/email on regressions
4. **Historical graphs** - Track trends over time
5. **CI/CD integration** - Fail builds on critical regressions

## Tips for Accurate Baselines

1. **Consistent environment** - Same hardware, OS, Node version
2. **Isolated runs** - Close other applications
3. **Multiple runs** - Average 3+ runs for accuracy
4. **Warm-up** - Run once before recording baseline
5. **Document changes** - Note any system/code changes
6. **Regular schedule** - Weekly or after major changes

---

**Start tracking your baselines today!** Run tests and record your first baseline above.
