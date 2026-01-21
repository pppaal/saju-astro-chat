// @ts-nocheck - Complex dynamic structures from external APIs
 
/**
 * Theme-Specific Prompt Sections
 * 테마별 프롬프트 섹션 생성기
 *
 * This module generates detailed analysis sections for different fortune themes:
 * - love (연애/배우자)
 * - career/wealth (직업/재물)
 * - health (건강)
 * - family (가족/인간관계)
 * - today (오늘 운세)
 * - month (이달 운세)
 * - year (올해 운세)
 * - life (인생 종합)
 */

import type { PlanetData } from '@/lib/astrology';
import { formatPillar } from './data-extractors';

// Local type definitions for theme section data
type PlanetaryData = {
  venus?: PlanetData;
  mars?: PlanetData;
  ascendant?: PlanetData;
  sun?: PlanetData;
  moon?: PlanetData;
  mercury?: PlanetData;
  jupiter?: PlanetData;
  saturn?: PlanetData;
  mc?: PlanetData;
  transits?: TransitItem[];
};
type TransitItem = { type?: string; transitPlanet?: string; natalPoint?: string; orb?: string };
type SajuPillars = {
  day?: { earthlyBranch?: { name?: string; element?: string }; heavenlyStem?: { element?: string } };
  year?: { earthlyBranch?: { name?: string }; heavenlyStem?: { name?: string } };
};
type UnseData = { monthly?: MonthlyItem[]; annual?: AnnualItem[]; daeun?: DaeunItem[] };
type MonthlyItem = { year?: number; month?: number; element?: string };
type AnnualItem = { year?: number; element?: string };
type DaeunItem = { element?: string; startAge?: number; endAge?: number };
type SajuData = { pillars?: SajuPillars; unse?: UnseData };
type AsteroidPoint = { sign?: string; house?: number };
type AsteroidsData = { juno?: AsteroidPoint; vertex?: AsteroidPoint; ceres?: AsteroidPoint; vesta?: AsteroidPoint; pallas?: AsteroidPoint };
type ExtraPointsData = { chiron?: { sign?: string; house?: number }; lilith?: { sign?: string; house?: number } };
type DraconicAlignment = { description?: string };
type DraconicData = { chart?: { planets?: PlanetData[]; ascendant?: { sign?: string } }; comparison?: { alignments?: DraconicAlignment[] } };
type AdvancedAstroData = {
  asteroids: AsteroidsData;
  extraPoints: ExtraPointsData;
  solarReturn?: { summary?: { sunHouse?: number; theme?: string } };
  draconic?: DraconicData;
  progressions?: { secondary?: { moonPhase?: { phase?: string } } };
  electional?: { voidOfCourse?: { isVoid?: boolean } };
  midpoints?: { sunMoon?: { sign?: string }; ascMc?: { sign?: string } };
};
type FormattingData = {
  sibsinDist?: Record<string, number>;
  relationshipText?: string;
  lucky?: string;
  unlucky?: string;
  suitableCareers?: string;
  careerText?: string;
  strengthText?: string;
  geokgukText?: string;
  yongsinPrimary?: string;
  healthWeak?: string;
  allDaeunText?: string;
  futureAnnualList?: string;
  futureMonthlyList?: string;
  significantTransits?: string;
  daeunText?: string;
};
type AgeInfo = { currentAge?: number; birthYear?: number };
type TimeInfo = { currentYear: number; currentMonth: number };
type AdvancedData = Record<string, unknown>;

export interface ThemeSectionInput {
  theme: string;
  planetary: PlanetaryData;
  saju: SajuData;
  advanced: AdvancedData;
  advancedAstro: AdvancedAstroData;
  formatting: FormattingData;
  ageInfo: AgeInfo;
  timeInfo: TimeInfo;
}

/**
 * Build love/relationship theme section
 * 연애/배우자 심층 분석 섹션
 */
