# Contributing to DestinyPal

Thank you for your interest in contributing to DestinyPal! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professionalism

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+
- PostgreSQL (or Supabase account)
- Redis (or Upstash account) - optional

### Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/saju-astro-chat.git
   cd saju-astro-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend_ai && pip install -r requirements.txt
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Initialize database**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-refactored` - Code refactoring
- `test/what-tested` - Test additions

### Example
```bash
git checkout -b feature/add-tarot-spread
```

## Coding Standards

### TypeScript/JavaScript

- **Type Safety**: Use TypeScript strict mode
- **Formatting**: Prettier (automatic via pre-commit hooks)
- **Linting**: ESLint rules enforced
- **Naming**:
  - Components: PascalCase (`TarotCard.tsx`)
  - Functions: camelCase (`calculateSaju()`)
  - Constants: UPPER_SNAKE_CASE (`CACHE_TTL`)

### React Components

✅ **Do:**
```typescript
// Use memo for expensive components
export const ExpensiveComponent = memo(({ data }: Props) => {
  const result = useMemo(() => heavyCalculation(data), [data])
  return <div>{result}</div>
})
```

❌ **Don't:**
```typescript
// Avoid inline object/array creation in JSX
<Component data={{ name: 'test' }} />  // Creates new object every render
```

### Performance Best Practices

1. **Memoization**
   - Use `useMemo` for expensive calculations
   - Use `useCallback` for callback functions passed to children
   - Use `React.memo` for components that render often

2. **Code Splitting**
   - Use dynamic imports for heavy components
   ```typescript
   const HeavyComponent = dynamic(() => import('./HeavyComponent'))
   ```

3. **Caching**
   - Use versioned cache keys
   ```typescript
   import { CacheKeys } from '@/lib/cache/redis-cache'
   const key = CacheKeys.saju(birthDate, birthTime, gender)
   ```

### Security

- **No Secrets in Code**: Use environment variables
- **Input Validation**: Always validate user input with Zod
- **Sanitization**: Sanitize logs (no secrets)
- **Rate Limiting**: Apply to all public endpoints

```typescript
// ✅ Good
import { rateLimit } from '@/lib/rateLimit'
await rateLimit(request, { limit: 100, window: '1h' })

// ❌ Bad - No rate limiting
export async function POST(request: Request) {
  // Direct processing without rate limit
}
```

## Testing

### Running Tests

```bash
# Unit & Integration
npm test                      # All tests
npm run test:coverage         # With coverage

# E2E
npm run test:e2e:browser      # Playwright

# Backend
npm run test:backend          # Python pytest
```

### Writing Tests

#### Unit Test Example
```typescript
// tests/lib/saju/calculator.test.ts
import { describe, it, expect } from 'vitest'
import { calculateSaju } from '@/lib/saju'

describe('calculateSaju', () => {
  it('calculates correct pillars for known date', () => {
    const result = calculateSaju('1990-01-01', '10:00')
    expect(result.dayMaster.name).toBe('甲')
  })
})
```

#### Smoke Test Example
```typescript
// tests/api/endpoint.smoke.test.ts
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/endpoint/route'

describe('API smoke test', () => {
  it('does not crash on valid request', async () => {
    const request = new Request('http://test/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    })
    
    const response = await POST(request)
    expect(response.status).toBeLessThan(600)
  })
})
```

### Test Coverage Goals

- Critical paths: 100%
- Overall: >45% lines, >78% branches

## Pull Request Process

### Before Submitting

1. **Run checks locally**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

2. **Update documentation** if needed

3. **Add tests** for new features

4. **Update CHANGELOG.md**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added
- [ ] E2E tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least 1 approval required
3. No unresolved conversations
4. Branch up to date with main

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance

### Examples

```bash
feat(tarot): add Celtic Cross spread

Implemented 10-card Celtic Cross tarot spread with AI interpretation.
Includes responsive card layout and detailed position meanings.

Closes #123
```

```bash
fix(cache): prevent stale data after logic changes

Added version prefix to cache keys (e.g., saju:v1:...).
Increment version when calculation logic changes to auto-invalidate old cache.

Related to #456
```

### Co-authored Commits

When pairing or using AI assistance:
```bash
git commit -m "feat: add feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Architecture Decisions

### When to Use

- **Server Components**: Default for static content
- **Client Components**: For interactivity (forms, animations)
- **API Routes**: For backend logic, external API calls
- **Server Actions**: For simple form submissions

### File Organization

```
src/
├── app/              # Next.js pages & API routes
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── saju/        # Domain-specific components
│   └── ...
├── lib/             # Shared utilities
│   ├── auth/        # Authentication
│   ├── cache/       # Caching logic
│   └── ...
└── types/           # TypeScript types
```

## Need Help?

- **Documentation**: Check [docs/](./docs/)
- **Issues**: Search existing issues first
- **Questions**: Open a discussion
- **Chat**: Join our Discord (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DestinyPal! 🙏
