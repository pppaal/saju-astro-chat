// 커리어 분석 - 일간 + 오행 + 별자리 + 10하우스 + 토성 + 대운 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang,
  uniqueArray
} from './utils';
import { dayMasterCareerTraits } from '../data/dayMasterTraits';
import { zodiacCareerTraits } from '../data/zodiacTraits';
import { elementCareerTraits } from '../data/elementAnalysisTraits';

interface CareerAnalysis {
  workStyle: string;
  strengths: string[];
  idealEnvironment: string;
  avoidEnvironment: string;
  growthTip: string;
  suggestedFields: string[];
  publicImage?: string;       // MC 기반 사회적 이미지
  careerPath?: string;        // 토성 기반 커리어 패스
  currentPhase?: string;      // 대운 기반 현재 커리어 단계
  sibsinCareer?: string;      // 십신 기반 직업 적성
  leadershipStyle?: string;   // 10하우스 기반 리더십
  jupiterBlessings?: string;  // 목성 하우스 - 행운과 확장 분야
  saturnMcAspect?: string;    // 토성-MC 애스펙트 - 커리어 성숙도
  sunSaturnAspect?: string;   // 태양-토성 - 권위와의 관계
  // 새로 추가
  overseasFortune?: string;   // 해외운 (9하우스 + 역마)
  wealthStyle?: string;       // 재물운 스타일 (2/8하우스 + 재성)
  successTiming?: string;     // 성공 시기 (목성/토성 리턴)
  wealthScore?: number;       // 재물운 점수 (0-100)
  mcSign?: string;            // MC 별자리
  decisionStyle?: string;     // 의사결정 스타일
  teamworkStyle?: string;     // 팀워크 스타일
}

// 10하우스 별자리별 사회적 역할
const house10Patterns: Record<string, { ko: string; en: string; leadership: { ko: string; en: string } }> = {
  aries: {
    ko: "선구자로서 새로운 분야를 개척하는 역할이 어울려요.",
    en: "Suited for pioneering new fields as a trailblazer.",
    leadership: { ko: "앞장서서 이끄는 리더", en: "Leading from the front" }
  },
  taurus: {
    ko: "안정적인 기반을 구축하고 자원을 관리하는 역할이 어울려요.",
    en: "Suited for building stable foundations and managing resources.",
    leadership: { ko: "신뢰를 쌓는 리더", en: "Building trust" }
  },
  gemini: {
    ko: "정보를 전달하고 연결하는 역할이 어울려요.",
    en: "Suited for conveying information and connecting.",
    leadership: { ko: "소통하는 리더", en: "Communicating leader" }
  },
  cancer: {
    ko: "사람들을 돌보고 보호하는 역할이 어울려요.",
    en: "Suited for caring and protecting people.",
    leadership: { ko: "돌봐주는 리더", en: "Nurturing leader" }
  },
  leo: {
    ko: "주목받는 자리에서 영감을 주는 역할이 어울려요.",
    en: "Suited for inspiring from the spotlight.",
    leadership: { ko: "카리스마 리더", en: "Charismatic leader" }
  },
  virgo: {
    ko: "디테일을 관리하고 시스템을 개선하는 역할이 어울려요.",
    en: "Suited for managing details and improving systems.",
    leadership: { ko: "꼼꼼한 리더", en: "Meticulous leader" }
  },
  libra: {
    ko: "조화와 균형을 맞추는 역할이 어울려요.",
    en: "Suited for balancing and harmonizing.",
    leadership: { ko: "조율하는 리더", en: "Balancing leader" }
  },
  scorpio: {
    ko: "깊이 파고들어 변화를 이끄는 역할이 어울려요.",
    en: "Suited for digging deep and leading change.",
    leadership: { ko: "변혁의 리더", en: "Transformative leader" }
  },
  sagittarius: {
    ko: "비전을 제시하고 확장하는 역할이 어울려요.",
    en: "Suited for presenting vision and expanding.",
    leadership: { ko: "비전을 제시하는 리더", en: "Visionary leader" }
  },
  capricorn: {
    ko: "장기적인 목표를 향해 꾸준히 쌓아가는 역할이 어울려요.",
    en: "Suited for steadily building toward long-term goals.",
    leadership: { ko: "전략적 리더", en: "Strategic leader" }
  },
  aquarius: {
    ko: "혁신적인 아이디어로 변화를 주도하는 역할이 어울려요.",
    en: "Suited for leading change with innovative ideas.",
    leadership: { ko: "혁신하는 리더", en: "Innovative leader" }
  },
  pisces: {
    ko: "창의성과 영감으로 사람들을 이끄는 역할이 어울려요.",
    en: "Suited for leading with creativity and inspiration.",
    leadership: { ko: "영감을 주는 리더", en: "Inspiring leader" }
  },
};

