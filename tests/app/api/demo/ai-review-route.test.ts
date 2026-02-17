import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as postAiReview } from '@/app/api/demo/ai-review/route'

describe('/api/demo/ai-review route', () => {
  const originalDemoToken = process.env.DEMO_TOKEN
  const originalReviewFlag = process.env.ENABLE_DEMO_AI_REVIEW

  beforeEach(() => {
    process.env.DEMO_TOKEN = 'demo-test-token'
    delete process.env.ENABLE_DEMO_AI_REVIEW
  })

  afterEach(() => {
    process.env.DEMO_TOKEN = originalDemoToken
    process.env.ENABLE_DEMO_AI_REVIEW = originalReviewFlag
  })

  it('generates AI review when flag is unset (default ON) and demo_token is provided', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/demo/ai-review?demo_token=demo-test-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageUrl: 'http://localhost:3000/demo/review',
          visibleTextSnippet: 'Loading... heroTitle',
        }),
      }
    )
    const res = await postAiReview(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.enabled).toBe(true)
    expect(Array.isArray(json.topIssues)).toBe(true)
    expect(json.topIssues.length).toBeGreaterThan(0)
  })

  it('returns enabled=false when explicitly disabled by env flag', async () => {
    process.env.ENABLE_DEMO_AI_REVIEW = '0'
    const req = new NextRequest(
      'http://localhost:3000/api/demo/ai-review?demo_token=demo-test-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageUrl: 'http://localhost:3000/demo/review',
        }),
      }
    )
    const res = await postAiReview(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.enabled).toBe(false)
  })
})
