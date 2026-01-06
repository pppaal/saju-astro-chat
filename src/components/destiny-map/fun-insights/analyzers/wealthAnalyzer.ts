// 재물 분석 - 2하우스 + 목성 + 재성 + 오행 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang
} from './utils';

interface WealthAnalysis {
  moneyStyle: string;           // 돈을 다루는 스타일
  earningWay: string;           // 돈을 버는 방식
  spendingPattern: string;      // 소비 패턴
  wealthTip: string;            // 재물 조언
  luckyField: string;           // 재물운 좋은 분야
  house2Style?: string;         // 2하우스 - 재물 가치관
  jupiterWealth?: string;       // 목성 - 확장과 행운
  venusWealth?: string;         // 금성 - 쾌락과 가치
  sibsinWealth?: string;        // 재성 십신 - 재물 에너지
  plutoWealth?: string;         // 명왕성 - 변환과 재생
  saturnWealth?: string;        // 토성 - 장기 축적
  elementWealth?: string;       // 오행 기반 재물 성향
}

// 일간별 재물 스타일
const dayMasterWealthTraits: Record<string, {
  style: { ko: string; en: string };
  earning: { ko: string; en: string };
  spending: { ko: string; en: string };
  tip: { ko: string; en: string };
}> = {
  "갑": {
    style: { ko: "크게 벌어 크게 쓰는 스타일이에요", en: "Earn big, spend big style" },
    earning: { ko: "새로운 사업이나 개척하는 일에서 돈이 들어와요", en: "Money comes from new ventures or pioneering work" },
    spending: { ko: "성장을 위한 투자에 과감하게 써요", en: "Spend boldly on growth investments" },
    tip: { ko: "장기 투자와 꾸준한 저축이 필요해요", en: "Need long-term investment and steady savings" }
  },
  "을": {
    style: { ko: "유연하게 여러 곳에서 수입을 만들어요", en: "Flexibly create income from multiple sources" },
    earning: { ko: "관계와 협력에서 재물이 들어와요", en: "Wealth comes from relationships and collaboration" },
    spending: { ko: "분위기와 관계 유지에 많이 써요", en: "Spend a lot on atmosphere and maintaining relationships" },
    tip: { ko: "핵심 수입원을 명확히 하세요", en: "Clarify your core income source" }
  },
  "병": {
    style: { ko: "화끈하게 벌고 화끈하게 써요", en: "Earn passionately, spend passionately" },
    earning: { ko: "주목받는 일, 영향력 있는 활동에서 돈이 와요", en: "Money comes from spotlight work and influential activities" },
    spending: { ko: "기분에 따라 즉흥적으로 쓰는 편이에요", en: "Tend to spend spontaneously based on mood" },
    tip: { ko: "충동 소비를 조절하세요", en: "Control impulse spending" }
  },
  "정": {
    style: { ko: "세심하게 관리하며 키워요", en: "Carefully manage and grow" },
    earning: { ko: "디테일한 서비스, 감성 분야에서 돈이 들어와요", en: "Money comes from detailed service and emotional fields" },
    spending: { ko: "퀄리티와 가치에 투자해요", en: "Invest in quality and value" },
    tip: { ko: "더 큰 그림도 보세요", en: "Look at the bigger picture too" }
  },
  "무": {
    style: { ko: "안정적으로 모으고 지키려 해요", en: "Tend to accumulate and protect steadily" },
    earning: { ko: "부동산, 중재, 안정적 사업에서 재물이 와요", en: "Wealth comes from real estate, mediation, stable business" },
    spending: { ko: "실용적인 것에만 돈을 써요", en: "Only spend on practical things" },
    tip: { ko: "때로는 투자를 위한 리스크도 필요해요", en: "Sometimes need risk for investment" }
  },
  "기": {
    style: { ko: "꼼꼼하게 체크하며 관리해요", en: "Manage carefully and meticulously" },
    earning: { ko: "서비스, 관리, 세부 작업에서 돈이 들어와요", en: "Money comes from service, management, detailed work" },
    spending: { ko: "필요한 것에만 아껴서 써요", en: "Spend sparingly only on necessities" },
    tip: { ko: "가끔은 자신을 위해 써도 괜찮아요", en: "It's okay to spend on yourself sometimes" }
  },
  "경": {
    style: { ko: "칼같이 벌고 칼같이 관리해요", en: "Earn sharply, manage sharply" },
    earning: { ko: "결단력 필요한 일, 금융에서 돈이 와요", en: "Money comes from decisiveness-required work and finance" },
    spending: { ko: "가치 있는 것에 과감하게 투자해요", en: "Boldly invest in valuable things" },
    tip: { ko: "융통성도 필요해요", en: "Need flexibility too" }
  },
  "신": {
    style: { ko: "정교하게 계획하고 실행해요", en: "Plan and execute precisely" },
    earning: { ko: "전문성, 정밀한 기술에서 재물이 들어와요", en: "Wealth comes from expertise and precise skills" },
    spending: { ko: "계획된 소비만 해요", en: "Only make planned purchases" },
    tip: { ko: "새로운 기회에도 열려 있으세요", en: "Stay open to new opportunities" }
  },
  "임": {
    style: { ko: "흐르는 대로 자연스럽게 다뤄요", en: "Handle naturally as it flows" },
    earning: { ko: "지혜, 정보, 유통에서 돈이 들어와요", en: "Money comes from wisdom, information, distribution" },
    spending: { ko: "기분과 상황에 따라 유연하게 써요", en: "Spend flexibly based on mood and situation" },
    tip: { ko: "구체적인 재정 계획을 세우세요", en: "Make concrete financial plans" }
  },
  "계": {
    style: { ko: "조용히 모으고 깊이 키워요", en: "Quietly accumulate and deeply grow" },
    earning: { ko: "연구, 상담, 숨은 일에서 재물이 와요", en: "Wealth comes from research, counseling, hidden work" },
    spending: { ko: "신중하게 오래 고민하고 결정해요", en: "Decide carefully after long consideration" },
    tip: { ko: "때로는 과감한 결단도 필요해요", en: "Sometimes need bold decisions" }
  }
};