// 토성 별자리별 커리어 과제
const saturnCareerPath: Record<string, { ko: string; en: string }> = {
  aries: { ko: "리더십과 독립심을 통해 성장해요. 인내심을 기르면 성공해요.", en: "Grow through leadership and independence. Patience brings success." },
  taurus: { ko: "재정적 안정과 가치 창출이 과제예요. 꾸준함이 보상 받아요.", en: "Financial stability and value creation are your challenges. Consistency is rewarded." },
  gemini: { ko: "깊이 있는 지식을 쌓는 게 과제예요. 집중력을 기르세요.", en: "Building deep knowledge is your challenge. Develop focus." },
  cancer: { ko: "정서적 안정과 보안을 확보하는 게 과제예요.", en: "Securing emotional stability and security is your challenge." },
  leo: { ko: "진정한 자신감과 권위를 구축하는 게 과제예요.", en: "Building genuine confidence and authority is your challenge." },
  virgo: { ko: "완벽주의를 내려놓고 실용성을 추구하세요.", en: "Let go of perfectionism and pursue practicality." },
  libra: { ko: "관계와 파트너십에서 균형을 찾는 게 과제예요.", en: "Finding balance in relationships and partnerships is your challenge." },
  scorpio: { ko: "권력과 통제에 대한 두려움을 극복하세요.", en: "Overcome fear of power and control." },
  sagittarius: { ko: "신념을 현실화하고 책임을 지는 게 과제예요.", en: "Making beliefs real and taking responsibility is your challenge." },
  capricorn: { ko: "야망과 사회적 성취가 자연스러워요. 구조를 만들어요.", en: "Ambition and social achievement come naturally. Build structures." },
  aquarius: { ko: "개혁과 집단에서의 역할이 과제예요.", en: "Reform and your role in groups is your challenge." },
  pisces: { ko: "영성과 현실의 균형을 찾는 게 과제예요.", en: "Finding balance between spirituality and reality is your challenge." },
};

// 십신별 직업 적성
const sibsinCareerTraits: Record<string, { ko: string; en: string; fields: { ko: string[]; en: string[] } }> = {
  "비겁": {
    ko: "경쟁적인 환경에서 빛나요. 자영업, 스포츠, 영업이 어울려요.",
    en: "Shine in competitive environments. Self-employment, sports, sales suit you.",
    fields: { ko: ["자영업", "스포츠", "영업"], en: ["Self-employment", "Sports", "Sales"] }
  },
  "식상": {
    ko: "창의력과 표현이 중요한 분야가 어울려요.",
    en: "Fields valuing creativity and expression suit you.",
    fields: { ko: ["예술", "미디어", "교육"], en: ["Arts", "Media", "Education"] }
  },
  "재성": {
    ko: "재물을 다루고 관계를 관리하는 분야가 어울려요.",
    en: "Fields handling wealth and managing relationships suit you.",
    fields: { ko: ["금융", "무역", "부동산"], en: ["Finance", "Trade", "Real Estate"] }
  },
  "관성": {
    ko: "조직과 시스템 안에서 성장해요. 공직, 대기업이 어울려요.",
    en: "Grow in organizations and systems. Public service, corporations suit you.",
    fields: { ko: ["공무원", "대기업", "법률"], en: ["Public Service", "Corporations", "Law"] }
  },
  "인성": {
    ko: "지식과 보호가 중요한 분야가 어울려요.",
    en: "Fields valuing knowledge and protection suit you.",
    fields: { ko: ["연구", "의료", "상담"], en: ["Research", "Healthcare", "Counseling"] }
  },
};

// 대운 오행별 커리어 단계
const daeunCareerPhase: Record<string, { ko: string; en: string }> = {
  wood: { ko: "성장과 확장의 시기예요. 새로운 시작이 유리해요.", en: "Time for growth and expansion. New beginnings are favorable." },
  fire: { ko: "빛나고 인정받는 시기예요. 열정을 발휘하세요.", en: "Time to shine and be recognized. Show your passion." },
  earth: { ko: "안정과 기반을 다지는 시기예요. 꾸준히 쌓으세요.", en: "Time for stability and foundation. Build steadily." },
  metal: { ko: "성과를 거두고 정리하는 시기예요. 결단력이 필요해요.", en: "Time to harvest and organize. Decisiveness needed." },
  water: { ko: "지혜를 쌓고 준비하는 시기예요. 다음을 위해 배우세요.", en: "Time to gather wisdom and prepare. Learn for what's next." },
};

