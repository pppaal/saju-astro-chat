// 사랑 스타일 분석 - 일간 + 오행 + 별자리 + 7하우스 + 애스펙트 + 십신 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import type { ZodiacSign, SibsinCategory, HouseNumber } from '../types/core';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang
} from './utils';
import { dayMasterLoveTraits } from '../data/dayMasterTraits';
import { zodiacLoveTraits } from '../data/zodiacTraits';
import {
  elementLoveTraits,
  elementCompatibility,
  elementNames,
  elementWeaknessAdvice
} from '../data/elementAnalysisTraits';

// Centralized data imports
import {
  HOUSE7_PATTERNS,
  VENUS_HOUSE_PATTERNS,
  MARS_LOVE_STYLE,
  VENUS_MARS_ASPECTS,
  MOON_VENUS_ASPECTS,
  ATTACHMENT_STYLES,
  LOVE_LANGUAGES,
  CONFLICT_STYLES,
  SIBSIN_LOVE_TRAITS,
  JUNO_PARTNER_TRAITS
} from '../data/love';

// Centralized utility imports
import { getPlanetSign, getLilithData, getVertexData } from '../utils/planets';
import { findAspect } from '../utils/aspects';
import { getHouseSign, getPlanetHouse } from '../utils/houses';
import { calculateCharmScore } from '../scoring';

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

// Vertex 하우스별 운명적 만남 장소
const VERTEX_MEETING_PLACES: Record<HouseNumber, { ko: string; en: string }> = {
  1: { ko: "혼자만의 시간, 자기개발 활동에서 운명적 만남이 와요.", en: "Fated meeting during alone time, self-improvement." },
  2: { ko: "쇼핑, 재테크, 재능 활용 중에 운명적 만남이 와요.", en: "Fated meeting while shopping, investing, using talents." },
  3: { ko: "동네, 학교, SNS에서 운명적 만남이 와요.", en: "Fated meeting in neighborhood, school, SNS." },
  4: { ko: "집, 가족 모임, 고향에서 운명적 만남이 와요.", en: "Fated meeting at home, family gatherings, hometown." },
  5: { ko: "연애 앱, 파티, 취미 활동에서 운명적 만남이 와요!", en: "Fated meeting through dating apps, parties, hobbies!" },
  6: { ko: "직장, 헬스장, 봉사활동에서 운명적 만남이 와요.", en: "Fated meeting at work, gym, volunteer activities." },
  7: { ko: "소개팅, 비즈니스 미팅에서 운명적 만남이 와요.", en: "Fated meeting through blind dates, business meetings." },
  8: { ko: "위기 상황, 깊은 대화 중에 운명적 만남이 와요.", en: "Fated meeting during crisis, deep conversations." },
  9: { ko: "여행, 유학, 철학/종교 모임에서 운명적 만남이 와요.", en: "Fated meeting through travel, study abroad, spiritual groups." },
  10: { ko: "직장, 공식 행사, 업계 모임에서 운명적 만남이 와요.", en: "Fated meeting at work, official events, industry gatherings." },
  11: { ko: "친구 모임, 온라인 커뮤니티에서 운명적 만남이 와요.", en: "Fated meeting at friend gatherings, online communities." },
  12: { ko: "병원, 명상센터, 혼자 조용할 때 운명적 만남이 와요.", en: "Fated meeting at hospitals, meditation centers, quiet moments." },
};

