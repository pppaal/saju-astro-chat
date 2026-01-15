# Quick Start - Testing & CI/CD

**Last Updated**: 2026-01-13

## TL;DR - Common Commands

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests (requires DB)
npm run test:integration

# Run E2E tests (RECOMMENDED)
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm run test:e2e:wait && npm run test:e2e:critical

# Quick health check
npm run test:e2e:wait
```

---

## Current Test Status

```
✅ 8,569 tests total (99.0% passing)
✅ 245/260 test files passing
✅ ~65-75% code coverage
✅ 8 CI/CD workflows active
```

---

## Test Commands by Type

### Unit Tests (Fast - 30s)
```bash
npm test                          # Run all unit tests
npm test -- --coverage            # With coverage report
npm test -- sanitizers            # Run specific test file
npm run test:watch                # Watch mode
```

### Integration Tests (Medium - 2-3 min)
```bash
npm run test:integration          # All integration tests
npm run test:integration:watch    # Watch mode
```

### E2E Tests (Slower - 5-7 min)

**Option 1: Manual Server (FASTEST)**
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for "Ready", then run)
npm run test:e2e:wait
npm run test:e2e:critical
```

**Option 2: Auto-start Server**
```bash
npm run test:e2e:critical:auto   # Playwright starts server
```

**Option 3: Production Mode**
```bash
npm run build
npm run start
npm run test:e2e:wait && npm run test:e2e:critical
```

### Performance Tests
```bash
npm run test:performance          # Run all performance tests
```

---

## CI/CD Workflows

### Automatic Triggers

#### Every PR/Commit
- **pr-checks.yml** - Runs unit, integration, e2e-api tests
- **e2e-browser.yml** - Runs Playwright browser tests

#### Push to Main
- **deploy-production.yml** - Deploys to production

#### Weekly (Sunday 2 AM)
- **owasp-zap.yml** - Security scanning

### Manual Triggers

#### Preview Deployment
```bash
gh pr edit --add-label preview
```

#### Performance Tests
- Go to Actions → Performance Tests → Run workflow

---

## Quick Troubleshooting

### E2E Tests Timing Out

**Problem**: "Timed out waiting for server"

**Solutions**:
```bash
# 1. Use manual server approach (fastest)
npm run dev  # In one terminal
npm run test:e2e:wait  # Check if server is ready
npm run test:e2e:critical  # Run tests

# 2. Use production build (faster startup)
npm run build && npm run start

# 3. Increase timeout in playwright.config.ts
webServer: {
  timeout: 240 * 1000,  // 4 minutes
}
```

### Tests Failing Locally

**Problem**: Some tests pass in CI but fail locally

**Solutions**:
```bash
# 1. Clear cache
npm run test -- --clearCache

# 2. Update dependencies
npm install

# 3. Check environment variables
cp .env.example .env.local
```

### Coverage Not Updating

**Problem**: Coverage report shows old data

**Solutions**:
```bash
# 1. Delete coverage folder
rm -rf coverage

# 2. Run tests with coverage flag
npm test -- --coverage

# 3. Check vitest.config.ts thresholds
```

### SwissEph Errors

**Problem**: "swisseph is server-only" in tests

**Solution**: Already fixed in `tests/setup.ts`
- Mocks are automatically applied
- If still failing, check that you're importing from `@/lib/astrology/foundation/ephe`

---

## File Locations

### Test Files
```
tests/                          # Unit tests
tests/integration/              # Integration tests
e2e/                            # E2E tests
tests/setup.ts                  # Test setup & mocks
```

### Configurations
```
vitest.config.ts                # Vitest config
playwright.config.ts            # Standard Playwright
playwright.critical.config.ts   # Critical flows
playwright.ci.config.ts         # CI-specific
```

### Workflows
```
.github/workflows/pr-checks.yml           # PR validation
.github/workflows/e2e-browser.yml         # E2E tests
.github/workflows/deploy-production.yml   # Production deploy
.github/workflows/deploy-preview.yml      # Preview deploy
.github/workflows/owasp-zap.yml          # Security scan
.github/workflows/performance-tests.yml   # Performance
```

### Documentation
```
docs/CI_CD_PIPELINE.md          # Complete CI/CD guide
docs/E2E_TESTING_GUIDE.md       # E2E troubleshooting
docs/GITHUB_ACTIONS_SETUP.md    # Setup instructions
docs/PERFORMANCE_TESTING.md     # Performance guide
PROJECT_STATUS_2026_01_13.md    # Current status
```

