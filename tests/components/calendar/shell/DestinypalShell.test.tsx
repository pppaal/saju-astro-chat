import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DestinypalShell,
  type DestinypalShellProps,
  type DestinypalTierRenderArgs,
} from '@/components/calendar/shell/DestinypalShell'

// Mock the heavy/canvas child so the shell mounts cleanly in happy-dom and we
// can capture imperative setCamDepth calls (parallax sync).
const setCamDepthSpy = vi.fn()
vi.mock('@/components/calendar/shell/Starfield', () => ({
  Starfield: React.forwardRef(function MockStarfield(_props: unknown, ref: React.Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({ setCamDepth: setCamDepthSpy }), [])
    return <div data-testid="starfield" />
  }),
}))

// Topbar uses useI18n; render a simple stand-in that surfaces the props we
// assert on (the tier label that follows the camera).
vi.mock('@/components/calendar/shell/DestinypalTopbar', () => ({
  DestinypalTopbar: (props: Record<string, unknown>) => (
    <div data-testid="topbar">
      <span data-testid="who">{String(props.whoBirthLine)}</span>
      <span data-testid="place">{String(props.place)}</span>
      <span data-testid="ilgan">{String(props.ilganHanja)}</span>
      <span data-testid="tier-ko">{String(props.tierKo)}</span>
      <span data-testid="tier-en">{String(props.tierEn)}</span>
    </div>
  ),
}))

// Rail renders one button per visible tier; keep the real interaction surface
// (onSelect) but as a trivial stand-in.
vi.mock('@/components/calendar/shell/DestinypalRail', () => ({
  DestinypalRail: (props: {
    tiers: ReadonlyArray<{ id: string; ko: string }>
    activeIndex: number
    onSelect: (i: number) => void
  }) => (
    <nav data-testid="rail" data-active={props.activeIndex}>
      {props.tiers.map((t, i) => (
        <button
          key={t.id}
          type="button"
          data-testid={`rail-${t.id}`}
          onClick={() => props.onSelect(i)}
        >
          {t.ko}
        </button>
      ))}
    </nav>
  ),
}))

const topbar: DestinypalShellProps['topbar'] = {
  whoBirthLine: '1990-01-01 12:00',
  place: 'Seoul',
  ilganHanja: '甲',
}

function makeProps(overrides: Partial<DestinypalShellProps> = {}): DestinypalShellProps {
  return {
    topbar,
    renderMonth: (args) => (
      <div data-testid="month-layer">
        month canRise={String(args.canRise)} canDive={String(args.canDive)}
        <button data-testid="month-dive" onClick={args.onDive}>
          dive
        </button>
        <button data-testid="month-focus-day" onClick={args.onFocusDay}>
          focus day
        </button>
      </div>
    ),
    renderDay: (args: DestinypalTierRenderArgs) => (
      <div data-testid="day-layer">
        day canRise={String(args.canRise)} canDive={String(args.canDive)}
        <button data-testid="day-rise" onClick={args.onRise}>
          rise
        </button>
      </div>
    ),
    ...overrides,
  }
}

