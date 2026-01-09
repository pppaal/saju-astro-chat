// 커리어 분석 - 일간 + 오행 + 별자리 + 10하우스 + 토성 + 대운 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import type { ZodiacSign, HouseNumber, SibsinCategory } from '../types/core';
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

// Centralized data imports
import {
  HOUSE10_PATTERNS,
  SATURN_CAREER_PATH,
  SIBSIN_CAREER_TRAITS,
  JUPITER_HOUSE_BLESSINGS,
  SATURN_MC_ASPECTS,
  SUN_SATURN_ASPECTS,
  DECISION_STYLES,
  TEAMWORK_STYLES
} from '../data/career';

// Centralized utility imports
import { getPlanetSign } from '../utils/planets';
import { findAspect } from '../utils/aspects';
import { getHouseSign, getPlanetHouse, getPlanetsInHouse } from '../utils/houses';
import { calculateWealthScore } from '../scoring';

// Sibsin category mapping
const SIBSIN_TO_CATEGORY: Record<string, SibsinCategory> = {
  '비견': '비겁', '겁재': '비겁',
  '식신': '식상', '상관': '식상',
  '정재': '재성', '편재': '재성',
  '정관': '관성', '편관': '관성',
  '정인': '인성', '편인': '인성',
  '비겁': '비겁', '식상': '식상', '재성': '재성', '관성': '관성', '인성': '인성',
};

function getSibsinCategory(sibsin: string): SibsinCategory | null {
  return SIBSIN_TO_CATEGORY[sibsin] || null;
}

// 대운 오행별 커리어 단계
const DAEUN_CAREER_PHASE: Record<string, { ko: string; en: string }> = {
  wood: { ko: "성장과 확장의 시기예요. 새로운 시작이 유리해요.", en: "Time for growth and expansion. New beginnings are favorable." },
  fire: { ko: "빛나고 인정받는 시기예요. 열정을 발휘하세요.", en: "Time to shine and be recognized. Show your passion." },
  earth: { ko: "안정과 기반을 다지는 시기예요. 꾸준히 쌓으세요.", en: "Time for stability and foundation. Build steadily." },
  metal: { ko: "성과를 거두고 정리하는 시기예요. 결단력이 필요해요.", en: "Time to harvest and organize. Decisiveness needed." },
  water: { ko: "지혜를 쌓고 준비하는 시기예요. 다음을 위해 배우세요.", en: "Time to gather wisdom and prepare. Learn for what's next." },
};

// 9하우스 별자리별 해외운
const HOUSE9_PATTERNS: Record<ZodiacSign, { ko: string; en: string }> = {
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
  overseasFortune?: string;   // 해외운 (9하우스 + 역마)
  wealthStyle?: string;       // 재물운 스타일 (2/8하우스 + 재성)
  successTiming?: string;     // 성공 시기 (목성/토성 리턴)
  wealthScore?: number;       // 재물운 점수 (0-100)
  mcSign?: string;            // MC 별자리
  decisionStyle?: string;     // 의사결정 스타일
  teamworkStyle?: string;     // 팀워크 스타일
}

/**
 * 현재 대운의 오행 추출
 */
