import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
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
type DemoTokenSearchParams = {
  demo_token?: TokenLike
  token?: TokenLike
}
const DEMO_COOKIE_NAME = 'dp_demo'

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

export function requireDemoTokenForPage(searchParams?: DemoTokenSearchParams): string {
  const token = readDemoTokenFromSearchParams(searchParams)
  requireDemoTokenOr404(token)
  return token ?? ''
}

async function hasDemoAccessCookie(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(DEMO_COOKIE_NAME)?.value === '1'
  } catch {
    return false
  }
}

export async function validateDemoTokenForPage(searchParams?: DemoTokenSearchParams): Promise<{
  ok: boolean
  token: string | null
  reason?: 'disabled' | 'misconfigured' | 'missing_or_invalid'
}> {
  if (await hasDemoAccessCookie()) {
    return { ok: true, token: null }
  }
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
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

export function demoUnauthorizedJson(): NextResponse {
  return demoNotFoundJson()
}

export function apiRequireDemoTokenOr404(request: NextRequest): NextResponse | null {
  if (request.cookies.get(DEMO_COOKIE_NAME)?.value === '1') {
    return null
  }
  if (!isDemoEnabled()) {
    return demoNotFoundJson()
  }
  if (!hasDemoTokenConfigured()) {
    return demoNotFoundJson()
  }
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

export function requireDemoReviewTokenForPage(searchParams?: DemoTokenSearchParams): string {
  const token = readDemoTokenFromSearchParams(searchParams)
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