// Lilith 별자리별 숨겨진 욕망
const LILITH_DESIRES: Record<ZodiacSign, { ko: string; en: string }> = {
  aries: { ko: "관계에서 주도권을 갖고 싶은 숨겨진 욕구가 있어요.", en: "Hidden desire to lead in relationships." },
  taurus: { ko: "관능적 즐거움에 대한 깊은 갈망이 있어요.", en: "Deep longing for sensual pleasures." },
  gemini: { ko: "비밀스러운 대화, 금기된 지식에 끌려요.", en: "Attracted to secret conversations, forbidden knowledge." },
  cancer: { ko: "무조건적으로 사랑받고 싶은 갈망이 있어요.", en: "Longing to be loved unconditionally." },
  leo: { ko: "특별한 존재로 숭배받고 싶은 욕구가 있어요.", en: "Desire to be worshipped as special." },
  virgo: { ko: "완벽한 관계에 대한 집착이 있어요.", en: "Obsession with perfect relationships." },
  libra: { ko: "관계 속에서 자아를 잃을까 두려워해요.", en: "Fear of losing yourself in relationships." },
  scorpio: { ko: "연인에 대한 깊은 통제 욕구가 숨어 있어요.", en: "Hidden desire for deep control over partners." },
  sagittarius: { ko: "책임 없이 자유롭게 사랑하고 싶은 마음이 있어요.", en: "Want to love freely without responsibility." },
  capricorn: { ko: "지위 있는 사람에게 끌리는 경향이 있어요.", en: "Tendency to be attracted to people of status." },
  aquarius: { ko: "색다르고 독특한 관계를 갈망해요.", en: "Crave unique and unconventional relationships." },
  pisces: { ko: "비현실적인 이상적 사랑을 꿈꿔요.", en: "Dream of unrealistic ideal love." },
};

interface LoveAnalysis {
  style: string;
  attract: string;
  danger: string;
  ideal: string;
  advice: string;
  compatibility: string[];
  lovePattern?: string;      // 7하우스 기반 파트너 패턴
  emotionalNeeds?: string;   // 달 기반 감정적 니즈
  venusStyle?: string;       // 금성 기반 사랑 표현
  sibsinLove?: string;       // 십신 기반 연애 에너지
  venusHouse?: string;       // 금성 하우스 - 사랑을 찾는 장소
  marsStyle?: string;        // 화성 - 열정 표현 방식
  moonVenusAspect?: string;  // 달-금성 애스펙트 - 감정과 사랑의 조화
  // 새로 추가
  junoPartner?: string;      // 주노 - 결혼 이상형
  vertexMeeting?: string;    // 버텍스 - 운명적 만남 장소
  lilithDesire?: string;     // 릴리스 - 숨겨진 욕망
  romanceTiming?: string;    // 도화/세운 기반 연애 타이밍
  charmScore?: number;       // 연애 매력도 (0-100)
  attachmentStyle?: string;  // 애착 스타일
  loveLanguage?: string;     // 사랑의 언어
  conflictStyle?: string;    // 갈등 해결 스타일
}

/**
 * 십신 분포에서 가장 강한 십신 추출
 */
function getDominantSibsin(saju: SajuData | undefined): SibsinCategory | null {
  const sibsinDist = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  if (!sibsinDist || typeof sibsinDist !== 'object') {return null;}

  const entries = Object.entries(sibsinDist) as [string, number][];
  if (entries.length === 0) {return null;}

  const sorted = entries.sort(([, a], [, b]) => b - a);
  const topSibsin = sorted[0]?.[0];

  return topSibsin ? getSibsinCategory(topSibsin) : null;
}

/**
 * Juno 소행성 별자리 추출
 */
function getJunoSign(astro: AstroData | undefined): ZodiacSign | null {
  const juno = astro?.asteroids?.juno;
  const sign = juno?.sign?.toLowerCase();
  if (!sign) {return null;}

  const validSigns: ZodiacSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  return validSigns.includes(sign as ZodiacSign) ? sign as ZodiacSign : null;
}

/**
 * Vertex 하우스 추출
 */
function getVertexHouse(astro: AstroData | undefined): HouseNumber | null {
  const vertex = getVertexData(astro);
  const house = vertex?.house;
  if (typeof house === 'number' && house >= 1 && house <= 12) {
    return house as HouseNumber;
  }
  return null;
}

/**
 * Lilith 별자리 추출
 */
function getLilithSign(astro: AstroData | undefined): ZodiacSign | null {
  const lilith = getLilithData(astro);
  const sign = lilith?.sign?.toLowerCase();
  if (!sign) {return null;}

  const validSigns: ZodiacSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  return validSigns.includes(sign as ZodiacSign) ? sign as ZodiacSign : null;
}

/**
 * 도화살 확인 및 연애 타이밍 분석 (±10년 확장)
 */
