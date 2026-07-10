import type { SocialCategory } from './types'

/**
 * 소셜 카드 이미지 URL(상대 경로) — 서버사이드 생성 라우트(/api/social/card).
 *
 * 드래프트의 후크·제목을 브랜디드 세로 카드(1080×1350)로 렌더해 발행에 싣는다.
 * 예전엔 타로만 카드 아트가 있어 사주·궁합·별자리·캘린더 발행이 전부 텍스트뿐이라
 * (a) Threads 도달이 약하고 (b) 이미지 필수인 Instagram 엔 아예 못 올렸다. 이 카드로
 * 모든 발행을 비주얼화하고 IG 를 연다. 상대 경로라 publish 의 absoluteImageUrl 이
 * 발행 시점에 절대 URL 로 만든다. 파라미터로만 렌더돼 같은 입력=같은 이미지(캐시 가능).
 */
export function socialCardImageUrl(input: {
  category: SocialCategory
  title: string
  hook: string
  locale: 'ko' | 'en'
  /** 배경 글리프(간지/오행 한자 등) — 없으면 생략. */
  glyph?: string
  /** AI 배경 이미지 URL(우리 Blob 스토어) — 있으면 그라데이션 대신 깔린다(aiImage.ts). */
  bg?: string
}): string {
  const p = new URLSearchParams({
    v: input.category,
    t: input.title.slice(0, 90),
    h: input.hook.slice(0, 140),
    lang: input.locale,
  })
  if (input.glyph) p.set('g', input.glyph.slice(0, 4))
  if (input.bg) p.set('bg', input.bg)
  return `/api/social/card?${p.toString()}`
}
