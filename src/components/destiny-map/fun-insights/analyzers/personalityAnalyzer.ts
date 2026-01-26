// 성격 분석 - 일간 + 오행 + 별자리 + 십신 + 12운성 + ASC 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang,
  uniqueArray
} from './utils';
import { dayMasterPersonalityTraits } from '../data/dayMasterTraits';
import { zodiacPersonalityTraits } from '../data/zodiacTraits';
import { elementPersonalityTraits, elementAdvice } from '../data/elementAnalysisTraits';

interface PersonalityAnalysis {
  title: string;
  description: string;
  traits: string[];
  strengths: string[];
  challenges: string[];
  advice: string;
  sibsinProfile?: string;      // 십신 기반 성격 프로필
  lifeStage?: string;          // 12운성 기반 현재 단계
  socialImage?: string;        // ASC 기반 외적 이미지
  sunMoonHarmony?: string;     // 태양-달 애스펙트 - 내면과 외면의 조화
  thinkingStyle?: string;      // 수성 - 사고방식
  innerConflict?: string;      // 내면 갈등 패턴
  communicationStyle?: string; // 의사소통 스타일
  decisionMaking?: string;     // 의사결정 스타일
  stressResponse?: string;     // 스트레스 대응 방식
}

// 십신별 성격 영향
const sibsinPersonality: Record<string, { ko: string; en: string; trait: { ko: string; en: string } }> = {
  "비겁": {
    ko: "자기 주장이 강하고 독립적이에요. 경쟁심이 있고 자존심이 높아요.",
    en: "Strong self-assertion and independent. Competitive with high self-esteem.",
    trait: { ko: "독립성", en: "Independence" }
  },
  "식상": {
    ko: "표현력이 뛰어나고 창의적이에요. 말과 글에 재능이 있어요.",
    en: "Excellent expression and creativity. Talented in speaking and writing.",
    trait: { ko: "창의성", en: "Creativity" }
  },
  "재성": {
    ko: "현실적이고 실용적이에요. 재물과 관계에 민감해요.",
    en: "Realistic and practical. Sensitive to wealth and relationships.",
    trait: { ko: "현실감각", en: "Practicality" }
  },
  "관성": {
    ko: "책임감이 강하고 규율을 중시해요. 사회적 성취를 추구해요.",
    en: "Strong responsibility and values discipline. Pursues social achievement.",
    trait: { ko: "책임감", en: "Responsibility" }
  },
  "인성": {
    ko: "학습 능력이 뛰어나고 사려 깊어요. 보호본능이 강해요.",
    en: "Excellent learning ability and thoughtful. Strong protective instincts.",
    trait: { ko: "사려깊음", en: "Thoughtfulness" }
  },
};

// 12운성별 생명력 단계
const twelveStagePersonality: Record<string, { ko: string; en: string }> = {
  "장생": { ko: "새로운 시작의 에너지가 넘쳐요. 호기심과 성장 욕구가 강해요.", en: "Full of new beginning energy. Strong curiosity and desire to grow." },
  "목욕": { ko: "변화와 정화의 시기예요. 새로운 자아를 탐색 중이에요.", en: "Time of change and purification. Exploring new self." },
  "관대": { ko: "사회적으로 빛나는 시기예요. 인정받고 성장해요.", en: "Time to shine socially. Recognized and growing." },
  "건록": { ko: "가장 안정적이고 실력이 발휘되는 시기예요.", en: "Most stable period where skills shine." },
  "제왕": { ko: "정점에 있어요. 리더십과 영향력이 최고조예요.", en: "At the peak. Leadership and influence at maximum." },
  "쇠": { ko: "성숙하고 안정된 시기예요. 경험의 지혜가 빛나요.", en: "Mature and stable period. Wisdom of experience shines." },
  "병": { ko: "내면으로 향하는 시기예요. 깊은 성찰이 필요해요.", en: "Turning inward. Deep reflection needed." },
  "사": { ko: "변환의 시기예요. 새로운 방향을 모색해요.", en: "Time of transformation. Seeking new direction." },
  "묘": { ko: "잠재력이 숨어있는 시기예요. 내면의 힘을 키워요.", en: "Potential lies hidden. Building inner strength." },
  "절": { ko: "완전한 전환의 시기예요. 새 시작을 준비해요.", en: "Complete transition time. Preparing new start." },
  "태": { ko: "새 생명의 에너지가 잉태되는 시기예요.", en: "New life energy is conceived." },
  "양": { ko: "새로운 가능성을 품고 자라는 시기예요.", en: "Growing with new possibilities." },
};