export function buildLoveSection(input: ThemeSectionInput): string {
  const { planetary, saju, advancedAstro, formatting } = input;
  const { venus, mars, ascendant } = planetary;
  const { pillars } = saju;
  const { juno, vertex } = advancedAstro.asteroids;
  const { sibsinDist, relationshipText } = formatting;
  const { lucky } = formatting;

  return `
═══════════════════════════════════════
💕 연애/배우자 심층 분석 데이터
═══════════════════════════════════════

[동양 배우자 분석]
- 배우자 자리: ${pillars?.day?.earthlyBranch?.name ?? "-"} (${pillars?.day?.earthlyBranch?.element ?? "-"})
- 안정 파트너 에너지(남성): ${(sibsinDist as Record<string, number> | undefined)?.["정재"] ?? 0}개
- 자유 파트너 에너지(남성): ${(sibsinDist as Record<string, number> | undefined)?.["편재"] ?? 0}개
- 안정 파트너 에너지(여성): ${(sibsinDist as Record<string, number> | undefined)?.["정관"] ?? 0}개
- 자유 파트너 에너지(여성): ${(sibsinDist as Record<string, number> | undefined)?.["편관"] ?? 0}개
- 연애 매력: ${lucky.includes("도화") ? "있음 - 이성 인기" : "없음"}
- 강한 끌림: ${lucky.includes("홍염") ? "있음 - 강한 이성 끌림" : "없음"}
- 인간관계 패턴: ${relationshipText}

[점성술 연애 분석]
- Venus(금성): ${venus?.sign ?? "-"} (House ${venus?.house ?? "-"}) - 연애 스타일/취향
- Mars(화성): ${mars?.sign ?? "-"} (House ${mars?.house ?? "-"}) - 성적 매력/끌림
- 7th House(결혼/파트너): 커스프 확인 필요
- Juno(결혼 소행성): ${juno ? `${juno.sign} (House ${juno.house})` : "-"}
- Vertex(운명적 만남): ${vertex ? `${vertex.sign} (House ${vertex.house})` : "-"}
- 5th House(연애/로맨스): 확인 필요
- 8th House(깊은 결합): 확인 필요

[배우자 성향 추론 근거]
- 배우자 자리 오행 → 배우자 기질
- 금성 사인 → 끌리는 타입
- 7하우스 사인 → 배우자 외적 특성
- Juno 사인 → 결혼 파트너 이상형

[연령대 추론 근거]
- 금성 사인 (염소/토성 영향 → 연상 선호)
- 토성-달 각도 → 관계 안정성 선호
- 1하우스 토성 → 성숙한 파트너 선호

[만남 장소 추론 근거]
- 금성 하우스 위치
- 11하우스 (친구/네트워크 소개)
- 6하우스 (직장)
- 9하우스 (해외/학업)
`;
}

/**
 * Build career/wealth theme section
 * 직업/재물 심층 분석 섹션
 */
export function buildCareerWealthSection(input: ThemeSectionInput): string {
  const { planetary, formatting, advancedAstro } = input;
  const { mc, saturn, jupiter } = planetary;
  const { geokgukText, geokgukDesc, yongsinPrimary, yongsinSecondary, yongsinAvoid, careerText, suitableCareers, sibsinDist } = formatting;

  return `
═══════════════════════════════════════
💼 직업/재물 심층 분석 데이터
═══════════════════════════════════════

[동양 직업 분석]
- 성향 유형: ${geokgukText} - ${geokgukDesc}
- 핵심 에너지: ${yongsinPrimary} (보조: ${yongsinSecondary}, 주의: ${yongsinAvoid})
- 직장 에너지: 안정(${(sibsinDist as Record<string, number> | undefined)?.["정관"] ?? 0}), 도전(${(sibsinDist as Record<string, number> | undefined)?.["편관"] ?? 0})
- 재물 에너지: 안정(${(sibsinDist as Record<string, number> | undefined)?.["정재"] ?? 0}), 투자(${(sibsinDist as Record<string, number> | undefined)?.["편재"] ?? 0})
- 창의 에너지: 표현(${(sibsinDist as Record<string, number> | undefined)?.["식신"] ?? 0}), 혁신(${(sibsinDist as Record<string, number> | undefined)?.["상관"] ?? 0})
- 적합 직업: ${careerText}
- 업계 추천: ${suitableCareers}

[점성술 직업 분석]
- MC(천정/직업): ${mc?.sign ?? "-"}
- 10th House(사회적 지위): MC 사인 참조
- Saturn(책임/구조): ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"})
- Jupiter(확장/기회): ${jupiter?.sign ?? "-"} (House ${jupiter?.house ?? "-"})
- 2nd House(수입): 확인 필요
- 6th House(일상 업무): 확인 필요
`;
}

/**
 * Build health theme section
 * 건강 심층 분석 섹션
 */