// 목성 하우스별 행운과 확장
const jupiterHouseBlessings: Record<number, { ko: string; en: string }> = {
  1: { ko: "자신감과 존재감에서 행운이 와요. 자기 자신을 믿으세요.", en: "Luck comes through confidence and presence. Believe in yourself." },
  2: { ko: "재물과 자원에서 확장이 일어나요. 투자에 운이 있어요.", en: "Expansion in wealth and resources. Lucky in investments." },
  3: { ko: "소통과 학습에서 기회가 와요. 네트워크를 넓히세요.", en: "Opportunities through communication and learning. Expand your network." },
  4: { ko: "가정과 부동산에서 행운이 있어요. 기반이 탄탄해요.", en: "Luck in home and real estate. Strong foundation." },
  5: { ko: "창작과 자기표현에서 빛나요. 취미가 일이 될 수 있어요.", en: "Shine in creation and self-expression. Hobbies can become work." },
  6: { ko: "일상 업무와 건강 분야에서 성장해요. 서비스업에 적합해요.", en: "Growth in daily work and health fields. Suited for service." },
  7: { ko: "파트너십과 협업에서 확장이 일어나요. 좋은 파트너를 만나요.", en: "Expansion through partnerships. Meet good partners." },
  8: { ko: "투자, 상속, 깊은 변화에서 행운이 와요.", en: "Luck in investments, inheritance, deep transformation." },
  9: { ko: "해외, 교육, 출판에서 기회가 와요. 넓게 생각하세요.", en: "Opportunities in foreign affairs, education, publishing. Think big." },
  10: { ko: "커리어와 사회적 지위에서 크게 성장해요. 승진 운이 좋아요.", en: "Great growth in career and social status. Good promotion luck." },
  11: { ko: "인맥과 미래 비전에서 확장이 일어나요. 그룹에서 성공해요.", en: "Expansion in connections and future vision. Success in groups." },
  12: { ko: "영적 성장과 봉사에서 행운이 와요. 숨은 후원자가 있어요.", en: "Luck in spiritual growth and service. Hidden supporters exist." },
};

// 토성-MC 애스펙트별 커리어 성숙도
const saturnMcAspects: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: "커리어에서 큰 책임을 맡아요. 천천히 정상에 올라요.", en: "Take great responsibility in career. Slowly climb to the top." },
  opposition: { ko: "커리어와 개인 사이 균형이 과제예요. 양쪽 다 챙기세요.", en: "Balancing career and personal life is a challenge. Care for both." },
  square: { ko: "커리어에서 도전이 있지만 성장해요. 인내가 보상받아요.", en: "Challenges in career but growth. Patience is rewarded." },
  trine: { ko: "커리어에서 안정적으로 성장해요. 구조를 잘 만들어요.", en: "Stable growth in career. Good at building structures." },
  sextile: { ko: "커리어 기회를 잘 잡아요. 노력이 결실을 맺어요.", en: "Seize career opportunities well. Efforts bear fruit." },
};

// 태양-토성 애스펙트별 권위와의 관계
const sunSaturnAspects: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: "진지하고 책임감 있어요. 늦게 피지만 오래 가요.", en: "Serious and responsible. Bloom late but last long." },
  opposition: { ko: "권위에 도전하는 타입이에요. 독자적인 길을 가세요.", en: "Challenge authority. Take your own path." },
  square: { ko: "상사와 갈등이 있을 수 있어요. 자기 사업이 맞을 수도.", en: "May conflict with superiors. Own business might suit you." },
  trine: { ko: "권위를 자연스럽게 얻어요. 조직에서 신뢰받아요.", en: "Naturally gain authority. Trusted in organizations." },
  sextile: { ko: "멘토를 잘 만나요. 경험자에게 배우면 빨라요.", en: "Meet good mentors. Learning from experienced people is faster." },
};

// 의사결정 스타일 (수성 별자리 기반)
const decisionStyles: Record<string, { ko: string; en: string }> = {
  aries: { ko: "빠르고 직관적으로 결정해요. 생각보다 행동이 먼저예요.", en: "Decide fast and intuitively. Action before thought." },
  taurus: { ko: "신중하고 천천히 결정해요. 충분한 시간이 필요해요.", en: "Decide carefully and slowly. Need enough time." },
  gemini: { ko: "여러 옵션을 비교해요. 정보 수집 후 결정해요.", en: "Compare multiple options. Decide after gathering info." },
  cancer: { ko: "직감과 감정을 따라 결정해요. 안전을 우선시해요.", en: "Decide following intuition and emotion. Safety first." },
  leo: { ko: "자신감 있게 결정해요. 큰 그림을 보고 선택해요.", en: "Decide confidently. Choose seeing the big picture." },
  virgo: { ko: "분석적으로 결정해요. 디테일까지 확인하고 결정해요.", en: "Decide analytically. Check details before deciding." },
  libra: { ko: "균형을 잡으며 결정해요. 다른 의견도 고려해요.", en: "Decide while balancing. Consider other opinions." },
  scorpio: { ko: "깊이 파고들어 결정해요. 본질을 파악한 후 선택해요.", en: "Dig deep to decide. Choose after understanding essence." },
  sagittarius: { ko: "낙관적으로 결정해요. 가능성을 보고 도전해요.", en: "Decide optimistically. Challenge seeing possibilities." },
  capricorn: { ko: "현실적으로 결정해요. 장기적 결과를 고려해요.", en: "Decide realistically. Consider long-term results." },
  aquarius: { ko: "독창적으로 결정해요. 전통보다 혁신을 선택해요.", en: "Decide originally. Choose innovation over tradition." },
  pisces: { ko: "직관과 영감으로 결정해요. 느낌이 중요해요.", en: "Decide by intuition and inspiration. Feeling matters." },
};

