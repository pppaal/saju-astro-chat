// src/lib/destiny-map/local-report-generator.ts
// Local template-based report generation (AI 없이 사주/점성 데이터만으로)

import type { CombinedResult } from "./astrologyengine";
import { logger } from "@/lib/logger";
import { ELEMENT_RELATIONS, ZODIAC_TO_ELEMENT } from "./calendar/constants";
import { normalizeElement } from "./calendar/utils";

// ============================================================
// Translation Maps
// ============================================================

/** Five element names */
const ELEMENT_NAMES: Record<string, { ko: string; en: string }> = {
  wood: { ko: "목(木)", en: "Wood" },
  fire: { ko: "화(火)", en: "Fire" },
  earth: { ko: "토(土)", en: "Earth" },
  metal: { ko: "금(金)", en: "Metal" },
  water: { ko: "수(水)", en: "Water" },
};

/** Zodiac sign names */
const SIGN_NAMES: Record<string, { ko: string; en: string }> = {
  aries: { ko: "양자리", en: "Aries" },
  taurus: { ko: "황소자리", en: "Taurus" },
  gemini: { ko: "쌍둥이자리", en: "Gemini" },
  cancer: { ko: "게자리", en: "Cancer" },
  leo: { ko: "사자자리", en: "Leo" },
  virgo: { ko: "처녀자리", en: "Virgo" },
  libra: { ko: "천칭자리", en: "Libra" },
  scorpio: { ko: "전갈자리", en: "Scorpio" },
  sagittarius: { ko: "사수자리", en: "Sagittarius" },
  capricorn: { ko: "염소자리", en: "Capricorn" },
  aquarius: { ko: "물병자리", en: "Aquarius" },
  pisces: { ko: "물고기자리", en: "Pisces" },
};

/** Element personality traits */
const ELEMENT_TRAITS: Record<string, { ko: string; en: string }> = {
  wood: {
    ko: "성장과 창의성을 추구하며, 새로운 시작에 강한 에너지를 보입니다",
    en: "Seeks growth and creativity, showing strong energy for new beginnings",
  },
  fire: {
    ko: "열정과 리더십이 강하며, 주변을 밝히는 카리스마가 있습니다",
    en: "Strong passion and leadership, with charisma that lights up surroundings",
  },
  earth: {
    ko: "안정과 신뢰를 중시하며, 현실적이고 꾸준한 성향입니다",
    en: "Values stability and trust, with a realistic and steady disposition",
  },
  metal: {
    ko: "원칙과 정의를 중시하며, 결단력과 집중력이 뛰어납니다",
    en: "Values principles and justice, with excellent decisiveness and focus",
  },
  water: {
    ko: "지혜와 적응력이 뛰어나며, 깊은 통찰력을 지닙니다",
    en: "Excellent wisdom and adaptability, with deep insight",
  },
};

const ELEMENT_KEYWORDS: Record<string, { ko: string[]; en: string[] }> = {
  wood: { ko: ["성장", "개척", "리더십"], en: ["growth", "initiative", "leadership"] },
  fire: { ko: ["열정", "표현", "카리스마"], en: ["passion", "expression", "charisma"] },
  earth: { ko: ["안정", "조율", "실용"], en: ["stability", "balance", "practicality"] },
  metal: { ko: ["원칙", "분석", "결단"], en: ["principle", "analysis", "decisiveness"] },
  water: { ko: ["직관", "유연", "깊이"], en: ["intuition", "adaptability", "depth"] },
};

