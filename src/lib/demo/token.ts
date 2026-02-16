import 'server-only'

import type { NextRequest } from 'next/server'

type TokenLike = string | string[] | null | undefined

export function isDemoEnabled(): boolean {
  const flag = process.env.DEMO_ENABLED
  if (typeof flag !== 'string' || flag.trim() === '') {
    return true
  }
  const normalized = flag.trim().toLowerCase()
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off'
}

export function getExpectedDemoToken(): string | null {
  const token = process.env.DEMO_TOKEN
  if (typeof token !== 'string') {
    return null
  }
  const normalized = token.trim()
  return normalized.length > 0 ? normalized : null
}

export function normalizeToken(rawToken: TokenLike): string | null {
  if (Array.isArray(rawToken)) {
    return rawToken[0] ?? null
  }
  if (typeof rawToken !== 'string') {
    return null
  }
  const normalized = rawToken.trim()
  return normalized.length > 0 ? normalized : null
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export function isValidDemoToken(rawToken: TokenLike): boolean {
  if (!isDemoEnabled()) {
    return false
  }
  const expected = getExpectedDemoToken()
  const normalized = normalizeToken(rawToken)
  if (!expected || !normalized) {
    return false
  }
  return constantTimeEquals(expected, normalized)
}

export function readDemoTokenFromSearchParams(searchParams?: {
  demo_token?: TokenLike
  token?: TokenLike
}): string | null {
  return normalizeToken(searchParams?.demo_token) ?? normalizeToken(searchParams?.token)
}

export function readDemoTokenFromRequest(request: NextRequest): string | null {
  const fromQuery =
    request.nextUrl.searchParams.get('demo_token') ?? request.nextUrl.searchParams.get('token')
  const fromHeader = request.headers.get('x-demo-token')
  return normalizeToken(fromQuery) ?? normalizeToken(fromHeader)
}