export function buildHealthSection(input: ThemeSectionInput): string {
  const { planetary, formatting, advancedAstro } = input;
  const { mars, saturn } = planetary;
  const { healthWeak, yongsinPrimary } = formatting;
  const { chiron } = advancedAstro.extraPoints;
  const elementRatios = planetary.facts?.elementRatios;
  const { dayMaster } = input.saju;

  return `
═══════════════════════════════════════
🏥 건강 심층 분석 데이터
═══════════════════════════════════════

[사주 건강 분석]
- 오행 균형: ${elementRatios ? Object.entries(elementRatios).map(([k, v]) => `${k}:${(v as number).toFixed?.(1) ?? v}`).join(", ") : "-"}
- 부족 오행: ${yongsinPrimary} → 이 오행 관련 장기 주의
- 건강 취약점: ${healthWeak}
- 일간 체질: ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"})

[오행별 건강 연관]
- 木(목): 간, 담, 눈, 근육, 손톱
- 火(화): 심장, 소장, 혀, 혈관
- 土(토): 비장, 위장, 입술, 살
- 金(금): 폐, 대장, 코, 피부, 털
- 水(수): 신장, 방광, 귀, 뼈, 치아

[점성술 건강 분석]
- 6th House(건강/질병): 해당 사인 참조
- Mars(화성): ${mars?.sign ?? "-"} (House ${mars?.house ?? "-"}) - 에너지/염증
- Saturn(토성): ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"}) - 만성질환/뼈
- Chiron(카이론): ${chiron ? `${chiron.sign} (House ${chiron.house})` : "-"} - 상처/치유

[해석 가이드]
- 부족 오행 → 해당 장기 보강 필요
- 과다 오행 → 해당 장기 과부하 주의
- Chiron 하우스 → 건강 트라우마 영역
`;
}

/**
 * Build family theme section
 * 가족/인간관계 심층 분석 섹션
 */
export function buildFamilySection(input: ThemeSectionInput): string {
  const { planetary, saju, formatting, advancedAstro } = input;
  const { moon, saturn, mc } = planetary;
  const { pillars } = saju;
  const { relationshipText, sibsinDist } = formatting;
  const { ceres } = advancedAstro.asteroids;

  return `
═══════════════════════════════════════
👨‍👩‍👧 가족/인간관계 심층 분석 데이터
═══════════════════════════════════════

[사주 가족 분석]
- 년주(조상/외부): ${formatPillar(pillars?.year) ?? "-"}
- 월주(부모/형제): ${formatPillar(pillars?.month) ?? "-"}
- 일주(배우자/자신): ${formatPillar(pillars?.day) ?? "-"}
- 시주(자녀/말년): ${formatPillar(pillars?.time) ?? "-"}
- 인간관계 패턴: ${relationshipText}
- 비겁(형제자매): ${(sibsinDist as Record<string, number> | undefined)?.["비견"] ?? 0} + ${(sibsinDist as Record<string, number> | undefined)?.["겁재"] ?? 0}개
- 인성(부모/스승): ${(sibsinDist as Record<string, number> | undefined)?.["정인"] ?? 0} + ${(sibsinDist as Record<string, number> | undefined)?.["편인"] ?? 0}개
- 식상(자녀/표현): ${(sibsinDist as Record<string, number> | undefined)?.["식신"] ?? 0} + ${(sibsinDist as Record<string, number> | undefined)?.["상관"] ?? 0}개

[점성술 가족 분석]
- 4th House(가정/어머니): IC 사인 참조
- 10th House(아버지/권위): MC ${mc?.sign ?? "-"}
- Moon(달): ${moon?.sign ?? "-"} (House ${moon?.house ?? "-"}) - 감정/어머니
- Saturn(토성): ${saturn?.sign ?? "-"} (House ${saturn?.house ?? "-"}) - 아버지/제한
- 5th House(자녀): 해당 사인 참조
- Ceres(케레스): ${ceres ? `${ceres.sign} (House ${ceres.house})` : "-"} - 양육

[해석 가이드]
- 월주 충돌 → 부모와의 갈등
- 4하우스 긴장 → 가정 환경 이슈
- 인성 부족 → 정서적 지지 부족
`;
}

/**
 * Build today fortune section
 * 오늘 운세 분석 섹션
 */
