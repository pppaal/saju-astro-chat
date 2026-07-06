// src/lib/tarot/shareLink.ts
//
// 공개 공유 링크 저장소 — /r/[token] 공개 페이지와 그 동적 OG 이미지가 쓰는
// 공유 리딩 데이터를 Redis(데일리 카드와 동일한 cacheGet/cacheSet)에 담는다.
//
// 왜 DB 가 아니라 Redis 인가: 과거 사고가 전부 "스키마엔 있는데 prod 엔 없는"
// Prisma 마이그레이션 드리프트였다. 공유 링크는 돈과 무관하고 휘발해도 되는
// 데이터라(바이럴 미끼) TTL 캐시로 충분하며, 검증된 경로라 새 마이그레이션
// 리스크가 0 이다. 토큰은 추측 불가(base64url 12바이트).
//
// 서버 전용 — 클라이언트에서 import 하지 말 것(랜덤 토큰/노드 crypto 사용).

import { randomBytes } from 'crypto'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

// 공유 링크 보존 기간 — 90일. 바이럴 링크는 단발성이라 영구일 필요 없다.
export const SHARE_TTL_SECONDS = 90 * 24 * 60 * 60

export interface ShareLinkCard {
  name: string
  image: string
  isReversed: boolean
}

/** 타로 리딩 공유 — 기존(레거시) 페이로드. kind 없으면 'tarot' 로 본다. */
export interface TarotShareLinkPayload {
  /** 스키마 버전 — 추후 형태 변경 시 분기. */
  v: 1
  /** 공유 종류. 레거시 타로 링크는 이 필드가 없어 undefined → 'tarot' 취급. */
  kind?: 'tarot'
  isKo: boolean
  question: string
  spreadTitle: string
  cards: ShareLinkCard[]
  /** 한 줄 후크(펀치라인) — 공개 페이지/ OG 의 주인공. */
  keyMessage: string
  /** 본문(선택) — 데일리 message / 리딩 overall 등 더 읽을거리. */
  body?: string
}

export type CompatVerdictTone = 'aligned' | 'mixed' | 'tension' | 'neutral'

/**
 * 옵트인 시에만 링크에 실리는 공유자(초대자)의 출생정보 — 받은 사람이 자기
 * 생일만 넣고 "우리 궁합"을 바로 보게 하는 2-player 프리필용. 프라이버시: 공유자가
 * "친구가 나와의 궁합을 보게 허용"에 동의했을 때만 채워진다(미동의면 undefined).
 */
export interface CompatInviter {
  name: string
  birthDate: string
  birthTime?: string
  timeUnknown?: boolean
  gender: 'male' | 'female'
  city?: string
  lat?: number
  lon?: number
  tz?: string
}

/** 무료 궁합 결과 공유 — 두 사람 verdict 한 줄을 OG/공개 페이지 주인공으로. */
export interface CompatShareLinkPayload {
  v: 1
  kind: 'compatibility'
  isKo: boolean
  nameA: string
  nameB: string
  /** 동·서 교차 종합 한 줄 (공개 페이지/OG 의 주인공). */
  verdict: string
  verdictTone: CompatVerdictTone
  /** 결정적 신호 한 줄(선택) — 더 읽을거리. */
  headline?: string
  /**
   * 0~100 종합 점수(선택) — 링크 미리보기(OG/공개 페이지)의 극적 후크.
   * "우리 궁합 87점?!" 처럼 숫자가 재공유·클릭을 만든다. 원국은 보내지 않고
   * 도출된 점수 숫자만 저장(PII 아님). 구버전 링크엔 없어 optional.
   */
  score?: number
  /** 점수 등급 별명(선택) — "위험할 만큼 잘 맞아" 등. 점수 옆 배지. PII 아님. */
  grade?: string
  /** 옵트인 2-player 프리필용 공유자 출생정보(미동의면 없음). */
  inviter?: CompatInviter
}

/** 운흐름 캘린더 공유 — 기간 한 줄 총평을 OG/공개 페이지 주인공으로. */
export interface CalendarShareLinkPayload {
  v: 1
  kind: 'calendar'
  isKo: boolean
  /** 기간 라벨 — 예: "2026년 6월" / "June 2026". */
  periodLabel: string
  /** 이달의 흐름 한 줄(공개 페이지/OG 주인공). */
  headline: string
  /** 큰 날/포인트 몇 개(선택) — 더 읽을거리. */
  highlights?: string[]
  /** 이달 일별 흐름 곡선(0..100, 숫자만 — 원국 미전송). */
  curve?: number[]
  /** 곡선 위 오늘/포커스 위치 인덱스. */
  markerIndex?: number
}

export type DayShareTone = 'positive' | 'mixed' | 'caution'

/**
 * 하루(일진) 공유 — 점수 + 한 줄 + "이달 흐름" 곡선을 OG 의 주인공으로.
 * 곡선은 숫자 배열(점수)만 보낸다 — 생년월일/원국은 서버에 보내지 않는다.
 */
export interface DayShareLinkPayload {
  v: 1
  kind: 'day'
  isKo: boolean
  /** 날짜 라벨 — '6월 15일 토' / 'Sat, Jun 15'. */
  dateLabel: string
  /** 0..100 점수(OG 의 큰 숫자). */
  score: number
  tone: DayShareTone
  /** 한 줄 후크(주인공). */
  headline: string
  /** 보조 한 줄(선택). */
  subline?: string
  /** 이달 일별 점수 곡선(0..100, 숫자만). */
  curve?: number[]
  /** 곡선 위 오늘 위치 인덱스(curve 기준). */
  markerIndex?: number
}

