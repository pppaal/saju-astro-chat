/**
 * Structured Fortune Prompt Builder
 * @deprecated Use index.ts for main prompt generation. This file provides structured output format.
 *
 * 리팩토링: @ts-nocheck 제거, 타입 안전성 확보
 */
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine';
import type { AstrologyData, SajuData } from '@/lib/destiny-map/astrology/types';
import { logger } from '@/lib/logger';
import type {
  PillarInput,
  UnseItem,
  AspectItem,
  SinsalItem,
  MonthlyItem,
  TransitItem,
  HoegukItem,
  BranchInteraction,
  SinsalRecord,
  ReturnData,
  ProgressionData,
  DraconicData,
  DraconicAlignment,
  HarmonicsData,
  AsteroidsData,
  AsteroidAspect,
  FixedStarItem,
  EclipsesData,
  ElectionalData,
  MoonPhaseInfo,
  MidpointsData,
  MidpointActivation,
  ExtraPointsData,
  AdvancedAnalysisData,
  StructuredFortuneOutput,
} from '../types';

// Re-export output type
export type { StructuredFortuneOutput };

// ============================================================
// 헬퍼 함수
// ============================================================

function safeGet<T>(value: T | undefined | null, defaultValue: T): T {
  return value ?? defaultValue;
}

function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  return typeof value === 'number' ? value : defaultValue;
}

function safeString(value: string | undefined | null, defaultValue: string = '-'): string {
  return value ?? defaultValue;
}

function formatPillar(p: PillarInput | undefined | null): string | null {
  if (!p) return null;
  const stem = p.heavenlyStem?.name || (p.ganji?.split?.('')?.[0] ?? '');
  const branch = p.earthlyBranch?.name || (p.ganji?.split?.('')?.[1] ?? '');
  return stem && branch ? `${stem}${branch}` : null;
}

function getHarmonicMeaning(h: number): string {
  const meanings: Record<number, string> = {
    5: '창조성/재능',
    7: '영감/직관',
    9: '완성/이상',
  };
  return meanings[h] || '';
}

function formatAsteroidAspects(aspects: AsteroidsData['aspects']): string {
  if (!aspects) return '-';

  if (Array.isArray(aspects)) {
    return aspects.slice(0, 3).map((a: AsteroidAspect) =>
      `${safeString(a.asteroid ?? a.from)}-${safeString(a.type ?? a.aspect)}-${safeString(a.planet ?? a.to)}`
    ).join(', ') || '-';
  }

  if (typeof aspects === 'object') {
    const allAspects: { asteroid: string; type: string; planet: string }[] = [];
    for (const [asteroidName, hits] of Object.entries(aspects)) {
      if (Array.isArray(hits)) {
        for (const hit of hits.slice(0, 2)) {
          allAspects.push({
            asteroid: asteroidName,
            type: safeString(hit.type ?? hit.aspect),
            planet: safeString(hit.planet2?.name ?? hit.to ?? hit.planet),
          });
        }
      }
    }
    return allAspects.slice(0, 3).map(a => `${a.asteroid}-${a.type}-${a.planet}`).join(', ') || '-';
  }

  return '-';
}

// ============================================================
// 테마별 지침
// ============================================================

const THEME_INSTRUCTIONS: Record<string, string> = {
  today: 'Focus on today\'s energy and micro-actions. Give specific timing advice for the day.',
  love: 'Focus on relationships, attraction, and emotional connections. Give date recommendations for romantic activities.',
  career: 'Focus on work, professional growth, and opportunities. Give timing for important meetings, negotiations, or job changes.',
  health: 'Focus on physical and mental wellness. Give timing for starting new health routines or rest periods.',
  wealth: 'Focus on finances, investments, and abundance. Give timing for financial decisions and opportunities.',
  family: 'Focus on family dynamics and relationships. Give timing for family gatherings or important conversations.',
  month: 'Focus on the month\'s overall energy. Give week-by-week date recommendations.',
  year: 'Focus on the year\'s themes. Give month-by-month recommendations for major decisions.',
  newyear: 'Focus on new year prospects. Give quarterly recommendations for the year ahead.',
  life: 'Focus on life purpose and direction. Give timing for major life transitions.',
};

// ============================================================
// 섹션 빌더 함수
// ============================================================

