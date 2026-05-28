import { FIVE_ELEMENT_RELATIONS } from '@/lib/saju/constants'
import type { SibsinKind } from '@/lib/saju/types'

interface StemInfoLike {
  element: string
  yin_yang: string
}

/**
 * Day-master → target stem 십신 lookup against the standard 5-element
 * relationship matrix. Returns `null` when neither stem is one of the
 * canonical five elements.
 *
 * Lifted out of the saju-hour / saju-pillar extractors, which carried
 * byte-identical copies. lib/saju/sibsinAnalysis and
 * lib/saju/advancedSajuCore intentionally keep their own variants —
 * those take string stems (not StemInfo), use a different fallback
 * value, and one of them computes the answer via index arithmetic
 * rather than the if-chain; consolidating them would change observable
 * behavior at call sites that depend on those specifics.
 */
export function getSibsinFromStemInfo(
  dayMaster: StemInfoLike,
  target: StemInfoLike
): SibsinKind | null {
  if (dayMaster.element === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '비견' : '겁재'
  }
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '식신' : '상관'
  }
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편재' : '정재'
  }
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편관' : '정관'
  }
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편인' : '정인'
  }
  return null
}