/**
 * 인생/대운 곡선 공유 — 한 줄 + 인생 흐름 곡선(연도 라벨 포함)을 주인공으로.
 * 곡선·연도 라벨만 보낸다 — 생년월일/원국은 서버에 보내지 않는다.
 */
export interface LifeShareLinkPayload {
  v: 1
  kind: 'life'
  isKo: boolean
  /** 범위 라벨 — "1994 — 2044" 등(선택). */
  rangeLabel?: string
  /** 한 줄 후크(주인공). */
  headline: string
  /** 보조 한 줄(선택). */
  subline?: string
  /** 인생 흐름 점수 곡선(0..100, 숫자만). */
  curve: number[]
  /** 축 라벨(곡선 길이와 무관하게 4개 내외 표시). */
  axisLabels?: string[]
  /** 곡선 위 현재 위치 인덱스. */
  markerIndex?: number
  /** 곡선 위 피크(✦) 인덱스. */
  peakIndex?: number
}

/** 무료 통합 리포트 공유 — 사주 "유형 별명" + 소름 한 줄을 OG/공개 페이지 주인공으로. */
export interface ReportShareLinkPayload {
  v: 1
  kind: 'report'
  isKo: boolean
  /** 유형 이모지 — 카드 상단. */
  emoji: string
  /** 유형 별명(MBTI 풍) — 공개 페이지/OG 의 주인공. PII 아님(명식 도출 고정 사전). */
  typeName: string
  /** 소름 한 줄 — 더 읽을거리. */
  oneLiner: string
  /** 동·서양이 둘 다 가리키는 주제 몇 개(선택) — 신뢰 훅. */
  resonant?: string[]
  /** 일주(60갑자) 별명 구절(선택) — 유형명(30조합)보다 촘촘한 개인화 줄. PII 아님. */
  iljuLine?: string
  /** 동·서양이 엇갈린 지점(선택) — 링크를 연 사람의 "내 것도 궁금"을 만드는 훅. */
  clash?: { category: string; saju: string; astro: string }
}

export type ShareLinkPayload =
  | TarotShareLinkPayload
  | CompatShareLinkPayload
  | CalendarShareLinkPayload
  | DayShareLinkPayload
  | LifeShareLinkPayload
  | ReportShareLinkPayload

/** 타입 가드 — 공유 종류 분기(렌더/OG). 레거시(미지정)는 tarot. */
export function isCompatShare(p: ShareLinkPayload): p is CompatShareLinkPayload {
  return p.kind === 'compatibility'
}

export function isCalendarShare(p: ShareLinkPayload): p is CalendarShareLinkPayload {
  return p.kind === 'calendar'
}

export function isDayShare(p: ShareLinkPayload): p is DayShareLinkPayload {
  return p.kind === 'day'
}

export function isLifeShare(p: ShareLinkPayload): p is LifeShareLinkPayload {
  return p.kind === 'life'
}

export function isReportShare(p: ShareLinkPayload): p is ReportShareLinkPayload {
  return p.kind === 'report'
}

const shareKey = (token: string) => `tarot:share:${token}`

function newToken(): string {
  // URL-safe, 추측 불가. 16글자 내외.
  return randomBytes(12).toString('base64url')
}

/**
 * 공유 페이로드를 저장하고 토큰을 돌려준다. 저장 실패 시 null.
 */
export async function createShareLink(payload: ShareLinkPayload): Promise<string | null> {
  const token = newToken()
  const ok = await cacheSet(shareKey(token), payload, SHARE_TTL_SECONDS)
  if (!ok) {
    logger.warn('[shareLink] cacheSet failed — share link not created')
    return null
  }
  return token
}

/**
 * 토큰으로 공유 페이로드를 조회한다. 없거나(만료/오토큰) 형태 불일치면 null.
 */
export async function getShareLink(token: string): Promise<ShareLinkPayload | null> {
  const clean = (token || '').trim()
  if (!clean) return null
  try {
    const payload = await cacheGet<ShareLinkPayload>(shareKey(clean))
    if (!payload || payload.v !== 1) return null
    // 궁합·캘린더·하루·인생·리포트 공유는 cards 가 없고, 타로(레거시 포함)는 cards 배열.
    if (
      payload.kind === 'compatibility' ||
      payload.kind === 'calendar' ||
      payload.kind === 'day' ||
      payload.kind === 'life' ||
      payload.kind === 'report'
    )
      return payload
    if (!Array.isArray((payload as TarotShareLinkPayload).cards)) return null
    return payload
  } catch (error) {
    logger.error('[shareLink] get failed', error)
    return null
  }
}

/** 표시·링크용 사이트 기본 URL — 운영 env, 없으면 .com 폴백. */
export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com').replace(/\/$/, '')
}

const viewsKey = (token: string) => `share:views:${token}`

/**
 * 공유 링크 조회수를 1 올리고 누적값을 돌려준다(소셜 증거용). best-effort —
 * cacheGet→cacheSet 라 동시성에서 약간 적게 셀 수 있으나 허영 지표라 무해하다.
 * 실패하면 0(표시 안 함). 공유 페이로드와 같은 90일 TTL.
 */
export async function bumpShareViews(token: string): Promise<number> {
  const clean = (token || '').trim()
  if (!clean) return 0
  try {
    const prev = (await cacheGet<number>(viewsKey(clean))) ?? 0
    const next = (typeof prev === 'number' ? prev : 0) + 1
    await cacheSet(viewsKey(clean), next, SHARE_TTL_SECONDS)
    return next
  } catch {
    return 0
  }
}
