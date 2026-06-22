import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// useI18n is consumed (locale only) by LifetimeTier and its inline sub-components
// + the shared atoms (CrossingList / TierSummary / Ganji / LayerTag). It throws
// without a real provider, so mock it with a mutable locale we can flip per test.
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
    tone: over.tone ?? '편재 — 현실 성취의 무대',
    toneEn: over.toneEn ?? 'Wealth — the stage of real-world results',
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

beforeEach(() => {
  mockLocale = 'ko'
})

describe('LifetimeTier', () => {
  describe('empty / loading guard', () => {
    it('renders a loading placeholder (ko) when lifeStages is empty', () => {
      const props: LifetimeTierProps = {
        user: makeUser(),
        lifetime: makeLifetime({ lifeStages: [] }),
        onDive: noop,
      }
      render(<LifetimeTier {...props} />)
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

  describe('intro header (ko)', () => {
    it('renders the lifetime eyebrow + display heading', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('인생 · LIFETIME · 84년')).toBeInTheDocument()
      expect(screen.getByText('내 인생 전체 흐름')).toBeInTheDocument()
    })

    it('renders the birth/place/sex meta line', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText(/1990년 6월 15일 12:00/)).toBeInTheDocument()
    })

    it('shows astro segments when astro fields present', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText(/Sun Gemini · Asc Aries · MC Capricorn/)).toBeInTheDocument()
    })

    it('hides astro segments when astro fields are blank', () => {
      const user = makeUser({
        astro: {
          sun: '',
          asc: '',
          mc: '',
          sunEn: '' as never,
          ascEn: '' as never,
          mcEn: '' as never,
        },
      })
      render(<LifetimeTier user={user} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.queryByText(/Sun /)).not.toBeInTheDocument()
    })
  })

  describe('intro header (en)', () => {
    it('renders English eyebrow + heading', () => {
      mockLocale = 'en'
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('LIFETIME · 84 years')).toBeInTheDocument()
      expect(screen.getByText('My whole life')).toBeInTheDocument()
    })
  })

  describe('detail chips', () => {
    it('shows gyeokgukStatus when provided, falling back to gyeokguk otherwise', () => {
      const { rerender } = render(
        <LifetimeTier
          user={makeUser({ gyeokgukStatus: '정인격 · 반성반파' })}
          lifetime={makeLifetime()}
          onDive={noop}
        />
      )
      expect(screen.getByText('정인격 · 반성반파')).toBeInTheDocument()

      rerender(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      // gyeokguk appears in the structure chip when status absent.
      expect(screen.getAllByText('정인격').length).toBeGreaterThan(0)
    })

    it('uses 통근 label when rootStatus present, 주십신 otherwise', () => {
      const { rerender } = render(
        <LifetimeTier
          user={makeUser({ rootStatus: '월령 寅 실령 · 통근 얇음' })}
          lifetime={makeLifetime()}
          onDive={noop}
        />
      )
      expect(screen.getByText('통근')).toBeInTheDocument()
      expect(screen.getByText('월령 寅 실령 · 통근 얇음')).toBeInTheDocument()

      rerender(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('주십신')).toBeInTheDocument()
      expect(screen.getByText('정인 30%')).toBeInTheDocument()
    })

    it('computes the dominant element label from user.elements (ko)', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      // elements = 목:3 dominant.
      expect(screen.getByText(/사주 8자 오행 분포 — 목\(木\) 최다/)).toBeInTheDocument()
    })
  })

  describe('life pattern + life curve', () => {
    it('renders the life type heading and LifeCurve when daeun has >= 2 entries', () => {
      const lifetime = makeLifetime({
        lifePattern: {
          key: 'late-bloom',
          ko: '대기만성형',
          en: 'Late bloomer',
          line: '천천히 무르익는 흐름.',
          lineEn: 'A slowly ripening flow.',
          daeun: [
            { startAge: 10, gz: '甲子', favor: 1 },
            { startAge: 20, gz: '乙丑', favor: -1 },
            { startAge: 30, gz: '丙寅', favor: 2 },
          ],
        },
      })
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      expect(screen.getByText('인생 유형 · 대기만성형')).toBeInTheDocument()
      // life curve label.
      expect(screen.getByText('인생 곡선 · 운세 기복')).toBeInTheDocument()
    })

    it('omits the LifeCurve when fewer than 2 daeun favor points', () => {
      const lifetime = makeLifetime({
        lifePattern: {
          key: 'x',
          ko: '단일',
          line: '한 점.',
          daeun: [{ startAge: 10, gz: '甲子', favor: 1 }],
        },
      })
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      expect(screen.queryByText('인생 곡선 · 운세 기복')).not.toBeInTheDocument()
    })
  })

  describe('constellation stage cards', () => {
    it('renders a card per life stage with the now tag on the current one', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('초년기')).toBeInTheDocument()
      expect(screen.getByText('청년기')).toBeInTheDocument()
      expect(screen.getByText('지금 · NOW')).toBeInTheDocument()
    })

    it('fires onDive when the current stage card is clicked', () => {
      const onDive = vi.fn()
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={onDive} />)
      // current stage card carries role=button; click it.
      const nowCard = screen.getByText('탭하면 올해로 줌인 ↘').closest('div')!
      fireEvent.click(nowCard)
      expect(onDive).toHaveBeenCalledTimes(1)
    })

    it('fires onDive when current stage card receives Enter key', () => {
      const onDive = vi.fn()
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={onDive} />)
      const nowCard = screen.getByText('탭하면 올해로 줌인 ↘').closest('div')!
      fireEvent.keyDown(nowCard, { key: 'Enter' })
      expect(onDive).toHaveBeenCalledTimes(1)
    })
  })

  describe('stage detail block', () => {
    it('renders detail body + hapchung/shinsal/unseong cards when a stage has detail', () => {
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
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      expect(screen.getByText('청년기 본문 한 단락.')).toBeInTheDocument()
      expect(screen.getByText('寅亥 육합')).toBeInTheDocument()
      expect(screen.getByText('겁살')).toBeInTheDocument()
      expect(screen.getByText('제왕')).toBeInTheDocument()
      // outer-planet return chip.
      expect(screen.getByText('토성 회귀')).toBeInTheDocument()
    })
  })

  describe('natal lots row', () => {
    it('renders a chip per lot when user.lots is populated', () => {
      const user = makeUser({
        lots: [
          { name: 'Fortune', sign: 'Leo', degree: 12.4, house: 5, sect: 'day', korean: '복점' },
          { name: 'Spirit', sign: 'Aries', degree: 3.1, house: 1, sect: 'day' },
        ] as never,
      })
      render(<LifetimeTier user={user} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('본명 7대 점(點) · Arabic Lots')).toBeInTheDocument()
      expect(screen.getByText('복점')).toBeInTheDocument()
      // Spirit has no korean → falls back to name.
      expect(screen.getByText('Spirit')).toBeInTheDocument()
    })

    it('omits the lots row when no lots', () => {
      render(<LifetimeTier user={makeUser({ lots: [] })} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.queryByText('본명 7대 점(點) · Arabic Lots')).not.toBeInTheDocument()
    })
  })

  describe('ZR carousel', () => {
    it('renders ZR lanes when spirit/fortune chapters exist', () => {
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
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      expect(screen.getByText('ZR L1 챕터 · Zodiacal Releasing')).toBeInTheDocument()
      expect(screen.getByText('SPIRIT')).toBeInTheDocument()
      expect(screen.getByText('FORTUNE')).toBeInTheDocument()
    })
  })

  describe('milestone timeline + dive button', () => {
    it('renders milestone labels and the now marker', () => {
      render(<LifetimeTier user={makeUser()} lifetime={makeLifetime()} onDive={noop} />)
      expect(screen.getByText('분기점 타임라인')).toBeInTheDocument()
      // milestone label appears in both the pivot list and the milestone track.
      expect(screen.getAllByText(/첫 토성 회귀/).length).toBeGreaterThan(0)
      expect(screen.getByText('← 지금')).toBeInTheDocument()
    })

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
    const HANGUL = /[가-힣]/

    it('stage cards render nameEn / toneEn in EN (no Hangul)', () => {
      mockLocale = 'en'
      const lifetime = makeLifetime({
        lifeStages: [
          makeStage({
            id: 'early',
            name: '초년기',
            nameEn: 'Early years',
            tone: '비겁 — 또래 속 주체성',
            toneEn: 'Peer — agency among peers',
          }),
          makeStage({
            id: 'youth',
            name: '청년기',
            nameEn: 'Young adulthood',
            now: true,
            ageFrom: 20,
            ageTo: 40,
            tone: '편재 — 현실 성취의 무대',
            toneEn: 'Wealth — the stage of real-world results',
          }),
        ],
      })
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      // English stage names present.
      expect(screen.getByText('Early years')).toBeInTheDocument()
      expect(screen.getByText('Young adulthood')).toBeInTheDocument()
      // Korean stage names absent.
      expect(screen.queryByText('초년기')).not.toBeInTheDocument()
      expect(screen.queryByText('청년기')).not.toBeInTheDocument()
      // EN tone present, KO tone absent (each stage has a distinct tone here).
      expect(screen.getByText('Wealth — the stage of real-world results')).toBeInTheDocument()
      expect(screen.getByText('Peer — agency among peers')).toBeInTheDocument()
      expect(screen.queryByText('편재 — 현실 성취의 무대')).not.toBeInTheDocument()
      expect(screen.queryByText('비겁 — 또래 속 주체성')).not.toBeInTheDocument()
    })

    it('lifePattern id-card + life-type heading render English (no KO leak)', () => {
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
      // life-type heading uses en.
      expect(screen.getByText('Life type · Late bloomer')).toBeInTheDocument()
      // id-card type (Late bloomer) + lineEn rendered; KO variants absent.
      expect(screen.getAllByText('Late bloomer').length).toBeGreaterThan(0)
      expect(screen.getAllByText('A slowly ripening flow.').length).toBeGreaterThan(0)
      expect(screen.queryByText('대기만성형')).not.toBeInTheDocument()
      expect(screen.queryByText('천천히 무르익는 흐름.')).not.toBeInTheDocument()
    })

    it('ZR chapter sign renders English zodiac name in EN (not Korean 자리)', () => {
      mockLocale = 'en'
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
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      // English sign names appear (in ZR carousel cells).
      expect(screen.getAllByText('Sagittarius').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Cancer').length).toBeGreaterThan(0)
      // Korean zodiac labels (사수자리/궁수자리, 게자리) must not appear.
      expect(screen.queryByText('사수자리')).not.toBeInTheDocument()
      expect(screen.queryByText('궁수자리')).not.toBeInTheDocument()
      expect(screen.queryByText('게자리')).not.toBeInTheDocument()
    })

    it('natal lots row renders English sign in EN', () => {
      mockLocale = 'en'
      const user = makeUser({
        lots: [
          { name: 'Fortune', sign: 'Leo', degree: 12.4, house: 5, sect: 'day', korean: '복점' },
        ] as never,
      })
      render(<LifetimeTier user={user} lifetime={makeLifetime()} onDive={noop} />)
      // sign text "Leo 12° · 5H" — English sign, not 사자자리.
      expect(screen.getByText(/Leo 12° · 5H/)).toBeInTheDocument()
      expect(screen.queryByText(/사자자리/)).not.toBeInTheDocument()
    })

    it('stage detail body renders bodyEn in EN; outer + shinsal toggle to EN', () => {
      mockLocale = 'en'
      const lifetime = makeLifetime({
        lifeStages: [
          makeStage({
            id: 'youth',
            name: '청년기',
            nameEn: 'Young adulthood',
            now: true,
            detail: {
              daewoonText: '乙亥(을해) 2016–26',
              body: ['청년기 한국어 본문.'],
              bodyEn: ['Young-adult English body line.'],
              outer: [
                {
                  label: '토성 회귀',
                  labelEn: 'Saturn return',
                  date: '2024.06',
                  body: '책임의 시기',
                  bodyEn: 'a season of responsibility',
                  kind: 'saturn',
                },
              ],
              shinsal: {
                title: '신살 활성',
                kind: 'shinsal',
                body: '겁살 활성 — 재물·신뢰 도전',
                bodyEn: 'Geopsal active — trials around wealth and trust',
              },
            },
          }),
        ],
      })
      render(<LifetimeTier user={makeUser()} lifetime={lifetime} onDive={noop} />)
      // body picks bodyEn.
      expect(screen.getByText('Young-adult English body line.')).toBeInTheDocument()
      expect(screen.queryByText('청년기 한국어 본문.')).not.toBeInTheDocument()
      // outer chip picks labelEn / bodyEn.
      expect(screen.getByText('Saturn return')).toBeInTheDocument()
      expect(screen.queryByText('토성 회귀')).not.toBeInTheDocument()
      // shinsal title localized + bodyEn rendered.
      expect(screen.getByText('Shinsal active')).toBeInTheDocument()
      expect(
        screen.getByText('Geopsal active — trials around wealth and trust')
      ).toBeInTheDocument()
      expect(screen.queryByText('신살 활성')).not.toBeInTheDocument()
      expect(screen.queryByText('겁살 활성 — 재물·신뢰 도전')).not.toBeInTheDocument()
    })
  })
})
