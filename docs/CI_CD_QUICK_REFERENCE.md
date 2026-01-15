# CI/CD Quick Reference Guide

Quick reference for developers working with the CI/CD pipeline.

## 🚀 Before Creating a PR

### Run Local Checks

```bash
# Complete check (recommended)
npm run check:all

# Individual checks
npm run lint              # ESLint
npm run typecheck         # TypeScript
npm test                  # Unit tests
npm run test:coverage     # Coverage report
npm run build             # Production build

# E2E tests (requires dev server)
npm run test:e2e:api      # API tests
npm run test:e2e:browser  # Browser tests
```

### Fix Common Issues

```bash
# Auto-fix linting issues
npm run lint:fix

# Type errors
npm run typecheck:watch

# Update dependencies
npm audit fix

# Clear cache
rm -rf .next node_modules
npm install
```

---

## 📋 Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
style: format code with prettier
refactor: simplify payment logic
perf: optimize database queries
test: add unit tests for auth
chore: update dependencies
ci: update GitHub Actions workflow
build: configure webpack
revert: undo breaking change
```

### Examples

```bash
# Good ✅
git commit -m "feat: add password reset functionality"
git commit -m "fix: resolve memory leak in chat component"
git commit -m "docs: add API endpoint documentation"

# Bad ❌
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "wip"
```

---

## 🔄 PR Workflow

### 1. Create Branch

```bash
# Feature branch
git checkout -b feat/user-profile

# Bug fix
git checkout -b fix/login-error

# Docs
git checkout -b docs/api-guide
```

### 2. Make Changes

```bash
# Edit files
# Run tests: npm test
# Run checks: npm run check:all
```

### 3. Commit

```bash
git add .
git commit -m "feat: add user profile page"
```

### 4. Push

```bash
git push origin feat/user-profile
```

### 5. Create PR

- Go to GitHub
- Click "New Pull Request"
- Fill out PR template
- Submit for review

### 6. Review CI Results

**Automated checks that will run:**
- ✅ Quick validation (PR title, large files, console.logs)
- ✅ Lint & type checking
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E API tests
- ✅ Security scans
- ✅ Build verification
- ✅ Coverage report
- ✅ Preview deployment

**What you'll see:**
- Status checks in PR
- Coverage comment
- Preview URL comment
- Build status

---

## 🎯 CI Status Checks

### Required Checks (Must Pass)

| Check | What It Does | Fix If Fails |
|-------|-------------|--------------|
| **Quick Validation** | PR title format, file size | Fix commit message format |
| **Lint** | Code style | `npm run lint:fix` |
| **Type Check** | TypeScript errors | Fix type errors |
| **Unit Tests** | Test suite | Fix failing tests |
| **Build** | Production build | Fix build errors |
| **Security** | Vulnerabilities | `npm audit fix` |

### Workflow Status Icons

- ⏳ **Yellow dot**: Running
- ✅ **Green check**: Passed
- ❌ **Red X**: Failed
- ⏭️ **Gray dash**: Skipped

---

## 🐛 Common CI Failures

### Lint Errors

**Error:** `ESLint found issues`

**Fix:**
```bash
npm run lint:fix
git add .
git commit -m "style: fix linting issues"
git push
```

### Type Errors

**Error:** `TypeScript errors found`

**Fix:**
```bash
npm run typecheck
# Fix the errors shown
git add .
git commit -m "fix: resolve type errors"
git push
```

### Test Failures

**Error:** `Test suite failed`

**Fix:**
```bash
# Run tests locally
npm test

# Fix failing tests
# Update/add tests

git add .
git commit -m "test: fix failing tests"
git push
```

### Build Failures

**Error:** `Build failed`

**Fix:**
```bash
# Test build locally
npm run build

# Fix the issue
# Common: missing env vars, import errors

git add .
git commit -m "fix: resolve build error"
git push
```

### Coverage Below Threshold

**Error:** `Coverage is below 60%`

**Fix:**
```bash
# Check coverage
npm run test:coverage

# Add tests for uncovered code
# Focus on new code added

git add .
git commit -m "test: improve test coverage"
git push
```

### Console.log Warnings

**Warning:** `Console statements found`

**Fix:**
```bash
# Replace console.log with logger
import { logger } from '@/lib/logger';

// Before
console.log('User logged in');

// After
logger.info('User logged in');

git add .
git commit -m "chore: replace console.log with logger"
git push
```

---

## 🔒 Security Best Practices

### Never Commit

❌ **DO NOT COMMIT:**
- `.env` files
- API keys
- Passwords
- Private keys
- Access tokens
- Database credentials

### If You Accidentally Commit Secrets

```bash
# 1. Immediately rotate the secret
# 2. Remove from history (if just committed)
git reset --soft HEAD~1
git reset HEAD .env
git commit -m "fix: remove accidentally committed files"

# 3. Update .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: update gitignore"
```

### Use Environment Variables

```typescript
// Good ✅
const apiKey = process.env.API_KEY;

// Bad ❌
const apiKey = "sk-abc123...";
```

---

## 📊 Coverage Reports

### Reading Coverage

Coverage comment shows:

| Metric | Meaning |
|--------|---------|
| **Lines** | % of code lines executed |
| **Statements** | % of statements executed |
| **Functions** | % of functions called |
| **Branches** | % of if/else branches tested |

### Coverage Thresholds

- 🟢 **80%+**: Excellent
- 🟡 **60-79%**: Good (meets threshold)
- 🔴 **<60%**: Needs improvement

### Improving Coverage

```bash
# View detailed coverage
npm run test:coverage
# Opens: coverage/lcov-report/index.html

