# GitHub Actions Workflows

This directory contains all CI/CD workflows for the Saju Astro Chat application.

## Workflows Overview

### Core Workflows

#### 1. [ci.yml](./ci.yml) - Main CI Pipeline
**Triggers:** Push to `main`, PRs to `main`

Complete CI pipeline with:
- Environment validation
- Linting & type checking
- Unit, integration, and E2E tests
- Backend Python tests
- Production build verification

**When it runs:** Every push and PR
**Duration:** ~10-15 minutes

---

#### 2. [pr-checks.yml](./pr-checks.yml) - Enhanced PR Checks
**Triggers:** PR opened, updated, or reopened

Comprehensive PR validation:
- Conventional commit format checking
- Large file detection
- Console.log detection
- Targeted linting of changed files
- Parallel test execution (unit, integration, e2e)
- Security scanning
- Build verification
- Automated coverage reports with PR comments

**Features:**
- Cancels outdated runs
- Skips draft PRs
- Posts summary comment
- Updates coverage report

**When it runs:** On every PR update
**Duration:** ~12-18 minutes

---

#### 3. [quality.yml](./quality.yml) - Code Quality
**Triggers:** Push and PRs to `main` and `develop`

Multi-version quality checks:
- Matrix testing (Node.js 18.x, 20.x)
- Coverage reporting
- Codecov integration
- Automated PR coverage comments

**When it runs:** Push and PRs
**Duration:** ~8-12 minutes per version

---

#### 4. [security.yml](./security.yml) - Security Scanning
**Triggers:** Push to `main`, PRs, Weekly schedule

Security validation:
- Dependency audit (npm audit)
- Secret scanning (Gitleaks)
- SAST (Static analysis)
- Environment variable validation
- Hardcoded secret detection

**When it runs:**
- Every push/PR
- Weekly on Sundays at midnight
**Duration:** ~5-8 minutes

---

### Testing Workflows

#### 5. [e2e-browser.yml](./e2e-browser.yml) - Browser E2E Tests
**Triggers:** PRs, Push to `main`, Manual dispatch

Playwright browser testing:
- Desktop Chrome tests
- Mobile Chrome tests
- Parallel execution
- Artifact upload (reports, videos, screenshots)

**When it runs:** PRs and main branch pushes
**Duration:** ~15-25 minutes

---

### Deployment Workflows

#### 6. [deploy-production.yml](./deploy-production.yml) - Production Deployment
**Triggers:** Push to `main`, Version tags (`v*.*.*`), Manual dispatch

Full deployment pipeline:
- Pre-deployment validation
- Production build
- Vercel deployment
- Database migrations
- Health checks
- Smoke tests
- GitHub release creation
- Deployment notifications

**Features:**
- Skip deployment with `[skip-deploy]` in commit message
- Automatic version detection
- Post-deployment validation
- Rollback on failure

**When it runs:** Main branch merges or version tags
**Duration:** ~20-30 minutes

---

#### 7. [deploy-preview.yml](./deploy-preview.yml) - Preview Deployments
**Triggers:** PR opened, updated, reopened

Preview environment deployment:
- Automatic preview URL generation
- PR comment with links
- Smoke tests on preview
- Cleanup on PR close

**Features:**
- Unique URL per PR
- Auto-cleanup on PR close
- Mobile view links
- Deployment status updates

**When it runs:** Every PR update
**Duration:** ~8-12 minutes

---

#### 8. [deploy-backend.yml](./deploy-backend.yml) - Backend AI Deployment
**Triggers:** Push to `main` (backend_ai changes), Manual dispatch

Backend AI service deployment:
- Python unit tests
- Docker image build (GHCR)
- Railway deployment
- Health checks
- Deployment notifications

**Features:**
- Only triggers on backend_ai changes
- Multi-stage Docker build with caching
- GitHub Container Registry (GHCR) integration
- Environment-specific deployments (staging/production)

**When it runs:** Backend changes to main branch
**Duration:** ~10-15 minutes

---

## Workflow Dependencies

```
PR Created
    │
    ├─→ pr-checks.yml (Quick validation)
    ├─→ quality.yml (Multi-version testing)
    ├─→ security.yml (Security scans)
    ├─→ e2e-browser.yml (Browser tests)
    └─→ deploy-preview.yml (Preview environment)

PR Merged to main
    │
    ├─→ ci.yml (Full CI)
    ├─→ quality.yml (Quality checks)
    ├─→ security.yml (Security validation)
    └─→ deploy-production.yml (Production deploy)
```

---

## Required GitHub Secrets

Add these secrets in: `Settings → Secrets and variables → Actions`

### Essential Secrets

