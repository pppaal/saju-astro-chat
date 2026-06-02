import { getSibseong } from '@/lib/saju/core/sibsin'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'

// The two extractors (saju-hour, saju-pillar) each declare a local
// `StemInfo { name, element: FiveElement, yin_yang: YinYang }`. Use the
// same narrow field types here.
interface StemInfoForSibsin {
  element: FiveElement
  yin_yang: YinYang
}

/**
 * Day-master → target stem 십신 lookup.
 *
 * SSOT: 정본 `getSibseong`(lib/saju/core/sibsin)에 위임한다. 이전엔 동일 로직을
 * 복사해 뒀으나(전 조합 대조 결과 정본과 byte-identical) 출처가 둘이면 한쪽만
 * 바뀔 때 어긋날 수 있어 위임으로 통일. 정본은 매칭 실패 시 '' 를 반환하므로
 * 이 어댑터의 계약(`SibsinKind | null`)에 맞춰 '' → null 로 정규화한다.
 */
export function getSibsinFromStemInfo(
  dayMaster: StemInfoForSibsin,
  target: StemInfoForSibsin
): SibsinKind | null {
  const sibsin = getSibseong(dayMaster, target)
  return sibsin ? (sibsin as SibsinKind) : null
}
