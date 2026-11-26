/**
 * 출생 스탬프 표기 — v9 폴리오('COMPUTED · 1997.3.21 14:30 · Seoul')와 상단 바 사람 칩
 * ('1997.3.21 · Seoul')이 같은 함수를 쓴다. MainPageClient 의 formatSubject(생년월일 칩)를
 * 바탕으로 했다: 시간 미상 판정은 tri-state SSOT(isBirthTimeUnknown), 시각 파싱은
 * parseHourMinute(‘HH:MM PM’ 도 24시간으로 정규화).
 *
 * - 시간 미상이면 날짜만 쓴다(정오 앵커 같은 가짜 시각을 찍지 않는다).
 * - 도시가 있으면 ' · ' 뒤에 붙인다. 저장값('Seoul, KR')의 첫 쉼표 앞만 쓴다.
 * - ko: '1997년 3월 21일 14:30 · Seoul' · en: '1997.3.21 14:30 · Seoul' (24시간).
 *
 * 순수 함수 — 클라이언트·서버 공용.
 */

import { isBirthTimeUnknown } from '@/lib/saju/birthTimeAnchor'
import { parseHourMinute } from '@/lib/saju/timeParse'
import type { Lang } from '@/lib/i18n/bi'

export interface BirthStampInput {
  /** 'YYYY-MM-DD' */
  birthDate: string
  /** 'HH:MM' (또는 'HH:MM PM') */
  birthTime?: string | null
  birthTimeUnknown?: boolean | null
  city?: string | null
}

export interface BirthStampOptions {
  /** false 면 시각을 빼고 날짜만(사람 칩). 기본 true. */
  time?: boolean
  /** false 면 도시를 붙이지 않는다. 기본 true. */
  city?: boolean
}

/** 저장된 도시 문자열에서 표시용 도시 이름 — 'Seoul, KR' → 'Seoul'. */
export function cityLabel(city: string | null | undefined): string {
  return String(city ?? '')
    .split(',')[0]
    .trim()
}

/** 출생 스탬프 — 날짜(+시각)(+ · 도시). */
export function formatBirthStamp(
  info: BirthStampInput,
  locale: Lang,
  opts: BirthStampOptions = {}
): string {
  const [y, m, d] = String(info.birthDate ?? '')
    .split('-')
    .map((n) => parseInt(n, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ''
  const datePart = locale === 'ko' ? `${y}년 ${m}월 ${d}일` : `${y}.${m}.${d}`

  let timePart = ''
  if (opts.time !== false && !isBirthTimeUnknown(info.birthTime, info.birthTimeUnknown)) {
    const { h, m: mm } = parseHourMinute(String(info.birthTime))
    timePart = ` ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const c = opts.city === false ? '' : cityLabel(info.city)
  return `${datePart}${timePart}${c ? ` · ${c}` : ''}`
}
