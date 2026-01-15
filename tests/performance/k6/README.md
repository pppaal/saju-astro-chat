# K6 Load Testing Scenarios

This directory contains k6 load testing scenarios for different performance testing needs.

## Quick Start

1. Install k6: https://k6.io/docs/getting-started/installation
2. Start your development server: `npm run dev`
3. Run a test: `npm run test:load:basic`

## Test Scenarios

### 1. Basic Load Test (`basic-load.js`)

**Purpose:** Verify API can handle normal traffic patterns

**Run:**
```bash
npm run test:load:basic
# or
k6 run tests/performance/k6/basic-load.js
```

**Pattern:**
- Ramp up: 0 → 20 users (30s)
- Sustain: 20 users (1 min)
- Ramp up: 20 → 50 users (30s)
- Sustain: 50 users (1 min)
- Ramp down: 50 → 0 users (30s)

**Thresholds:**
- P95 response time < 500ms
- P99 response time < 1000ms
- Error rate < 5%

**Use Case:** Regular performance checks, CI/CD pipelines

---

### 2. Stress Test (`stress-test.js`)

**Purpose:** Find the breaking point of your API

**Run:**
```bash
npm run test:load:stress
# or
k6 run tests/performance/k6/stress-test.js
```

**Pattern:**
- Gradually increase load: 0 → 50 → 100 → 200 → 300 users
- Each stage: 2 minutes
- Peak load: 3 minutes
- Total: ~13 minutes

**Thresholds:**
- P99 response time < 5000ms (relaxed for stress)
- Request failure rate < 25%
- Server error rate < 10%

**Use Case:**
- Capacity planning
- Infrastructure sizing
- Finding bottlenecks

**What to Monitor:**
- At what user count does performance degrade?
- When do errors start appearing?
- System resource usage (CPU, memory, database connections)

---

### 3. Spike Test (`spike-test.js`)

**Purpose:** Test sudden traffic increases (viral content, marketing campaigns)

**Run:**
```bash
npm run test:load:spike
# or
k6 run tests/performance/k6/spike-test.js
```

**Pattern:**
- Baseline: 10 users (20s)
- **Sudden spike**: 10 → 100 users (10s)
- Peak: 100 users (30s)
- Recovery: 100 → 10 users (10s)
- Cooldown: 10 → 0 users (10s)

**Thresholds:**
- P95 response time < 2000ms during spike
- Error rate < 15% during spike

**Use Case:**
- Viral content preparation
- Marketing campaign launch
- Product launches
- Social media traffic spikes

**What to Look For:**
- Does the system recover after the spike?
- Are there cascading failures?
- Do errors persist after load returns to normal?

---

### 4. Endurance Test (`endurance-test.js`)

**Purpose:** Detect memory leaks and performance degradation over time

**Run:**
```bash
npm run test:load:endurance
# or
k6 run tests/performance/k6/endurance-test.js
```

**Pattern:**
- Ramp up: 0 → 30 users (2 min)
- **Sustained load**: 30 users (30 minutes)
- Ramp down: 30 → 0 users (2 min)

**Thresholds:**
- P95 response time < 1000ms (should stay stable)
- Error rate < 5%

**Use Case:**
- Memory leak detection
- Stability verification
- Production readiness validation
- Weekly/nightly regression tests

**What to Monitor:**
- Response time trends over 30 minutes
- Memory usage growth
- Connection pool exhaustion
- Checkpoint logs every 5 minutes

**Note:** This test takes ~35 minutes. Run overnight or during off-hours.

---

### 5. Realistic Scenario Test (`realistic-scenario.js`)

**Purpose:** Simulate real user behavior patterns

**Run:**
```bash
npm run test:load:realistic
# or
k6 run tests/performance/k6/realistic-scenario.js
```

**Pattern:**
- Morning traffic: 10 users (1 min)
- Peak hours: 30 users (3 min)
- Busy period: 50 users (2 min)
- Afternoon: 30 users (2 min)
- Evening: 10 users (1 min)

