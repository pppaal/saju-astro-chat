import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ElementRadar, deriveCounts } from '@/components/report/ElementRadar'

describe('deriveCounts', () => {
  it('returns all zeros for nullish / non-object input', () => {
    expect(deriveCounts(undefined)).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
    expect(deriveCounts(null)).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
    expect(deriveCounts(42)).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
  })

  it('reads counts from fiveElements with english keys', () => {
    expect(
      deriveCounts({ fiveElements: { wood: 2, fire: 1, earth: 3, metal: 0, water: 1 } })
    ).toEqual({ wood: 2, fire: 1, earth: 3, metal: 0, water: 1 })
  })

  it('reads counts from fiveElements with korean keys', () => {
    expect(deriveCounts({ fiveElements: { 목: 1, 화: 2, 토: 1, 금: 1, 수: 1 } })).toEqual({
      wood: 1,
      fire: 2,
      earth: 1,
      metal: 1,
      water: 1,
    })
  })

  it('ignores unknown keys / non-number values in fiveElements', () => {
    expect(deriveCounts({ fiveElements: { wood: 2, junk: 9, fire: 'x' } })).toEqual({
      wood: 2,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    })
  })

  it('falls back to counting pillars (pillars.* shape)', () => {
    const saju = {
      pillars: {
        year: {
          heavenlyStem: { element: 'wood' },
          earthlyBranch: { element: 'water' },
        },
        day: {
          heavenlyStem: { element: '화' },
          earthlyBranch: { element: '토' },
        },
      },
    }
    expect(deriveCounts(saju)).toEqual({ wood: 1, fire: 1, earth: 1, metal: 0, water: 1 })
  })

  it('falls back to counting legacy *Pillar shape', () => {
    const saju = {
      yearPillar: { heavenlyStem: { element: '목' }, earthlyBranch: { element: '목' } },
      monthPillar: { heavenlyStem: { element: 'metal' } },
    }
    expect(deriveCounts(saju)).toEqual({ wood: 2, fire: 0, earth: 0, metal: 1, water: 0 })
  })

  it('returns zeros when no element data resolvable', () => {
    expect(deriveCounts({ pillars: {} })).toEqual({
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    })
  })
})

