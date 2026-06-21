import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBreakdown } from '@/components/report/atoms/ScoreBreakdown'

describe('ScoreBreakdown', () => {
  const fullBreakdown = {
    eastern_hap: 80,
    eastern_chung: 70,
    elements_match: 60,
    synastry_harmonic: 50,
    synastry_tension: 40,
  }

  describe('empty / null rendering', () => {
    it('returns null when no breakdown and no total', () => {
      const { container } = render(<ScoreBreakdown />)
      expect(container.firstChild).toBeNull()
    })

    it('returns null when breakdown has no recognized keys and no total', () => {
      const { container } = render(<ScoreBreakdown breakdown={{} as any} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders when total is provided even without breakdown', () => {
      const { container } = render(<ScoreBreakdown total={80} />)
      expect(container.firstChild).not.toBeNull()
      expect(screen.getByText('80')).toBeInTheDocument()
    })
  })

  describe('total score computation', () => {
    it('uses explicit total when provided (score variant)', () => {
      render(<ScoreBreakdown total={88} breakdown={fullBreakdown} />)
      expect(screen.getByText('88')).toBeInTheDocument()
      expect(screen.getByText('/ 100')).toBeInTheDocument()
    })

    it('clamps total above 100 down to 100', () => {
      render(<ScoreBreakdown total={150} />)
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('clamps negative total up to 0', () => {
      render(<ScoreBreakdown total={-20} />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('averages breakdown values when total is omitted', () => {
      // avg of 80,72,64,50,44 = 62 (62 is not equal to any row value, so unique)
      render(
        <ScoreBreakdown
          breakdown={{
            eastern_hap: 80,
            eastern_chung: 72,
            elements_match: 64,
            synastry_harmonic: 50,
            synastry_tension: 44,
          }}
        />
      )
      expect(screen.getByText('62')).toBeInTheDocument()
    })
  })

  describe('verdict text (ko)', () => {
    it('shows profound bond verdict for >= 90', () => {
      render(<ScoreBreakdown total={95} />)
      expect(screen.getByText('매우 깊은 인연 — 자연스러운 합')).toBeInTheDocument()
    })

    it('shows complementary verdict for 75-89', () => {
      render(<ScoreBreakdown total={80} />)
      expect(screen.getByText('다른 결이 서로 보완 — 깊되 살짝 자극도')).toBeInTheDocument()
    })

    it('shows moderate verdict for 60-74', () => {
      render(<ScoreBreakdown total={65} />)
      expect(screen.getByText('보통 — 노력하면 좋아짐')).toBeInTheDocument()
    })

    it('shows challenging verdict for 45-59', () => {
      render(<ScoreBreakdown total={50} />)
      expect(screen.getByText('쉽지 않음 — 부딪히는 지점 조심')).toBeInTheDocument()
    })

    it('shows very different verdict for < 45', () => {
      render(<ScoreBreakdown total={20} />)
      expect(screen.getByText('결이 많이 달라 — 천천히 다가가기')).toBeInTheDocument()
    })
  })

  describe('verdict text (en)', () => {
    it('shows english header and verdict bands', () => {
      render(<ScoreBreakdown total={95} lang="en" />)
      expect(screen.getByText('Overall Compatibility')).toBeInTheDocument()
      expect(screen.getByText('Profound bond — naturally aligned')).toBeInTheDocument()
    })

    it('shows english 75 band', () => {
      render(<ScoreBreakdown total={78} lang="en" />)
      expect(
        screen.getByText('Complementary differences — deep harmony with gentle spark')
      ).toBeInTheDocument()
    })

    it('shows english 60 band', () => {
      render(<ScoreBreakdown total={62} lang="en" />)
      expect(screen.getByText('Moderate — grows with mutual effort')).toBeInTheDocument()
    })

    it('shows english 45 band', () => {
      render(<ScoreBreakdown total={47} lang="en" />)
      expect(screen.getByText('Challenging — mind the friction zones')).toBeInTheDocument()
    })

    it('shows english low band', () => {
      render(<ScoreBreakdown total={10} lang="en" />)
      expect(screen.getByText('Very different rhythms — approach with care')).toBeInTheDocument()
    })
  })

  describe('headers', () => {
    it('shows korean header by default', () => {
      render(<ScoreBreakdown total={80} />)
      expect(screen.getByText('총합 궁합 점수')).toBeInTheDocument()
    })
  })

  describe('variant: band', () => {
    it('shows verdict label instead of numeric headline in band variant', () => {
      render(<ScoreBreakdown total={95} variant="band" />)
      expect(screen.getByText('매우 깊은 인연 — 자연스러운 합')).toBeInTheDocument()
      // band variant should not render the "/ 100" numeric headline
      expect(screen.queryByText('/ 100')).not.toBeInTheDocument()
    })

    it('score variant renders numeric headline', () => {
      render(<ScoreBreakdown total={95} variant="score" />)
      expect(screen.getByText('/ 100')).toBeInTheDocument()
    })
  })

  describe('category rows', () => {
    it('renders all five labels in ko when full breakdown provided', () => {
      render(<ScoreBreakdown total={70} breakdown={fullBreakdown} />)
      expect(screen.getByText('사주 합')).toBeInTheDocument()
      expect(screen.getByText('사주 충')).toBeInTheDocument()
      expect(screen.getByText('오행 보완')).toBeInTheDocument()
      expect(screen.getByText('시너 조화')).toBeInTheDocument()
      expect(screen.getByText('시너 긴장')).toBeInTheDocument()
    })

    it('renders english labels when lang=en', () => {
      render(<ScoreBreakdown total={70} breakdown={fullBreakdown} lang="en" />)
      expect(screen.getByText('Saju Union')).toBeInTheDocument()
      expect(screen.getByText('Saju Clash')).toBeInTheDocument()
      expect(screen.getByText('Element Match')).toBeInTheDocument()
      expect(screen.getByText('Synastry Harmony')).toBeInTheDocument()
      expect(screen.getByText('Synastry Tension')).toBeInTheDocument()
    })

    it('only renders rows for provided keys', () => {
      render(<ScoreBreakdown total={70} breakdown={{ eastern_hap: 80 }} />)
      expect(screen.getByText('사주 합')).toBeInTheDocument()
      expect(screen.queryByText('사주 충')).not.toBeInTheDocument()
      // one progressbar per available row
      expect(screen.getAllByRole('progressbar')).toHaveLength(1)
    })

    it('renders one progressbar per available row with rounded aria value', () => {
      render(<ScoreBreakdown total={70} breakdown={fullBreakdown} />)
      const bars = screen.getAllByRole('progressbar')
      expect(bars).toHaveLength(5)
      expect(bars[0]).toHaveAttribute('aria-valuenow', '80')
    })

    it('shows numeric value for non-empty rows', () => {
      render(<ScoreBreakdown total={70} breakdown={{ eastern_hap: 80 }} />)
      expect(screen.getByText('80')).toBeInTheDocument()
    })

    it('shows empty text (ko) when a score is <= 5', () => {
      render(<ScoreBreakdown total={70} breakdown={{ eastern_hap: 0, eastern_chung: 3 }} />)
      expect(screen.getByText('합 없음')).toBeInTheDocument()
      expect(screen.getByText('충돌 강함')).toBeInTheDocument()
    })

    it('shows empty text (en) when a score is <= 5', () => {
      render(
        <ScoreBreakdown
          total={70}
          lang="en"
          breakdown={{ elements_match: 0, synastry_harmonic: 2, synastry_tension: 1 }}
        />
      )
      expect(screen.getByText('low complement')).toBeInTheDocument()
      expect(screen.getByText('low harmony')).toBeInTheDocument()
      expect(screen.getByText('high tension')).toBeInTheDocument()
    })

    it('clamps bar value above 100 to a 100 aria value', () => {
      render(<ScoreBreakdown total={70} breakdown={{ eastern_hap: 130 }} />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '100')
    })

    it('rounds non-integer scores in the value label', () => {
      render(<ScoreBreakdown total={70} breakdown={{ eastern_hap: 66.6 }} />)
      expect(screen.getByText('67')).toBeInTheDocument()
    })
  })

  describe('theme', () => {
    it('renders with light theme', () => {
      const { container } = render(
        <ScoreBreakdown total={80} breakdown={fullBreakdown} theme="light" />
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('renders with dark theme (default)', () => {
      const { container } = render(
        <ScoreBreakdown total={80} breakdown={fullBreakdown} theme="dark" />
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('applies custom className', () => {
      const { container } = render(<ScoreBreakdown total={80} className="my-custom" />)
      expect(container.querySelector('.my-custom')).toBeInTheDocument()
    })
  })
})