describe('DestinypalShell', () => {
  beforeEach(() => {
    setCamDepthSpy.mockClear()
    try {
      window.localStorage.clear()
    } catch {
      /* ignore */
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the structural shell: starfield, topbar, rail, and tier layers', () => {
    render(<DestinypalShell {...makeProps()} />)
    expect(screen.getByTestId('starfield')).toBeInTheDocument()
    expect(screen.getByTestId('topbar')).toBeInTheDocument()
    expect(screen.getByTestId('rail')).toBeInTheDocument()
    expect(screen.getByTestId('month-layer')).toBeInTheDocument()
    expect(screen.getByTestId('day-layer')).toBeInTheDocument()
  })

  it('passes topbar props through', () => {
    render(<DestinypalShell {...makeProps()} />)
    expect(screen.getByTestId('who')).toHaveTextContent('1990-01-01 12:00')
    expect(screen.getByTestId('place')).toHaveTextContent('Seoul')
    expect(screen.getByTestId('ilgan')).toHaveTextContent('甲')
  })

  it('renders only the visible tiers (month + day) from tierConfig', () => {
    // SHOW_FULL_TIERS is false → life/decade/year are hidden, so the rail only
    // exposes month + day stops.
    render(<DestinypalShell {...makeProps()} />)
    expect(screen.getByTestId('rail-month')).toBeInTheDocument()
    expect(screen.getByTestId('rail-day')).toBeInTheDocument()
    expect(screen.queryByTestId('rail-life')).not.toBeInTheDocument()
    expect(screen.queryByTestId('rail-decade')).not.toBeInTheDocument()
    expect(screen.queryByTestId('rail-year')).not.toBeInTheDocument()
  })

  it('does not render hidden-tier render props when their layers are not shown', () => {
    const renderLife = vi.fn(() => <div data-testid="life-layer">life</div>)
    render(<DestinypalShell {...makeProps({ renderLife })} />)
    // life tier is hidden → its renderer is never invoked.
    expect(renderLife).not.toHaveBeenCalled()
    expect(screen.queryByTestId('life-layer')).not.toBeInTheDocument()
  })

  it('marks the first tier as active by default (initialTier=0)', () => {
    render(<DestinypalShell {...makeProps()} />)
    expect(screen.getByTestId('rail')).toHaveAttribute('data-active', '0')
  })

  it('clamps an out-of-range initialTier to the max tier index', () => {
    // Only 2 visible tiers → MAX_TIER = 1. initialTier=9 clamps to 1.
    render(<DestinypalShell {...makeProps({ initialTier: 9 })} />)
    expect(screen.getByTestId('rail')).toHaveAttribute('data-active', '1')
  })

  it('syncs camera depth to the starfield on mount', () => {
    render(<DestinypalShell {...makeProps()} />)
    expect(setCamDepthSpy).toHaveBeenCalled()
  })

  it('exposes canRise/canDive correctly per tier', () => {
    render(<DestinypalShell {...makeProps()} />)
    // month is index 0 → canRise false, canDive true
    expect(screen.getByTestId('month-layer')).toHaveTextContent('canRise=false')
    expect(screen.getByTestId('month-layer')).toHaveTextContent('canDive=true')
    // day is index 1 (last) → canRise true, canDive false
    expect(screen.getByTestId('day-layer')).toHaveTextContent('canRise=true')
    expect(screen.getByTestId('day-layer')).toHaveTextContent('canDive=false')
  })

  it('navigates to a tier when a rail stop is clicked and persists it', () => {
    render(<DestinypalShell {...makeProps()} />)
    act(() => {
      fireEvent.click(screen.getByTestId('rail-day'))
    })
    expect(window.localStorage.getItem('dp_tier')).toBe('1')
  })

  it('restores the last tier from localStorage on mount', () => {
    window.localStorage.setItem('dp_tier', '1')
    render(<DestinypalShell {...makeProps()} />)
    expect(screen.getByTestId('rail')).toHaveAttribute('data-active', '1')
  })

  it('ignores a non-numeric localStorage value', () => {
    window.localStorage.setItem('dp_tier', 'not-a-number')
    render(<DestinypalShell {...makeProps()} />)
    expect(screen.getByTestId('rail')).toHaveAttribute('data-active', '0')
  })

  it('responds to ArrowRight (dive) keyboard navigation', () => {
    render(<DestinypalShell {...makeProps()} />)
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowRight' })
    })
    expect(window.localStorage.getItem('dp_tier')).toBe('1')
  })

  it('responds to numeric-key direct tier jumps', () => {
    render(<DestinypalShell {...makeProps()} />)
    act(() => {
      fireEvent.keyDown(window, { key: '2' })
    })
    // '2' → index 1 (clamped within range)
    expect(window.localStorage.getItem('dp_tier')).toBe('1')
  })

  it('invokes onDive from the month render args', () => {
    render(<DestinypalShell {...makeProps()} />)
    act(() => {
      fireEvent.click(screen.getByTestId('month-dive'))
    })
    expect(window.localStorage.getItem('dp_tier')).toBe('1')
  })

  it('invokes onFocusDay from the month render args (jumps to day tier)', () => {
    render(<DestinypalShell {...makeProps()} />)
    act(() => {
      fireEvent.click(screen.getByTestId('month-focus-day'))
    })
    expect(window.localStorage.getItem('dp_tier')).toBe('1')
  })

  it('renders an explicit tier subset (life view: life·decade·year) via tierIds', () => {
    const renderLife = vi.fn(() => <div data-testid="life-layer">life</div>)
    const renderDecade = vi.fn(() => <div data-testid="decade-layer">decade</div>)
    const renderYear = vi.fn(() => <div data-testid="year-layer">year</div>)
    render(
      <DestinypalShell
        topbar={topbar}
        tierIds={['life', 'decade', 'year']}
        storageKey="dp_tier_life"
        renderLife={renderLife}
        renderDecade={renderDecade}
        renderYear={renderYear}
      />
    )
    // only the three life-scale stops are exposed (no month/day)
    expect(screen.getByTestId('rail-life')).toBeInTheDocument()
    expect(screen.getByTestId('rail-decade')).toBeInTheDocument()
    expect(screen.getByTestId('rail-year')).toBeInTheDocument()
    expect(screen.queryByTestId('rail-month')).not.toBeInTheDocument()
    expect(screen.queryByTestId('rail-day')).not.toBeInTheDocument()
    expect(renderLife).toHaveBeenCalled()
  })

  it('persists the subset shell under its own storageKey (no clobbering the calendar)', () => {
    render(
      <DestinypalShell
        topbar={topbar}
        tierIds={['life', 'decade', 'year']}
        storageKey="dp_tier_life"
        renderLife={() => <div>life</div>}
        renderDecade={() => <div>decade</div>}
        renderYear={() => <div>year</div>}
      />
    )
    act(() => {
      fireEvent.click(screen.getByTestId('rail-year'))
    })
    // year is index 2 in this subset; written under the life-scoped key only.
    expect(window.localStorage.getItem('dp_tier_life')).toBe('2')
    expect(window.localStorage.getItem('dp_tier')).toBeNull()
  })

  it('applies a custom className to the root element', () => {
    const { container } = render(<DestinypalShell {...makeProps({ className: 'my-root' })} />)
    expect(container.querySelector('.my-root')).toBeInTheDocument()
  })

  it('removes the keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<DestinypalShell {...makeProps()} />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