---

## Coverage Thresholds

Current thresholds in `vitest.config.ts`:
```typescript
thresholds: {
  lines: 35,      // 35% minimum
  functions: 32,  // 32% minimum
  branches: 28,   // 28% minimum
  statements: 35, // 35% minimum
}
```

**Current actual coverage**: ~65-75%

---

## Test Writing Guide

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/myModule';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db/prisma';

describe('User CRUD', () => {
  it('should create user', async () => {
    const user = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test' }
    });
    expect(user.id).toBeDefined();
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Environment Variables

### Required for Tests
```env
# Development/Testing
NODE_ENV=test
NEXTAUTH_SECRET=test-secret-at-least-32-characters-long
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://test:test@localhost:5432/test

# Admin/Cron
ADMIN_API_TOKEN=test-admin-token
CRON_SECRET=test-cron-secret
METRICS_TOKEN=test-metrics-token

# AI Backend
NEXT_PUBLIC_AI_BACKEND=http://localhost:5000
```

### Optional for Full Testing
```env
# Stripe (for payment tests)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (for caching tests)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Email (for notification tests)
RESEND_API_KEY=re_...
```

---

## Performance Tips

### Speed Up Tests

**1. Run specific tests**
```bash
npm test -- sanitizers           # Specific file
npm test -- -t "should handle"   # Specific test name
```

**2. Use watch mode during development**
```bash
npm run test:watch
```

**3. Skip slow tests**
```bash
npm test -- --exclude=integration --exclude=e2e
```

**4. Parallel execution (already default)**
```bash
npm test  # Uses all CPU cores
```

### Speed Up E2E Tests

**1. Use production build**
```bash
npm run build && npm run start   # 10-20s startup
# vs
npm run dev                       # 60-180s startup
```

**2. Run critical flows only**
```bash
npm run test:e2e:critical         # Only critical tests
# vs
npx playwright test               # All tests
```

**3. Skip browser tests during development**
```bash
npm test                          # Just unit/integration
```

---

## Common Issues & Solutions

### Issue: Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Issue: Database connection failed
```bash
# Check if PostgreSQL is running
# Update DATABASE_URL in .env.local
# Run migrations
npx prisma migrate dev
```

### Issue: Out of memory during tests
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### Issue: Tests fail on Windows but pass on Mac/Linux
```bash
# Check line endings (CRLF vs LF)
git config core.autocrlf false
git rm --cached -r .
git reset --hard
```

---

## Getting Help

### Documentation
1. [E2E Testing Guide](docs/E2E_TESTING_GUIDE.md) - Comprehensive troubleshooting
2. [CI/CD Pipeline](docs/CI_CD_PIPELINE.md) - Workflow documentation
3. [GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md) - Setup instructions

### Logs & Debugging
```bash
# View detailed test output
npm test -- --reporter=verbose

# Debug specific test
npx vitest --inspect-brk sanitizers

# Playwright UI mode (visual debugging)
npm run test:e2e:critical:ui
```

### Support Channels
- Check documentation in `docs/`
- Review troubleshooting guides
- Create GitHub issue
- Check Playwright/Vitest docs

---

## Cheat Sheet

```bash
# === TESTING ===
npm test                        # Unit tests
npm test -- --coverage          # With coverage
npm run test:watch              # Watch mode
npm run test:integration        # Integration tests
npm run test:e2e:critical       # E2E tests

# === CI/CD ===
gh pr create                    # Create PR (triggers pr-checks)
gh pr edit --add-label preview  # Create preview deployment
git push origin main            # Deploy to production

# === DEBUGGING ===
npm test -- --reporter=verbose  # Detailed output
npm run test:e2e:critical:ui   # Visual debugging
npx playwright show-report      # View last E2E report

# === CLEANUP ===
rm -rf coverage                 # Clear coverage
npm run test -- --clearCache    # Clear test cache
rm -rf node_modules && npm install  # Fresh install

# === MONITORING ===
npm run test:e2e:wait          # Health check
npx playwright test --list     # List all E2E tests
npm test -- --run              # Run once (no watch)
```

---

**Quick Links**:
- [Full Documentation](docs/)
- [Project Status](PROJECT_STATUS_2026_01_13.md)
- [Complete Summary](TESTING_INFRASTRUCTURE_COMPLETE.md)
- [E2E Fixes](E2E_FIXES_SUMMARY.md)

**Status**: ✅ Ready to use!

---

**Last Updated**: 2026-01-13
**Version**: 1.0.0
