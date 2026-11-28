'use client'

/**
 * ShareDayButton — 하루(일진)의 점수 + 한 줄 + 이달 흐름 곡선을 공개 공유
 * 링크(/r/[token])로 만들어 Web Share API 또는 클립보드 복사로 내보낸다.
 * 서버엔 점수·요약 텍스트·곡선 숫자만 저장(개인 원국/생년월일은 안 보냄).
 *
 * 흐름은 useShareLink, 버튼은 ShareLinkButton(v9 row — 'Share today' 줄 링크) — OG 이미지는
 * /r/[token]/opengraph-image 가 동적 생성(점수 + 곡선). 재료는 일 뷰모델의 share.
 */

import { ShareLinkButton } from '@/components/share/ShareLinkButton'
import type { UseShareLinkOptions } from '@/lib/share/useShareLink'
import { CAL_COPY } from '@/components/calendar/v9/calendarCopy'

export interface DayShareData {
  isKo: boolean
  dateLabel: string
  score: number
  tone: 'positive' | 'mixed' | 'caution'
  headline: string
  subline?: string
  curve?: number[]
  markerIndex?: number
  /** 공유 시트 제목의 짧은 날짜 — 'Nov 24' / '11월 24일'. 오늘이 아닌 날 제목에 쓴다. */
  shortDate?: string
}

/**
 * 공유 시트 제목 — 오늘이면 'DestinyPal — Today' / 'DestinyPal 오늘의 운', 다른 날이면 그 날짜
 * ('DestinyPal — Nov 24' / 'DestinyPal 11월 24일의 운'). '이날 공유하기'가 '오늘'을 달지 않게(QA COPY-1).
 */
export function dayShareTitle(isKo: boolean, isToday: boolean, shortDate?: string): string {
  if (isToday || !shortDate) return isKo ? 'DestinyPal 오늘의 운' : 'DestinyPal — Today'
  return isKo ? `DestinyPal ${shortDate}의 운` : `DestinyPal — ${shortDate}`
}

/** 하루 공유 링크 설정 — 다른 모양의 버튼(v9 row 등)도 같은 데이터로 쓴다. */
export function dayShareLinkOptions(data: DayShareData, isToday = true): UseShareLinkOptions {
  const isKo = data.isKo
  return {
    endpoint: '/api/calendar/day/share',
    body: () => ({
      isKo,
      dateLabel: data.dateLabel,
      score: Math.round(data.score),
      tone: data.tone,
      headline: data.headline,
      subline: data.subline || undefined,
      curve: data.curve?.length ? data.curve.map((n) => Math.round(n)) : undefined,
      markerIndex: data.markerIndex,
    }),
    title: dayShareTitle(isKo, isToday, data.shortDate),
    text: data.headline || data.dateLabel,
    isKo,
    logTag: '[ShareDay]',
  }
}

export function ShareDayButton({
  data,
  isToday = true,
  className,
}: {
  data: DayShareData
  /** 오늘이 아닌 날이면 'Share this day'. */
  isToday?: boolean
  className?: string
}) {
  const lang = data.isKo ? 'ko' : 'en'
  return (
    <ShareLinkButton
      variant="row"
      link={dayShareLinkOptions(data, isToday)}
      label={(isToday ? CAL_COPY.shareToday : CAL_COPY.shareDay)[lang]}
      copiedLabel={CAL_COPY.copied[lang]}
      creatingLabel={CAL_COPY.creating[lang]}
      className={className}
    />
  )
}
