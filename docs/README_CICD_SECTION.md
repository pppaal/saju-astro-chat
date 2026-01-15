# CI/CD Section for README.md

Add this section to your main [README.md](../README.md):

---

## 🔄 CI/CD Pipeline

This project uses GitHub Actions for automated testing and deployment.

### Status Badges

![CI](https://github.com/{owner}/{repo}/workflows/CI/badge.svg)
![Quality](https://github.com/{owner}/{repo}/workflows/Code%20Quality%20Check/badge.svg)
![Security](https://github.com/{owner}/{repo}/workflows/Security%20Scan/badge.svg)
[![codecov](https://codecov.io/gh/{owner}/{repo}/branch/main/graph/badge.svg)](https://codecov.io/gh/{owner}/{repo})

> **Note:** Replace `{owner}` and `{repo}` with your GitHub username and repository name.

### Automated Workflows

#### On Every PR
- ✅ Code linting and formatting
- ✅ TypeScript type checking
- ✅ Unit, integration, and E2E tests
- ✅ Security vulnerability scanning
- ✅ Code coverage reporting (60% threshold)
- ✅ Preview deployment with unique URL

#### On Merge to Main
- ✅ Full CI pipeline
- ✅ Production build and deployment
- ✅ Database migrations
- ✅ Health checks and smoke tests
- ✅ Automatic GitHub releases (for version tags)

### Quick Commands

```bash
# Run all checks (before PR)
npm run check:all

# Individual checks
npm run lint              # Linting
npm run typecheck         # Type checking
npm test                  # Run tests
npm run test:coverage     # Test coverage
npm run build             # Production build

# E2E tests
npm run test:e2e:api      # API tests
npm run test:e2e:browser  # Browser tests
```

### Documentation

- 📖 [CI/CD Pipeline Overview](docs/CI_CD_PIPELINE.md) - Comprehensive guide
- 🚀 [GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md) - Initial setup
- ⚡ [Quick Reference](docs/CI_CD_QUICK_REFERENCE.md) - Developer guide
- 📋 [Workflows README](.github/workflows/README.md) - Workflow details

### Deployment

**Preview Deployments:**
- Automatically created for every PR
- Unique URL posted in PR comments
- Cleaned up when PR is closed

**Production Deployment:**
- Triggered on merge to `main` or version tags
- Automatic database migrations
- Health checks and validation
- Zero-downtime deployments

### Contributing

Before creating a PR:

1. Run local checks: `npm run check:all`
2. Ensure all tests pass
3. Follow [Conventional Commits](https://www.conventionalcommits.org/) format
4. Review the [Quick Reference](docs/CI_CD_QUICK_REFERENCE.md)

All PRs require:
- ✅ All CI checks passing
- ✅ Code review approval
- ✅ Coverage threshold met (60%)
- ✅ No security vulnerabilities

---

## Alternative: Compact Version

If you prefer a more compact section, use this instead:

---

## 🔄 CI/CD

Automated testing and deployment with GitHub Actions.

**Status:** ![CI](https://github.com/{owner}/{repo}/workflows/CI/badge.svg) ![Quality](https://github.com/{owner}/{repo}/workflows/Code%20Quality%20Check/badge.svg) ![Security](https://github.com/{owner}/{repo}/workflows/Security%20Scan/badge.svg)

**Quick Start:**
```bash
npm run check:all  # Run all checks before PR
```

**Documentation:**
- [CI/CD Pipeline Guide](docs/CI_CD_PIPELINE.md)
- [Quick Reference](docs/CI_CD_QUICK_REFERENCE.md)
- [Setup Instructions](docs/GITHUB_ACTIONS_SETUP.md)

---

## Suggested Placement

Add this section to your README.md after the "Installation" or "Getting Started" section and before "Contributing" or "Development" sections.

Example structure:
```markdown
# Your Project Name

## Features
...

## Installation
...

## 🔄 CI/CD Pipeline  <-- Add here
...

## Development
...

## Contributing
...
```
