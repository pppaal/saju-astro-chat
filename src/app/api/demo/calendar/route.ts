import { NextRequest, NextResponse } from 'next/server'
import { getDemoCalendarPayload } from '@/lib/demo/demoPipelines'
import { requireDemoTokenForApi } from '@/lib/demo/requireDemoToken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  return NextResponse.json(getDemoCalendarPayload(), { status: 200 })
}