export function buildTodaySection(input: ThemeSectionInput): string {
  const { planetary, saju, formatting, advancedAstro } = input;
  const { moon } = planetary;
  const { unse, dayMaster } = saju;
  const { currentYear, currentMonth } = input.timeInfo;
  const significantTransits = formatting.significantTransits;

  const currentMonthly = (unse?.monthly ?? []).find((m: MonthlyItem) =>
    m.year === currentYear && m.month === currentMonth
  );

  const lunarReturnText = advancedAstro.lunarReturn ? [
    `LR ASC: ${advancedAstro.lunarReturn.summary?.ascSign ?? advancedAstro.lunarReturn.summary?.ascendant ?? "-"}`,
    `LR Moon House: ${advancedAstro.lunarReturn.summary?.moonHouse ?? "-"}`,
    `Month Theme: ${advancedAstro.lunarReturn.summary?.theme ?? advancedAstro.lunarReturn.summary?.monthTheme ?? "-"}`,
  ].join("; ") : "-";

  return `
═══════════════════════════════════════
📅 오늘의 운세 분석 데이터
═══════════════════════════════════════

[오늘의 사주 흐름]
- 현재 월운: ${currentMonthly?.ganji ?? "-"} (${currentMonthly?.element ?? "-"})
- 일간과의 관계: ${dayMaster?.name ?? "-"} vs 오늘 천간
- 오늘의 에너지: 일간 기준 십신 확인

[오늘의 점성술 흐름]
- Current Transits: ${significantTransits || "-"}
- Lunar Return 월간 테마: ${lunarReturnText}
- 달 위치: ${moon?.sign ?? "-"} - 오늘의 감정/직관

[해석 가이드]
- 트랜짓 조화 → 순조로운 하루
- 트랜짓 긴장 → 도전적인 하루
- 달 사인 → 오늘의 감정 톤
`;
}

/**
 * Build month fortune section
 * 이달 운세 분석 섹션
 */
export function buildMonthSection(input: ThemeSectionInput): string {
  const { saju, formatting, advancedAstro, timeInfo } = input;
  const { unse, dayMaster } = saju;
  const { currentYear, currentMonth } = timeInfo;
  const significantTransits = formatting.significantTransits;
  const futureMonthlyList = formatting.futureMonthlyList;

  const currentMonthly = (unse?.monthly ?? []).find((m: MonthlyItem) =>
    m.year === currentYear && m.month === currentMonth
  );

  const lunarReturnText = advancedAstro.lunarReturn ? [
    `LR ASC: ${advancedAstro.lunarReturn.summary?.ascSign ?? advancedAstro.lunarReturn.summary?.ascendant ?? "-"}`,
    `LR Moon House: ${advancedAstro.lunarReturn.summary?.moonHouse ?? "-"}`,
    `Month Theme: ${advancedAstro.lunarReturn.summary?.theme ?? advancedAstro.lunarReturn.summary?.monthTheme ?? "-"}`,
  ].join("; ") : "-";

  return `
═══════════════════════════════════════
📆 이달의 운세 분석 데이터
═══════════════════════════════════════

[이달의 사주 흐름]
- 현재 월운: ${currentMonthly?.ganji ?? "-"} (${currentMonthly?.element ?? "-"})
- 일간과의 관계: ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"}) vs ${currentMonthly?.element ?? "-"}
- 향후 월운 흐름:
  ${futureMonthlyList || "데이터 없음"}

[이달의 점성술 흐름]
- Lunar Return: ${lunarReturnText}
- 월간 테마: Lunar Return ASC와 Moon House 확인
- Current Transits: ${significantTransits || "-"}

[해석 가이드]
- 월운 오행이 용신과 같으면 → 좋은 달
- 월운 오행이 기신과 같으면 → 주의 필요
- LR Moon House → 이달의 감정적 초점
`;
}

/**
 * Build year fortune section
 * 올해 운세 분석 섹션
 */
export function buildYearSection(input: ThemeSectionInput): string {
  const { saju, formatting, advancedAstro, timeInfo } = input;
  const { unse, dayMaster } = saju;
  const { currentYear } = timeInfo;
  const { daeunText, futureAnnualList } = formatting;

  const currentAnnual = (unse?.annual ?? []).find((a: MonthlyItem) => a.year === currentYear);

  const solarReturnText = advancedAstro.solarReturn ? [
    `SR ASC: ${advancedAstro.solarReturn.summary?.ascSign ?? advancedAstro.solarReturn.summary?.ascendant ?? "-"}`,
    `SR Sun House: ${advancedAstro.solarReturn.summary?.sunHouse ?? "-"}`,
    `SR Moon: ${advancedAstro.solarReturn.summary?.moonSign ?? "-"} (H${advancedAstro.solarReturn.summary?.moonHouse ?? "-"})`,
    `Year Theme: ${advancedAstro.solarReturn.summary?.theme ?? advancedAstro.solarReturn.summary?.yearTheme ?? "-"}`,
  ].join("; ") : "-";

  const progressionsText = advancedAstro.progressions ? [
    `Progressed Sun: ${advancedAstro.progressions.secondary?.summary?.keySigns?.sun ?? advancedAstro.progressions.secondary?.summary?.progressedSun ?? "-"}`,
    `Progressed Moon: ${advancedAstro.progressions.secondary?.summary?.keySigns?.moon ?? advancedAstro.progressions.secondary?.summary?.progressedMoon ?? "-"}`,
    `Moon Phase: ${advancedAstro.progressions.secondary?.moonPhase?.phase ?? "-"}`,
    advancedAstro.progressions.solarArc ? `Solar Arc Sun: ${advancedAstro.progressions.solarArc.summary?.keySigns?.sun ?? advancedAstro.progressions.solarArc.summary?.progressedSun ?? "-"}` : null,
  ].filter(Boolean).join("; ") : "-";

  return `
═══════════════════════════════════════
🗓️ 올해의 운세 분석 데이터
═══════════════════════════════════════

[올해의 사주 흐름]
- ${currentYear}년 세운: ${currentAnnual?.ganji ?? "-"} (${currentAnnual?.element ?? "-"})
- 현재 대운: ${daeunText}
- 일간과의 관계: ${dayMaster?.name ?? "-"} (${dayMaster?.element ?? "-"}) vs ${currentAnnual?.element ?? "-"}
- 향후 연운:
  ${futureAnnualList || "데이터 없음"}

[올해의 점성술 흐름]
- Solar Return: ${solarReturnText}
- SR 태양 하우스 → 올해의 핵심 테마
- SR ASC → 올해의 페르소나
- Progressions: ${progressionsText}
- Progressed Moon Phase → 인생 주기

[해석 가이드]
- 세운이 용신이면 → 발전의 해
- 세운이 기신이면 → 정리/인내의 해
- SR Sun House → 올해 집중해야 할 영역
- Progressed Moon → 현재 인생 단계
`;
}