function buildPlanetarySection(planets: PillarInput[], ascendant?: PillarInput, mc?: PillarInput): string {
  const getPlanet = (name: string) => planets.find((p: PillarInput) => p.name === name);
  const sun = getPlanet('Sun');
  const moon = getPlanet('Moon');
  const mercury = getPlanet('Mercury');
  const venus = getPlanet('Venus');
  const mars = getPlanet('Mars');
  const jupiter = getPlanet('Jupiter');
  const saturn = getPlanet('Saturn');
  const uranus = getPlanet('Uranus');
  const neptune = getPlanet('Neptune');
  const pluto = getPlanet('Pluto');
  const northNode = getPlanet('North Node');

  return `=== 기본 행성 배치 ===
Sun: ${safeString(sun?.sign)} ${safeNumber(sun?.degree)}° (House ${safeString(String(sun?.house))})
Moon: ${safeString(moon?.sign)} ${safeNumber(moon?.degree)}° (House ${safeString(String(moon?.house))})
Mercury: ${safeString(mercury?.sign)} (House ${safeString(String(mercury?.house))})
Venus: ${safeString(venus?.sign)} (House ${safeString(String(venus?.house))})
Mars: ${safeString(mars?.sign)} (House ${safeString(String(mars?.house))})
Jupiter: ${safeString(jupiter?.sign)} (House ${safeString(String(jupiter?.house))})
Saturn: ${safeString(saturn?.sign)} (House ${safeString(String(saturn?.house))})
Uranus: ${safeString(uranus?.sign)} (House ${safeString(String(uranus?.house))})
Neptune: ${safeString(neptune?.sign)} (House ${safeString(String(neptune?.house))})
Pluto: ${safeString(pluto?.sign)} (House ${safeString(String(pluto?.house))})
North Node: ${safeString(northNode?.sign)} (House ${safeString(String(northNode?.house))})

=== Angles ===
Ascendant: ${safeString(ascendant?.sign)} ${safeNumber(ascendant?.degree)}°
MC (Midheaven): ${safeString(mc?.sign)} ${safeNumber(mc?.degree)}°`;
}

function buildExtraPointsSection(extraPoints: ExtraPointsData | undefined): string {
  if (!extraPoints) return '-';
  return [
    extraPoints.chiron ? `Chiron: ${extraPoints.chiron.sign} (House ${extraPoints.chiron.house})` : null,
    extraPoints.lilith ? `Lilith: ${extraPoints.lilith.sign} (House ${extraPoints.lilith.house})` : null,
    extraPoints.partOfFortune ? `Part of Fortune: ${extraPoints.partOfFortune.sign} (House ${extraPoints.partOfFortune.house})` : null,
    extraPoints.vertex ? `Vertex: ${extraPoints.vertex.sign} (House ${extraPoints.vertex.house})` : null,
  ].filter(Boolean).join('\n') || '-';
}

function buildSolarReturnSection(solarReturn: ReturnData | undefined, currentYear: number): string {
  if (!solarReturn) return '-';
  return [
    `SR Ascendant: ${safeString(solarReturn.summary?.ascSign ?? solarReturn.summary?.ascendant)}`,
    `SR Sun House: ${safeString(String(solarReturn.summary?.sunHouse))}`,
    `SR Moon: ${safeString(solarReturn.summary?.moonSign)} (House ${safeString(String(solarReturn.summary?.moonHouse))})`,
    `SR Theme: ${safeString(solarReturn.summary?.theme ?? solarReturn.summary?.yearTheme)}`,
  ].join('\n');
}

function buildLunarReturnSection(lunarReturn: ReturnData | undefined): string {
  if (!lunarReturn) return '-';
  return [
    `LR Ascendant: ${safeString(lunarReturn.summary?.ascSign ?? lunarReturn.summary?.ascendant)}`,
    `LR Moon House: ${safeString(String(lunarReturn.summary?.moonHouse))}`,
    `LR Theme: ${safeString(lunarReturn.summary?.theme ?? lunarReturn.summary?.monthTheme)}`,
  ].join('\n');
}

