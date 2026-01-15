# Getting Started with Performance Testing

Quick guide to set up and run your first performance tests.

## Step 1: Install K6 (Optional but Recommended)

K6 provides advanced load testing scenarios. Choose your platform:

### Windows

**Using Chocolatey:**
```bash
choco install k6
```

**Using Windows Package Manager (winget):**
```bash
winget install k6 --source winget
```

**Manual Installation:**
1. Download from https://github.com/grafana/k6/releases
2. Extract and add to PATH

**Verify installation:**
```bash
k6 version
```

### macOS

```bash
brew install k6
```

### Linux (Ubuntu/Debian)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Step 2: Set Up Environment (Optional)

Create `.env.test` file in your project root:

```env
# API Base URL (default: http://localhost:3000)
API_BASE_URL=http://localhost:3000

# Optional: Metrics token for protected endpoints
NEXT_PUBLIC_PUBLIC_METRICS_TOKEN=your-token-here

# Optional: Test API token
TEST_API_TOKEN=your-test-token
```

## Step 3: Run Your First Test

### Terminal 1: Start the Server

```bash
npm run dev
```

Wait for the "Ready" message.

### Terminal 2: Run Performance Test

**Quick Node.js test (10-15 min):**
```bash
npm run test:performance
```

**Or basic K6 load test (3-4 min):**
```bash
npm run test:load:basic
```

## Step 4: Establish Baseline Metrics

Run tests now to establish your performance baseline:

```bash
# 1. Start server
npm run dev

# 2. In another terminal, run baseline tests
npm run test:performance > baseline-results.txt

# 3. Run K6 baseline (if installed)
npm run test:load:basic > k6-baseline.txt
```

Save these results for comparison after making changes!

## Step 5: Understanding Your Results

### Example Good Results ✅

```
━━━ Performance Test Results: Session Check (Light Load) ━━━

Requests:
  Total: 5000
  Average: 500.00 req/s ✓

Latency:
  Average: 18.50ms ✓
  P95: 30.00ms ✓
  P99: 45.00ms ✓

HTTP Status Codes:
  2xx: 5000 ✓
  5xx: 0 ✓
  Error Rate: 0.00% ✓
```

### Example Needs Work ⚠️

```
Latency:
  Average: 850.50ms ⚠️ (target: <200ms)
  P95: 2100.00ms ⚠️ (target: <500ms)
  P99: 4500.00ms ⚠️ (target: <1000ms)

HTTP Status Codes:
  2xx: 4500
  5xx: 500 ⚠️
  Error Rate: 10.00% ⚠️ (target: <1%)
```

## Step 6: Regular Testing Schedule

### Daily/Weekly (During Development)
```bash
npm run test:performance
```
Quick check that nothing broke.

### Before Each Release
```bash
npm run test:performance
npm run test:load:realistic
```
Ensure production readiness.

### Weekly (Overnight)
```bash
npm run test:load:endurance
```
Check for memory leaks and degradation.

### As Needed
```bash
npm run test:load:stress    # Find capacity limits
npm run test:load:spike     # Test traffic spikes
```

## Step 7: CI/CD Integration

Add to your `.github/workflows/pr-checks.yml`:

```yaml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Start server in background
      run: |
        npm run start &
        npx wait-on http://localhost:3000 -t 60000

    - name: Run performance tests
      run: npm run test:performance
      env:
        API_BASE_URL: http://localhost:3000
```

## Common First-Time Issues

### 1. Server Not Ready

**Error:**
```
Error: Server not ready at http://localhost:3000
```

**Solution:**
- Ensure `npm run dev` is running
- Wait for "Ready in X ms" message
- Check http://localhost:3000 in browser

### 2. K6 Not Found

**Error:**
```
'k6' is not recognized as an internal or external command
```

**Solution:**
- Install k6 (see Step 1 above)
- Or skip k6 tests and use: `npm run test:performance`

### 3. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### 4. Tests Time Out

**Solution:**
- Check server logs for errors
- Reduce load (edit test files, reduce connections)
- Check system resources (CPU, memory)

## Performance Optimization Checklist

If tests show poor performance:

- [ ] Check database query performance (N+1 queries, missing indexes)
- [ ] Add caching (Redis, in-memory)
- [ ] Optimize heavy computations (Saju, Astrology calculations)
- [ ] Review API route handlers for inefficiencies
- [ ] Check for memory leaks (use endurance test)
- [ ] Consider rate limiting adjustments
- [ ] Profile with Node.js profiler (`node --inspect`)
- [ ] Review Next.js optimization opportunities

## Quick Commands Reference

```bash
# Node.js performance tests (no k6 needed)
npm run test:performance          # Full test suite (10-15 min)
npm run test:performance:watch    # Watch mode for development

# K6 load tests (requires k6 installation)
npm run test:load:basic          # Normal traffic (3-4 min)
npm run test:load:stress         # Find limits (13 min)
npm run test:load:spike          # Traffic spike (2 min)
npm run test:load:endurance      # Stability (35 min)
npm run test:load:realistic      # Real users (10 min)
```

## Next Steps

1. ✅ Install k6 (if not done)
2. ✅ Run baseline tests and save results
3. ✅ Add to CI/CD pipeline
4. ✅ Schedule regular test runs
5. 📖 Read [full documentation](./PERFORMANCE_TESTING.md)
6. 📊 Set up monitoring dashboard (optional)

## Getting Help

- **Quick Reference:** [tests/performance/QUICK_REFERENCE.md](../tests/performance/QUICK_REFERENCE.md)
- **Full Guide:** [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md)
- **K6 Tests:** [tests/performance/k6/README.md](../tests/performance/k6/README.md)
- **Check logs** in your terminal
- **File an issue** in GitHub repo

---

**You're all set! 🚀** Start with `npm run test:performance` and go from there.