// ASC 별자리별 외적 이미지
const ascendantPersonality: Record<string, { ko: string; en: string }> = {
  aries: { ko: "첫인상이 당당하고 에너지 넘쳐요. 리더처럼 보여요.", en: "First impression is confident and energetic. Looks like a leader." },
  taurus: { ko: "첫인상이 안정적이고 신뢰감 있어요. 품격이 느껴져요.", en: "First impression is stable and trustworthy. Feels classy." },
  gemini: { ko: "첫인상이 재치 있고 호기심 많아 보여요. 사교적이에요.", en: "First impression is witty and curious. Social." },
  cancer: { ko: "첫인상이 따뜻하고 보호적이에요. 친근해 보여요.", en: "First impression is warm and protective. Looks approachable." },
  leo: { ko: "첫인상이 화려하고 자신감 넘쳐요. 주목받아요.", en: "First impression is glamorous and confident. Draws attention." },
  virgo: { ko: "첫인상이 깔끔하고 분석적이에요. 신중해 보여요.", en: "First impression is neat and analytical. Looks careful." },
  libra: { ko: "첫인상이 우아하고 조화로워요. 친절해 보여요.", en: "First impression is elegant and harmonious. Looks kind." },
  scorpio: { ko: "첫인상이 강렬하고 신비로워요. 깊이가 느껴져요.", en: "First impression is intense and mysterious. Feels deep." },
  sagittarius: { ko: "첫인상이 자유롭고 낙관적이에요. 모험적이에요.", en: "First impression is free and optimistic. Adventurous." },
  capricorn: { ko: "첫인상이 진지하고 책임감 있어요. 신뢰할 수 있어요.", en: "First impression is serious and responsible. Trustworthy." },
  aquarius: { ko: "첫인상이 독특하고 진보적이에요. 특별해 보여요.", en: "First impression is unique and progressive. Looks special." },
  pisces: { ko: "첫인상이 부드럽고 감성적이에요. 예술적이에요.", en: "First impression is soft and emotional. Artistic." },
};

// 태양-달 애스펙트별 내면과 외면의 조화
const sunMoonAspects: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: "내면과 외면이 일치해요. 솔직하고 일관성 있는 사람이에요.", en: "Inner and outer self align. You're honest and consistent." },
  opposition: { ko: "내면과 외면 사이에 긴장이 있어요. 때로는 갈등하지만 균형을 찾아가요.", en: "Tension between inner and outer self. Sometimes conflict but finding balance." },
  square: { ko: "내면의 욕구와 외적 행동 사이에 도전이 있어요. 성장의 기회예요.", en: "Challenges between inner needs and outer actions. Opportunity for growth." },
  trine: { ko: "감정과 행동이 자연스럽게 조화를 이뤄요. 편안한 자아상을 가져요.", en: "Emotions and actions naturally harmonize. You have a comfortable self-image." },
  sextile: { ko: "감정과 의지가 잘 협력해요. 자기 표현에 능해요.", en: "Emotions and will cooperate well. Skilled at self-expression." },
};

// 수성 별자리별 사고방식
const mercuryThinkingStyle: Record<string, { ko: string; en: string }> = {
  aries: { ko: "빠르고 직관적으로 생각해요. 결정이 빨라요.", en: "Think fast and intuitively. Quick decisions." },
  taurus: { ko: "천천히 신중하게 생각해요. 실용적인 결론을 내요.", en: "Think slowly and carefully. Reach practical conclusions." },
  gemini: { ko: "다양한 관점으로 생각해요. 호기심이 끝이 없어요.", en: "Think from various perspectives. Endless curiosity." },
  cancer: { ko: "감정과 연결된 생각을 해요. 직관이 뛰어나요.", en: "Think connected to emotions. Excellent intuition." },
  leo: { ko: "창의적이고 극적으로 생각해요. 큰 그림을 봐요.", en: "Think creatively and dramatically. See the big picture." },
  virgo: { ko: "분석적이고 세밀하게 생각해요. 완벽을 추구해요.", en: "Think analytically and detailed. Pursue perfection." },
  libra: { ko: "균형 잡힌 시각으로 생각해요. 공정함을 중시해요.", en: "Think with balanced perspective. Value fairness." },
  scorpio: { ko: "깊이 파고들며 생각해요. 진실을 찾아요.", en: "Think by digging deep. Search for truth." },
  sagittarius: { ko: "넓게 철학적으로 생각해요. 의미를 찾아요.", en: "Think broadly and philosophically. Search for meaning." },
  capricorn: { ko: "실용적이고 전략적으로 생각해요. 결과를 중시해요.", en: "Think practically and strategically. Value results." },
  aquarius: { ko: "독창적이고 혁신적으로 생각해요. 미래를 봐요.", en: "Think originally and innovatively. See the future." },
  pisces: { ko: "상상력 풍부하게 생각해요. 영감이 넘쳐요.", en: "Think imaginatively. Full of inspiration." },
};