# Focus on:
1. New code you added
2. Red/yellow highlighted lines
3. Uncovered branches
```

---

## 🚢 Deployment

### Preview Deployments (Automatic)

**When:** Every PR
**URL:** Posted in PR comment
**Duration:** Until PR closed

### Production Deployment (Automatic)

**When:** Merge to `main`
**Process:**
1. All checks pass
2. Auto-deployment starts
3. Database migrations run
4. Health checks execute
5. Deployment complete

### Skip Deployment

Add to commit message:
```bash
git commit -m "docs: update readme [skip-deploy]"
```

### Manual Deployment

1. Go to Actions tab
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Select environment
5. Click "Run"

---

## 🔍 Debugging CI Failures

### View Logs

1. Go to PR
2. Click "Details" on failed check
3. Expand failed step
4. Read error message

### Common Log Locations

```
build-and-test → Install deps → Check for errors
build-and-test → Lint → See linting errors
build-and-test → Typecheck → See type errors
build-and-test → Unit tests → See test failures
build-and-test → Build → See build errors
```

### Re-run Workflows

**Method 1:** Push new commit
```bash
git commit --allow-empty -m "ci: trigger re-run"
git push
```

**Method 2:** Re-run from GitHub
1. Go to Actions tab
2. Select failed workflow
3. Click "Re-run failed jobs"

---

## 📞 Getting Help

### Self-Service

1. **Check this guide** for quick answers
2. **Review workflow logs** for specific errors
3. **Run checks locally** to reproduce
4. **Search GitHub issues** for similar problems

### Documentation

- [Full CI/CD Documentation](./CI_CD_PIPELINE.md)
- [GitHub Actions Setup](./GITHUB_ACTIONS_SETUP.md)
- [Workflow README](../.github/workflows/README.md)

### Ask for Help

If still stuck:
1. Gather info:
   - Workflow run URL
   - Error message
   - What you've tried
2. Ask in team chat
3. Open GitHub issue

---

## 💡 Tips & Tricks

### Faster Iteration

```bash
# Run only changed tests
npm test -- --changed

# Run specific test
npm test -- tests/mytest.test.ts

# Watch mode
npm run test:watch

# Type check in watch mode
npm run typecheck:watch
```

### Parallel Testing

```bash
# Run all checks in parallel (bash)
npm run lint & npm run typecheck & npm test & wait

# Run all checks in parallel (PowerShell)
Start-Job {npm run lint}; Start-Job {npm run typecheck}; Start-Job {npm test}; Get-Job | Wait-Job
```

### Skip Specific Checks (Not Recommended)

```bash
# Skip CI entirely (use sparingly!)
git commit -m "docs: update [skip ci]"

# Skip specific workflow
# Add condition to workflow file
```

### Local CI Simulation

Use [act](https://github.com/nektos/act) to run workflows locally:

```bash
# Install act
brew install act  # macOS
choco install act # Windows

# Run PR workflow
act pull_request

# Run specific job
act -j build-and-test
```

---

## 🎓 Best Practices

### ✅ DO

- Run `npm run check:all` before pushing
- Write meaningful commit messages
- Add tests for new features
- Keep PRs small and focused
- Respond to PR feedback promptly
- Review CI results before requesting review
- Fix issues in the same PR (don't create new PRs)

### ❌ DON'T

- Push without running tests locally
- Ignore CI failures
- Commit directly to `main`
- Add unnecessary dependencies
- Skip PR template
- Use `[skip ci]` without good reason
- Commit secrets or credentials
- Leave console.log statements
- Disable security checks

---

## 📈 Workflow Performance

### Average Times

- **Quick Checks:** 2-3 minutes
- **Full CI:** 10-15 minutes
- **E2E Tests:** 15-25 minutes
- **Preview Deploy:** 8-12 minutes
- **Total (PR):** 15-30 minutes

### Optimization Tips

1. **Run checks locally first** - Catch issues before CI
2. **Keep PRs small** - Faster to test and review
3. **Use specific tests** - Don't run full suite for small changes
4. **Leverage caching** - Already configured

---

## 🏆 Success Checklist

Before merging:

- [ ] All CI checks pass ✅
- [ ] Coverage meets threshold (60%+)
- [ ] No security warnings
- [ ] Preview deployment works
- [ ] PR reviewed and approved
- [ ] PR title follows conventional commits
- [ ] All conversations resolved
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)

---

## 🔖 Quick Commands Reference

```bash
# Pre-PR checks
npm run check:all                 # All checks
npm run lint                      # Linting
npm run lint:fix                  # Fix lint issues
npm run typecheck                 # Type checking
npm test                          # Run tests
npm run test:coverage             # Coverage report
npm run build                     # Production build

# Specific test suites
npm run test:integration          # Integration tests
npm run test:e2e:api             # E2E API tests
npm run test:e2e:browser         # Browser tests
npm run test:backend             # Python backend tests

# Development
npm run dev                       # Start dev server
npm run test:watch               # Test watch mode
npm run typecheck:watch          # Type check watch mode

# Utilities
npm audit                         # Check vulnerabilities
npm audit fix                     # Fix vulnerabilities
npm outdated                      # Check outdated packages
```

---

**Last Updated:** 2026-01-13

For detailed information, see [Full CI/CD Documentation](./CI_CD_PIPELINE.md)