describe('ElementRadar', () => {
  const balanced = { fiveElements: { wood: 2, fire: 2, earth: 2, metal: 2, water: 2 } }

  describe('empty state', () => {
    it('shows ko empty message when all counts are zero', () => {
      render(<ElementRadar saju={undefined} />)
      expect(screen.getByText('오행 정보가 아직 계산되지 않았습니다.')).toBeInTheDocument()
    })

    it('shows en empty message when all counts are zero', () => {
      render(<ElementRadar saju={undefined} lang="en" />)
      expect(screen.getByText('Element data is not ready yet.')).toBeInTheDocument()
    })

    it('does not render an svg in the empty state', () => {
      const { container } = render(<ElementRadar saju={undefined} />)
      expect(container.querySelector('svg')).toBeNull()
    })
  })

  describe('chart rendering', () => {
    it('renders an svg with grid rings and axis lines when data present', () => {
      const { container } = render(<ElementRadar saju={balanced} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      // 4 ring polygons + 1 data polygon = 5 polygons
      expect(container.querySelectorAll('polygon')).toHaveLength(5)
      // 5 axis lines
      expect(container.querySelectorAll('line')).toHaveLength(5)
    })

    it('renders all five short axis labels in ko', () => {
      const { container } = render(<ElementRadar saju={balanced} />)
      const text = container.textContent || ''
      expect(text).toContain('창의력')
      expect(text).toContain('추진력')
      expect(text).toContain('안정성')
      expect(text).toContain('결단력')
      expect(text).toContain('유연성')
    })

    it('renders five hanja element glyphs in ko', () => {
      const { container } = render(<ElementRadar saju={balanced} />)
      const text = container.textContent || ''
      expect(text).toContain('木')
      expect(text).toContain('火')
      expect(text).toContain('土')
      expect(text).toContain('金')
      expect(text).toContain('水')
    })

    it('renders english axis labels when lang=en', () => {
      const { container } = render(<ElementRadar saju={balanced} lang="en" />)
      const text = container.textContent || ''
      expect(text).toContain('Creativity')
      expect(text).toContain('Drive')
      expect(text).toContain('Wood')
    })

    it('renders the center/strength caption (ko)', () => {
      render(<ElementRadar saju={balanced} />)
      expect(screen.getByText('중심 ← 약함 · 멀수록 강함 →')).toBeInTheDocument()
    })

    it('renders the center/strength caption (en)', () => {
      render(<ElementRadar saju={balanced} lang="en" />)
      expect(screen.getByText('center = weak · further out = stronger')).toBeInTheDocument()
    })
  })

  describe('dominant element interpretation', () => {
    it('reports wood as strongest in ko', () => {
      const { container } = render(
        <ElementRadar saju={{ fiveElements: { wood: 5, fire: 1, earth: 1, metal: 1, water: 1 } }} />
      )
      const text = container.textContent || ''
      expect(text).toContain('가장 강한 건')
      expect(text).toContain('창의력')
      // phrase for wood
      expect(text).toContain('아이디어를 기획하고 새로 시작하는 데 강해요.')
    })

    it('reports drive (fire) as strongest in en', () => {
      const { container } = render(
        <ElementRadar
          saju={{ fiveElements: { wood: 1, fire: 5, earth: 1, metal: 1, water: 1 } }}
          lang="en"
        />
      )
      const text = container.textContent || ''
      expect(text).toContain('Your strongest pull is')
      expect(text).toContain('drive')
    })
  })

  describe('weak element remedy', () => {
    it('shows the weak remedy (ko) when an element is 0 and distinct from dominant', () => {
      const { container } = render(
        <ElementRadar saju={{ fiveElements: { wood: 5, fire: 2, earth: 2, metal: 2, water: 0 } }} />
      )
      const text = container.textContent || ''
      expect(text).toContain('약한 건')
      // water remedy
      expect(text).toContain('학습·명상·여행이 균형을 잡아줘요.')
    })

    it('shows the weak remedy (en) when an element is weak', () => {
      const { container } = render(
        <ElementRadar
          saju={{ fiveElements: { wood: 5, fire: 2, earth: 2, metal: 2, water: 0 } }}
          lang="en"
        />
      )
      const text = container.textContent || ''
      expect(text).toContain('Weakest is')
      expect(text).toContain('learning, meditation, travel help balance.')
    })

    it('does not show weak remedy when all elements are >= 2 (balanced)', () => {
      const { container } = render(<ElementRadar saju={balanced} />)
      const text = container.textContent || ''
      expect(text).not.toContain('약한 건')
    })

    it('shows weak remedy when only one element is present (others default to 0)', () => {
      // single element: wood=3 dominant, fire=0 weakest (distinct) → showWeak true
      const { container } = render(<ElementRadar saju={{ fiveElements: { wood: 3 } }} />)
      const text = container.textContent || ''
      expect(text).toContain('가장 강한 건')
      expect(text).toContain('약한 건')
    })

    it('does not show weak remedy when all counts are equal (weak === dominant)', () => {
      // all equal → reduce picks same key for dominant and weakest → showWeak false
      const { container } = render(
        <ElementRadar saju={{ fiveElements: { wood: 3, fire: 3, earth: 3, metal: 3, water: 3 } }} />
      )
      const text = container.textContent || ''
      expect(text).toContain('가장 강한 건')
      expect(text).not.toContain('약한 건')
    })
  })

  describe('container variations', () => {
    it('renders chart container (non-empty) for pillar-derived data', () => {
      const saju = {
        pillars: {
          year: { heavenlyStem: { element: 'wood' }, earthlyBranch: { element: 'water' } },
        },
      }
      const { container } = render(<ElementRadar saju={saju} />)
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })
})
