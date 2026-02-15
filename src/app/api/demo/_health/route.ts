import { NextRequest, NextResponse } from 'next/server'
import { apiRequireDemoTokenOr404, hasDemoTokenConfigured } from '@/lib/demo/requireDemoToken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const blocked = apiRequireDemoTokenOr404(request)
  if (blocked) {
    return blocked
  }

  return NextResponse.json(
    {
      demoTokenPresent: hasDemoTokenConfigured(),
      runtime: 'nodejs',
      now: new Date().toISOString(),
    },
    { status: 200 }
  )
}

