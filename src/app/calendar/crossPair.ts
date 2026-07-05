/* ============================================================
   cross-activation 페어 헬퍼 — assembleTiers(월·연)와 assembleDayTier(일)가
   공유. 신호의 구조화 evidence.detail 우선, 없으면 표시 name 파싱으로
   십신×행성 페어를 복원한다.
   ============================================================ */

import { PLANET_KO } from '@/components/calendar/adapters/shared'

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
