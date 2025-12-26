// 건강 분석 - 일간 + 오행 비율 + 6하우스 + 달 애스펙트 + 신살 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang
} from './utils';
import { dayMasterHealthTraits } from '../data/dayMasterTraits';
import { elementHealthEffects, elementExcessWarnings } from '../data/elementAnalysisTraits';

interface HealthAnalysis {
  focusAreas: string[];
  warnings: string[];
  lifestyle: string[];
  stressTip: string;
  elementImbalance: { element: string; organ: string; advice: string; emoji: string }[];
  house6Insight?: string;      // 6하우스 기반 건강 루틴
  emotionalHealth?: string;    // 달 애스펙트 기반 감정 건강
  sinsalHealth?: string;       // 신살 기반 건강 특이사항
  twelveStageHealth?: string;  // 12운성 기반 에너지 상태
}

// 달 별자리별 감정 건강 팁
const moonHealthTips: Record<string, { ko: string; en: string }> = {
  aries: { ko: "충동적인 감정을 다스리세요. 화가 건강에 영향줘요.", en: "Control impulsive emotions. Anger affects health." },
  taurus: { ko: "안정이 필요해요. 변화가 스트레스가 돼요.", en: "Need stability. Change causes stress." },
  gemini: { ko: "생각이 많아요. 머리를 비우는 시간이 필요해요.", en: "Think too much. Need time to empty your mind." },
  cancer: { ko: "감정이 예민해요. 안전한 공간에서 충전하세요.", en: "Emotions are sensitive. Recharge in safe spaces." },
  leo: { ko: "자존감이 건강에 연결돼요. 인정받으면 에너지가 살아나요.", en: "Self-esteem connects to health. Recognition revives energy." },
  virgo: { ko: "걱정이 많아요. 생각을 멈추는 연습하세요.", en: "You worry a lot. Practice stopping thoughts." },
  libra: { ko: "갈등이 스트레스예요. 조화로운 환경이 건강에 좋아요.", en: "Conflict is stress. Harmonious environment is healthy." },
  scorpio: { ko: "감정을 깊이 느껴요. 과도한 집착은 에너지를 소모해요.", en: "Feel emotions deeply. Excessive attachment drains energy." },
  sagittarius: { ko: "자유가 억압되면 지쳐요. 움직이고 탐험하세요.", en: "Feel drained when freedom is suppressed. Move and explore." },
  capricorn: { ko: "감정 억압 경향. 가끔은 표현하세요.", en: "Tendency to suppress emotions. Express sometimes." },
  aquarius: { ko: "감정적 거리두기가 있어요. 가까운 사람과 연결하세요.", en: "Emotional distancing exists. Connect with close ones." },
  pisces: { ko: "타인의 감정을 흡수해요. 경계를 지키세요.", en: "You absorb others' emotions. Keep boundaries." },
};

// 6하우스 별자리별 건강 관리 스타일
const house6HealthStyle: Record<string, { ko: string; en: string }> = {
  aries: { ko: "활동적인 운동이 필수예요. 에너지를 발산해야 해요.", en: "Active exercise is essential. Must release energy." },
  taurus: { ko: "규칙적인 식사가 중요해요. 천천히 즐기며 먹으세요.", en: "Regular meals are important. Eat slowly and enjoy." },
  gemini: { ko: "다양한 운동을 번갈아 하세요. 지루하면 안 해요.", en: "Alternate various exercises. Won't do if bored." },
  cancer: { ko: "집에서 하는 운동이 맞아요. 편안한 환경에서 관리하세요.", en: "Home workouts suit you. Manage in comfortable environment." },
  leo: { ko: "재미있고 주목받는 운동이 동기부여가 돼요.", en: "Fun, attention-getting exercises motivate you." },
  virgo: { ko: "체계적인 건강 관리가 맞아요. 기록하고 분석하세요.", en: "Systematic health management suits you. Record and analyze." },
  libra: { ko: "파트너와 함께 하는 운동이 지속돼요.", en: "Partner exercises last longer." },
  scorpio: { ko: "강도 높은 운동이 맞아요. 변화를 느껴야 동기부여 돼요.", en: "Intense workouts suit you. Need to feel change for motivation." },
  sagittarius: { ko: "야외 활동과 모험적인 운동이 맞아요.", en: "Outdoor activities and adventurous exercises suit you." },
  capricorn: { ko: "목표 지향적 운동이 맞아요. 결과를 측정하세요.", en: "Goal-oriented exercise suits you. Measure results." },
  aquarius: { ko: "독특하고 혁신적인 운동법이 흥미로워요.", en: "Unique, innovative exercise methods interest you." },
  pisces: { ko: "수영, 요가 같은 유연한 운동이 맞아요.", en: "Flexible exercises like swimming, yoga suit you." },
};

