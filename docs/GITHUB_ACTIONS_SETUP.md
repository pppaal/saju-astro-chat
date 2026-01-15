# GitHub Actions Setup Guide

This guide walks you through setting up the complete CI/CD pipeline for the Saju Astro Chat project.

## Quick Start

### Prerequisites

- GitHub repository with admin access
- Vercel account (for deployments)
- All required environment variables
- GitHub Actions enabled

### 1. Enable GitHub Actions

1. Go to repository Settings
2. Navigate to "Actions" → "General"
3. Enable "Allow all actions and reusable workflows"
4. Save changes

### 2. Add Required Secrets

Navigate to: `Settings → Secrets and variables → Actions → New repository secret`

#### Essential Secrets (Required for CI)

```yaml
# Copy these values from your .env file or create new ones

# Authentication & Security
NEXTAUTH_SECRET: "your-32-character-secret-here"
NEXTAUTH_URL: "https://your-domain.com"
NEXTAUTH_COOKIE_DOMAIN: ".your-domain.com"
TOKEN_ENCRYPTION_KEY: "32-byte-encryption-key"

# Database
DATABASE_URL: "postgresql://user:password@host:5432/dbname"
PRODUCTION_DATABASE_URL: "postgresql://user:password@host:5432/production"

# API Tokens
ADMIN_API_TOKEN: "your-admin-token"
CRON_SECRET: "your-cron-secret"
PUBLIC_API_TOKEN: "your-public-api-token"
PUBLIC_METRICS_TOKEN: "your-metrics-token"
NEXT_PUBLIC_API_TOKEN: "your-public-api-token"
NEXT_PUBLIC_PUBLIC_METRICS_TOKEN: "your-public-metrics-token"

# AI Services
OPENAI_API_KEY: "sk-..."
```

#### Deployment Secrets (Required for Production)

```yaml
# Vercel
VERCEL_TOKEN: "your-vercel-token"
PRODUCTION_URL: "https://your-production-domain.com"
```

#### Optional Secrets

```yaml
# Code Coverage
CODECOV_TOKEN: "your-codecov-token"

# Notifications
SLACK_WEBHOOK: "https://hooks.slack.com/services/..."
DISCORD_WEBHOOK: "https://discord.com/api/webhooks/..."

# Email Services
EMAIL_PROVIDER: "resend"
RESEND_API_KEY: "re_..."
SENDGRID_API_KEY: "SG..."
SMTP_HOST: "smtp.example.com"
SMTP_PORT: "587"
SMTP_USER: "user@example.com"
SMTP_PASS: "password"

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY: "your-vapid-public-key"
VAPID_PRIVATE_KEY: "your-vapid-private-key"
```

### 3. Generate Required Tokens

#### Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it "GitHub Actions"
4. Set appropriate scope
5. Copy token and add to GitHub Secrets

#### Codecov Token (Optional)

1. Go to [Codecov](https://codecov.io)
2. Add your repository
3. Copy the upload token
4. Add to GitHub Secrets as `CODECOV_TOKEN`

#### NextAuth Secret

Generate secure secret:
```bash
openssl rand -base64 32
```

### 4. Configure Branch Protection

1. Go to `Settings → Branches`
2. Add rule for `main` branch
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

#### Required Status Checks

Add these checks:
- `CI / build-and-test`
- `Quick Validation / quick-checks`
- `Tests (unit) / test-matrix`
- `Tests (integration) / test-matrix`
- `Build Verification / build-check`
- `Security Scan / security-check`

### 5. Set Up Environments

#### Create Production Environment

1. Go to `Settings → Environments`
2. Click "New environment"
3. Name: `production`
4. Add protection rules:
   - ✅ Required reviewers (optional)
   - ✅ Wait timer (optional)
5. Add environment-specific secrets if needed

#### Create Preview Environment (Optional)

Repeat for `preview` environment if needed.

---

## Verifying Setup

### Test CI Pipeline

1. Create a new branch:
   ```bash
   git checkout -b test/ci-setup
   ```

2. Make a small change:
   ```bash
   echo "# CI Test" >> README.md
   git add README.md
   git commit -m "test: verify CI pipeline"
   git push origin test/ci-setup
   ```

3. Create a Pull Request

4. Verify workflows run:
   - Check PR status checks
   - View workflow runs in Actions tab
   - Review automated comments

### Expected Results

✅ All workflows should trigger:
- PR Checks
- Code Quality Check
- Security Scan
- E2E Browser Tests (if enabled)
- Preview Deployment (if Vercel configured)

✅ PR should show status checks:
- Quick Validation
- Tests (unit, integration, e2e-api)
- Build Verification
- Security Scan
- Coverage Report

✅ Automated comments:
- Coverage report
- Preview deployment URL (if configured)

---

## Troubleshooting

### Workflow Not Running

**Problem:** Workflows don't trigger on PR

**Solutions:**
1. Check workflow file syntax:
   ```bash
   # Use yamllint or similar
   cat .github/workflows/ci.yml
   ```

2. Verify GitHub Actions is enabled:
   - Settings → Actions → General → Enable

3. Check branch name matches trigger:
   ```yaml
   on:
     pull_request:
       branches: [main]  # Must target 'main'
   ```

### Secret Not Found

**Problem:** "Error: Secret XXXXX not found"

**Solutions:**
1. Verify secret exists in Settings → Secrets
2. Check exact name spelling (case-sensitive)
3. Verify secret is available in correct scope:
   - Repository secrets: Available to all workflows
   - Environment secrets: Only available when using that environment

### Build Failures

**Problem:** "npm run build" fails in CI but works locally

**Solutions:**

1. **Environment variables missing:**
   ```bash
   # Add to workflow or use fallback
   env:
     NEXT_PUBLIC_API_URL: ${{ secrets.API_URL || 'http://localhost:3000' }}
   ```

2. **Node version mismatch:**
   ```yaml
   # Ensure version matches local
   - uses: actions/setup-node@v4
     with:
       node-version: 20  # Match your local version
   ```

3. **Dependencies issue:**
   ```bash
   # Use npm ci instead of npm install in CI
   npm ci
   ```

### Database Connection Errors

**Problem:** Tests fail with "Cannot connect to database"

**Solutions:**

1. **For unit tests:** Mock database connections
2. **For integration tests:** Use test database
3. **Set proper DATABASE_URL:**
   ```yaml
   env:
     DATABASE_URL: postgres://user:pass@localhost:5432/test_db
   ```

### Playwright Tests Fail

**Problem:** Browser tests fail in CI but work locally

**Solutions:**

1. **Missing browser dependencies:**
   ```yaml
   - name: Install Playwright Browsers
     run: npx playwright install --with-deps
   ```

2. **Timing issues:**
   ```typescript
   // Increase timeouts in CI
   test.setTimeout(process.env.CI ? 60000 : 30000);
   ```

3. **Viewport differences:**
   ```typescript
   // Ensure consistent viewport
   await page.setViewportSize({ width: 1920, height: 1080 });
   ```

### Deployment Failures

**Problem:** Deployment to Vercel fails

**Solutions:**

1. **Invalid token:**
   - Regenerate Vercel token
   - Update GitHub secret

2. **Project not linked:**
   ```bash
   # Link project locally first
   vercel link
   ```

3. **Build errors:**
   - Check Vercel build logs
   - Verify all environment variables are set in Vercel

---

## Advanced Configuration

### Custom Workflow Triggers

#### Run on Specific Paths Only

```yaml
on:
  push:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
```

#### Skip Workflows

Add to commit message:
```bash
git commit -m "docs: update readme [skip ci]"
```

### Matrix Testing

Test multiple configurations:

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
```

### Caching Strategies

Optimize build times:

```yaml
# Cache node_modules
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

# Cache build output
- name: Cache Next.js build
  uses: actions/cache@v3
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}
```

### Conditional Jobs

Run jobs based on conditions:

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
```