// 태양-달 조합별 내면 갈등 (태양과 달이 다른 원소일 때)
const elementConflicts: Record<string, { ko: string; en: string }> = {
  "fire-water": { ko: "열정과 감정 사이에서 갈등해요. 행동하고 싶지만 조심스러워요.", en: "Conflict between passion and emotion. Want to act but cautious." },
  "fire-earth": { ko: "모험과 안정 사이에서 갈등해요. 도전하고 싶지만 확실함도 원해요.", en: "Conflict between adventure and stability. Want to challenge but also want certainty." },
  "air-water": { ko: "논리와 감정 사이에서 갈등해요. 생각과 느낌이 달라요.", en: "Conflict between logic and emotion. Thoughts and feelings differ." },
  "air-earth": { ko: "아이디어와 현실 사이에서 갈등해요. 상상과 실행 사이 간극이 있어요.", en: "Conflict between ideas and reality. Gap between imagination and execution." },
  "fire-air": { ko: "에너지가 넘쳐요. 행동과 생각이 빨라서 때로는 앞서가요.", en: "Overflowing energy. Actions and thoughts are fast, sometimes ahead." },
  "water-earth": { ko: "감정과 현실 사이에서 균형을 찾아요. 안정 속에서 깊이를 추구해요.", en: "Find balance between emotion and reality. Seek depth in stability." },
};

// 금성 별자리별 의사소통/관계 스타일
const venusCommunicationStyle: Record<string, { ko: string; en: string }> = {
  aries: { ko: "직접적이고 솔직하게 소통해요. 돌려 말하는 걸 싫어해요.", en: "Communicate directly and honestly. Dislike beating around the bush." },
  taurus: { ko: "차분하고 신중하게 대화해요. 진심 어린 표현을 중시해요.", en: "Talk calmly and thoughtfully. Value sincere expressions." },
  gemini: { ko: "재치 있고 다양한 화제로 대화해요. 대화의 즐거움을 아는 사람이에요.", en: "Converse with wit on various topics. Someone who knows the joy of conversation." },
  cancer: { ko: "공감과 배려가 담긴 대화를 해요. 상대의 감정을 잘 읽어요.", en: "Communicate with empathy and care. Read others' emotions well." },
  leo: { ko: "열정적이고 따뜻하게 소통해요. 칭찬과 격려를 잘 해요.", en: "Communicate passionately and warmly. Good at praise and encouragement." },
  virgo: { ko: "정확하고 구체적으로 전달해요. 실질적인 도움을 주려 해요.", en: "Deliver precisely and specifically. Try to give practical help." },
  libra: { ko: "조화롭고 우아하게 대화해요. 갈등을 피하고 균형을 추구해요.", en: "Converse harmoniously and elegantly. Avoid conflict and seek balance." },
  scorpio: { ko: "깊이 있고 진실한 대화를 원해요. 피상적인 대화는 싫어해요.", en: "Want deep and truthful conversations. Dislike superficial talk." },
  sagittarius: { ko: "유머와 철학이 있는 대화를 해요. 열린 마음으로 소통해요.", en: "Converse with humor and philosophy. Communicate with an open mind." },
  capricorn: { ko: "신뢰와 실용성을 담아 소통해요. 말에 책임을 져요.", en: "Communicate with trust and practicality. Take responsibility for words." },
  aquarius: { ko: "독창적이고 평등한 대화를 추구해요. 다양한 관점을 존중해요.", en: "Pursue original and equal conversation. Respect diverse viewpoints." },
  pisces: { ko: "감성적이고 부드럽게 소통해요. 상대의 마음을 이해하려 해요.", en: "Communicate emotionally and gently. Try to understand others' hearts." },
};