// 2하우스 별자리별 재물 가치관
const house2Patterns: Record<string, { ko: string; en: string }> = {
  aries: { ko: "스스로 벌어야 직성이 풀려요. 빠르게 돈을 벌고 싶어해요.", en: "Must earn yourself to feel satisfied. Want to make money fast." },
  taurus: { ko: "안정적인 재물 축적이 중요해요. 물질적 안정을 추구해요.", en: "Stable wealth accumulation is important. Pursue material stability." },
  gemini: { ko: "다양한 수입원을 만들어요. 정보와 소통으로 돈을 벌어요.", en: "Create diverse income sources. Make money through information and communication." },
  cancer: { ko: "가족을 위한 재물이 중요해요. 집과 관련해 돈이 들어와요.", en: "Wealth for family is important. Money comes related to home." },
  leo: { ko: "품위 있게 쓰고 싶어해요. 자신감이 재물을 불러와요.", en: "Want to spend with dignity. Confidence attracts wealth." },
  virgo: { ko: "꼼꼼한 관리로 돈을 불려요. 서비스업에서 수입이 와요.", en: "Grow money through meticulous management. Income comes from service." },
  libra: { ko: "파트너십에서 재물이 와요. 균형 잡힌 소비를 해요.", en: "Wealth comes from partnerships. Have balanced spending." },
  scorpio: { ko: "깊은 변환에서 재물이 와요. 투자, 상속 운이 있어요.", en: "Wealth comes from deep transformation. Luck in investment, inheritance." },
  sagittarius: { ko: "해외나 교육에서 수입이 와요. 큰 그림을 그려요.", en: "Income comes from abroad or education. Paint the big picture." },
  capricorn: { ko: "시간이 갈수록 재물이 늘어요. 장기적 안목이 있어요.", en: "Wealth increases over time. Have long-term vision." },
  aquarius: { ko: "독특한 방식으로 돈을 벌어요. 테크나 혁신에서 수입이 와요.", en: "Make money in unique ways. Income from tech or innovation." },
  pisces: { ko: "직관적으로 재물을 끌어당겨요. 예술, 영성에서 수입이 와요.", en: "Attract wealth intuitively. Income from art and spirituality." },
};

