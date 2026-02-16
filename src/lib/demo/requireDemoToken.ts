import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import {
  getExpectedDemoToken,
  isDemoEnabled,
  isValidDemoToken,
  normalizeToken,
  readDemoTokenFromRequest,
  readDemoTokenFromSearchParams,
} from '@/lib/demo/token'

export { isValidDemoToken } from '@/lib/demo/token'

type TokenLike = string | string[] | null | undefined

export function hasDemoTokenConfigured(): boolean {
  return getExpectedDemoToken() !== null
}

function getExpectedToken(...envKeys: string[]): string | null {
  for (const envKey of envKeys) {
    const token = process.env[envKey]
    if (typeof token === 'string' && token.trim().length > 0) {
      return token
    }
  }
  return null
}

export function hasDemoReviewTokenConfigured(): boolean {
  return getExpectedToken('DEMO_REVIEW_TOKEN', 'DEMO_TOKEN') !== null
}

export function normalizeDemoToken(token: TokenLike): string | null {
  return normalizeToken(token)
}

export function isValidDemoReviewToken(rawToken: TokenLike): boolean {
  const expected = getExpectedToken('DEMO_REVIEW_TOKEN', 'DEMO_TOKEN')
  const normalized = normalizeDemoToken(rawToken)
  if (!expected) {
    return false
  }
  if (!normalized) {
    return false
  }
  if (expected.length !== normalized.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ normalized.charCodeAt(i)
  }
  return mismatch === 0
}

export function requireDemoTokenOr404(token?: TokenLike): void {
  if (!isValidDemoToken(token)) {
    notFound()
  }
}

export function requireDemoTokenForPage(searchParams?: {
  demo_token?: TokenLike
  token?: TokenLike
}): string {
  const token = readDemoTokenFromSearchParams(searchParams)
  requireDemoTokenOr404(token)
  return token ?? ''
}

export function validateDemoTokenForPage(searchParams?: {
  demo_token?: TokenLike
  token?: TokenLike
}): {
  ok: boolean
  token: string | null
  reason?: 'disabled' | 'misconfigured' | 'missing_or_invalid'
} {
  if (!isDemoEnabled()) {
    return { ok: false, token: null, reason: 'disabled' }
  }
  if (!hasDemoTokenConfigured()) {
    return { ok: false, token: null, reason: 'misconfigured' }
  }
  const token = readDemoTokenFromSearchParams(searchParams)
  if (!isValidDemoToken(token)) {
    return { ok: false, token: null, reason: 'missing_or_invalid' }
  }
  return { ok: true, token }
}

export function demoNotFoundJson(): NextResponse {
  return NextResponse.json({ error: 'Demo access required' }, { status: 401 })
}

export function demoUnauthorizedJson(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function apiRequireDemoTokenOr404(request: NextRequest): NextResponse | null {
  if (!isDemoEnabled()) {
    return NextResponse.json({ error: 'Demo mode disabled' }, { status: 403 })
  }
  if (!hasDemoTokenConfigured()) {
    return NextResponse.json({ error: 'Demo token not configured' }, { status: 503 })
  }
  const token = readDemoTokenFromRequest(request)
  if (!isValidDemoToken(token)) {
    return demoUnauthorizedJson()
  }
  return null
}

export function requireDemoTokenForApi(request: NextRequest): string | NextResponse {
  const blocked = apiRequireDemoTokenOr404(request)
  if (blocked) {
    return blocked
  }
  return readDemoTokenFromRequest(request) || ''
}

export function requireDemoReviewTokenOr404(token?: TokenLike): void {
  if (!isValidDemoReviewToken(token)) {
    notFound()
  }
}

export function requireDemoReviewTokenForPage(searchParams?: { token?: TokenLike }): string {
  const token = normalizeDemoToken(searchParams?.token)
  requireDemoReviewTokenOr404(token)
  return token || ''
}

export function requireDemoReviewTokenForApi(request: NextRequest): string | NextResponse {
  const token = readDemoTokenFromRequest(request)
  if (!isValidDemoReviewToken(token)) {
    return demoUnauthorizedJson()
  }
  return token || ''
}
