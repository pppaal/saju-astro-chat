/**
 * 태양-달 어스펙트별 내면과 외면의 조화 패턴.
 */

import type { AspectType, BilingualText } from '../../types/core';

export const SUN_MOON_ASPECTS: Partial<Record<AspectType, BilingualText>> = {
  conjunction: { ko: '내면과 외면이 일치해요. 솔직하고 일관성 있는 사람이에요.', en: "Inner and outer self align. You're honest and consistent." },
  opposition: { ko: '내면과 외면 사이에 긴장이 있어요. 때로는 갈등하지만 균형을 찾아가요.', en: 'Tension between inner and outer self. Sometimes conflict but finding balance.' },
  square: { ko: '내면의 욕구와 외적 행동 사이에 도전이 있어요. 성장의 기회예요.', en: 'Challenges between inner needs and outer actions. Opportunity for growth.' },
  trine: { ko: '감정과 행동이 자연스럽게 조화를 이뤄요. 편안한 자아상을 가져요.', en: 'Emotions and actions naturally harmonize. You have a comfortable self-image.' },
  sextile: { ko: '감정과 의지가 잘 협력해요. 자기 표현에 능해요.', en: 'Emotions and will cooperate well. Skilled at self-expression.' },
};
