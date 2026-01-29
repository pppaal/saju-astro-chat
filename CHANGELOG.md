# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cache versioning system for automatic invalidation ([#PR](link))
- Bundle size CI checks (main <500KB, total <3MB)
- API smoke tests for compatibility, tarot, and saju endpoints (8 tests)
- Comprehensive architecture documentation
- Integration tests for compatibility backend module

### Changed
- Unified rate limiting system (Redis-based, deprecated in-memory)
- Extended environment variable validation (8 additional keys)
- Updated ARCHITECTURE.md with latest system improvements
- Improved README.md with recent changes section

### Fixed
- TypeScript type errors in AdvisorChat and ResultsPhase components
- Prisma client generation for StripeEventLog model
- Missing export in CompatibilityTabs component
- npm security vulnerabilities (16 HIGH → 3 moderate, 81% reduction)

### Security
- Fixed 16 HIGH npm vulnerabilities (Next.js, lodash, tar, diff)
- Added Zod validation for critical environment variables
- Implemented Redis-based distributed rate limiting
- Enhanced token encryption validation in CI/CD

## [2026-01-29] - Major Improvements

### Week 1: Security & Foundation
- **Security**: Reduced npm vulnerabilities by 81%
- **Environment Validation**: Extended Zod schema for API keys
- **TypeScript**: Achieved 0 type errors
- **Tests**: Verified 49/49 credit system tests passing

### Week 2: Performance & Integration
- **Backend Integration**: Completed compatibility_logic.py module
  - Created module structure with __init__.py
  - 5/5 integration tests passing
- **Rate Limiting**: Unified to single Redis-based system
- **CI/CD**: Added bundle size enforcement checks

### Week 3: Testing & Documentation
- **Cache Versioning**: Implemented automatic cache invalidation
  - Created cache-versions.ts configuration
  - Updated CacheKeys with version prefixes (v1, v2)
  - Documented in CACHE_VERSIONING.md
- **API Testing**: Added smoke tests for major endpoints
  - compatibility.smoke.test.ts: 3 tests
  - tarot.smoke.test.ts: 2 tests
  - saju.smoke.test.ts: 3 tests
- **Documentation**: 
  - Rewrote ARCHITECTURE.md (427 lines)
  - Updated README.md with improvements section
  - Added cache versioning guide

### Week 4: Type Safety & Quality
- **TypeScript**: Fixed all type errors
  - Regenerated Prisma client
  - Added explicit types to dynamic imports
  - Fixed missing component exports
- **Code Quality**: Improved type safety across codebase

## Performance Metrics

### Bundle Size
- Main bundle: Monitored via CI (<500KB)
- Total JS: Monitored via CI (<3MB)
- Automatic build failure on threshold breach

### Security
- npm audit: 3 moderate vulnerabilities (down from 16 HIGH)
- TypeScript: 0 type errors
- Environment validation: 100% coverage of critical keys

### Testing
- Unit/Integration: 657+ test files
- E2E: 25 Playwright specs
- Smoke tests: 8 new endpoint tests
- Backend: 5 integration tests for compatibility module

### Cache Performance
- Versioned keys prevent stale data
- TTL: 1-7 days depending on data type
- Auto-invalidation on logic changes

## Breaking Changes

### v2.0.0 (Unreleased)
- Deprecated `src/lib/security/rateLimit.ts` in favor of `src/lib/cache/redis-rate-limit.ts`
- Cache keys now include version prefix (e.g., `saju:v1:...`)
  - Existing cache entries will be ignored on version bump
  - Old entries expire naturally via TTL

## Migration Guide

### Migrating to Versioned Cache

**Before:**
```typescript
const key = `saju:${birthDate}:${birthTime}:${gender}`
```

**After:**
```typescript
import { CacheKeys } from '@/lib/cache/redis-cache'
const key = CacheKeys.saju(birthDate, birthTime, gender)
// Result: "saju:v1:1990-01-01:10:00:M"
```

### Migrating Rate Limiting

**Before:**
```typescript
import { rateLimit } from '@/lib/security/rateLimit'
```

**After:**
```typescript
import { rateLimit } from '@/lib/rateLimit'
// Now uses Redis-based distributed rate limiting
```

## Contributors

- Claude Code (AI Assistant)
- Project Team

## Links

- [GitHub Repository](https://github.com/yourusername/saju-astro-chat)
- [Documentation](./docs/)
- [Issue Tracker](https://github.com/yourusername/saju-astro-chat/issues)

---

**Legend:**
- 🆕 Added
- 🔄 Changed
- 🐛 Fixed
- 🔒 Security
- ⚡ Performance
- 📝 Documentation
