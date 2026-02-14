import { NextRequest, NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { timingSafeEqual } from 'crypto'

function getExpectedToken(): string | null {
  const token = process.env.DEMO_TOKEN
  if (!token || token.trim().length === 0) {
    return null
  }
  return token
}

export function isValidDemoToken(rawToken: string | null | undefined): boolean {
  const expected = getExpectedToken()
  if (!expected) {
    return false
  }
  if (!rawToken) {
    return false
  }
  const expectedBuffer = Buffer.from(expected)
  const tokenBuffer = Buffer.from(rawToken)
  if (expectedBuffer.length !== tokenBuffer.length) {
    return false
  }
  return timingSafeEqual(expectedBuffer, tokenBuffer)
}

export function readDemoTokenFromRequest(request: NextRequest): string | null {
  const fromQuery = request.nextUrl.searchParams.get('token')
  const fromHeader = request.headers.get('x-demo-token')
  return fromQuery ?? fromHeader
}

export function requireDemoTokenForPage(searchParams?: { token?: string | string[] }): string {
  const tokenValue = Array.isArray(searchParams?.token)
    ? searchParams?.token[0]
    : searchParams?.token

  if (!isValidDemoToken(tokenValue)) {
    notFound()
  }

  return tokenValue!
}

export function demoNotFoundJson(): NextResponse {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

export function requireDemoTokenForApi(request: NextRequest): string | NextResponse {
  const token = readDemoTokenFromRequest(request)
  if (!isValidDemoToken(token)) {
    return demoNotFoundJson()
  }
  return token!
}
