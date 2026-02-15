import { NextRequest } from 'next/server'
import { GET as getCombinedPdf } from '@/app/demo/combined.pdf/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return getCombinedPdf(request)
}

