// src/lib/social/types.ts
//
// 소셜 자동화 — 매일 "오늘의 카드" 콘텐츠를 플랫폼별 초안으로 만들어 어드민이
// 검토·승인한 뒤 발행한다(발행 어댑터는 키 확보 후 연결). 저장은 Redis
// (공유링크와 동일 — 마이그레이션 리스크 0, 휘발해도 되는 마케팅 데이터).

export type SocialPlatform = 'instagram' | 'threads' | 'youtube'

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['instagram', 'threads', 'youtube']

// pending: 생성됨(검토 대기) · approved: 승인(발행 가능) · rejected: 반려
// published: 발행 완료(어댑터 연결 후). 발행 전까진 어드민이 텍스트 편집 가능.
export type SocialDraftStatus = 'pending' | 'approved' | 'rejected' | 'published'

export interface SocialVariant {
  platform: SocialPlatform
  /** 게시 본문/캡션. */
  caption: string
  hashtags: string[]
  /** 유튜브 Shorts 대본(선택). */
  script?: string
}

export interface SocialPostDraft {
  id: string
  /** 콘텐츠 기준일 (YYYY-MM-DD, KST). */
  date: string
  locale: 'ko' | 'en'
  /** 소스 카드/테마 — 어드민 표시 + 이미지 첨부 기준. */
  cardName: string
  cardImage: string
  isReversed: boolean
  /** 한 줄 후크(공통). */
  hook: string
  variants: SocialVariant[]
  status: SocialDraftStatus
  createdAt: string
  updatedAt: string
}
