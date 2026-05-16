/**
 * South Node(남교점) × 별자리 — 과거 카르마/내려놓아야 할 패턴.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface SouthNodeEntry {
  pastPattern: BilingualText;
  releaseTask: BilingualText;
}

export const SOUTH_NODE: Record<ZodiacSign, SouthNodeEntry> = {
  aries: { pastPattern: { ko: '지나친 독립과 자기 의지의 과거 패턴.', en: 'Past pattern of excessive independence and willfulness.' }, releaseTask: { ko: '협력과 양보를 배우는 것이 카르마 풀이예요.', en: 'Learning cooperation and yielding releases karma.' } },
  taurus: { pastPattern: { ko: '물질·안전에 대한 집착의 과거 패턴.', en: 'Past pattern of clinging to material safety.' }, releaseTask: { ko: '변화와 깊이를 받아들이세요.', en: 'Accept change and depth.' } },
  gemini: { pastPattern: { ko: '얕은 정보와 산만함의 과거 패턴.', en: 'Past pattern of shallow info and scatter.' }, releaseTask: { ko: '깊이 있는 한 가지 진실을 추구하세요.', en: 'Seek one deep truth.' } },
  cancer: { pastPattern: { ko: '가족·돌봄에 자기를 잃은 과거 패턴.', en: 'Past pattern of losing self in family/caring.' }, releaseTask: { ko: '자기 욕망을 자기 일로 인정하세요.', en: 'Own your desires as your work.' } },
  leo: { pastPattern: { ko: '인정 욕구와 무대 중독의 과거 패턴.', en: 'Past pattern of recognition-need and stage addiction.' }, releaseTask: { ko: '집단의 이상에 기여하는 법을 배우세요.', en: 'Learn to contribute to collective ideals.' } },
  virgo: { pastPattern: { ko: '완벽주의와 봉사 강박의 과거 패턴.', en: 'Past pattern of perfectionism and service compulsion.' }, releaseTask: { ko: '직관과 자비에 자기를 맡기세요.', en: 'Surrender to intuition and compassion.' } },
  libra: { pastPattern: { ko: '타인에 맞추는 의존의 과거 패턴.', en: 'Past pattern of dependent accommodation.' }, releaseTask: { ko: '자기 의지로 자기 길을 선택하세요.', en: 'Choose your path by your own will.' } },
  scorpio: { pastPattern: { ko: '강렬함과 통제 집착의 과거 패턴.', en: 'Past pattern of intensity and control-obsession.' }, releaseTask: { ko: '소박한 안정과 자기 자원에 만족하세요.', en: 'Settle for simple stability and own resources.' } },
  sagittarius: { pastPattern: { ko: '큰 진리에 대한 맹신의 과거 패턴.', en: 'Past pattern of blind faith in big truth.' }, releaseTask: { ko: '구체적 사실과 디테일에 자기를 두세요.', en: 'Ground yourself in concrete facts and detail.' } },
  capricorn: { pastPattern: { ko: '성취와 통제에 매몰된 과거 패턴.', en: 'Past pattern absorbed in achievement and control.' }, releaseTask: { ko: '정서와 가족 안에 자기를 다시 두세요.', en: 'Re-locate yourself in emotion and family.' } },
  aquarius: { pastPattern: { ko: '집단 이상과 거리감의 과거 패턴.', en: 'Past pattern of collective ideal and detachment.' }, releaseTask: { ko: '한 사람을 진심으로 사랑하는 일을 배우세요.', en: 'Learn to love one person truly.' } },
  pisces: { pastPattern: { ko: '경계 없는 동화와 도피의 과거 패턴.', en: 'Past pattern of boundless merging and escape.' }, releaseTask: { ko: '디테일과 봉사로 현실에 닻을 내리세요.', en: 'Anchor in reality through detail and service.' } },
};
