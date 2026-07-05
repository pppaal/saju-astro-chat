'use client'

import { useEffect } from 'react'

// 프로덕션에서 등록해 유지하는 유일한 service worker(웹 푸시 + 오프라인 폴백).
// next-pwa 는 webpack 플러그인이라 Turbopack 빌드에선 sw.js 를 생성하지 않으므로,
// 정적으로 서빙하는 이 통합 SW 를 직접 등록한다(public/push-sw.js).
const APP_SW_PATH = '/push-sw.js'

function scriptUrlOf(reg: ServiceWorkerRegistration): string {
  return reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ''
}

/**
 * Service worker 위생·등록 가드.
 *
 * - 개발: 모든 SW 를 unregister (핫리로드 stale-SW 루프 방지).
 * - 프로덕션:
 *   1) 예전 webpack 빌드 시절 등록된 **레거시 워크박스 SW**(/sw.js 등)를 정리한다.
 *      next-pwa 가 Turbopack 에서 sw.js 를 생성하지 않게 된 뒤 /sw.js 는 404 지만,
 *      이미 등록한 기존 사용자는 브라우저가 그것을 유지해 구버전 precache(결제/
 *      크레딧 페이지 포함)를 계속 서빙할 수 있다.
 *   2) 통합 SW(push-sw.js) 를 등록한다 — 전 사용자에게 오프라인 네비게이션 폴백을
 *      제공(매니페스트가 standalone PWA 를 광고하는데 예전엔 SW 부재로 오프라인이
 *      전혀 동작하지 않았다). push 구독자면 같은 SW 가 푸시도 처리.
 *
 * 레거시 캐시 정리는 push-sw.js 의 activate 핸들러(OFFLINE_CACHE 외 전부 삭제)가
 * 담당하므로 여기서 캐시를 직접 건드리지 않는다.
 */
export default function ServiceWorkerStabilityGuard() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const isProd = process.env.NODE_ENV === 'production'

    const run = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()

        if (!isProd) {
          // 개발: 전부 제거하고 등록도 하지 않는다(HMR 안정).
          await Promise.all(registrations.map((reg) => reg.unregister()))
          return
        }

        // 프로덕션: push-sw.js 가 아닌 레거시 SW 만 제거.
        const stale = registrations.filter((reg) => !scriptUrlOf(reg).endsWith(APP_SW_PATH))
        await Promise.all(stale.map((reg) => reg.unregister()))

        // 통합 SW 등록(멱등 — 이미 있으면 업데이트 체크만). 등록 자체는 앱 동작에
        // 필수가 아니므로 실패해도 조용히 무시.
        await navigator.serviceWorker.register(APP_SW_PATH, { scope: '/' }).catch(() => undefined)
      } catch {
        // 위생 가드 실패는 무시 — 앱 동작에 영향 주지 않는다.
      }
    }

    void run()
  }, [])

  return null
}