// 달 애스펙트별 감정 건강
const moonAspectHealth: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: "감정이 강하게 영향받아요. 감정 관리가 건강의 핵심이에요.", en: "Emotions strongly affect you. Emotion management is key to health." },
  opposition: { ko: "감정 기복이 건강에 영향줘요. 균형을 찾으세요.", en: "Emotional swings affect health. Find balance." },
  square: { ko: "내면의 갈등이 스트레스가 돼요. 표현하고 해소하세요.", en: "Inner conflicts cause stress. Express and resolve them." },
  trine: { ko: "감정 흐름이 자연스러워요. 직관을 믿으세요.", en: "Emotional flow is natural. Trust your intuition." },
  sextile: { ko: "감정 표현이 건강에 도움돼요. 소통하세요.", en: "Emotional expression helps health. Communicate." },
};

// 신살별 건강 특이사항
const sinsalHealthEffects: Record<string, { ko: string; en: string }> = {
  "역마": { ko: "움직여야 건강해요. 한곳에 오래 있으면 답답해져요.", en: "Movement keeps you healthy. Staying still too long makes you restless." },
  "화개": { ko: "정신적 활동이 건강에 좋아요. 명상이 도움돼요.", en: "Mental activities are good for health. Meditation helps." },
  "도화": { ko: "사회적 활동이 에너지를 줘요. 고립은 건강에 안 좋아요.", en: "Social activities give energy. Isolation is unhealthy." },
  "양인": { ko: "과격한 활동에 주의하세요. 부상 위험이 있어요.", en: "Be careful with aggressive activities. Risk of injury." },
  "귀문관": { ko: "정신 건강 관리가 중요해요. 과도한 스트레스를 피하세요.", en: "Mental health management is important. Avoid excessive stress." },
};

// 12운성별 에너지 상태
const twelveStageHealth: Record<string, { ko: string; en: string }> = {
  "장생": { ko: "에너지가 상승하는 시기예요. 새로운 건강 습관을 시작하기 좋아요.", en: "Energy is rising. Good time to start new health habits." },
  "목욕": { ko: "정화와 해독이 필요한 시기예요. 클렌징에 집중하세요.", en: "Time for purification and detox. Focus on cleansing." },
  "관대": { ko: "에너지가 넘치는 시기예요. 활동적으로 움직이세요.", en: "Energy is abundant. Be active." },
  "건록": { ko: "가장 건강한 시기예요. 좋은 습관을 유지하세요.", en: "Healthiest period. Maintain good habits." },
  "제왕": { ko: "에너지가 최고조예요. 하지만 과용을 조심하세요.", en: "Energy at peak. But watch for overuse." },
  "쇠": { ko: "에너지가 안정되는 시기예요. 무리하지 마세요.", en: "Energy is stabilizing. Don't overdo it." },
  "병": { ko: "에너지가 약해지는 시기예요. 휴식이 필요해요.", en: "Energy is weakening. Rest is needed." },
  "사": { ko: "재충전이 필요한 시기예요. 깊은 휴식을 취하세요.", en: "Recharge is needed. Take deep rest." },
  "묘": { ko: "에너지가 내면으로 향하는 시기예요. 명상이 도움돼요.", en: "Energy turns inward. Meditation helps." },
  "절": { ko: "완전한 휴식이 필요해요. 몸의 신호를 들으세요.", en: "Complete rest needed. Listen to body signals." },
  "태": { ko: "새로운 에너지가 잉태되는 시기예요. 부드럽게 시작하세요.", en: "New energy is conceived. Start gently." },
  "양": { ko: "에너지가 자라는 시기예요. 영양에 신경 쓰세요.", en: "Energy is growing. Pay attention to nutrition." },
};

/**
 * 6하우스 별자리 추출
 */
function getHouse6Sign(astro: AstroData | undefined): string | null {
  if (!astro?.houses) return null;

  if (Array.isArray(astro.houses)) {
    const house6 = astro.houses.find(h => h.index === 6);
    return house6?.sign?.toLowerCase() || null;
  }
  return null;
}

/**
 * 애스펙트에서 행성 이름 추출 (문자열 또는 객체 형태 모두 지원)
 */
function getAspectPlanetName(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase();
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') return name.toLowerCase();
  }
  return '';
}

/**
 * 달의 주요 애스펙트 찾기
 */
function getMoonAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) return null;

  // 달과 태양/토성의 애스펙트 우선 (가장 영향력 큼)
  const moonAspects = astro.aspects.filter(a => {
    const fromName = getAspectPlanetName(a.from);
    const toName = getAspectPlanetName(a.to);
    return fromName === 'moon' || toName === 'moon';
  });

  // 태양과의 애스펙트 우선
  const sunAspect = moonAspects.find(a => {
    const fromName = getAspectPlanetName(a.from);
    const toName = getAspectPlanetName(a.to);
    return fromName === 'sun' || toName === 'sun';
  });

  if (sunAspect) return sunAspect.type?.toLowerCase() || null;

  // 그 다음 토성
  const saturnAspect = moonAspects.find(a => {
    const fromName = getAspectPlanetName(a.from);
    const toName = getAspectPlanetName(a.to);
    return fromName === 'saturn' || toName === 'saturn';
  });

  return saturnAspect?.type?.toLowerCase() || null;
}

