import { NextRequest, NextResponse } from 'next/server'
import { requireDemoTokenForApi } from '@/lib/demo/requireDemoToken'
import { proxyToInternalApi } from '@/lib/demo/proxy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const response = await proxyToInternalApi(request, '/api/destiny-matrix', {
    method: 'POST',
    body: {
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      timezone: payload.timezone,
      gender: payload.gender || 'male',
      lang: payload.lang || 'en',
    },
    demoToken: tokenValidation,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    return NextResponse.json(json, { status: response.status })
  }

  const report = json as Record<string, unknown>
  const highlights = Array.isArray(report.highlights) ? report.highlights : []
  const executiveSummary =
    typeof report.summary === 'string'
      ? report.summary
      : typeof report.message === 'string'
        ? report.message
        : undefined
  const summary = {
    success: true,
    domain: payload.queryDomain || 'career',
    generatedFrom: 'destiny-matrix',
    executiveSummary,
    topInsights: highlights,
    actionItems: Array.isArray(report.synergies) ? report.synergies : [],
    raw: {
      success: report.success,
      warning: report.warning,
      warningMessage: report.message,
    },
  }

  return NextResponse.json(summary, { status: 200 })
}
