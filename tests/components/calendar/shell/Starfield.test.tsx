import React, { createRef } from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Starfield, type StarfieldHandle } from '@/components/calendar/shell/Starfield'

// CSS module — happy-dom resolves *.module.css imports via the vitest css plugin,
// but in case class names matter we only assert structure, not class strings.

// happy-dom's HTMLCanvasElement.getContext returns null by default, so the
// component's draw loop never starts. Stub a minimal 2D context so the
// requestAnimationFrame draw loop actually exercises the canvas drawing code.
function makeCtxStub() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
  }
}

describe('Starfield', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>
  let rafSpy: ReturnType<typeof vi.spyOn>
  let cancelSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(makeCtxStub() as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => {
    getContextSpy.mockRestore()
    rafSpy?.mockRestore()
    cancelSpy?.mockRestore()
    vi.restoreAllMocks()
  })

  it('renders a canvas element with aria-hidden', () => {
    const { container } = render(<Starfield />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveAttribute('aria-hidden')
  })

  it('applies an extra className alongside the base class', () => {
    const { container } = render(<Starfield className="extra-star" />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.className).toContain('extra-star')
  })

  it('acquires a 2d drawing context on mount', () => {
    render(<Starfield />)
    expect(getContextSpy).toHaveBeenCalledWith('2d')
  })

  it('starts the animation loop via requestAnimationFrame', () => {
    rafSpy = vi.spyOn(window, 'requestAnimationFrame')
    render(<Starfield />)
    expect(rafSpy).toHaveBeenCalled()
  })

  it('exposes an imperative setCamDepth handle through the ref', () => {
    const ref = createRef<StarfieldHandle>()
    render(<Starfield ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(typeof ref.current?.setCamDepth).toBe('function')
    // Should be callable without throwing (mutates internal depthRef).
    expect(() => ref.current?.setCamDepth(2)).not.toThrow()
    expect(() => ref.current?.setCamDepth(0)).not.toThrow()
  })

  it('cancels the animation frame and removes resize listener on unmount', () => {
    cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Starfield />)
    unmount()
    expect(cancelSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('registers a window resize listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    render(<Starfield />)
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('redraws when the animation frame callback runs (clearRect invoked)', () => {
    const ctx = makeCtxStub()
    getContextSpy.mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    // Drive rAF synchronously so the draw() body executes at least once.
    const callbacks: FrameRequestCallback[] = []
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb)
      return callbacks.length
    })
    render(<Starfield />)
    // Run the first queued frame.
    callbacks.shift()?.(performance.now())
    expect(ctx.clearRect).toHaveBeenCalled()
  })

  it('does not throw when getContext returns null (no 2d support)', () => {
    getContextSpy.mockReturnValue(null)
    expect(() => render(<Starfield />)).not.toThrow()
  })
})
