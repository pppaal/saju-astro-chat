/**
 * 통합 리포트 렌더 — 미상 하우스와 사주 단독 카드를 정직하게 (감사 CR-4·CR-5).
 *
 *  - CR-5: 출생시각/출생지 미상이면 어댑터가 하우스를 비운다(house 0, houses []). 화면은 그걸
 *    '0H' 와 "12개 영역 모두 비어 있음 — 걱정 마세요"로 그렸고, 계산하지도 않은 하우스의
 *    계산법(Placidus)과 빈 첫인상/사회적 위치 칸을 보여 줬다. 도시 미상엔 배너도 없었다.
 *  - CR-4: 체질 경향 카드는 사주(오행·용신)만으로 만든다. 그런데 교차 카드처럼 톤 배지
 *    ("Two pulls in you")와 '점성이 보는 결: 보강 금'을 달아 사주 용신을 점성 근거로 보였다.
 *
 * 배선 검사라 전역 swisseph 목 위에서 돈다(값이 아니라 구조를 본다).
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/report/integrated/IntegratedReport.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => k }),
}))
vi.mock('@/components/report/integrated/viral/ViralTopCard.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => k }),
}))

import { IntegratedReport } from '@/components/report/integrated/IntegratedReport'
import { buildReportContext } from '@/lib/report/buildReportContext'
import { natalToReportData, buildCrossRows } from '@/lib/report/integratedAdapter'
import { TONE_LABEL, UI } from '@/lib/report/integratedReportLabels'

const NOW = new Date('2026-11-25T03:00:00Z')
const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

async function renderReport(opts: {
  timeUnknown?: boolean
  cityUnknown?: boolean
  lang: 'ko' | 'en'
}) {
  const ctx = (await buildReportContext({
    birthDate: '1997-03-21',
    birthTime: opts.timeUnknown ? '12:00' : '14:30',
    gender: 'female',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
    birthTimeUnknown: !!opts.timeUnknown,
    birthCityUnknown: !!opts.cityUnknown,
  })) as unknown as Record<string, unknown>
  ctx.input = {
    ...(ctx.input as object),
    birthTimeUnknown: !!opts.timeUnknown,
    birthCityUnknown: !!opts.cityUnknown,
    name: 'X',
    gender: 'female',
    place: 'P',
    timeZone: 'Asia/Seoul',
  }
  const data = natalToReportData(ctx, opts.lang, NOW)
  const cross = buildCrossRows(ctx, opts.lang, NOW)
  const html = renderToStaticMarkup(
    React.createElement(IntegratedReport, { data, cross, lang: opts.lang })
  )
  return { html, text: strip(html), data, cross }
}

const EMPTY_EN = 'Empty —'
const EMPTY_KO = '비어 있음 —'

describe('CR-5 — 하우스 미상은 미상으로', () => {
  for (const lang of ['en', 'ko'] as const) {
    it(`시각 미상(${lang}) — '0H'·빈 하우스 풀이·계산법·빈 축이 없다`, async () => {
      const { html, text, data } = await renderReport({ timeUnknown: true, lang })
      expect(data.astro.placeUnreliable).toBe(true)
      expect(text).not.toMatch(/(^|[^\d])0H\b/)
      expect(html).toContain('class="plH">—<')
      expect(text).not.toContain(lang === 'en' ? EMPTY_EN : EMPTY_KO)
      expect(text).toContain(UI.houseUnknownNote[lang])
      expect(text).not.toContain(UI.houseLab[lang])
      expect(text).toContain(UI.houseUnknownMeta[lang])
      expect(html).not.toMatch(
        /class="axisItem"><span>(First impression|Public face|첫인상|사회적 위치)</
      )
      expect(text).toContain(UI.timeUnknownTitle[lang])
      expect(text).toContain(UI.ascNoTime[lang])
      expect(text).not.toContain(UI.cityUnknownTitle[lang])
    })
  }

  it('도시 미상(시각은 앎) — 같은 처리 + 도시 미상 배너, 첫인상 안내는 출생지', async () => {
    const { html, text, data } = await renderReport({ cityUnknown: true, lang: 'en' })
    expect(data.astro.placeUnreliable).toBe(true)
    expect(text).not.toMatch(/(^|[^\d])0H\b/)
    expect(html).toContain('class="plH">—<')
    expect(text).not.toContain(EMPTY_EN)
    expect(text).toContain(UI.houseUnknownNote.en)
    expect(text).not.toContain(UI.houseLab.en)
    expect(text).toContain(UI.cityUnknownTitle.en)
    expect(text).not.toContain(UI.timeUnknownTitle.en)
    expect(text).toContain(UI.ascNoPlace.en)
    expect(text).not.toContain(UI.ascNoTime.en)
  })

  it('대조군(시각·도시 앎) — 하우스 번호·계산법이 그대로 나온다', async () => {
    const { html, text, data } = await renderReport({ lang: 'en' })
    expect(data.astro.placeUnreliable).toBe(false)
    expect(html).toMatch(/class="plH">\d{1,2}H</)
    expect(text).toContain(UI.houseLab.en)
    expect(text).not.toContain(UI.houseUnknownNote.en)
    expect(text).not.toContain(UI.cityUnknownTitle.en)
  })
})

describe('CR-4 — 체질 경향 카드는 사주 단독 카드', () => {
  for (const lang of ['en', 'ko'] as const) {
    it(`교차 톤 배지·'점성이 보는 결' 없이 오행 사실 한 줄(${lang})`, async () => {
      const { html, cross } = await renderReport({ timeUnknown: true, lang })
      const name = lang === 'en' ? 'Constitution' : '체질 경향'
      const cards = html.split('<div class="theme" ')
      const health = cards.find((c) => c.includes(`class="themeName">${name}`))!
      expect(health).toBeTruthy()
      expect(health).toContain(`class="themeBadge">${UI.healthBadge[lang]}<`)
      for (const tone of Object.values(TONE_LABEL)) expect(health).not.toContain(tone[lang])
      expect(health).not.toContain(UI.astroSide[lang])
      expect(health).not.toContain(UI.sajuSide[lang])
      expect(strip(health)).toMatch(lang === 'en' ? /Dominant: \w+/ : /우세: /)

      // 보이는 교차 톤 배지는 교차 행에서만 — 톤별 배지 수 = 톤별 교차 행 수.
      const badges = [...html.matchAll(/class="themeBadge">([^<]*)</g)].map((m) => m[1])
      for (const [tone, label] of Object.entries(TONE_LABEL)) {
        const shown = badges.filter((b) => b === label[lang]).length
        expect(shown, tone).toBe(cross.rows.filter((r) => r.tone === tone).length)
      }
      expect(badges.filter((b) => b === UI.healthBadge[lang])).toHaveLength(1)
    })
  }
})
