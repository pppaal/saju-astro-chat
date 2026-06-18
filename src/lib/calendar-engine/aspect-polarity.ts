// aspect-polarity.ts
//
// 어스펙트 종류 + 두 행성의 길흉(benefic/malefic)으로 신호 polarity 를 추정.
// 여러 점성 추출기(transit/progression/arabic-part/moon-nodes/soul-pattern)가
// 같은 규칙을 쓰도록 한 곳에 모은다. polarity 는 deriveScore 의 입력이라
// 점수에 직접 영향 — 5버킷 테마 축(제거됨)과 무관한 길흉 판정 로직이다.

/**
 * 행성별 기본 길흉 (전통 분류).
 * conjunction 등 중립 어스펙트에서 polarity 결정에 사용.
 */
const PLANET_BENEFIC_MALEFIC: Record<string, 'benefic' | 'malefic' | 'neutral'> = {
  Jupiter: 'benefic',
  Venus: 'benefic',
  Sun: 'neutral',
  Moon: 'neutral',
  Mercury: 'neutral',
  Mars: 'malefic',
  Saturn: 'malefic',
  Uranus: 'neutral',
  Neptune: 'neutral',
  Pluto: 'malefic',
  Chiron: 'neutral',
}

/**
 * 어스펙트 + 행성 조합으로 polarity 추정.
 * 추출기에서 사용 — 모든 추출기가 같은 규칙 쓰도록 한 곳에 집중.
 */
export function inferAspectPolarity(
  aspectType: string,
  planetA: string,
  planetB: string
): -3 | -2 | -1 | 0 | 1 | 2 | 3 {
  const benefic = (p: string) => PLANET_BENEFIC_MALEFIC[p] === 'benefic'
  const malefic = (p: string) => PLANET_BENEFIC_MALEFIC[p] === 'malefic'

  const harmonious = aspectType === 'trine' || aspectType === 'sextile'
  const tense = aspectType === 'square' || aspectType === 'opposition' || aspectType === 'quincunx'
  const conj = aspectType === 'conjunction'

  const bothBenefic = benefic(planetA) && benefic(planetB)
  const bothMalefic = malefic(planetA) && malefic(planetB)
  const oneBenefic = benefic(planetA) || benefic(planetB)
  const oneMalefic = malefic(planetA) || malefic(planetB)

  if (harmonious) {
    if (bothBenefic) return 3
    if (oneBenefic) return 2
    if (bothMalefic) return 0 // 흉성 트라인은 완화
    return 1
  }
  if (tense) {
    if (bothMalefic) return -3
    if (oneMalefic) return -2
    if (bothBenefic) return 0 // 길성 스퀘어는 완화
    return -1
  }
  if (conj) {
    if (bothBenefic) return 2
    if (bothMalefic) return -2
    if (oneBenefic && !oneMalefic) return 1
    if (oneMalefic && !oneBenefic) return -1
    return 0
  }
  return 0
}
