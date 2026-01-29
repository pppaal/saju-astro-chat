# E2E Testing Guide

Comprehensive guide for running and debugging end-to-end tests with Playwright.

## Quick Start

### Run All E2E Tests

```bash
# All browser tests
npm run test:e2e:browser

# Critical flows only (optimized)
npm run test:e2e:critical

# With UI mode (interactive)
npm run test:e2e:browser:ui
```

### Run Specific Test Files

```bash
# Authentication tests
npm run test:e2e:auth

# Tarot reading flow
npm run test:e2e:tarot

# Saju analysis flow
npm run test:e2e:saju

# Compatibility testing
npm run test:e2e:compatibility
```

---

## Configuration Files

### Standard Configuration

**File:** [playwright.config.ts](../playwright.config.ts)

- Used for: All E2E tests
- Settings:
  - Timeout: 60 seconds
  - Retries: 2 in CI, 0 locally
  - Workers: 1 in CI, multiple locally
  - Projects: Desktop Chrome, Mobile Chrome

### Critical Flows Configuration

**File:** [playwright.critical.config.ts](../playwright.critical.config.ts)

- Used for: Critical business flows
- Settings:
  - Timeout: 90 seconds (longer for complex flows)
  - Retries: 2 in CI, 1 locally
  - Workers: 1 (sequential execution)
  - Projects: Desktop Chrome only
  - Optimized for stability

**Usage:**
```bash
npm run test:e2e:critical
# or
npx playwright test --config=playwright.critical.config.ts
```

---

## Troubleshooting

### 1. Server Timeout Issues

**Problem:** "Timed out waiting 120000ms from config.webServer"

**Cause:** Next.js dev server takes too long to start

**Solutions:**

#### Solution A: Use the Wait Script
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Wait for server, then run tests
npm run test:e2e:wait && npm run test:e2e:critical
```

#### Solution B: Increase Timeout
Already implemented in configs (180 seconds). If still failing:

```typescript
// In playwright.config.ts
webServer: {
  timeout: 240 * 1000, // 4 minutes
}
```

#### Solution C: Use Production Build
```bash
# Build first
npm run build

# Start production server
npm run start

# In another terminal, run tests
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:critical
```

#### Solution D: Skip Server Startup
If server is already running:

```bash
# Set reuseExistingServer to true
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm run test:e2e:critical
```

### 2. Port Already in Use

**Problem:** "Port 3000 is already in use"

**Solutions:**

```bash
# Find and kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use a different port
PLAYWRIGHT_BASE_URL=http://localhost:3001 PORT=3001 npm run dev
```

### 3. Tests Failing Intermittently

**Problem:** Flaky tests that pass sometimes and fail other times

**Solutions:**

#### Increase Timeouts
```typescript
// In test file
test.setTimeout(120000); // 2 minutes

// Or per action
await page.waitForSelector('.element', { timeout: 30000 });
```

#### Add Explicit Waits
```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => document.readyState === 'complete');

// Wait for element to be stable
await page.locator('.button').waitFor({ state: 'visible' });
await page.waitForTimeout(500); // Last resort
```

#### Disable Parallelization
```typescript
// In playwright.config.ts
fullyParallel: false,
workers: 1,
```

### 4. Authentication Issues

**Problem:** Tests fail because user is not authenticated

**Solutions:**

#### Use Test User
```typescript
// In test file
test.use({
  storageState: 'playwright/.auth/user.json',
});

test.beforeAll(async ({ page }) => {
  // Login once
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  // Save auth state
  await page.context().storageState({
    path: 'playwright/.auth/user.json'
  });
});
```

#### Mock Authentication
```typescript
// Bypass auth for testing
await page.route('**/api/auth/**', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ user: { id: '1', email: 'test@example.com' } }),
  });
});
```

### 5. Database Issues

**Problem:** Tests fail due to database state

**Solutions:**

#### Use Test Database
```bash
# Set test database URL
DATABASE_URL="postgresql://user:pass@localhost:5432/test_db" npm run test:e2e:critical
```

#### Reset Database Before Tests
```bash
# Create reset script
node scripts/reset-test-db.mjs && npm run test:e2e:critical
```

#### Mock Database Calls
```typescript
// Mock API responses
await page.route('**/api/**', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ /* mock data */ }),
  });
});
```

### 6. Browser Not Found

**Problem:** "Executable doesn't exist at ..."

**Solution:**
```bash
# Install Playwright browsers
npx playwright install

# Or specific browser
npx playwright install chromium

# With dependencies (Linux)
npx playwright install --with-deps chromium
```

### 7. Slow Test Execution

**Problem:** Tests take too long to run

**Solutions:**

#### Run Fewer Projects
```bash
# Only chromium
npx playwright test --project=chromium

# Skip mobile tests
npx playwright test --grep-invert "mobile"
```

#### Use Headed Mode for Debugging Only
```bash
# Headless is faster (default)
npm run test:e2e:critical

# Only use headed when debugging
npm run test:e2e:browser:headed
```

#### Optimize Test Code
```typescript
// Bad: Multiple navigation
await page.goto('/page1');
await page.goto('/page2');

// Good: Direct navigation
await page.goto('/page2');

// Bad: Unnecessary waits
await page.waitForTimeout(5000);

// Good: Wait for specific condition
await page.waitForSelector('.element');
```

### 8. Environment Variables Missing

**Problem:** Tests fail due to missing env vars

**Solution:**

```bash
# Create .env.test file
cat > .env.test << EOL
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-32-characters-long
DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
EOL

