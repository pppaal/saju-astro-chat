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
  const response = await proxyToInternalApi(request, '/api/destiny-matrix/report', {
    method: 'POST',
    body: {
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      timezone: payload.timezone,
      lang: payload.lang || 'en',
      queryDomain: payload.queryDomain || 'career',
      maxInsights: payload.maxInsights || 5,
      includeVisualizations: false,
      includeDetailedData: false,
    },
    demoToken: tokenValidation,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    return NextResponse.json(json, { status: response.status })
  }

  const report = (json as Record<string, unknown>).report as Record<string, unknown> | undefined
  const summary = {
    success: true,
    domain: payload.queryDomain || 'career',
    topInsights: Array.isArray(report?.topInsights) ? report?.topInsights : [],
    executiveSummary:
      typeof report?.executiveSummary === 'string' ? report.executiveSummary : undefined,
    actionItems: Array.isArray(report?.actionItems) ? report?.actionItems : [],
  }

  return NextResponse.json(summary, { status: 200 })
}
