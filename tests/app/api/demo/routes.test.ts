import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getDemoIcp } from '@/app/api/demo/icp/route'
import { GET as getDemoPersona } from '@/app/api/demo/personality/route'
import { GET as getDemoCombined } from '@/app/api/demo/combined/route'
import { GET as getDemoTarot } from '@/app/api/demo/tarot/route'
import { GET as getDemoDestinyMap } from '@/app/api/demo/destiny-map/route'
import { GET as getDemoCalendar } from '@/app/api/demo/calendar/route'
import { GET as getDemoHealth } from '@/app/api/demo/_health/route'
import { GET as getDemoCombinedPdf } from '@/app/demo/combined.pdf/route'

describe('/api/demo and /demo/combined.pdf routes', () => {
  const originalToken = process.env.DEMO_TOKEN

  beforeEach(() => {
    process.env.DEMO_TOKEN = 'demo-test-token'
  })

  afterEach(() => {
    process.env.DEMO_TOKEN = originalToken
  })

  it('returns ICP demo payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/icp?token=demo-test-token')
    const res = await getDemoIcp(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json?.narrative?.main_text?.length).toBeGreaterThan(0)
    expect(Array.isArray(json?.questions)).toBe(true)
    expect(json.questions.length).toBeGreaterThanOrEqual(20)
  })

  it('returns Personality demo payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/personality?token=demo-test-token')
    const res = await getDemoPersona(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json?.narrative?.main_text?.length).toBeGreaterThan(0)
    expect(Array.isArray(json?.questions)).toBe(true)
    expect(json.questions.length).toBeGreaterThanOrEqual(40)
  })

  it('returns Combined demo payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/combined?token=demo-test-token')
    const res = await getDemoCombined(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json?.combined_summary)).toBe(true)
    expect(json.combined_summary.length).toBeGreaterThanOrEqual(5)
    expect(Array.isArray(json?.strengths)).toBe(true)
    expect(Array.isArray(json?.risks)).toBe(true)
  })

  it('returns Tarot demo payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/tarot?token=demo-test-token')
    const res = await getDemoTarot(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json?.main_text?.length).toBeGreaterThan(20)
    expect(Array.isArray(json?.cards)).toBe(true)
    expect(Array.isArray(json?.evidence)).toBe(true)
  })

  it('returns Destiny Map demo payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/destiny-map?token=demo-test-token')
    const res = await getDemoDestinyMap(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json?.top_themes)).toBe(true)
    expect(Array.isArray(json?.cross_insights)).toBe(true)
    expect(Array.isArray(json?.action_plan)).toBe(true)
  })

  it('returns Calendar demo payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/calendar?token=demo-test-token')
    const res = await getDemoCalendar(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(typeof json?.month).toBe('string')
    expect(Array.isArray(json?.highlights)).toBe(true)
    expect(Array.isArray(json?.timeline)).toBe(true)
  })

  it('accepts x-demo-token header for API auth', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/icp', {
      headers: { 'x-demo-token': 'demo-test-token' },
    })
    const res = await getDemoIcp(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json?.narrative?.main_text?.length).toBeGreaterThan(0)
  })

  it('returns demo health payload for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/_health?token=demo-test-token')
    const res = await getDemoHealth(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json?.demoTokenPresent).toBe(true)
    expect(json?.runtime).toBe('nodejs')
    expect(typeof json?.now).toBe('string')
  })

  it('returns PDF for valid token', async () => {
    const req = new NextRequest('http://localhost:3000/demo/combined.pdf?token=demo-test-token')
    const res = await getDemoCombinedPdf(req)
    const bytes = await res.arrayBuffer()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('returns 404 for invalid or missing token', async () => {
    const invalidReq = new NextRequest('http://localhost:3000/api/demo/icp?token=wrong')
    const missingReq = new NextRequest('http://localhost:3000/api/demo/personality')
    const pdfReq = new NextRequest('http://localhost:3000/demo/combined.pdf')

    const invalidRes = await getDemoIcp(invalidReq)
    const missingRes = await getDemoPersona(missingReq)
    const pdfRes = await getDemoCombinedPdf(pdfReq)

    expect(invalidRes.status).toBe(404)
    expect(missingRes.status).toBe(404)
    expect(pdfRes.status).toBe(404)
  })
})
