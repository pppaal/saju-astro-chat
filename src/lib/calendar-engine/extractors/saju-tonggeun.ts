import { STEMS, FIVE_ELEMENT_RELATIONS } from '@/lib/saju/constants'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { FiveElement } from '@/lib/saju/types'

/**
 * 통근 강약 변화 추출기.
 *
 * 본명 일간(日干)과 대운(大運) 천간의 오행 관계로 강약 시프트를 신호화.
 * - 동일 오행 → 비견·겁재 → 신강 보강 (+)
 * - 생받는 (인성) → 신강 보강 (+)
 * - 극받는 (관성) → 신약 ↘ (-)
 * - 생하는 (식상) → 기운 누설 (-)
 * - 극하는 (재성) → 기운 분탈 (-)
 *
 * 본명 강약 상태에 따라 의미 다름:
 * - 신약자 → 인성·비겁 대운 = 회복
 * - 신강자 → 식상·재성·관성 대운 = 균형
 *
 * 활성 윈도우: 대운 10년 전체. polarity는 본명 강약 vs 대운 오행으로 결정.
 */

const sajuTonggeunExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'tonggeun-shift',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayMasterStem = STEMS.find((s) => s.name === natal.saju.pillars.day.heavenlyStem.name)
    if (!dayMasterStem) return []
    const dayElement = dayMasterStem.element as FiveElement
    const strength = natal.saju.strength

    const signals: ActiveSignal[] = []
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)

    for (const d of natal.saju.daeun) {
      const stemInfo = STEMS.find((s) => s.name === d.stem)
      if (!stemInfo) continue
      const daeunElement = stemInfo.element as FiveElement

      const relation = elementRelation(dayElement, daeunElement)
      const polarity = polarityForShift(relation, strength)
      const label = labelFor(relation, strength)
      if (polarity === 0 && relation === 'same') continue // 비견은 큰 신호 아님 — skip

      const startIso = new Date(Date.UTC(d.startYear, 0, 1)).toISOString()
      const endIso = new Date(Date.UTC(d.startYear + 10, 0, 0, 23, 59, 59)).toISOString()
      // range와 겹치는지
      if (new Date(endIso) < rangeStart || new Date(startIso) > rangeEnd) continue
      const peakIso = new Date(Date.UTC(d.startYear + 5, 0, 1)).toISOString()

      signals.push({
        id: `saju.tonggeun-shift.${d.startYear}.${d.stem}`,
        source: 'saju',
        kind: 'tonggeun-shift',
        name: `대운 통근 ${label}`,
        korean: `${d.startYear}년 대운 ${d.stem}${d.branch} → ${label}`,
        english: `${d.startYear} decade ${d.stem}${d.branch} → ${labelForEn(relation, strength)}`,
        themes: [],
        polarity,
        layer: 'decadal',
        active: { start: startIso, peak: peakIso, end: endIso },
        weight: 0.85,
        evidence: {
          module: 'saju-tonggeun',
          element: daeunElement,
          pillars: [`${d.stem}${d.branch}`],
          detail: {
            dayMasterElement: dayElement,
            daeunElement,
            relation,
            natalStrength: strength,
            shiftLabel: label,
          },
        },
      })
    }

    return signals
  },
}

type Relation = 'same' | 'birth-receiving' | 'birth-giving' | 'controlling' | 'controlled-by'

function elementRelation(self: FiveElement, other: FiveElement): Relation {
  if (self === other) return 'same'
  if (FIVE_ELEMENT_RELATIONS.생받는관계[self] === other) return 'birth-receiving' // 印星
  if (FIVE_ELEMENT_RELATIONS.생하는관계[self] === other) return 'birth-giving' // 食傷
  if (FIVE_ELEMENT_RELATIONS.극하는관계[self] === other) return 'controlling' // 財星
  if (FIVE_ELEMENT_RELATIONS.극받는관계[self] === other) return 'controlled-by' // 官星
  return 'same'
}

function polarityForShift(relation: Relation, strength: 'strong' | 'medium' | 'weak'): Polarity {
  if (relation === 'birth-receiving') return strength === 'weak' ? 3 : 1 // 신약자에 인성 = 회복
  if (relation === 'same') return strength === 'weak' ? 2 : -1 // 신강자에 비겁 = 과강
  if (relation === 'birth-giving') return strength === 'strong' ? 2 : -1
  if (relation === 'controlling') return strength === 'strong' ? 2 : -2
  if (relation === 'controlled-by') return strength === 'strong' ? 1 : -3
  return 0
}

function labelFor(relation: Relation, strength: 'strong' | 'medium' | 'weak'): string {
  if (relation === 'birth-receiving')
    return strength === 'weak' ? '인성 보강 (회복기)' : '인성 활성'
  if (relation === 'same') return strength === 'weak' ? '비겁 보강 (자조)' : '비겁 과강 (경쟁)'
  if (relation === 'birth-giving')
    return strength === 'strong' ? '식상 발휘 (창조기)' : '식상 누설 (피로)'
  if (relation === 'controlling')
    return strength === 'strong' ? '재성 활성 (재물기)' : '재성 분탈 (소모)'
  if (relation === 'controlled-by')
    return strength === 'strong' ? '관성 활용 (책임기)' : '관성 압박 (시련)'
  return '균형'
}

function labelForEn(relation: Relation, strength: 'strong' | 'medium' | 'weak'): string {
  if (relation === 'birth-receiving')
    return strength === 'weak' ? 'Resource boost (recovery)' : 'Resource active'
  if (relation === 'same')
    return strength === 'weak' ? 'Peer support (self-reliance)' : 'Peer overload (rivalry)'
  if (relation === 'birth-giving')
    return strength === 'strong' ? 'Output expressed (creative)' : 'Output leak (fatigue)'
  if (relation === 'controlling')
    return strength === 'strong' ? 'Wealth active (gain)' : 'Wealth drained (loss)'
  if (relation === 'controlled-by')
    return strength === 'strong' ? 'Officer harnessed (duty)' : 'Officer pressure (trial)'
  return 'balance'
}

export default sajuTonggeunExtractor