// 화성 별자리별 의사결정/행동 스타일
const marsDecisionStyle: Record<string, { ko: string; en: string }> = {
  aries: { ko: "빠르고 과감하게 결정해요. 주저하지 않고 행동에 옮겨요.", en: "Decide quickly and boldly. Act without hesitation." },
  taurus: { ko: "천천히 확실하게 결정해요. 한번 정하면 끝까지 밀고 나가요.", en: "Decide slowly but surely. Once decided, push through to the end." },
  gemini: { ko: "여러 옵션을 검토하고 결정해요. 유연하게 계획을 수정해요.", en: "Review multiple options before deciding. Flexibly modify plans." },
  cancer: { ko: "직감과 감정을 믿고 결정해요. 가족과 소중한 사람을 고려해요.", en: "Decide trusting intuition and emotion. Consider family and loved ones." },
  leo: { ko: "자신감 있게 결정하고 이끌어요. 큰 그림을 보고 행동해요.", en: "Decide confidently and lead. Act seeing the big picture." },
  virgo: { ko: "분석하고 계획을 세워 결정해요. 세부사항까지 신경 써요.", en: "Decide after analyzing and planning. Pay attention to details." },
  libra: { ko: "균형과 공정함을 고려해 결정해요. 다른 사람 의견도 참고해요.", en: "Decide considering balance and fairness. Reference others' opinions too." },
  scorpio: { ko: "전략적으로 깊이 생각하고 결정해요. 한번 정하면 강력하게 추진해요.", en: "Decide after strategic deep thinking. Once set, pursue powerfully." },
  sagittarius: { ko: "낙관적으로 과감하게 결정해요. 모험을 두려워하지 않아요.", en: "Decide optimistically and boldly. Not afraid of adventure." },
  capricorn: { ko: "현실적이고 장기적으로 결정해요. 성과와 결과를 중시해요.", en: "Decide realistically and long-term. Value outcomes and results." },
  aquarius: { ko: "독창적인 방식으로 결정해요. 기존 방식에 얽매이지 않아요.", en: "Decide in original ways. Not bound by conventional methods." },
  pisces: { ko: "직관과 영감을 따라 결정해요. 유연하게 흐름에 맡기기도 해요.", en: "Decide following intuition and inspiration. Sometimes go with the flow." },
};

// 달 별자리별 스트레스 대응 방식
const moonStressResponse: Record<string, { ko: string; en: string }> = {
  aries: { ko: "스트레스를 받으면 활동적으로 풀어요. 운동이나 행동으로 해소해요.", en: "When stressed, release through activity. Exercise or action helps." },
  taurus: { ko: "편안한 환경에서 휴식하며 회복해요. 맛있는 음식이나 자연이 도움돼요.", en: "Recover by resting in comfort. Good food or nature helps." },
  gemini: { ko: "대화하거나 새로운 정보를 찾으며 해소해요. 머리를 쓰면 기분이 나아져요.", en: "Release through conversation or seeking new info. Mental activity improves mood." },
  cancer: { ko: "혼자만의 시간이나 가까운 사람과 함께하며 회복해요. 안정감이 필요해요.", en: "Recover with alone time or close ones. Need sense of security." },
  leo: { ko: "창의적 활동이나 주목받는 일로 해소해요. 인정받으면 힘이 나요.", en: "Release through creative activity or being noticed. Recognition energizes." },
  virgo: { ko: "정리하고 문제를 해결하며 마음을 가다듬어요. 실질적 행동이 도움돼요.", en: "Organize and solve problems to calm down. Practical action helps." },
  libra: { ko: "아름다운 것을 보거나 조화로운 환경에서 쉬어요. 균형 회복이 중요해요.", en: "Rest seeing beauty or in harmonious environment. Balance recovery matters." },
  scorpio: { ko: "깊이 성찰하거나 혼자 시간을 보내며 재충전해요. 강렬한 감정을 소화해요.", en: "Recharge through deep reflection or alone time. Process intense emotions." },
  sagittarius: { ko: "여행이나 새로운 경험으로 기분을 전환해요. 자유로움이 필요해요.", en: "Change mood through travel or new experiences. Need freedom." },
  capricorn: { ko: "일에 집중하거나 목표를 향해 노력하며 극복해요. 성취감이 회복을 도와요.", en: "Overcome by focusing on work or pursuing goals. Achievement aids recovery." },
  aquarius: { ko: "혼자 생각하거나 친구들과 어울리며 해소해요. 개인 공간이 중요해요.", en: "Release by thinking alone or hanging with friends. Personal space matters." },
  pisces: { ko: "예술, 음악, 명상으로 마음을 치유해요. 상상의 세계로 잠시 피해요.", en: "Heal through art, music, meditation. Escape to imagination briefly." },
};