function getRomanceTiming(saju: SajuData | undefined, isKo: boolean): string | null {
  // 도화살 확인
  const sinsal = saju?.sinsal || saju?.advancedAnalysis?.sinsal;
  const luckyList = (sinsal as { luckyList?: Array<{ name?: string } | string> } | undefined)?.luckyList || [];
  const unluckyList = (sinsal as { unluckyList?: Array<{ name?: string } | string> } | undefined)?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];

  const hasDohwa = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('도화');
  });
  const hasHongyeom = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('홍염');
  });

  // 세운에서 좋은 해 찾기 (±10년 확장)
  const saeun = saju?.unse?.annual || [];
  const currentYear = new Date().getFullYear();
  const goodYears: number[] = [];

  for (const yearData of saeun) {
    const year = yearData.year;
    if (!year || year < currentYear || year > currentYear + 10) {continue;}
    const element = yearData.stem?.element;
    if (element === 'fire' || element === 'wood' || element === '화' || element === '목') {
      goodYears.push(year);
    }
  }

  if (hasDohwa && goodYears.length > 0) {
    const yearsStr = goodYears.slice(0, 3).join(', ');
    return isKo
      ? `도화살이 있어 매력이 넘쳐요! ${yearsStr}년에 연애운이 특히 좋아요.`
      : `You have romantic charm (Dohwa)! ${yearsStr} look especially good for love.`;
  }
  if (hasHongyeom) {
    return isKo
      ? "홍염살이 있어 열정적인 사랑을 하지만, 충동적인 결정은 피하세요."
      : "You have passionate love energy (Hongyeom), but avoid impulsive decisions.";
  }
  if (goodYears.length > 0) {
    const yearsStr = goodYears.slice(0, 3).join(', ');
    return isKo
      ? `${yearsStr}년이 연애 시작하기 좋은 시기예요.`
      : `${yearsStr} ${goodYears.length > 1 ? 'are' : 'is a'} good year${goodYears.length > 1 ? 's' : ''} to start a romance.`;
  }

  return null;
}

