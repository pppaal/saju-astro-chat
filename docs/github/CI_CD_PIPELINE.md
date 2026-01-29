# CI/CD Pipeline Documentation

## Overview

This project has a comprehensive CI/CD pipeline using GitHub Actions that automates testing, quality checks, security scanning, and deployment processes.

## Workflows

### 1. CI Workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml))

**Triggers:** Push to `main` branch and Pull Requests to `main`

**Purpose:** Main continuous integration pipeline ensuring code quality and functionality

**Jobs:**
- **Build and Test**
  - Environment setup (Node.js 20, Python 3.10)
  - Dependency installation
  - Environment validation
  - Code linting (ESLint)
  - Type checking (TypeScript)
  - Unit & Integration tests with coverage
  - Backend AI tests (Python)
  - Production build verification
  - E2E API tests

**Duration:** ~10-15 minutes

### 2. Quality Workflow ([.github/workflows/quality.yml](.github/workflows/quality.yml))

**Triggers:** Push and Pull Requests to `main` and `develop` branches

**Purpose:** Code quality metrics and multi-version testing

**Jobs:**

#### Quality Check
- **Matrix Testing:** Node.js 18.x and 20.x
- Lint checks
- Type checking
- Test execution with coverage
- Coverage upload to Codecov
- Automated PR comments with coverage reports

#### Build Verification
- Production build validation
- Runs after quality checks pass

**Features:**
- Coverage threshold: 60%
- Automated PR comments with detailed metrics
- Multi-version Node.js compatibility testing

### 3. Security Workflow ([.github/workflows/security.yml](.github/workflows/security.yml))

**Triggers:**
- Push to `main`
- Pull Requests to `main`
- Weekly schedule (Sundays at midnight)

**Purpose:** Security vulnerability detection and prevention

**Jobs:**

#### Dependency Audit
- npm audit for dependency vulnerabilities
- Fails on critical vulnerabilities
- Reports high and critical issues

#### Secret Scanning
- Gitleaks integration for leaked secrets
- Scans entire git history
- Prevents credential exposure

#### SAST (Static Application Security Testing)
- ESLint security rule enforcement
- Code pattern analysis

#### Environment Check
- Detects hardcoded secrets in source code
- Validates .env files are gitignored
- Pattern matching for common secret formats:
  - OpenAI API keys
  - AWS credentials
  - GitHub tokens
  - Private keys

**Security Patterns Detected:**
- `sk-[a-zA-Z0-9]{20,}` (OpenAI keys)
- `AKIA[A-Z0-9]{16}` (AWS keys)
- `ghp_[a-zA-Z0-9]{36}` (GitHub Personal Access Tokens)
- `gho_[a-zA-Z0-9]{36}` (GitHub OAuth tokens)
- Private key patterns

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Pull Request Created                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │         Parallel Execution Start          │
        └───────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   CI Check   │   │   Quality    │   │   Security   │
│              │   │   (18.x,     │   │   Scanning   │
│ - Lint       │   │    20.x)     │   │              │
│ - Typecheck  │   │              │   │ - Audit      │
│ - Tests      │   │ - Lint       │   │ - Secrets    │
│ - Build      │   │ - Typecheck  │   │ - SAST       │
│ - E2E API    │   │ - Tests      │   │ - Env Check  │
│              │   │ - Coverage   │   │              │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   All Checks Pass?    │
              └───────────┬───────────┘
                          │
                  ┌───────┴────────┐
                  │                │
                  ▼                ▼
              ┌─────┐          ┌─────┐
              │ ✅  │          │ ❌  │
              │ PR  │          │Block│
              │Ready│          │ PR  │
              └─────┘          └─────┘
```

---

## Test Coverage

### Current Test Suites

| Test Type | Command | Description |
|-----------|---------|-------------|
| Unit Tests | `npm test` | Vitest unit tests |
| Integration | `npm run test:integration` | Integration tests with DB |
| E2E API | `npm run test:e2e:api` | API endpoint tests |
| E2E Browser | `npm run test:e2e:browser` | Playwright browser tests |
| Backend AI | `npm run test:backend` | Python backend tests |
| Coverage | `npm run test:coverage` | Test coverage report |

### Test Locations

```
tests/
├── *.test.ts                    # Unit tests
├── e2e/                         # API E2E tests
├── integration/                 # Integration tests
├── lib/                         # Library-specific tests
│   ├── Tarot/                   # Tarot system tests
│   ├── compatibility/           # Compatibility tests
│   └── destiny-map/             # Destiny map tests
└── setup.ts                     # Test configuration

e2e/                             # Browser E2E tests
└── *.spec.ts                    # Playwright tests

backend_ai/tests/                # Python backend tests
```

---

## Environment Variables for CI

### Required Secrets (GitHub Repository Settings)

```yaml
# Authentication
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXTAUTH_COOKIE_DOMAIN

# Database
DATABASE_URL

