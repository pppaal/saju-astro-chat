import { NextRequest, NextResponse } from 'next/server'
import { readDemoTokenFromRequest, isValidDemoToken } from '@/lib/demo/token'

export const dynamic = 'force-dynamic'

const PREFIX_LEN = 6

const safePrefix = (value: string) => value.slice(0, PREFIX_LEN)

export async function GET(request: NextRequest) {
  const envToken = (process.env.DEMO_TOKEN || '').trim()
  const providedToken = (readDemoTokenFromRequest(request) || '').trim()

  return NextResponse.json({
    demoEnabled: process.env.DEMO_ENABLED,
    envTokenLen: envToken.length,
    envTokenPrefix: safePrefix(envToken),
    providedTokenLen: providedToken.length,
    providedTokenPrefix: safePrefix(providedToken),
    match: isValidDemoToken(providedToken),
  })
}
