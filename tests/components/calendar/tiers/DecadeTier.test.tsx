import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// useI18n 은 locale 만 읽힌다 — mutable 변수로 ko/en 토글.
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { DecadeTier } from '@/components/calendar/tiers/DecadeTier'
import type { DecadeTierProps } from '@/components/calendar/tiers/DecadeTier'
import type { Ganji } from '@/types/calendar'

function gz(hanja: string, kr = '', en = ''): Ganji {
  return { hanja, kr, en }
}

function makeUser(over: Partial<DecadeTierProps['user']> = {}): DecadeTierProps['user'] {
  return {
    birth: '1990-05-21 14:30',
    birthKo: '1990년 5월 21일 14:30',
    place: '서울',
    sex: '여',
    ilgan: { hanja: '甲', kr: '갑목', en: 'Gap · Yang Wood', element: '목' },
    yongsin: { hanja: '火', kr: '화', en: 'Fire', primary: '화', avoid: [] },
    huisin: { hanja: '土', kr: '토', en: 'Earth', primary: '토', avoid: [] },
    gyeokguk: '정인격',
    gyeokgukEn: 'Jeong-in (Direct Resource)',
    gangyak: '중화',
    dominantSibsin: { name: '정인', pct: 30 },
    elements: { 목: 2, 화: 1, 토: 2, 금: 2, 수: 1 },
    astro: {
      sun: '황소자리',
      asc: '사자자리',
      mc: '양자리',
      sunEn: 'Taurus',
      ascEn: 'Leo',
      mcEn: 'Aries',
    },
    dignities: [],
    almutenFiguris: { planet: 'Sun', score: 5 },
    sect: 'day',
    lots: [],
    intro: '소개',
    introEn: 'intro',
    gyeokgukStatus: '정인격 · 반성반파 (+정인 / -재성)',
    rootStatus: '월령 寅 실령 · 통근 얇음',
    ...over,
  }
}

function makeDecade(over: Partial<DecadeTierProps['decade']> = {}): DecadeTierProps['decade'] {
  return {
    gz: gz('甲戌', '갑술', 'gapsul'),
    start: 2020,
    end: 2030,
    ageFrom: 30,
    ageTo: 39,
    sibsin: '편재',
    theme: '현실 성취 · 재물의 무대',
    themeEn: 'Wealth · Worldly Achievement',
    headline: '재물과 성취의 10년',
    headlineEn: 'A decade of wealth and achievement',
    pillar: {
      cheongan: { hanja: '甲', sibsin: '편재', el: '목(木)', element: '목', note: '천간 노트' },
      jiji: { hanja: '戌', sibsin: '편관', el: '토(土)', element: '토', note: '지지 노트' },
    },
    sewoonNow: { gz: gz('甲辰', '갑진', 'gapjin'), sibsin: '편재', year: 2024 },
    years: [
      { year: 2020, gz: gz('庚子', '경자'), score: 40, sibsin: '편관' },
      { year: 2021, gz: gz('辛丑', '신축'), score: 55, sibsin: '정관' },
      { year: 2022, gz: gz('壬寅', '임인'), score: 60, sibsin: '편인' },
      { year: 2023, gz: gz('癸卯', '계묘'), score: 50, sibsin: '정인' },
      { year: 2024, gz: gz('甲辰', '갑진'), score: 70, sibsin: '편재', now: true },
      { year: 2025, gz: gz('乙巳', '을사'), score: 65, sibsin: '정재' },
      { year: 2026, gz: gz('丙午', '병오'), score: 45, sibsin: '식신' },
      { year: 2027, gz: gz('丁未', '정미'), score: 58, sibsin: '상관' },
      { year: 2028, gz: gz('戊申', '무신'), score: 62, sibsin: '비견' },
      { year: 2029, gz: gz('己酉', '기유'), score: 48, sibsin: '겁재' },
    ],
    body: ['첫 번째 본문 단락.', '두 번째 본문 단락.'],
    bodyEn: ['First body paragraph.', 'Second body paragraph.'],
    hapchung: {
      title: '寅亥 육합',
      romaji: 'in-hae yukhap',
      body: '합의 본문',
      bodyEn: 'Harmony body in English',
    },
    unseong: {
      title: '관대',
      romaji: 'gwandae',
      body: '12운성 본문',
      bodyEn: 'Twelve-stage body EN',
    },
    astro: [
      { label: '목성 회귀', date: '2025', body: 'Jupiter Return', kind: 'jupiter' },
      { label: '해왕성 사각', date: '2027', body: 'Neptune Square', kind: 'neptune' },
    ],
    narrative: [
      { tag: '대운 결', body: '대운의 결 본문', bodyEn: 'Grain of the cycle EN' },
      { tag: '정점', body: '정점의 해 본문', bodyEn: 'Peak year EN' },
    ],
    focusYear: 2024,
    zrSpiritChapters: [],
    zrFortuneChapters: [],
    crossActivations: [
      {
        signalId: 'x1',
        name: '편재 ↔ Jupiter',
        sajuLine: '편재 대운',
        astroLine: 'Jupiter Return',
        polarity: 2,
        meaning: '확장과 기회',
        meaningEn: 'Expansion and opportunity',
      },
      {
        signalId: 'x2',
        name: '편관 ↔ Saturn',
        sajuLine: '편관 지지',
        astroLine: 'Saturn Square',
        polarity: -2,
        meaning: '구조적 압박',
        meaningEn: 'Structural pressure',
      },
    ],
    geokgukStatus: '편재격 · 성격',
    ...over,
  }
}

