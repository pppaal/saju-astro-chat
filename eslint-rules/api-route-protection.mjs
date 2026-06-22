/**
 * ESLint rule: api-route-protection
 *
 * Enforces that every Next.js API route handler under `src/app/api/**\/route.ts`
 * is protected by the shared API middleware. The defining invariant (see
 * CLAUDE.md → "Security"):
 *
 *   > API routes go through `withApiMiddleware`, which composes CSRF, auth,
 *   > rate limiting, and credit gating.
 *
 * Recognized protection mechanisms (a route file passes if it references ANY
 * of these — they all run the same context/guard pipeline):
 *   - `withApiMiddleware(...)`   — the standard wrapper
 *   - `initializeApiContext(...)` — the lower-level primitive `withApiMiddleware`
 *      itself calls; a handful of streaming/SSE routes call it directly because
 *      they need to own the Response object (e.g. tarot/interpret-stream).
 *
 * A route file that exports a handler (`export const GET = ...`,
 * `export async function POST() {}`, etc.) but references NEITHER mechanism is
 * flagged — that is the "accidentally shipped an unprotected route" failure
 * class this rule exists to prevent.
 *
 * Intentional exceptions are enumerated in ALLOWLIST below, each with a reason.
 * These are routes that are protected by a DIFFERENT, audited mechanism
 * (NextAuth's own handlers, signature auth, manual rateLimit + requirePublicToken
 * + getServerSession ownership checks) or are inert 404 stubs. The list mirrors
 * `docs/SECURITY_AUDIT_REPORT.md` → "Intentional / accepted design".
 *
 * To add a new genuinely-unprotected-by-middleware route, either:
 *   1. add its path to ALLOWLIST below with a justification, or
 *   2. add an inline `// eslint-disable-next-line local/api-route-protection`
 *      with a comment explaining why.
 * Both force a conscious, reviewable decision.
 */

/**
 * Paths (relative to repo root, POSIX separators) that are intentionally NOT
 * wrapped by withApiMiddleware/initializeApiContext. Keep this list tight and
 * justified — every entry is a security exception.
 */
const ALLOWLIST = new Set([
  // NextAuth's own route handlers — auth/session security is owned by NextAuth
  // (Auth.js v5), not our middleware. These re-export `handlers.GET/POST`.
  'src/app/api/auth/[...nextauth]/route.ts',

  // Public astrology calculators: protected manually with rateLimit +
  // requirePublicToken (public, token-gated, rate-limited by design — see
  // SECURITY_AUDIT_REPORT "public calculators"). They predate the wrapper and
  // share one hand-rolled guard shape.
  'src/app/api/astrology/advanced/draconic/route.ts',
  'src/app/api/astrology/advanced/harmonics/route.ts',
  'src/app/api/astrology/advanced/asteroids/route.ts',
  'src/app/api/astrology/advanced/progressions/route.ts',
  'src/app/api/astrology/advanced/solar-return/route.ts',

  // Counselor context warmer: csrfGuard + getServerSession (auth) + rateLimit
  // applied manually; side-effect-free cache warm, no credits/LLM.
  'src/app/api/counselor/warm/route.ts',

  // Turn-result fetchers: getServerSession + per-user cache-key ownership check
  // (user can only read their own turn result). Lightweight GET, no charge.
  'src/app/api/compatibility/counselor/result/route.ts',
  'src/app/api/counselor/realtime/result/route.ts',
  'src/app/api/tarot/interpret-stream/result/route.ts',

  // Disabled feature stubs — every method returns 404, no logic, no data access.
  'src/app/api/tarot/couple-reading/route.ts',
  'src/app/api/tarot/couple-reading/[readingId]/route.ts',

  // Counselor realtime answer (SSE): bypasses the wrapper to own the streaming
  // Response; guarded manually with csrfGuard + getServerSession + rateLimit.
  'src/app/api/counselor/realtime/route.ts',

  // Cron jobs: authenticated by CRON_SECRET bearer token (timing-safe) before
  // any work, plus rateLimit. withApiMiddleware's auth model doesn't fit a
  // machine caller. See SECURITY_AUDIT_REPORT "Cron routes authenticate with
  // CRON_SECRET".
  'src/app/api/cron/daily-fortune/route.ts',
  'src/app/api/cron/reset-credits/route.ts',
  'src/app/api/cron/reconcile-activity/route.ts',
  'src/app/api/cron/social-drafts/route.ts',
  'src/app/api/cron/keyday-push/route.ts',
  'src/app/api/cron/winback-push/route.ts',
  'src/app/api/cron/anomaly-check/route.ts',

  // Public share viewer: public by design (SECURITY_AUDIT_REPORT "public
  // share/[id]"), rate-limited manually.
  'src/app/api/share/[id]/route.ts',
])

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

