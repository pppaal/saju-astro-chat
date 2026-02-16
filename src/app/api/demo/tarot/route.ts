import { NextRequest, NextResponse } from 'next/server'
import { getDemoTarotPayload } from '@/lib/demo/demoPipelines'
import { requireDemoTokenForApi } from '@/lib/demo/requireDemoToken'
import { proxyToInternalApi } from '@/lib/demo/proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }
  return NextResponse.json(getDemoTarotPayload(), { status: 200 })
}

export async function POST(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const payload = await request.json().catch(() => ({}))
  const response = await proxyToInternalApi(request, '/api/tarot', {
    method: 'POST',
    body: payload,
    demoToken: tokenValidation,
  })
  const json = await response.json().catch(() => ({}))
  return NextResponse.json(json, { status: response.status })
}