// 목성 하우스별 재물 확장
const jupiterWealthBlessings: Record<number, { ko: string; en: string }> = {
  1: { ko: "자신감으로 재물을 끌어당겨요. 존재 자체가 기회예요.", en: "Attract wealth through confidence. Your presence is opportunity." },
  2: { ko: "재물 복이 타고났어요. 자연스럽게 돈이 들어와요.", en: "Born with wealth fortune. Money flows in naturally." },
  3: { ko: "정보와 네트워크로 돈을 벌어요. 멀티 수입이 가능해요.", en: "Make money through information and network. Multiple income possible." },
  4: { ko: "부동산, 가업에서 확장이 와요. 집안에 복이 있어요.", en: "Expansion comes from real estate, family business. Fortune in the family." },
  5: { ko: "창작, 투기에서 행운이 있어요. 즐기면서 벌어요.", en: "Luck in creation, speculation. Earn while enjoying." },
  6: { ko: "일상 업무에서 꾸준히 벌어요. 건강 분야에 복이 있어요.", en: "Earn steadily from daily work. Fortune in health field." },
  7: { ko: "파트너나 결혼으로 재물이 와요. 동업 운이 좋아요.", en: "Wealth comes through partner or marriage. Good for business partnerships." },
  8: { ko: "투자, 보험, 상속에서 확장이 와요. 남의 돈을 다뤄요.", en: "Expansion in investment, insurance, inheritance. Handle others' money." },
  9: { ko: "해외, 교육, 출판에서 돈이 커져요. 멀리서 복이 와요.", en: "Money grows in foreign affairs, education, publishing. Fortune from afar." },
  10: { ko: "커리어 성공이 재물로 이어져요. 사회적 인정이 돈이 돼요.", en: "Career success leads to wealth. Social recognition becomes money." },
  11: { ko: "인맥과 그룹에서 재물이 와요. 미래 지향적 투자가 좋아요.", en: "Wealth comes from connections and groups. Future-oriented investment is good." },
  12: { ko: "숨은 수입원이 있어요. 영적 활동도 수입이 될 수 있어요.", en: "Have hidden income sources. Spiritual activities can be income too." },
};

// 금성 별자리별 가치관과 쾌락 소비
const venusWealthStyle: Record<string, { ko: string; en: string }> = {
  aries: { ko: "빠른 쇼핑을 좋아해요. 충동구매 주의!", en: "Like fast shopping. Watch for impulse buying!" },
  taurus: { ko: "품질 좋은 것에 투자해요. 가치 있는 소비를 해요.", en: "Invest in quality. Make valuable purchases." },
  gemini: { ko: "다양한 것에 조금씩 써요. 정보 관련 소비가 많아요.", en: "Spend a little on various things. Much spending on information." },
  cancer: { ko: "가정과 먹는 것에 많이 써요. 정서적 소비를 해요.", en: "Spend a lot on home and food. Make emotional purchases." },
  leo: { ko: "화려하고 럭셔리한 것을 좋아해요. 자기 과시 소비가 있어요.", en: "Like glamorous and luxury things. Have self-display spending." },
  virgo: { ko: "실용적인 것만 사요. 가성비를 따져요.", en: "Only buy practical things. Consider value for money." },
  libra: { ko: "예쁘고 조화로운 것에 써요. 관계 유지 비용이 많아요.", en: "Spend on pretty and harmonious things. Much on relationship maintenance." },
  scorpio: { ko: "깊이 있는 것에 투자해요. 숨겨둔 재물이 있어요.", en: "Invest in deep things. Have hidden wealth." },
  sagittarius: { ko: "경험과 여행에 많이 써요. 확장을 위한 소비를 해요.", en: "Spend a lot on experiences and travel. Spend for expansion." },
  capricorn: { ko: "장기적 가치에 투자해요. 사치보다 투자를 좋아해요.", en: "Invest in long-term value. Prefer investment over luxury." },
  aquarius: { ko: "독특하고 미래적인 것에 써요. 기술 관련 소비가 많아요.", en: "Spend on unique and futuristic things. Much tech-related spending." },
  pisces: { ko: "감성적인 것에 많이 써요. 기부나 봉사에도 쓰는 편이에요.", en: "Spend a lot on emotional things. Tend to donate or give." },
};

