// src/app/indexnow.txt/route.ts
//
// IndexNow 소유 증명 키 파일 — 검색엔진이 keyLocation(이 URL)을 읽어 제출된
// key 와 일치하는지 확인한다. INDEXNOW_KEY 미설정이면 404(기능 꺼짐).
// 스펙: 순수 텍스트로 키만 담으면 된다. https://www.indexnow.org/documentation

import { indexNowKey } from '@/lib/seo/indexnow'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = indexNowKey()
  if (!key) return new Response('Not Found', { status: 404 })
  return new Response(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // 키는 사실상 불변 — 크롤러가 자주 읽어도 부담 없게 하루 캐시.
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
