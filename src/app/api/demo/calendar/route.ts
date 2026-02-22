import { NextRequest, NextResponse } from 'next/server'
import { getDemoCalendarPayload } from '@/lib/demo/demoPipelines'
import { requireDemoTokenForApi } from '@/lib/demo/requireDemoToken'
import { proxyToInternalApi } from '@/lib/demo/proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }
  return NextResponse.json(getDemoCalendarPayload(), { status: 200 })
}

export async function POST(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const response = await proxyToInternalApi(request, '/api/calendar', {
    method: 'GET',
    query: {
      birthDate: String(payload.birthDate || ''),
      birthTime: String(payload.birthTime || ''),
      birthPlace: String(payload.birthPlace || 'Seoul'),
      locale: String(payload.locale || 'en'),
      category: String(payload.category || 'general'),
      year: Number(payload.year || new Date().getFullYear()),
    },
    demoToken: tokenValidation,
  })
  const json = await response.json().catch(() => ({}))
  return NextResponse.json(json, { status: response.status })
}
