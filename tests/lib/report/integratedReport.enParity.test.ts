import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/report/integrated/IntegratedReport.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => k }),
}))

import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/report/integrated/adapter'
import { IntegratedReport } from '@/components/report/integrated/IntegratedReport'

describe('EN report parity', () => {
  it('renders English with full sign names and no Hangul leak in body', async () => {
    const ctx = (await buildNatalContext({
      birthDate: '1992-03-15',
      birthTime: '09:20',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })) as Record<string, unknown>
    const saju = ctx.saju as Record<string, unknown>
    saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
    ctx.input = {
      ...(ctx.input as object),
      name: 'Client',
      gender: 'female',
      place: 'Seoul, KR',
      timeZone: 'Asia/Seoul (UTC+9)',
      isoUTC: '1992-03-15T00:20:00Z',
    }
    const data = natalToReportData(ctx, 'en')
    const cross = buildCrossRows(ctx, 'en')
    const markup = renderToStaticMarkup(
      React.createElement(IntegratedReport, { data, cross, lang: 'en' })
    )

    // Full sign name (not the 3-letter abbr) should appear somewhere.
    const fullNames = [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ]
    expect(fullNames.some((n) => markup.includes(n))).toBe(true)

    // Strip the intentional Hanja chart-notation glyphs, then assert no Hangul
    // (가-힣) remains in the EN body.
    const body = markup.replace(
      /四柱|占星|五行|用神|本命|天宮圖|行星|角度|交叉|統合|日干|晝|夜/g,
      ''
    )
    const hangul = body.match(/[가-힣]/g)
    expect(hangul, hangul ? `Hangul leaked: ${[...new Set(hangul)].join('')}` : '').toBeNull()
  }, 30000)
})
