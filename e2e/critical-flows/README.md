# Critical User Flow E2E Tests

This directory contains comprehensive end-to-end (E2E) tests for critical user journeys in the Saju Astro Chat application using Playwright.

## Test Coverage

### 01. Registration & Authentication (`01-registration-auth.spec.ts`)
- User registration flow with validation
- Login/logout functionality
- Session management
- CSRF protection
- OAuth provider integration
- Protected route access control
- Password strength validation
- Email format validation

### 02. Tarot Reading Flow (`02-tarot-reading.spec.ts`)
- Complete tarot reading from question to result
- Card selection and display
- Three-card spread functionality
- Reading interpretation
- Save readings to history
- Chat-based tarot consultation
- Credit deduction for premium features
- Share tarot readings

### 03. Saju Analysis Flow (`03-saju-analysis.spec.ts`)
- Complete saju analysis with birth information
- Display four pillars (사주팔자)
- Show heavenly stems and earthly branches
- Personality analysis
- Chat consultation after analysis
- Luck period (대운) information
- Element balance (오행) display
- Relationship and career insights
- Visual chart/diagram display

### 04. Compatibility Analysis (`04-compatibility-flow.spec.ts`)
- Two-person compatibility analysis
- Compatibility score/percentage display
- Multiple compatibility aspects
- Compatibility counselor chat
- Relationship strengths and challenges
- Element compatibility
- Save compatibility analysis
- Visual compatibility charts

### 05. Credit Management (`05-credit-management.spec.ts`)
- Display credit balance
- Credit deduction for premium features
- Low credit warnings
- Zero credit handling
- Pricing page navigation
- Different pricing tiers
- Checkout process initiation
- Premium status verification
- Credit usage history
- Referral credits
- Subscription cancellation

### 06. Profile Management (`06-profile-management.spec.ts`)
- User profile display and updates
- Name and email updates
- Birth information updates
- Reading history access
- User circle/social connections
- Email format validation
- Premium status display
- Account deletion options
- Profile picture upload
- Notification preferences

### 07. Premium Subscription (`07-premium-subscription.spec.ts`)
- Pricing plans display
- Feature comparison
- Stripe checkout flow
- Webhook handling for payments
- Subscription creation/cancellation
- Monthly vs yearly billing
- Free trial information
- Refund policy display
- Billing history
- Premium upgrade CTAs
- Webhook signature validation

### 08. Destiny Features (`08-destiny-features.spec.ts`)
- Destiny map analysis and visualization
- Destiny map counselor chat
- Destiny matrix reports
- Life prediction analysis
- I-Ching consultation and hexagram display
- Destiny calendar with daily fortune
- Numerology and life path calculation
- Dream interpretation
- Destiny match feature
- Personality quiz and results

## Test Utilities

### Test Helpers (`fixtures/test-helpers.ts`)
Provides utility functions for:
- User registration and login
- Filling birth information forms
- Waiting for API responses
- Checking premium status
- Getting credit balance
- Session management
- Error handling
- Screenshots
- Loading state management

## Running the Tests

### Prerequisites
```bash
npm install
```

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
npx playwright test e2e/critical-flows/01-registration-auth.spec.ts
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Tests with Specific Browser
```bash
# Chromium
npx playwright test --project=chromium

# Mobile Chrome
npx playwright test --project=mobile-chrome
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Generate Test Report
```bash
npx playwright show-report
```

## Test Configuration

Tests are configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- **Timeout**: 60 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Parallel**: Fully parallel execution
- **Browsers**: Desktop Chrome and Mobile Chrome (Pixel 5)
- **Screenshots**: Captured on failure
- **Videos**: Retained on failure
- **Trace**: Captured on first retry

## Environment Variables

```bash
# Set custom base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Enable CI mode
CI=true
```

## Test Best Practices

1. **Isolation**: Each test runs independently with clean state
2. **Resilience**: Tests handle missing elements gracefully
3. **Timeouts**: Appropriate timeouts for async operations
4. **Assertions**: Clear, meaningful assertions
5. **Error Handling**: Graceful degradation for optional features
6. **Coverage**: Tests cover happy paths and error cases

## Debugging Failed Tests

1. **Run in Debug Mode**:
   ```bash
   npx playwright test --debug e2e/critical-flows/02-tarot-reading.spec.ts
   ```

2. **View Screenshots**: Check `playwright-report/` for screenshots of failures

3. **View Trace**: Use Playwright Inspector to step through test execution
   ```bash
   npx playwright show-trace trace.zip
   ```

4. **Check Test Output**: Review console logs in test output

## Continuous Integration

These tests are designed to run in CI environments:
- Automatic retries on failure (2 retries in CI)
- Single worker in CI to avoid race conditions
- HTML and list reporters for visibility
- Screenshots and videos for debugging

## Adding New Tests

When adding new E2E tests:

1. Create a new spec file in `e2e/critical-flows/`
2. Import `TestHelpers` from fixtures
3. Use `beforeEach` to initialize helpers
4. Write descriptive test names
5. Handle optional UI elements gracefully
6. Add appropriate timeouts
7. Use TypeScript for type safety
8. Document the test purpose in this README

## Common Issues

### Test Timeout
- Increase timeout in test or config
- Check if dev server is running
- Verify network connectivity

### Element Not Found
- Check if feature is behind authentication
- Verify element selectors
- Add appropriate wait conditions

### Flaky Tests
- Add explicit waits for dynamic content
- Use `waitForLoadingComplete()` helper
- Avoid hard-coded timeouts, use element visibility

## Support

For issues or questions about E2E tests:
1. Check test output and screenshots
2. Review Playwright documentation: https://playwright.dev
3. Consult the main project README
4. File an issue in the project repository
