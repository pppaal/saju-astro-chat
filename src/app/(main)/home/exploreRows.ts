/**
 * 홈 둘러보기(Explore) 행 — 제품 다섯 + 카드 다음의 상담사 한 줄.
 *
 * - 행에는 이모지 · 아이콘 · 색이 없고 늘 펼쳐져 있다(v9.2 디자인).
 * - 가격은 숫자를 쓰지 않는다: 1회 비용은 CREDIT_COSTS(creditCosts.ts), 최저가는
 *   creditsFromLabel(pricing.ts — 첫구매 한정 starter 제외)에서 읽는다.
 * - birthLink 행(인생 흐름 · 캘린더 · 리포트)은 저장된 출생 정보를 buildReportBirthQuery
 *   (date/time/lat/lng/tz/gender/lang)로 실어 그 사람 기준으로 연다. 저장된 게 없으면
 *   lang 만 실어 보내고 각 페이지가 샘플로 폴백한다.
 * - 상담사 행: 출생 정보가 있으면 buildCounselorHref(info, '', locale) — 옛 홈 입력창과 같은
 *   목적지. 없으면 /destiny-counselor(상담사 페이지가 자기 출생 모달을 띄운다).
 *
 * 순수 모듈 — 클라이언트·서버 공용.
 */

import { CREDIT_COSTS } from '@/lib/config/creditCosts'
import { creditsFromLabel } from '@/lib/config/pricing'
import {
  buildCounselorHref,
  buildReportBirthQuery,
  type StoredBirthInfo,
} from '@/lib/birth/storage'
import { PRICE, fill, pick } from '@/components/v9/v9Copy'
import type { Bi, Lang } from '@/lib/i18n/bi'
import type { FunnelEvent } from '@/lib/metrics/funnelEvents'
import { HOME_COPY } from './homeCopy'

export type ExploreId = 'life' | 'calendar' | 'tarot' | 'compat' | 'report' | 'counselor'

export type ExplorePrice = 'free' | { fromCredits: number }

export interface ExploreRow {
  id: ExploreId
  /** 기본 경로 — birthLink 행은 여기에 출생 쿼리가 붙는다. */
  href: string
  /** true 면 저장된 출생 정보를 buildReportBirthQuery 로 싣는다. */
  birthLink: boolean
  title: Bi
  desc: Bi
  price: ExplorePrice
  /** 'main' = 둘러보기 목록, 'after' = '카드를 받은 다음' 목록. */
  group: 'main' | 'after'
  /** 클릭 퍼널 이벤트(home.explore.*). */
  event: FunnelEvent
}

export const EXPLORE_ROWS: readonly ExploreRow[] = [
  {
    id: 'life',
    href: '/destiny',
    birthLink: true,
    title: { ko: '인생 흐름', en: 'Life flow' },
    desc: {
      ko: '인생 전체를 곡선 하나로 — 인생 모양까지.',
      en: 'Your whole life in one curve — plus your life shape.',
    },
    price: 'free',
    group: 'main',
    event: 'home.explore.life',
  },
  {
    id: 'calendar',
    href: '/calendar',
    birthLink: true,
    title: { ko: '운세 달력', en: 'Fortune calendar' },
    desc: {
      ko: '이번 달 좋은 날을 사주와 별자리로.',
      en: 'Your good days this month, from saju and the stars.',
    },
    price: 'free',
    group: 'main',
    event: 'home.explore.calendar',
  },
  {
    id: 'tarot',
    href: '/tarot',
    birthLink: false,
    title: { ko: '타로', en: 'Tarot' },
    desc: {
      ko: '하루 한 장은 무료, 큰 질문엔 스프레드로.',
      en: 'One free card a day; spreads for bigger questions.',
    },
    price: { fromCredits: CREDIT_COSTS.tarotReading.small },
    group: 'main',
    event: 'home.explore.tarot',
  },
  {
    id: 'compat',
    href: '/compatibility/free',
    birthLink: false,
    title: { ko: '궁합', en: 'Compatibility' },
    desc: {
      ko: '두 사람의 차트를 나란히 — 친구든 연인이든.',
      en: 'Two charts side by side — friend or partner.',
    },
    price: 'free',
    group: 'main',
    event: 'home.explore.compat',
  },
  {
    id: 'report',
    href: '/integrated-report',
    birthLink: true,
    title: { ko: '사주 × 점성술 리포트', en: 'Saju × astrology report' },
    desc: {
      ko: '네 기둥과 출생 차트를 한 페이지에.',
      en: 'Your four pillars and birth chart, on one page.',
    },
    price: 'free',
    group: 'main',
    event: 'home.explore.report',
  },
  {
    id: 'counselor',
    href: '/destiny-counselor',
    birthLink: false,
    title: { ko: 'AI 운명 상담사', en: 'AI destiny counselor' },
    desc: {
      ko: '내 차트에 대해 묻고, 쉬운 말로 답을 들어요.',
      en: 'Ask follow-ups about your chart, in plain words.',
    },
    price: { fromCredits: CREDIT_COSTS.counselorTurn },
    group: 'after',
    event: 'home.explore.counselor',
  },
]

/** 그룹의 행들(순서 유지). */
export function exploreRowsIn(group: ExploreRow['group']): ExploreRow[] {
  return EXPLORE_ROWS.filter((r) => r.group === group)
}

/** 상담사 링크 — 출생 정보가 있으면 그 사람으로 바로, 없으면 상담사 페이지(자체 출생 모달). */
export function counselorHref(info: StoredBirthInfo | null, locale: Lang): string {
  return info ? buildCounselorHref(info, '', locale) : '/destiny-counselor'
}

/** 행의 실제 링크 — birthLink 면 출생 쿼리, 상담사면 counselorHref. */
export function exploreHref(row: ExploreRow, info: StoredBirthInfo | null, locale: Lang): string {
  if (row.id === 'counselor') return counselorHref(info, locale)
  if (row.birthLink) return `${row.href}?${buildReportBirthQuery(info, locale)}`
  return row.href
}

/**
 * 가격 라벨 — 무료면 { free: 'Free' }, 유료면 { from: 'From 1 credit', packs: 'Credits from $4.99' }.
 * 숫자는 CREDIT_COSTS · creditsFromLabel(SSOT)에서만 온다.
 */
export function explorePriceLabel(
  price: ExplorePrice,
  locale: Lang
): { free: string } | { from: string; packs: string } {
  if (price === 'free') return { free: pick(HOME_COPY.free, locale) }
  const n = price.fromCredits
  return {
    from: fill(pick(n === 1 ? PRICE.fromCredit : PRICE.fromCredits, locale), { n }),
    packs: fill(pick(PRICE.creditsFrom, locale), { price: creditsFromLabel(locale) }),
  }
}