/** Identifiers whose presence anywhere in the file counts as "protected". */
const PROTECTION_IDENTIFIERS = new Set(['withApiMiddleware', 'initializeApiContext'])

/** Normalize an absolute filename to a repo-relative POSIX path. */
function toRepoRelative(filename) {
  const normalized = filename.replace(/\\/g, '/')
  const idx = normalized.indexOf('/src/app/api/')
  if (idx === -1) {
    return normalized
  }
  // Drop everything before (and including the leading slash of) `src`.
  return normalized.slice(idx + 1)
}

/** Is this file one we should lint? Only `src/app/api/**\/route.ts`. */
function isApiRouteFile(filename) {
  const rel = filename.replace(/\\/g, '/')
  return /\/src\/app\/api\/.+\/route\.ts$/.test(rel) || /\/src\/app\/api\/route\.ts$/.test(rel)
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require API route handlers to be protected by withApiMiddleware (or initializeApiContext); allowlist intentional exceptions.',
      recommended: true,
    },
    schema: [],
    messages: {
      unprotected:
        "API route handler '{{name}}' in {{file}} is not protected by withApiMiddleware (or initializeApiContext). " +
        'Wrap the handler with withApiMiddleware, or — if this route is intentionally protected by another audited mechanism — ' +
        'add its path to ALLOWLIST in eslint-rules/api-route-protection.mjs (with a justification) ' +
        'or add an inline `// eslint-disable-next-line local/api-route-protection` explaining why.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()

    if (!isApiRouteFile(filename)) {
      return {}
    }

    const rel = toRepoRelative(filename)
    if (ALLOWLIST.has(rel)) {
      return {}
    }

    // Collect every identifier name used in the file; if a protection
    // identifier appears anywhere, the whole file is considered protected.
    // (Handlers in this codebase are composed via withApiMiddleware(...) or
    // built on initializeApiContext(...); a file-level reference is a reliable,
    // low-false-positive signal.)
    let isProtected = false
    /** @type {{ node: import('eslint').Rule.Node, name: string }[]} */
    const handlerExports = []

    return {
      Identifier(node) {
        if (PROTECTION_IDENTIFIERS.has(node.name)) {
          isProtected = true
        }
      },

      // export const GET = ... / export const POST = ...
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator'(node) {
        if (node.id && node.id.type === 'Identifier' && HTTP_METHODS.has(node.id.name)) {
          handlerExports.push({ node, name: node.id.name })
        }
      },

      // export function GET() {} / export async function POST() {}
      'ExportNamedDeclaration > FunctionDeclaration'(node) {
        if (node.id && HTTP_METHODS.has(node.id.name)) {
          handlerExports.push({ node, name: node.id.name })
        }
      },

      'Program:exit'() {
        if (isProtected || handlerExports.length === 0) {
          return
        }
        // Report once per offending handler export so an `eslint-disable-next-line`
        // can be placed precisely.
        for (const { node, name } of handlerExports) {
          context.report({
            node,
            messageId: 'unprotected',
            data: { name, file: rel },
          })
        }
      },
    }
  },
}

export default rule
