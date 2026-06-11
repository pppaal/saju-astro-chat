// 배포 stale-chunk 자동 복구 훅 — 2026-06-11 실사용 리포트(타로 화면 이동 중
// ChunkLoadError → "타로 오류" 화면) 재발 방지.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStaleChunkReload } from '@/hooks/useStaleChunkReload'

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

function mockReload() {
  const reload = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
  })
  return reload
}

describe('useStaleChunkReload', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it.each([
    'Loading chunk 4521 failed.',
    'Loading CSS chunk 88 failed',
    'Failed to fetch dynamically imported module: https://x/_next/a.js',
    'Importing a module script failed.',
  ])('청크 에러는 1회 자동 리로드: %s', (message) => {
    const reload = mockReload()
    const { result } = renderHook(() => useStaleChunkReload(new Error(message)))
    expect(result.current).toBe(true) // 바운더리는 빈 화면을 그려야 함
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('ChunkLoadError 라는 이름만으로도 감지한다 (webpack 런타임)', () => {
    const reload = mockReload()
    const err = new Error('something opaque')
    err.name = 'ChunkLoadError'
    const { result } = renderHook(() => useStaleChunkReload(err))
    expect(result.current).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('일반 에러는 리로드하지 않는다 — 진짜 장애는 에러 화면으로', () => {
    const reload = mockReload()
    const { result } = renderHook(() => useStaleChunkReload(new Error('boom: cannot read x')))
    expect(result.current).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('30초 안의 재발은 리로드 루프 대신 에러 화면으로 떨어진다', () => {
    const reload = mockReload()
    window.sessionStorage.setItem('stale-chunk-reload-at', String(Date.now() - 1000))
    const { result } = renderHook(() => useStaleChunkReload(new Error('Loading chunk 7 failed')))
    expect(result.current).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('가드 만료(30초 경과) 후에는 다시 리로드를 허용한다', () => {
    const reload = mockReload()
    window.sessionStorage.setItem('stale-chunk-reload-at', String(Date.now() - 31_000))
    const { result } = renderHook(() => useStaleChunkReload(new Error('Loading chunk 7 failed')))
    expect(result.current).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
