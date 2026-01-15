# Performance & Load Testing Guide

This guide covers performance and load testing for the Saju Astro Chat API endpoints.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Setup](#setup)
4. [Running Tests](#running-tests)
5. [Understanding Results](#understanding-results)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

## Overview

We use two complementary tools for performance testing:

- **Autocannon** (via Vitest): Node.js-based load testing, integrated with our existing test suite
- **k6**: Advanced load testing with various scenarios (requires separate installation)

## Test Types

### 1. API Endpoint Performance Tests (Autocannon)

Quick performance tests that run via Vitest:

```bash
npm run test:performance
```

**What it tests:**
- Response times under light/medium/heavy load
- Concurrent request handling
- Compute-intensive operations (Saju, Astrology calculations)
- Database operation performance
- Stress and burst traffic handling
- Rate limiting
- Response time consistency

**Duration:** ~10-15 minutes

### 2. K6 Load Testing Scenarios

Advanced load testing scenarios:

#### Basic Load Test
```bash
npm run test:load:basic
```
Simulates normal user traffic with gradual ramp-up and sustained load.
- Duration: ~3-4 minutes
- Max users: 50

#### Stress Test
```bash
npm run test:load:stress
```
Pushes the API to its limits to find breaking points.
- Duration: ~13 minutes
- Max users: 300
- Gradually increases load to find capacity limits

#### Spike Test
```bash
npm run test:load:spike
```
Tests sudden traffic increases (viral content, marketing campaigns).
- Duration: ~2 minutes
- Tests burst from 10 → 100 users instantly

#### Endurance Test (Soak Test)
```bash
npm run test:load:endurance
```
Tests stability over extended period to detect memory leaks and degradation.
- Duration: ~35 minutes
- Sustained load: 30 concurrent users
- Monitors for performance degradation over time

#### Realistic Scenario Test
```bash
npm run test:load:realistic
```
Simulates real user behavior patterns.
- Duration: ~10 minutes
- Multiple user journeys: new users, returning users, quick visitors
- Realistic traffic patterns throughout the day

## Setup

### Prerequisites

1. **Node.js Tests (Autocannon)** - Already installed:
   ```bash
   npm install
   ```

2. **K6 Tests** - Install k6:

   **Windows (via Chocolatey):**
   ```bash
   choco install k6
   ```

   **macOS (via Homebrew):**
   ```bash
   brew install k6
   ```

   **Linux:**
   ```bash
   # Debian/Ubuntu
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

### Environment Setup

1. Create a `.env.test` file (or add to your `.env.local`):
   ```env
   # API Base URL (default: http://localhost:3000)
   API_BASE_URL=http://localhost:3000

   # Optional: Metrics token for protected endpoints
   NEXT_PUBLIC_PUBLIC_METRICS_TOKEN=your-token-here

   # Optional: Test API token for authenticated endpoints
   TEST_API_TOKEN=your-test-token
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. Wait for the server to be ready before running tests

## Running Tests

### Quick Start

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, run performance tests:**
   ```bash
   # Node.js-based tests
   npm run test:performance

   # Or k6 tests
   npm run test:load:basic
   ```

### Test Commands

| Command | Description | Duration | Use Case |
|---------|-------------|----------|----------|
| `npm run test:performance` | API endpoint performance tests | 10-15 min | Regular performance checks |
| `npm run test:performance:watch` | Watch mode for development | Continuous | Development |
| `npm run test:load:basic` | Basic load test | 3-4 min | Quick load check |
| `npm run test:load:stress` | Find breaking points | 13 min | Capacity planning |
| `npm run test:load:spike` | Sudden traffic spikes | 2 min | Viral traffic preparation |
| `npm run test:load:endurance` | Long-running stability | 35 min | Memory leak detection |
| `npm run test:load:realistic` | Real user patterns | 10 min | Production simulation |

### Custom K6 Tests

You can customize k6 tests with options:

```bash
# Custom duration and VUs (Virtual Users)
k6 run --vus 100 --duration 60s tests/performance/k6/basic-load.js

# With environment variables
API_BASE_URL=https://staging.yourapp.com k6 run tests/performance/k6/basic-load.js

# Output results to file
k6 run --out json=results.json tests/performance/k6/basic-load.js
```

## Understanding Results

### Autocannon Metrics

After each test, you'll see output like:

```
━━━ Performance Test Results: Session Check (Light Load) ━━━

Test Configuration:
  Duration: 10s
  Connections: 10

Requests:
  Total: 5000
  Average: 500.00 req/s
  Min: 450 req/s
  Max: 550 req/s

Latency:
  Average: 18.50ms
  P50: 16.00ms
  P90: 25.00ms
  P95: 30.00ms
  P99: 45.00ms
  Max: 120.00ms

Throughput:
  Average: 2.50 MB/s
  Total: 25.00 MB

HTTP Status Codes:
  2xx: 5000
  4xx: 0
  5xx: 0
  Errors: 0
  Timeouts: 0
  Error Rate: 0.00%
```

**Key Metrics:**

- **Requests/sec**: Higher is better
- **Latency P95/P99**: 95th/99th percentile response times (most important for user experience)
- **Error Rate**: Should be < 1% for production
- **Throughput**: Data transferred per second

### K6 Metrics

K6 provides detailed metrics:

```
checks.........................: 95.00% ✓ 4750 ✗ 250
data_received..................: 25 MB  250 kB/s
data_sent......................: 2.5 MB 25 kB/s
http_req_duration..............: avg=18ms min=5ms med=15ms max=450ms p(90)=25ms p(95)=35ms
http_req_failed................: 0.50%  ✓ 25   ✗ 4975
http_reqs......................: 5000   50/s
vus............................: 10     min=0 max=50
vus_max........................: 50     min=50 max=50
```

**Key Metrics:**

- **checks**: % of successful assertions
- **http_req_duration**: Response time distribution
- **http_req_failed**: % of failed requests
- **http_reqs**: Total requests and rate

### Performance Thresholds

Our default thresholds:

| Endpoint Type | Avg Latency | P95 Latency | P99 Latency | Error Rate |
|--------------|-------------|-------------|-------------|------------|
| Public | < 200ms | < 500ms | < 1000ms | < 1% |
| Compute-intensive | < 1000ms | < 2000ms | < 3000ms | < 2% |
| Auth | < 300ms | < 600ms | < 1200ms | < 1% |

## Best Practices

### 1. Test Environment

- **Always test against a running server** (dev, staging, or production-like)
- **Don't test against production** unless you know what you're doing
- Use realistic data volumes in your test database
- Monitor system resources (CPU, memory, database connections) during tests

### 2. Test Scheduling

- **Quick tests** (basic, spike): Run regularly during development
- **Stress tests**: Run before major releases
- **Endurance tests**: Run overnight or weekly to catch memory leaks
- **Realistic scenarios**: Run before deployment to production

### 3. Interpreting Results

- **Compare trends** over time, not absolute numbers
- **Look for degradation** in repeated tests
- **Check P95/P99**, not just averages (averages hide outliers)
- **Monitor server resources** alongside tests
- **Test one change at a time** to isolate performance impacts

### 4. Performance Optimization

If tests reveal issues:

1. **Identify bottlenecks**: Check slow endpoints in results
2. **Profile the code**: Use Node.js profiler for compute issues
3. **Optimize database queries**: Check for N+1 queries, missing indexes
4. **Add caching**: Use Redis for frequently accessed data
5. **Scale horizontally**: Add more server instances
6. **Optimize algorithms**: Review complex calculations

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Run nightly at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run performance tests
        run: npm run test:performance

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run basic load test
        run: npm run test:load:basic

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: coverage/
```

## Troubleshooting

### Server Not Ready

**Error:** `Server not ready at http://localhost:3000`

**Solution:**
- Ensure `npm run dev` is running
- Wait for "Ready in X ms" message
- Check server is accessible: `curl http://localhost:3000/api/auth/session`

### High Error Rates

**Error:** Tests show > 5% error rate

**Causes:**
- Server overload (reduce concurrent connections)
- Database connection limit reached
- Rate limiting kicking in
- Application errors (check server logs)

**Solution:**
- Check server logs for errors
- Monitor database connections
- Reduce test load
- Fix application bugs

### Memory Issues

**Error:** Server crashes during endurance test

**Causes:**
- Memory leaks
- Insufficient server resources
- Connection pool exhaustion

**Solution:**
- Profile memory usage: `node --inspect`
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run dev`
- Fix memory leaks in code
- Tune database connection pool

### Inconsistent Results

**Issue:** Results vary significantly between runs

**Causes:**
- Other processes using resources
- Network issues
- Garbage collection pauses
- Background jobs running

**Solution:**
- Close other applications
- Run multiple times and average results
- Use dedicated test environment
- Disable background jobs during tests

## Additional Resources

- [Autocannon Documentation](https://github.com/mcollina/autocannon)
- [k6 Documentation](https://k6.io/docs/)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

## Contributing

When adding new performance tests:

1. Add tests to appropriate file in `tests/performance/`
2. Set reasonable thresholds based on endpoint complexity
3. Update this documentation
4. Consider both light and heavy load scenarios
5. Test compute-intensive operations separately with relaxed thresholds

## Support

For issues or questions:
- File an issue in the GitHub repository
- Check existing performance test results
- Review server logs for errors
- Monitor system resources during tests