// 팀워크 스타일 (달 별자리 기반)
const teamworkStyles: Record<string, { ko: string; en: string }> = {
  aries: { ko: "주도적으로 팀을 이끌어요. 앞에서 끌어가는 타입이에요.", en: "Lead the team proactively. Pull from the front." },
  taurus: { ko: "안정적인 지원군이에요. 꾸준히 역할을 해내요.", en: "Stable support. Steadily fulfill your role." },
  gemini: { ko: "소통의 허브예요. 팀원들을 연결해요.", en: "Hub of communication. Connect team members." },
  cancer: { ko: "팀의 분위기 메이커예요. 정서적 지원을 해요.", en: "Team's mood maker. Provide emotional support." },
  leo: { ko: "팀의 에너지 센터예요. 동기부여를 잘해요.", en: "Team's energy center. Good at motivating." },
  virgo: { ko: "디테일을 챙기는 역할이에요. 실수를 줄여요.", en: "Handle details. Reduce mistakes." },
  libra: { ko: "팀의 조율자예요. 갈등을 중재해요.", en: "Team's mediator. Mediate conflicts." },
  scorpio: { ko: "깊은 집중력으로 핵심을 잡아요. 문제를 해결해요.", en: "Capture core with deep focus. Solve problems." },
  sagittarius: { ko: "팀에 비전을 제시해요. 넓은 시야를 줘요.", en: "Present vision to team. Give broad perspective." },
  capricorn: { ko: "팀의 기둥이에요. 책임감 있게 이끌어요.", en: "Team's pillar. Lead responsibly." },
  aquarius: { ko: "팀에 새로운 아이디어를 줘요. 혁신을 이끌어요.", en: "Give new ideas to team. Lead innovation." },
  pisces: { ko: "팀의 공감 능력자예요. 다른 시각을 제시해요.", en: "Team's empath. Present different perspectives." },
};

/**
 * 10하우스 별자리 추출
 */
function getHouse10Sign(astro: AstroData | undefined): string | null {
  if (!astro?.houses) return null;

  if (Array.isArray(astro.houses)) {
    const house10 = astro.houses.find(h => h.index === 10);
    return house10?.sign?.toLowerCase() || null;
  }
  return null;
}

/**
 * 토성 별자리 추출
 */
function getSaturnSign(astro: AstroData | undefined): string | null {
  return extractPlanetSign(astro, 'saturn');
}

/**
 * 현재 대운의 오행 추출
 */
function getCurrentDaeunElement(saju: SajuData | undefined): string | null {
  const daeun = saju?.unse?.daeun;
  if (!daeun || !Array.isArray(daeun)) return null;

  // 현재 나이에 해당하는 대운 찾기
  const birthYear = saju?.facts?.birthDate
    ? new Date(saju.facts.birthDate).getFullYear()
    : (saju?.birthDate ? new Date(saju.birthDate).getFullYear() : null);

  if (!birthYear) return null;

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;

  // 현재 대운 찾기
  const currentDaeun = daeun.find(d => {
    if (d.age !== undefined) {
      return currentAge >= d.age && currentAge < (d.age + 10);
    }
    return false;
  });

  if (!currentDaeun) return null;

  // 천간에서 오행 추출
  const stemElement: Record<string, string> = {
    "갑": "wood", "乙": "wood", "을": "wood",
    "병": "fire", "丙": "fire", "정": "fire", "丁": "fire",
    "무": "earth", "戊": "earth", "기": "earth", "己": "earth",
    "경": "metal", "庚": "metal", "신": "metal", "辛": "metal",
    "임": "water", "壬": "water", "계": "water", "癸": "water",
  };

  const stem = currentDaeun.heavenlyStem || currentDaeun.stem?.name;
  return stem ? (stemElement[stem] || null) : null;
}

/**
 * 십신 분포에서 가장 강한 십신 추출
 */
function getDominantSibsin(saju: SajuData | undefined): string | null {
  const sibsinDist = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  if (!sibsinDist || typeof sibsinDist !== 'object') return null;

  const entries = Object.entries(sibsinDist) as [string, number][];
  if (entries.length === 0) return null;

  const sorted = entries.sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] || null;
}