/**
 * Build life comprehensive section
 * 인생 종합 분석 섹션
 */
export function buildLifeSection(input: ThemeSectionInput): string {
  const { planetary, formatting, advancedAstro } = input;
  const { northNode, pluto } = planetary;
  const { allDaeunText, geokgukText, geokgukDesc, yongsinPrimary, yongsinAvoid, sibsinDominant, sibsinMissing } = formatting;
  const { chiron } = advancedAstro.extraPoints;

  const draconicText = advancedAstro.draconic ? [
    `Draconic Sun: ${advancedAstro.draconic.chart?.planets?.find((p: MonthlyItem) => p.name === "Sun")?.sign ?? "-"}`,
    `Draconic Moon: ${advancedAstro.draconic.chart?.planets?.find((p: MonthlyItem) => p.name === "Moon")?.sign ?? "-"}`,
    `Draconic ASC: ${advancedAstro.draconic.chart?.ascendant?.sign ?? "-"}`,
    advancedAstro.draconic.comparison?.alignments?.length ? `Alignments: ${advancedAstro.draconic.comparison.alignments.slice(0, 2).map((a: MonthlyItem) => a.description).join("; ")}` : null,
  ].filter(Boolean).join("; ") : "-";

  return `
═══════════════════════════════════════
🌟 인생 종합 분석 데이터
═══════════════════════════════════════

[인생 전체 대운 흐름]
${allDaeunText || "데이터 없음"}

[핵심 인생 포인트]
- 격국(성향): ${geokgukText} - ${geokgukDesc}
- 용신(필요): ${yongsinPrimary} | 기신(주의): ${yongsinAvoid}
- 강점: ${sibsinDominant}
- 보완점: ${sibsinMissing}

[점성술 인생 분석]
- North Node(노스노드): ${northNode?.sign ?? "-"} (House ${northNode?.house ?? "-"}) - 영혼의 목적
- Chiron(카이론): ${chiron ? `${chiron.sign} (House ${chiron.house})` : "-"} - 상처와 치유
- Pluto(명왕성): ${pluto?.sign ?? "-"} (House ${pluto?.house ?? "-"}) - 변환
- Draconic Chart: ${draconicText}

[해석 가이드]
- 대운 전환점 → 인생 변곡점
- North Node House → 이번 생의 과제
- Chiron House → 치유해야 할 영역
- Draconic → 영혼 레벨의 목적
`;
}

/**
 * Build theme-specific section based on theme parameter
 *
 * @param theme - Theme identifier
 * @param input - All required data for section building
 * @returns Formatted theme section or empty string
 */
export function buildThemeSection(theme: string, input: ThemeSectionInput): string {
  switch (theme) {
    case "love":
      return buildLoveSection(input);
    case "career":
    case "wealth":
      return buildCareerWealthSection(input);
    case "health":
      return buildHealthSection(input);
    case "family":
      return buildFamilySection(input);
    case "today":
      return buildTodaySection(input);
    case "month":
      return buildMonthSection(input);
    case "year":
      return buildYearSection(input);
    case "life":
      return buildLifeSection(input);
    default:
      return "";
  }
}
