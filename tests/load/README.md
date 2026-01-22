# Load Testing with k6

## Installation

```bash
# macOS
brew install k6

# Windows (using Chocolatey)
choco install k6

# Windows (using Scoop)
scoop install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Usage

### 1. Smoke Test (Quick validation)
Tests basic functionality with minimal load:
```bash
K6_SCENARIO=smoke k6 run tests/load/k6-config.js
```

### 2. Load Test (Normal traffic simulation)
Simulates 50 concurrent users for 5 minutes:
```bash
K6_SCENARIO=load k6 run tests/load/k6-config.js
```

### 3. Stress Test (Find breaking point)
Ramps up to 200 users to find system limits:
```bash
K6_SCENARIO=stress k6 run tests/load/k6-config.js
```

### 4. Spike Test (Sudden traffic surge)
Simulates sudden traffic spikes:
```bash
K6_SCENARIO=spike k6 run tests/load/k6-config.js
```

## Configuration

### Environment Variables

- `BASE_URL`: Target server URL (default: http://localhost:3000)
- `API_TOKEN`: Public API token for authentication
- `K6_SCENARIO`: Test scenario (smoke/load/stress/spike)

Example:
```bash
BASE_URL=https://your-app.com \
API_TOKEN=your-token \
K6_SCENARIO=load \
k6 run tests/load/k6-config.js
```

## Test Endpoints

The load test covers these critical endpoints:
- Health Check (10%)
- Saju Analysis (30%)
- Tarot Reading (25%)
- Dream Analysis (15%)
- Calendar (10%)
- User History (10%)

## Success Criteria

### Performance Thresholds
- 95% of requests < 500ms
- 99% of requests < 1000ms
- Error rate < 1%
- Custom error rate < 5%

### Expected Results (Smoke Test)
- ✅ All endpoints respond successfully
- ✅ No 500 errors
- ✅ Response times within threshold
- ✅ Valid JSON responses

### Expected Results (Load Test)
- ✅ System handles 50 concurrent users
- ✅ < 1% error rate
- ✅ P95 latency < 500ms
- ✅ No memory leaks

### Expected Results (Stress Test)
- ✅ Identify maximum capacity
- ✅ Graceful degradation under load
- ✅ No crashes or hangs
- ✅ Error rate increases predictably

## Interpreting Results

### Good Performance
```
http_req_duration...: avg=250ms p(95)=450ms p(99)=800ms
http_req_failed.....: 0.5%
errors..............: 1.2%
```

### Warning Signs
```
http_req_duration...: avg=800ms p(95)=1200ms p(99)=2500ms
http_req_failed.....: 3%
errors..............: 8%
```

### Critical Issues
```
http_req_duration...: avg=2000ms p(95)=5000ms p(99)=10000ms
http_req_failed.....: 10%
errors..............: 25%
```

## CI/CD Integration

### GitHub Actions
Add to `.github/workflows/load-test.yml`:
```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday 2am
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run smoke test
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          API_TOKEN: ${{ secrets.API_TOKEN }}
        run: K6_SCENARIO=smoke k6 run tests/load/k6-config.js
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-test-summary.json
```

## Troubleshooting

### High Error Rate
- Check server logs for 500 errors
- Verify database connections
- Check Redis/cache availability
- Review rate limiting settings

### High Latency
- Profile slow API endpoints
- Check database query performance
- Review external API calls
- Check network latency

### Memory Leaks
- Monitor memory usage during test
- Check for unclosed connections
- Review event listener cleanup
- Use heap snapshots

## Next Steps

1. Run smoke test locally before deployment
2. Run load test against staging weekly
3. Run stress test before major releases
4. Set up alerts for performance degradation
5. Create performance budgets for critical paths