/**
 * 목성 하우스 추출
 */
function getJupiterHouse(astro: AstroData | undefined): number | null {
  if (!astro?.planets) return null;

  if (Array.isArray(astro.planets)) {
    const jupiter = astro.planets.find(p => p.name?.toLowerCase() === 'jupiter');
    return jupiter?.house || null;
  }
  return null;
}

/**
 * 애스펙트에서 행성 이름 추출 (문자열 또는 객체 모두 처리)
 */
function getAspectPlanetName(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') {
      return name.toLowerCase();
    }
  }
  return null;
}

/**
 * 토성-MC 애스펙트 찾기
 */
function getSaturnMcAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) return null;

  const saturnMc = astro.aspects.find(a => {
    const from = getAspectPlanetName(a.from);
    const to = getAspectPlanetName(a.to);
    if (!from || !to) return false;
    return (from === 'saturn' && to === 'mc') ||
           (from === 'mc' && to === 'saturn') ||
           (from === 'saturn' && to === 'midheaven') ||
           (from === 'midheaven' && to === 'saturn');
  });

  return saturnMc?.type?.toLowerCase() || null;
}

/**
 * 태양-토성 애스펙트 찾기
 */
function getSunSaturnAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) return null;

  const sunSaturn = astro.aspects.find(a => {
    const from = getAspectPlanetName(a.from);
    const to = getAspectPlanetName(a.to);
    if (!from || !to) return false;
    return (from === 'sun' && to === 'saturn') || (from === 'saturn' && to === 'sun');
  });

  return sunSaturn?.type?.toLowerCase() || null;
}

// ====== 새로 추가된 함수들 ======

// 9하우스 별자리별 해외운
const house9Patterns: Record<string, { ko: string; en: string }> = {
  aries: { ko: "모험적으로 해외를 개척해요. 새로운 시장을 열어요.", en: "Adventurously pioneer overseas. Open new markets." },
  taurus: { ko: "안정적인 해외 투자나 부동산이 유리해요.", en: "Stable overseas investments or real estate favored." },
  gemini: { ko: "해외와의 소통, 무역, 교육 분야가 어울려요.", en: "Communication, trade, education with foreign countries suit you." },
  cancer: { ko: "해외에서 가정을 꾸리거나 이민 가능성이 있어요.", en: "Possibility of making home abroad or immigration." },
  leo: { ko: "해외에서 주목받는 위치에 오를 수 있어요.", en: "Can rise to prominent positions overseas." },
  virgo: { ko: "해외 기술 연수나 전문성 활용이 좋아요.", en: "Foreign technical training or utilizing expertise good." },
  libra: { ko: "해외 파트너십이나 외교적 역할이 어울려요.", en: "Foreign partnerships or diplomatic roles suit you." },
  scorpio: { ko: "해외에서 깊이 있는 연구나 변혁적 일을 해요.", en: "Deep research or transformative work overseas." },
  sagittarius: { ko: "타고난 해외운! 글로벌하게 활동하기 좋아요.", en: "Natural overseas fortune! Great for global activities." },
  capricorn: { ko: "해외에서 장기적 커리어를 쌓을 수 있어요.", en: "Can build long-term career overseas." },
  aquarius: { ko: "해외 IT, 혁신 분야에서 두각을 나타내요.", en: "Excel in foreign IT, innovation fields." },
  pisces: { ko: "해외 예술, 영적 분야, 봉사에서 기회가 와요.", en: "Opportunities in foreign arts, spirituality, service." },
};

/**
 * 9하우스 별자리 + 역마살로 해외운 분석
 */
function getOverseasFortune(saju: SajuData | undefined, astro: AstroData | undefined, isKo: boolean): string | null {
  // 역마살 확인
  const sinsal = saju?.sinsal || saju?.advancedAnalysis?.sinsal;
   
  const luckyList = (sinsal)?.luckyList || [];
   
  const unluckyList = (sinsal)?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];
  const hasYeokma = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('역마');
  });

  // 9하우스 별자리
  let house9Sign: string | null = null;
  if (astro?.houses && Array.isArray(astro.houses)) {
    const house9 = astro.houses.find(h => h.index === 9);
    house9Sign = house9?.sign?.toLowerCase() || null;
  }

  // 목성 9하우스 확인
  const planets = astro?.planets;
  const jupiter = Array.isArray(planets) ? planets.find((p: { name?: string }) => p.name?.toLowerCase() === 'jupiter') : null;
   
  const jupiterIn9 = (jupiter)?.house === 9;

  let result = "";

  if (hasYeokma) {
    result += isKo ? "역마살이 있어 해외 이동이 활발해요. " : "You have travel energy (Yeokma) for active overseas movement. ";
  }

  if (jupiterIn9) {
    result += isKo ? "목성이 9하우스에서 해외에서 큰 행운이 기다려요! " : "Jupiter in 9th house brings great fortune overseas! ";
  }

  if (house9Sign && house9Patterns[house9Sign]) {
    result += selectLang(isKo, house9Patterns[house9Sign]);
  }

  return result || null;
}