// 재성(편재/정재) 십신 위치별 재물 에너지
const sibsinWealthTraits: Record<string, { ko: string; en: string }> = {
  "재성_강": { ko: "재물 복이 있고 돈을 잘 다뤄요. 하지만 너무 돈에 매이지 마세요.", en: "Have wealth fortune and handle money well. But don't be too attached." },
  "재성_약": { ko: "재물보다 다른 가치를 추구해요. 돈 관리 시스템을 만드세요.", en: "Pursue values other than wealth. Create money management system." },
  "편재": { ko: "큰 돈을 한번에 벌고 쓰는 패턴이에요. 투자 감각이 있어요.", en: "Pattern of earning and spending big at once. Have investment sense." },
  "정재": { ko: "꾸준히 모으고 안정적으로 불려요. 저축 습관이 좋아요.", en: "Steadily save and grow stably. Good saving habits." },
};

// 명왕성 하우스별 재물 변환
const plutoWealthTransform: Record<number, { ko: string; en: string }> = {
  2: { ko: "재물에서 완전한 변화를 경험해요. 한번 잃고 크게 벌 수 있어요.", en: "Experience complete transformation in wealth. Can lose once and earn big." },
  8: { ko: "타인의 자원을 통해 부를 쌓아요. 투자, 상속에 큰 변화가 와요.", en: "Build wealth through others' resources. Big changes in investment, inheritance." },
};

// 토성 하우스별 재물 시련과 축적
const saturnWealthLesson: Record<number, { ko: string; en: string }> = {
  2: { ko: "재물에서 시련이 있지만, 꾸준히 쌓으면 단단해져요.", en: "Trials in wealth, but steady accumulation builds strength." },
  8: { ko: "투자나 빚에서 교훈을 배워요. 타인 자원 의존을 줄이세요.", en: "Learn lessons from investment or debt. Reduce dependency on others' resources." },
  10: { ko: "사회적 성공 후에 재물이 따라와요. 인내심이 필요해요.", en: "Wealth follows social success. Patience needed." },
};

// 오행별 재물 성향
const elementWealthTraits: Record<string, { ko: string; en: string; field: { ko: string; en: string } }> = {
  wood: {
    ko: "성장하는 분야에서 돈이 와요. 새로운 시작에 투자하세요.",
    en: "Money comes from growing fields. Invest in new beginnings.",
    field: { ko: "교육, 창업, 성장 산업", en: "Education, Startups, Growth Industries" }
  },
  fire: {
    ko: "주목받는 일에서 재물이 와요. 열정이 돈이 돼요.",
    en: "Wealth comes from spotlight work. Passion becomes money.",
    field: { ko: "엔터테인먼트, 마케팅, 미디어", en: "Entertainment, Marketing, Media" }
  },
  earth: {
    ko: "안정적이고 실체 있는 것에서 돈이 와요. 부동산에 유리해요.",
    en: "Money comes from stable, tangible things. Favorable for real estate.",
    field: { ko: "부동산, 농업, 제조업", en: "Real Estate, Agriculture, Manufacturing" }
  },
  metal: {
    ko: "결단력과 전문성에서 재물이 와요. 금융에 적성이 있어요.",
    en: "Wealth comes from decisiveness and expertise. Suited for finance.",
    field: { ko: "금융, 법률, 테크", en: "Finance, Law, Tech" }
  },
  water: {
    ko: "지혜와 정보에서 돈이 와요. 유통, 무역에 유리해요.",
    en: "Money comes from wisdom and information. Favorable for distribution, trade.",
    field: { ko: "무역, 컨설팅, 정보업", en: "Trade, Consulting, Information" }
  },
};

/**
 * 2하우스 별자리 추출
 */
