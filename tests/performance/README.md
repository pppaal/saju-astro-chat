# Performance Testing Suite

Complete performance and load testing solution for Saju Astro Chat API.

## Quick Start

### 1. Install Dependencies

**Node.js tests (Autocannon):**

```bash
npm install
```

**K6 tests:**

- **Windows:** `choco install k6`
- **macOS:** `brew install k6`
- **Linux:** See [k6 installation docs](https://k6.io/docs/getting-started/installation)

### 2. Start Server

```bash
npm run dev
```

### 3. Run Tests

**Quick performance check:**

```bash
npm run test:performance
```

**Load testing:**

```bash
npm run test:load:basic
```

## Test Suites

### Vitest + Autocannon Tests

Node.js-based performance tests integrated with existing test suite.

**Location:** `tests/performance/api-endpoints.test.ts`

**Run:**

```bash
npm run test:performance          # Run once
npm run test:performance:watch    # Watch mode
```

**Tests:**

- Public endpoints (light/medium/heavy load)
- Compute-intensive operations
- Database operations
- Concurrent request handling
- Stress testing
- Rate limiting
- Response time consistency

**Duration:** ~10-15 minutes

### K6 Load Tests

Advanced load testing scenarios for different patterns.

**Location:** `tests/performance/k6/`

**Tests:**

| Test        | Command                       | Duration | Purpose                 |
| ----------- | ----------------------------- | -------- | ----------------------- |
| Basic Load  | `npm run test:load:basic`     | 3-4 min  | Normal traffic patterns |
| Stress Test | `npm run test:load:stress`    | 13 min   | Find breaking points    |
| Spike Test  | `npm run test:load:spike`     | 2 min    | Sudden traffic spikes   |
| Endurance   | `npm run test:load:endurance` | 35 min   | Memory leaks, stability |
| Realistic   | `npm run test:load:realistic` | 10 min   | Real user behavior      |

## File Structure

```
tests/performance/
├── README.md                    # This file
├── helpers.ts                   # Shared utilities and helpers
├── api-endpoints.test.ts        # Autocannon performance tests
└── k6/                          # K6 load testing scenarios
    ├── README.md                # K6 tests documentation
    ├── basic-load.js            # Normal traffic patterns
    ├── stress-test.js           # Capacity and breaking points
    ├── spike-test.js            # Sudden traffic increases
    ├── endurance-test.js        # Long-running stability
    └── realistic-scenario.js    # Real user journeys
```

## Key Metrics

### Response Time

- **Average:** Mean response time
- **P50 (Median):** 50% of requests are faster
- **P95:** 95% of requests are faster (important!)
- **P99:** 99% of requests are faster (critical!)

### Throughput

- **Requests/sec:** How many requests per second
- **MB/sec:** Data transferred per second

### Reliability

- **Error Rate:** % of failed requests (should be < 1%)
- **2xx/4xx/5xx:** HTTP status code distribution

## Performance Thresholds

| Endpoint Type | Avg Latency | P95 Latency | Error Rate |
| ------------- | ----------- | ----------- | ---------- |
| Public        | < 200ms     | < 500ms     | < 1%       |
| Compute       | < 1000ms    | < 2000ms    | < 2%       |
| Auth          | < 300ms     | < 600ms     | < 1%       |

## Common Use Cases

### Before Deployment

```bash
npm run test:performance
npm run test:load:realistic
```

### Capacity Planning

```bash
npm run test:load:stress
```

### Stability Check

```bash
npm run test:load:endurance  # Run overnight
```

### After Performance Optimization

```bash
npm run test:performance
# Compare results with previous runs
```

### CI/CD Integration

```bash
# Quick check in CI pipeline
npm run test:load:basic
```

## Environment Variables

Create `.env.test` or add to `.env.local`:

```env
API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_PUBLIC_METRICS_TOKEN=your-token-here
TEST_API_TOKEN=your-test-token
```

## Interpreting Results

### Good Performance

```
✓ Average latency: 50ms
✓ P95 latency: 150ms
✓ P99 latency: 300ms
✓ Error rate: 0.1%
✓ Throughput: 100 req/s
```

### Needs Investigation

```
⚠ Average latency: 500ms (slow)
⚠ P95 latency: 2000ms (very slow)
⚠ P99 latency: 5000ms (critical)
⚠ Error rate: 5% (high)
⚠ Throughput: 10 req/s (low)
```

## Troubleshooting

### Server Not Ready

```
Error: Server not ready at http://localhost:3000
```

**Fix:** Ensure `npm run dev` is running and server is ready

### High Error Rates

```
Error rate: 10%+
```

**Check:**

1. Server logs for errors
2. Database connection limits
3. Rate limiting settings
4. System resources (CPU, memory)

### Memory Issues

```
Server crashes during test
```

**Fix:**

1. Check for memory leaks
2. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run dev`
3. Monitor memory during test

## Best Practices

1. **Test regularly** - Catch regressions early
2. **Start small** - Begin with light load
3. **Monitor resources** - Watch CPU, memory, database
4. **Compare trends** - Track performance over time
5. **Test realistically** - Use production-like data
6. **One change at a time** - Isolate performance impacts
7. **Don't test production** - Unless explicitly authorized

## Documentation

- **[Full Performance Testing Guide](../../docs/archive/PERFORMANCE_TESTING.md)** - Complete documentation
- **[K6 Tests README](./k6/README.md)** - K6-specific documentation

## CI/CD Integration

See [PERFORMANCE_TESTING.md](../../docs/archive/PERFORMANCE_TESTING.md#cicd-integration) for GitHub Actions examples.

## Support

For issues or questions:

1. Check [troubleshooting guide](../../docs/archive/PERFORMANCE_TESTING.md#troubleshooting)
2. Review server logs
3. File an issue in GitHub repository

## Contributing

When adding new tests:

1. Add to appropriate file/directory
2. Set reasonable thresholds
3. Update documentation
4. Test before committing

---

**Happy Testing! 🚀**