/**
 * 십신 분포에서 가장 강한 십신 추출
 */
function getDominantSibsin(saju: SajuData | undefined): string | null {
  const sibsinDist = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  if (!sibsinDist || typeof sibsinDist !== 'object') {return null;}

  const entries = Object.entries(sibsinDist) as [string, number][];
  if (entries.length === 0) {return null;}

  // 가장 높은 비율의 십신 찾기
  const sorted = entries.sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] || null;
}

/**
 * 12운성 추출
 */
function getTwelveStage(saju: SajuData | undefined): string | null {
  return saju?.twelveStages?.day || saju?.twelveStage || null;
}

/**
 * ASC(상승) 별자리 추출
 */
function getAscendant(astro: AstroData | undefined): string | null {
  return astro?.ascendant?.sign?.toLowerCase() || null;
}

/**
 * 애스펙트에서 행성 이름 추출 (문자열 또는 객체 형태 모두 지원)
 */
function getAspectPlanetName(value: unknown): string {
  if (typeof value === 'string') {return value.toLowerCase();}
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') {return name.toLowerCase();}
  }
  return '';
}

/**
 * 태양-달 애스펙트 찾기
 */
function getSunMoonAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) {return null;}

  const sunMoon = astro.aspects.find(a => {
    const fromName = getAspectPlanetName(a.from);
    const toName = getAspectPlanetName(a.to);
    return (fromName === 'sun' && toName === 'moon') ||
           (fromName === 'moon' && toName === 'sun');
  });

  return sunMoon?.type?.toLowerCase() || null;
}

/**
 * 수성 별자리 추출
 */
function getMercurySign(astro: AstroData | undefined): string | null {
  return extractPlanetSign(astro, 'mercury');
}

/**
 * 별자리를 원소로 변환
 */
function getSignElement(sign: string | null): string | null {
  if (!sign) {return null;}

  const fireSign = ['aries', 'leo', 'sagittarius'];
  const earthSign = ['taurus', 'virgo', 'capricorn'];
  const airSign = ['gemini', 'libra', 'aquarius'];
  const waterSign = ['cancer', 'scorpio', 'pisces'];

  if (fireSign.includes(sign)) {return 'fire';}
  if (earthSign.includes(sign)) {return 'earth';}
  if (airSign.includes(sign)) {return 'air';}
  if (waterSign.includes(sign)) {return 'water';}
  return null;
}

/**
 * 두 원소의 갈등 유형 찾기
 */
function getElementConflict(el1: string | null, el2: string | null): string | null {
  if (!el1 || !el2 || el1 === el2) {return null;}

  const key1 = `${el1}-${el2}`;
  const key2 = `${el2}-${el1}`;

  if (elementConflicts[key1]) {return key1;}
  if (elementConflicts[key2]) {return key2;}
  return null;
}