function getCurrentDaeunElement(saju: SajuData | undefined): string | null {
  const daeun = saju?.unse?.daeun;
  if (!daeun || !Array.isArray(daeun)) return null;

  const birthYear = saju?.facts?.birthDate
    ? new Date(saju.facts.birthDate).getFullYear()
    : (saju?.birthDate ? new Date(saju.birthDate).getFullYear() : null);

  if (!birthYear) return null;

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;

  const currentDaeun = daeun.find(d => {
    if (d.age !== undefined) {
      return currentAge >= d.age && currentAge < (d.age + 10);
    }
    return false;
  });

  if (!currentDaeun) return null;

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
 * 십신 분포에서 가장 강한 십신 추출 및 카테고리화
 */
function getDominantSibsinCategory(saju: SajuData | undefined): SibsinCategory | null {
  const sibsinDist = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  if (!sibsinDist || typeof sibsinDist !== 'object') return null;

  const entries = Object.entries(sibsinDist) as [string, number][];
  if (entries.length === 0) return null;

  const sorted = entries.sort(([, a], [, b]) => b - a);
  const topSibsin = sorted[0]?.[0];

  return topSibsin ? getSibsinCategory(topSibsin) : null;
}

/**
 * 9하우스 별자리 + 역마살로 해외운 분석
 */
function getOverseasFortune(saju: SajuData | undefined, astro: AstroData | undefined, isKo: boolean): string | null {
  const sinsal = saju?.sinsal || saju?.advancedAnalysis?.sinsal;
  const luckyList = (sinsal as { luckyList?: Array<{ name?: string } | string> } | undefined)?.luckyList || [];
  const unluckyList = (sinsal as { unluckyList?: Array<{ name?: string } | string> } | undefined)?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];

  const hasYeokma = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('역마');
  });

  const house9Sign = getHouseSign(astro, 9);
  const jupiterHouse = getPlanetHouse(astro, 'jupiter');
  const jupiterIn9 = jupiterHouse === 9;

  let result = "";

  if (hasYeokma) {
    result += isKo ? "역마살이 있어 해외 이동이 활발해요. " : "You have travel energy (Yeokma) for active overseas movement. ";
  }

  if (jupiterIn9) {
    result += isKo ? "목성이 9하우스에서 해외에서 큰 행운이 기다려요! " : "Jupiter in 9th house brings great fortune overseas! ";
  }

  if (house9Sign && HOUSE9_PATTERNS[house9Sign]) {
    result += selectLang(isKo, HOUSE9_PATTERNS[house9Sign]);
  }

  return result || null;
}

/**
 * 재물운 스타일 분석 (2/8하우스 + 재성)
 */
