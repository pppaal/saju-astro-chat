import { NextRequest, NextResponse } from 'next/server'
import { requireDemoReviewTokenForApi } from '@/lib/demo/requireDemoToken'
import {
  createDemoFeedback,
  listDemoFeedback,
  updateDemoFeedbackStatus,
  type DemoFeedbackCategory,
  type DemoFeedbackSeverity,
  type DemoFeedbackStatus,
} from '@/lib/demo/feedbackStore'

export const dynamic = 'force-dynamic'

const CATEGORIES = new Set<DemoFeedbackCategory>(['bug', 'copy', 'ux', 'idea'])
const SEVERITIES = new Set<DemoFeedbackSeverity>(['low', 'med', 'high'])
const STATUSES = new Set<DemoFeedbackStatus>(['open', 'acknowledged', 'fixed'])

export async function GET(request: NextRequest) {
  const tokenValidation = requireDemoReviewTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '50')
  const items = await listDemoFeedback(limitParam)
  return NextResponse.json({ items }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const tokenValidation = requireDemoReviewTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const body = (await request.json().catch(() => null)) as {
    category?: string
    severity?: string
    message?: string
    pageUrl?: string
    locale?: string
    email?: string
    attachmentUrl?: string
    debugJson?: Record<string, unknown>
  } | null

  if (!body) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }
  if (!body.category || !CATEGORIES.has(body.category as DemoFeedbackCategory)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }
  if (!body.severity || !SEVERITIES.has(body.severity as DemoFeedbackSeverity)) {
    return NextResponse.json({ error: 'invalid_severity' }, { status: 400 })
  }
  if (!body.message || body.message.trim().length < 3) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 })
  }
  if (!body.pageUrl || body.pageUrl.trim().length === 0) {
    return NextResponse.json({ error: 'page_url_required' }, { status: 400 })
  }

  const created = await createDemoFeedback({
    category: body.category as DemoFeedbackCategory,
    severity: body.severity as DemoFeedbackSeverity,
    message: body.message,
    pageUrl: body.pageUrl,
    locale: body.locale || 'unknown',
    email: body.email,
    attachmentUrl: body.attachmentUrl,
    debugJson: body.debugJson || {},
  })

  return NextResponse.json({ item: created }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const tokenValidation = requireDemoReviewTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null
  if (!body?.id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }
  if (!body.status || !STATUSES.has(body.status as DemoFeedbackStatus)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const updated = await updateDemoFeedbackStatus(body.id, body.status as DemoFeedbackStatus)
  if (!updated) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ item: updated }, { status: 200 })
}
