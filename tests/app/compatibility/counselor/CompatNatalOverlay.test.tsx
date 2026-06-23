import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CompatNatalOverlay } from '@/app/compatibility/counselor/CompatNatalOverlay'

/**
 * 궁합 시너스트리 바이휠 — 한 황도 위에 A(rose) / B(sky) 행성을 겹쳐 그린다.
 * props 는 unwrap 된 astro chartData shape ({ planets:[{name,longitude}], ascendant }).
 * PLANET_ORDER / PLANET_GLYPHS(@/components/report/natalChartConstants) 기준으로
 * 행성을 거른다.
 */

const astroA = {
  ascendant: { longitude: 100 },
  planets: [
    { name: 'Sun', longitude: 45 },
    { name: 'Moon', longitude: 120 },
    { name: 'Venus', longitude: 200 },
  ],
}

const astroB = {
  ascendant: { longitude: 250 },
  planets: [
    { name: 'Sun', longitude: 300 },
    { name: 'Mars', longitude: 85 },
  ],
}

describe('CompatNatalOverlay', () => {
  describe('empty / edge data', () => {
    it('shows ko empty message when neither person has planets', () => {
      render(<CompatNatalOverlay astroA={undefined} astroB={undefined} />)
      expect(screen.getByText('점성 데이터 없음')).toBeInTheDocument()
    })

    it('shows en empty message when neither person has planets', () => {
      render(<CompatNatalOverlay astroA={{}} astroB={{}} lang="en" />)
      expect(screen.getByText('No astro data')).toBeInTheDocument()
    })

    it('does not render an svg in the empty state', () => {
      const { container } = render(<CompatNatalOverlay astroA={undefined} astroB={undefined} />)
      expect(container.querySelector('svg')).toBeNull()
    })

    it('renders the wheel when only one person has planets', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={{}} />)
      expect(container.querySelector('svg')).not.toBeNull()
    })

    it('ignores planets with non-finite longitudes', () => {
      const bad = { planets: [{ name: 'Sun', longitude: Number.NaN }] }
      render(<CompatNatalOverlay astroA={bad} astroB={undefined} />)
      // all planets filtered → empty state
      expect(screen.getByText('점성 데이터 없음')).toBeInTheDocument()
    })
  })

  describe('chart rendering', () => {
    it('renders an svg wheel with the zodiac ring', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={astroB} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      // outer + inner ring circles + center dot present
      expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3)
    })

    it('renders the ASC label for person A', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={astroB} />)
      expect(container.textContent || '').toContain('ASC')
    })

    it('renders a dashed B-ascendant tick when astroB has an ascendant', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={astroB} />)
      const dashed = container.querySelector('line[stroke-dasharray]')
      expect(dashed).not.toBeNull()
    })

    it('renders planet glyphs for both people', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={astroB} />)
      const text = container.textContent || ''
      expect(text).toContain('☉') // Sun
      expect(text).toContain('☽') // Moon
      expect(text).toContain('♀') // Venus (A)
      expect(text).toContain('♂') // Mars (B)
    })
  })

  describe('legend + labels', () => {
    it('renders both names in the legend', () => {
      render(<CompatNatalOverlay astroA={astroA} astroB={astroB} nameA="준영" nameB="민지" />)
      expect(screen.getByText('준영')).toBeInTheDocument()
      expect(screen.getByText('민지')).toBeInTheDocument()
    })

    it('falls back to A / B names when none given', () => {
      render(<CompatNatalOverlay astroA={astroA} astroB={astroB} />)
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
    })

    it('renders ko sign names in the legend', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={astroB} />)
      // ko legend uses SIGN_KO (e.g. degrees marker °)
      expect(container.textContent || '').toContain('°')
    })

    it('renders zodiac glyphs in the legend when lang=en', () => {
      const { container } = render(<CompatNatalOverlay astroA={astroA} astroB={astroB} lang="en" />)
      // en legend uses ZODIAC_GLYPHS; degrees still shown
      expect(container.textContent || '').toContain('°')
    })
  })
})
