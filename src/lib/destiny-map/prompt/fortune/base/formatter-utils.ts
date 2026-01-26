/**
 * Formatting Utilities for Prompt Data
 * 프롬프트 데이터 포매팅 유틸리티
 *
 * This module formats extracted data into readable strings for prompt generation.
 * Handles planets, houses, aspects, luck cycles, and more.
 */

import { formatGanjiEasy, parseGanjiEasy } from './translation-maps';
import { formatPillar, type PlanetaryData, type SajuData, type ExtractedSajuData } from './data-extractors';
import type { PlanetData, AspectHit } from '@/lib/astrology';
import type {
  HouseData,
  PillarSet,
  DayMasterInfo,
  DaeunItem,
  AnnualItem,
  MonthlyItem,
  SinsalRecord,
  TransitItem,
  SibsinRelation,
  CareerAptitude,
  BranchInteraction,
  TuechulItem,
  HoegukItem,
  AdvancedAnalysisInput,
} from './prompt-types';

// Re-export for backwards compatibility
export type { DaeunItem, AnnualItem, MonthlyItem };

export interface UnseDataForFormat {
  daeun?: DaeunItem[];
  annual?: AnnualItem[];
  monthly?: MonthlyItem[];
}

const isAnnualWithYear = (item: AnnualItem): item is AnnualItem & { year: number } =>
  typeof item.year === "number";
const isMonthlyWithYearMonth = (item: MonthlyItem): item is MonthlyItem & { year: number; month: number } =>
  typeof item.year === "number" && typeof item.month === "number";
/**
 * Format planet list to single line
 *
 * @param planets - Array of planet data
 * @returns Formatted string like "Sun: Aries (H1); Moon: Taurus (H2)"
 */
export function formatPlanetLines(planets: PlanetData[]): string {
  return planets
    .slice(0, 12)
    .map((p) => `${p.name ?? "?"}: ${p.sign ?? "-"} (H${p.house ?? "-"})`)
    .join("; ");
}

/**
 * Format house list to single line
 *
 * @param houses - Array or object of house data
 * @returns Formatted string like "H1: Aries; H2: Taurus"
 */
export function formatHouseLines(houses: HouseData[] | Record<string, HouseData>): string {
  if (Array.isArray(houses)) {
    return houses
      .slice(0, 12)
      .map((h, i) => `H${i + 1}: ${h?.sign ?? h?.formatted ?? "-"}`)
      .join("; ");
  }
  return Object.entries(houses ?? {})
    .slice(0, 12)
    .map(([num, val]) => `H${num}: ${val?.sign ?? "-"}`)
    .join("; ");
}

/**
 * Aspect data for formatting (flexible structure)
 */
interface AspectForFormat {
  planet1?: { name?: string };
  planet2?: { name?: string };
  from?: { name?: string };
  to?: { name?: string };
  type?: string;
  aspect?: string;
}

/**
 * Format aspect list to single line
 *
 * @param aspects - Array of aspect data
 * @returns Formatted string like "Sun-trine-Moon; Mars-square-Saturn"
 */
export function formatAspectLines(aspects: AspectForFormat[]): string {
  return aspects
    .slice(0, 12)
    .map((a) =>
      `${a.planet1?.name ?? a.from?.name ?? "?"}-${a.type ?? a.aspect ?? ""}-${a.planet2?.name ?? a.to?.name ?? "?"}`
    )
    .join("; ");
}

/**
 * Format element ratios
 *
 * @param elementRatios - Element distribution object
 * @returns Formatted string like "Fire:3.2, Earth:2.1"
 */
export function formatElements(elementRatios: Record<string, number> | undefined): string {
  if (!elementRatios) {return "-";}
  return Object.entries(elementRatios)
    .map(([k, v]) => `${k}:${v.toFixed?.(1) ?? v}`)
    .join(", ");
}

/**
 * Format four pillars text
 *
 * @param pillars - Four pillars data
 * @returns Formatted string like "甲子 / 丙寅 / 戊辰 / 庚午"
 */
export function formatPillarText(pillars: PillarSet | undefined): string {
  return [
    formatPillar(pillars?.year),
    formatPillar(pillars?.month),
    formatPillar(pillars?.day),
    formatPillar(pillars?.time),
  ].filter(Boolean).join(" / ") || "-";
}

