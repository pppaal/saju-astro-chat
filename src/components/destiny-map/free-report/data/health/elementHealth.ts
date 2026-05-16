/**
 * 오행별 건강 해석 — 약한/강한 오행에 따른 관리 포인트.
 */

import type { BilingualText, FiveElement } from '../../types/core';

export interface ElementHealthEntry {
  organ: BilingualText;
  weakSign: BilingualText;
  excessSign: BilingualText;
  daily: BilingualText;
  food: BilingualText;
}

export const ELEMENT_HEALTH: Record<FiveElement, ElementHealthEntry> = {
  wood: {
    organ: { ko: '간·담·근육·눈·신경계', en: 'Liver, gallbladder, muscles, eyes, nervous system' },
    weakSign: {
      ko: '쉽게 화나고 결정력 약화·시력 저하·근육 긴장.',
      en: 'Easy anger, weak decisions, eye strain, muscle tension.',
    },
    excessSign: {
      ko: '과로·고집·짜증·과음으로 인한 간 부담.',
      en: 'Overwork, stubbornness, irritation, liver stress from drinking.',
    },
    daily: {
      ko: '아침 산책·스트레칭·녹색 야채·금주.',
      en: 'Morning walks, stretching, greens, no alcohol.',
    },
    food: { ko: '시금치·브로콜리·아보카도·녹차', en: 'Spinach, broccoli, avocado, green tea' },
  },
  fire: {
    organ: { ko: '심장·소장·혈관·혀·정신', en: 'Heart, small intestine, blood vessels, tongue, mind' },
    weakSign: {
      ko: '의욕 저하·우울감·혈액 순환 약화·기억력.',
      en: 'Low motivation, depression, poor circulation, memory issues.',
    },
    excessSign: {
      ko: '불면·고혈압·열감·말 많아짐·심장 두근거림.',
      en: 'Insomnia, hypertension, heat, talking too much, palpitations.',
    },
    daily: {
      ko: '명상·심호흡·따뜻한 음식·과도한 자극 줄이기.',
      en: 'Meditation, breathing, warm food, reduce overstimulation.',
    },
    food: { ko: '대추·연근·구기자·따뜻한 차', en: 'Jujube, lotus root, goji, warm tea' },
  },
  earth: {
    organ: { ko: '비장·위·췌장·근육·입', en: 'Spleen, stomach, pancreas, flesh, mouth' },
    weakSign: {
      ko: '소화 약함·식욕 부진·만성 피로·과한 걱정.',
      en: 'Weak digestion, poor appetite, chronic fatigue, overthinking.',
    },
    excessSign: {
      ko: '과식·체중 증가·당뇨·우유부단·집착.',
      en: 'Overeating, weight gain, diabetes, indecision, clinging.',
    },
    daily: {
      ko: '규칙적 식사·꼭꼭 씹기·소화 보호·중도 유지.',
      en: 'Regular meals, thorough chewing, digestion protection, balance.',
    },
    food: { ko: '호박·고구마·당근·생강·기장', en: 'Pumpkin, sweet potato, carrot, ginger, millet' },
  },
  metal: {
    organ: { ko: '폐·대장·피부·코·털', en: 'Lungs, large intestine, skin, nose, hair' },
    weakSign: {
      ko: '호흡 얕음·피부 트러블·변비·슬픔 깊어짐.',
      en: 'Shallow breath, skin issues, constipation, deepening sadness.',
    },
    excessSign: {
      ko: '비판·고집·완벽주의·기관지 염증.',
      en: 'Critique, stubbornness, perfectionism, bronchial inflammation.',
    },
    daily: {
      ko: '깊은 호흡·맑은 공기·환기·일찍 자기.',
      en: 'Deep breathing, fresh air, ventilation, early sleep.',
    },
    food: { ko: '배·도라지·무·마늘·견과류', en: 'Pear, balloon flower, radish, garlic, nuts' },
  },
  water: {
    organ: { ko: '신장·방광·뼈·귀·생식기', en: 'Kidneys, bladder, bones, ears, reproductive organs' },
    weakSign: {
      ko: '쉽게 추위 탐·요통·청력 저하·두려움·탈모.',
      en: 'Easy chills, lower-back pain, hearing loss, fear, hair loss.',
    },
    excessSign: {
      ko: '부종·우울·과도한 사색·요결석.',
      en: 'Edema, depression, over-rumination, kidney stones.',
    },
    daily: {
      ko: '수분·따뜻한 옷·하반신 보온·과로 자제.',
      en: 'Hydration, warm clothing, lower-body warmth, less overwork.',
    },
    food: { ko: '검정콩·미역·연근·검은깨·호두', en: 'Black bean, seaweed, lotus root, black sesame, walnut' },
  },
};
