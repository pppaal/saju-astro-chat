import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// useI18n is consumed (locale only) by LifetimeTier and its inline sub-components.
// It throws without a real provider, so mock it with a mutable locale we flip per test.
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { LifetimeTier, type LifetimeTierProps } from '@/components/calendar/tiers/LifetimeTier'
import type {
  DestinyLifetime,
  DestinyLifeStage,
  DestinyUserSummary,
  DestinyDaewoon,
} from '@/types/calendar'

// ── fixtures ────────────────────────────────────────────────────────────────

function makeGanji(hanja = '甲子', kr = '갑자', en = 'gapja') {
  return { hanja, kr, en }
}

function makeDaewoon(over: Partial<DestinyDaewoon> = {}): DestinyDaewoon {
  return {
    gz: makeGanji(),
    start: over.start ?? 2000,
    end: over.end ?? 2010,
    startAge: over.startAge ?? 10,
    endAge: over.endAge ?? 20,
    sibsin: over.sibsin ?? '편재',
    known: over.known ?? true,
    now: over.now,
    ...over,
  }
}

function makeStage(over: Partial<DestinyLifeStage> = {}): DestinyLifeStage {
  return {
    id: over.id ?? 'early',
    name: over.name ?? '초년기',
    nameEn: over.nameEn ?? 'Early years',
    ageFrom: over.ageFrom ?? 0,
    ageTo: over.ageTo ?? 20,
    yearFrom: over.yearFrom ?? 1990,
    yearTo: over.yearTo ?? 2010,
    now: over.now ?? false,
    tone: over.tone ?? '현실 성취의 무대',
    toneEn: over.toneEn ?? 'The stage of real-world results',
    detail: over.detail ?? null,
  }
}

function makeUser(
  over: Partial<DestinyUserSummary & { gyeokgukStatus?: string; rootStatus?: string }> = {}
) {
  return {
    birth: '1990-06-15 12:00',
    birthKo: '1990년 6월 15일 12:00',
    place: '서울',
    sex: '남',
    ilgan: { hanja: '甲', kr: '갑목', en: 'Gap', element: '목' },
    yongsin: { hanja: '火', kr: '화', en: 'Fire', primary: '화', secondary: '토', avoid: [] },
    huisin: { hanja: '土', kr: '토', en: 'Earth', primary: '토', avoid: [] },
    gyeokguk: '정인격',
    gyeokgukEn: 'Direct Resource',
    gangyak: '중화',
    dominantSibsin: { name: '정인', pct: 30 },
    elements: { 목: 3, 화: 1, 토: 2, 금: 1, 수: 1 },
    astro: {
      sun: '쌍둥이자리',
      asc: '양자리',
      mc: '염소자리',
      sunEn: 'Gemini',
      ascEn: 'Aries',
      mcEn: 'Capricorn',
    },
    dignities: [],
    almutenFiguris: { planet: 'Sun', score: 5 },
    sect: 'day',
    lots: [],
    intro: '본명 소개 한 줄.',
    introEn: 'Natal intro line.',
    ...over,
  } as LifetimeTierProps['user']
}

function makeLifetime(over: Partial<DestinyLifetime> = {}): DestinyLifetime {
  return {
    birthYear: 1990,
    currentYear: 2026,
    daewoon: over.daewoon ?? [
      makeDaewoon({ start: 1990, end: 2000, startAge: 0, endAge: 10 }),
      makeDaewoon({
        start: 2020,
        end: 2030,
        startAge: 30,
        endAge: 40,
        now: true,
        gz: makeGanji('乙亥', '을해', 'eulhae'),
      }),
    ],
    lifeStages: over.lifeStages ?? [
      makeStage({ id: 'early', name: '초년기' }),
      makeStage({ id: 'youth', name: '청년기', now: true, ageFrom: 20, ageTo: 40 }),
    ],
    milestones: over.milestones ?? [
      { year: 2024, age: 34, label: '첫 토성 회귀 — 어른됨의 통과의례', kind: 'saturn' },
      { year: 2026, age: 36, label: '대운 전환 — 새 무대', kind: 'daewoon', now: true },
    ],
    zrSpiritChapters: over.zrSpiritChapters ?? [],
    zrFortuneChapters: over.zrFortuneChapters ?? [],
    lifePattern: over.lifePattern,
    ...over,
  }
}