---

## Monitoring & Maintenance

### View Workflow Status

**Repository Overview:**
- Main page shows status badges
- Recent workflow runs displayed

**Actions Tab:**
- All workflow runs
- Filter by workflow, branch, status
- View logs and artifacts

**PR Page:**
- Status checks section
- Click "Details" for logs

### Performance Monitoring

**Check workflow duration:**
1. Go to Actions tab
2. Select workflow
3. View "Workflow runs" duration

**Optimize if needed:**
- Use caching (already configured)
- Parallelize jobs
- Skip unnecessary steps

### Updating Workflows

**Best Practices:**
1. Test changes in feature branch
2. Create PR to review changes
3. Verify workflows run successfully
4. Merge to main

**Version Updates:**
```yaml
# Keep actions up to date
actions/checkout@v4 → actions/checkout@v5
actions/setup-node@v4 → actions/setup-node@v5
```

---

## Security Best Practices

### Secret Management

✅ **DO:**
- Rotate secrets regularly
- Use environment secrets for production
- Limit secret access to required workflows
- Audit secret usage periodically

❌ **DON'T:**
- Commit secrets to repository
- Share secrets between environments unnecessarily
- Use weak or predictable secrets
- Log secret values (they're automatically masked)

### Workflow Security

✅ **DO:**
- Use specific action versions (not @main)
- Review action permissions
- Enable branch protection
- Require reviews for workflow changes

❌ **DON'T:**
- Use external actions from unknown sources
- Disable security checks
- Allow force pushes to main
- Skip code reviews

---

## Next Steps

1. ✅ Set up all required secrets
2. ✅ Enable GitHub Actions
3. ✅ Configure branch protection
4. ✅ Test with a PR
5. ✅ Configure Vercel deployment
6. ✅ Set up Codecov (optional)
7. ✅ Add status badges to README
8. ✅ Configure notifications (optional)

---

## Status Badges

Add to your README.md:

```markdown
![CI](https://github.com/{owner}/{repo}/workflows/CI/badge.svg)
![Quality](https://github.com/{owner}/{repo}/workflows/Code%20Quality%20Check/badge.svg)
![Security](https://github.com/{owner}/{repo}/workflows/Security%20Scan/badge.svg)
[![codecov](https://codecov.io/gh/{owner}/{repo}/branch/main/graph/badge.svg)](https://codecov.io/gh/{owner}/{repo})
```

Replace `{owner}` and `{repo}` with your values.

---

## Support & Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Workflow Syntax:** https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- **Vercel CLI:** https://vercel.com/docs/cli
- **Playwright CI:** https://playwright.dev/docs/ci
- **Project Docs:** [CI/CD Pipeline](./CI_CD_PIPELINE.md)

---

## Getting Help

Issues with setup?

1. Review this guide
2. Check workflow logs in Actions tab
3. Search GitHub Actions documentation
4. Open issue with:
   - Workflow run URL
   - Error message
   - Steps attempted
