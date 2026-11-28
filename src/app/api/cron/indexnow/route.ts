// src/app/api/cron/indexnow/route.ts
//
// 매일 갱신되는 SEO 표면(띠별 운세 + 홈)을 IndexNow 로 푸시하는 크론.
// 구글은 사이트맵/서치콘솔로 가고, 이 크론은 네이버·빙의 재색인을 크롤 대기
// 없이 당긴다. 보안은 다른 cron 과 동일(withCronAuth): IP 레이트리밋 →
// timing-safe CRON_SECRET. INDEXNOW_KEY 미설정이면 no-op(선택 기능).
//
// Vercel cron: vercel.json — 매일 22:30 UTC (daily-fortune 22:00 갱신 직후).

import { NextResponse } from 'next/server'
import { withCronAuth } from '@/lib/api/middleware/cronGuard'
import { isIndexNowConfigured, pingIndexNow } from '@/lib/seo/indexnow'
import { ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 매일 내용이 바뀌는 페이지만 — 정적 페이지는 사이트맵이 커버한다.
function dailyUrls(): string[] {
  const paths = ['/', '/fortune', ...ZODIAC_ANIMALS.map((a) => `/fortune/${a.slug}`)]
  // /ko 경로 프리픽스(proxy.ts 리라이트) 규약: 베어 경로 = en, /ko/... = ko.
  return paths.flatMap((p) => [p, p === '/' ? '/ko' : `/ko${p}`])
}

async function handle(): Promise<NextResponse> {
  if (!isIndexNowConfigured()) {
    return NextResponse.json({ success: true, skipped: 'not_configured' })
  }
  const result = await pingIndexNow(dailyUrls())
  // 핑 실패는 best-effort — 크론 자체는 성공으로 끝내되 결과를 그대로 싣는다
  // (Vercel 크론 재시도로 해결될 문제가 아니고, 다음 날 다시 시도된다).
  return NextResponse.json({ success: true, ...result })
}

export const GET = withCronAuth('indexnow', handle)
export const POST = GET