function buildProgressionsSection(progressions: ProgressionData | undefined): string {
  if (!progressions) return '-';
  return [
    `Secondary Progressed Sun: ${safeString(progressions.secondary?.summary?.keySigns?.sun ?? progressions.secondary?.summary?.progressedSun)}`,
    `Secondary Progressed Moon: ${safeString(progressions.secondary?.summary?.keySigns?.moon ?? progressions.secondary?.summary?.progressedMoon)}`,
    `Progressed Moon Phase: ${safeString(progressions.secondary?.moonPhase?.phase)} (${progressions.secondary?.moonPhase?.description ?? ''})`,
    progressions.solarArc ? `Solar Arc Sun: ${safeString(progressions.solarArc.summary?.keySigns?.sun ?? progressions.solarArc.summary?.progressedSun)}` : null,
  ].filter(Boolean).join('\n');
}

function buildDraconicSection(draconic: DraconicData | undefined): string {
  if (!draconic) return '-';
  return [
    `Draconic Sun: ${safeString(draconic.chart?.planets?.find((p: PillarInput) => p.name === 'Sun')?.sign)}`,
    `Draconic Moon: ${safeString(draconic.chart?.planets?.find((p: PillarInput) => p.name === 'Moon')?.sign)}`,
    `Draconic ASC: ${safeString(draconic.chart?.ascendant?.sign)}`,
    draconic.comparison?.alignments ? `Key Alignments: ${draconic.comparison.alignments.slice(0, 3).map((a: DraconicAlignment) => a.description).join('; ')}` : null,
  ].filter(Boolean).join('\n');
}

function buildHarmonicsSection(harmonics: HarmonicsData | undefined): string {
  if (!harmonics) return '-';
  return [
    harmonics.profile?.dominant ? `Dominant Harmonic: H${harmonics.profile.dominant} (${getHarmonicMeaning(harmonics.profile.dominant)})` : null,
    harmonics.profile?.creative ? `Creative Harmonic (H5): ${harmonics.profile.creative?.toFixed?.(1) ?? harmonics.profile.creative}%` : null,
    harmonics.profile?.spiritual ? `Spiritual Harmonic (H9): ${harmonics.profile.spiritual?.toFixed?.(1) ?? harmonics.profile.spiritual}%` : null,
    harmonics.profile?.intuitive ? `Intuitive Harmonic (H7): ${harmonics.profile.intuitive?.toFixed?.(1) ?? harmonics.profile.intuitive}%` : null,
  ].filter(Boolean).join('\n') || '-';
}

function buildAsteroidsSection(asteroids: AsteroidsData | undefined): string {
  if (!asteroids) return '-';
  return [
    asteroids.ceres ? `Ceres (양육): ${asteroids.ceres.sign} (House ${asteroids.ceres.house})` : null,
    asteroids.pallas ? `Pallas (지혜): ${asteroids.pallas.sign} (House ${asteroids.pallas.house})` : null,
    asteroids.juno ? `Juno (관계): ${asteroids.juno.sign} (House ${asteroids.juno.house})` : null,
    asteroids.vesta ? `Vesta (헌신): ${asteroids.vesta.sign} (House ${asteroids.vesta.house})` : null,
    asteroids.aspects ? `Asteroid Aspects: ${formatAsteroidAspects(asteroids.aspects)}` : null,
  ].filter(Boolean).join('\n') || '-';
}

function buildFixedStarsSection(fixedStars: FixedStarItem[] | undefined): string {
  if (!fixedStars?.length) return '-';
  return fixedStars.slice(0, 5).map((fs: FixedStarItem) =>
    `${fs.star} conjunct ${fs.planet} (${fs.meaning ?? ''})`
  ).join('\n');
}

function buildEclipsesSection(eclipses: EclipsesData | undefined): string {
  if (!eclipses) return '-';
  return [
    eclipses.impact ? `Eclipse Impact: ${safeString(eclipses.impact.eclipseType ?? eclipses.impact.type)} eclipse affecting ${safeString(eclipses.impact.affectedPoint ?? eclipses.impact.affectedPlanet, 'natal chart')} - ${eclipses.impact.interpretation ?? ''}` : 'No recent eclipse impact',
    eclipses.upcoming?.length ? `Next Eclipse: ${safeString(eclipses.upcoming[0]?.date)} (${safeString(eclipses.upcoming[0]?.type)})` : null,
  ].filter(Boolean).join('\n');
}

