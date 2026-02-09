import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const apiRoot = path.join(repoRoot, 'src', 'app', 'api')
const docsDir = path.join(repoRoot, 'docs')
const reportPath = path.join(docsDir, 'API_AUDIT_REPORT.md')

const routeExts = new Set(['.ts', '.tsx', '.js', '.mjs'])
const ignoredRoutes = new Set()

function normalizePath(value) {
  return value.split(path.sep).join('/')
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walk(full, onFile)
    } else {
      onFile(full)
    }
  }
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function percent(part, total) {
  if (!total) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function findMethods(text) {
  const methods = new Set()
  const pattern = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g
  let match
  while ((match = pattern.exec(text))) {
    methods.add(match[1])
  }
  return [...methods]
}

const patterns = {
  withApiMiddleware: /\bwithApiMiddleware\b/,
  middlewareImport: /from ['"]@\/lib\/api\/middleware['"]|from ['"].*\/lib\/api\/middleware['"]/,
  guard: /\bcreate[A-Za-z]+Guard\b/,
  validation:
    /\b(parseAndValidate|validateAndParse|parseQueryParams|validateQueryParams|validateRequestBody|validateReportRequest)\b|\bsafeParse\b|from ['"]zod['"]|from ['"]@\/lib\/api\/validator['"]|from ['"]@\/lib\/api\/zodValidation['"]|\bcreateStreamRoute\b|\bErrorCodes\.VALIDATION_ERROR\b/,
  rateLimit: /\brateLimit\s*[:(]/,
  credits: /\bcredits\s*:/,
  requireCredits: /\brequireCredits\b/,
  requireAuth: /\brequireAuth\b/,
  requireToken: /\brequireToken\b/,
  requirePublicToken: /\brequirePublicToken\b/,
  skipCsrf: /\bskipCsrf\s*:\s*true\b/,
  createAuthenticatedGuard: /\bcreateAuthenticatedGuard\b/,
  createAdminGuard: /\bcreateAdminGuard\b/,
  createAiGenerationGuard: /\bcreateAiGenerationGuard\b/,
  createChatGuard: /\bcreateChatGuard\b/,
  createPublicStreamGuard: /\bcreatePublicStreamGuard\b/,
  createSajuGuard: /\bcreateSajuGuard\b/,
  createAstrologyGuard: /\bcreateAstrologyGuard\b/,
  createTarotGuard: /\bcreateTarotGuard\b/,
}

const inputPatterns = {
  body: /\b(req|request)\.(json|text|formData)\s*\(/,
  query: /\bsearchParams\b|\bnextUrl\b|new URL\([^)]*(req|request)\.url/,
}

const routeFiles = []
walk(apiRoot, (filePath) => {
  const ext = path.extname(filePath)
  if (!routeExts.has(ext)) return
  if (path.basename(filePath).startsWith('route.')) {
    routeFiles.push(filePath)
  }
})

const stats = routeFiles
  .map((filePath) => {
    const relPath = path.relative(repoRoot, filePath)
    const normalizedRelPath = normalizePath(relPath)

    if (ignoredRoutes.has(normalizedRelPath)) {
      return null
    }

    const text = readFileSafe(filePath)
    const methods = findMethods(text)

    const usesGuard = patterns.guard.test(text)
    const usesMiddleware =
      patterns.withApiMiddleware.test(text) || patterns.middlewareImport.test(text) || usesGuard

    const hasValidation = patterns.validation.test(text)
    const hasInput = inputPatterns.body.test(text) || inputPatterns.query.test(text)

    const requiresAuth =
      patterns.requireAuth.test(text) ||
      patterns.createAuthenticatedGuard.test(text) ||
      patterns.createAdminGuard.test(text) ||
      patterns.createAiGenerationGuard.test(text) ||
      patterns.createChatGuard.test(text)

    const requiresToken =
      patterns.requireToken.test(text) ||
      patterns.requirePublicToken.test(text) ||
      patterns.createPublicStreamGuard.test(text) ||
      patterns.createSajuGuard.test(text) ||
      patterns.createAstrologyGuard.test(text) ||
      patterns.createTarotGuard.test(text)

    const rateLimited = patterns.rateLimit.test(text) || usesGuard
    const credits = patterns.credits.test(text) || patterns.requireCredits.test(text)

    const skipCsrf = patterns.skipCsrf.test(text)

    const mutating = methods.some((m) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m))

    return {
      filePath,
      relPath,
      methods,
      usesMiddleware,
      hasValidation,
      hasInput,
      rateLimited,
      credits,
      requiresAuth,
      requiresToken,
      skipCsrf,
      mutating,
    }
  })
  .filter(Boolean)

const total = stats.length
const counts = {
  middleware: stats.filter((s) => s.usesMiddleware).length,
  validation: stats.filter((s) => s.hasValidation).length,
  rateLimited: stats.filter((s) => s.rateLimited).length,
  credits: stats.filter((s) => s.credits).length,
  requiresAuth: stats.filter((s) => s.requiresAuth).length,
  requiresToken: stats.filter((s) => s.requiresToken).length,
  skipCsrf: stats.filter((s) => s.skipCsrf).length,
}

const missingMiddleware = stats.filter((s) => !s.usesMiddleware)
const missingValidation = stats.filter((s) => s.hasInput && !s.hasValidation)
const publicMutations = stats.filter((s) => s.mutating && !s.requiresAuth && !s.requiresToken)

const methodsCount = stats.reduce((acc, s) => {
  for (const m of s.methods) {
    acc[m] = (acc[m] || 0) + 1
  }
  return acc
}, {})

const now = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC')

const lines = []
lines.push(`# API Audit Report`)
lines.push('')
lines.push(`Generated: ${now}`)
lines.push('')
lines.push(`## Summary`)
lines.push('')
lines.push(`- Total Next.js API routes: ${total}`)
lines.push(`- Uses middleware/guards: ${counts.middleware} (${percent(counts.middleware, total)})`)
lines.push(`- Has validation signals: ${counts.validation} (${percent(counts.validation, total)})`)
lines.push(
  `- Rate limited (guard or option): ${counts.rateLimited} (${percent(counts.rateLimited, total)})`
)
lines.push(`- Credit consumption configured: ${counts.credits} (${percent(counts.credits, total)})`)
lines.push(`- Requires auth: ${counts.requiresAuth} (${percent(counts.requiresAuth, total)})`)
lines.push(`- Requires token: ${counts.requiresToken} (${percent(counts.requiresToken, total)})`)
lines.push(`- skipCsrf enabled: ${counts.skipCsrf} (${percent(counts.skipCsrf, total)})`)
lines.push('')
lines.push(`## Method Distribution`)
lines.push('')
lines.push(`- GET: ${methodsCount.GET || 0}`)
lines.push(`- POST: ${methodsCount.POST || 0}`)
lines.push(`- PUT: ${methodsCount.PUT || 0}`)
lines.push(`- PATCH: ${methodsCount.PATCH || 0}`)
lines.push(`- DELETE: ${methodsCount.DELETE || 0}`)
lines.push('')
lines.push(`## Missing Middleware (${missingMiddleware.length})`)
lines.push('')
for (const item of missingMiddleware) {
  const methods = item.methods.length ? item.methods.join(',') : 'unknown'
  lines.push(`- ${item.relPath} [${methods}]`)
}
lines.push('')
lines.push(`## Missing Validation (${missingValidation.length})`)
lines.push('')
for (const item of missingValidation) {
  const methods = item.methods.length ? item.methods.join(',') : 'unknown'
  lines.push(`- ${item.relPath} [${methods}]`)
}
lines.push('')
lines.push(`## Public Mutations (No Auth/Token) (${publicMutations.length})`)
lines.push('')
for (const item of publicMutations) {
  const methods = item.methods.length ? item.methods.join(',') : 'unknown'
  lines.push(`- ${item.relPath} [${methods}]`)
}
lines.push('')
lines.push(`## Notes`)
lines.push('')
lines.push(`- This report uses static pattern detection. Manual verification is required.`)
lines.push(
  `- Guard usage implies rate limiting by default, but custom overrides may change behavior.`
)
lines.push(
  `- Validation detection includes Zod imports, validation helpers, and stream schemas; some manual validation may be missed.`
)
lines.push(`- Missing validation only flagged when the route parses body or query input.`)

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true })
}

fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')
console.log(`Wrote ${path.relative(repoRoot, reportPath)}`)
