# CI/CD Setup Checklist

Use this checklist to ensure your CI/CD pipeline is fully configured and operational.

## Phase 1: Initial Setup

### GitHub Actions Configuration

- [ ] **Enable GitHub Actions**
  - Go to: Settings → Actions → General
  - Select: "Allow all actions and reusable workflows"

- [ ] **Review workflow files**
  - [ ] [workflows/ci.yml](workflows/ci.yml)
  - [ ] [workflows/pr-checks.yml](workflows/pr-checks.yml)
  - [ ] [workflows/quality.yml](workflows/quality.yml)
  - [ ] [workflows/security.yml](workflows/security.yml)
  - [ ] [workflows/e2e-browser.yml](workflows/e2e-browser.yml)
  - [ ] [workflows/deploy-production.yml](workflows/deploy-production.yml)
  - [ ] [workflows/deploy-preview.yml](workflows/deploy-preview.yml)

## Phase 2: Secrets Configuration

### Required Secrets (Critical)

Go to: Settings → Secrets and variables → Actions → New repository secret

#### Authentication & Security
- [ ] `NEXTAUTH_SECRET` - 32-character random string
- [ ] `NEXTAUTH_URL` - Your domain URL
- [ ] `NEXTAUTH_COOKIE_DOMAIN` - Cookie domain
- [ ] `TOKEN_ENCRYPTION_KEY` - 32-byte encryption key

#### Database
- [ ] `DATABASE_URL` - Database connection string
- [ ] `PRODUCTION_DATABASE_URL` - Production DB (for migrations)

#### API Tokens
- [ ] `ADMIN_API_TOKEN` - Admin API token
- [ ] `CRON_SECRET` - Cron job secret
- [ ] `PUBLIC_API_TOKEN` - Public API token
- [ ] `PUBLIC_METRICS_TOKEN` - Metrics token
- [ ] `NEXT_PUBLIC_API_TOKEN` - Public API token (frontend)
- [ ] `NEXT_PUBLIC_PUBLIC_METRICS_TOKEN` - Public metrics (frontend)

#### AI Services
- [ ] `OPENAI_API_KEY` - OpenAI API key

### Deployment Secrets (Required for Production)

- [ ] `VERCEL_TOKEN` - Vercel deployment token
- [ ] `PRODUCTION_URL` - Production URL for health checks

### Optional Secrets

#### Code Coverage
- [ ] `CODECOV_TOKEN` - Codecov upload token

#### Notifications
- [ ] `SLACK_WEBHOOK` - Slack notifications (optional)
- [ ] `DISCORD_WEBHOOK` - Discord notifications (optional)

