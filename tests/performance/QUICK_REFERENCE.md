# Performance Testing Quick Reference

## Before You Start

✅ Start dev server: `npm run dev`
✅ Wait for server ready
✅ (Optional) Install k6 for advanced tests

## Test Commands

### Quick Checks (10-15 min)

```bash
npm run test:performance
```

- Tests all API endpoints
- Light, medium, and heavy load
- Compute-intensive operations
- Best for: Regular checks, CI/CD

### Load Testing

#### 🟢 Basic Load (3-4 min)

```bash
npm run test:load:basic
```

Normal traffic patterns, gradual ramp-up
**Use:** Regular load checks

#### 🔴 Stress Test (13 min)

```bash
npm run test:load:stress
```

Find breaking points, 300+ users
**Use:** Capacity planning

#### ⚡ Spike Test (2 min)

```bash
npm run test:load:spike
```

Sudden 10→100 user spike
**Use:** Viral traffic prep

#### 🔵 Endurance (35 min)

```bash
npm run test:load:endurance
```

Long-running stability test
**Use:** Memory leak detection (run overnight)

#### 👥 Realistic (10 min)

```bash
npm run test:load:realistic
```

Real user behavior patterns
**Use:** Pre-deployment validation

## Reading Results

### Good ✅

- Average latency: < 200ms
- P95: < 500ms
- P99: < 1000ms
- Error rate: < 1%

### Needs Work ⚠️

- Average latency: > 500ms
- P95: > 2000ms
- P99: > 5000ms
- Error rate: > 5%

## Common Scenarios

### Before Deployment

```bash
npm run test:performance
npm run test:load:realistic
```

### After Optimization

```bash
npm run test:performance
# Compare with previous results
```

### Finding Capacity Limits

```bash
npm run test:load:stress
```

### Checking for Memory Leaks

```bash
npm run test:load:endurance
```

## Troubleshooting

### Server Not Ready

```
Error: Server not ready
```

→ Run `npm run dev` first

### High Errors

```
Error rate: 10%+
```

→ Check server logs
→ Reduce load (fewer users)
→ Check database connections

### Test Fails

```
Test times out or crashes
```

→ Check system resources (CPU, memory)
→ Verify server is running
→ Check API_BASE_URL env variable

## Quick Tips

- **Compare trends** over time, not absolute numbers
- **Check P95/P99**, not just averages
- **Test one change** at a time
- **Monitor resources** during tests (CPU, memory, DB)
- **Start small** (basic load) before heavy tests

## Environment

Create `.env.test`:

```env
API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_PUBLIC_METRICS_TOKEN=your-token
```

## Files

```
tests/performance/
├── api-endpoints.test.ts    # Autocannon tests
├── helpers.ts               # Test utilities
└── k6/
    ├── basic-load.js       # Normal traffic
    ├── stress-test.js      # Breaking points
    ├── spike-test.js       # Sudden spikes
    ├── endurance-test.js   # Long-running
    └── realistic-scenario.js # User journeys
```

## More Help

- [K6 Tests Guide](./k6/README.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Performance Testing README](./README.md)

---

**Need help?** Check the full documentation or server logs.
