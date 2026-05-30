import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET as calendarGet } from '@/app/api/calendar/route'

const asNextRequest = (request: Request) => request as unknown as NextRequest

/**
 * 회귀 가드 — 캘린더 점수는 사주×점성 "교차"다. 한쪽 source(saju/astro)가
 * 통째로 빠지거나 핵심 extractor가 조용히 죽으면 교차가 얕아진다. 실제 API
 * 응답의 engineSignals(= v2 셀 신호)가 (1) 양쪽 source를 모두 포함하고
 * (2) 매일 나오는 핵심 사주/점성 kind를 포함하는지 확인해 커버리지 회귀를 잡는다.
 */
describe('calendar engine signal coverage (saju×astrology cross)', () => {
  const originalToken = process.env.PUBLIC_API_TOKEN

  beforeEach(() => {
    process.env.PUBLIC_API_TOKEN = 'public-token'
  })
  afterEach(() => {
    if (originalToken === undefined) delete process.env.PUBLIC_API_TOKEN
    else process.env.PUBLIC_API_TOKEN = originalToken
  })

  it('emits both saju and astro signals covering core extractor kinds', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&month=2026-05&locale=ko',
          { headers: { 'x-api-token': 'public-token' } }
        )
      )
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: Array<Record<string, any>> }
    const may = (payload.allDates || []).filter((d) => String(d.date).startsWith('2026-05'))
    expect(may.length).toBeGreaterThan(20)

    const signals = may.flatMap((d) => (d.engineSignals as Array<Record<string, any>>) || [])
    // engine augmentation 자체가 죽으면(교차 소실) 신호가 0 → 즉시 실패
    expect(signals.length).toBeGreaterThan(50)

    const sources = new Set(signals.map((s) => s.source))
    const kinds = [...new Set(signals.map((s) => s.kind))]

    // 교차: 사주·점성 양쪽 신호가 모두 있어야 한다. engineSignals 는 이제 payload
    // 절감을 위해 hourly layer 만 노출하므로(다른 layer 는 응답에서 제거), 양쪽
    // source 가 모두 들어오는지로 교차 소실(한쪽 extractor 죽음)을 가드한다.
    expect(sources.has('saju')).toBe(true)
    expect(sources.has('astro')).toBe(true)

    // hourly layer 의 핵심 kind — 사주 시주 십신 + 점성 행성시. 하나라도 빠지면
    // 그 hourly extractor 가 죽은 것.
    for (const kind of [
      'pillar-sibsin', // 사주: 시주 십신/오행 생극/용신
      'planetary-hour', // 점성: 행성시 (Chaldean)
    ]) {
      expect(kinds, `missing signal kind: ${kind}`).toContain(kind)
    }

    // hourly 신호는 양쪽 source 가 함께 있어야 교차가 얕지 않다.
    expect(kinds.length).toBeGreaterThanOrEqual(2)
  })
})
