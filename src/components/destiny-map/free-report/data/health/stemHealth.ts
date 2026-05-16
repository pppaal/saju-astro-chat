/**
 * 10일간(천간) × 건강 — 사주 dayMaster 자체의 체질적 경향.
 */

import type { BilingualText, HeavenlyStem } from '../../types/core';

export interface StemHealthEntry {
  constitution: BilingualText;
  weakPoint: BilingualText;
  advice: BilingualText;
}

export const STEM_HEALTH: Record<HeavenlyStem, StemHealthEntry> = {
  갑: {
    constitution: { ko: '튼튼하고 활동성 강한 양목 체질.', en: 'Strong, active yang-wood constitution.' },
    weakPoint: { ko: '간·근육·신경 과긴장.', en: 'Liver, muscles, nerve over-tension.' },
    advice: { ko: '주말엔 의도적으로 멈춰서 회복하세요.', en: 'Stop intentionally on weekends to recover.' },
  },
  을: {
    constitution: { ko: '유연하지만 체력이 약한 음목 체질.', en: 'Flexible but lower-energy yin-wood.' },
    weakPoint: { ko: '근육·인대·신경계 예민.', en: 'Sensitive muscles, ligaments, nerves.' },
    advice: { ko: '강한 운동보다 요가·필라테스 같은 유연성 운동을.', en: 'Yoga and pilates suit better than heavy lifting.' },
  },
  병: {
    constitution: { ko: '활력 넘치는 양화 체질.', en: 'Energetic yang-fire constitution.' },
    weakPoint: { ko: '심장·고혈압·과열.', en: 'Heart, hypertension, overheating.' },
    advice: { ko: '카페인 절제와 충분한 수분 섭취.', en: 'Limit caffeine, drink plenty of water.' },
  },
  정: {
    constitution: { ko: '섬세한 음화 체질.', en: 'Delicate yin-fire constitution.' },
    weakPoint: { ko: '심장·소장·자율신경 예민.', en: 'Heart, small intestine, sensitive autonomic nerves.' },
    advice: { ko: '저녁엔 자극적 환경을 피하고 정서적 안정 우선.', en: 'Avoid stimulating environments in the evening.' },
  },
  무: {
    constitution: { ko: '두터운 양토 체질 — 안정적.', en: 'Thick yang-earth constitution — stable.' },
    weakPoint: { ko: '비장·위·체중·관절.', en: 'Spleen, stomach, weight, joints.' },
    advice: { ko: '규칙적 식사와 가벼운 유산소.', en: 'Regular meals and light cardio.' },
  },
  기: {
    constitution: { ko: '부드러운 음토 체질 — 흡수형.', en: 'Soft yin-earth constitution — absorbent.' },
    weakPoint: { ko: '당뇨·소화·과식 위험.', en: 'Diabetes, digestion, overeating risk.' },
    advice: { ko: '단 음식 절제와 정시 식사.', en: 'Cut sugar, eat on schedule.' },
  },
  경: {
    constitution: { ko: '강건한 양금 체질.', en: 'Strong yang-metal constitution.' },
    weakPoint: { ko: '폐·대장·외상 위험.', en: 'Lungs, large intestine, injury risk.' },
    advice: { ko: '환기와 안전 장비, 깊은 호흡 운동.', en: 'Ventilation, safety gear, deep-breath exercise.' },
  },
  신: {
    constitution: { ko: '정밀한 음금 체질.', en: 'Refined yin-metal constitution.' },
    weakPoint: { ko: '호흡기·피부 알레르기.', en: 'Respiratory and skin allergies.' },
    advice: { ko: '공기 정화기와 피부 보습 루틴.', en: 'Air purifier and skin-moisture routine.' },
  },
  임: {
    constitution: { ko: '큰 음양 변동의 양수 체질.', en: 'Wide-swing yang-water constitution.' },
    weakPoint: { ko: '신장·생식기·하반신 부종.', en: 'Kidneys, reproductive, lower-body edema.' },
    advice: { ko: '하반신 보온과 충분한 수면.', en: 'Lower-body warmth and adequate sleep.' },
  },
  계: {
    constitution: { ko: '섬세한 음수 체질.', en: 'Delicate yin-water constitution.' },
    weakPoint: { ko: '신장·귀·뼈·우울감.', en: 'Kidneys, ears, bones, depression.' },
    advice: { ko: '햇빛과 사람과의 접촉을 정기적으로.', en: 'Regular sun and social contact.' },
  },
};