const noop = () => {}

// The jargon fold is the only <details> on the surface. Everything outside it is
// the "main surface" the redesign keeps plain.
function getFold(container: HTMLElement): HTMLDetailsElement {
  const d = container.querySelector('details')
  if (!d) throw new Error('expected the jargon <details> fold to be present')
  return d as HTMLDetailsElement
}

// Returns the subtree of the main surface with the fold removed, so text queries
// only see what a user reads before expanding "자세한 신호 보기". The clone is
// attached to the document so Testing Library's "in the document" check passes;
// afterEach detaches it again.
const detachedSurfaces: HTMLElement[] = []
function mainSurface(container: HTMLElement): HTMLElement {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelector('details')?.remove()
  document.body.appendChild(clone)
  detachedSurfaces.push(clone)
  return clone
}

beforeEach(() => {
  mockLocale = 'ko'
})

afterEach(() => {
  for (const el of detachedSurfaces.splice(0)) el.remove()
})

describe('LifetimeTier — Seasons Path redesign', () => {
  describe('empty / loading guard', () => {
    it('renders a loading placeholder (ko) when lifeStages is empty', () => {
      render(
        <LifetimeTier user={makeUser()} lifetime={makeLifetime({ lifeStages: [] })} onDive={noop} />
      )
      expect(screen.getByText('본명 정보를 불러오는 중...')).toBeInTheDocument()
    })

    it('renders the loading placeholder in English', () => {
      mockLocale = 'en'
      render(
        <LifetimeTier user={makeUser()} lifetime={makeLifetime({ lifeStages: [] })} onDive={noop} />
      )
      expect(screen.getByText('Loading natal data...')).toBeInTheDocument()
    })
  })

  describe('hero (ko)', () => {
    it('renders the plain "내 인생의 길" headline and a plain intro line', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('인생 · LIFETIME · 84년')).toBeInTheDocument()
      expect(screen.getByText('내 인생의 길')).toBeInTheDocument()
      expect(screen.getByText(/봄에서 겨울까지, 계절을 지나는 길/)).toBeInTheDocument()
    })

    it('renders the plain lifePattern headline + line on the main surface (no jargon)', () => {
      const lifetime = makeLifetime({
        lifePattern: {
          key: 'late-bloom',
          ko: '대기만성형',
          en: 'Late bloomer',
          line: '천천히 무르익는 흐름.',
          lineEn: 'A slowly ripening flow.',
          daeun: [
            { startAge: 10, gz: '甲子', favor: 1 },
            { startAge: 30, gz: '丙寅', favor: 2 },
          ],
        },
      })
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />
      )
      const surface = mainSurface(container)
      expect(within(surface).getByText('대기만성형')).toBeInTheDocument()
      expect(within(surface).getByText('천천히 무르익는 흐름.')).toBeInTheDocument()
    })
  })

  describe('hero (en)', () => {
    it('renders English eyebrow + headline', () => {
      mockLocale = 'en'
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('LIFETIME · 84 years')).toBeInTheDocument()
      expect(screen.getByText('The path of my life')).toBeInTheDocument()
    })
  })

  describe('seasons path', () => {
    it('renders a felt season node per life stage with a "지금" marker on the current one', () => {
      const lifetime = makeLifetime({
        lifeStages: [
          makeStage({ id: 'early', name: '초년기', ageFrom: 0, ageTo: 20 }),
          makeStage({ id: 'youth', name: '청년기', now: true, ageFrom: 20, ageTo: 40 }),
          makeStage({ id: 'middle', name: '중년기', ageFrom: 40, ageTo: 60 }),
          makeStage({ id: 'late', name: '장년기', ageFrom: 60, ageTo: 84 }),
        ],
      })
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />
      )
      const surface = mainSurface(container)
      // four felt seasons rendered plainly on the main surface.
      expect(within(surface).getByText('봄')).toBeInTheDocument()
      expect(within(surface).getByText('여름')).toBeInTheDocument()
      expect(within(surface).getByText('가을')).toBeInTheDocument()
      expect(within(surface).getByText('겨울')).toBeInTheDocument()
      // felt theme labels (plain-language, no jargon).
      expect(within(surface).getByText('싹트는 봄')).toBeInTheDocument()
      expect(within(surface).getByText('쌓아가는 여름')).toBeInTheDocument()
      // the current stage carries the 지금 marker.
      expect(within(surface).getAllByText('지금').length).toBeGreaterThan(0)
    })

    it('renders English season labels in EN locale (no Hangul season names)', () => {
      mockLocale = 'en'
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />
      )
      const surface = mainSurface(container)
      expect(within(surface).getByText('Spring')).toBeInTheDocument()
      expect(within(surface).getByText('Building summer')).toBeInTheDocument()
      expect(within(surface).getAllByText('now').length).toBeGreaterThan(0)
      expect(within(surface).queryByText('봄')).not.toBeInTheDocument()
      expect(within(surface).queryByText('여름')).not.toBeInTheDocument()
    })

    it('fires onDive when the current season node is clicked', () => {
      const onDive = vi.fn()
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={onDive} />)
      const nowCard = screen.getByText('탭하면 올해로 ↘').closest('div')!
      fireEvent.click(nowCard)
      expect(onDive).toHaveBeenCalledTimes(1)
    })

    it('fires onDive when the current season node receives Enter', () => {
      const onDive = vi.fn()
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={onDive} />)
      const nowCard = screen.getByText('탭하면 올해로 ↘').closest('div')!
      fireEvent.keyDown(nowCard, { key: 'Enter' })
      expect(onDive).toHaveBeenCalledTimes(1)
    })
  })

  describe('life turning points (plain, no ganji)', () => {
    it('renders milestone heads + meaning plainly on the main surface', () => {
      const lifetime = makeLifetime({
        milestones: [
          {
            year: 2024,
            age: 34,
            label: '첫 토성 회귀 — 어른됨의 통과의례',
            meaning: '책임을 처음 온전히 짊어지는 시기.',
            kind: 'saturn',
          },
          { year: 2026, age: 36, label: '대운 전환 — 새 무대', kind: 'daewoon', now: true },
        ],
      })
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />
      )
      const surface = mainSurface(container)
      expect(within(surface).getByText('인생의 큰 마디')).toBeInTheDocument()
      // plain head only (no '—' tail, no ganji).
      expect(within(surface).getByText('첫 토성 회귀')).toBeInTheDocument()
      expect(within(surface).getByText('책임을 처음 온전히 짊어지는 시기.')).toBeInTheDocument()
      // current turn carries 지금 inside the turn list (now badge).
      expect(within(surface).getAllByText('지금').length).toBeGreaterThan(0)
    })

    it('renders English milestone labels in EN locale', () => {
      mockLocale = 'en'
      const lifetime = makeLifetime({
        milestones: [
          {
            year: 2024,
            age: 34,
            label: '첫 토성 회귀 — 어른됨의 통과의례',
            labelEn: 'First Saturn return — a rite of adulthood',
            meaning: '책임의 시기.',
            meaningEn: 'A season of responsibility.',
            kind: 'saturn',
          },
        ],
      })
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />
      )
      const surface = mainSurface(container)
      expect(within(surface).getByText('First Saturn return')).toBeInTheDocument()
      expect(within(surface).getByText('A season of responsibility.')).toBeInTheDocument()
      expect(within(surface).queryByText(/첫 토성 회귀/)).not.toBeInTheDocument()
    })
  })

  describe('anti-fatalism forecast footer', () => {
    it('renders the seasonal-forecast disclaimer (ko)', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(
        screen.getByText(/앞날은 정해진 운명이 아니라 지금 기운으로 본 계절 예보/)
      ).toBeInTheDocument()
    })

    it('renders the disclaimer in English', () => {
      mockLocale = 'en'
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText(/not fixed fate but a seasonal forecast/)).toBeInTheDocument()
    })
  })

  // ── the heart of the redesign: jargon must NOT be on the main surface ──
  describe('jargon is hidden on the main surface', () => {
    it('keeps 일간/격국/용신 hanja chips, Sun/Asc/MC and element bars out of the main surface', () => {
      const { container } = render(
        <LifetimeTier
          user={makeUser({ gyeokgukStatus: '정인격 · 반성반파', rootStatus: '월령 寅 실령' })}
          lifetime={makeLifetime()}
          onDive={noop}
        />
      )
      const surface = mainSurface(container)
      // chip labels live in the fold, not the main surface.
      expect(within(surface).queryByText('일간')).not.toBeInTheDocument()
      expect(within(surface).queryByText('격국')).not.toBeInTheDocument()
      expect(within(surface).queryByText('용신')).not.toBeInTheDocument()
      // raw natal/astro signals are not on the main surface.
      expect(within(surface).queryByText(/Sun Gemini/)).not.toBeInTheDocument()
      expect(within(surface).queryByText(/Asc Aries/)).not.toBeInTheDocument()
      expect(within(surface).queryByText(/사주 8자 오행 분포/)).not.toBeInTheDocument()
    })

    it('renders 일간/격국/용신 chips, ohang bars + astro meta inside the fold', () => {
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />
      )
      const fold = getFold(container)
      expect(within(fold).getByText('일간')).toBeInTheDocument()
      expect(within(fold).getByText('격국')).toBeInTheDocument()
      expect(within(fold).getByText('용신')).toBeInTheDocument()
      expect(within(fold).getByText(/사주 8자 오행 분포 — 목\(木\) 최다/)).toBeInTheDocument()
      expect(within(fold).getByText(/Sun Gemini · Asc Aries · MC Capricorn/)).toBeInTheDocument()
      // fold summary label.
      expect(within(fold).getByText(/자세한 신호 보기/)).toBeInTheDocument()
    })

    it('keeps Arabic Lots, ZR carousel and daeun ganji spine inside the fold', () => {
      const ch = {
        sign: 'Sagittarius',
        ruler: 'Jupiter',
        calendarStartYear: 2010,
        calendarEndYear: 2022,
        durationYears: 12,
        now: true,
        startLot: 'spirit',
        level: 1,
        index: 0,
      }
      const lifetime = makeLifetime({
        zrSpiritChapters: [ch as never],
        zrFortuneChapters: [{ ...ch, startLot: 'fortune', sign: 'Cancer', ruler: 'Moon' } as never],
      })
      const user = makeUser({
        lots: [
          { name: 'Fortune', sign: 'Leo', degree: 12.4, house: 5, sect: 'day', korean: '복점' },
        ] as never,
      })
      const { container } = render(<LifetimeTier user={user} lifetime={lifetime} onDive={noop} />)
      const surface = mainSurface(container)
      const fold = getFold(container)
      // Lots + ZR carousel only inside the fold.
      expect(within(surface).queryByText(/Arabic Lots/)).not.toBeInTheDocument()
      expect(within(surface).queryByText('SPIRIT')).not.toBeInTheDocument()
      expect(within(fold).getByText('본명 7대 점(點) · Arabic Lots')).toBeInTheDocument()
      expect(within(fold).getByText('복점')).toBeInTheDocument()
      expect(within(fold).getByText('ZR L1 챕터 · Zodiacal Releasing')).toBeInTheDocument()
      expect(within(fold).getByText('SPIRIT')).toBeInTheDocument()
    })
  })

  describe('detail (fold) — stage detail block', () => {
    it('renders detail body + hapchung/shinsal/unseong cards + outer chip inside the fold', () => {
      const lifetime = makeLifetime({
        lifeStages: [
          makeStage({
            id: 'youth',
            name: '청년기',
            now: true,
            detail: {
              daewoonText: '乙亥(을해) 2016–26',
              body: ['청년기 본문 한 단락.'],
              bodyEn: ['Young-adult body paragraph.'],
              outer: [{ label: '토성 회귀', date: '2024.06', body: '책임의 시기', kind: 'saturn' }],
              hapchung: { title: '寅亥 육합', romaji: 'in-hae', body: '합 설명' },
              shinsal: { title: '겁살', body: '신살 설명' },
              unseong: { title: '제왕', body: '운성 설명' },
            },
          }),
        ],
      })
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />
      )
      const fold = getFold(container)
      expect(within(fold).getByText('청년기 본문 한 단락.')).toBeInTheDocument()
      expect(within(fold).getByText('寅亥 육합')).toBeInTheDocument()
      expect(within(fold).getByText('겁살')).toBeInTheDocument()
      expect(within(fold).getByText('제왕')).toBeInTheDocument()
      expect(within(fold).getByText('토성 회귀')).toBeInTheDocument()
    })
  })

  describe('dive button', () => {
    it('fires onDive from the bottom zoom-in button (ko)', () => {
      const onDive = vi.fn()
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={onDive} />)
      fireEvent.click(screen.getByRole('button', { name: /올해 2026으로 줌인/ }))
      expect(onDive).toHaveBeenCalledTimes(1)
    })

    it('renders the English zoom-in button label', () => {
      mockLocale = 'en'
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByRole('button', { name: /Zoom in to 2026/ })).toBeInTheDocument()
    })
  })

  // ── i18n leak guards — EN locale must NOT render KO-baked data fields ──
  describe('i18n (EN locale picks English data fields, no Korean leaks)', () => {
    it('season cards render nameEn / toneEn in EN (no Korean stage names)', () => {
      mockLocale = 'en'
      const lifetime = makeLifetime({
        lifeStages: [
          makeStage({
            id: 'early',
            name: '초년기',
            nameEn: 'Early years',
            tone: '또래 속 주체성',
            toneEn: 'Agency among peers',
          }),
          makeStage({
            id: 'youth',
            name: '청년기',
            nameEn: 'Young adulthood',
            now: true,
            ageFrom: 20,
            ageTo: 40,
            tone: '현실 성취의 무대',
            toneEn: 'The stage of real-world results',
          }),
        ],
      })
      const { container } = render(
        <LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />
      )
      const surface = mainSurface(container)
      expect(within(surface).getByText('Early years')).toBeInTheDocument()
      expect(within(surface).getByText('Young adulthood')).toBeInTheDocument()
      expect(within(surface).queryByText('초년기')).not.toBeInTheDocument()
      expect(within(surface).queryByText('청년기')).not.toBeInTheDocument()
      expect(within(surface).getByText('Agency among peers')).toBeInTheDocument()
      expect(within(surface).getByText('The stage of real-world results')).toBeInTheDocument()
      expect(within(surface).queryByText('또래 속 주체성')).not.toBeInTheDocument()
    })

    it('lifePattern hero + fold id-card render English (no KO leak)', () => {
      mockLocale = 'en'
      const lifetime = makeLifetime({
        lifePattern: {
          key: 'late-bloom',
          ko: '대기만성형',
          en: 'Late bloomer',
          line: '천천히 무르익는 흐름.',
          lineEn: 'A slowly ripening flow.',
          daeun: [
            { startAge: 10, gz: '甲子', favor: 1 },
            { startAge: 30, gz: '丙寅', favor: 2 },
          ],
        },
      })
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      // life-type heading (in fold) uses en.
      expect(screen.getByText('Life type · Late bloomer')).toBeInTheDocument()
      expect(screen.getAllByText('Late bloomer').length).toBeGreaterThan(0)
      expect(screen.getAllByText('A slowly ripening flow.').length).toBeGreaterThan(0)
      expect(screen.queryByText('대기만성형')).not.toBeInTheDocument()
      expect(screen.queryByText('천천히 무르익는 흐름.')).not.toBeInTheDocument()
    })

    it('natal lots row (fold) renders English sign in EN', () => {
      mockLocale = 'en'
      const user = makeUser({
        lots: [
          { name: 'Fortune', sign: 'Leo', degree: 12.4, house: 5, sect: 'day', korean: '복점' },
        ] as never,
      })
      render(<LifetimeTier user={user} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText(/Leo 12° · 5H/)).toBeInTheDocument()
      expect(screen.queryByText(/사자자리/)).not.toBeInTheDocument()
    })
  })
})
