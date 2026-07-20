// src/lib/seo/indexnow.ts
//
// IndexNow — 새/갱신 URL 을 검색엔진(Bing·Naver·Seznam·Yandex 등 참여 엔진)에
// 즉시 푸시한다. 구글은 미참여지만, 한국 트래픽의 핵심인 네이버가 IndexNow 를
// 받으므로 매일 갱신되는 운세 페이지의 재색인을 크롤 대기 없이 당길 수 있다.
//
// 프로토콜(https://www.indexnow.org/documentation):
//   POST https://api.indexnow.org/indexnow  { host, key, keyLocation, urlList }
//   소유 증명: keyLocation 의 텍스트 파일이 key 를 그대로 담고 있으면 된다 —
//   이 앱은 /indexnow.txt 라우트가 INDEXNOW_KEY 를 서빙한다.
//
// 서버 전용. INDEXNOW_KEY 미설정이면 조용히 스킵(선택 기능).

import { logger } from '@/lib/logger'
import { siteBaseUrl } from '@/lib/tarot/shareLink'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
// 프로토콜 상한은 10,000 — 방어적으로 훨씬 낮게 자른다(우리 일일 갱신은 ~30개).
const MAX_URLS_PER_PING = 1000

export function indexNowKey(): string | null {
  const key = (process.env.INDEXNOW_KEY || '').trim()
  return key || null
}

export function isIndexNowConfigured(): boolean {
  return indexNowKey() !== null
}

export interface IndexNowResult {
  ok: boolean
  submitted: number
  status?: number
  skipped?: 'not_configured' | 'no_urls'
  error?: string
}

/**
 * URL 목록을 IndexNow 로 제출한다. 실패해도 throw 하지 않는다 — 색인 핑은
 * best-effort 이고 어떤 사용자 흐름도 막으면 안 된다.
 */
export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = indexNowKey()
  if (!key) return { ok: false, submitted: 0, skipped: 'not_configured' }

  const base = siteBaseUrl()
  const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
  // 같은 호스트의 절대 URL 만 — IndexNow 는 타 호스트 URL 이 섞이면 전체를 거부한다.
  const urlList = [...new Set(urls)]
    .map((u) => (u.startsWith('http') ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`))
    .filter((u) => u.startsWith(base))
    .slice(0, MAX_URLS_PER_PING)
  if (urlList.length === 0) return { ok: false, submitted: 0, skipped: 'no_urls' }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${base}/indexnow.txt`,
        urlList,
      }),
    })
    // 200(OK)·202(Accepted) 가 성공. 4xx 는 키/포맷 문제 — 로그로 남겨 조사.
    if (res.ok || res.status === 202) {
      logger.info('[seo/indexnow] submitted', { count: urlList.length, status: res.status })
      return { ok: true, submitted: urlList.length, status: res.status }
    }
    const body = (await res.text().catch(() => '')).slice(0, 200)
    logger.warn('[seo/indexnow] rejected', { status: res.status, body })
    return { ok: false, submitted: 0, status: res.status, error: body || `HTTP ${res.status}` }
  } catch (error) {
    logger.warn('[seo/indexnow] ping failed', { error })
    return { ok: false, submitted: 0, error: error instanceof Error ? error.message : 'unknown' }
  }
}
