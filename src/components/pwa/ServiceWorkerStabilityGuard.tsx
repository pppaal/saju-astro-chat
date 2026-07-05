'use client'

import { useEffect } from 'react'

// 프로덕션에서 정상적으로 등록돼 있어야 하는 유일한 service worker.
// (next-pwa 는 webpack 플러그인이라 Turbopack 빌드에선 sw.js 를 생성하지 않는다.
//  즉 워크박스 SW 는 더 이상 등록되지 않으며, 살아있는 건 푸시 구독자의
//  push-sw.js 뿐이다.)
const PUSH_SW_PATH = '/push-sw.js'

function scriptUrlOf(reg: ServiceWorkerRegistration): string {
  return reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ''
}

/**
 * Service worker 위생 가드.
 *
 * - 개발: 모든 SW 를 unregister (핫리로드 stale-SW 루프 방지).
 * - 프로덕션: 예전 webpack 빌드 시절 등록된 **레거시 워크박스 SW** 를 정리한다.
 *   next-pwa 가 Turbopack 에서 sw.js 를 생성하지 않게 된 뒤 `/sw.js` 는 404 가
 *   됐지만, 이미 그 SW 를 등록한 기존 사용자는 브라우저가 그것을 무기한 유지해
 *   **구버전 precache(결제/크레딧 페이지 포함)를 계속 서빙**할 수 있다. 예전엔
 *   이 가드가 프로덕션에서 곧장 return 해 아무것도 정리하지 않았다.
 *   push-sw.js(푸시 구독자용, Cache Storage 미사용)는 보존하고 그 외 SW 만
 *   unregister + 남은 precache 캐시를 비운다.
 */
export default function ServiceWorkerStabilityGuard() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isProd = process.env.NODE_ENV === 'production'

    const run = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()

        // 개발: 전부 제거. 프로덕션: push-sw.js 가 아닌 레거시 SW 만 제거.
        const targets = isProd
          ? registrations.filter((reg) => !scriptUrlOf(reg).endsWith(PUSH_SW_PATH))
          : registrations

        if (targets.length === 0) return

        await Promise.all(targets.map((reg) => reg.unregister()))

        // unregister 는 Cache Storage 를 비우지 않는다 — 레거시 워크박스 precache 가
        // 남아 구버전 자산을 계속 서빙할 수 있으므로 함께 삭제한다. push-sw.js 는
        // Cache Storage 를 쓰지 않아 전체 삭제가 안전하다. (레거시 SW 를 실제로
        // 발견했을 때만 실행 — 일반 사용자의 매 로드에 캐시를 건드리지 않는다.)
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
      } catch {
        // 위생 가드 실패는 무시 — 앱 동작에 영향 주지 않는다.
      }
    }

    void run()
  }, [])

  return null
}