const ARCHETYPES: Record<string, { ko: string; en: string; taglineKo: string; taglineEn: string }> = {
  wood: {
    ko: "새싹 개척자",
    en: "Verdant Pioneer",
    taglineKo: "성장과 확장의 서사를 이끄는 인물",
    taglineEn: "A protagonist of growth and exploration",
  },
  fire: {
    ko: "불꽃 선도자",
    en: "Flame Vanguard",
    taglineKo: "열정과 표현으로 판을 여는 인물",
    taglineEn: "A catalyst who ignites bold expression",
  },
  earth: {
    ko: "대지 설계자",
    en: "Earth Architect",
    taglineKo: "안정과 조율로 기반을 만드는 인물",
    taglineEn: "A builder who stabilizes the world around them",
  },
  metal: {
    ko: "칼날 전략가",
    en: "Steel Strategist",
    taglineKo: "원칙과 결단으로 길을 여는 인물",
    taglineEn: "A strategist who cuts a clear path",
  },
  water: {
    ko: "심해 현자",
    en: "Deepwater Sage",
    taglineKo: "직관과 통찰로 흐름을 읽는 인물",
    taglineEn: "A sage who navigates with deep insight",
  },
};

// ============================================================
// Data Extraction Helpers
// ============================================================

interface ExtractedSajuData {
  dayMasterName: string;
  dayMasterElement: string;
  fiveElements: Record<string, number>;
  dominantElement: string;
  weakestElement: string;
}

interface ExtractedAstroData {
  sunSign: string;
  moonSign: string;
  ascendant: string;
}

interface ImportantYear {
  year: number;
  age: number;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  sajuReason: string;
  astroReason: string;
  advice?: string;
}

interface StructuredFortune {
  themeSummary?: string;
  sections?: Array<{
    id: string;
    icon: string;
    title: string;
    titleEn: string;
    content: string;
  }>;
  lifeTimeline?: {
    description?: string;
    importantYears?: ImportantYear[];
  };
  categoryAnalysis?: Record<string, {
    icon: string;
    title: string;
    sajuAnalysis: string;
    astroAnalysis: string;
    crossInsight: string;
    keywords?: string[];
  }>;
  keyInsights?: Array<{ type: "strength" | "opportunity" | "caution" | "advice"; text: string; icon?: string }>;
  luckyElements?: { colors?: string[]; directions?: string[]; numbers?: number[]; items?: string[] };
  sajuHighlight?: { pillar: string; element: string; meaning: string };
  astroHighlight?: { planet: string; sign: string; meaning: string };
  characterBuilder?: {
    archetype?: string;
    tagline?: string;
    personality: string;
    conflict: string;
    growthArc: string;
    keywords?: string[];
  };
}

/**
 * Extract Saju data from various possible structures
 */
function extractSajuData(saju: CombinedResult["saju"]): ExtractedSajuData {
  // 일간 정보 추출 - 여러 경로에서 시도
  const dayMasterRaw = saju?.dayMaster || (saju?.facts as Record<string, unknown>)?.dayMaster || {};
  const pillarsDay = (saju?.pillars as Record<string, unknown>)?.day as Record<string, unknown> | undefined;

  const dayMasterName =
    (dayMasterRaw as Record<string, string>)?.name ||
    (dayMasterRaw as Record<string, string>)?.heavenlyStem ||
    (pillarsDay?.heavenlyStem as Record<string, string>)?.name ||
    "Unknown";

  const dayMasterElement =
    (dayMasterRaw as Record<string, string>)?.element ||
    (pillarsDay?.heavenlyStem as Record<string, string>)?.element ||
    "Unknown";

  // 오행 정보
  const sajuFacts = saju?.facts as { fiveElements?: Record<string, number> } | undefined;
  const sajuAny = saju as unknown as Record<string, unknown> | undefined;
  const fiveElements =
    (sajuAny?.fiveElements as Record<string, number>) ||
    sajuFacts?.fiveElements ||
    {};

  // Sort elements
  const sorted = Object.entries(fiveElements).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  );

  return {
    dayMasterName,
    dayMasterElement,
    fiveElements,
    dominantElement: sorted[0]?.[0] || "unknown",
    weakestElement: sorted[sorted.length - 1]?.[0] || "unknown",
  };
}

/**
 * Extract Astrology data from various possible structures
 */