function buildElectionalSection(electional: ElectionalData | undefined): string {
  if (!electional) return '-';
  const moonPhase = electional.moonPhase;
  const moonPhaseStr = typeof moonPhase === 'string'
    ? moonPhase
    : safeString((moonPhase as MoonPhaseInfo)?.phase ?? (moonPhase as MoonPhaseInfo)?.name);
  const illumination = typeof moonPhase === 'object' && moonPhase
    ? ((moonPhase as MoonPhaseInfo).illumination?.toFixed?.(0) ?? '')
    : '';

  return [
    `Moon Phase: ${moonPhaseStr} (${illumination}%)`,
    electional.voidOfCourse ? `Void of Course Moon: ${electional.voidOfCourse.isVoid ? 'YES - avoid important decisions' : 'No'}` : null,
    `Planetary Hour: ${safeString(electional.planetaryHour?.planet)} (${safeString(electional.planetaryHour?.quality ?? electional.planetaryHour?.dayType)})`,
    electional.retrograde?.length ? `Retrograde Planets: ${electional.retrograde.join(', ')}` : 'No retrogrades',
    electional.analysis?.score ? `Overall Score: ${electional.analysis.score}/100 - ${electional.analysis.recommendation ?? ''}` : null,
  ].filter(Boolean).join('\n');
}

function buildMidpointsSection(midpoints: MidpointsData | undefined): string {
  if (!midpoints) return '-';
  return [
    midpoints.sunMoon ? `Sun/Moon Midpoint: ${midpoints.sunMoon.sign} ${safeNumber(midpoints.sunMoon.degree)}° (심리적 통합점)` : null,
    midpoints.ascMc ? `ASC/MC Midpoint: ${midpoints.ascMc.sign} ${safeNumber(midpoints.ascMc.degree)}° (자아 표현점)` : null,
    midpoints.activations?.length ? `Active Midpoints: ${midpoints.activations.slice(0, 3).map((a: MidpointActivation) => a.description).join('; ')}` : null,
  ].filter(Boolean).join('\n') || '-';
}

// ============================================================
// 사주 분석 섹션 빌더
// ============================================================

