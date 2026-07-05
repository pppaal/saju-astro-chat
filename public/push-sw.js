/**
 * push-sw.js — 독립 실행 서비스워커(웹 푸시 + 오프라인 폴백).
 *
 * 왜 별도 파일인가: 이 프로젝트의 `next build` 는 Turbopack 으로 도는데
 * next-pwa(@ducanh2912)는 webpack 플러그인이라 동작하지 않아 `/sw.js` 가
 * 빌드 산출물로 생성되지 않는다. 그래서 (1) 웹 푸시 (2) 오프라인 네비게이션
 * 폴백을 담은 정적 SW 를 직접 서빙한다. scope '/' 에는 SW 가 하나만 붙을 수
 * 있으므로 푸시와 오프라인을 이 한 파일에 통합한다.
 *
 * 처리:
 *   - install: /offline 페이지를 프리캐시(오프라인 시 표시용) + 즉시 활성화.
 *   - activate: 이 버전(OFFLINE_CACHE) 외 오래된 캐시 삭제 + 클라이언트 접수.
 *   - fetch: *네비게이션(top-level 페이지 이동)* 만 network-first 로 가로채,
 *            네트워크 실패(오프라인) 시에만 캐시된 /offline 을 반환한다. 자산·
 *            API·결제 등 그 외 요청은 일절 가로채지 않아(respondWith 미호출)
 *            구버전 자산을 서빙하는 stale 위험이 없다.
 *   - push / notificationclick: 알림 표시 및 클릭 시 열기.
 *
 * 등록: 전 사용자 — components/pwa/ServiceWorkerStabilityGuard 가 앱 로드 시
 *       등록(오프라인 폴백은 모두에게). 푸시 구독은 lib/push/subscribe.ts 가
 *       같은 파일을 재사용(멱등).
 *
 * 발송: /api/cron/{daily-fortune,keyday-push,winback-push} (web-push / VAPID)
 */

/* global self, clients, caches, fetch, Response */

const DEFAULT_NOTIFICATION_URL = '/calendar'
const OFFLINE_URL = '/offline'
// 버전 문자열을 올리면 activate 가 옛 캐시를 지우고 /offline 을 새로 받는다.
const OFFLINE_CACHE = 'destinypal-offline-v1'

// 새 SW 가 곧장 활성화되도록(설치 후 대기 없이) + /offline 프리캐시.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      // {cache:'reload'} 로 HTTP 캐시를 우회해 최신 /offline 을 담는다.
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))
      )
      .catch(() => undefined)
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // 오직 top-level 페이지 네비게이션만 다룬다. 그 외(자산·API·POST·결제)는
  // 가로채지 않아 기본 네트워크 동작 그대로 — 캐싱/stale 없음.
  if (req.method !== 'GET' || req.mode !== 'navigate') return

  event.respondWith(
    // network-first: 온라인이면 항상 실서버 응답(결제/크레딧 페이지도 최신).
    // 네트워크 실패(오프라인)일 때만 프리캐시한 /offline 을 폴백으로 준다.
    fetch(req).catch(() =>
      caches
        .match(OFFLINE_URL, { ignoreSearch: true })
        .then((cached) => cached || new Response('', { status: 504, statusText: 'Offline' }))
    )
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'DestinyPal'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    // 알림 종류별 tag — 같은 tag 끼리만 교체된다. 없으면 데일리 운세로 본다.
    tag: payload.tag || 'daily-fortune',
    data: { url: payload.url || DEFAULT_NOTIFICATION_URL },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || DEFAULT_NOTIFICATION_URL

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const target = new URL(url, self.location.origin).href
      for (const client of windowClients) {
        if (client.url === target && 'focus' in client) return client.focus()
      }
      for (const client of windowClients) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(target).then((c) => (c ? c.focus() : undefined))
        }
      }
      return clients.openWindow(target)
    })
  )
})