/**
 * Extract day master (일간) from pillars
 *
 * @param pillars - Four pillars data
 * @param dayMaster - Day master data
 * @returns Object with day master name and element
 */
export function extractDayMaster(
  pillars: PillarSet | undefined,
  dayMaster: DayMasterInfo | undefined
): {
  name: string;
  element: string;
} {
  const dayPillarStem = pillars?.day?.heavenlyStem?.name;
  const dayPillarElement = pillars?.day?.heavenlyStem?.element;

  return {
    name: dayMaster?.name || dayPillarStem || "-",
    element: dayMaster?.element || dayPillarElement || "-",
  };
}

/**
 * Find current Daeun (대운/Luck Cycle) based on current age
 *
 * @param unse - Unse data with daeun array
 * @param currentAge - Current age
 * @returns Current daeun object or undefined
 */
export function findCurrentDaeun(unse: UnseDataForFormat | undefined, currentAge: number): DaeunItem | undefined {
  return (unse?.daeun ?? []).find((d) => {
    const startAge = d.age;
    const endAge = startAge + 9; // 대운은 10년 단위
    return currentAge >= startAge && currentAge <= endAge;
  });
}

/**
 * Format current Daeun text (age-based, with easy Korean)
 *
 * @param unse - Unse data
 * @param currentAge - Current age
 * @returns Formatted daeun text
 */
export function formatDaeunText(unse: UnseDataForFormat | undefined, currentAge: number): string {
  const currentDaeun = findCurrentDaeun(unse, currentAge);

  if (currentDaeun) {
    return `${currentDaeun.age}-${currentDaeun.age + 9}세: ${formatGanjiEasy(currentDaeun.heavenlyStem, currentDaeun.earthlyBranch)}`;
  }

  // Fallback: show first 3 daeun
  return (unse?.daeun ?? [])
    .slice(0, 3)
    .map((u) => `${u.age}-${u.age + 9}세: ${formatGanjiEasy(u.heavenlyStem, u.earthlyBranch)}`)
    .join("; ");
}

/**
 * Format all Daeun list with current marker
 *
 * @param unse - Unse data
 * @param currentAge - Current age
 * @returns Multi-line formatted daeun list
 */
export function formatAllDaeunText(unse: UnseDataForFormat | undefined, currentAge: number): string {
  return (unse?.daeun ?? [])
    .map((d) => {
      const startAge = d.age;
      const endAge = startAge + 9;
      const isCurrent = currentAge >= startAge && currentAge <= endAge;
      const marker = isCurrent ? "★현재★" : "";
      const easyGanji = formatGanjiEasy(d.heavenlyStem, d.earthlyBranch);
      return `${startAge}-${endAge}세: ${easyGanji} ${marker}`;
    })
    .join("\n  ");
}

/**
 * Format future annual list (세운)
 *
 * @param unse - Unse data
 * @param currentYear - Current year
 * @returns Multi-line formatted annual list
 */
export function formatFutureAnnualList(unse: UnseDataForFormat | undefined, currentYear: number): string {
  return (unse?.annual ?? [])
    .filter(isAnnualWithYear)
    .filter((a) => a.year >= currentYear && a.year <= currentYear + 5)
    .map((a) => {
      const isCurrent = a.year === currentYear;
      const marker = isCurrent ? "★현재★" : "";
      const easyGanji = parseGanjiEasy(a.ganji ?? a.name);
      return `${a.year}년: ${easyGanji} ${marker}`;
    })
    .join("\n  ");
}

/**
 * Format future monthly list (월운)
 *
 * @param unse - Unse data
 * @param currentYear - Current year
 * @param currentMonth - Current month
 * @returns Multi-line formatted monthly list
 */
