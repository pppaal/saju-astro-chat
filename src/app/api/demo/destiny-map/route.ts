import { NextRequest, NextResponse } from 'next/server'
import { getDemoDestinyMapPayload } from '@/lib/demo/demoPipelines'
import { requireDemoTokenForApi } from '@/lib/demo/requireDemoToken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tokenValidation = requireDemoTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  return NextResponse.json(getDemoDestinyMapPayload(), { status: 200 })
}
