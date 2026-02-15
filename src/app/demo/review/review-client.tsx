'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type FeedbackCategory = 'bug' | 'copy' | 'ux' | 'idea'
type FeedbackSeverity = 'low' | 'med' | 'high'
type FeedbackStatus = 'open' | 'acknowledged' | 'fixed'

type FeedbackItem = {
  id: string
  createdAt: string
  category: FeedbackCategory
  severity: FeedbackSeverity
  message: string
  pageUrl: string
  locale: string
  email?: string
  attachmentUrl?: string
  status: FeedbackStatus
  debugJson: Record<string, unknown>
}

type AiReviewResponse = {
  enabled: boolean
  topIssues?: Array<{ priority: 'P0' | 'P1' | 'P2'; issue: string; suggestedFix: string }>
  observations?: { ux: string; copy: string; seo: string }
}

const CHECKLIST_ITEMS = [
  'Pricing i18n key leakage check',
  'Tarot mojibake check',
  'Blog index shows posts and filter works',
  'Numerology loading and retry',
  'Destiny-map counselor response',
  'Destiny-calendar rendering',
  'Destiny-matrix report generation',
  '10-page life report PDF generation (if available)',
  'Compatibility flow',
]

interface DemoReviewClientProps {
  token: string
}

export default function DemoReviewClient({ token }: DemoReviewClientProps) {
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [severity, setSeverity] = useState<FeedbackSeverity>('med')
  const [message, setMessage] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [locale, setLocale] = useState('unknown')
  const [email, setEmail] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [inbox, setInbox] = useState<FeedbackItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [aiReview, setAiReview] = useState<AiReviewResponse | null>(null)
  const [runningAiReview, setRunningAiReview] = useState(false)

  useEffect(() => {
    const href = window.location.href
    setPageUrl(href)
    setLocale(document.documentElement.lang || navigator.language || 'unknown')
  }, [])

  const debugBundle = useMemo(
    () => ({
      pageUrl,
      pathname: typeof window !== 'undefined' ? window.location.pathname : '/demo/review',
      locale,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '',
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA || '',
      selectedCategory: category,
      selectedSeverity: severity,
    }),
    [category, locale, pageUrl, severity]
  )

  const loadInbox = useCallback(async () => {
    const res = await fetch(`/api/demo/feedback?token=${encodeURIComponent(token)}&limit=50`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      return
    }
    const data = (await res.json()) as { items?: FeedbackItem[] }
    setInbox(data.items || [])
  }, [token])

  useEffect(() => {
    void loadInbox()
  }, [loadInbox])

  const copyDebugBundle = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(debugBundle, null, 2))
  }, [debugBundle])

  const submitFeedback = useCallback(async () => {
    if (message.trim().length < 3) {
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/demo/feedback?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category,
          severity,
          message,
          pageUrl,
          locale,
          email: email || undefined,
          attachmentUrl: attachmentUrl || undefined,
          debugJson: debugBundle,
        }),
      })
      if (!res.ok) {
        return
      }
      setMessage('')
      await loadInbox()
    } finally {
      setSubmitting(false)
    }
  }, [
    attachmentUrl,
    category,
    debugBundle,
    email,
    loadInbox,
    locale,
    message,
    pageUrl,
    severity,
    token,
  ])

  const updateStatus = useCallback(
    async (id: string, status: FeedbackStatus) => {
      const res = await fetch(`/api/demo/feedback?token=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        return
      }
      await loadInbox()
    },
    [loadInbox, token]
  )

  const runAiReview = useCallback(async () => {
    setRunningAiReview(true)
    try {
      const visibleTextSnippet = document.body?.innerText?.slice(0, 4000) || ''
      const pageTitle = document.title
      const res = await fetch(`/api/demo/ai-review?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageUrl,
          locale,
          pageTitle,
          visibleTextSnippet,
          checklistContext: CHECKLIST_ITEMS,
        }),
      })
      if (!res.ok) {
        return
      }
      const data = (await res.json()) as AiReviewResponse
      setAiReview(data)
    } finally {
      setRunningAiReview(false)
    }
  }, [locale, pageUrl, token])

  const saveAiReviewAsFeedback = useCallback(async () => {
    if (!aiReview?.enabled || !aiReview.topIssues?.length) {
      return
    }
    const aiMessage = [
      '[AI Review]',
      ...aiReview.topIssues.map(
        (issue) => `${issue.priority}: ${issue.issue} (${issue.suggestedFix})`
      ),
    ].join('\n')
    setMessage(aiMessage)
  }, [aiReview])

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 }}>
      <h1>Demo Review</h1>
      <p>Token-protected review workspace for structured tester feedback.</p>

      <section>
        <h2>1) Checklist</h2>
        <ul>
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2>2) Feedback Form</h2>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          >
            <option value="bug">bug</option>
            <option value="copy">copy</option>
            <option value="ux">ux</option>
            <option value="idea">idea</option>
          </select>
        </label>
        <label>
          Severity
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
          >
            <option value="low">low</option>
            <option value="med">med</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
            placeholder="Describe the issue or suggestion."
          />
        </label>
        <label>
          Page URL
          <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
        </label>
        <label>
          Locale
          <input value={locale} onChange={(e) => setLocale(e.target.value)} />
        </label>
        <label>
          Email (optional)
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Screenshot link (optional)
          <input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={submitFeedback} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit feedback'}
          </button>
          <button type="button" onClick={copyDebugBundle}>
            Copy Debug Bundle
          </button>
          <button type="button" onClick={runAiReview} disabled={runningAiReview}>
            {runningAiReview ? 'Reviewing...' : 'AI Review this page'}
          </button>
          <button type="button" onClick={saveAiReviewAsFeedback} disabled={!aiReview?.enabled}>
            Save AI review into form
          </button>
        </div>
      </section>

      <section>
        <h2>3) Debug Bundle Preview</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(debugBundle, null, 2)}</pre>
      </section>

      <section>
        <h2>AI Review Output</h2>
        {!aiReview ? <p>No AI review run yet.</p> : <pre>{JSON.stringify(aiReview, null, 2)}</pre>}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2>4) Inbox (latest 50)</h2>
        {inbox.length === 0 ? (
          <p>No feedback yet.</p>
        ) : (
          inbox.map((item) => (
            <article
              key={item.id}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}
            >
              <p>
                <strong>{item.category}</strong> / {item.severity} /{' '}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>{item.pageUrl}</p>
              <p>{item.message}</p>
              <label>
                Status
                <select
                  value={item.status}
                  onChange={(e) => void updateStatus(item.id, e.target.value as FeedbackStatus)}
                >
                  <option value="open">open</option>
                  <option value="acknowledged">acknowledged</option>
                  <option value="fixed">fixed</option>
                </select>
              </label>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                {JSON.stringify(item.debugJson, null, 2)}
              </pre>
            </article>
          ))
        )}
      </section>
    </main>
  )
}
