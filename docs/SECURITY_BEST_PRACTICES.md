# Security Best Practices

> Comprehensive security guide for DestinyPal project

**Last Updated:** 2026-01-29
**Status:** Active

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Git Hygiene](#git-hygiene)
3. [Logging & Monitoring](#logging--monitoring)
4. [OAuth & Authentication](#oauth--authentication)
5. [Database Security](#database-security)
6. [API Security](#api-security)
7. [Client-Side Security](#client-side-security)
8. [Testing Security](#testing-security)
9. [Incident Response](#incident-response)
10. [Security Checklist](#security-checklist)

---

## Environment Variables

### ✅ DO

**1. Use Type-Safe Environment Access**

```typescript
// Server-side (API routes, Server Components)
import { serverEnv } from '@/lib/env'
const apiKey = serverEnv.OPENAI_API_KEY // ✅ Type-safe, validated

// Client-side (all components)
import { clientEnv } from '@/lib/env'
const baseUrl = clientEnv.NEXT_PUBLIC_BASE_URL // ✅ Type-safe, validated
```

**2. Always Use NEXT*PUBLIC* Prefix for Client Variables**

```typescript
// Client-accessible variable
NEXT_PUBLIC_BASE_URL=https://destinypal.com  // ✅ Correct

// Server-only variable (no prefix)
OPENAI_API_KEY=sk-...  // ✅ Never exposed to client
```

**3. Store All Secrets in Secure Locations**

- **Local Development**: `.env.local` (never committed)
- **CI/CD**: GitHub Secrets
- **Production**: Vercel Environment Variables / AWS Secrets Manager

**4. Validate Environment Variables**

```bash
# Before every deployment
npm run check:env

# CI/CD automatically runs this
node scripts/verify-token-encryption.js
```

**5. Use Strong, Random Secrets**

```bash
# Generate secure secrets
openssl rand -base64 32  # For keys
openssl rand -hex 32     # For tokens
npx web-push generate-vapid-keys  # For VAPID
```

### ❌ DON'T

**1. Never Commit .env Files**

```bash
# ❌ WRONG
git add .env
git commit -m "Add env"

# ✅ CORRECT
# .env files are in .gitignore
# Use .env.example for documentation only
```

**2. Never Hardcode API Keys**

```typescript
// ❌ WRONG
const apiKey = 'sk-1234567890abcdef'

// ✅ CORRECT
import { serverEnv } from '@/lib/env'
const apiKey = serverEnv.OPENAI_API_KEY
```

**3. Never Use Server-Only Env Vars in Client Components**

```typescript
// ❌ WRONG (in client component)
'use client'
const apiKey = process.env.OPENAI_API_KEY // Exposed in bundle!

// ✅ CORRECT (call server-side API)
;('use client')
async function getData() {
  const res = await fetch('/api/ai') // Server API handles secrets
  return res.json()
}
```

**4. Never Log Secrets**

```typescript
// ❌ WRONG
console.log('API Key:', process.env.OPENAI_API_KEY)
logger.info('Connecting with', { password: dbPassword })

// ✅ CORRECT
logger.info('API connection established')
logger.debug('Database connected', { host: dbHost }) // No password
```

---

## Git Hygiene

### Before Every Commit

**1. Review Your Changes**

```bash
git status
git diff  # Review all changes
```

**2. Run Pre-Commit Checks**

```bash
# These run automatically via Husky
npm run lint
npm run typecheck
npm run check:all  # lint + typecheck + tests
```

**3. Pre-Commit Hook (automatic)**
The `.husky/pre-commit` hook automatically:

- ✅ Runs lint-staged (linting + formatting)
- ✅ Scans for secrets with gitleaks
- ✅ Checks for console.log statements

### If You Accidentally Commit Secrets

**⚠️ CRITICAL: Do NOT just delete the file and commit again!**

The secret is still in git history and must be:

1. **Rotate the Secret Immediately**
   - Generate new API key/token
   - Update all environments
   - Revoke old secret

2. **Contact Security Team**
   - Email: security@destinypal.com (example)
   - Provide: what, where, when discovered

3. **Git History Rewrite (if needed)**

   ```bash
   # Run analysis first
   bash .security-cleanup/analyze-git-history.sh

   # If secrets found, coordinate team-wide git history rewrite
   bash .security-cleanup/rewrite-history.sh
   ```

### Git Commands - Safe vs Dangerous

**✅ Safe Commands (always allowed)**

```bash
git status
git log
git diff
git branch
git checkout <branch>
git pull
git fetch
git commit -m "message"
git push
```

**⚠️ Use with Caution (require review)**

```bash
git reset --soft HEAD~1  # Undo last commit, keep changes
git commit --amend       # Modify last commit (only if not pushed)
git rebase main          # Rewrite history (coordinate with team)
```

**❌ Dangerous Commands (require explicit approval)**

```bash
git reset --hard         # Loses uncommitted changes
git push --force         # Overwrites remote history
git clean -f             # Deletes untracked files
git checkout .           # Discards all local changes
git restore .            # Same as above
```

---

## Logging & Monitoring

### Use Logger, Not Console

**✅ Correct Logging**

```typescript
import { logger } from '@/lib/logger'

// Info: General application flow
logger.info('User logged in', { userId: user.id })

// Warn: Recoverable issues
logger.warn('API rate limit approaching', { usage: 90 })

// Error: Errors that need attention
logger.error('Payment failed', {
  error: sanitizeError(error),
  userId: user.id,
  amount: payment.amount,
})

// Debug: Development details (not in production)
logger.debug('Query executed', { query, duration: endTime - startTime })
```

**❌ Wrong: Using Console**

```typescript
console.log(user) // ❌ May leak PII, not structured
console.error(error) // ❌ May leak secrets in error messages
console.debug('test') // ❌ Not sent to monitoring
```

### Error Sanitization

**Always sanitize errors before logging:**

```typescript
import { errorSanitizer } from '@/lib/logger/errorSanitizer'

try {
  await stripeAPI.charge({ token: secret })
} catch (error) {
  logger.error('Stripe error', {
    error: errorSanitizer.sanitize(error), // ✅ Removes secrets
    userId: user.id,
  })
}
```

### Monitoring with Sentry

**1. Sentry is automatically configured for:**

- All `logger.error()` calls
- Unhandled exceptions
- Unhandled promise rejections

**2. Add Context to Errors**

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.withScope((scope) => {
  scope.setTag('feature', 'payment')
  scope.setUser({ id: user.id, email: user.email })
  scope.setContext('payment', {
    amount: 100,
    currency: 'USD',
  })

  logger.error('Payment processing failed', { error })
})
```

**3. Test Sentry**

```bash
ts-node scripts/test-sentry.ts
```

---

## OAuth & Authentication

### Token Encryption

**All OAuth tokens are encrypted at rest using AES-256-GCM.**

**1. Encryption Key Requirements**

```bash
# Generate 32-byte encryption key
openssl rand -base64 32

# Add to .env
TOKEN_ENCRYPTION_KEY=<generated_key>

# Verify
node scripts/verify-token-encryption.js
```

**2. How Tokens Are Encrypted**

```typescript
// Automatic via authOptions.ts
import { encryptToken, decryptToken } from '@/lib/security/tokenCrypto'

// When OAuth provider returns tokens
const encryptedAccessToken = encryptToken(accessToken)
await prisma.account.update({
  data: { access_token: encryptedAccessToken },
})

// When using tokens
const decryptedToken = decryptToken(account.access_token)
```

**3. Clearing Old Tokens After Rotation**

```bash
# After rotating TOKEN_ENCRYPTION_KEY
CONFIRM_CLEAR_OAUTH=1 node scripts/cleanup/clear-oauth-tokens.js
```

### Session Security

**1. Secure Cookies**

```typescript
// nextauth configuration
cookies: {
  sessionToken: {
    name: '__Secure-next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
}
```

**2. Session Timeout**

- Default: 30 days
- Refresh on activity: Yes
- Force logout on suspicious activity: Yes

---

## Database Security

### Connection Pooling

**Always use pooled connections in serverless:**

```typescript
// ✅ CORRECT: Pooled connection (port 6543)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1

// ❌ WRONG: Direct connection in serverless (exhausts connections)
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Query Safety

**1. Use Prisma (parameterized queries)**

```typescript
// ✅ SAFE: Prisma automatically parameterizes
const user = await prisma.user.findUnique({
  where: { email: userInput }, // Safe from SQL injection
})

// ❌ UNSAFE: Raw SQL without parameterization
const user = await prisma.$queryRaw`
  SELECT * FROM User WHERE email = ${userInput}
` // SQL injection risk!

// ✅ SAFE: Raw SQL with parameters
const user = await prisma.$queryRaw`
  SELECT * FROM User WHERE email = ${Prisma.sql([userInput])}
`
```

**2. Input Validation with Zod**

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

// Validate before database query
const validated = userSchema.parse(userInput)
await prisma.user.create({ data: validated })
```

### Sensitive Data

**1. Never Store Plaintext Passwords**

```typescript
import bcrypt from 'bcryptjs'

// ✅ Hash passwords
const hashedPassword = await bcrypt.hash(password, 10)
await prisma.user.create({
  data: { email, password: hashedPassword },
})

// ✅ Verify passwords
const isValid = await bcrypt.compare(inputPassword, user.password)
```

**2. Encrypt PII at Application Level**

```typescript
// For highly sensitive data (SSN, credit cards)
import { encrypt, decrypt } from '@/lib/security/encryption'

const encryptedSSN = encrypt(ssn)
await prisma.user.update({
  data: { ssn_encrypted: encryptedSSN },
})
```

---

## API Security

### Input Validation

**Every API endpoint must validate input with Zod:**

```typescript
// src/app/api/users/route.ts
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(150).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validated = createUserSchema.parse(body)

    // Proceed with validated data
    const user = await createUser(validated)

    return Response.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }

    logger.error('User creation failed', { error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Authentication & Authorization

**1. Protect API Routes**

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

export async function GET(request: Request) {
  // Require authentication
  const session = await getServerSession(authOptions)

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check authorization (optional)
  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed...
}
```

**2. API Token Validation**

```typescript
// For public APIs with token
const token = request.headers.get('Authorization')?.replace('Bearer ', '')

if (token !== process.env.PUBLIC_API_TOKEN) {
  return Response.json({ error: 'Invalid token' }, { status: 401 })
}
```

### Rate Limiting

**Configured via middleware.ts:**

```typescript
// Automatic rate limiting with Redis
// - IP-based: 100 requests/minute
// - User-based: 1000 requests/hour
// - API-specific: Custom limits per endpoint
```

**Test rate limiting:**

```bash
# Trigger rate limit
for i in {1..110}; do
  curl https://destinypal.com/api/test
done

# Expected: 429 Too Many Requests after 100
```

### CSRF Protection

**Automatic via middleware:**

- Origin header validation
- Referer header validation
- SameSite cookies

**For mutations, use POST/PUT/DELETE (not GET):**

```typescript
// ✅ CORRECT: POST for mutations
export async function POST(request: Request) { ... }

// ❌ WRONG: GET for mutations (CSRF vulnerable)
export async function GET(request: Request) {
  await deleteUser(...);  // Vulnerable!
}
```

---

## Client-Side Security

### Content Security Policy (CSP)

**Configured in next.config.js:**

```javascript
headers: [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires
      "style-src 'self' 'unsafe-inline'", // Styled-components
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com",
    ].join('; '),
  },
]
```

### XSS Prevention

**1. React Auto-Escaping (automatic)**

```tsx
// ✅ SAFE: React auto-escapes
<div>{userInput}</div>

// ❌ UNSAFE: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE: Use DOMPurify if HTML is needed
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

**2. Sanitize User Input**

```typescript
import DOMPurify from 'isomorphic-dompurify'

// For rich text (HTML)
const cleanHTML = DOMPurify.sanitize(userHTML)

// For plain text (strip all HTML)
const plainText = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] })
```

### Client Storage

**1. Never Store Secrets in localStorage/sessionStorage**

```typescript
// ❌ WRONG
localStorage.setItem('apiKey', 'sk-...')

// ✅ CORRECT: Keep secrets server-side
// Use httpOnly cookies for sensitive tokens (automatic via NextAuth)
```

**2. Encrypt Sensitive Client Data**

```typescript
// If must store sensitive data client-side
import { encrypt, decrypt } from '@/lib/security/clientEncryption'

const encrypted = encrypt(sensitiveData)
localStorage.setItem('data', encrypted)

const decrypted = decrypt(localStorage.getItem('data'))
```

---

## Testing Security

### Never Use Real Secrets in Tests

**1. Use Mock Credentials**

```typescript
// vitest.setup.ts
process.env.OPENAI_API_KEY = 'sk-test-mock-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb'
```

**2. Mock External Services**

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/openai', () => ({
  callOpenAI: vi.fn().mockResolvedValue({ response: 'mocked' }),
}))
```

**3. Use Separate Test Environment**

```bash
# .env.test (never committed)
DATABASE_URL=postgresql://localhost/test_db
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-test-...
```

### Security Testing

**1. Secret Scanning (automatic)**

```bash
# Pre-commit hook runs gitleaks
gitleaks protect --staged --verbose

# CI/CD runs gitleaks on all files
gitleaks detect --verbose
```

**2. Dependency Audit**

```bash
# Check for vulnerabilities
npm audit --audit-level=high

# Fix automatically (if possible)
npm audit fix
```

**3. OWASP ZAP Baseline Scan**

```bash
npm run security:owasp
```

---

## Incident Response

### If You Discover a Security Vulnerability

**1. DO NOT create a public GitHub issue**

**2. Report Privately:**

- **Email**: security@destinypal.com (example)
- **Include**:
  - Description of the vulnerability
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if any)

**3. Response Timeline:**

- **Acknowledgment**: Within 24 hours
- **Assessment**: Within 48 hours
- **Fix**: Within 7 days (critical), 30 days (high)
- **Disclosure**: Coordinated with reporter

### If a Secret is Compromised

**Immediate Actions (within 1 hour):**

1. **Rotate the Secret**

   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Update all environments
   # - Local: .env.local
   # - CI/CD: GitHub Secrets
   # - Production: Vercel Dashboard
   ```

2. **Revoke Old Secret**
   - OpenAI: https://platform.openai.com/api-keys
   - Stripe: https://dashboard.stripe.com/apikeys
   - OAuth: Provider dashboards

3. **Check for Unauthorized Usage**
   - Review API logs
   - Check billing/usage dashboards
   - Look for suspicious activity

4. **Notify Team**
   - Use `.security-cleanup/team-notification.md` template
   - Coordinate secret rotation across all environments

5. **Git History Cleanup (if committed)**
   ```bash
   bash .security-cleanup/analyze-git-history.sh
   bash .security-cleanup/rewrite-history.sh  # If needed
   ```

---

## Security Checklist

### For Every Pull Request

- [ ] No secrets committed (gitleaks passed)
- [ ] No console.log statements (ESLint passed)
- [ ] Input validation added for new API endpoints
- [ ] Authentication/authorization checked
- [ ] Error handling doesn't leak sensitive info
- [ ] Tests added for security-critical code
- [ ] Secrets are in environment variables, not hardcoded

### Before Production Deployment

- [ ] All environment variables set (npm run check:env)
- [ ] TOKEN_ENCRYPTION_KEY configured (32+ bytes)
- [ ] DATABASE_URL uses connection pooling
- [ ] Rate limiting configured (Redis)
- [ ] CSP headers configured
- [ ] Sentry DSN configured
- [ ] Security headers verified (X-Frame-Options, etc.)
- [ ] HTTPS enforced
- [ ] All tests passing (including E2E)
- [ ] No high/critical npm audit vulnerabilities

### Monthly Security Review

- [ ] Rotate secrets (every 90 days recommended)
- [ ] Review Sentry errors for security issues
- [ ] Check for dependency vulnerabilities (npm audit)
- [ ] Review access logs for suspicious activity
- [ ] Update security documentation
- [ ] Verify backup and disaster recovery procedures

---

## Resources

- **Next.js Security**: https://nextjs.org/docs/app/building-your-application/authentication
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Prisma Security**: https://www.prisma.io/docs/guides/security
- **NextAuth.js**: https://next-auth.js.org/configuration/options

---

**Questions or Concerns?**

- Internal Wiki: (link to internal wiki)
- Security Team: security@destinypal.com (example)
- Emergency: (emergency contact)

---

**Document Version**: 1.0
**Last Reviewed**: 2026-01-29
**Next Review**: 2026-04-29