# API Tokens
ADMIN_API_TOKEN
CRON_SECRET
PUBLIC_API_TOKEN
PUBLIC_METRICS_TOKEN
NEXT_PUBLIC_API_TOKEN
NEXT_PUBLIC_PUBLIC_METRICS_TOKEN
TOKEN_ENCRYPTION_KEY

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY

# Email Services
EMAIL_PROVIDER
RESEND_API_KEY
SENDGRID_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS

# AI Services
OPENAI_API_KEY

# Base URLs
NEXT_PUBLIC_BASE_URL
```

### CI Fallback Values

The CI workflow provides safe placeholder values for non-critical secrets to allow builds to proceed. Critical secrets like `DATABASE_URL` should be set in GitHub Secrets.

---

## Local Development Testing

### Run All Checks Locally (Before PR)

```bash
# Complete quality check
npm run check:all

# Individual checks
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build

# E2E tests (requires running dev server)
npm run test:e2e:api
npm run test:e2e:browser

# Backend tests
npm run test:backend
```

---

## PR Workflow Best Practices

### Before Creating a PR

1. **Run local checks:**
   ```bash
   npm run check:all
   ```

2. **Ensure tests pass:**
   ```bash
   npm run test:coverage
   ```

3. **Verify build succeeds:**
   ```bash
   npm run build
   ```

4. **Check for security issues:**
   ```bash
   npm audit
   ```

### During PR Review

- CI status checks must pass before merge
- Review coverage report in PR comments
- Address any security warnings
- Ensure no linting or type errors

### After PR Merge

- CI runs on `main` branch
- Security scans execute
- Weekly security audits continue monitoring

---

## Monitoring & Notifications

### GitHub Actions Status

View workflow runs at:
```
https://github.com/{owner}/{repo}/actions
```

### Coverage Reports

- Codecov integration for coverage tracking
- Automated PR comments with metrics
- Coverage files in `./coverage/`

### Security Alerts

- GitHub Security tab for vulnerabilities
- Gitleaks reports for secret detection
- Weekly audit summary emails

---

## Extending the Pipeline

### Adding New Tests

1. Add test files in appropriate directory:
   ```
   tests/           # Unit/integration
   e2e/             # Browser E2E
   backend_ai/tests/ # Backend tests
   ```

2. Tests are automatically picked up by existing workflows

### Adding New Scripts

Update [package.json](package.json) scripts section:

```json
{
  "scripts": {
    "test:your-feature": "vitest run tests/your-feature"
  }
}
```

### Adding New Checks to CI

Edit [.github/workflows/ci.yml](.github/workflows/ci.yml):

```yaml
- name: Your Custom Check
  run: npm run your-custom-script
```

---

## Performance Optimization

### Cache Strategy

**Node Modules:**
```yaml
uses: actions/setup-node@v4
with:
  cache: npm
```

**Python Dependencies:**
```yaml
uses: actions/setup-python@v5
with:
  cache: pip
```

### Parallel Execution

- Multiple workflows run in parallel
- Matrix testing for multi-version support
- Jobs within workflows can run concurrently

### Resource Management

- CI: Single job, sequential steps
- Quality: Matrix strategy (2 Node versions)
- Security: Multiple parallel jobs
- Typical total runtime: 15-20 minutes

---

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check build locally
npm run build

# Verify dependencies
npm ci
```

**Test Failures:**
```bash
# Run specific test suite
npm test -- path/to/test.ts

# Run with verbose output
npm test -- --reporter=verbose
```

**Type Errors:**
```bash
# Check types with watch mode
npm run typecheck:watch
```

**Environment Issues:**
```bash
# Validate environment
npm run check:env
```

### GitHub Actions Debugging

1. Check workflow logs in Actions tab
2. Review failed step output
3. Look for error messages in annotations
4. Re-run failed jobs if transient

### Local CI Simulation

Use [act](https://github.com/nektos/act) to run GitHub Actions locally:

```bash
# Install act
# macOS: brew install act
# Linux: See act documentation

# Run CI workflow locally
act pull_request
```

---

## Security Best Practices

### Secret Management

- **Never commit secrets** to repository
- Use GitHub Secrets for sensitive values
- Validate .env files are gitignored
- Rotate secrets regularly

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Audit for vulnerabilities
npm audit
npm audit fix
```

### Regular Maintenance

- Weekly automated security scans
- Review Dependabot alerts
- Monitor Codecov trends
- Update GitHub Actions versions

---

## Metrics & Goals

### Current Standards

- **Code Coverage:** ≥60%
- **Build Time:** ~10-15 minutes
- **Test Success Rate:** Target 100%
- **Security Vulnerabilities:** 0 critical

### Quality Indicators

- ✅ All CI checks pass
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Security scans clean
- ✅ Coverage meets threshold
- ✅ Build succeeds

---

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## Support & Contributions

For issues with CI/CD pipeline:

1. Check workflow logs
2. Review this documentation
3. Run checks locally first
4. Open issue with workflow run link

For contributions:
- Ensure all checks pass locally
- Update documentation if adding features
- Add tests for new functionality
