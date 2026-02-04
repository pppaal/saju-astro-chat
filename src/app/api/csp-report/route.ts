// src/app/api/csp-report/route.ts
// CSP Violation Report Endpoint - Receives and logs CSP violations

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getClientIp } from '@/lib/request-ip'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'
import { HTTP_STATUS } from '@/lib/constants/http'
import { cspReportSchema } from '@/lib/api/zodValidation'

// Max body size for CSP reports (16KB)
const MAX_REPORT_SIZE = 16 * 1024

// Rate limit: 100 reports per IP per minute (CSP can generate many reports)
const RATE_LIMIT = { limit: 100, windowSeconds: 60 }

type CSPViolationReport = z.infer<typeof cspReportSchema>

// Known false positives to filter out
const IGNORED_BLOCKED_URIS = [
  'data:',
  'blob:',
  'about:',
  'chrome-extension:',
  'moz-extension:',
  'safari-extension:',
  'edge:',
  'ms-browser-extension:',
]

const IGNORED_SOURCE_FILES = [
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'edge://',
]

function isIgnoredViolation(report: CSPViolationReport['csp-report']): boolean {
  if (!report) {
    return true
  }

  const blockedUri = report['blocked-uri'] || ''
  const sourceFile = report['source-file'] || ''

  // Filter browser extensions
  if (IGNORED_BLOCKED_URIS.some((uri) => blockedUri.startsWith(uri))) {
    return true
  }

  if (IGNORED_SOURCE_FILES.some((file) => sourceFile.startsWith(file))) {
    return true
  }

  // Filter inline violations in development (common with HMR)
  if (
    process.env.NODE_ENV !== 'production' &&
    (blockedUri === 'inline' || report['violated-directive']?.includes('inline'))
  ) {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers) || 'unknown'

  // Rate limiting
  const limit = await rateLimit(`csp-report:${ip}`, RATE_LIMIT)
  if (!limit.allowed) {
    return new NextResponse(null, { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers })
  }

  try {
    // Check content length
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_REPORT_SIZE) {
      return new NextResponse(null, { status: HTTP_STATUS.PAYLOAD_TOO_LARGE })
    }

    // Parse and validate the CSP report with Zod
    const text = await req.text()
    if (text.length > MAX_REPORT_SIZE) {
      return new NextResponse(null, { status: HTTP_STATUS.PAYLOAD_TOO_LARGE })
    }

    let parsedBody
    try {
      parsedBody = JSON.parse(text)
    } catch {
      return new NextResponse(null, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const validation = cspReportSchema.safeParse(parsedBody)
    if (!validation.success) {
      logger.warn('[csp-report] Invalid CSP report format', { errors: validation.error.issues })
      return new NextResponse(null, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const report = validation.data
    const cspReport = report['csp-report']

    // Filter out ignored violations
    if (isIgnoredViolation(cspReport)) {
      return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT, headers: limit.headers })
    }

    // Log the violation
    const violationData = {
      ip,
      documentUri: cspReport?.['document-uri'],
      violatedDirective: cspReport?.['violated-directive'],
      effectiveDirective: cspReport?.['effective-directive'],
      blockedUri: cspReport?.['blocked-uri'],
      sourceFile: cspReport?.['source-file'],
      lineNumber: cspReport?.['line-number'],
      columnNumber: cspReport?.['column-number'],
      disposition: cspReport?.['disposition'],
      timestamp: new Date().toISOString(),
    }

    // Log at warn level for monitoring
    logger.warn('[CSP Violation]', violationData)

    // In production, you might want to:
    // 1. Send to Sentry/error tracking
    // 2. Store in database for analysis
    // 3. Send to security monitoring system

    // Return 204 No Content on success (standard for CSP reporting)
    return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT, headers: limit.headers })
  } catch (error) {
    logger.error('[CSP Report] Failed to process report:', error)
    return new NextResponse(null, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'csp-report' })
}