function extractAstroData(astro: CombinedResult["astrology"]): ExtractedAstroData {
  // 태양 별자리
  const sunSign = Array.isArray(astro?.planets)
    ? (astro.planets.find((p: Record<string, string>) => p?.name?.toLowerCase() === "sun") as Record<string, string>)?.sign
    : (astro?.planets as { sun?: { sign?: string } })?.sun?.sign ||
      (astro?.facts as { sun?: { sign?: string } })?.sun?.sign ||
      "Unknown";

  // 달 별자리
  const moonSign = Array.isArray(astro?.planets)
    ? (astro.planets.find((p: Record<string, string>) => p?.name?.toLowerCase() === "moon") as Record<string, string>)?.sign
    : (astro?.planets as { moon?: { sign?: string } })?.moon?.sign ||
      (astro?.facts as { moon?: { sign?: string } })?.moon?.sign ||
      "Unknown";

  // 상승궁
  const ascendant =
    (astro?.ascendant as { sign?: string })?.sign ||
    (astro?.facts as { ascendant?: { sign?: string } })?.ascendant?.sign ||
    "Unknown";

  return { sunSign, moonSign, ascendant };
}

// ============================================================
// Translation Helpers
// ============================================================

function getElementName(element: string, isKo: boolean): string {
  return ELEMENT_NAMES[element]?.[isKo ? "ko" : "en"] || element;
}

function getSignName(sign: string, isKo: boolean): string {
  return SIGN_NAMES[sign?.toLowerCase()]?.[isKo ? "ko" : "en"] || sign;
}

function getElementTrait(element: string, isKo: boolean): string {
  return ELEMENT_TRAITS[element]?.[isKo ? "ko" : "en"] || "";
}

function normalizeElementKey(element?: string): string {
  if (!element) {return "wood";}
  const raw = element.trim();
  const map: Record<string, string> = {
    "목": "wood",
    "화": "fire",
    "토": "earth",
    "금": "metal",
    "수": "water",
    "木": "wood",
    "火": "fire",
    "土": "earth",
    "金": "metal",
    "水": "water",
  };
  const mapped = map[raw] || raw.toLowerCase();
  return normalizeElement(mapped);
}

