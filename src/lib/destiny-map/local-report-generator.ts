// src/lib/destiny-map/local-report-generator.ts
// Local template-based report generation (AI 없이 사주/점성 데이터만으로)

import type { CombinedResult } from "./astrologyengine";
import { logger } from "@/lib/logger";

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
