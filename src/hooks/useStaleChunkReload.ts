'use client'

import { useEffect, useMemo } from 'react'
import { logger } from '@/lib/logger'

// 배포 직후 열려 있던 탭의 고질병: 옛 HTML 이 참조하는 해시드 청크가 새
// 배포에서 사라져, 화면 이동(lazy chunk 로드) 순간 ChunkLoadError 가 터지고
// 에러 바운더리("타로 오류" 등)가 뜬다. 바운더리의 reset() 은 같은 stale
// 청크를 다시 요청할 뿐이라 소용없고, 새 HTML 을 받는 전체 리로드만이
// 복구다. (이 에러는 instrumentation-client 의 Sentry 필터에서 "배포 탓"
// 으로 분류되어 버려질 만큼 잘 알려져 있었지만, 사용자를 복구시키는 코드는
// 없었다 — 2026-06-11 타로 화면 이동 중 실사용 리포트로 추가.)
const CHUNK_ERROR_RE =
  /loading chunk|loading css chunk|failed to fetch dynamically imported module|importing a module script failed/i

const RELOAD_GUARD_KEY = 'stale-chunk-reload-at'
const RELOAD_GUARD_MS = 30_000

function isChunkLoadError(error: Error): boolean {
  return CHUNK_ERROR_RE.test(error.message || '') || error.name === 'ChunkLoadError'
}

/**
 * 에러 바운더리용 — stale 청크 에러면 1회 자동 전체 리로드로 복구한다.
 *
 * @returns true 면 지금 리로드가 예약된 상태 — 바운더리는 에러 UI 를
 *   그리지 말고 빈 화면(또는 로더)을 반환해 깜빡임을 줄여라. 30초 안에
 *   같은 에러가 반복되면(리로드로도 해결 안 되는 진짜 장애) false 를
 *   돌려 일반 에러 화면으로 떨어진다.
 */
export function useStaleChunkReload(error: Error & { digest?: string }): boolean {
  const shouldReload = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (!isChunkLoadError(error)) return false
    try {
      const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) || '0')
      return Date.now() - last > RELOAD_GUARD_MS
    } catch {
      // sessionStorage 막힌 환경(시크릿 일부 등) — 루프 가드를 잃느니
      // 리로드를 포기하고 일반 에러 화면을 보여준다.
      return false
    }
  }, [error])

  useEffect(() => {
    if (!shouldReload) return
    try {
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
    } catch {
      return
    }
    logger.warn('[stale-chunk] deployment chunk mismatch — reloading once', {
      message: error.message,
    })
    window.location.reload()
  }, [shouldReload, error])

  return shouldReload
}
