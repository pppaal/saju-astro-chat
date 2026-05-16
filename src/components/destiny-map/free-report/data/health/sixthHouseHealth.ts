/**
 * 6하우스(일·건강·일상) × 별자리 — 건강 관리 포인트.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const HOUSE6_HEALTH: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '머리·치아·고열성 질환 주의. 활동성 운동으로 에너지 해소.', en: 'Watch head, teeth, fevers. Active exercise releases energy.' },
  taurus: { ko: '목·갑상선·당뇨 주의. 천천히 씹는 식습관과 가벼운 운동.', en: 'Watch throat, thyroid, diabetes. Slow chewing and light exercise.' },
  gemini: { ko: '폐·신경·호흡기 주의. 산책과 호흡 명상.', en: 'Watch lungs, nerves, respiration. Walks and breath meditation.' },
  cancer: { ko: '위·소화기·가슴 주의. 정서 안정과 규칙적 식사.', en: 'Watch stomach, digestion, chest. Emotional stability and regular meals.' },
  leo: { ko: '심장·등·혈압 주의. 자기 표현으로 스트레스 해소.', en: 'Watch heart, back, blood pressure. Release stress via self-expression.' },
  virgo: { ko: '장·신경성 소화불량 주의. 과한 분석 자제와 산책.', en: 'Watch intestines, nervous indigestion. Reduce over-analysis, walk.' },
  libra: { ko: '신장·허리·당뇨 주의. 균형 잡힌 식단과 휴식.', en: 'Watch kidneys, lower back, diabetes. Balanced diet and rest.' },
  scorpio: { ko: '생식기·비뇨기·심리적 스트레스 주의. 깊은 휴식과 명상.', en: 'Watch reproductive, urinary, psychological stress. Deep rest and meditation.' },
  sagittarius: { ko: '간·허벅지·과식 주의. 야외 활동과 절제.', en: 'Watch liver, thighs, overeating. Outdoor activity and restraint.' },
  capricorn: { ko: '뼈·관절·피부·치아 주의. 칼슘과 일조량 확보.', en: 'Watch bones, joints, skin, teeth. Calcium and sunlight.' },
  aquarius: { ko: '발목·순환·신경계 주의. 정기 운동과 디지털 디톡스.', en: 'Watch ankles, circulation, nerves. Regular exercise and digital detox.' },
  pisces: { ko: '발·면역·중독성 주의. 수영과 명상이 회복에 좋아요.', en: 'Watch feet, immunity, addiction. Swimming and meditation help recovery.' },
};