# Load and run
export $(cat .env.test | xargs) && npm run test:e2e:critical
```

### 9. CI/CD Failures

**Problem:** Tests pass locally but fail in CI

**Solutions:**

#### Simulate CI Environment
```bash
# Set CI flag
CI=true npm run test:e2e:critical

# Use CI config
npx playwright test --config=playwright.critical.config.ts --workers=1
```

#### Check CI Logs
```bash
# View Playwright HTML report
npx playwright show-report

# View test results
cat test-results/critical-results.json
```

#### Increase Resources in CI
```yaml
# In GitHub Actions workflow
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Increase timeout
```

### 10. Memory Issues

**Problem:** Tests crash with out of memory errors

**Solutions:**

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e:critical

# Run fewer tests in parallel
npx playwright test --workers=1

# Run tests sequentially
npx playwright test --config=playwright.critical.config.ts
```

---

## Best Practices

### 1. Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const input = page.locator('#input');

    // Act
    await input.fill('test value');
    await page.click('#submit');

    // Assert
    await expect(page.locator('#result')).toHaveText('Expected Result');
  });
});
```

### 2. Selectors

```typescript
// Good: Use test IDs
<button data-testid="submit-button">Submit</button>
await page.click('[data-testid="submit-button"]');

// Good: Use roles
await page.click('button:has-text("Submit")');
await page.getByRole('button', { name: 'Submit' }).click();

// Avoid: Fragile selectors
await page.click('.btn.btn-primary.submit'); // Bad
```

### 3. Waiting Strategies

```typescript
// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a[href="/next"]'),
]);

// Wait for API response
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/data')),
  page.click('#load-data'),
]);

// Wait for condition
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 0;
});
```

### 4. Error Handling

```typescript
test('should handle errors', async ({ page }) => {
  try {
    await page.goto('/');
    await expect(page.locator('#content')).toBeVisible();
  } catch (error) {
    // Take screenshot on failure
    await page.screenshot({ path: 'screenshots/error.png' });
    throw error;
  }
});
```

### 5. Test Data Management

```typescript
// Use factories
function createTestUser() {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
  };
}

test('registration', async ({ page }) => {
  const user = createTestUser();
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', user.password);
});
```

---

## Performance Optimization

### 1. Parallel Execution

```typescript
// Enable parallel tests (in config)
fullyParallel: true,
workers: process.env.CI ? 1 : undefined,
```

### 2. Reuse Browser Context

```typescript
test.describe.configure({ mode: 'parallel' });

test('test 1', async ({ page }) => { /* ... */ });
test('test 2', async ({ page }) => { /* ... */ });
```

### 3. Skip Unnecessary Tests

```bash
# Run only tests matching pattern
npx playwright test --grep "critical"

# Skip specific tests
npx playwright test --grep-invert "slow"
```

### 4. Use Fast Assertions

```typescript
// Fast
await expect(page.locator('#result')).toHaveText('text');

// Slower
const text = await page.locator('#result').textContent();
expect(text).toBe('text');
```

---

## Debugging

### 1. UI Mode

```bash
# Interactive debugging
npm run test:e2e:browser:ui
```

### 2. Debug Specific Test

```bash
# Debug mode
npm run test:e2e:browser:debug

# Or specific file
npx playwright test e2e/critical-flows/01-registration-auth.spec.ts --debug
```

### 3. Pause Test

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Pauses execution
  // ... rest of test
});
```

### 4. Console Logging

```typescript
// Log page console
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// Log network requests
page.on('request', request => {
  console.log('REQUEST:', request.url());
});

// Log responses
page.on('response', response => {
  console.log('RESPONSE:', response.url(), response.status());
});
```

### 5. Screenshots and Videos

```typescript
// Take screenshot
await page.screenshot({ path: 'screenshot.png', fullPage: true });

// Record video (in config)
use: {
  video: 'retain-on-failure',
}
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e:critical
  env:
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

### Local CI Simulation

```bash
# Simulate CI environment
CI=true \
  PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npm run test:e2e:critical
```

---

## Test Maintenance

### 1. Regular Updates

```bash
# Update Playwright
npm install -D @playwright/test@latest

# Update browsers
npx playwright install
```

### 2. Review Flaky Tests

```bash
# Run test multiple times
npx playwright test --repeat-each=10

# Generate report
npx playwright show-report
```

### 3. Clean Up

```bash
# Remove old reports
rm -rf playwright-report test-results

# Remove old videos/screenshots
find . -name "*.webm" -delete
find . -name "test-*.png" -delete
```

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI Configuration](https://playwright.dev/docs/ci)
- [Project Configuration](../playwright.config.ts)
- [Critical Flows Config](../playwright.critical.config.ts)

---

## Quick Command Reference

```bash
# Run all tests
npm run test:e2e:browser

# Run critical flows
npm run test:e2e:critical

# Run with UI
npm run test:e2e:browser:ui

# Run specific test
npx playwright test path/to/test.spec.ts

# Debug mode
npm run test:e2e:browser:debug

# Check server
npm run test:e2e:wait

# Install browsers
npx playwright install

# Show last report
npx playwright show-report

# Generate tests (codegen)
npx playwright codegen http://localhost:3000
```

---

**Last Updated:** 2026-01-13
**Version:** 1.0.0
