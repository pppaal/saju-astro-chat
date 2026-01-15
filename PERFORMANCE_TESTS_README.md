# 🚀 Quick Start: Performance Testing

## The Error You Just Saw

```
Error: Hook timed out in 30000ms
```

**This means:** The tests need a running server, but couldn't find one.

---

## ✅ How to Fix It

### Step 1: Start the Server (Terminal 1)

```bash
npm run dev
```

**Wait for this message:**
```
✓ Ready in 3000ms
```

### Step 2: Run Tests (Terminal 2)

```bash
npm run test:performance
```

---

## 📋 Quick Check

Before running tests, verify server is ready:

```bash
npm run test:performance:check
```

**Expected output:**
```
✅ Server is ready!

You can now run performance tests:
  npm run test:performance
  npm run test:load:basic
```

---

## 🎯 Available Test Commands

| Command | Description | Duration | Requires |
|---------|-------------|----------|----------|
| `npm run test:performance` | Complete API test suite | 10-15 min | Server running |
| `npm run test:performance:check` | Verify server is ready | 2 sec | Server running |
| `npm run test:load:basic` | Normal traffic patterns | 3-4 min | Server + k6 |
| `npm run test:load:stress` | Find breaking points | 13 min | Server + k6 |
| `npm run test:load:spike` | Sudden traffic spike | 2 min | Server + k6 |
| `npm run test:load:endurance` | 35-min stability test | 35 min | Server + k6 |
| `npm run test:load:realistic` | Real user scenarios | 10 min | Server + k6 |

---

## 📚 Full Documentation

- **Quick Start:** [docs/GETTING_STARTED_PERFORMANCE.md](docs/GETTING_STARTED_PERFORMANCE.md)
- **Complete Guide:** [docs/PERFORMANCE_TESTING.md](docs/PERFORMANCE_TESTING.md)
- **Troubleshooting:** [tests/performance/TROUBLESHOOTING.md](tests/performance/TROUBLESHOOTING.md)
- **Cheat Sheet:** [tests/performance/QUICK_REFERENCE.md](tests/performance/QUICK_REFERENCE.md)

---

## ❓ Common Questions

### Q: Do I need k6?

**A:** No! You can use `npm run test:performance` which uses Node.js (autocannon).

K6 is optional but provides more advanced testing scenarios.

**Install k6 (optional):**
- Windows: `choco install k6`
- macOS: `brew install k6`

### Q: Why do tests need the server running?

**A:** Performance tests measure real API response times and throughput, so they need to make actual HTTP requests to your running server.

### Q: Can I test production?

**A:** Only with explicit permission and during low-traffic periods. Use staging for regular testing.

```bash
# Test staging environment
API_BASE_URL=https://staging.your-app.com npm run test:performance
```

### Q: Tests are slow/timing out

**A:** Check:
1. Is server actually running? (`npm run test:performance:check`)
2. Are there errors in server logs?
3. Is database connected and responsive?
4. Are other apps using too much CPU/memory?

See [TROUBLESHOOTING.md](tests/performance/TROUBLESHOOTING.md) for more help.

---

## 🎓 Typical Workflow

### Daily Development

```bash
# Terminal 1: Keep running
npm run dev

# Terminal 2: When needed
npm run test:performance:check  # Quick check
npm run test:performance        # Full test
```

### Before Deployment

```bash
npm run test:performance        # Full suite
npm run test:load:realistic     # Real user scenarios
```

### Weekly Health Check

```bash
# Run overnight
npm run test:load:endurance
```

---

## 📊 Understanding Results

### Good Performance ✅

```
Requests:
  Average: 500 req/s ✓

Latency:
  Average: 18ms ✓
  P95: 30ms ✓
  P99: 45ms ✓

Error Rate: 0.00% ✓
```

### Needs Attention ⚠️

```
Latency:
  Average: 850ms ⚠️ (target: <200ms)
  P95: 2100ms ⚠️ (target: <500ms)

Error Rate: 10.00% ⚠️ (target: <1%)
```

---

## 🔧 Quick Fixes

### "Server not ready"
```bash
# Check if server is running
curl http://localhost:3000/api/auth/session

# Or use built-in check
npm run test:performance:check
```

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### "k6 not found"
```bash
# Either install k6
choco install k6  # Windows
brew install k6   # macOS

# Or use Node.js tests (no k6 needed)
npm run test:performance
```

---

## 🎯 Next Steps

1. ✅ Start server: `npm run dev`
2. ✅ Check it's ready: `npm run test:performance:check`
3. ✅ Run first test: `npm run test:performance`
4. 📖 Read full guide: [docs/GETTING_STARTED_PERFORMANCE.md](docs/GETTING_STARTED_PERFORMANCE.md)
5. 📊 Record baseline: [tests/performance/BASELINE_TRACKING.md](tests/performance/BASELINE_TRACKING.md)

---

**Happy Testing! 🚀**

*For detailed help, see [TROUBLESHOOTING.md](tests/performance/TROUBLESHOOTING.md)*