export function formatFutureMonthlyList(
  unse: UnseDataForFormat | undefined,
  currentYear: number,
  currentMonth: number
): string {
  return (unse?.monthly ?? [])
    .filter(isMonthlyWithYearMonth)
    .filter((m) => m.year > currentYear || (m.year === currentYear && m.month >= currentMonth))
    .slice(0, 12)
    .map((m) => {
      const isCurrent = m.year === currentYear && m.month === currentMonth;
      const marker = isCurrent ? "★현재★" : "";
      const easyGanji = parseGanjiEasy(m.ganji ?? m.name);
      return `${m.year}년 ${m.month}월: ${easyGanji} ${marker}`;
    })
    .join("\n  ");
}

/**
 * Format Sinsal (신살) lucky/unlucky lists
 *
 * @param sinsal - Sinsal data
 * @returns Object with lucky and unlucky strings
 */
export function formatSinsalLists(sinsal: SinsalRecord | undefined): {
  lucky: string;
  unlucky: string;
} {
  return {
    lucky: (sinsal?.luckyList ?? [])
      .map((x) => x.name)
      .join(", "),
    unlucky: (sinsal?.unluckyList ?? [])
      .map((x) => x.name)
      .join(", "),
  };
}


/**
 * Format advanced Saju analysis texts
 *
 * @param advancedAnalysis - Advanced analysis data
 * @returns Formatted analysis object
 */
