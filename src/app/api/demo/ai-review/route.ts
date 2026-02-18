import { NextRequest, NextResponse } from 'next/server'
import { requireDemoReviewTokenForApi } from '@/lib/demo/requireDemoToken'

export const dynamic = 'force-dynamic'

type Priority = 'P0' | 'P1' | 'P2'

function isDemoAiReviewEnabled(): boolean {
  const raw = process.env.ENABLE_DEMO_AI_REVIEW
  if (typeof raw !== 'string' || raw.trim() === '') {
    return true
  }
  const normalized = raw.trim().toLowerCase()
  return normalized !== '0' && normalized !== 'false' && normalized !== 'off'
}

function inferIssuePriority(issue: string): Priority {
  const low = issue.toLowerCase()
  if (low.includes('loading') || low.includes('broken') || low.includes('error')) {
    return 'P0'
  }
  if (low.includes('ux') || low.includes('copy') || low.includes('seo')) {
    return 'P1'
  }
  return 'P2'
}

export async function POST(request: NextRequest) {
  const tokenValidation = requireDemoReviewTokenForApi(request)
  if (tokenValidation instanceof NextResponse) {
    return tokenValidation
  }

  if (!isDemoAiReviewEnabled()) {
    return NextResponse.json({ enabled: false }, { status: 200 })
  }

  const body = (await request.json().catch(() => null)) as {
    pageUrl?: string
    locale?: string
    pageTitle?: string
    visibleTextSnippet?: string
    checklistContext?: string[]
  } | null

  if (!body?.pageUrl) {
    return NextResponse.json({ error: 'page_url_required' }, { status: 400 })
  }

  const snippet = (body.visibleTextSnippet || '').slice(0, 5000)
  const issues: string[] = []

  if (/\b(heroTitle|heroSub|subscribe|titleAstrology|destinyMap)\b/.test(snippet)) {
    issues.push('Possible raw i18n key leakage detected in visible text.')
  }
  if (snippet.includes('â') || snippet.includes('Ã') || snippet.includes('�')) {
    issues.push('Possible mojibake/broken encoding characters detected.')
  }
  if (snippet.includes('Loading...')) {
    issues.push('Potential permanent loading text visible to users.')
  }
  if (!issues.length) {
    issues.push('No obvious P0 issue found in the provided snippet.')
  }

  const topIssues = issues.map((issue) => ({
    priority: inferIssuePriority(issue),
    issue,
    suggestedFix: 'Validate UI strings, locale resources, and loading/error fallback handling.',
  }))

  return NextResponse.json(
    {
      enabled: true,
      pageUrl: body.pageUrl,
      locale: body.locale || 'unknown',
      pageTitle: body.pageTitle || '',
      topIssues,
      observations: {
        ux: 'Ensure key actions are discoverable and empty/loading states are actionable.',
        copy: 'Keep bilingual terminology consistent and avoid key-name leakage in UI.',
        seo: 'Verify title/description/canonical are stable for demo-tested pages.',
      },
    },
    { status: 200 }
  )
}
