import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TierSummary } from '@/components/calendar/atoms/TierSummary'
import type { TierSummaryProps } from '@/components/calendar/atoms/TierSummary'

// TierSummary 는 useI18n 등 외부 의존이 없는 순수 표현 컴포넌트 — props 만으로 분기.

describe('TierSummary', () => {
  describe('hero (headline / sub / sparkline)', () => {
    it('renders the headline always', () => {
      render(<TierSummary headline="천천히 무르익는 타입" />)
      expect(screen.getByRole('heading', { name: '천천히 무르익는 타입' })).toBeInTheDocument()
    })

    it('renders sub only when provided', () => {
      const { rerender } = render(<TierSummary headline="H" />)
      expect(screen.queryByText('보조 문장')).not.toBeInTheDocument()
      rerender(<TierSummary headline="H" sub="보조 문장" />)
      expect(screen.getByText('보조 문장')).toBeInTheDocument()
    })

    it('renders a sparkline svg when curve has >= 2 points', () => {
      const { container } = render(
        <TierSummary headline="H" curve={[-2, -1, 0, 1, 2]} curveNowIndex={2} />
      )
      // Sparkline draws an svg with a path + a "now" circle (nowIndex valid).
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(container.querySelector('path')).toBeInTheDocument()
      expect(container.querySelector('circle')).toBeInTheDocument()
    })

    it('does not render a sparkline when curve has < 2 points', () => {
      const { container } = render(<TierSummary headline="H" curve={[1]} />)
      expect(container.querySelector('path')).not.toBeInTheDocument()
    })

    it('omits the now-circle when curveNowIndex is absent', () => {
      const { container } = render(<TierSummary headline="H" curve={[-1, 0, 1]} />)
      expect(container.querySelector('path')).toBeInTheDocument()
      expect(container.querySelector('circle')).not.toBeInTheDocument()
    })
  })

  describe('cards', () => {
    const cards: TierSummaryProps['cards'] = [
      { icon: '💪', label: '강점', body: '추진력이 강함' },
      { icon: '⚠️', label: '조심', body: '과속 주의' },
    ]

    it('renders each card icon, label and body', () => {
      render(<TierSummary headline="H" cards={cards} />)
      expect(screen.getByText('강점')).toBeInTheDocument()
      expect(screen.getByText('추진력이 강함')).toBeInTheDocument()
      expect(screen.getByText('조심')).toBeInTheDocument()
      expect(screen.getByText('과속 주의')).toBeInTheDocument()
      expect(screen.getByText('💪')).toBeInTheDocument()
    })

    it('renders no cards block when cards is empty', () => {
      const { container } = render(<TierSummary headline="H" cards={[]} />)
      expect(container.querySelector('[class*="cardBody"]')).not.toBeInTheDocument()
    })
  })

  describe('stages', () => {
    const stages: TierSummaryProps['stages'] = [
      { label: '시작', tone: '준비' },
      { label: '절정', tone: '확장', now: true, nowLabel: '여기' },
      { label: '마무리', tone: '정리' },
    ]

    it('renders each stage label and tone', () => {
      render(<TierSummary headline="H" stages={stages} />)
      expect(screen.getByText('시작')).toBeInTheDocument()
      expect(screen.getByText('준비')).toBeInTheDocument()
      expect(screen.getByText('절정')).toBeInTheDocument()
      expect(screen.getByText('확장')).toBeInTheDocument()
    })

    it('shows custom now badge label on the active stage', () => {
      render(<TierSummary headline="H" stages={stages} />)
      expect(screen.getByText('여기')).toBeInTheDocument()
    })

    it('defaults the now badge to "지금" when nowLabel omitted', () => {
      render(<TierSummary headline="H" stages={[{ label: 'A', tone: 't', now: true }]} />)
      expect(screen.getByText('지금')).toBeInTheDocument()
    })

    it('renders no now badge when no stage is active', () => {
      render(<TierSummary headline="H" stages={[{ label: 'A', tone: 't' }]} />)
      expect(screen.queryByText('지금')).not.toBeInTheDocument()
    })
  })

  describe('nextPoint', () => {
    it('renders the next transition when present', () => {
      render(<TierSummary headline="H" nextPoint={{ when: '2027', label: '토성 회귀' }} />)
      expect(screen.getByText('2027')).toBeInTheDocument()
      expect(screen.getByText('토성 회귀')).toBeInTheDocument()
    })

    it('renders nothing for nextPoint when null', () => {
      render(<TierSummary headline="H" nextPoint={null} />)
      expect(screen.queryByText('토성 회귀')).not.toBeInTheDocument()
    })
  })

  describe('timeline', () => {
    const timeline: NonNullable<TierSummaryProps['timeline']> = {
      startYear: 2020,
      endYear: 2035,
      nowYear: 2026,
      nowLabel: '지금',
      lanes: [
        {
          label: '사주 대운',
          system: 'saju',
          bands: [{ startYear: 2020, endYear: 2030, label: '편재 대운', now: true }],
        },
        {
          label: '점성 흐름',
          system: 'astro',
          bands: [{ startYear: 2024, endYear: 2032, label: '목성 트랜짓' }],
        },
      ],
      events: [
        { year: 2022, label: '첫 토성 회귀 — 진짜 어른됨의 통과의례', system: 'saju' },
        { year: 2028, label: '목성 회귀', system: 'astro', isNow: false },
      ],
      crossings: [{ startYear: 2025, endYear: 2027, label: '핵심 교차' }],
    }

    it('renders the timeline ticks (start, now, end years)', () => {
      render(<TierSummary headline="H" timeline={timeline} />)
      expect(screen.getByText('2020')).toBeInTheDocument()
      expect(screen.getByText('2026 지금')).toBeInTheDocument()
      expect(screen.getByText('2035')).toBeInTheDocument()
    })

    it('renders saju and astro event years with shortened labels', () => {
      render(<TierSummary headline="H" timeline={timeline} />)
      // shortLabel cuts at the em-dash → "첫 토성 회귀"
      expect(screen.getByText('첫 토성 회귀')).toBeInTheDocument()
      expect(screen.getByText('목성 회귀')).toBeInTheDocument()
      // event years rendered (2022 saju, 2028 astro)
      expect(screen.getByText('2022')).toBeInTheDocument()
      expect(screen.getByText('2028')).toBeInTheDocument()
    })

    it('renders crossing tag for overlapping spans', () => {
      render(<TierSummary headline="H" timeline={timeline} />)
      expect(screen.getByText('✦ 교차')).toBeInTheDocument()
    })

    it('does not render the timeline when there are no lanes', () => {
      const empty = { ...timeline, lanes: [] }
      render(<TierSummary headline="H" timeline={empty} />)
      expect(screen.queryByText('2026 지금')).not.toBeInTheDocument()
    })

    it('renders nothing for timeline when null', () => {
      const { container } = render(<TierSummary headline="H" timeline={null} />)
      expect(container.querySelector('[class*="timeline"]')).not.toBeInTheDocument()
    })
  })
})