/**
 * 재물운 스타일 분석 (2/8하우스 + 재성)
 */
function getWealthStyle(saju: SajuData | undefined, astro: AstroData | undefined, isKo: boolean): string | null {
  // 십신에서 재성 분석
  const sibsin = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  const jeongjae = (sibsin?.['정재'] || 0) as number;
  const pyeonjae = (sibsin?.['편재'] || 0) as number;

  let wealthType = "";
  if (jeongjae > pyeonjae && jeongjae >= 2) {
    wealthType = isKo
      ? "안정적인 월급과 저축으로 차곡차곡 쌓는 타입이에요."
      : "You build wealth steadily through stable salary and savings.";
  } else if (pyeonjae > jeongjae && pyeonjae >= 2) {
    wealthType = isKo
      ? "투자, 부업, 사업으로 다양한 수입원을 만드는 타입이에요."
      : "You create diverse income through investments, side jobs, business.";
  }

  // 2하우스 (소유) / 8하우스 (공유 자원) 확인
  const planets = astro?.planets;
  const planetsIn2 = Array.isArray(planets) ? planets.filter((p: { house?: number }) => p.house === 2) : [];
  const planetsIn8 = Array.isArray(planets) ? planets.filter((p: { house?: number }) => p.house === 8) : [];

  if (planetsIn2.length > 0) {
    const pNames = planetsIn2.map((p: { name?: string }) => p.name).join(', ');
    wealthType += isKo
      ? ` 2하우스에 ${pNames}이 있어 자기 힘으로 돈을 버는 능력이 있어요.`
      : ` With ${pNames} in 2nd house, you can earn money by yourself.`;
  }

  if (planetsIn8.length > 0) {
    wealthType += isKo
      ? " 8하우스 에너지로 투자, 상속, 파트너 자원 활용에 운이 있어요."
      : " 8th house energy favors investments, inheritance, partner resources.";
  }

  return wealthType || null;
}

/**
 * 성공 시기 분석 (대운 + 세운)
 */
function getSuccessTiming(saju: SajuData | undefined, isKo: boolean): string | null {
  const currentYear = new Date().getFullYear();
  const saeun = saju?.unse?.annual || [];

  // 용신에 해당하는 년도 찾기
   
  const yongsinData = saju?.advancedAnalysis?.yongsin;
  const yongsinList = yongsinData?.yongsinList || yongsinData?.list || [];
  const yongsinElements = (Array.isArray(yongsinList) ? yongsinList : []).map((y: { element?: string } | string) =>
    typeof y === 'string' ? y : y.element
  ).filter(Boolean);

  const goodYears: number[] = [];
  for (const yearData of saeun) {
    const year = yearData.year;
    if (!year || year < currentYear || year > currentYear + 5) continue;
    const element = yearData.stem?.element;
    if (yongsinElements.includes(element)) {
      goodYears.push(year);
    }
  }

  if (goodYears.length > 0) {
    return isKo
      ? `${goodYears[0]}년에 커리어 상승 기회가 있어요. 용신 운이 들어오는 해예요.`
      : `Career advancement opportunity in ${goodYears[0]}. Your favorable energy arrives.`;
  }

  // 기본 분석: 목/화 년도
  for (const yearData of saeun) {
    const year = yearData.year;
    if (!year || year < currentYear || year > currentYear + 3) continue;
    const element = yearData.stem?.element;
    if (element === 'fire' || element === '화') {
      return isKo
        ? `${year}년에 인정받고 빛날 기회가 와요.`
        : `Opportunity to shine and be recognized in ${year}.`;
    }
  }

  return null;
}

/**
 * 재물운 점수 계산 (개선된 버전)
 *
 * 점수 구성 (0-100):
 * - 기본 점수: 60 (누구나 기본적인 재물 잠재력이 있음)
 * - 사주 요소 (최대 +25):
 *   - 재성 강함 (정재+편재 3개 이상): +12
 *   - 재성 보통 (2개): +6
 *   - 식상생재 (식상+재성 조합): +8
 *   - 관성 있음 (안정적 직장운): +5
 * - 점성학 요소 (최대 +20):
 *   - 목성 2/8/10하우스: +10
 *   - 토성 2/10하우스: +6
 *   - 2하우스 행성 있음: +4
 * - 조합 보너스 (최대 +5):
 *   - 재성 + 목성 좋음: +5
 */
