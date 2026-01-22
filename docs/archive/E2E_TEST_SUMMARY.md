# E2E Testing - Quick Start

## The Simple Way (Recommended)

### Step 1: Start the dev server
```bash
npm run dev
```

### Step 2: In another terminal, run tests
```bash
# Wait for server, then run critical tests
npm run test:e2e:wait && npm run test:e2e:critical
```

That's it! ✅

---

## Alternative: Auto-Start Server

If you want Playwright to start the server automatically (slower but hands-off):

```bash
npm run test:e2e:critical:auto
```

**Note:** This will take 3-4 minutes to start the dev server before tests run.

---

## Available Commands

### Critical Flow Tests
```bash
# Critical tests (server must be running)
npm run test:e2e:critical

# Critical tests (auto-start server)
npm run test:e2e:critical:auto

# Individual flows
npm run test:e2e:auth
npm run test:e2e:tarot
npm run test:e2e:saju
npm run test:e2e:compatibility
```

### All Browser Tests
```bash
# All E2E tests
npm run test:e2e:browser

# With UI mode
npm run test:e2e:browser:ui

# Debug mode
npm run test:e2e:browser:debug
```

### Utilities
```bash
# Check if server is ready
npm run test:e2e:wait

# Show last test report
npx playwright show-report
```

---

## Troubleshooting

### "Timed out waiting for server"

**Solution:** Don't use auto-start. Instead:

```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for "Ready" message, then):
npm run test:e2e:wait && npm run test:e2e:critical
```

### Port 3000 already in use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart
npm run dev
```

### Tests still failing

Use production build (much faster):
```bash
npm run build
npm run start

# In another terminal
npm run test:e2e:wait && npm run test:e2e:critical
```

---

## Quick Reference

**Recommended workflow:**
1. `npm run dev` (Terminal 1)
2. Wait for "Ready" message
3. `npm run test:e2e:wait && npm run test:e2e:critical` (Terminal 2)

**For full guide:** See [docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md)