export function formatAdvancedSajuAnalysis(advancedAnalysis: AdvancedAnalysisInput | undefined): {
  strengthText: string;
  geokgukText: string;
  geokgukDesc: string;
  yongsinPrimary: string;
  yongsinSecondary: string;
  yongsinAvoid: string;
  sibsinDistText: string;
  sibsinDominant: string;
  sibsinMissing: string;
  relationshipText: string;
  careerText: string;
  chungText: string;
  hapText: string;
  samhapText: string;
  healthWeak: string;
  suitableCareers: string;
  scoreText: string;
  tonggeunText: string;
  tuechulText: string;
  hoegukText: string;
  deukryeongText: string;
  jonggeokText: string;
  iljuText: string;
  gongmangText: string;
  sibsinDist: Record<string, number>;
} {
  const adv = advancedAnalysis;

  // 신강/신약
  const strengthText = adv?.extended?.strength
    ? `${adv.extended.strength.level} (${adv.extended.strength.score ?? 0}점, 통근${adv.extended.strength.rootCount ?? 0}개)`
    : "-";

  // 격국
  const geokgukText = adv?.geokguk?.type ?? adv?.extended?.geokguk?.type ?? "-";
  const geokgukDesc = adv?.geokguk?.description ?? adv?.extended?.geokguk?.description ?? "";

  // 용신/희신/기신
  const yongsinPrimary = adv?.yongsin?.primary?.element ?? adv?.extended?.yongsin?.primary ?? "-";
  const yongsinSecondary = adv?.yongsin?.secondary?.element ?? adv?.extended?.yongsin?.secondary ?? "-";
  const yongsinAvoid = adv?.yongsin?.avoid?.element ?? adv?.extended?.yongsin?.avoid ?? "-";

  // 십신 분석
  const sibsin = adv?.sibsin;
  const sibsinDist = sibsin?.count ?? sibsin?.distribution ?? sibsin?.counts ?? {};
  const sibsinDistText = Object.entries(sibsinDist)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k}(${v})`)
    .join(", ");
  const sibsinDominant = sibsin?.dominantSibsin?.join?.(", ") ?? sibsin?.dominant ?? sibsin?.primary ?? "-";
  const sibsinMissing = sibsin?.missingSibsin?.join?.(", ") ?? sibsin?.missing?.join?.(", ") ?? "-";

  // 십신 기반 인간관계/직업
  const sibsinRelationships = (sibsin?.relationships ?? []) as SibsinRelation[];
  const sibsinCareerAptitudes = (sibsin?.careerAptitudes ?? []) as CareerAptitude[];
  const relationshipText = Array.isArray(sibsinRelationships)
    ? sibsinRelationships.slice(0, 3).map((r) => `${r.type}:${r.quality ?? r.description ?? ""}`).join("; ")
    : "-";
  const careerText = Array.isArray(sibsinCareerAptitudes)
    ? sibsinCareerAptitudes.slice(0, 4).map((c) => `${c.field}(${c.score ?? 0})`).join(", ")
    : "-";

  // 형충회합
  const hyeongchung = (adv?.hyeongchung ?? {}) as { chung?: BranchInteraction[]; hap?: BranchInteraction[]; samhap?: { branches?: string[] }[] };
  const chungText = hyeongchung.chung?.length
    ? hyeongchung.chung.map((c) => `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`).join(", ")
    : "-";
  const hapText = hyeongchung.hap?.length
    ? hyeongchung.hap.map((h) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}→${h.result ?? ""}`).join(", ")
    : "-";
  const samhapText = hyeongchung.samhap?.length
    ? hyeongchung.samhap.map((s) => s.branches?.join?.("-") ?? "-").join("; ")
    : "-";

  // 건강/직업
  const healthCareer = adv?.healthCareer ?? {};
  const healthWeak = healthCareer.health?.vulnerabilities?.join?.(", ") ?? healthCareer.health?.weakOrgans?.join?.(", ") ?? "-";
  const suitableCareers = healthCareer.career?.suitableFields?.join?.(", ") ?? healthCareer.career?.aptitudes?.join?.(", ") ?? "-";

  // 종합 점수
  const score = adv?.score ?? {};
  const scoreText = score.total ?? score.overall
    ? `총${score.total ?? score.overall}/100 (사업${score.business ?? score.career ?? 0}, 재물${score.wealth ?? score.finance ?? 0}, 건강${score.health ?? 0})`
    : "-";

  // 통근/투출/회국/득령
  const tonggeunText = adv?.tonggeun
    ? `${adv.tonggeun.stem ?? "-"}→${adv.tonggeun.rootBranch ?? "-"} (${adv.tonggeun.strength ?? "-"})`
    : "-";
  const tuechulArr = (adv?.tuechul ?? []) as TuechulItem[];
  const tuechulText = tuechulArr.length
    ? tuechulArr.slice(0, 3).map((t) => `${t.element ?? t.stem}(${t.type ?? "-"})`).join(", ")
    : "-";
  const hoegukArr = (adv?.hoeguk ?? []) as HoegukItem[];
  const hoegukText = hoegukArr.length
    ? hoegukArr.slice(0, 2).map((h) => `${h.type ?? h.name}→${h.resultElement ?? "-"}`).join("; ")
    : "-";
  const deukryeongText = adv?.deukryeong
    ? `${adv.deukryeong.status ?? adv.deukryeong.type ?? "-"} (${adv.deukryeong.score ?? 0}점)`
    : "-";

  // 고급 분석
  const ultra = adv?.ultraAdvanced ?? {};
  const jonggeokText = ultra.jonggeok?.type ?? ultra.jonggeok?.name ?? "";
  const iljuText = ultra.iljuAnalysis?.character ?? ultra.iljuAnalysis?.personality ?? "";
  const gongmangText = ultra.gongmang?.branches?.join?.(", ") ?? ultra.gongmang?.emptyBranches?.join?.(", ") ?? "";

  return {
    strengthText,
    geokgukText,
    geokgukDesc,
    yongsinPrimary,
    yongsinSecondary,
    yongsinAvoid,
    sibsinDistText,
    sibsinDominant,
    sibsinMissing,
    relationshipText,
    careerText,
    chungText,
    hapText,
    samhapText,
    healthWeak,
    suitableCareers,
    scoreText,
    tonggeunText,
    tuechulText,
    hoegukText,
    deukryeongText,
    jonggeokText,
    iljuText,
    gongmangText,
    sibsinDist,
  };
}

/**
 * Format transit list
 *
 * @param transits - Array of transit data
 * @returns Formatted transit string
 */
export function formatSignificantTransits(transits: TransitItem[]): string {
  return transits
    .filter((t) => ["conjunction", "trine", "square", "opposition"].includes(t.type || t.aspectType || ""))
    .slice(0, 8)
    .map((t) => {
      const planet1 = t.transitPlanet ?? t.from?.name ?? "?";
      const planet2 = t.natalPoint ?? t.to?.name ?? "?";
      const aspectType = t.aspectType ?? t.type ?? "?";
      const applyingText = t.isApplying ? "(접근중)" : "(분리중)";
      return `${planet1}-${aspectType}-${planet2} ${applyingText}`;
    })
    .join("; ");
}