function calculateWealthScore(saju: SajuData | undefined, astro: AstroData | undefined): number {
  let score = 60; // 기본 점수 상향

  // === 사주 요소 ===
  const sibsin = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  const jeongjae = (sibsin?.['정재'] || 0) as number;
  const pyeonjae = (sibsin?.['편재'] || 0) as number;
  const siksang = ((sibsin?.['식신'] || 0) as number) + ((sibsin?.['상관'] || 0) as number);
  const gwanseong = ((sibsin?.['정관'] || 0) as number) + ((sibsin?.['편관'] || 0) as number);
  const jaeseong = jeongjae + pyeonjae;

  // 재성 강도
  if (jaeseong >= 3) score += 12;
  else if (jaeseong >= 2) score += 6;

  // 식상생재 (식상이 재성을 생함)
  if (siksang >= 1 && jaeseong >= 1) score += 8;

  // 관성 있음 (안정적 직장 = 안정적 수입)
  if (gwanseong >= 2) score += 5;

  // === 점성학 요소 ===
  const planets = astro?.planets;

  // 목성 위치
  const jupiter = Array.isArray(planets) ? planets.find((p: { name?: string }) => p.name?.toLowerCase() === 'jupiter') : null;
   
  const jupiterHouse = (jupiter)?.house;
  if (jupiterHouse === 2 || jupiterHouse === 8 || jupiterHouse === 10) {
    score += 10;
  } else if (jupiterHouse === 4 || jupiterHouse === 11) {
    score += 5;
  }

  // 토성 위치 (장기적 재물 축적)
  const saturn = Array.isArray(planets) ? planets.find((p: { name?: string }) => p.name?.toLowerCase() === 'saturn') : null;
   
  const saturnHouse = (saturn)?.house;
  if (saturnHouse === 10 || saturnHouse === 2) score += 6;

  // 2하우스에 행성 있음
  const planetsIn2 = Array.isArray(planets) ? planets.filter((p: { house?: number }) => p.house === 2) : [];
  if (planetsIn2.length > 0) score += 4;

  // === 조합 보너스 ===
  // 재성 + 목성 좋음
  if (jaeseong >= 2 && (jupiterHouse === 2 || jupiterHouse === 8 || jupiterHouse === 10)) {
    score += 5;
  }

  return Math.min(100, Math.max(60, score)); // 최소 60, 최대 100
}

