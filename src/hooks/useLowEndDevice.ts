'use client'

import { useEffect, useState } from 'react'

/**
 * 저사양 기기 감지 — PWA 가 느린 사용자 (저가형 Android, 옛 iPhone, 데이터
 * 절약 모드) 에서 무거운 애니메이션을 자동 비활성화.
 *
 * 판정 기준 (하나라도 해당하면 true):
 *   - `navigator.deviceMemory` ≤ 4GB (Chrome 한정 — 안 노출하는 브라우저는 무시)
 *   - `navigator.hardwareConcurrency` ≤ 4 (CPU 코어 4 이하)
 *   - `navigator.connection.saveData` = true (사용자가 데이터 절약 모드 켰음)
 *   - `navigator.connection.effectiveType` = '2g' / 'slow-2g' (느린 회선)
 *   - `prefers-reduced-motion: reduce` 매체 쿼리 매치
 *
 * Browser-only. SSR 중엔 false (= 일반) — hydration mismatch 회피.
 *
 * 사용처:
 *   - `ParticleCanvas` — 저사양엔 아예 렌더 X
 *   - `StarrySky` — 별 개수 줄임 / 끔
 *   - 기타 무거운 인터랙션 컴포넌트
 */
export function useLowEndDevice(): boolean {
  const [isLowEnd, setIsLowEnd] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const nav = navigator as Navigator & {
      deviceMemory?: number
      connection?: { saveData?: boolean; effectiveType?: string }
    }

    // 메모리 4GB 이하 = 저가형 안드로이드 다수
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) {
      setIsLowEnd(true)
      return
    }

    // CPU 코어 4 이하 = 저가형
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) {
      setIsLowEnd(true)
      return
    }

    // 사용자 데이터 절약 모드
    if (nav.connection?.saveData) {
      setIsLowEnd(true)
      return
    }

    // 느린 회선
    const eff = nav.connection?.effectiveType
    if (eff === '2g' || eff === 'slow-2g') {
      setIsLowEnd(true)
      return
    }

    // prefers-reduced-motion 도 저사양 신호로 취급 (배터리 절약 + 접근성)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setIsLowEnd(true)
      return
    }
  }, [])

  return isLowEnd
}
