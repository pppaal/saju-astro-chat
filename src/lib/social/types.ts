// src/lib/social/types.ts
//
// 소셜 자동화 — 매일 버티컬(타로·사주·점성·궁합·캘린더)별 콘텐츠를 플랫폼별
// 초안으로 만들어 어드민이 검토·승인한 뒤 발행한다. 저장은 Redis
// (공유링크와 동일 — 마이그레이션 리스크 0, 휘발해도 되는 마케팅 데이터).

export type SocialPlatform = 'instagram' | 'threads' | 'youtube'

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['instagram', 'threads', 'youtube']

// 콘텐츠 버티컬 — 제품 5개 축과 1:1. 초안 생성/필터/성과 집계의 기준 단위.
export type SocialCategory = 'tarot' | 'saju' | 'astrology' | 'compatibility' | 'calendar'

export const SOCIAL_CATEGORIES: readonly SocialCategory[] = [
  'tarot',
  'saju',
  'astrology',
  'compatibility',
  'calendar',
]

export const CATEGORY_META: Record<SocialCategory, { labelKo: string; emoji: string }> = {
  tarot: { labelKo: '타로', emoji: '🎴' },
  saju: { labelKo: '사주', emoji: '☯️' },
  astrology: { labelKo: '점성', emoji: '✨' },
  compatibility: { labelKo: '궁합', emoji: '💞' },
  calendar: { labelKo: '캘린더', emoji: '📅' },
}

// pending: 생성됨(검토 대기) · approved: 승인(발행 가능) · rejected: 반려
// published: 발행 완료(어댑터 연결 후). 발행 전까진 어드민이 텍스트 편집 가능.
export type SocialDraftStatus = 'pending' | 'approved' | 'rejected' | 'published'

/** 발행된 게시물의 성과 지표 (Threads insights API). */
export interface SocialPostMetrics {
  views: number
  likes: number
  replies: number
  reposts: number
  quotes: number
  /** ISO — 마지막 수집 시각. */
  fetchedAt: string
}

export interface SocialVariant {
  platform: SocialPlatform
  /** 게시 본문/캡션. */
  caption: string
  hashtags: string[]
  /** 유튜브 Shorts 대본(선택). */
  script?: string
  /** 발행 성공 시 외부 게시물 URL. */
  publishedUrl?: string
  /** 발행 성공 시 외부 미디어 ID — insights 조회 키. */
  externalId?: string
  /** 발행 실패 사유(있으면). */
  publishError?: string
  /** 수집된 성과 지표(있으면). */
  metrics?: SocialPostMetrics
}

export interface SocialPostDraft {
  id: string
  /** 콘텐츠 기준일 (YYYY-MM-DD, KST). */
  date: string
  locale: 'ko' | 'en'
  /** 콘텐츠 버티컬 — 구버전 초안엔 없음(타로로 간주). */
  category?: SocialCategory
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

/** 구버전 초안(category 없음)을 타로로 간주하는 헬퍼. */
export function draftCategory(d: SocialPostDraft): SocialCategory {
  return d.category ?? 'tarot'
}