describe('DecadeTier', () => {
  beforeEach(() => {
    mockLocale = 'ko'
  })

  function setup(
    over: {
      user?: Partial<DecadeTierProps['user']>
      decade?: Partial<DecadeTierProps['decade']>
    } = {}
  ) {
    const onDive = vi.fn()
    const onRise = vi.fn()
    const utils = render(
      <DecadeTier
        user={makeUser(over.user)}
        decade={makeDecade(over.decade)}
        onDive={onDive}
        onRise={onRise}
      />
    )
    return { onDive, onRise, ...utils }
  }

  describe('header (ko)', () => {
    it('renders the decade eyebrow with year range and ages', () => {
      setup()
      expect(screen.getByText(/10년 · DECADE · 대운/)).toBeInTheDocument()
      expect(screen.getByText(/2020-2030/)).toBeInTheDocument()
      // age range appears in both the eyebrow and the KV list.
      expect(screen.getAllByText(/30–39/).length).toBeGreaterThan(0)
    })

    it('renders the display heading with current cycle and hanja', () => {
      setup()
      expect(screen.getByText(/지금의 대운/)).toBeInTheDocument()
      // hanja appears in the heading and in the Ganji atom inside details.
      expect(screen.getAllByText('甲戌').length).toBeGreaterThan(0)
    })

    it('renders the ko headline oneline', () => {
      setup()
      expect(screen.getByText('재물과 성취의 10년')).toBeInTheDocument()
    })

    it('shows geokguk frame chip in ko (decade.geokgukStatus wins)', () => {
      setup()
      expect(screen.getByText('격국 frame')).toBeInTheDocument()
      expect(screen.getByText('편재격 · 성격')).toBeInTheDocument()
    })
  })

  describe('header (en)', () => {
    beforeEach(() => {
      mockLocale = 'en'
    })

    it('renders english eyebrow and headline', () => {
      setup()
      expect(screen.getByText(/10 YEARS · DECADE/)).toBeInTheDocument()
      expect(screen.getByText('A decade of wealth and achievement')).toBeInTheDocument()
      expect(screen.getByText(/Current cycle/)).toBeInTheDocument()
    })

    it('hides the geokguk frame chip in english mode', () => {
      setup()
      expect(screen.queryByText('격국 frame')).not.toBeInTheDocument()
    })

    it('falls back to ko headline when headlineEn is absent', () => {
      setup({ decade: { headlineEn: undefined } })
      expect(screen.getByText('재물과 성취의 10년')).toBeInTheDocument()
    })
  })

  describe('main crossing list', () => {
    it('renders the cross heading and the decade-entry anchor item', () => {
      setup()
      expect(screen.getByText(/이 대운의 사주 × 점성 교차 · 2020–2030/)).toBeInTheDocument()
      expect(screen.getByText('甲戌 대운 진입')).toBeInTheDocument()
    })

    it('renders astro marks as crossing items', () => {
      setup()
      // labels from decade.astro appear in the main span list
      expect(screen.getAllByText('목성 회귀').length).toBeGreaterThan(0)
    })
  })

  describe('SibsinStrip', () => {
    it('renders the strip label and legend families (ko)', () => {
      setup()
      expect(screen.getByText('10년 세운 흐름')).toBeInTheDocument()
      expect(screen.getByText('비겁')).toBeInTheDocument()
      expect(screen.getByText('인성')).toBeInTheDocument()
    })

    it('renders english legend families in en mode', () => {
      mockLocale = 'en'
      setup()
      expect(screen.getByText('Self')).toBeInTheDocument()
      expect(screen.getByText('Resource')).toBeInTheDocument()
    })
  })

  describe('details section', () => {
    it('renders decade readout big title and KV period', () => {
      setup()
      expect(screen.getByText(/편재 ·/)).toBeInTheDocument()
      // KV "기간" label exists
      expect(screen.getByText('기간')).toBeInTheDocument()
    })

    it('renders body paragraphs', () => {
      setup()
      expect(screen.getByText('첫 번째 본문 단락.')).toBeInTheDocument()
      expect(screen.getByText('두 번째 본문 단락.')).toBeInTheDocument()
    })

    it('renders narrative cards with tags and bodies', () => {
      setup()
      expect(screen.getByText('대운 결')).toBeInTheDocument()
      expect(screen.getByText('대운의 결 본문')).toBeInTheDocument()
      expect(screen.getByText('정점')).toBeInTheDocument()
    })

    it('renders hapchung and unseong relation cards', () => {
      setup()
      expect(screen.getByText('寅亥 육합')).toBeInTheDocument()
      expect(screen.getByText('합의 본문')).toBeInTheDocument()
      expect(screen.getByText('관대')).toBeInTheDocument()
      expect(screen.getByText('12운성 본문')).toBeInTheDocument()
    })

    it('renders the unseong matrix with day master and decade branch (ko)', () => {
      setup()
      expect(
        screen.getByText(/12운성 매트릭스 · 본명 일간\(甲\) × 대운 지지\(戌\)/)
      ).toBeInTheDocument()
    })

    it('renders outer-planet returns section', () => {
      setup()
      expect(screen.getByText('외행성 마디')).toBeInTheDocument()
      // neptune square label also appears as an astro mark in the main span list.
      expect(screen.getAllByText('해왕성 사각').length).toBeGreaterThan(0)
    })

    it('renders the 10-year flow score track with a "now" marker', () => {
      setup()
      expect(screen.getByText('10년 흐름')).toBeInTheDocument()
      // "지금" appears in the year-track now mark (and possibly crossing now labels).
      expect(screen.getAllByText('지금').length).toBeGreaterThan(0)
    })

    it('renders cross-activation badges with names and meanings', () => {
      setup()
      // name appears both in the pairs crossing-list and the badge row.
      expect(screen.getAllByText('편재 ↔ Jupiter').length).toBeGreaterThan(0)
      expect(screen.getAllByText('확장과 기회').length).toBeGreaterThan(0)
      expect(screen.getAllByText('구조적 압박').length).toBeGreaterThan(0)
    })

    it('renders sewoonNow KV row when present', () => {
      setup()
      expect(screen.getByText(/세운 2024/)).toBeInTheDocument()
    })
  })

  describe('details section (en) — no Korean leaks', () => {
    beforeEach(() => {
      mockLocale = 'en'
    })

    it('renders English body paragraphs', () => {
      setup()
      expect(screen.getByText('First body paragraph.')).toBeInTheDocument()
      expect(screen.getByText('Second body paragraph.')).toBeInTheDocument()
      expect(screen.queryByText('첫 번째 본문 단락.')).not.toBeInTheDocument()
    })

    it('renders English narrative bodies', () => {
      setup()
      expect(screen.getByText('Grain of the cycle EN')).toBeInTheDocument()
      expect(screen.getByText('Peak year EN')).toBeInTheDocument()
      expect(screen.queryByText('대운의 결 본문')).not.toBeInTheDocument()
    })

    it('renders English hapchung and unseong bodies', () => {
      setup()
      expect(screen.getByText('Harmony body in English')).toBeInTheDocument()
      expect(screen.getByText('Twelve-stage body EN')).toBeInTheDocument()
      expect(screen.queryByText('합의 본문')).not.toBeInTheDocument()
      expect(screen.queryByText('12운성 본문')).not.toBeInTheDocument()
    })

    it('renders English cross-activation meanings', () => {
      setup()
      expect(screen.getAllByText('Expansion and opportunity').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Structural pressure').length).toBeGreaterThan(0)
      expect(screen.queryByText('확장과 기회')).not.toBeInTheDocument()
    })

    it('falls back to ko body when bodyEn is absent', () => {
      setup({ decade: { bodyEn: undefined } })
      expect(screen.getByText('첫 번째 본문 단락.')).toBeInTheDocument()
    })
  })

  describe('conditional sections', () => {
    it('omits cross-activation pairs detail and badges when empty', () => {
      setup({ decade: { crossActivations: [] } })
      expect(screen.queryByText('사주 ↔ 점성 동시 활성')).not.toBeInTheDocument()
      expect(screen.queryByText('편재 ↔ Jupiter')).not.toBeInTheDocument()
    })

    it('omits outer-planet section when astro is empty', () => {
      setup({ decade: { astro: [] } })
      expect(screen.queryByText('외행성 마디')).not.toBeInTheDocument()
    })

    it('omits narrative section when narrative is empty', () => {
      setup({ decade: { narrative: [] } })
      expect(screen.queryByText('이 대운의 결')).not.toBeInTheDocument()
    })

    it('falls back to user.gyeokgukStatus when decade has none', () => {
      setup({ decade: { geokgukStatus: undefined } })
      expect(screen.getByText('정인격 · 반성반파 (+정인 / -재성)')).toBeInTheDocument()
    })
  })

  describe('navigation callbacks', () => {
    it('calls onRise from the zoom-out button', () => {
      const { onRise } = setup()
      fireEvent.click(screen.getByText(/인생으로 줌아웃/))
      expect(onRise).toHaveBeenCalledTimes(1)
    })

    it('calls onDive from the zoom-in button to the focus year', () => {
      const { onDive } = setup()
      fireEvent.click(screen.getByText(/2024년으로 줌인/))
      expect(onDive).toHaveBeenCalledTimes(1)
    })
  })
})
