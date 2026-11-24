/**
 * 오행(five-element) 수 — 사주 데이터에서 목·화·토·금·수 개수를 뽑는다.
 * saju.fiveElements ({wood,fire,earth,metal,water} 또는 목/화/토/금/수 키)를
 * 먼저 읽고, 없으면 기둥(pillars / 옛 yearPillar… 필드)의 천간·지지 원소를 센다.
 * 궁합 오행 비교 레이더(CompatRadarOverlay)가 쓴다.
 */

export type Counts = { wood: number; fire: number; earth: number; metal: number; water: number }

/** 레이더 축 순서와 ko/en 라벨 (펜타곤 꼭짓점 순서 = 배열 순서). */
export const AXES: Array<{
  key: keyof Counts
  ko: string
  en: string
  koShort: string
  koEl: string
  enShort: string
  enEl: string
}> = [
  {
    key: 'wood',
    ko: '창의력 (목)',
    en: 'Creativity (Wood)',
    koShort: '창의력',
    koEl: '木',
    enShort: 'Creativity',
    enEl: 'Wood',
  },
  {
    key: 'fire',
    ko: '추진력 (화)',
    en: 'Drive (Fire)',
    koShort: '추진력',
    koEl: '火',
    enShort: 'Drive',
    enEl: 'Fire',
  },
  {
    key: 'earth',
    ko: '안정성 (토)',
    en: 'Stability (Earth)',
    koShort: '안정성',
    koEl: '土',
    enShort: 'Stability',
    enEl: 'Earth',
  },
  {
    key: 'metal',
    ko: '결단력 (금)',
    en: 'Decision (Metal)',
    koShort: '결단력',
    koEl: '金',
    enShort: 'Decision',
    enEl: 'Metal',
  },
  {
    key: 'water',
    ko: '유연성 (수)',
    en: 'Flexibility (Water)',
    koShort: '유연성',
    koEl: '水',
    enShort: 'Flexibility',
    enEl: 'Water',
  },
]

const EL_KEY: Record<string, keyof Counts> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
  wood: 'wood',
  fire: 'fire',
  earth: 'earth',
  metal: 'metal',
  water: 'water',
}

export function deriveCounts(saju: unknown): Counts {
  const zero: Counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  if (!saju || typeof saju !== 'object') return zero
  const s = saju as Record<string, unknown>
  const fe = s.fiveElements as Partial<Record<string, number>> | undefined
  if (fe && typeof fe === 'object') {
    const out = { ...zero }
    let any = false
    for (const [k, v] of Object.entries(fe)) {
      const key = EL_KEY[k]
      if (key && typeof v === 'number') {
        out[key] += v
        any = true
      }
    }
    if (any) return out
  }
  const pillars = (s.pillars ?? {}) as Record<
    string,
    { heavenlyStem?: { element?: string }; earthlyBranch?: { element?: string } }
  >
  const legacy = ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar', 'hourPillar']
  const out = { ...zero }
  let any = false
  const add = (el?: string) => {
    const key = el ? EL_KEY[el] : undefined
    if (key) {
      out[key] += 1
      any = true
    }
  }
  for (const k of ['year', 'month', 'day', 'time']) {
    add(pillars[k]?.heavenlyStem?.element)
    add(pillars[k]?.earthlyBranch?.element)
  }
  for (const k of legacy) {
    const p = s[k] as
      | { heavenlyStem?: { element?: string }; earthlyBranch?: { element?: string } }
      | undefined
    if (p) {
      add(p.heavenlyStem?.element)
      add(p.earthlyBranch?.element)
    }
  }
  return any ? out : zero
}