export function getPersonalityAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): PersonalityAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) {return null;}

  const dmBase = dayMasterPersonalityTraits[dayMasterName] || dayMasterPersonalityTraits["갑"];

  // 오행 비율
  const sorted = extractFiveElementsSorted(saju);
  const strongestElement = sorted[0]?.[0];

  // 태양/달 별자리
  const sunSign = extractPlanetSign(astro, 'sun');
  const moonSign = extractPlanetSign(astro, 'moon');

  // 새로 추가된 요소들
  const dominantSibsin = getDominantSibsin(saju);
  const twelveStage = getTwelveStage(saju);
  const ascendant = getAscendant(astro);
  const sunMoonAspectType = getSunMoonAspect(astro);
  const mercurySign = getMercurySign(astro);
  const venusSign = extractPlanetSign(astro, 'venus');
  const marsSign = extractPlanetSign(astro, 'mars');
  const sunElement = getSignElement(sunSign);
  const moonElement = getSignElement(moonSign);
  const conflictType = getElementConflict(sunElement, moonElement);

  // 조합해서 개인화된 분석 생성
  const title = selectLang(isKo, dmBase.title);
  let description = selectLang(isKo, dmBase.core);
  const traits = [...selectLang(isKo, dmBase.traits)];
  const strengths: string[] = [selectLang(isKo, dmBase.strength)];
  const challenges: string[] = [selectLang(isKo, dmBase.challenge)];
  let advice = "";
  let sibsinProfile: string | undefined;
  let lifeStage: string | undefined;
  let socialImage: string | undefined;
  let sunMoonHarmony: string | undefined;
  let thinkingStyle: string | undefined;
  let innerConflict: string | undefined;
  let communicationStyle: string | undefined;
  let decisionMaking: string | undefined;
  let stressResponse: string | undefined;

  // 태양 별자리로 외적 성격 보강
  if (sunSign && zodiacPersonalityTraits[sunSign]) {
    const sunTrait = zodiacPersonalityTraits[sunSign];
    description += " " + (isKo
      ? `겉으로는 ${selectLang(isKo, sunTrait.trait)} 모습을 보여요.`
      : `Externally, you show a ${selectLang(isKo, sunTrait.trait).toLowerCase()} side.`);
    strengths.push(selectLang(isKo, sunTrait.strength));
  }

  // 달 별자리로 내면 성격 보강
  if (moonSign && zodiacPersonalityTraits[moonSign]) {
    const moonTrait = zodiacPersonalityTraits[moonSign];
    description += " " + (isKo
      ? `속으로는 ${selectLang(isKo, moonTrait.trait)} 감성을 가지고 있어요.`
      : `Inside, you have a ${selectLang(isKo, moonTrait.trait).toLowerCase()} emotion.`);
  }

  // 강한 오행으로 특성 보강
  if (strongestElement && elementPersonalityTraits[strongestElement]) {
    description += " " + selectLang(isKo, elementPersonalityTraits[strongestElement]);
  }

  // ====== 새로 추가된 정교화 요소들 ======

  // 1. 십신 분포 기반 성격 프로필
  if (dominantSibsin && sibsinPersonality[dominantSibsin]) {
    const sibsinInfo = sibsinPersonality[dominantSibsin];
    sibsinProfile = selectLang(isKo, sibsinInfo);
    traits.push(selectLang(isKo, sibsinInfo.trait));
  }

  // 2. 12운성 기반 현재 생명력 단계
  if (twelveStage && twelveStagePersonality[twelveStage]) {
    lifeStage = selectLang(isKo, twelveStagePersonality[twelveStage]);
  }

  // 3. ASC 기반 외적 이미지
  if (ascendant && ascendantPersonality[ascendant]) {
    socialImage = selectLang(isKo, ascendantPersonality[ascendant]);
  }

  // 4. 태양-달 애스펙트 - 내면과 외면의 조화
  if (sunMoonAspectType && sunMoonAspects[sunMoonAspectType]) {
    sunMoonHarmony = selectLang(isKo, sunMoonAspects[sunMoonAspectType]);
  }

  // 5. 수성 별자리 - 사고방식
  if (mercurySign && mercuryThinkingStyle[mercurySign]) {
    thinkingStyle = selectLang(isKo, mercuryThinkingStyle[mercurySign]);
  }

  // 6. 태양-달 원소 갈등 - 내면 갈등 패턴
  if (conflictType && elementConflicts[conflictType]) {
    innerConflict = selectLang(isKo, elementConflicts[conflictType]);
  }

  // 7. 금성 별자리 - 의사소통 스타일
  if (venusSign && venusCommunicationStyle[venusSign]) {
    communicationStyle = selectLang(isKo, venusCommunicationStyle[venusSign]);
  }

  // 8. 화성 별자리 - 의사결정 스타일
  if (marsSign && marsDecisionStyle[marsSign]) {
    decisionMaking = selectLang(isKo, marsDecisionStyle[marsSign]);
  }

  // 9. 달 별자리 - 스트레스 대응
  if (moonSign && moonStressResponse[moonSign]) {
    stressResponse = selectLang(isKo, moonStressResponse[moonSign]);
  }

  // 조언 생성 (약한 오행 기반)
  const weakestElement = sorted[sorted.length - 1]?.[0];
  if (weakestElement && elementAdvice[weakestElement]) {
    advice = selectLang(isKo, elementAdvice[weakestElement]);
  } else {
    advice = isKo ? "당신다운 방식으로 살아가세요." : "Live in your own way.";
  }

  return {
    title,
    description,
    traits: uniqueArray(traits).slice(0, 5),
    strengths: uniqueArray(strengths).slice(0, 4),
    challenges,
    advice,
    sibsinProfile,
    lifeStage,
    socialImage,
    sunMoonHarmony,
    thinkingStyle,
    innerConflict,
    communicationStyle,
    decisionMaking,
    stressResponse,
  };
}