**User Journeys:**
- **50% New Users:** Homepage → City search → Saju calculation
- **35% Returning Users:** Session check → Astrology → Compatibility
- **15% Quick Visitors:** Homepage → Quick search → Bounce

**Thresholds:**
- P95 response time < 1000ms
- Error rate < 5%
- 90% of user journeys complete successfully

**Use Case:**
- Pre-deployment validation
- Production simulation
- Understanding real-world performance

---

## Environment Variables

Set these before running tests:

```bash
# API base URL (default: http://localhost:3000)
export API_BASE_URL=http://localhost:3000

# Metrics token for protected endpoints
export METRICS_TOKEN=your-token-here
```

Or use `.env` file:
```env
API_BASE_URL=http://localhost:3000
METRICS_TOKEN=your-token-here
```

## Custom Test Options

Override default settings:

```bash
# Custom VUs and duration
k6 run --vus 100 --duration 60s tests/performance/k6/basic-load.js

# Different stages
k6 run --stage 30s:10,1m:20,30s:0 tests/performance/k6/basic-load.js

# Output to file
k6 run --out json=results.json tests/performance/k6/basic-load.js
k6 run --out csv=results.csv tests/performance/k6/basic-load.js

# Cloud run (requires k6 account)
k6 cloud tests/performance/k6/basic-load.js
```

## Reading Results

### Summary Output

```
checks.........................: 95.00% ✓ 4750 ✗ 250
http_req_duration..............: avg=18ms min=5ms med=15ms max=450ms p(90)=25ms p(95)=35ms
http_req_failed................: 0.50%  ✓ 25   ✗ 4975
http_reqs......................: 5000   50/s
```

**Key Metrics:**
- `checks`: % of assertions that passed
- `http_req_duration`: Response time statistics
  - `avg`: Average response time
  - `p(95)`: 95th percentile (95% of requests faster than this)
  - `p(99)`: 99th percentile
- `http_req_failed`: % of failed requests
- `http_reqs`: Total requests and rate

### Thresholds

If a threshold fails, you'll see:
```
✗ http_req_duration......: p(95)<500ms
  ↳ 0% — ✓ 0 / ✗ 1
```

This means the P95 latency exceeded 500ms.

## Troubleshooting

### Test Fails Immediately

**Issue:** Test exits with connection errors

**Fix:**
1. Ensure server is running: `npm run dev`
2. Check server is ready: `curl http://localhost:3000/api/auth/session`
3. Verify `API_BASE_URL` is correct

### High Error Rates

**Issue:** > 10% error rate

**Possible Causes:**
- Server overload (reduce VUs)
- Rate limiting
- Application errors

**Debug:**
1. Check server logs
2. Run with fewer VUs: `k6 run --vus 10 ...`
3. Check application errors in logs

### Inconsistent Results

**Issue:** Results vary significantly

**Fix:**
1. Close other applications
2. Run test multiple times
3. Use dedicated test environment
4. Check system resources aren't constrained

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Install k6
  run: |
    curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
    sudo cp k6-v0.47.0-linux-amd64/k6 /usr/local/bin

- name: Run basic load test
  run: npm run test:load:basic
  env:
    API_BASE_URL: http://localhost:3000
```

## Best Practices

1. **Start Small:** Begin with basic load test, then gradually increase
2. **Monitor Resources:** Watch CPU, memory, database during tests
3. **Test One Thing:** Change one variable at a time
4. **Realistic Data:** Use production-like data volumes
5. **Regular Testing:** Run tests regularly to catch regressions
6. **Don't Test Production:** Unless you have a specific reason and permission

## Advanced Usage

### Custom Metrics

Add custom metrics to track specific behaviors:

```javascript
import { Trend } from 'k6/metrics';

const customMetric = new Trend('custom_operation_duration');

export default function() {
  const start = Date.now();
  // ... your operation
  customMetric.add(Date.now() - start);
}
```

### Scenarios

Use scenarios for complex test patterns:

```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
    },
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};
```

## Further Reading

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Types](https://k6.io/docs/test-types/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [k6 Cloud](https://k6.io/cloud/)