function getWealthStyle(saju: SajuData | undefined, astro: AstroData | undefined, isKo: boolean): string | null {
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

  const planetsIn2 = getPlanetsInHouse(astro, 2);
  const planetsIn8 = getPlanetsInHouse(astro, 8);

  if (planetsIn2.length > 0) {
    const pNames = planetsIn2.join(', ');
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
 * 성공 시기 분석 (대운 + 세운) - ±10년 확장
 */
function getSuccessTiming(saju: SajuData | undefined, isKo: boolean): string | null {
  const currentYear = new Date().getFullYear();
  const saeun = saju?.unse?.annual || [];

  const yongsinData = saju?.advancedAnalysis?.yongsin as {
    element?: string;
    yongsinList?: Array<{ element?: string } | string>;
    list?: Array<{ element?: string } | string>;
  } | undefined;
  const yongsinList = yongsinData?.yongsinList || yongsinData?.list || [];
  const yongsinElements = (Array.isArray(yongsinList) ? yongsinList : []).map((y: { element?: string } | string) =>
    typeof y === 'string' ? y : y.element
  ).filter(Boolean);

  const goodYears: number[] = [];
  for (const yearData of saeun) {
    const year = yearData.year;
    if (!year || year < currentYear || year > currentYear + 10) continue;
    const element = yearData.stem?.element;
    if (yongsinElements.includes(element)) {
      goodYears.push(year);
    }
  }

  if (goodYears.length > 0) {
    const yearsStr = goodYears.slice(0, 3).join(', ');
    return isKo
      ? `${yearsStr}년에 커리어 상승 기회가 있어요. 용신 운이 들어오는 해예요.`
      : `Career advancement opportunity in ${yearsStr}. Your favorable energy arrives.`;
  }

  // 기본 분석: 목/화 년도
  const fireYears: number[] = [];
  for (const yearData of saeun) {
    const year = yearData.year;
    if (!year || year < currentYear || year > currentYear + 10) continue;
    const element = yearData.stem?.element;
    if (element === 'fire' || element === '화') {
      fireYears.push(year);
    }
  }

  if (fireYears.length > 0) {
    const yearsStr = fireYears.slice(0, 3).join(', ');
    return isKo
      ? `${yearsStr}년에 인정받고 빛날 기회가 와요.`
      : `Opportunity to shine and be recognized in ${yearsStr}.`;
  }

  return null;
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
  const sunSign = extractPlanetSign(astro, 'sun') as ZodiacSign | null;
  const mcSign = astro?.mc?.sign?.toLowerCase() as ZodiacSign | null;

  // 중앙화된 유틸리티 사용
  const house10Sign = getHouseSign(astro, 10);
  const saturnSign = getPlanetSign(astro, 'saturn') as ZodiacSign | null;
  const currentDaeunElement = getCurrentDaeunElement(saju);
  const dominantSibsin = getDominantSibsinCategory(saju);
  const jupiterHouseNum = getPlanetHouse(astro, 'jupiter');

  // 애스펙트 분석 (중앙화된 유틸리티)
  const saturnMcAspectData = findAspect(astro, 'saturn', 'mc' as any);
  const sunSaturnAspectData = findAspect(astro, 'sun', 'saturn');

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

  // ====== 중앙화된 데이터 사용 ======

  // 1. 10하우스 기반 사회적 역할과 리더십
  if (house10Sign && HOUSE10_PATTERNS[house10Sign]) {
    const pattern = HOUSE10_PATTERNS[house10Sign];
    workStyle += " " + selectLang(isKo, pattern.role);
    leadershipStyle = selectLang(isKo, pattern.leadership);
  }

  // 2. 토성 기반 커리어 과제
  if (saturnSign && SATURN_CAREER_PATH[saturnSign]) {
    careerPath = selectLang(isKo, SATURN_CAREER_PATH[saturnSign]);
  }

  // 3. 대운 기반 현재 커리어 단계
  if (currentDaeunElement && DAEUN_CAREER_PHASE[currentDaeunElement]) {
    currentPhase = selectLang(isKo, DAEUN_CAREER_PHASE[currentDaeunElement]);
  }

  // 4. 십신 기반 직업 적성
  if (dominantSibsin && SIBSIN_CAREER_TRAITS[dominantSibsin]) {
    const sibsinInfo = SIBSIN_CAREER_TRAITS[dominantSibsin];
    sibsinCareer = selectLang(isKo, sibsinInfo.description);
    suggestedFields.push(...selectLang(isKo, sibsinInfo.fields).slice(0, 2));
  }

  // 5. 목성 하우스 - 행운과 확장 분야
  if (jupiterHouseNum && JUPITER_HOUSE_BLESSINGS[jupiterHouseNum]) {
    jupiterBlessings = selectLang(isKo, JUPITER_HOUSE_BLESSINGS[jupiterHouseNum]);
  }

  // 6. 토성-MC 애스펙트 - 커리어 성숙도
  if (saturnMcAspectData && SATURN_MC_ASPECTS[saturnMcAspectData.type]) {
    saturnMcAspect = selectLang(isKo, SATURN_MC_ASPECTS[saturnMcAspectData.type]);
  }

  // 7. 태양-토성 애스펙트 - 권위와의 관계
  if (sunSaturnAspectData && SUN_SATURN_ASPECTS[sunSaturnAspectData.type]) {
    sunSaturnAspect = selectLang(isKo, SUN_SATURN_ASPECTS[sunSaturnAspectData.type]);
  }

  // ====== 추가 분석 ======

  // 8. 해외운 (9하우스 + 역마)
  const overseasFortune = getOverseasFortune(saju, astro, isKo);

  // 9. 재물운 스타일 (2/8하우스 + 재성)
  const wealthStyle = getWealthStyle(saju, astro, isKo);

  // 10. 성공 시기 (±10년 확장)
  const successTiming = getSuccessTiming(saju, isKo);

  // 11. 재물운 점수 (centralized calculator 사용)
  const wealthResult = calculateWealthScore(saju, astro);
  const wealthScore = wealthResult.score;

  // 12. 의사결정 스타일 (수성 별자리 기반)
  const mercurySign = extractPlanetSign(astro, 'mercury') as ZodiacSign | null;
  let decisionStyle: string | undefined;
  if (mercurySign && DECISION_STYLES[mercurySign]) {
    decisionStyle = selectLang(isKo, DECISION_STYLES[mercurySign]);
  }

  // 13. 팀워크 스타일 (달 별자리 기반)
  const moonSign = extractPlanetSign(astro, 'moon') as ZodiacSign | null;
  let teamworkStyle: string | undefined;
  if (moonSign && TEAMWORK_STYLES[moonSign]) {
    teamworkStyle = selectLang(isKo, TEAMWORK_STYLES[moonSign]);
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
    overseasFortune: overseasFortune || undefined,
    wealthStyle: wealthStyle || undefined,
    successTiming: successTiming || undefined,
    wealthScore,
    decisionStyle,
    teamworkStyle,
  };
}