export function getLoveAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) {return null;}

  const dmBase = dayMasterLoveTraits[dayMasterName] || dayMasterLoveTraits["갑"];

  // 오행 비율
  const sorted = extractFiveElementsSorted(saju);
  const strongestElement = sorted[0]?.[0];
  const weakestElement = sorted[sorted.length - 1]?.[0];

  // 태양/달/금성 별자리
  const sunSign = extractPlanetSign(astro, 'sun') as ZodiacSign | null;
  const moonSign = extractPlanetSign(astro, 'moon') as ZodiacSign | null;
  const venusSign = extractPlanetSign(astro, 'venus') as ZodiacSign | null;
  const marsSign = getPlanetSign(astro, 'mars') as ZodiacSign | null;

  // 새로 추가된 요소들 - centralized utilities 사용
  const house7Sign = getHouseSign(astro, 7);
  const venusMarsAspect = findAspect(astro, 'venus', 'mars');
  const dominantSibsin = getDominantSibsin(saju);
  const venusHouseNum = getPlanetHouse(astro, 'venus');
  const moonVenusAspectData = findAspect(astro, 'moon', 'venus');

  // 조합해서 개인화된 텍스트 생성
  let style = selectLang(isKo, dmBase.core);
  let attract = "";
  const danger = selectLang(isKo, dmBase.danger);
  const ideal = selectLang(isKo, dmBase.ideal);
  let advice = "";
  let lovePattern: string | undefined;
  let emotionalNeeds: string | undefined;
  let venusStyle: string | undefined;
  let sibsinLove: string | undefined;
  let venusHouse: string | undefined;
  let marsStyle: string | undefined;
  let moonVenusAspect: string | undefined;

  // 태양 별자리로 연애 스타일 보강
  if (sunSign && zodiacLoveTraits[sunSign]) {
    const sunTrait = zodiacLoveTraits[sunSign];
    style += " " + selectLang(isKo, sunTrait.style);
    attract = selectLang(isKo, sunTrait.attract);
  }

  // 달 별자리로 감정적 니즈 추가
  if (moonSign && zodiacLoveTraits[moonSign]) {
    const moonTrait = zodiacLoveTraits[moonSign];
    emotionalNeeds = isKo
      ? `내면에서는 ${selectLang(isKo, moonTrait.style).toLowerCase()}을 원해요.`
      : `Internally, you want ${selectLang(isKo, moonTrait.style).toLowerCase()}.`;
    style += " " + emotionalNeeds;
  }

  // 금성 별자리로 끌리는 타입 보강
  if (venusSign && zodiacLoveTraits[venusSign]) {
    const venusTrait = zodiacLoveTraits[venusSign];
    venusStyle = selectLang(isKo, venusTrait.style);
    if (attract) {
      attract += isKo
        ? ` 특히 ${selectLang(isKo, venusTrait.attract)}에게 끌려요.`
        : ` Especially attracted to ${selectLang(isKo, venusTrait.attract).toLowerCase()}.`;
    } else {
      attract = selectLang(isKo, venusTrait.attract);
    }
  }

  // 가장 강한 오행으로 연애 에너지 추가
  if (strongestElement && elementLoveTraits[strongestElement]) {
    style += " " + selectLang(isKo, elementLoveTraits[strongestElement]);
  }

  // ====== 새로 추가된 정교화 요소들 (centralized data 사용) ======

  // 1. 7하우스 기반 파트너 패턴
  if (house7Sign && HOUSE7_PATTERNS[house7Sign]) {
    lovePattern = selectLang(isKo, HOUSE7_PATTERNS[house7Sign]);
  }

  // 2. 금성-화성 애스펙트
  if (venusMarsAspect && VENUS_MARS_ASPECTS[venusMarsAspect.type]) {
    const aspectInfo = selectLang(isKo, VENUS_MARS_ASPECTS[venusMarsAspect.type]);
    style += " " + aspectInfo;
  }

  // 3. 십신 기반 연애 에너지
  if (dominantSibsin && SIBSIN_LOVE_TRAITS[dominantSibsin]) {
    sibsinLove = selectLang(isKo, SIBSIN_LOVE_TRAITS[dominantSibsin]);
  }

  // 4. 금성 하우스 - 인연을 만나는 장소
  if (venusHouseNum && VENUS_HOUSE_PATTERNS[venusHouseNum]) {
    venusHouse = selectLang(isKo, VENUS_HOUSE_PATTERNS[venusHouseNum]);
  }

  // 5. 화성 - 열정 표현 방식
  if (marsSign && MARS_LOVE_STYLE[marsSign]) {
    marsStyle = selectLang(isKo, MARS_LOVE_STYLE[marsSign]);
  }

  // 6. 달-금성 애스펙트 - 감정과 사랑의 조화
  if (moonVenusAspectData && MOON_VENUS_ASPECTS[moonVenusAspectData.type]) {
    moonVenusAspect = selectLang(isKo, MOON_VENUS_ASPECTS[moonVenusAspectData.type]);
  }

  // ====== 새로 추가된 요소들 (Juno, Vertex, Lilith, 타이밍) ======

  // 7. Juno - 결혼 이상형
  const junoSign = getJunoSign(astro);
  let junoPartner: string | undefined;
  if (junoSign && JUNO_PARTNER_TRAITS[junoSign]) {
    junoPartner = selectLang(isKo, JUNO_PARTNER_TRAITS[junoSign]);
  }

  // 8. Vertex - 운명적 만남 장소
  const vertexHouseNum = getVertexHouse(astro);
  let vertexMeeting: string | undefined;
  if (vertexHouseNum && VERTEX_MEETING_PLACES[vertexHouseNum]) {
    vertexMeeting = selectLang(isKo, VERTEX_MEETING_PLACES[vertexHouseNum]);
  }

  // 9. Lilith - 숨겨진 욕망
  const lilithSign = getLilithSign(astro);
  let lilithDesire: string | undefined;
  if (lilithSign && LILITH_DESIRES[lilithSign]) {
    lilithDesire = selectLang(isKo, LILITH_DESIRES[lilithSign]);
  }

  // 10. 연애 타이밍 (±10년 확장)
  const romanceTiming = getRomanceTiming(saju, isKo);

  // 11. 연애 매력도 점수 (centralized calculator 사용)
  const charmResult = calculateCharmScore(saju, astro);
  const charmScore = charmResult.score;

  // 12. 애착 스타일 분석 (달 별자리 + 4하우스 기반)
  let attachmentStyle: string | undefined;
  const waterSigns: ZodiacSign[] = ['cancer', 'scorpio', 'pisces'];
  const fireSigns: ZodiacSign[] = ['aries', 'leo', 'sagittarius'];
  const airSigns: ZodiacSign[] = ['gemini', 'libra', 'aquarius'];

  if (moonSign) {
    if (waterSigns.includes(moonSign)) {
      attachmentStyle = selectLang(isKo, ATTACHMENT_STYLES.anxious);
    } else if (fireSigns.includes(moonSign)) {
      attachmentStyle = selectLang(isKo, ATTACHMENT_STYLES.secure);
    } else if (airSigns.includes(moonSign)) {
      attachmentStyle = selectLang(isKo, ATTACHMENT_STYLES.avoidant);
    } else {
      attachmentStyle = selectLang(isKo, ATTACHMENT_STYLES.secure);
    }
  }

  // 13. 사랑의 언어 분석 (금성 + 화성 조합)
  let loveLanguage: string | undefined;
  if (venusSign && marsSign) {
    if (waterSigns.includes(venusSign)) {
      loveLanguage = selectLang(isKo, LOVE_LANGUAGES.touch);
    } else if (fireSigns.includes(venusSign)) {
      loveLanguage = selectLang(isKo, LOVE_LANGUAGES.time);
    } else if (airSigns.includes(venusSign)) {
      loveLanguage = selectLang(isKo, LOVE_LANGUAGES.words);
    } else {
      if (marsSign === 'virgo' || marsSign === 'capricorn') {
        loveLanguage = selectLang(isKo, LOVE_LANGUAGES.service);
      } else {
        loveLanguage = selectLang(isKo, LOVE_LANGUAGES.gifts);
      }
    }
  }

  // 14. 갈등 해결 스타일 (화성 별자리 기반)
  let conflictStyle: string | undefined;
  if (marsSign) {
    if (fireSigns.includes(marsSign)) {
      conflictStyle = selectLang(isKo, CONFLICT_STYLES.direct);
    } else if (waterSigns.includes(marsSign)) {
      conflictStyle = selectLang(isKo, CONFLICT_STYLES.withdrawal);
    } else if (airSigns.includes(marsSign)) {
      conflictStyle = selectLang(isKo, CONFLICT_STYLES.diplomatic);
    } else {
      conflictStyle = selectLang(isKo, CONFLICT_STYLES.passionate);
    }
  }

  // 가장 약한 오행으로 주의점 추가
  if (weakestElement && elementWeaknessAdvice[weakestElement]) {
    advice = selectLang(isKo, elementWeaknessAdvice[weakestElement]);
  }

  // 기본 조언 추가
  if (!advice) {
    advice = isKo
      ? "있는 그대로의 모습으로 사랑하세요. 완벽할 필요 없어요."
      : "Love as you are. You don't need to be perfect.";
  }

  // 기본 끌리는 타입
  if (!attract) {
    attract = isKo ? "진심을 알아주는 사람에게 끌려요." : "You're attracted to those who recognize sincerity.";
  }

  // 궁합 좋은 타입 (오행 상생 기반)
  const compatibility: string[] = [];
  if (strongestElement && elementCompatibility[strongestElement]) {
    const compatElements = elementCompatibility[strongestElement];
    compatElements.forEach(el => {
      if (elementNames[el]) {
        compatibility.push(selectLang(isKo, elementNames[el]));
      }
    });
  }

  return {
    style,
    attract,
    danger,
    ideal,
    advice,
    compatibility,
    lovePattern,
    emotionalNeeds,
    venusStyle,
    sibsinLove,
    venusHouse,
    marsStyle,
    moonVenusAspect,
    junoPartner,
    vertexMeeting,
    lilithDesire,
    romanceTiming: romanceTiming || undefined,
    charmScore,
    attachmentStyle,
    loveLanguage,
    conflictStyle,
  };
}
