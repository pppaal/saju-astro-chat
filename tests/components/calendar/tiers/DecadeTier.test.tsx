import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

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
      cheongan: {
        hanja: '甲',
        sibsin: '편재',
        el: '목(木)',
        element: '목',
        note: '천간 노트',
        noteEn: 'Stem note in English',
      },
      jiji: {
        hanja: '戌',
        sibsin: '편관',
        el: '토(土)',
        element: '토',
        note: '지지 노트',
        noteEn: 'Branch note in English',
      },
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
      titleEn: 'in–hae harmony',
      romaji: 'in-hae yukhap',
      body: '합의 본문',
      bodyEn: 'Harmony body in English',
    },
    unseong: {
      title: '관대',
      titleEn: 'Coming-of-age',
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
        astroLine: '목성',
        astroLineEn: 'Jupiter',
        polarity: 2,
        meaning: '확장과 기회',
        meaningEn: 'Expansion and opportunity',
      },
      {
        signalId: 'x2',
        name: '편관 ↔ Saturn',
        sajuLine: '편관 지지',
        astroLine: '토성',
        astroLineEn: 'Saturn',
        polarity: -2,
        meaning: '구조적 압박',
        meaningEn: 'Structural pressure',
      },
    ],
    geokgukStatus: '편재격 · 성격',
    ...over,
  }
}

/**
 * main surface = everything outside the <details> fold. We clone the rendered
 * tree, strip the <details>, and mount the clone so `toBeInTheDocument` works
 * against an attached node.
 */
const mountedClones: HTMLElement[] = []
function mainSurface(container: HTMLElement): HTMLElement {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('details').forEach((d) => d.remove())
  document.body.appendChild(clone)
  mountedClones.push(clone)
  return clone
}

/**
 * the jargon fold (<details>) only — already attached to the document.
 * There can be more than one <details> (a demoted plain "MoreFold" plus the
 * jargon fold); the jargon "자세한 신호 보기" fold is always the last one.
 */
function fold(container: HTMLElement): HTMLElement {
  const all = container.querySelectorAll('details')
  if (all.length === 0) throw new Error('details fold not found')
  return all[all.length - 1] as HTMLElement
}

/**
 * the demoted plain "MoreFold" (<details>) — the first <details>, holding
 * easy-language secondary blocks (e.g. the plain cross cards). Distinct from
 * the jargon fold returned by fold().
 */
function moreFold(container: HTMLElement): HTMLElement {
  const all = container.querySelectorAll('details')
  if (all.length < 2) throw new Error('MoreFold not found')
  return all[0] as HTMLElement
}

