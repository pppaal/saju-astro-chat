/**
 * lifetimePivots → destinypal `milestones[]` adapter.
 *
 * deriveLifetimePivots 결과:
 *   { pivots: Array<{ age, year, label, astro?, saju?, meaning?, bothSystems, phase }> }
 *
 * destinypal milestones:
 *   Array<{ year, age, label, kind, now }>
 *
 * kind 매핑:
 *   astro 라벨에 '토성' / 'Saturn' → 'saturn'
 *   '목성' / 'Jupiter' → 'jupiter'
 *   '천왕성' / 'Uranus' → 'uranus'
 *   '해왕성' / 'Neptune' → 'neptune'
 *   '명왕성' / 'Pluto' → 'pluto'
 *   대운 라벨 ("甲戌 대운") → 'daewoon'
 *   둘 다(bothSystems) → 우세한 astro kind
 *   그 외 → 'saju'
 */

import type { LifetimePivots, LifePivot } from '@/lib/calendar-engine/derivers/lifetimePivots'

export interface DestinypalMilestone {
  year: number
  age: number
  label: string
  /** 라벨 영문 — 클라이언트 언어 토글용. 미지정 시 label 폴백. */
  labelEn?: string
  kind: 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'chiron' | 'progressed' | 'daewoon' | 'saju'
  now?: boolean
  /** 추가 컨텍스트: bothSystems flag — 사주·점성 동시 가리킬 때 강조 */
  bothSystems?: boolean
  /** 한 줄 의미 (astro 마디 한 줄) — 옵션 */
  meaning?: string
  /** 한 줄 의미 영문 — 클라이언트 언어 토글용. 미지정 시 meaning 폴백. */
  meaningEn?: string
}

function deriveKind(p: LifePivot): DestinypalMilestone['kind'] {
  const a = p.astro ?? ''
  if (/토성|Saturn/i.test(a)) return 'saturn'
  if (/목성|Jupiter/i.test(a)) return 'jupiter'
  if (/천왕성|Uranus/i.test(a)) return 'uranus'
  if (/해왕성|Neptune/i.test(a)) return 'neptune'
  if (/명왕성|Pluto/i.test(a)) return 'pluto'
  if (/카이런|Chiron/i.test(a)) return 'chiron'
  if (/감정 흐름|진행.*달|progressed|lunar/i.test(a)) return 'progressed'
  if (p.saju && !p.astro) return 'daewoon'
  // 여기까지 왔는데 astro 라벨이 있으면 점성 마디 — 'saju' 로 잘못 분류하지 않는다.
  if (p.astro) return 'progressed'
  return 'saju'
}

/**
 * lifetimePivots.pivots → destinypal milestones[].
 *
 * phase==='current' 인 pivot 한 개만 `now=true`. destinypal demo 도 한 개만 강조.
 */
export function toMilestones(pivots: LifetimePivots | undefined): DestinypalMilestone[] {
  const items = pivots?.pivots ?? []
  return items.map((p) => ({
    year: p.year,
    age: p.age,
    label: p.label,
    labelEn: p.labelEn,
    kind: deriveKind(p),
    now: p.phase === 'current' ? true : undefined,
    bothSystems: p.bothSystems || undefined,
    meaning: p.meaning,
    meaningEn: p.meaningEn,
  }))
}
