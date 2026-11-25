/* ============================================================
   cross-activation 페어 헬퍼 — assembleTiers(월)와 assembleDayTier(일)가
   공유. 신호의 구조화 evidence.detail 우선, 없으면 표시 name 파싱으로
   십신×행성 페어를 복원한다. 그날 '왜 이런 날' 근거(pickDayReason)도 여기
   한 곳에서 고른다 — 월 리드아웃과 일 화면이 같은 함수·같은 셀을 읽는다.
   ============================================================ */

import { PLANET_KO } from '@/lib/calendar-view/shared'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'

import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { DestinyCalendarCell, DestinyDayMark } from '@/types/calendar'

// cross-activation 페어 파서 — 연 셀(경량 캐시)은 evidence.detail 을 비우므로
// detail.sajuKey/astroKey 가 없을 수 있다. 신호 name("편관 × 화성")은 항상 살아남아
// 거기서 십신·행성을 뽑는다. (예전엔 detail 만 읽어 월교차 "() ↔" / 일교차 빈 ↔ 버그.)
export const PLANET_EN_FROM_KO: Record<string, string> = Object.fromEntries(
  Object.entries(PLANET_KO).map(([en, ko]) => [ko, en])
)

export function parseCrossName(name: string | undefined): { sajuKo: string; astroKo: string } {
  const parts = (name ?? '').split('×').map((x) => x.trim())
  return { sajuKo: parts[0] ?? '', astroKo: parts[1] ?? '' }
}

// 교차 페어 키 — 구조화 evidence.detail(sajuKey=KO 십신/신살, astroKey=영문 행성)이
// 있으면 그걸 쓰고, 없으면(연 셀은 detail 을 비움) 표시 name 파싱으로 폴백. detail
// 우선이 견고하다 — name 의 '×' 글리프/구분자/로케일 포맷 변경에 안 흔들린다.
export function crossKeys(s: {
  name?: string
  evidence?: { detail?: Record<string, unknown> | null } | null
}): { sajuKo: string; astroKo: string } {
  const d = s.evidence?.detail
  const sajuKey = typeof d?.sajuKey === 'string' ? d.sajuKey : ''
  const astroKey = typeof d?.astroKey === 'string' ? d.astroKey : ''
  if (sajuKey && astroKey) {
    return { sajuKo: sajuKey, astroKo: PLANET_KO[astroKey] ?? astroKey }
  }
  return parseCrossName(s.name)
}

// 매핑 의미문은 "편재 × 화성 — …" 로 시작 — 카드가 페어를 따로 보여주므로 머리 제거.
export function stripCrossPair(t: string): string {
  return t.replace(/^[^—]*×[^—]*—\s*/, '')
}

/** 그날 '왜 이런 날' 근거 — 월 셀(DestinyCalendarCell.reason)과 일(DestinyDay.reason)이 같은 모양. */
export type DayReason = NonNullable<DestinyCalendarCell['reason']>

/**
 * 근거 부호 게이트 — 그날 그리드 마크(점수 밴드)가 허용하는 교차 부호.
 * good·best 는 길(+) 교차만, caution·avoid 는 흉(−) 교차만, 무색(null)·'focus'
 * (밴드 무색인 포커스일)는 어느 쪽이든. 피할 날에 ▲ 근거, 좋은 날에 ▼ 근거가
 * 뜨던 모순(계획 B1 #4)을 표시 층에서 막는다 — 엔진 교차 교리(E11)가 바뀐 뒤에도
 * 방어선으로 남긴다.
 */
export function reasonSignForMark(mark: DestinyDayMark | null | undefined): 1 | -1 | 0 {
  if (mark === 'good' || mark === 'best') return 1
  if (mark === 'caution' || mark === 'avoid') return -1
  return 0
}

/** 그날 고유 층 — 그 달 내내 깔리는 monthly 배경 교차보다 우선한다. */
const DAY_LAYERS = new Set(['daily', 'hourly', 'instant'])

/**
 * 그날 가장 센 사주×점성 교차의 *쉬운 뜻* 하나 — "왜 이런 날일까요".
 *
 * · 원천은 *월 빌드 셀* 이어야 한다(엔진 감사 X1). assembleTiers 는 월 셀 그대로,
 *   assembleDayTier 는 같은 날짜의 월 셀(monthPopCell)로 부른다 → 두 화면이 같은 근거.
 * · 그날 고유(daily/hourly/instant) 층을 우선한다 — monthly 층 교차는 그 달 모든 날
 *   셀에 똑같이 깔려, 그게 제일 세면 매일 같은 근거가 떠 "월 전체 근거처럼" 보였다.
 *   같은 날짜 안에서 day-specific 이 month-background 를 항상 이기게 rank 에 +1000.
 * · 부호 충돌로 무력화된(polarity 0) 교차는 제외(감사 #9) — 층 가산점 때문에 유의미한
 *   길/흉 교차를 밀어내고 중립 문구가 뜨던 문제.
 * · 부호 게이트(reasonSignForMark) — 마크와 부호가 어긋나는 교차는 근거가 될 수 없다.
 *   통과하는 교차가 없으면 null(근거 없이 두는 게 정직하다).
 * · 동점이면 셀 신호 순서상 먼저 온 교차 — 두 호출부가 같은 셀을 읽으므로 결정적.
 */
export function pickDayReason(
  cell: Pick<CalendarCell, 'signals'> | null | undefined,
  mark: DestinyDayMark | null | undefined
): DayReason | null {
  if (!cell) return null
  const need = reasonSignForMark(mark)
  let best: DayReason | null = null
  let bestRank = -1
  for (const s of cell.signals) {
    if (s.kind !== 'cross-activation') continue
    if (s.polarity === 0) continue
    if (need !== 0 && Math.sign(s.polarity) !== need) continue
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    const meaning = stripCrossPair(s.korean ?? '')
    if (!meaning) continue
    const impact = Math.abs(s.polarity) * (s.weight ?? 1)
    const rank = (DAY_LAYERS.has(s.layer) ? 1000 : 0) + impact
    if (rank <= bestRank) continue
    bestRank = rank
    best = {
      saju: sajuKo,
      sajuEn: SIBSIN_EN[sajuKo] ?? translateSignalLabel(sajuKo, 'en'),
      astro: astroKo,
      astroEn: PLANET_EN_FROM_KO[astroKo] ?? astroKo,
      meaning,
      meaningEn: stripCrossPair(s.english ?? ''),
      polarity: s.polarity,
    }
  }
  return best
}