describe('DecadeTier', () => {
  beforeEach(() => {
    mockLocale = 'ko'
  })

  afterEach(() => {
    while (mountedClones.length) mountedClones.pop()?.remove()
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

  // ----------------------------------------------------------------
  // Main surface — jargon-free season frame
  // ----------------------------------------------------------------
  describe('main surface (ko) — jargon-free season frame', () => {
    it('renders the plain theme title "X의 10년" (no 大運 hanja in heading)', () => {
      const { container } = setup()
      const main = mainSurface(container)
      // 편재 → sibsinArea '돈·현실' → '돈·현실의 10년'
      expect(within(main).getByText('돈·현실의 10년')).toBeInTheDocument()
      // 大運 ganji 甲戌 must NOT appear on the main surface.
      expect(main.textContent).not.toContain('甲戌')
    })

    it('renders a season tag (가을 for 재성) on the main surface', () => {
      const { container } = setup()
      const main = within(mainSurface(container))
      // 편재 → 재성 family → autumn (가을)
      expect(main.getByText('가을')).toBeInTheDocument()
      expect(main.getByText('거두는 때')).toBeInTheDocument()
    })

    it('maps each sibsin family to the right season tag', () => {
      const cases: Array<[string, string]> = [
        ['비견', '봄'],
        ['식신', '여름'],
        ['편재', '가을'],
        ['정관', '가을'],
        ['정인', '겨울'],
      ]
      for (const [sibsin, label] of cases) {
        const { container, unmount } = setup({ decade: { sibsin } })
        const main = within(mainSurface(container))
        expect(main.getByText(label)).toBeInTheDocument()
        unmount()
      }
    })

    it('renders the age range on the main surface', () => {
      const { container } = setup()
      expect(within(mainSurface(container)).getAllByText(/30–39/).length).toBeGreaterThan(0)
    })

    it('renders the ko headline oneline', () => {
      const { container } = setup()
      expect(within(mainSurface(container)).getByText('재물과 성취의 10년')).toBeInTheDocument()
    })

    it('shows NO 격국 frame jargon chip on the main surface', () => {
      const { container } = setup()
      expect(within(mainSurface(container)).queryByText('격국 frame')).not.toBeInTheDocument()
      expect(within(mainSurface(container)).queryByText('편재격 · 성격')).not.toBeInTheDocument()
    })
  })

  describe('이 시기에 일어나는 일 (main, ko)', () => {
    it('renders the heading and plain lines from theme/cross/relation prose', () => {
      const { container } = setup()
      const main = within(mainSurface(container))
      expect(main.getByText('이 시기에 일어나는 일')).toBeInTheDocument()
      // theme prose is a plain line.
      expect(main.getByText('현실 성취 · 재물의 무대')).toBeInTheDocument()
      // strongest cross meaning (|polarity| tie → first) is plain prose;
      // it also reappears in the plain cross card, hence getAllByText.
      expect(main.getAllByText('확장과 기회').length).toBeGreaterThan(0)
    })
  })

  describe('이렇게 보내면 좋아요 (main, ko)', () => {
    it('renders the guidance heading and plain guidance lines', () => {
      const { container } = setup()
      const main = within(mainSurface(container))
      expect(main.getByText('이렇게 보내면 좋아요')).toBeInTheDocument()
      // autumn guide line.
      expect(
        main.getByText('뿌려 둔 것을 거두는 때 — 마무리와 결실에 집중하세요.')
      ).toBeInTheDocument()
    })
  })

  describe('이 10년 중 큰 해 (main, ko)', () => {
    it('renders the big-years heading, a score strip with no ganji, and a turning-point line', () => {
      const { container } = setup()
      const main = within(mainSurface(container))
      expect(main.getByText('이 10년 중 큰 해')).toBeInTheDocument()
      // highest score year is 2024 (70).
      expect(
        main.getByText('이 10년 안에서는 2024년 무렵이 가장 무르익는 해예요.')
      ).toBeInTheDocument()
      // no per-year ganji on the main surface.
      const mainEl = mainSurface(container)
      expect(mainEl.textContent).not.toContain('庚子')
      expect(mainEl.textContent).not.toContain('甲辰')
    })

    it('marks "지금" on the now year in the strip', () => {
      const { container } = setup()
      expect(within(mainSurface(container)).getAllByText('지금').length).toBeGreaterThan(0)
    })
  })

  describe('plain cross signals (demoted MoreFold, ko)', () => {
    it('renders plain cross name + meaning in the MoreFold, but not the raw saju/astro sub-lines', () => {
      const { container } = setup()
      // plain cross cards are demoted into the "10년 더 자세히" MoreFold (first
      // <details>), not the jargon fold; assert against that demoted fold.
      const more = within(moreFold(container))
      expect(more.getByText('겹쳐서 도드라지는 신호')).toBeInTheDocument()
      expect(more.getByText('편재 ↔ Jupiter')).toBeInTheDocument()
      expect(more.getByText('구조적 압박')).toBeInTheDocument()
      // raw saju/astro term rows are NOT in the demoted plain fold.
      expect(more.queryByText('편재 대운')).not.toBeInTheDocument()
      expect(more.queryByText('목성')).not.toBeInTheDocument()
    })

    it('omits the cross block when there are no activations', () => {
      const { container } = setup({ decade: { crossActivations: [] } })
      // with no activations the demoted plain MoreFold is not rendered at all.
      expect(container.textContent).not.toContain('겹쳐서 도드라지는 신호')
    })
  })

  // ----------------------------------------------------------------
  // Main surface (en)
  // ----------------------------------------------------------------
  describe('main surface (en)', () => {
    beforeEach(() => {
      mockLocale = 'en'
    })

    it('renders english season tag, theme title and headline', () => {
      const { container } = setup()
      const main = within(mainSurface(container))
      // 편재 → sibsinAreaEn 'opportunity & money' → 'A decade of opportunity & money'
      expect(main.getByText('A decade of opportunity & money')).toBeInTheDocument()
      expect(main.getByText('Autumn')).toBeInTheDocument()
      expect(main.getByText('a season of harvest')).toBeInTheDocument()
      expect(main.getByText('A decade of wealth and achievement')).toBeInTheDocument()
    })

    it('renders english plain headings and guidance', () => {
      const { container } = setup()
      const main = within(mainSurface(container))
      expect(main.getByText('What this season brings')).toBeInTheDocument()
      expect(main.getByText('How to spend it well')).toBeInTheDocument()
      expect(main.getByText('The big years in this decade')).toBeInTheDocument()
      expect(
        main.getByText('A time to reap what you sowed — focus on finishing and results.')
      ).toBeInTheDocument()
    })

    it('renders english turning-point line', () => {
      const { container } = setup()
      expect(
        within(mainSurface(container)).getByText(
          'Within this decade, around 2024 is when things ripen most.'
        )
      ).toBeInTheDocument()
    })

    it('keeps the main surface free of Korean jargon strings', () => {
      const { container } = setup()
      const main = mainSurface(container)
      expect(main.textContent).not.toContain('甲戌')
      expect(main.textContent).not.toContain('격국')
    })

    it('falls back to ko headline when headlineEn is absent', () => {
      const { container } = setup({ decade: { headlineEn: undefined } })
      expect(within(mainSurface(container)).getByText('재물과 성취의 10년')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // Fold — all jargon lives here
  // ----------------------------------------------------------------
  describe('jargon fold (ko)', () => {
    it('renders the fold summary', () => {
      const { container } = setup()
      expect(
        within(fold(container)).getByText(/자세한 신호 보기 · 사주·점성 근거/)
      ).toBeInTheDocument()
    })

    it('moves the 大運 hanja into the fold', () => {
      const { container } = setup()
      // 甲戌 appears in the fold (header chip + Ganji atom), not the main surface.
      expect(within(fold(container)).getAllByText('甲戌').length).toBeGreaterThan(0)
    })

    it('moves the 격국 frame chip into the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('격국 frame')).toBeInTheDocument()
      expect(f.getByText('편재격 · 성격')).toBeInTheDocument()
    })

    it('renders decade readout big title and KV period inside the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText(/편재 ·/)).toBeInTheDocument()
      expect(f.getByText('기간')).toBeInTheDocument()
    })

    it('renders body paragraphs inside the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('첫 번째 본문 단락.')).toBeInTheDocument()
      expect(f.getByText('두 번째 본문 단락.')).toBeInTheDocument()
    })

    it('renders narrative cards inside the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('대운 결')).toBeInTheDocument()
      expect(f.getByText('대운의 결 본문')).toBeInTheDocument()
      expect(f.getByText('정점')).toBeInTheDocument()
    })

    it('renders hapchung + unseong cards with hanja inside the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('寅亥 육합')).toBeInTheDocument()
      expect(f.getByText('합의 본문')).toBeInTheDocument()
      expect(f.getByText('관대')).toBeInTheDocument()
      expect(f.getByText('12운성 본문')).toBeInTheDocument()
    })

    it('renders the unseong matrix with day master and decade branch inside the fold', () => {
      const { container } = setup()
      expect(
        within(fold(container)).getByText(/12운성 매트릭스 · 본명 일간\(甲\) × 대운 지지\(戌\)/)
      ).toBeInTheDocument()
    })

    it('renders outer-planet returns + per-year ganji inside the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('외행성 마디')).toBeInTheDocument()
      expect(f.getAllByText('해왕성 사각').length).toBeGreaterThan(0)
      // per-year ganji belongs to the fold only.
      expect(f.getAllByText('甲辰').length).toBeGreaterThan(0)
    })

    it('renders cross-activation badges with raw saju/astro sub-lines inside the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getAllByText('편재 ↔ Jupiter').length).toBeGreaterThan(0)
      // raw sub-line term shown only in the fold.
      expect(f.getByText('편재 대운')).toBeInTheDocument()
    })

    it('renders sewoonNow KV row inside the fold', () => {
      const { container } = setup()
      expect(within(fold(container)).getByText(/세운 2024/)).toBeInTheDocument()
    })

    it('falls back to user.gyeokgukStatus when decade has none', () => {
      const { container } = setup({ decade: { geokgukStatus: undefined } })
      expect(
        within(fold(container)).getByText('정인격 · 반성반파 (+정인 / -재성)')
      ).toBeInTheDocument()
    })
  })

  describe('jargon fold (en) — no Korean leaks', () => {
    beforeEach(() => {
      mockLocale = 'en'
    })

    it('renders English body paragraphs in the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('First body paragraph.')).toBeInTheDocument()
      expect(f.getByText('Second body paragraph.')).toBeInTheDocument()
      expect(f.queryByText('첫 번째 본문 단락.')).not.toBeInTheDocument()
    })

    it('renders English narrative bodies in the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('Grain of the cycle EN')).toBeInTheDocument()
      expect(f.getByText('Peak year EN')).toBeInTheDocument()
    })

    it('renders English hapchung/unseong bodies + titles in the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('Harmony body in English')).toBeInTheDocument()
      expect(f.getByText('Twelve-stage body EN')).toBeInTheDocument()
      expect(f.getByText('Coming-of-age')).toBeInTheDocument()
      expect(f.getByText('in–hae harmony')).toBeInTheDocument()
      expect(f.queryByText('관대')).not.toBeInTheDocument()
      expect(f.queryByText('寅亥 육합')).not.toBeInTheDocument()
    })

    it('renders the big title + KV ten-god in English (no raw Korean sibsin)', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText(/Indirect Wealth · opportunity & money decade/)).toBeInTheDocument()
      expect(f.getByText('Decade ten-god')).toBeInTheDocument()
      expect(f.getAllByText('Indirect Wealth').length).toBeGreaterThan(0)
    })

    it('renders pillar ten-gods + notes in English in the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getAllByText(/Indirect Wealth/).length).toBeGreaterThan(0)
      expect(f.getAllByText(/Seven Killings/).length).toBeGreaterThan(0)
      expect(f.getByText('Stem note in English')).toBeInTheDocument()
      expect(f.getByText('Branch note in English')).toBeInTheDocument()
      expect(f.queryByText('천간 노트')).not.toBeInTheDocument()
    })

    it('renders cross-activation astro line in English in the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getAllByText('Jupiter').length).toBeGreaterThan(0)
      expect(f.getAllByText('Saturn').length).toBeGreaterThan(0)
      expect(f.queryByText('목성')).not.toBeInTheDocument()
      expect(f.queryByText('토성')).not.toBeInTheDocument()
    })

    it('hides the geokguk frame chip label localization but keeps the value in the fold', () => {
      const { container } = setup()
      const f = within(fold(container))
      expect(f.getByText('gyeokguk frame')).toBeInTheDocument()
      expect(f.getByText('편재격 · 성격')).toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // Conditional sections
  // ----------------------------------------------------------------
  describe('conditional sections', () => {
    it('omits cross-activation badges in the fold when empty', () => {
      const { container } = setup({ decade: { crossActivations: [] } })
      expect(within(fold(container)).queryByText('사주 ↔ 점성 동시 활성')).not.toBeInTheDocument()
    })

    it('omits outer-planet section when astro is empty', () => {
      const { container } = setup({ decade: { astro: [] } })
      expect(within(fold(container)).queryByText('외행성 마디')).not.toBeInTheDocument()
    })

    it('omits narrative section when narrative is empty', () => {
      const { container } = setup({ decade: { narrative: [] } })
      expect(within(fold(container)).queryByText('이 대운의 결')).not.toBeInTheDocument()
    })
  })

  // ----------------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------------
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