function getHouse2Sign(astro: AstroData | undefined): string | null {
  if (!astro?.houses) return null;

  if (Array.isArray(astro.houses)) {
    const house2 = astro.houses.find(h => h.index === 2);
    return house2?.sign?.toLowerCase() || null;
  }
  return null;
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
 * 명왕성 하우스 추출
 */
function getPlutoHouse(astro: AstroData | undefined): number | null {
  if (!astro?.planets) return null;

  if (Array.isArray(astro.planets)) {
    const pluto = astro.planets.find(p => p.name?.toLowerCase() === 'pluto');
    return pluto?.house || null;
  }
  return null;
}

/**
 * 토성 하우스 추출
 */
function getSaturnHouse(astro: AstroData | undefined): number | null {
  if (!astro?.planets) return null;

  if (Array.isArray(astro.planets)) {
    const saturn = astro.planets.find(p => p.name?.toLowerCase() === 'saturn');
    return saturn?.house || null;
  }
  return null;
}

/**
 * 재성 십신 강도 확인
 */
function getJaeseongStrength(saju: SajuData | undefined): string | null {
  const sibsinDist = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  if (!sibsinDist || typeof sibsinDist !== 'object') return null;

  // 편재, 정재 점수 확인
  const pyeonJae = (sibsinDist as Record<string, number>)["편재"] || 0;
  const jeongJae = (sibsinDist as Record<string, number>)["정재"] || 0;
  const total = pyeonJae + jeongJae;

  if (total >= 3) return "재성_강";
  if (total >= 1) {
    if (pyeonJae > jeongJae) return "편재";
    if (jeongJae > pyeonJae) return "정재";
    return "재성_약";
  }
  return "재성_약";
}

export function getWealthAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): WealthAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) return null;

  const dmBase = dayMasterWealthTraits[dayMasterName] || dayMasterWealthTraits["갑"];

  // 오행 비율
  const sorted = extractFiveElementsSorted(saju);
  const strongestElement = sorted[0]?.[0];

  // 금성 별자리
  const venusSign = extractPlanetSign(astro, 'venus');

  // 추가 요소들
  const house2Sign = getHouse2Sign(astro);
  const jupiterHouseNum = getJupiterHouse(astro);
  const plutoHouseNum = getPlutoHouse(astro);
  const saturnHouseNum = getSaturnHouse(astro);
  const jaeseongType = getJaeseongStrength(saju);

  // 결과 조합
  let moneyStyle = selectLang(isKo, dmBase.style);
  const earningWay = selectLang(isKo, dmBase.earning);
  let spendingPattern = selectLang(isKo, dmBase.spending);
  const wealthTip = selectLang(isKo, dmBase.tip);
  let luckyField = "";
  let house2Style: string | undefined;
  let jupiterWealth: string | undefined;
  let venusWealth: string | undefined;
  let sibsinWealth: string | undefined;
  let plutoWealth: string | undefined;
  let saturnWealth: string | undefined;
  let elementWealth: string | undefined;

  // 2하우스 재물 가치관
  if (house2Sign && house2Patterns[house2Sign]) {
    house2Style = selectLang(isKo, house2Patterns[house2Sign]);
    moneyStyle += " " + house2Style;
  }

  // 목성 재물 확장
  if (jupiterHouseNum && jupiterWealthBlessings[jupiterHouseNum]) {
    jupiterWealth = selectLang(isKo, jupiterWealthBlessings[jupiterHouseNum]);
  }

  // 금성 가치관
  if (venusSign && venusWealthStyle[venusSign]) {
    venusWealth = selectLang(isKo, venusWealthStyle[venusSign]);
    spendingPattern += " " + venusWealth;
  }

  // 재성 십신
  if (jaeseongType && sibsinWealthTraits[jaeseongType]) {
    sibsinWealth = selectLang(isKo, sibsinWealthTraits[jaeseongType]);
  }

  // 명왕성 변환 (2하우스나 8하우스일 경우만)
  if (plutoHouseNum && plutoWealthTransform[plutoHouseNum]) {
    plutoWealth = selectLang(isKo, plutoWealthTransform[plutoHouseNum]);
  }

  // 토성 재물 시련 (2, 8, 10하우스일 경우만)
  if (saturnHouseNum && saturnWealthLesson[saturnHouseNum]) {
    saturnWealth = selectLang(isKo, saturnWealthLesson[saturnHouseNum]);
  }

  // 오행 기반 재물 성향
  if (strongestElement && elementWealthTraits[strongestElement]) {
    const elementTrait = elementWealthTraits[strongestElement];
    elementWealth = selectLang(isKo, elementTrait);
    luckyField = selectLang(isKo, elementTrait.field);
  }

  // 기본 행운 분야
  if (!luckyField) {
    luckyField = isKo ? "자신의 전문성을 살린 분야" : "Fields leveraging your expertise";
  }

  return {
    moneyStyle,
    earningWay,
    spendingPattern,
    wealthTip,
    luckyField,
    house2Style,
    jupiterWealth,
    venusWealth,
    sibsinWealth,
    plutoWealth,
    saturnWealth,
    elementWealth,
  };
}