export function getCareerAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): CareerAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) return null;

  const dmBase = dayMasterCareerTraits[dayMasterName] || dayMasterCareerTraits["갑"];

  // 오행 비율
  const sorted = extractFiveElementsSorted(saju);
  const strongestElement = sorted[0]?.[0];
  const secondElement = sorted[1]?.[0];

  // 태양/MC 별자리
  const sunSign = extractPlanetSign(astro, 'sun');
  const mcSign = astro?.mc?.sign?.toLowerCase();

  // 새로 추가된 요소들
  const house10Sign = getHouse10Sign(astro);
  const saturnSign = getSaturnSign(astro);
  const currentDaeunElement = getCurrentDaeunElement(saju);
  const dominantSibsin = getDominantSibsin(saju);
  const jupiterHouseNum = getJupiterHouse(astro);
  const saturnMcAspectType = getSaturnMcAspect(astro);
  const sunSaturnAspectType = getSunSaturnAspect(astro);

  // 조합해서 개인화된 텍스트 생성
  let workStyle = selectLang(isKo, dmBase.workStyle);
  const strengths: string[] = [];
  let idealEnvironment = "";
  const avoidEnvironment = selectLang(isKo, dmBase.avoid);
  const growthTip = selectLang(isKo, dmBase.growth);
  const suggestedFields: string[] = [];
  let publicImage: string | undefined;
  let careerPath: string | undefined;
  let currentPhase: string | undefined;
  let sibsinCareer: string | undefined;
  let leadershipStyle: string | undefined;
  let jupiterBlessings: string | undefined;
  let saturnMcAspect: string | undefined;
  let sunSaturnAspect: string | undefined;

  // 태양 별자리로 스타일 보강
  if (sunSign && zodiacCareerTraits[sunSign]) {
    const sunTrait = zodiacCareerTraits[sunSign];
    workStyle += " " + selectLang(isKo, sunTrait.style) + (isKo ? "에서 빛나요." : " shines.");
    strengths.push(selectLang(isKo, sunTrait.strength));
  }

  // MC(천정) 별자리로 커리어 방향 추가
  if (mcSign && zodiacCareerTraits[mcSign]) {
    const mcTrait = zodiacCareerTraits[mcSign];
    publicImage = isKo
      ? `사회에서 ${selectLang(isKo, mcTrait.style)}하는 모습으로 인식돼요.`
      : `Perceived socially as ${selectLang(isKo, mcTrait.style).toLowerCase()}.`;
    idealEnvironment = isKo
      ? `${selectLang(isKo, mcTrait.style)}을 할 수 있는 환경이 이상적이에요.`
      : `An environment where you can ${selectLang(isKo, mcTrait.style).toLowerCase()} is ideal.`;
    strengths.push(selectLang(isKo, mcTrait.strength));
  }

  // 강한 오행으로 추천 분야 추가
  if (strongestElement && elementCareerTraits[strongestElement]) {
    const elementTrait = elementCareerTraits[strongestElement];
    strengths.push(selectLang(isKo, elementTrait.strength));
    suggestedFields.push(...selectLang(isKo, elementTrait.field));
  }

  if (secondElement && elementCareerTraits[secondElement]) {
    const elementTrait = elementCareerTraits[secondElement];
    suggestedFields.push(...selectLang(isKo, elementTrait.field).slice(0, 1));
  }

  // ====== 새로 추가된 정교화 요소들 ======

  // 1. 10하우스 기반 사회적 역할과 리더십
  if (house10Sign && house10Patterns[house10Sign]) {
    const pattern = house10Patterns[house10Sign];
    workStyle += " " + selectLang(isKo, pattern);
    leadershipStyle = selectLang(isKo, pattern.leadership);
  }

  // 2. 토성 기반 커리어 과제
  if (saturnSign && saturnCareerPath[saturnSign]) {
    careerPath = selectLang(isKo, saturnCareerPath[saturnSign]);
  }

  // 3. 대운 기반 현재 커리어 단계
  if (currentDaeunElement && daeunCareerPhase[currentDaeunElement]) {
    currentPhase = selectLang(isKo, daeunCareerPhase[currentDaeunElement]);
  }

  // 4. 십신 기반 직업 적성
  if (dominantSibsin && sibsinCareerTraits[dominantSibsin]) {
    const sibsinInfo = sibsinCareerTraits[dominantSibsin];
    sibsinCareer = selectLang(isKo, sibsinInfo);
    suggestedFields.push(...selectLang(isKo, sibsinInfo.fields).slice(0, 2));
  }

  // 5. 목성 하우스 - 행운과 확장 분야
  if (jupiterHouseNum && jupiterHouseBlessings[jupiterHouseNum]) {
    jupiterBlessings = selectLang(isKo, jupiterHouseBlessings[jupiterHouseNum]);
  }

  // 6. 토성-MC 애스펙트 - 커리어 성숙도
  if (saturnMcAspectType && saturnMcAspects[saturnMcAspectType]) {
    saturnMcAspect = selectLang(isKo, saturnMcAspects[saturnMcAspectType]);
  }

  // 7. 태양-토성 애스펙트 - 권위와의 관계
  if (sunSaturnAspectType && sunSaturnAspects[sunSaturnAspectType]) {
    sunSaturnAspect = selectLang(isKo, sunSaturnAspects[sunSaturnAspectType]);
  }

  // ====== 새로 추가된 요소들 ======

  // 8. 해외운 (9하우스 + 역마)
  const overseasFortune = getOverseasFortune(saju, astro, isKo);

  // 9. 재물운 스타일 (2/8하우스 + 재성)
  const wealthStyle = getWealthStyle(saju, astro, isKo);

  // 10. 성공 시기
  const successTiming = getSuccessTiming(saju, isKo);

  // 11. 재물운 점수
  const wealthScore = calculateWealthScore(saju, astro);

  // 12. 의사결정 스타일 (수성 별자리 기반)
  const mercurySign = extractPlanetSign(astro, 'mercury');
  let decisionStyle: string | undefined;
  if (mercurySign && decisionStyles[mercurySign]) {
    decisionStyle = selectLang(isKo, decisionStyles[mercurySign]);
  }

  // 13. 팀워크 스타일 (달 별자리 기반)
  const moonSign = extractPlanetSign(astro, 'moon');
  let teamworkStyle: string | undefined;
  if (moonSign && teamworkStyles[moonSign]) {
    teamworkStyle = selectLang(isKo, teamworkStyles[moonSign]);
  }

  // 기본값 설정
  if (!idealEnvironment) {
    idealEnvironment = isKo
      ? "당신의 강점을 인정해주는 환경"
      : "An environment that recognizes your strengths";
  }

  return {
    workStyle,
    strengths: uniqueArray(strengths).slice(0, 4),
    idealEnvironment,
    avoidEnvironment,
    growthTip,
    suggestedFields: uniqueArray(suggestedFields).slice(0, 6),
    publicImage,
    careerPath,
    currentPhase,
    sibsinCareer,
    leadershipStyle,
    jupiterBlessings,
    saturnMcAspect,
    sunSaturnAspect,
    // 새로 추가된 필드들
    overseasFortune: overseasFortune || undefined,
    wealthStyle: wealthStyle || undefined,
    successTiming: successTiming || undefined,
    wealthScore,
    decisionStyle,
    teamworkStyle,
  };
}
