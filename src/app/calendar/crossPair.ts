/* ============================================================
   cross-activation 페어 헬퍼 — assembleTiers(월)와 assembleDayTier(일)가
   공유. 신호의 구조화 evidence.detail 우선, 없으면 표시 name 파싱으로
   십신×행성 페어를 복원한다. 그날 '왜 이런 날' 근거(pickDayReason)도 여기
   한 곳에서 고른다 — 월 리드아웃과 일 화면이 같은 함수·같은 셀을 읽는다.
   ============================================================ */

import { PLANET_KO } from '@/lib/calendar-view/shared'
import { crossSajuEn } from '@/lib/calendar-engine/derivers/signalI18n'

import type { ActiveSignal, CalendarCell, SignalLayer } from '@/lib/calendar-engine/types'
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

/**
 * 그날 근거 우선 층 — 일진(daily)·정점(instant). 그 달 내내 깔리는 monthly 배경 교차와
 * 2시간짜리 시진(hourly) 교차보다 먼저 고른다. 시진 교차는 가산점이 없다 — 그날 마크와
 * 부호가 맞는 daily·instant 교차가 하나도 없을 때만 (impact 로 다른 층과 겨뤄) 근거가
 * 될 수 있다. 교차 layer 는 좁은 부모 층이라(OD-10) 시진 부모의 교차는 'hourly' 로
 * 남는다 — 톤(TONE_LAYERS)에서 빠지듯 '왜 이런 날'의 머리에도 서지 않게.
 */
const DAY_REASON_LAYERS: ReadonlySet<SignalLayer> = new Set<SignalLayer>(['daily', 'instant'])

/**
 * 그날 '왜 이런 날' 근거가 될 교차 신호 하나 — pickDayReason 의 선택 규칙 본체.
 * (층·부호를 그대로 들고 있어 테스트·진단이 "시진 교차가 머리에 섰나"를 볼 수 있다.)
 *
 * · 원천은 *월 빌드 셀* 이어야 한다(엔진 감사 X1). assembleTiers 는 월 셀 그대로,
 *   assembleDayTier 는 같은 날짜의 월 셀(monthPopCell)로 부른다 → 두 화면이 같은 근거.
 * · 그날 일진·정점(daily/instant) 층을 우선한다 — monthly 층 교차는 그 달 모든 날
 *   셀에 똑같이 깔려, 그게 제일 세면 매일 같은 근거가 떠 "월 전체 근거처럼" 보였다.
 *   같은 날짜 안에서 daily·instant 가 다른 층을 항상 이기게 rank 에 +1000.
 * · 시진(hourly) 교차는 그 +1000 을 받지 않는다 — 2시간 창의 교차가 그날 전체의 '왜'
 *   로 서지 않게. 부호가 맞는 daily·instant 교차가 없을 때만 monthly 이상 층과 impact
 *   로 겨뤄 근거가 될 수 있다.
 * · 부호 충돌로 무력화된(polarity 0) 교차는 제외(감사 #9) — 층 가산점 때문에 유의미한
 *   길/흉 교차를 밀어내고 중립 문구가 뜨던 문제.
 * · 부호 게이트(reasonSignForMark) — 마크와 부호가 어긋나는 교차는 근거가 될 수 없다.
 *   통과하는 교차가 없으면 null(근거 없이 두는 게 정직하다).
 * · 동점이면 셀 신호 순서상 먼저 온 교차 — 두 호출부가 같은 셀을 읽으므로 결정적.
 */
export function pickDayReasonSignal(
  cell: Pick<CalendarCell, 'signals'> | null | undefined,
  mark: DestinyDayMark | null | undefined
): ActiveSignal | null {
  if (!cell) return null
  const need = reasonSignForMark(mark)
  let best: ActiveSignal | null = null
  let bestRank = -1
  for (const s of cell.signals) {
    if (s.kind !== 'cross-activation') continue
    if (s.polarity === 0) continue
    if (need !== 0 && Math.sign(s.polarity) !== need) continue
    const { sajuKo, astroKo } = crossKeys(s)
    if (!sajuKo || !astroKo) continue
    if (!stripCrossPair(s.korean ?? '')) continue
    const impact = Math.abs(s.polarity) * (s.weight ?? 1)
    const rank = (DAY_REASON_LAYERS.has(s.layer) ? 1000 : 0) + impact
    if (rank <= bestRank) continue
    bestRank = rank
    best = s
  }
  return best
}

/**
 * 그날 가장 센 사주×점성 교차의 *쉬운 뜻* 하나 — "왜 이런 날일까요".
 * 고르는 규칙은 pickDayReasonSignal(일진·정점 우선, 시진은 가산점 없음, polarity 0
 * 제외, 마크 부호 게이트) — 여기선 그 신호를 화면 모양(KO/EN 페어·뜻·부호)으로 옮긴다.
 */
export function pickDayReason(
  cell: Pick<CalendarCell, 'signals'> | null | undefined,
  mark: DestinyDayMark | null | undefined
): DayReason | null {
  const s = pickDayReasonSignal(cell, mark)
  if (!s) return null
  const { sajuKo, astroKo } = crossKeys(s)
  return {
    saju: sajuKo,
    sajuEn: crossSajuEn(sajuKo),
    astro: astroKo,
    astroEn: PLANET_EN_FROM_KO[astroKo] ?? astroKo,
    meaning: stripCrossPair(s.korean ?? ''),
    meaningEn: stripCrossPair(s.english ?? ''),
    polarity: s.polarity,
  }
}