function buildAdvancedSajuSection(adv: AdvancedAnalysisData | undefined): string {
  if (!adv) return '';

  const sections: string[] = [];

  // 신강/신약
  if (adv.extended?.strength) {
    const s = adv.extended.strength;
    sections.push(`=== 에너지 강도 분석 ===
일간 강도: ${safeString(s.level)} (${safeNumber(s.score)}점)
지지 근: ${safeNumber(s.rootCount ?? s.roots)}개
인비 비율: ${safeNumber(s.supportRatio ?? s.ratio)}%`);
  }

  // 격국
  const geokguk = adv.geokguk ?? adv.extended?.geokguk;
  if (geokguk) {
    const lines = [
      `격국: ${safeString(geokguk.type ?? geokguk.name)}`,
      `등급: ${safeString(geokguk.grade ?? geokguk.level)}`,
    ];
    if (geokguk.description) lines.push(`설명: ${geokguk.description}`);
    if (geokguk.characteristics?.length) lines.push(`특성: ${geokguk.characteristics.join(', ')}`);
    sections.push(`=== 성향 유형 (Chart Pattern) ===\n${lines.join('\n')}`);
  }

  // 용신
  const yongsin = adv.yongsin ?? adv.extended?.yongsin;
  if (yongsin) {
    const lines = [
      `용신: ${safeString(yongsin.primary?.element ?? yongsin.yongsin)} (${safeString(yongsin.primary?.reason ?? yongsin.reason)})`,
    ];
    const secondary = typeof yongsin.secondary === 'string' ? yongsin.secondary : yongsin.secondary?.element;
    if (secondary ?? yongsin.huisin) lines.push(`희신: ${safeString(secondary ?? yongsin.huisin)}`);
    const avoid = typeof yongsin.avoid === 'string' ? yongsin.avoid : yongsin.avoid?.element;
    if (avoid ?? yongsin.gisin) lines.push(`기신: ${safeString(avoid ?? yongsin.gisin)}`);
    if (yongsin.recommendations?.length) lines.push(`권장사항: ${yongsin.recommendations.join(', ')}`);
    sections.push(`=== 핵심 에너지 (Favorable Elements) ===\n${lines.join('\n')}`);
  }

  // 조후용신
  const johu = adv.extended?.johuYongsin ?? adv.extended?.johu;
  if (johu) {
    sections.push(`=== 계절 균형 (Seasonal Balance) ===
조후용신: ${safeString(johu.needed ?? johu.element)} | 계절 밸런스: ${safeString(johu.seasonalBalance ?? johu.balance)}`);
  }

  // 통근
  if (adv.tonggeun) {
    const lines = [
      `통근 점수: ${safeNumber(adv.tonggeun.score ?? adv.tonggeun.strength)}`,
      `통근 상태: ${safeString(adv.tonggeun.status ?? adv.tonggeun.level)}`,
    ];
    if (adv.tonggeun.details || adv.tonggeun.branches) {
      lines.push(`상세: ${JSON.stringify(adv.tonggeun.details ?? adv.tonggeun.branches)}`);
    }
    sections.push(`=== 뿌리 (Root Strength) ===\n${lines.join('\n')}`);
  }

  // 투출
  if (adv.tuechul?.length) {
    const tuechulLines = adv.tuechul.map((t: TransitItem) =>
      `${safeString(t.stem ?? t.gan)} 투출: ${safeString(t.branch ?? t.ji)}에서 (${safeString(t.strength ?? t.level)})`
    );
    sections.push(`=== 표출 (Stem Emergence) ===\n${tuechulLines.join('\n')}`);
  }

  // 회국
  if (adv.hoeguk?.length) {
    const hoegukLines = adv.hoeguk.map((h: HoegukItem) =>
      `${safeString(h.type ?? h.name)}: ${h.branches?.join?.('-') ?? '-'} → ${safeString(h.resultElement ?? h.element)}`
    );
    sections.push(`=== 에너지 결합 (Branch Combinations) ===\n${hoegukLines.join('\n')}`);
  }

  // 득령
  if (adv.deukryeong) {
    const lines = [
      `득령 여부: ${(adv.deukryeong.isDeukryeong ?? adv.deukryeong.status) ? 'YES' : 'NO'}`,
      `계절 기운: ${safeString(adv.deukryeong.seasonalEnergy ?? adv.deukryeong.season)}`,
    ];
    if (adv.deukryeong.explanation ?? adv.deukryeong.description) {
      lines.push(`설명: ${adv.deukryeong.explanation ?? adv.deukryeong.description}`);
    }
    sections.push(`=== 시기 (Seasonal Timing) ===\n${lines.join('\n')}`);
  }

  // 형충회합
  if (adv.hyeongchung) {
    const h = adv.hyeongchung;
    const lines: string[] = [];
    if (h.chung?.length || h.clashes?.length) {
      const items = (h.chung ?? h.clashes ?? []).map((c: BranchInteraction) => c.description ?? `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`);
      lines.push(`충: ${items.join(', ')}`);
    }
    if (h.hyeong?.length || h.punishments?.length) {
      const items = (h.hyeong ?? h.punishments ?? []).map((p: BranchInteraction) => p.description ?? `${p.branch1 ?? p.from}-${p.branch2 ?? p.to}`);
      lines.push(`형: ${items.join(', ')}`);
    }
    if (h.hap?.length || h.combinations?.length) {
      const items = (h.hap ?? h.combinations ?? []).map((c: BranchInteraction) => c.description ?? `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}→${c.result ?? ''}`);
      lines.push(`합: ${items.join(', ')}`);
    }
    if (h.samhap?.length) {
      lines.push(`삼합: ${h.samhap.map(s => s.branches?.join?.('-') ?? s.description).join('; ')}`);
    }
    if (h.banghap?.length) {
      lines.push(`방합: ${h.banghap.map(b => b.branches?.join?.('-') ?? b.description).join('; ')}`);
    }
    if (lines.length) sections.push(`=== 에너지 상호작용 (Interactions) ===\n${lines.join('\n')}`);
  }

  // 십신
  if (adv.sibsin) {
    const s = adv.sibsin;
    const lines: string[] = [];
    const dist = s.distribution ?? s.counts;
    if (dist) lines.push(`십신 분포: ${Object.entries(dist).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    if (s.dominant ?? s.primary) lines.push(`주요 십신: ${safeString(s.dominant ?? s.primary)}`);
    if (s.missing?.length ?? s.absent?.length) lines.push(`결핍 십신: ${(s.missing ?? s.absent ?? []).join(', ')}`);
    if (s.personality ?? s.personalityTraits) lines.push(`성격 특성: ${safeString(s.personality ?? s.personalityTraits)}`);
    if (s.careerAptitude ?? s.careerAptitudes?.length) {
      const career = s.careerAptitude ?? s.careerAptitudes?.join(', ');
      lines.push(`직업 적성: ${safeString(career)}`);
    }
    if (s.relationships ?? s.relationshipStyle) lines.push(`인간관계: ${safeString(s.relationships ?? s.relationshipStyle)}`);
    if (lines.length) sections.push(`=== 에너지 분포 (Energy Distribution) ===\n${lines.join('\n')}`);
  }

  // 건강/직업
  if (adv.healthCareer) {
    const hc = adv.healthCareer;
    const lines: string[] = [];
    const vulns = hc.health?.vulnerabilities ?? hc.health?.weakOrgans;
    if (vulns?.length) lines.push(`건강 취약점: ${vulns.join(', ')}`);
    const strengths = hc.health?.strengths ?? hc.health?.strongOrgans;
    if (strengths?.length) lines.push(`건강 강점: ${strengths.join(', ')}`);
    const careers = hc.career?.suitableFields ?? hc.career?.aptitudes;
    if (careers?.length) lines.push(`적합 직업: ${careers.join(', ')}`);
    if (hc.career?.workStyle) lines.push(`업무 스타일: ${hc.career.workStyle}`);
    if (lines.length) sections.push(`=== 건강/직업 적성 ===\n${lines.join('\n')}`);
  }

  // 종합 점수
  if (adv.score) {
    const sc = adv.score;
    sections.push(`=== 종합 점수 ===
종합 점수: ${safeNumber(sc.total ?? sc.overall)}/100 | 사업운: ${safeNumber(sc.business ?? sc.career)} | 재물운: ${safeNumber(sc.wealth ?? sc.finance)} | 건강운: ${safeNumber(sc.health)} | 인간관계: ${safeNumber(sc.relationships ?? sc.social)}`);
  }

  // Ultra Advanced
  if (adv.ultraAdvanced) {
    const u = adv.ultraAdvanced;
    const lines: string[] = [];
    if (u.jonggeok) lines.push(`종격: ${safeString(u.jonggeok.type ?? u.jonggeok.name)} (${u.jonggeok.description ?? ''})`);
    if (u.hwagyeok) lines.push(`화격: ${safeString(u.hwagyeok.type ?? u.hwagyeok.name)} (${u.hwagyeok.description ?? ''})`);
    if (u.iljuAnalysis) lines.push(`일주론: ${safeString(u.iljuAnalysis.character ?? u.iljuAnalysis.personality)} - ${u.iljuAnalysis.advice ?? u.iljuAnalysis.guidance ?? ''}`);
    if (u.gongmang) lines.push(`공망: ${(u.gongmang.branches ?? u.gongmang.emptyBranches ?? []).join(', ')} (${u.gongmang.impact ?? u.gongmang.interpretation ?? ''})`);
    if (u.samgi) lines.push(`삼기: ${safeString(u.samgi.type ?? u.samgi.name, '없음')} ${(u.samgi.present ?? u.samgi.found) ? '- 발견!' : ''}`);
    if (lines.length) sections.push(`=== 고급 분석 (특수 성향) ===\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

// ============================================================
// 메인 함수
// ============================================================

/**
 * Build structured fortune prompt that returns JSON with date recommendations
 * Includes ALL advanced astrology and saju data (v6.0 - Complete Data Integration)
 */
export function buildStructuredFortunePrompt(
  lang: string,
  theme: string,
  data: CombinedResult
): string {
  const { astrology = {}, saju } = data ?? {};
  const astroData = astrology as AstrologyData | Record<string, unknown>;
  const {
    planets = [],
    aspects = [],
    ascendant,
    mc,
    transits = [],
  } = astroData as AstrologyData;
  const sajuData = (saju ?? {}) as SajuData;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = sajuData;

  const planetsArray = planets as PillarInput[];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Pillars
  const pillarText = [
    formatPillar(pillars?.year as PillarInput),
    formatPillar(pillars?.month as PillarInput),
    formatPillar(pillars?.day as PillarInput),
    formatPillar(pillars?.time as PillarInput),
  ].filter(Boolean).join(' / ') || '-';

  // 운세 흐름
  const unseTyped = unse as { daeun?: UnseItem[]; annual?: UnseItem[]; monthly?: MonthlyItem[] } | undefined;
  const currentDaeun = (unseTyped?.daeun ?? []).find((d: UnseItem) => {
    const now = currentYear;
    return (d.startYear ?? 0) <= now && (d.endYear ?? 9999) >= now;
  });
  const currentAnnual = (unseTyped?.annual ?? []).find((a: UnseItem) => a.year === currentYear);
  const currentMonthly = (unseTyped?.monthly ?? []).find(
    (m: MonthlyItem) => m.year === currentYear && m.month === currentMonth
  );
  const upcomingMonths = (unseTyped?.monthly ?? [])
    .filter((m: MonthlyItem) => {
      if ((m.year ?? 0) > currentYear) return true;
      if (m.year === currentYear && (m.month ?? 0) >= currentMonth) return true;
      return false;
    })
    .slice(0, 6);

  // 신살
  const sinsalData = sinsal as SinsalRecord | undefined;
  const luckyList = (sinsalData?.luckyList ?? []).map((x: SinsalItem) => x.name).join(', ');
  const unluckyList = (sinsalData?.unluckyList ?? []).map((x: SinsalItem) => x.name).join(', ');
  const twelveGods = (sinsalData?.twelveAll ?? []).slice(0, 5).map((x: SinsalItem) => x.name).join(', ');

  // Transits
  const significantTransits = (transits as TransitItem[])
    .filter((t: TransitItem) => ['conjunction', 'trine', 'sextile', 'square', 'opposition'].includes(t.type ?? ''))
    .slice(0, 8);

  // Aspects
  const aspectsArray = aspects as unknown as AspectItem[];
  const majorAspects = aspectsArray
    .filter((a: AspectItem) => ['conjunction', 'trine', 'square', 'opposition', 'sextile'].includes(a.type ?? ''))
    .slice(0, 10)
    .map((a: AspectItem) => `${a.planet1?.name ?? a.from}-${a.type}-${a.planet2?.name ?? a.to}`);

  // Extended data
  const extendedData = data as unknown as Record<string, unknown>;
  const extraPoints = extendedData.extraPoints as ExtraPointsData | undefined;
  const solarReturn = extendedData.solarReturn as ReturnData | undefined;
  const lunarReturn = extendedData.lunarReturn as ReturnData | undefined;
  const progressions = extendedData.progressions as ProgressionData | undefined;
  const draconic = extendedData.draconic as DraconicData | undefined;
  const harmonics = extendedData.harmonics as HarmonicsData | undefined;
  const asteroids = extendedData.asteroids as AsteroidsData | undefined;
  const fixedStars = extendedData.fixedStars as FixedStarItem[] | undefined;
  const eclipses = extendedData.eclipses as EclipsesData | undefined;
  const electional = extendedData.electional as ElectionalData | undefined;
  const midpoints = extendedData.midpoints as MidpointsData | undefined;

  const adv = advancedAnalysis as AdvancedAnalysisData | undefined;
  const dateText = (extendedData.analysisDate as string) ?? new Date().toISOString().slice(0, 10);
  const tzInfo = extendedData.userTimezone ? ` (${extendedData.userTimezone})` : '';
  const instruction = THEME_INSTRUCTIONS[theme] || THEME_INSTRUCTIONS.today;

  return `
[COMPREHENSIVE FORTUNE ANALYSIS v6.0 - ${theme.toUpperCase()}]
Date: ${dateText}${tzInfo}
Locale: ${lang}

===========================================
PART 1: EASTERN DESTINY ANALYSIS
===========================================

=== 기본 정보 ===
Day Master: ${safeString(dayMaster?.name as string | undefined)} (${safeString(dayMaster?.element as string | undefined)})
Four Pillars: ${pillarText}

=== 운세 흐름 (장기/연간/월간) ===
Long-term Flow: ${safeString(currentDaeun?.name)} (${currentDaeun?.startYear ?? ''}-${currentDaeun?.endYear ?? ''})
Annual Flow: ${safeString(currentAnnual?.element)} ${currentAnnual?.year ?? ''}
Monthly Flow: ${safeString(currentMonthly?.element)} ${currentMonthly?.year ?? ''}-${currentMonthly?.month ?? ''}

${buildAdvancedSajuSection(adv)}

=== 특수 에너지 (Lucky/Unlucky Factors) ===
Lucky: ${luckyList || '-'}
Unlucky: ${unluckyList || '-'}
Twelve Gods: ${twelveGods || '-'}

=== 향후 월간 흐름 (Next 6 Months) ===
${upcomingMonths.map((m: MonthlyItem) => `${m.year}-${String(m.month).padStart(2, '0')}: ${safeString(m.element)} (${m.heavenlyStem ?? ''} ${m.earthlyBranch ?? ''})`).join('\n')}

===========================================
PART 2: WESTERN ASTROLOGY (서양 점성술)
===========================================

${buildPlanetarySection(planetsArray, ascendant as PillarInput, mc as PillarInput)}

=== Extra Points (키론, 릴리스 등) ===
${buildExtraPointsSection(extraPoints)}

=== Major Aspects ===
${majorAspects.join('\n') || '-'}

=== Solar Return (연간 차트 - ${currentYear}) ===
${buildSolarReturnSection(solarReturn, currentYear)}

=== Lunar Return (월간 차트) ===
${buildLunarReturnSection(lunarReturn)}

=== Progressions (진행 차트) ===
${buildProgressionsSection(progressions)}

=== Draconic Chart (드라코닉 - 영혼 차트) ===
${buildDraconicSection(draconic)}

=== Harmonics (하모닉 분석) ===
${buildHarmonicsSection(harmonics)}

=== Asteroids (소행성) ===
${buildAsteroidsSection(asteroids)}

=== Fixed Stars (항성) ===
${buildFixedStarsSection(fixedStars)}

=== Eclipses (일/월식 영향) ===
${buildEclipsesSection(eclipses)}

=== Current Transits (현재 트랜짓) ===
${significantTransits.map((t: TransitItem) => `${t.type}: ${t.from?.name ?? '?'} -> ${t.to?.name ?? '?'} (orb: ${t.orb})`).join('\n') || 'No significant transits'}

===========================================
PART 3: ELECTIONAL (택일 분석)
===========================================
${buildElectionalSection(electional)}

===========================================
PART 4: MIDPOINTS (미드포인트)
===========================================
${buildMidpointsSection(midpoints)}

===========================================
TASK: ${theme.toUpperCase()} ANALYSIS
===========================================
${instruction}

IMPORTANT ANALYSIS GUIDELINES:
1. CROSS-REFERENCE both Eastern and Western systems for deeper insights
2. DATE RECOMMENDATIONS should use BOTH systems:
   - Eastern: 오행 흐름, 충/합 관계, 월간/일간 흐름
   - Astrology: 트랜짓, 문페이즈, 보이드오브코스
3. Use the ADVANCED data (성향 유형, 핵심 에너지, 에너지 분포) for personality insights
4. Reference PROGRESSIONS for timing of life developments
5. Use DRACONIC for soul-level/karmic insights
6. Use HARMONICS for creative/spiritual potential
7. Consider ASTEROIDS (Juno for relationships, Ceres for nurturing, etc.)
8. Check FIXED STARS for exceptional talents or challenges
9. Factor in ECLIPSE impacts for major life events
10. Use MIDPOINTS for psychological integration points

You MUST return a valid JSON object with the exact structure specified.
Respond in ${lang} for all text content.
`.trim();
}

/**
 * Parse the structured JSON response from the AI
 */
export function parseStructuredResponse(response: string): StructuredFortuneOutput | null {
  if (typeof response !== 'string' || response.trim().length === 0) {
    return null;
  }

  try {
    const candidates = extractJsonCandidates(response);

    for (let i = candidates.length - 1; i >= 0; i--) {
      const parsed = JSON.parse(candidates[i]);

      if (!parsed.sections || !Array.isArray(parsed.sections)) continue;
      if (!parsed.dateRecommendations) continue;

      return parsed as StructuredFortuneOutput;
    }

    return null;
  } catch (error) {
    logger.error('[parseStructuredResponse] Error:', error);
    return null;
  }
}

function extractJsonCandidates(input: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start >= 0) {
          results.push(input.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }

  return results;
}
