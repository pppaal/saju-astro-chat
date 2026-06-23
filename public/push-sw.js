/**
 * push-sw.js — 독립 실행 서비스워커(웹 푸시 전용).
 *
 * 왜 별도 파일인가: 이 프로젝트의 `next build` 는 Turbopack 으로 도는데
 * next-pwa(@ducanh2912)는 webpack 플러그인이라 동작하지 않아 `/sw.js` 가
 * 빌드 산출물로 생성되지 않는다(= 웹 푸시가 처음부터 불가). 푸시에는 workbox
 * 캐싱이 필요 없으므로, 푸시/클릭 핸들러만 담은 정적 SW 를 직접 서빙한다.
 * 클라이언트는 lib/push/subscribe.ts 에서 이 파일을 명시적으로 등록한다.
 *
 * 처리:
 *   - push: payload(JSON { title, body, url, tag }) 파싱 → 알림 표시
 *   - notificationclick: 알림 url(기본 /calendar) 열기(이미 열린 탭이면 focus)
 *
 * 발송: /api/cron/{daily-fortune,keyday-push,winback-push} (web-push / VAPID)
 */

/* global self, clients */

const DEFAULT_NOTIFICATION_URL = '/calendar'

// 새 SW 가 곧장 활성화되도록(설치 후 대기 없이) — 첫 구독 직후 바로 발송 가능.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

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