#### Email Services
- [ ] `EMAIL_PROVIDER` - Email provider name
- [ ] `RESEND_API_KEY` - Resend API key
- [ ] `SENDGRID_API_KEY` - SendGrid API key
- [ ] `SMTP_HOST` - SMTP server host
- [ ] `SMTP_PORT` - SMTP server port
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASS` - SMTP password

#### Push Notifications
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPID public key
- [ ] `VAPID_PRIVATE_KEY` - VAPID private key

## Phase 3: Branch Protection

### Configure Main Branch Protection

Go to: Settings → Branches → Add rule

- [ ] **Branch name pattern:** `main`

#### Branch Protection Rules
- [ ] **Require a pull request before merging**
  - [ ] Require approvals: 1 (adjust as needed)
  - [ ] Dismiss stale pull request approvals when new commits are pushed

- [ ] **Require status checks to pass before merging**
  - [ ] Require branches to be up to date before merging
  - [ ] Add required status checks:
    - [ ] `Quick Validation`
    - [ ] `Tests (unit)`
    - [ ] `Tests (integration)`
    - [ ] `Tests (e2e-api)`
    - [ ] `Build Verification`
    - [ ] `Security Scan`

- [ ] **Require conversation resolution before merging**

- [ ] **Do not allow bypassing the above settings** (optional)

## Phase 4: Environments

### Create Environments

Go to: Settings → Environments

#### Production Environment
- [ ] Create environment named: `production`
- [ ] **Protection rules:**
  - [ ] Required reviewers (optional, recommended)
  - [ ] Wait timer (optional)
- [ ] **Environment secrets:** (if different from repository secrets)
  - [ ] Add production-specific secrets

#### Preview Environment (Optional)
- [ ] Create environment named: `preview`
- [ ] Configure as needed for preview deployments

## Phase 5: External Services

### Vercel Setup (for Deployments)

- [ ] **Create Vercel account** (if not exists)
- [ ] **Link repository to Vercel**
- [ ] **Generate Vercel token**
  - Go to: Vercel → Account Settings → Tokens
  - Create token named: "GitHub Actions"
  - Copy token to GitHub Secrets as `VERCEL_TOKEN`
- [ ] **Configure environment variables in Vercel**
  - Add all required environment variables
  - Set production and preview environments

### Codecov Setup (Optional)

- [ ] **Create Codecov account** (if not exists)
- [ ] **Add repository to Codecov**
- [ ] **Copy upload token**
  - Add to GitHub Secrets as `CODECOV_TOKEN`

## Phase 6: Testing & Verification

### Local Testing

- [ ] **Run all checks locally**
  ```bash
  npm run check:all
  ```

- [ ] **Verify individual checks pass**
  - [ ] `npm run lint` - No errors
  - [ ] `npm run typecheck` - No type errors
  - [ ] `npm test` - All tests pass
  - [ ] `npm run build` - Build succeeds

- [ ] **Test E2E suites**
  - [ ] `npm run test:e2e:api` - API tests pass
  - [ ] `npm run test:e2e:browser` - Browser tests pass (if ready)

### CI Testing

- [ ] **Create test branch**
  ```bash
  git checkout -b test/ci-verification
  echo "# CI Test" >> README.md
  git add README.md
  git commit -m "test: verify CI pipeline"
  git push origin test/ci-verification
  ```

- [ ] **Create test Pull Request**
  - Open PR from test branch to main

- [ ] **Verify workflows run**
  - [ ] PR Checks workflow starts
  - [ ] Quality workflow starts
  - [ ] Security workflow starts
  - [ ] E2E Browser workflow starts (if enabled)
  - [ ] Preview deployment starts (if configured)

- [ ] **Check workflow results**
  - [ ] All workflows complete successfully
  - [ ] Status checks appear on PR
  - [ ] No failed jobs

- [ ] **Verify automated comments**
  - [ ] Coverage report posted
  - [ ] Preview URL posted (if configured)

- [ ] **Test preview deployment** (if configured)
  - [ ] Click preview URL in PR comment
  - [ ] Verify site loads correctly
  - [ ] Test basic functionality

### Deployment Testing

- [ ] **Test production deployment** (optional, staging first recommended)
  - [ ] Merge test PR to main
  - [ ] Verify deployment workflow runs
  - [ ] Check deployment completes successfully
  - [ ] Verify health checks pass
  - [ ] Test production URL

## Phase 7: Documentation

### Update Project Documentation

- [ ] **Add CI/CD section to README.md**
  - [ ] Copy from [docs/README_CICD_SECTION.md](../docs/README_CICD_SECTION.md)
  - [ ] Replace placeholders with actual values
  - [ ] Add status badges

- [ ] **Review CI/CD documentation**
  - [ ] [CI/CD Pipeline Overview](../docs/CI_CD_PIPELINE.md)
  - [ ] [GitHub Actions Setup](../docs/GITHUB_ACTIONS_SETUP.md)
  - [ ] [Quick Reference](../docs/CI_CD_QUICK_REFERENCE.md)
  - [ ] [Workflows README](./workflows/README.md)

- [ ] **Share documentation with team**
  - [ ] Post links in team chat
  - [ ] Schedule walkthrough meeting (optional)
  - [ ] Create internal wiki page (optional)

## Phase 8: Team Onboarding

### Team Setup

- [ ] **Share setup completion**
  - [ ] Announce CI/CD is live
  - [ ] Share documentation links
  - [ ] Provide support channel

- [ ] **Training materials**
  - [ ] Quick Reference guide available
  - [ ] Example PR to review
  - [ ] Troubleshooting guide accessible

- [ ] **Set expectations**
  - [ ] All PRs must pass CI checks
  - [ ] Coverage threshold: 60%
  - [ ] Conventional commit format required
  - [ ] Security scans must be clean

## Phase 9: Monitoring & Maintenance

### Regular Monitoring

- [ ] **Weekly checks**
  - [ ] Review failed workflow runs
  - [ ] Check security scan results
  - [ ] Monitor coverage trends

- [ ] **Monthly reviews**
  - [ ] Review workflow performance
  - [ ] Update action versions
  - [ ] Audit secret usage
  - [ ] Check for outdated dependencies

- [ ] **Quarterly tasks**
  - [ ] Review and optimize workflows
  - [ ] Update Node.js versions in matrix
  - [ ] Review coverage trends
  - [ ] Gather team feedback

### Optimization

- [ ] **Performance monitoring**
  - [ ] Track average workflow duration
  - [ ] Identify bottlenecks
  - [ ] Implement caching improvements

- [ ] **Cost optimization** (if applicable)
  - [ ] Review GitHub Actions minutes usage
  - [ ] Optimize workflow triggers
  - [ ] Consider self-hosted runners (if needed)

## Phase 10: Advanced Features (Optional)

### Enhanced Workflows

- [ ] **Add Dependabot**
  - Create `.github/dependabot.yml`
  - Configure automated dependency updates

- [ ] **Add workflow notifications**
  - Configure Slack/Discord webhooks
  - Set up email notifications

- [ ] **Implement deployment strategies**
  - Blue-green deployments
  - Canary releases
  - Rollback procedures

### Monitoring & Observability

- [ ] **Set up monitoring**
  - Application performance monitoring
  - Error tracking (Sentry, etc.)
  - Uptime monitoring

- [ ] **Configure alerts**
  - Deployment failures
  - Test failures
  - Security vulnerabilities

## Completion Checklist

### Ready for Production

All critical items completed:
- [ ] ✅ GitHub Actions enabled
- [ ] ✅ All required secrets added
- [ ] ✅ Branch protection configured
- [ ] ✅ Test PR successful
- [ ] ✅ All workflows passing
- [ ] ✅ Documentation updated
- [ ] ✅ Team notified

### Verification

- [ ] ✅ Created and merged at least one test PR
- [ ] ✅ All CI checks passed on test PR
- [ ] ✅ Preview deployment worked (if configured)
- [ ] ✅ Production deployment successful (if tested)
- [ ] ✅ Team understands new workflow
- [ ] ✅ Support process in place

---

## Status: [ ] Not Started | [ ] In Progress | [ ] Complete

**Started:** __________
**Completed:** __________
**Completed By:** __________

---

## Notes

Use this space for any setup notes, issues encountered, or customizations made:

```
[Your notes here]
```

---

## Support

Need help with setup?

1. Review [GitHub Actions Setup Guide](../docs/GITHUB_ACTIONS_SETUP.md)
2. Check [Troubleshooting section](../docs/GITHUB_ACTIONS_SETUP.md#troubleshooting)
3. Ask in team chat or open an issue

---

**Last Updated:** 2026-01-13
**Version:** 1.0.0