```bash
# Authentication
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXTAUTH_COOKIE_DOMAIN

# Database
DATABASE_URL
PRODUCTION_DATABASE_URL  # For migrations

# Deployment
VERCEL_TOKEN            # Vercel deployment
PRODUCTION_URL          # Production health checks

# API Keys
OPENAI_API_KEY
ADMIN_API_TOKEN
CRON_SECRET
PUBLIC_API_TOKEN
PUBLIC_METRICS_TOKEN
NEXT_PUBLIC_API_TOKEN
NEXT_PUBLIC_PUBLIC_METRICS_TOKEN
TOKEN_ENCRYPTION_KEY

# Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY

# Email
EMAIL_PROVIDER
RESEND_API_KEY
SENDGRID_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS

# Optional
SLACK_WEBHOOK           # For notifications
CODECOV_TOKEN          # Coverage reporting
```

---

## Usage Examples

### Testing a Feature Branch

1. Create a branch from `main`
2. Make changes and commit
3. Push to GitHub
4. All workflows automatically run
5. Preview deployment creates unique URL
6. Review PR comments for coverage and status

### Deploying to Production

**Option 1: Automatic (Recommended)**
```bash
git checkout main
git pull
git merge feature-branch
git push origin main
# Deployment starts automatically
```

**Option 2: Version Tag**
```bash
git tag v1.2.3
git push origin v1.2.3
# Creates release and deploys
```

**Option 3: Manual Dispatch**
1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Select environment
4. Click "Run"

### Skipping Deployment

Add `[skip-deploy]` to commit message:
```bash
git commit -m "docs: update README [skip-deploy]"
```

---

## Monitoring Workflows

### View Status
- **All workflows:** `https://github.com/{owner}/{repo}/actions`
- **Specific run:** Click on workflow in PR checks
- **Logs:** Click on job name in workflow run

### PR Status Checks
Each PR shows:
- ✅ All checks passed
- ⏳ Checks running
- ❌ Checks failed

Click "Details" to see logs.

### Deployment Status
- Check Actions tab for deployment progress
- Preview URLs posted in PR comments
- Production deployments create GitHub releases

---

## Troubleshooting

### Workflow Not Running

**Check:**
1. Workflow file syntax (YAML)
2. Trigger conditions match
3. Branch protection rules
4. GitHub Actions enabled for repo

**Fix:**
```bash
# Validate YAML locally
npm install -g yaml-lint
yamllint .github/workflows/*.yml
```

### Secret Not Available

**Symptoms:**
- "secret not found" errors
- Authentication failures

**Fix:**
1. Verify secret exists in repo settings
2. Check secret name spelling
3. Ensure secret is available to workflow

### Build Failures

**Quick fixes:**
```bash
# Run locally first
npm run check:all

# Check specific failure
npm run lint
npm run typecheck
npm test
npm run build
```

### Rate Limits

GitHub Actions has limits:
- **Free:** 2,000 minutes/month
- **Pro:** 3,000 minutes/month

**Optimize:**
- Use caching (already configured)
- Run fewer matrix combinations
- Skip unnecessary workflows

---

## Best Practices

### 1. Test Locally First
```bash
npm run check:all
```

### 2. Use Conventional Commits
```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update docs"
```

Formats: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

### 3. Keep PRs Small
- Easier to review
- Faster CI runs
- Easier to debug failures

### 4. Review PR Comments
- Check coverage reports
- Review automated feedback
- Address warnings

### 5. Don't Skip Checks
- All checks exist for a reason
- Fix issues instead of bypassing
- Security checks are critical

---

## Workflow Performance

### Current Benchmarks

| Workflow | Average Time | Parallel Jobs |
|----------|-------------|---------------|
| ci.yml | 10-15 min | 1 |
| pr-checks.yml | 12-18 min | 5 |
| quality.yml | 8-12 min | 2 |
| security.yml | 5-8 min | 4 |
| e2e-browser.yml | 15-25 min | 2 |
| deploy-preview.yml | 8-12 min | 1 |
| deploy-production.yml | 20-30 min | Sequential |

### Optimization Tips

1. **Caching** ✅ Already configured
   - npm dependencies
   - pip packages

2. **Parallel Jobs** ✅ Implemented
   - Test matrix runs in parallel
   - Independent workflows run concurrently

3. **Conditional Execution** ✅ Active
   - Skip draft PRs
   - Cancel outdated runs
   - Smart triggers

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review security scan results
- Check for outdated dependencies

**Monthly:**
- Review workflow performance
- Update action versions
- Audit secret usage

**Quarterly:**
- Review and optimize workflows
- Update Node.js versions
- Review coverage trends

### Updating Actions

Keep actions up to date:
```yaml
# Check for updates
actions/checkout@v4       → actions/checkout@v5
actions/setup-node@v4     → actions/setup-node@v5
```

Use Dependabot for automatic updates:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Project CI/CD Documentation](../docs/CI_CD_PIPELINE.md)

---

## Support

Issues with workflows?
1. Check workflow logs
2. Review this documentation
3. Check GitHub Actions status
4. Open issue with workflow run link