/**
 * 신살 건강 영향 찾기
 */
function getHealthSinsal(saju: SajuData | undefined): string | null {
  const sinsal = saju?.sinsal;
  const shinsal = saju?.shinsal;
  const specialStars = saju?.specialStars;

  const allSinsal: string[] = [];

  // 다양한 형태의 신살 수집
  if (sinsal?.luckyList) {
    allSinsal.push(...sinsal.luckyList.map(s => s.name));
  }
  if (sinsal?.unluckyList) {
    allSinsal.push(...sinsal.unluckyList.map(s => s.name));
  }
  if (Array.isArray(shinsal)) {
    allSinsal.push(...shinsal.map(s => s.name || '').filter(Boolean));
  }
  if (Array.isArray(specialStars)) {
    allSinsal.push(...specialStars.map(s => s.name || '').filter(Boolean));
  }

  // 건강 관련 신살 찾기
  for (const name of allSinsal) {
    if (sinsalHealthEffects[name]) {
      return name;
    }
  }

  return null;
}

/**
 * 12운성 추출
 */
function getTwelveStage(saju: SajuData | undefined): string | null {
  return saju?.twelveStages?.day || saju?.twelveStage || null;
}

export function getHealthAnalysisAdvanced(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): HealthAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) return null;

  const dmBase = dayMasterHealthTraits[dayMasterName] || dayMasterHealthTraits["갑"];

  // 오행 비율 (오름차순 - 약한 것부터)
  const sorted = extractFiveElementsSorted(saju, true);

  // 달 별자리 (감정적 건강)
  const moonSign = extractPlanetSign(astro, 'moon');

  // 새로 추가된 요소들
  const house6Sign = getHouse6Sign(astro);
  const moonAspect = getMoonAspect(astro);
  const healthSinsal = getHealthSinsal(saju);
  const twelveStage = getTwelveStage(saju);

  // 기본 건강 정보
  const focusAreas = [...selectLang(isKo, dmBase.focus)];
  const warnings: string[] = [selectLang(isKo, dmBase.warning)];
  const lifestyle = [...selectLang(isKo, dmBase.lifestyle)];
  let stressTip = selectLang(isKo, dmBase.stress);
  let house6Insight: string | undefined;
  let emotionalHealth: string | undefined;
  let sinsalHealth: string | undefined;
  let twelveStageHealthTip: string | undefined;

  // 약한 오행 기반 건강 불균형 추가
  const elementImbalance: { element: string; organ: string; advice: string; emoji: string }[] = [];

  for (let i = 0; i < Math.min(2, sorted.length); i++) {
    const [element, value] = sorted[i];
    if ((value as number) <= 15) {
      const effect = elementHealthEffects[element];
      if (effect) {
        elementImbalance.push({
          element: element,
          organ: selectLang(isKo, effect.organ),
          advice: selectLang(isKo, effect.effect),
          emoji: effect.emoji,
        });
      }
    }
  }

  // 달 별자리별 감정 건강 팁 추가
  if (moonSign && moonHealthTips[moonSign]) {
    stressTip += " " + selectLang(isKo, moonHealthTips[moonSign]);
  }

  // 오행 과다도 확인
  const strongestElement = sorted[sorted.length - 1]?.[0];
  const strongestValue = sorted[sorted.length - 1]?.[1] as number;

  if (strongestValue > 35 && strongestElement && elementExcessWarnings[strongestElement]) {
    warnings.push(selectLang(isKo, elementExcessWarnings[strongestElement]));
  }

  // ====== 새로 추가된 정교화 요소들 ======

  // 1. 6하우스 기반 건강 관리 스타일
  if (house6Sign && house6HealthStyle[house6Sign]) {
    house6Insight = selectLang(isKo, house6HealthStyle[house6Sign]);
    lifestyle.push(house6Insight);
  }

  // 2. 달 애스펙트 기반 감정 건강
  if (moonAspect && moonAspectHealth[moonAspect]) {
    emotionalHealth = selectLang(isKo, moonAspectHealth[moonAspect]);
  }

  // 3. 신살 기반 건강 특이사항
  if (healthSinsal && sinsalHealthEffects[healthSinsal]) {
    sinsalHealth = selectLang(isKo, sinsalHealthEffects[healthSinsal]);
    warnings.push(sinsalHealth);
  }

  // 4. 12운성 기반 현재 에너지 상태
  if (twelveStage && twelveStageHealth[twelveStage]) {
    twelveStageHealthTip = selectLang(isKo, twelveStageHealth[twelveStage]);
  }

  return {
    focusAreas,
    warnings,
    lifestyle,
    stressTip,
    elementImbalance,
    house6Insight,
    emotionalHealth,
    sinsalHealth,
    twelveStageHealth: twelveStageHealthTip,
  };
}
