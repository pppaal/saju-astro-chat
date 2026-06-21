import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CompatChartModal } from '@/app/compatibility/counselor/CompatChartModal'
import type { CompatReport } from '@/lib/compatibility/compatReport'

/**
 * 궁합 차트 모달 — open 시 /api/compatibility/report 로 POST 해 서버 리포트를
 * 받아 밴드·사주관계·시너스트리를 그린다. fetch 를 mock 해 리포트 분기를 검증한다.
 * 차트 child(SajuChart/오버레이/ScoreBreakdown)는 실제 컴포넌트로 렌더된다.
 */

// 라이트 모달 안에서 unwrap → sajuToPillars 가 일주(index 2) 필요. pillars shape 제공.
const sajuRaw = (dayStem: string, dayBranch: string) => ({
  data: {
    yearPillar: { heavenlyStem: { name: '갑' }, earthlyBranch: { name: '자' } },
    monthPillar: { heavenlyStem: { name: '을' }, earthlyBranch: { name: '축' } },
    dayPillar: { heavenlyStem: { name: dayStem }, earthlyBranch: { name: dayBranch } },
    timePillar: { heavenlyStem: { name: '정' }, earthlyBranch: { name: '묘' } },
    fiveElements: { wood: 3, fire: 1, earth: 2, metal: 1, water: 1 },
  },
})

const astroRaw = (sunLon: number) => ({
  data: {
    chartData: {
      ascendant: { longitude: 100 },
      planets: [
        { name: 'Sun', longitude: sunLon },
        { name: 'Venus', longitude: 200 },
      ],
    },
  },
})

const fullReport: CompatReport = {
  synView: {
    aspects: [
      {
        a: '태양',
        b: '금성',
        label: '삼각',
        tone: 'harmony',
        orb: 2.1,
        strength: '강함',
        meaning: '서로 받쳐주는 결',
      },
    ],
    overlaysAtoB: [{ planet: '금성', house: 7, meaning: '동반자 자리' }],
    overlaysBtoA: [{ planet: '화성', house: 5, meaning: '연애 자리' }],
    harmony: 5,
    tension: 1,
  },
  dayMaster: {
    aStem: '병',
    aEl: '화',
    bStem: '임',
    bEl: '수',
    relation: 'bControlsA',
    relationLabel: '서로 끌리는 관계',
    bToA: '정관',
    aToB: '정재',
  },
  spouseStars: [
    {
      from: 'A',
      sibsin: '정관',
      role: '배우자(듬직함)',
      pillar: '일',
      isDayPillar: true,
      source: 'branch',
      char: '자',
    },
  ],
  pillarRelations: [
    {
      aPillar: '일',
      bPillar: '일',
      aChar: '자',
      bChar: '오',
      layer: 'branch',
      tags: ['충'],
      tone: 'clash',
      isDayInvolved: true,
    },
    {
      aPillar: '년',
      bPillar: '월',
      aChar: '갑',
      bChar: '기',
      layer: 'stem',
      tags: ['천간합'],
      tone: 'bond',
      isDayInvolved: false,
    },
  ],
  band: { saju: 70, element: 60, synastry: 80 } as CompatReport['band'],
  crossVerdict: { tone: 'aligned', text: '동서가 한 방향으로 끌립니다' },
}

const mockFetchResolving = (report: CompatReport | null) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: report }),
  }) as unknown as typeof fetch
}

const baseProps = {
  onClose: vi.fn(),
  person1Saju: sajuRaw('병', '자'),
  person2Saju: sajuRaw('임', '오'),
  person1Astro: astroRaw(45),
  person2Astro: astroRaw(300),
  nameA: '준영',
  nameB: '민지',
}

