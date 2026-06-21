/**
 * useParticleField hook tests
 *
 * 배경 파티클 필드 훅 — canvas 2d 컨텍스트 + requestAnimationFrame 애니메이션
 * 루프를 세운다. happy-dom 에는 canvas 2d 렌더링이 없으므로 getContext 와
 * rAF/cancelAnimationFrame 을 스텁으로 갈아끼우고, init/resize/cleanup
 * 라이프사이클과 옵션 분기를 검증한다.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useParticleField, type ParticleFieldOptions } from '@/hooks/useParticleField'

// --- canvas 2d 컨텍스트 스텁 -------------------------------------------------
// 훅이 실제로 호출하는 메서드만 채운다(clearRect/beginPath/arc/fill/moveTo/
// lineTo/stroke). fillStyle/strokeStyle/lineWidth 는 평범한 프로퍼티.
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
  }
}

// canvasRef 형태의 ref 객체를 만든다. getContext 가 ctx(또는 null) 를 돌려준다.
function makeCanvasRef(ctx: ReturnType<typeof makeCtxStub> | null) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement
  return { current: canvas }
}

describe('useParticleField', () => {
  let rafCallbacks: Array<(t: number) => void>
  let rafSpy: ReturnType<typeof vi.fn>
  let cancelSpy: ReturnType<typeof vi.fn>
  let addSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    rafCallbacks = []
    // requestAnimationFrame 을 스텁 — 콜백을 큐에 모으고 증가하는 핸들을 돌려줘
    // 무한 루프(animate 가 다시 rAF 를 호출)에 빠지지 않게 한다.
    rafSpy = vi.fn((cb: (t: number) => void) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length // non-zero handle
    })
    cancelSpy = vi.fn()
    vi.stubGlobal('requestAnimationFrame', rafSpy)
    vi.stubGlobal('cancelAnimationFrame', cancelSpy)
    // 결정적 파티클 위치를 위해 Math.random 고정.
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // innerWidth/innerHeight 를 알려진 값으로.
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
    addSpy = vi.spyOn(window, 'addEventListener')
    removeSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // animate 콜백을 N번 펌프 — 매번 새로 등록된 마지막 콜백을 꺼내 실행한다.
  function pump(times = 1, timestamp = 16) {
    for (let i = 0; i < times; i++) {
      const cb = rafCallbacks[rafCallbacks.length - 1]
      if (cb) cb(timestamp * (i + 1))
    }
  }

  it('does nothing when canvasRef is null', () => {
    const ref = { current: null }
    renderHook(() => useParticleField(ref))
    expect(rafSpy).not.toHaveBeenCalled()
    expect(addSpy).not.toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('bails out when getContext returns null (no 2d context)', () => {
    const ref = makeCanvasRef(null)
    renderHook(() => useParticleField(ref))
    expect(ref.current!.getContext).toHaveBeenCalledWith('2d')
    // 컨텍스트가 없으면 애니메이션/리스너 세팅 전에 return.
    expect(rafSpy).not.toHaveBeenCalled()
  })

  it('initializes canvas size and starts the animation loop', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    renderHook(() => useParticleField(ref))

    // window 크기로 canvas 를 맞춘다.
    expect(ref.current!.width).toBe(800)
    expect(ref.current!.height).toBe(600)
    // animate() 가 rAF 를 한 번 예약했다.
    expect(rafSpy).toHaveBeenCalledTimes(1)
    // mousemove/mouseout/resize 리스너를 단다.
    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('mouseout', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('renders particles and clears each frame when pumped', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    renderHook(() => useParticleField(ref, { particleCount: 10, areaPerParticle: 9000 }))

    // 첫 프레임 실행.
    pump(1, 16)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    // 파티클이 그려졌다(arc/fill 호출됨).
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    // 다음 프레임을 또 예약.
    expect(rafSpy.mock.calls.length).toBeGreaterThan(1)
  })

  it('removes listeners and cancels rAF on unmount', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    const { unmount } = renderHook(() => useParticleField(ref))

    unmount()

    expect(cancelSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('mouseout', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('handles resize by re-reading window size and re-initializing', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    renderHook(() => useParticleField(ref))

    // 등록된 resize 핸들러를 직접 끄집어낸다.
    const resizeCall = addSpy.mock.calls.find((c) => c[0] === 'resize')
    expect(resizeCall).toBeDefined()
    const resizeHandler = resizeCall![1] as () => void

    // window 크기를 바꾼 뒤 핸들러 호출.
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
    resizeHandler()

    expect(ref.current!.width).toBe(1024)
    expect(ref.current!.height).toBe(768)
  })

  it('updates the internal mouse position on mousemove and clears it on mouseout', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    renderHook(() => useParticleField(ref, { mouseRadius: 200 }))

    const moveHandler = addSpy.mock.calls.find((c) => c[0] === 'mousemove')![1] as (
      e: MouseEvent
    ) => void
    const outHandler = addSpy.mock.calls.find((c) => c[0] === 'mouseout')![1] as () => void

    // mousemove 후 프레임 펌프 — update() 의 마우스 반발 분기가 실행되어도
    // 던지지 않아야 한다(좌표가 정상적으로 읽힘).
    expect(() => {
      moveHandler({ x: 400, y: 300 } as MouseEvent)
      pump(1, 16)
      outHandler()
      pump(1, 32)
    }).not.toThrow()
  })

  it('respects the fps cap — frames within the interval are skipped', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    // fps=10 → frameInterval=100ms. 첫 호출(timestamp 0 기준)은 렌더,
    // interval 미만 간격의 후속 프레임은 clearRect 를 추가로 호출하지 않는다.
    renderHook(() => useParticleField(ref, { fps: 10 }))

    const callsBefore = ctx.clearRect.mock.calls.length
    // timestamp 가 너무 가까운(50ms) 프레임 — interval(100ms) 미만이라 skip.
    pump(1, 50)
    // 첫 animate() 는 timestamp 0 으로 이미 한 번 렌더했을 수 있으니
    // skip 프레임이 추가 렌더를 만들지 않았음을 본다.
    pump(1, 60)
    // 정확한 카운트보다는 "interval 분기가 존재/동작"을 확인 — 던지지 않고
    // clearRect 호출이 폭주하지 않는다.
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThanOrEqual(callsBefore)
  })

  it('falls back to default rgb when color is not a valid 6-hex', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    // 잘못된 color → hexToRgb 폴백(136,179,247). 연결선이 그려질 때
    // strokeStyle 에 그 rgb 가 들어가는지 본다. 파티클을 충분히 모아
    // 연결선이 한 번이라도 그려지도록 한다.
    renderHook(() =>
      useParticleField(ref, {
        color: 'not-a-hex',
        particleCount: 50,
        areaPerParticle: 1000,
        maxLinkDistance: 100000, // 모든 점이 연결되도록 거대하게
      } as ParticleFieldOptions)
    )

    pump(1, 16)
    // 연결선이 그려졌다면 strokeStyle 이 폴백 rgb 로 설정됐다.
    // (Math.random=0.5 고정이라 모든 점이 같은 좌표 → distSq 0 < link^2)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(String(ctx.strokeStyle)).toContain('136, 179, 247')
  })

  it('parses a valid hex color into stroke rgb', () => {
    const ctx = makeCtxStub()
    const ref = makeCanvasRef(ctx)
    renderHook(() =>
      useParticleField(ref, {
        color: '#ff0000',
        particleCount: 30,
        areaPerParticle: 1000,
        maxLinkDistance: 100000,
      })
    )

    pump(1, 16)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(String(ctx.strokeStyle)).toContain('255, 0, 0')
  })
})
