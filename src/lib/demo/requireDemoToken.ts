import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { notFound } from 'next/navigation'

type TokenLike = string | string[] | null | undefined

export function hasDemoTokenConfigured(): boolean {
  const token = process.env.DEMO_TOKEN
  return typeof token === 'string' && token.trim().length > 0
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
  if (Array.isArray(token)) {
    return token[0] ?? null
  }
  if (typeof token !== 'string') {
    return null
  }
  return token
}

export function isValidDemoToken(rawToken: TokenLike): boolean {
  const expected = getExpectedToken('DEMO_TOKEN')
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

  // Keep comparison deterministic without relying on Node-only crypto APIs.
  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ normalized.charCodeAt(i)
  }
  return mismatch === 0
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

export function readDemoTokenFromRequest(request: NextRequest): string | null {
  const fromQuery = request.nextUrl.searchParams.get('token')
  const fromHeader = request.headers.get('x-demo-token')
  return fromQuery ?? fromHeader
}

export function requireDemoTokenOr404(token?: TokenLike): void {
  if (!isValidDemoToken(token)) {
    notFound()
  }
}

export function requireDemoTokenForPage(searchParams?: { token?: TokenLike }): string {
  const token = normalizeDemoToken(searchParams?.token)
  requireDemoTokenOr404(token)
  return token || ''
}

export function demoNotFoundJson(): NextResponse {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

export function demoUnauthorizedJson(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function apiRequireDemoTokenOr404(request: NextRequest): NextResponse | null {
  const token = readDemoTokenFromRequest(request)
  if (!isValidDemoToken(token)) {
    return demoNotFoundJson()
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
