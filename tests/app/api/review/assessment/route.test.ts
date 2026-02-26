import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/review/assessment/route'

const REVIEW_TOKEN = 'review-test-token'

function makeGetRequest(query: string) {
  return new NextRequest(`http://localhost/api/review/assessment${query}`, { method: 'GET' })
}

function makePostRequest(query: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/review/assessment${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/review/assessment', () => {
  beforeEach(() => {
    process.env.REVIEW_TOKEN = REVIEW_TOKEN
  })

  it('requires token', async () => {
    const request = makeGetRequest('?fixture=D_A&locale=ko')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('unauthorized')
  })

  it('returns deterministic fixture output for D_A', async () => {
    const request = makeGetRequest(`?fixture=D_A&locale=ko&token=${REVIEW_TOKEN}`)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.locale).toBe('ko')
    expect(data.fixtureUsed).toBe('D_A')
    expect(data.integrated.profileId).toBe('D_A')
    expect(data.personality.typeCode).toBe('RSLA')
    expect(data.icp?.dims?.topCluster).toBe('assertive')
  })
})

describe('POST /api/review/assessment', () => {
  beforeEach(() => {
    process.env.REVIEW_TOKEN = REVIEW_TOKEN
  })

  it('requires token', async () => {
    const request = makePostRequest('?locale=ko', {
      personalityAnswers: { q1: 'A' },
      icpAnswers: { ag_02: '5' },
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('unauthorized')
  })
})