describe('CompatChartModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_API_TOKEN = 'test-token'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('open / closed', () => {
    it('renders nothing when open is false', () => {
      mockFetchResolving(fullReport)
      const { container } = render(<CompatChartModal open={false} {...baseProps} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders the dialog when open is true', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(screen.getByRole('dialog', { name: '궁합 차트' })).toBeInTheDocument()
    })

    it('renders en title and aria-label when lang=en', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} lang="en" />)
      expect(screen.getByRole('dialog', { name: 'Couple chart' })).toBeInTheDocument()
      expect(screen.getByText('Couple Chart')).toBeInTheDocument()
    })
  })

  describe('loading + fetch', () => {
    it('shows the analyzing spinner before the report resolves', () => {
      // never-resolving fetch keeps loading state visible
      global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
      render(<CompatChartModal open {...baseProps} />)
      expect(screen.getByText('두 사람의 궁합을 분석하고 있어요…')).toBeInTheDocument()
    })

    it('POSTs to /api/compatibility/report on open', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toBe('/api/compatibility/report')
      expect(init.method).toBe('POST')
    })

    it('handles a null report (fetch returns no data) without crashing', async () => {
      mockFetchResolving(null)
      render(<CompatChartModal open {...baseProps} />)
      await waitFor(() =>
        expect(screen.queryByText('두 사람의 궁합을 분석하고 있어요…')).not.toBeInTheDocument()
      )
      // still renders the dialog shell
      expect(screen.getByRole('dialog', { name: '궁합 차트' })).toBeInTheDocument()
    })

    it('handles a rejected fetch gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
      render(<CompatChartModal open {...baseProps} />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(screen.getByRole('dialog', { name: '궁합 차트' })).toBeInTheDocument()
    })
  })

  describe('report-driven sections', () => {
    it('renders the cross verdict text', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(await screen.findByText('동서가 한 방향으로 끌립니다')).toBeInTheDocument()
    })

    it('renders the saju ties section header and tags', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(await screen.findByText('사주 관계 — 어디서 끌리고 부딪히나')).toBeInTheDocument()
      // 충 / 천간합 태그 등장
      const dialog = screen.getByRole('dialog', { name: '궁합 차트' })
      expect(dialog.textContent).toContain('충')
      expect(dialog.textContent).toContain('천간합')
    })

    it('renders the day-master core-natures block', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(await screen.findByText('두 사람의 본질(일간)')).toBeInTheDocument()
      const dialog = screen.getByRole('dialog', { name: '궁합 차트' })
      // 일간 관계 라벨은 facts.relationLabel(KO prose) 대신 relation enum + 오행에서
      // dayMasterRelationText 로 합성한다(compatChartLabels). bControlsA·화/수 → "수극화".
      expect(dialog.textContent).toContain('수극화, 다듬어주는 흐름')
    })

    it('renders the spouse-seat badge for a day-pillar spouse star', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(await screen.findByText('배우자 자리')).toBeInTheDocument()
    })

    it('renders the synastry aspect list', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(await screen.findByText('별자리 — 끌림과 마찰')).toBeInTheDocument()
      const dialog = screen.getByRole('dialog', { name: '궁합 차트' })
      expect(dialog.textContent).toContain('서로 받쳐주는 결')
    })

    it('renders the house-overlay section', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(await screen.findByText('누가 상대의 어느 자리에')).toBeInTheDocument()
    })

    it('renders both Eastern and Western section titles', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(screen.getByText('동양 — 사주·오행 겹쳐 보기')).toBeInTheDocument()
      expect(screen.getByText('서양 — 별자리 겹쳐 보기')).toBeInTheDocument()
    })

    it('renders the collapsed per-chart details summary', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} />)
      expect(screen.getByText('각자의 사주 원국 펼쳐 보기')).toBeInTheDocument()
    })
  })

  describe('empty report', () => {
    it('omits saju-ties + day-master sections when report is empty', async () => {
      mockFetchResolving({
        synView: null,
        dayMaster: null,
        spouseStars: [],
        pillarRelations: [],
      } as CompatReport)
      render(<CompatChartModal open {...baseProps} />)
      await waitFor(() =>
        expect(screen.queryByText('두 사람의 궁합을 분석하고 있어요…')).not.toBeInTheDocument()
      )
      expect(screen.queryByText('사주 관계 — 어디서 끌리고 부딪히나')).not.toBeInTheDocument()
      expect(screen.queryByText('두 사람의 본질(일간)')).not.toBeInTheDocument()
      // section frames still render
      expect(screen.getByText('동양 — 사주·오행 겹쳐 보기')).toBeInTheDocument()
    })
  })

  describe('close interactions', () => {
    it('calls onClose when the close button is clicked', async () => {
      mockFetchResolving(fullReport)
      const onClose = vi.fn()
      render(<CompatChartModal open {...baseProps} onClose={onClose} />)
      fireEvent.click(screen.getByRole('button', { name: '닫기' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when the backdrop is clicked', async () => {
      mockFetchResolving(fullReport)
      const onClose = vi.fn()
      const { container } = render(<CompatChartModal open {...baseProps} onClose={onClose} />)
      // backdrop is the outermost ref container
      fireEvent.click(container.firstChild as HTMLElement)
      expect(onClose).toHaveBeenCalled()
    })

    it('does not call onClose when the dialog body is clicked (stopPropagation)', async () => {
      mockFetchResolving(fullReport)
      const onClose = vi.fn()
      render(<CompatChartModal open {...baseProps} onClose={onClose} />)
      fireEvent.click(screen.getByRole('dialog', { name: '궁합 차트' }))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onClose on Escape key', async () => {
      mockFetchResolving(fullReport)
      const onClose = vi.fn()
      render(<CompatChartModal open {...baseProps} onClose={onClose} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('name fallbacks', () => {
    it('uses A / B placeholders when names are blank', async () => {
      mockFetchResolving(fullReport)
      render(<CompatChartModal open {...baseProps} nameA="" nameB="" />)
      const dialog = screen.getByRole('dialog', { name: '궁합 차트' })
      // labels default to A / B and appear in the saju-ties rows (different pillars)
      await screen.findByText('사주 관계 — 어디서 끌리고 부딪히나')
      expect(dialog.textContent).toContain('A')
      expect(dialog.textContent).toContain('B')
    })
  })
})