function normalizeZodiacKey(sign?: string): string {
  if (!sign) {return "";}
  const trimmed = sign.trim();
  if (!trimmed) {return "";}
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function getZodiacElement(sign?: string): string {
  const key = normalizeZodiacKey(sign);
  return ZODIAC_TO_ELEMENT[key] || "";
}

function getElementKeywords(element: string, isKo: boolean): string[] {
  const key = normalizeElementKey(element);
  const fallback = isKo ? ["균형", "직관"] : ["balance", "insight"];
  return ELEMENT_KEYWORDS[key]?.[isKo ? "ko" : "en"] || fallback;
}

function buildImportantYears(
  result: CombinedResult,
  sunSignName: string,
  isKo: boolean
): ImportantYear[] {
  const unse = result.saju?.unse;
  const annual = Array.isArray(unse?.annual)
    ? (unse.annual as Array<{ year?: number; age?: number; ganji?: string }>)
    : [];
  const daeun = Array.isArray(unse?.daeun)
    ? (unse.daeun as Array<{ startYear?: number; age?: number; ganji?: string }>)
    : [];
  const birthDate = (result.saju as { facts?: { birthDate?: string } })?.facts?.birthDate;
  const birthYear = birthDate ? Number(birthDate.slice(0, 4)) : undefined;
  const nowYear = new Date().getFullYear();

  const items: ImportantYear[] = [];

  const pushItem = (year: number, age: number, title: string, sajuReason: string, astroReason: string) => {
    items.push({
      year,
      age,
      rating: 3,
      title,
      sajuReason,
      astroReason,
    });
  };

  if (annual.length > 0) {
    annual.slice(0, 4).forEach((a, idx) => {
      const year = a?.year ?? nowYear + idx;
      const age = birthYear ? year - birthYear : (a?.age ?? 20 + idx * 3);
      pushItem(
        year,
        age,
        isKo ? `${year}년 운세` : `${year} Fortune`,
        isKo ? `세운 ${a?.ganji || ""} 흐름` : `Annual cycle ${a?.ganji || ""}`.trim(),
        isKo ? `태양 ${sunSignName} 기준 흐름` : `Sun in ${sunSignName} emphasis`
      );
    });
  } else if (daeun.length > 0) {
    daeun.slice(0, 3).forEach((d, idx) => {
      const year = d?.startYear ?? nowYear + idx * 8;
      const age = d?.age ?? (birthYear ? year - birthYear : 25 + idx * 8);
      pushItem(
        year,
        age,
        isKo ? `${year}년 전환기` : `${year} Turning Point`,
        isKo ? `대운 ${d?.ganji || ""} 흐름` : `Major cycle ${d?.ganji || ""}`.trim(),
        isKo ? `태양 ${sunSignName} 에너지 전환` : `Sun in ${sunSignName} shift`
      );
    });
  }

  return items;
}

function buildCharacterBuilder(
  saju: ExtractedSajuData,
  astro: ExtractedAstroData,
  lang: string
): StructuredFortune["characterBuilder"] {
  const isKo = lang === "ko";
  const dayElement = normalizeElementKey(saju.dayMasterElement || saju.dominantElement);
  const weakest = normalizeElementKey(saju.weakestElement || dayElement);
  const support = ELEMENT_RELATIONS[dayElement]?.generatedBy || dayElement;
  const archetype = ARCHETYPES[dayElement] || ARCHETYPES.wood;

  const sunElement = getZodiacElement(astro.sunSign);
  const moonElement = getZodiacElement(astro.moonSign);
  const sunKey = normalizeElementKey(sunElement || dayElement);
  const moonKey = normalizeElementKey(moonElement || dayElement);

  const dayKeywords = getElementKeywords(dayElement, isKo);
  const sunKeywords = getElementKeywords(sunKey, isKo);
  const weakestKeywords = getElementKeywords(weakest, isKo);

  const personality = isKo
    ? `일간의 ${dayKeywords.join("·")} 기질이 기본 축이고, 태양 ${getSignName(astro.sunSign, true)}의 ${sunKeywords[0]} 에너지가 겉으로 드러납니다. 달 ${getSignName(astro.moonSign, true)}가 감정의 리듬을 보완해 더 입체적인 성격을 만듭니다.`
    : `Your core is rooted in ${dayKeywords.join(", ")} energy, while Sun in ${getSignName(astro.sunSign, false)} amplifies ${sunKeywords[0]} on the surface. Moon in ${getSignName(astro.moonSign, false)} adds emotional nuance and depth.`;

  let conflict = "";
  if (sunKey === dayElement) {
    conflict = isKo
      ? "내면과 외면이 같은 원소로 강하게 몰입하지만, 과열되면 균형을 잃기 쉽습니다."
      : "Inner and outer energies align strongly, which can lead to overdrive if balance is lost.";
  } else if (ELEMENT_RELATIONS[dayElement]?.controls === sunKey) {
    conflict = isKo
      ? `내면의 ${getElementName(dayElement, true)}이 외부의 ${getElementName(sunKey, true)} 흐름을 통제하려는 긴장이 생깁니다.`
      : `Your inner ${getElementName(dayElement, false)} tries to control the outward ${getElementName(sunKey, false)} flow, creating tension.`;
  } else if (ELEMENT_RELATIONS[dayElement]?.controlledBy === sunKey) {
    conflict = isKo
      ? `외부 환경의 ${getElementName(sunKey, true)} 기운이 내면을 압박해 속도 조절이 필요합니다.`
      : `External ${getElementName(sunKey, false)} energy can pressure your inner pace, calling for regulation.`;
  } else {
    conflict = isKo
      ? `서로 다른 원소가 섞여 겉과 속의 리듬이 달라질 수 있습니다. ${getElementName(weakest, true)} 기운을 보완하는 것이 핵심입니다.`
      : `Mixed elements create different inner and outer rhythms. Strengthening ${getElementName(weakest, false)} energy becomes the key.`;
  }

  if (sunKey !== moonKey) {
    conflict += isKo
      ? ` 태양 ${getSignName(astro.sunSign, true)}과 달 ${getSignName(astro.moonSign, true)}의 결이 달라 감정-행동 간 간극이 생길 수 있어요.`
      : ` The Sun in ${getSignName(astro.sunSign, false)} and Moon in ${getSignName(astro.moonSign, false)} move differently, creating inner gaps.`;
  }

  const growthArc = isKo
    ? `초반에는 ${getElementName(dayElement, true)}의 ${dayKeywords[0]}에 집중해 방향을 잡습니다.\n중반에는 약한 ${getElementName(weakest, true)} 요소를 의식적으로 키우며 균형을 배웁니다.\n후반에는 ${getElementName(support, true)}의 힘을 빌려 영향력을 확장하고 스스로의 이야기를 완성합니다.`
    : `Early on, you focus on ${getElementName(dayElement, false)}-driven ${dayKeywords[0]} to find direction.\nMidway, you consciously strengthen ${getElementName(weakest, false)} to regain balance.\nLater, you leverage ${getElementName(support, false)} energy to expand impact and complete your story.`;

  return {
    archetype: isKo ? archetype.ko : archetype.en,
    tagline: isKo ? archetype.taglineKo : archetype.taglineEn,
    personality,
    conflict,
    growthArc,
    keywords: Array.from(new Set([...dayKeywords, ...sunKeywords].slice(0, 6))),
  };
}

// ============================================================
// Report Generation
// ============================================================

/**
 * Generate local template-based report (no AI)
 */
export function generateLocalReport(
  result: CombinedResult,
  theme: string,
  lang: string,
  name?: string
): string {
  const isKo = lang === "ko";
  const saju = extractSajuData(result.saju);
  const astro = extractAstroData(result.astrology);

  // Debug logs
  logger.debug("[generateLocalReport] dayMaster:", { name: saju.dayMasterName, element: saju.dayMasterElement });

  // Translation helpers
  const dominantName = getElementName(saju.dominantElement, isKo);
  const weakestName = getElementName(saju.weakestElement, isKo);
  const sunSignName = getSignName(astro.sunSign, isKo);
  const moonSignName = getSignName(astro.moonSign, isKo);
  const ascName = getSignName(astro.ascendant, isKo);
  const elementTrait = getElementTrait(saju.dominantElement, isKo);

  const fe = saju.fiveElements;

  if (isKo) {
    return `## 사주×점성 통합 분석

### 핵심 정체성
당신의 일간은 **${saju.dayMasterName}**(${saju.dayMasterElement})이며, 태양은 **${sunSignName}**, 달은 **${moonSignName}**에 위치합니다.

오행 중 **${dominantName}** 기운이 가장 강하고, **${weakestName}** 기운이 상대적으로 약합니다.
${elementTrait}

### 사주 분석 (동양)
- 일간: ${saju.dayMasterName} (${saju.dayMasterElement})
- 우세 오행: ${dominantName}
- 부족 오행: ${weakestName}
- 오행 분포: 목 ${fe.wood || 0}%, 화 ${fe.fire || 0}%, 토 ${fe.earth || 0}%, 금 ${fe.metal || 0}%, 수 ${fe.water || 0}%

### 점성 분석 (서양)
- 태양: ${sunSignName} - 핵심 자아와 정체성
- 달: ${moonSignName} - 감정과 내면
- 상승궁: ${ascName} - 외부에 보이는 모습

### 융합 인사이트
${dominantName} 기운과 ${sunSignName}의 에너지가 결합되어, 독특한 성향과 잠재력을 형성합니다.
${weakestName} 기운을 보완하면 더욱 균형 잡힌 발전이 가능합니다.

---
*사주와 점성을 융합한 분석입니다. 더 자세한 상담은 상담사에게 문의하세요.*`;
  }

  return `## Saju × Astrology Fusion Analysis

### Core Identity
Your Day Master is **${saju.dayMasterName}** (${saju.dayMasterElement}), with Sun in **${sunSignName}** and Moon in **${moonSignName}**.

Among the Five Elements, **${dominantName}** is strongest while **${weakestName}** is relatively weak.
${elementTrait}

### Saju Analysis (Eastern)
- Day Master: ${saju.dayMasterName} (${saju.dayMasterElement})
- Dominant Element: ${dominantName}
- Weak Element: ${weakestName}
- Element Distribution: Wood ${fe.wood || 0}%, Fire ${fe.fire || 0}%, Earth ${fe.earth || 0}%, Metal ${fe.metal || 0}%, Water ${fe.water || 0}%

### Astrology Analysis (Western)
- Sun: ${sunSignName} - Core self and identity
- Moon: ${moonSignName} - Emotions and inner world
- Ascendant: ${ascName} - How others perceive you

### Fusion Insight
The combination of ${dominantName} energy and ${sunSignName} creates a unique personality and potential.
Strengthening your ${weakestName} element can lead to more balanced development.

---
*This is a fusion analysis of Saju and Astrology. For detailed consultation, please ask the counselor.*`;
}

export function generateLocalStructuredReport(
  result: CombinedResult,
  theme: string,
  lang: string,
  name?: string
): string {
  const isKo = lang === "ko";
  const saju = extractSajuData(result.saju);
  const astro = extractAstroData(result.astrology);

  const dominantKey = normalizeElementKey(saju.dominantElement);
  const weakestKey = normalizeElementKey(saju.weakestElement);
  const dominantName = getElementName(dominantKey, isKo);
  const weakestName = getElementName(weakestKey, isKo);
  const sunSignName = getSignName(astro.sunSign, isKo);
  const moonSignName = getSignName(astro.moonSign, isKo);
  const ascName = getSignName(astro.ascendant, isKo);
  const elementTrait = getElementTrait(dominantKey, isKo);
  const dayKeywords = getElementKeywords(normalizeElementKey(saju.dayMasterElement), isKo);

  const themeKey = (theme || "").toLowerCase();
  const themeLabels: Record<string, { ko: string; en: string }> = {
    focus_overall: { ko: "??? ??", en: "Destiny Map" },
    focus_love: { ko: "???", en: "Love & Romance" },
    focus_career: { ko: "???", en: "Career & Work" },
    focus_family: { ko: "???", en: "Family & Home" },
    focus_health: { ko: "???", en: "Health & Vitality" },
    focus_energy: { ko: "??? ?", en: "Energy & Vitality" },
    fortune_today: { ko: "??? ??", en: "Today's Fortune" },
    fortune_monthly: { ko: "?? ??", en: "Monthly Fortune" },
    fortune_new_year: { ko: "?? ??", en: "New Year Fortune" },
    fortune_next_year: { ko: "?? ??", en: "Next Year Fortune" },
    life: { ko: "?? ??", en: "Life Fortune" },
    general: { ko: "?? ???", en: "Destiny Report" },
  };
  const themeLabel = themeLabels[themeKey]?.[isKo ? "ko" : "en"] || (isKo ? "?? ???" : "Destiny Report");

  const summaryLine = isKo
    ? `${themeLabel} ? ${name || "???"}`
    : `${themeLabel} ? ${name || "User"}`;

  const sections = [
    {
      id: "core",
      icon: "?",
      title: "?? ???",
      titleEn: "Core Identity",
      content: isKo
        ? `?? ${saju.dayMasterName}(${saju.dayMasterElement}) ? ?? ${sunSignName} ? ? ${moonSignName}
${elementTrait}`
        : `Day Master ${saju.dayMasterName} (${saju.dayMasterElement}) ? Sun ${sunSignName} ? Moon ${moonSignName}
${elementTrait}`,
    },
    {
      id: "saju",
      icon: "??",
      title: "?? ???",
      titleEn: "Saju Focus",
      content: isKo
        ? `?? ??: ${dominantName}
?? ??: ${weakestName}`
        : `Dominant element: ${dominantName}
Support element: ${weakestName}`,
    },
    {
      id: "astro",
      icon: "?",
      title: "?? ???",
      titleEn: "Astro Focus",
      content: isKo
        ? `?? ${sunSignName} ? ? ${moonSignName} ? ??? ${ascName}`
        : `Sun ${sunSignName} ? Moon ${moonSignName} ? Ascendant ${ascName}`,
    },
    {
      id: "fusion",
      icon: "??",
      title: "?? ????",
      titleEn: "Fusion Insight",
      content: isKo
        ? `${dominantName} ??? ${sunSignName} ???? ???? ${dayKeywords[0]} ??? ?????.
${weakestName} ??? ???? ? ? ??? ?? ? ???.`
        : `The blend of ${dominantName} energy and ${sunSignName} amplifies ${dayKeywords[0]} tendencies.
Strengthening ${weakestName} brings more balance.`,
    },
  ];

  const importantYears = buildImportantYears(result, sunSignName, isKo);

  const structured: StructuredFortune = {
    themeSummary: summaryLine,
    sections,
    lifeTimeline: {
      description: isKo
        ? "??? ?? ???? ???? ??? ??? ??????."
        : "Key timing highlights derived from your Saju and astrology data.",
      importantYears,
    },
    categoryAnalysis: {
      personality: {
        icon: "??",
        title: isKo ? "??" : "Personality",
        sajuAnalysis: isKo
          ? `${saju.dayMasterName} ??? ${dayKeywords.join("?")} ??? ????.`
          : `${dayKeywords.join(", ")} traits are strong in your Day Master.`,
        astroAnalysis: isKo
          ? `?? ${sunSignName}? ??? ???, ? ${moonSignName}? ?? ??? ?????.`
          : `Sun in ${sunSignName} shapes outward style, while Moon in ${moonSignName} colors inner emotions.`,
        crossInsight: isKo
          ? "??? ??? ??? ? ???? ??????."
          : "When inner and outer energies align, your potential peaks.",
        keywords: [...new Set([...dayKeywords, dominantName, sunSignName])],
      },
    },
    keyInsights: [
      {
        type: "strength",
        icon: "??",
        text: isKo
          ? `${dominantName} ??? ?? ${dayKeywords[0]} ??? ??????.`
          : `${dominantName} energy highlights your ${dayKeywords[0]} strengths.`,
      },
      {
        type: "opportunity",
        icon: "??",
        text: isKo
          ? `${sunSignName} ?? ???? ??? ??? ?????.`
          : `Sun in ${sunSignName} pushes new initiatives forward.`,
      },
      {
        type: "advice",
        icon: "??",
        text: isKo
          ? `${weakestName} ??? ???? ??? ???? ????.`
          : `Strengthening ${weakestName} brings balance and longevity.`,
      },
    ],
    luckyElements: {
      items: [dominantName, weakestName],
    },
    sajuHighlight: {
      pillar: isKo ? `?? ${saju.dayMasterName}` : `Day Master ${saju.dayMasterName}`,
      element: dominantName,
      meaning: isKo ? `${dominantName} ??? ?? ?????.` : `${dominantName} energy is your core driver.`,
    },
    astroHighlight: {
      planet: "Sun",
      sign: sunSignName,
      meaning: isKo ? `?? ${sunSignName}? ?? ???? ?????.` : `Sun in ${sunSignName} guides your direction.`,
    },
    characterBuilder: buildCharacterBuilder(saju, astro, lang),
  };

  return JSON.stringify(structured, null, 2);
}
