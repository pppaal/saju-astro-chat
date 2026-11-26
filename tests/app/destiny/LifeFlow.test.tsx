/**
 * v9.2 인생 흐름(/destiny) — LifeFlow 렌더(en · ko).
 *
 * 데이터: tests/fixtures/calendar/life-sample.json — 샘플 1997-03-21 14:30 여 서울, now 2026-11-19 의
 * assembleLifetime 페이로드(A4 데이터 층 포함, 실제 천체력으로 만든 덤프). 뷰모델은 서버와 같은
 * buildLifetimeViewModel 로 만든다.
 *
 *  - 섹션 순서: 히어로 → 읽기 → 겹침 → 축별 → 강점 → 곡선 → 시간표 → 전략 → 공유 → CTA → 푸터
 *  - 읽기에 'AI' 라벨 없음(엔진 템플릿 — FIX9b E8)
 *  - 집계 막대 칸의 합 = 전체 축 수(tallyCrossRows.total)
 *  - '두 체계가 같을 때만' 범례는 블록당 최대 하나
 *  - en 마크업에 한글 없음 · 이모지 없음
 *  - 겹침 행이 없으면(decadeCross = []) 정직한 빈 상태(오너 결정 13), 있으면 행 + 범례
 *  - 상담사 CTA v9 의 가격 줄 = creditsFromLabel(SSOT)
 *  - 공유 블록: mini 카드엔 화면 기둥, 공유 페이로드엔 이름 둘뿐
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }))
const apiFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }))
const trackFunnel = vi.fn()
vi.mock('@/lib/metrics/trackFunnel', () => ({
  trackFunnel: (...a: unknown[]) => trackFunnel(...a),
}))

import LifeFlow from '@/app/destiny/LifeFlow'
import { splitRiver } from '@/app/destiny/sections/LifeHero'
import { buildLifetimeViewModel } from '@/lib/calendar-view/lifetimeViewModel'
import { creditsFromLabel } from '@/lib/config/pricing'
import type { DestinyLifetime, DestinyUserSummary } from '@/types/calendar'

interface Sample {
  todayIso: string
  topbar: { birthDate: string; birthLine: string; place: string; ilganHanja: string }
  user: Pick<DestinyUserSummary, 'ilgan' | 'elements' | 'iljuArchetype'>
  lifetime: DestinyLifetime
}

const SAMPLE = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/calendar/life-sample.json'), 'utf-8')
) as Sample

const HANGUL = /[가-힣]/
const EMOJI = /\p{Extended_Pictographic}/u
const ORDER = [
  'hero',
  'reading',
  'overlap',
  'traits',
  'strengths',
  'curve',
  'decades',
  'strategy',
  'share',
]

function renderLife(lang: 'en' | 'ko', lifetime: DestinyLifetime = SAMPLE.lifetime) {
  const vm = buildLifetimeViewModel(
    { lifetime, user: SAMPLE.user },
    { lang, todayIso: SAMPLE.todayIso, calendarHref: '/calendar' }
  )
  const utils = render(
    <LifeFlow
      vm={vm}
      locale={lang}
      dayMaster={{ stem: '壬', element: 'water' }}
      chipStamp={lang === 'ko' ? '1997년 3월 21일' : '1997.3.21'}
      folioStamp={lang === 'ko' ? '1997년 3월 21일 14:30' : '1997.3.21 14:30'}
      folioRight="destinypal.com"
      river={splitRiver(SAMPLE.user.iljuArchetype?.[lang]?.character)}
    />
  )
  return { vm, ...utils }
}

const follows = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

beforeEach(() => {
  cleanup()
  apiFetch.mockReset()
  trackFunnel.mockReset()
})

describe('LifeFlow — 샘플(en)', () => {
  it('섹션 순서: hero → reading → overlap → traits → strengths → curve → decades → strategy → share → CTA → footer', () => {
    const { container } = renderLife('en')
    const sections = [...container.querySelectorAll('[data-life-section]')]
    expect(sections.map((e) => e.getAttribute('data-life-section'))).toEqual(ORDER)
    const share = container.querySelector('[data-life-section="share"]')!
    const cta = container.querySelector('[data-counselor-cta="v9"]')!
    const foot = container.querySelector('[data-v9-footer]')!
    expect(cta).toBeTruthy()
    expect(follows(share, cta)).toBe(true)
    expect(follows(cta, foot)).toBe(true)
    // 폴리오는 두 번 — 상단 바 아래와 푸터 위.
    const folios = [...container.querySelectorAll('[data-folio]')]
    expect(folios.map((f) => f.getAttribute('data-folio'))).toEqual(['top', 'end'])
    expect(follows(folios[1], foot)).toBe(true)
  })

  it('히어로: 인생 모양 · 1997–2081 · NOW 29 · NEXT LIFE TURN 35 (2033) · 일주 한 줄', () => {
    const { container } = renderLife('en')
    const hero = container.querySelector('[data-life-section="hero"]')!
    expect(hero.querySelector('h1')!.textContent).toBe('Ups anddowns')
    expect(hero.querySelector('h1 i')!.textContent).toBe('downs')
    expect(hero.textContent).toContain('Lifetime read · 1997–2081')
    expect(hero.querySelector('[data-readout="now"]')!.textContent).toContain('Age 29')
    const next = hero.querySelector('[data-readout="next-life-turn"]')!
    expect(next.textContent).toContain('Age 35')
    expect(next.textContent).toContain('2033')
    expect(next.textContent).toContain('The last expansion window before midlife.')
    expect(hero.textContent).toContain('A great river on dry ground — deep and responsible.')
    expect(hero.textContent).not.toMatch(/next major turn/i)
  })

  it("읽기에 'AI' 라벨이 없다 — 'Computed from your chart · same every time'", () => {
    const { container } = renderLife('en')
    const reading = container.querySelector('[data-life-section="reading"]')!
    expect(reading.textContent).toContain('Computed from your chart · same every time')
    expect(reading.textContent).not.toMatch(/\bAI\b/)
  })

  it('집계: 막대 칸 수의 합 = 전체 축 수, 범례 수 = 뷰모델 집계', () => {
    const { container, vm } = renderLife('en')
    const tally = container.querySelector('[data-life-section="traits"] [data-total]')!
    const total = vm.traits!.tally.total
    expect(Number(tally.getAttribute('data-total'))).toBe(total)
    const counts = [...tally.querySelectorAll('li b')].map((b) => Number(b.textContent))
    expect(counts.reduce((a, n) => a + n, 0)).toBe(total)
    expect(container.textContent).toContain(`Saju × stars · ${total} traits`)
    // 더 보기 — 리포트의 축 수(결핍 축 포함), 리포트 링크.
    const more = container.querySelector('[data-life-section="traits"] a')!
    expect(more.textContent).toContain(`${vm.traits!.reportTraitCount} traits in your full report`)
    expect(more.getAttribute('href')).toBe(vm.traits!.fullReportHref)
  })

  it('시각 미상 · 달 별자리가 바뀌는 날 — 축별 교차 아래 안내 캡션(QA-2), 아니면 없음', () => {
    const plain = renderLife('en')
    expect(plain.container.querySelector('[data-life-caveat]')).toBeNull()
    cleanup()
    const lifetime = {
      ...SAMPLE.lifetime,
      crossCheck: { ...SAMPLE.lifetime.crossCheck, moonSignMayDiffer: true },
    } as DestinyLifetime
    for (const [lang, text] of [
      ['en', 'Without a birth time, your Moon sign may differ.'],
      ['ko', '태어난 시각을 몰라 달의 별자리도 바뀔 수 있어요.'],
    ] as const) {
      const { container } = renderLife(lang, lifetime)
      const cap = container.querySelector('[data-life-section="traits"] [data-life-caveat]')
      expect(cap?.textContent).toBe(text)
      cleanup()
    }
  })

  it("'두 체계가 같을 때만' 범례는 블록당 최대 하나", () => {
    const { container } = renderLife('en')
    for (const sec of container.querySelectorAll('[data-life-section]')) {
      expect(sec.querySelectorAll('[data-legend]').length).toBeLessThanOrEqual(1)
    }
    expect(
      container.textContent!.match(/Timing signals appear only when both systems agree/g) ?? []
    ).toHaveLength(0)
  })

  it('en 마크업에 한글 없음 · 이모지 없음', () => {
    const { container } = renderLife('en')
    expect(container.innerHTML).not.toMatch(HANGUL)
    expect(container.textContent).not.toMatch(EMOJI)
  })

  it('겹침이 없으면 정직한 빈 상태(오너 결정 13) — 채움 행 없음', () => {
    expect(SAMPLE.lifetime.decadeCross).toEqual([])
    const { container, vm } = renderLife('en')
    const sec = container.querySelector('[data-life-section="overlap"]')!
    expect(sec.hasAttribute('data-empty')).toBe(true)
    expect(sec.querySelector('[data-overlap-empty]')!.textContent).toBe(vm.overlap.empty)
    expect(sec.querySelectorAll('[data-kind="timing"]')).toHaveLength(0)
    expect(sec.querySelector('[data-legend]')).toBeNull()
  })

  it('겹침 행이 있으면 교차 행 + 블록 맨 아래 범례 한 번 + 트랜짓 캡션', () => {
    const lifetime: DestinyLifetime = {
      ...SAMPLE.lifetime,
      decadeCross: [
        {
          saju: '정재',
          sajuEn: 'Direct Wealth',
          sajuHanja: '正財',
          sajuSource: { pillar: 'daeun', part: 'stem', gz: '丙午' },
          astro: '토성',
          astroEn: 'Saturn',
          astroEvent: { ko: '첫 토성 회귀', en: 'First Saturn return' },
          natal: { sign: 'Aries', deg: 9, min: 2 },
          dignity: 'fall',
          transit: { sign: 'Aries', deg: 8, min: 21 },
          meaning: '꾸준한 가치가 시간과 함께 단단해져요.',
          meaningEn: 'steady value hardens with time.',
          polarity: 2,
        },
      ] as DestinyLifetime['decadeCross'],
    }
    const { container } = renderLife('en', lifetime)
    const sec = container.querySelector('[data-life-section="overlap"]')!
    expect(sec.hasAttribute('data-empty')).toBe(false)
    const rows = sec.querySelectorAll('[data-kind="timing"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].getAttribute('data-mark')).toBe('up')
    expect(rows[0].textContent).toContain('Direct Wealth')
    expect(rows[0].textContent).toContain('First Saturn return · in fall · 9° Aries')
    const legends = sec.querySelectorAll('[data-legend]')
    expect(legends).toHaveLength(1)
    expect(follows(rows[0], legends[0])).toBe(true)
    expect(sec.textContent).toContain('Transit Saturn stands at 8°21′ Aries (Nov 19, 2026)')
  })

  it('강점 표: 타일 수 = N, 가장 센 결 STRONGEST 하나, 오행 띠 · 숨긴 시주 캡션', () => {
    const { container } = renderLife('en')
    const sec = container.querySelector('[data-life-section="strengths"]')!
    for (const row of sec.querySelectorAll('[data-thread]')) {
      const tiles = row.querySelectorAll('[data-tile]').length
      const n = Number(row.lastElementChild!.textContent)
      expect(tiles).toBe(n)
    }
    expect(sec.querySelectorAll('[data-strongest]')).toHaveLength(1)
    expect(sec.querySelector('[data-strongest]')!.getAttribute('data-thread')).toBe('status')
    expect(sec.textContent).toContain('Your strongest thread is Status.')
    expect(sec.querySelectorAll('[data-element]')).toHaveLength(5)
    expect(sec.textContent).toContain('including your hidden hour pillar 丁未')
  })

  it('시간표: 지금 행(丙午) · 올해 세운 줄과 캘린더 링크 · LIFE TURN 2033 은 丁未 행 · 캡션', () => {
    const { container } = renderLife('en')
    const sec = container.querySelector('[data-life-section="decades"]')!
    const now = sec.querySelector('[data-state="now"]')!
    expect(now.textContent).toContain('丙午')
    expect(now.textContent).toContain('You are here')
    expect(now.querySelector('a')!.getAttribute('href')).toBe('/calendar')
    const turn = sec.querySelector('[data-life-turn="2033"]')!
    expect(turn.closest('li')!.textContent).toContain('丁未')
    expect(sec.textContent).toContain('Themes name a decade’s topic, not its quality.')
  })

  it('곡선: 지금 바늘 · 다음 마루 표지 · 0–84세 범위', () => {
    const { container, vm } = renderLife('en')
    const sec = container.querySelector('[data-life-section="curve"]')!
    expect(sec.querySelector('[data-marker="now"]')!.textContent).toContain('NOW · 29')
    const crest = vm.curve!.markers.find((m) => m.kind === 'crest')!
    expect(sec.querySelector('[data-marker="crest"]')!.textContent).toBe(
      `${crest.age} · ${crest.year}`
    )
    expect(sec.textContent).toContain('Curve · age 0–84 · 1997–2081')
    expect(sec.textContent).toContain('1 div = 3 years')
  })

  it('상담사 CTA v9: 가격 줄 = creditsFromLabel(SSOT) · 퍼널 이벤트 destiny.counselor_cta', () => {
    const { container } = renderLife('en')
    const cta = container.querySelector('[data-counselor-cta="v9"]')!
    expect(cta.textContent).toContain('Ask the destiny counselor')
    const price = cta.querySelector('[data-price-line]')!
    expect(price.textContent).toContain('From 1 credit')
    expect(price.textContent).toContain(`Credits from ${creditsFromLabel('en')}`)
    fireEvent.click(cta.querySelector('a')!)
    expect(trackFunnel).toHaveBeenCalledWith('destiny.counselor_cta')
  })

  it('공유: mini 카드엔 화면 기둥(연 · 월 · 일), 링크 공유 본문엔 사주 타입 · 인생 모양만', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { url: 'https://destinypal.com/r/tok' } }),
    })
    const { container } = renderLife('en')
    const sec = container.querySelector('[data-life-section="share"]')!
    const card = sec.querySelector('[data-variant="mini"]')!
    expect(card.querySelector('[data-type-name]')!.textContent).toBe('steady-building Free Spirit')
    expect(card.querySelector('[data-life-shape]')!.textContent).toContain('Ups and downs')
    const tiles = [...card.querySelectorAll('[data-col] [data-tile]')].map((t) => t.textContent)
    expect(tiles.join('')).toBe('壬戌癸卯丁丑')
    fireEvent.click(sec.querySelector('[data-share="link"]')!)
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    const [url, init] = apiFetch.mock.calls[0] as [string, { body: string }]
    expect(url).toBe('/api/life/share')
    expect(JSON.parse(init.body)).toEqual({
      v: 2,
      isKo: false,
      crossType: 'steady-building Free Spirit',
      lifeShape: 'Ups and downs',
    })
    expect(init.body).not.toMatch(/\d{4}|壬|戌|birth/i)
    expect(trackFunnel).toHaveBeenCalledWith('destiny.share_link')
  })
})

describe('LifeFlow — 샘플(ko)', () => {
  it('같은 순서 · 한국어 제목 · 겹침 빈 상태 · 영어 판정 라벨 없음', () => {
    const { container } = renderLife('ko')
    const sections = [...container.querySelectorAll('[data-life-section]')]
    expect(sections.map((e) => e.getAttribute('data-life-section'))).toEqual(ORDER)
    expect(container.textContent).toContain('인생 흐름')
    expect(container.querySelector('h1')!.textContent).toBe('굴곡형')
    expect(container.querySelector('[data-overlap-empty]')!.textContent).toContain(
      '이번 10년엔 겹치는 신호가 없어요'
    )
    expect(container.textContent).not.toMatch(/Two pulls|Supportive|Favorable/)
    expect(container.textContent).not.toMatch(EMOJI)
    const price = container.querySelector('[data-price-line]')!
    expect(price.textContent).toContain(creditsFromLabel('ko'))
  })
})
