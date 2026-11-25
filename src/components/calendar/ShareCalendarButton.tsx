'use client'

/**
 * ShareCalendarButton — 운흐름 캘린더의 이달 흐름 한 줄을 공개 공유 링크
 * (/r/[token])로 만들어 Web Share API 또는 클립보드 복사로 내보낸다.
 * 서버엔 요약 텍스트만 저장(개인 원국/생년월일은 보내지 않음).
 *
 * 흐름은 useShareLink, 버튼은 ShareLinkButton(pill) — OG 이미지는
 * /r/[token]/opengraph-image 가 동적 생성한다.
 */

import { ShareLinkButton } from '@/components/share/ShareLinkButton'
import type { UseShareLinkOptions } from '@/lib/share/useShareLink'

export interface CalendarShareData {
  isKo: boolean
  periodLabel: string
  headline: string
  highlights?: string[]
  curve?: number[]
  markerIndex?: number
}

/** 이달 공유 링크 설정 — 다른 모양의 버튼(v9 line 등)도 같은 데이터로 쓴다. */
export function calendarShareLinkOptions(data: CalendarShareData): UseShareLinkOptions {
  const isKo = data.isKo
  return {
    endpoint: '/api/calendar/share',
    body: () => ({
      isKo,
      periodLabel: data.periodLabel,
      headline: data.headline,
      highlights: data.highlights?.length ? data.highlights.slice(0, 5) : undefined,
      curve: data.curve?.length ? data.curve.map((n) => Math.round(n)) : undefined,
      markerIndex: data.markerIndex,
    }),
    title: isKo ? 'DestinyPal 운흐름' : 'DestinyPal Calendar',
    text: data.headline || data.periodLabel,
    isKo,
    logTag: '[ShareCalendar]',
  }
}

export function ShareCalendarButton({ data }: { data: CalendarShareData }) {
  const isKo = data.isKo
  return (
    <ShareLinkButton
      link={calendarShareLinkOptions(data)}
      label={isKo ? '이달 흐름 공유하기' : 'Share this month'}
      copiedLabel={isKo ? '링크 복사됨!' : 'Link copied!'}
    />
  )
}

export default ShareCalendarButton
