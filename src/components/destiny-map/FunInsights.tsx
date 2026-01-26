/* eslint-disable @typescript-eslint/no-explicit-any */
// This component handles flexible data from multiple API sources with varying shapes
"use client";

import { useMemo, useState, memo } from "react";

// Import Tab Components
import {
  PersonalityTab,
  LoveTab,
  CareerTab,
  FortuneTab,
  HealthTab,
  KarmaTab,
  TimingTab,
  HiddenSelfTab,
  type TabId
} from "./fun-insights/tabs";
import type { TabData } from "./fun-insights/types";
import {
  extractSajuProfile,
  extractAstroProfile,
  calculateMonthlyImportantDates,
  type ImportantDate,
} from "@/lib/destiny-map/destinyCalendar";

// Import data
import {
  elementTraits,
  dayMasterData,
  zodiacData,
  elementKeyMap,
  tianGanMap,
  elementRelations,
  astroToSaju,
  monthElements,
  LIFE_THEMES,
  EMOTION_PATTERNS,
  RELATIONSHIP_STYLES,
  CAREER_DESTINIES,
  generateDestinyChoices,
} from "./fun-insights/data";

// Import helper utilities
import { findPlanetSign } from "./fun-insights/utils";

// Import analyzers
import {
  getSibsinDistribution,
  getSibsinAnalysis,
  getCrossAnalysis,
  getHealthAnalysis,
  getTimeBasedFortune,
  getStrengthsAndWeaknesses,
  getCurrentFlowAnalysis,
  getCurrentTimingAnalysis,
  getLoveAnalysis,
  getCareerAnalysis,
  getKarmaAnalysis,
  getPersonalityAnalysis
} from "./fun-insights/analyzers";

// Import astrology insights
import {
  getChironInsight,
  getPartOfFortuneInsight,
  getVertexInsight,
  getDraconicInsight,
  getHarmonicsInsight,
  getLilithInsight,
  getAsteroidsInsight,
  getFixedStarsInsight,
  getEclipsesInsight
} from "./fun-insights/astrology";

// Import generators
import {
  getRecommendedDates,
  getSimpleRecommendedDates,
  getLuckyItems,
  getPersonalizedAdvice,
  getCombinedLifeTheme
} from "./fun-insights/generators";

// Saju data type definition
interface SajuData {
  dayMaster?: {
    name?: string;
    heavenlyStem?: string;
    element?: string;
  };
  pillars?: {
    year?: { heavenlyStem?: string; earthlyBranch?: string };
    month?: { heavenlyStem?: string; earthlyBranch?: string };
    day?: { heavenlyStem?: string; earthlyBranch?: string };
    time?: { heavenlyStem?: string; earthlyBranch?: string };
  };
  fiveElements?: Record<string, number>;
  sinsal?: {
    luckyList?: Array<{ name: string }>;
    unluckyList?: Array<{ name: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Astro data type definition
interface AstroData {
  planets?: Array<{ name?: string; sign?: string; house?: number; longitude?: number }>;
  houses?: Array<{ index?: number; cusp?: number; sign?: string }>;
  aspects?: Array<{ from?: string; to?: string; type?: string; orb?: number }>;
  ascendant?: { sign?: string };
  [key: string]: unknown;
}

interface Props {
  saju?: SajuData;
  astro?: AstroData;
  lang?: string;
  theme?: string;
  className?: string;
}

function generateReport(saju: unknown, astro: unknown, lang: string, _theme: string): string {
  const isKo = lang === "ko";
  const sajuData = saju as Record<string, any> | undefined;
  const astroData = astro as AstroData | undefined;

  const rawDayMasterName = sajuData?.dayMaster?.name || sajuData?.dayMaster?.heavenlyStem;
  const dayMasterName = rawDayMasterName ? (tianGanMap[rawDayMasterName] || rawDayMasterName) : null;
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null;
  const dayElement = dayMasterInfo?.element;

  const sunSign = findPlanetSign(astroData, "sun");
  const moonSign = findPlanetSign(astroData, "moon");
  const sunData = sunSign ? zodiacData[sunSign] : null;
  const moonData = moonSign ? zodiacData[moonSign] : null;

  const fiveElements = sajuData?.fiveElements || {};
  const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  if (!dayMasterInfo) {
    return isKo ? "사주 데이터를 분석 중입니다..." : "Analyzing Saju data...";
  }

  const report = isKo
    ? `【동양 × 서양 운세 융합 분석】

${dayMasterInfo.hanja}${dayMasterInfo.ko.replace('갑목', '금')}(${dayElement ? elementTraits[dayElement]?.ko : ""}) 일간을 가진 당신은 ${dayMasterInfo.personality.ko}입니다.

${sunData && moonData
  ? `태양 ${sunData.ko}(${sunData.trait.ko})와 달 ${moonData.ko}(${moonData.trait.ko})의 조합으로, 외적으로는 ${sunData.trait.ko} 모습을, 내면에서는 ${moonData.trait.ko} 감성을 지닙니다.`
  : sunData
  ? `태양 ${sunData.ko}의 영향으로 ${sunData.trait.ko} 성향이 드러납니다.`
  : ""}

【오행 밸런스】
${strongest ? `강점: ${elementTraits[strongest[0]]?.ko}(${strongest[1]}%) - ${strongest[0] === "wood" ? "성장과 발전" : strongest[0] === "fire" ? "열정과 표현" : strongest[0] === "earth" ? "안정과 신뢰" : strongest[0] === "metal" ? "결단과 실행" : "지혜와 유연함"}의 에너지가 풍부합니다.` : ""}
${weakest ? `보완점: ${elementTraits[weakest[0]]?.ko}(${weakest[1]}%) - 이 기운을 보완하면 더 균형 잡힌 삶을 살 수 있습니다.` : ""}

${dayMasterInfo.strength.ko}이 장점이며, ${dayMasterInfo.weakness.ko}은 주의가 필요합니다.`

    : `【Eastern × Western Fortune Analysis】

As ${dayMasterInfo.en} (${dayElement ? elementTraits[dayElement]?.en : ""}), you are ${dayMasterInfo.personality.en}.

${sunData && moonData
  ? `With Sun in ${sunData.en} (${sunData.trait.en}) and Moon in ${moonData.en} (${moonData.trait.en}), you show ${sunData.trait.en} externally while feeling ${moonData.trait.en} internally.`
  : sunData
  ? `Sun in ${sunData.en} influences your ${sunData.trait.en} tendencies.`
  : ""}

【Five Elements Balance】
${strongest ? `Strength: ${elementTraits[strongest[0]]?.en} (${strongest[1]}%) - Rich in ${strongest[0] === "wood" ? "growth" : strongest[0] === "fire" ? "passion" : strongest[0] === "earth" ? "stability" : strongest[0] === "metal" ? "decisiveness" : "wisdom"} energy.` : ""}
${weakest ? `To improve: ${elementTraits[weakest[0]]?.en} (${weakest[1]}%) - Boosting this brings better balance.` : ""}

Your strengths are ${dayMasterInfo.strength.en}, while ${dayMasterInfo.weakness.en} needs attention.`;

  return report;
}

// ============================================================
// 메인 컴포넌트
// ============================================================

const FunInsights = memo(function FunInsights({ saju, astro, lang = "ko", theme = "", className = "" }: Props) {
  const isKo = lang === "ko";

  const hasFiveElements = Boolean(saju?.fiveElements && Object.keys(saju.fiveElements).length > 0);
  const hasValidAstro = Boolean(findPlanetSign(astro, "sun"));

  const data = useMemo(() => {
    if (!hasFiveElements && !hasValidAstro) {
      return null;
    }

    const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "갑";
    const dayMasterName = tianGanMap[rawDayMasterName] || rawDayMasterName;
    const dayMasterInfo = dayMasterData[dayMasterName] || dayMasterData["갑"];
    const dayElement = dayMasterInfo.element;

    const fiveElements = saju?.fiveElements || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
    const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));

    const sunSign = findPlanetSign(astro, "sun");
    const moonSign = findPlanetSign(astro, "moon");
    const ascSign = astro?.ascendant?.sign?.toLowerCase() || null;

    return {
      dayMasterName,
      dayMasterInfo,
      dayElement,
      fiveElements,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      sunSign,
      moonSign,
      ascSign,
      crossAnalysis: getCrossAnalysis(saju, astro, lang),
      dates: getRecommendedDates(saju, astro, lang),
      luckyItems: getLuckyItems(saju, lang),
      sibsinAnalysis: getSibsinAnalysis(saju, lang),
      healthAnalysis: getHealthAnalysis(saju, lang),
      report: generateReport(saju, astro, lang, theme),
      // 🔥 새로운 고급 분석 추가
      chironInsight: getChironInsight(astro, lang),
      currentFlow: getCurrentFlowAnalysis(saju, lang),
    };
  }, [saju, astro, lang, theme, hasFiveElements, hasValidAstro]);


  // 운명 서사 생성 - 외부 상수 사용으로 대폭 간소화
  const destinyNarrative = useMemo(() => {
    if (!data) {return null;}

    const dayEl = data.dayElement;
    const strongEl = data.strongest[0];

    return {
      lifeTheme: LIFE_THEMES[data.dayMasterName] || LIFE_THEMES["갑"],
      emotionPattern: EMOTION_PATTERNS[strongEl],
      relationshipStyle: RELATIONSHIP_STYLES[dayEl],
      careerDestiny: CAREER_DESTINIES[strongEl],
    };
  }, [data]);

  // 운명이 풀리는 선택 5가지 - 외부 함수 사용으로 간소화
  const destinyChoices = useMemo(() => {
    if (!data) {return [];}
    return generateDestinyChoices(data.weakest[0], elementTraits, isKo);
  }, [data, isKo]);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabId>('personality');

  // 탭 정의
  const tabs: { id: TabId; label: string; emoji: string }[] = [
    { id: 'personality', label: isKo ? '성격' : 'Personality', emoji: '🌟' },
    { id: 'love', label: isKo ? '연애' : 'Love', emoji: '💕' },
    { id: 'career', label: isKo ? '커리어' : 'Career', emoji: '💼' },
    { id: 'fortune', label: isKo ? '운세' : 'Fortune', emoji: '🔮' },
    { id: 'health', label: isKo ? '건강' : 'Health', emoji: '💪' },
    { id: 'karma', label: isKo ? '카르마' : 'Karma', emoji: '🌌' },
    { id: 'timing', label: isKo ? '타이밍' : 'Timing', emoji: '⏰' },
    { id: 'hidden', label: isKo ? '숨겨진 나' : 'Hidden Self', emoji: '🌑' },
  ];

  // combinedLifeTheme 계산
  const combinedLifeTheme = useMemo(() => {
    return getCombinedLifeTheme(saju, lang);
  }, [saju, lang]);

  // Hooks must be called before conditional returns
  // 오행 정규화 (탭 컴포넌트에 전달할 데이터보다 먼저 정의) - useMemo로 메모이제이션
  const normalizedElements = useMemo(() => {
    if (!data) return [];
    const totalElements = Object.values(data.fiveElements).reduce((a, b) => (a as number) + (b as number), 0) as number;
    return Object.entries(data.fiveElements).map(([el, val]) => ({
      element: el,
      value: totalElements > 0 ? Math.round(((val as number) / totalElements) * 100) : 20,
      raw: val as number,
    })).sort((a, b) => b.value - a.value);
  }, [data]);

  // 탭 컴포넌트에 전달할 데이터 - useMemo로 메모이제이션
  const tabData = useMemo(() => {
    if (!data) return null;
    return {
      dayMasterName: data.dayMasterName,
      dayMasterInfo: data.dayMasterInfo,
      dayElement: data.dayElement,
      fiveElements: data.fiveElements,
      strongest: data.strongest,
      weakest: data.weakest,
      sunSign: data.sunSign,
      moonSign: data.moonSign,
      ascSign: data.ascSign,
      personalityAnalysis: getPersonalityAnalysis(saju, astro, lang),
      loveAnalysis: getLoveAnalysis(saju, astro, lang),
      careerAnalysis: getCareerAnalysis(saju, astro, lang),
      karmaAnalysis: getKarmaAnalysis(saju, astro, lang),
      healthAdvanced: null,
      sibsinAnalysis: data.sibsinAnalysis,
      healthAnalysis: data.healthAnalysis,
      crossAnalysis: data.crossAnalysis,
      currentFlow: data.currentFlow,
      chironInsight: data.chironInsight,
      luckyItems: data.luckyItems,
      normalizedElements, // 오행 균형 차트용
    } as unknown as TabData;
  }, [data, saju, astro, lang, normalizedElements]);

  if (!data) {
    return null;
  }

  const sunData = data.sunSign ? zodiacData[data.sunSign] : null;
  const moonData = data.moonSign ? zodiacData[data.moonSign] : null;

  return (
    <div className={`mt-8 space-y-6 ${className}`}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 운명의 한 줄 요약 - 히어로 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 border border-purple-500/30 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* 운명 한 줄 */}
        <div className="relative mb-6">
          <p className="text-xl md:text-2xl text-gray-100 leading-relaxed font-medium">
            {isKo ? (
              <>
                &quot;<span className="text-amber-400">{data.dayMasterInfo.personality.ko}</span>이 세상에 드러내되,{" "}
                <span className="text-purple-400">{sunData?.ko || "알 수 없음"}</span>의 외면과{" "}
                <span className="text-blue-400">{moonData?.ko || "알 수 없음"}</span>의 내면으로{" "}
                <span className="text-emerald-400">&apos;{destinyNarrative?.lifeTheme?.ko || "나만의 길"}&apos;</span>을 이루는 운명.&quot;
              </>
            ) : (
              <>
                &quot;A <span className="text-amber-400">{data.dayMasterInfo.personality.en}</span> showing to the world,{" "}
                with <span className="text-purple-400">{sunData?.en || "Unknown"}</span> exterior and{" "}
                <span className="text-blue-400">{moonData?.en || "Unknown"}</span> interior,{" "}
                walking the path of <span className="text-emerald-400">&apos;{destinyNarrative?.lifeTheme?.en || "your own way"}&apos;</span>.&quot;
              </>
            )}
          </p>
        </div>

        {/* 핵심 프로필 뱃지 */}
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
            <span className="text-lg">{data.dayMasterInfo.animal}</span>
            <span className="text-amber-300 font-medium">
              {isKo
                ? (data.dayMasterName === "신" ? "보석 같은 사람" :
                   data.dayMasterName === "갑" ? "리더 같은 사람" :
                   data.dayMasterName === "을" ? "유연한 사람" :
                   data.dayMasterName === "병" ? "밝은 사람" :
                   data.dayMasterName === "정" ? "따뜻한 사람" :
                   data.dayMasterName === "무" ? "든든한 사람" :
                   data.dayMasterName === "기" ? "포용적인 사람" :
                   data.dayMasterName === "경" ? "시원시원한 사람" :
                   data.dayMasterName === "임" ? "깊은 사람" :
                   data.dayMasterName === "계" ? "순수한 사람" : "특별한 사람")
                : (data.dayMasterName === "신" ? "Gem-like" :
                   data.dayMasterName === "갑" ? "Leader" :
                   data.dayMasterName === "을" ? "Flexible" :
                   data.dayMasterName === "병" ? "Bright" :
                   data.dayMasterName === "정" ? "Warm" :
                   data.dayMasterName === "무" ? "Solid" :
                   data.dayMasterName === "기" ? "Nurturing" :
                   data.dayMasterName === "경" ? "Decisive" :
                   data.dayMasterName === "임" ? "Deep" :
                   data.dayMasterName === "계" ? "Pure" : "Special")}
            </span>
          </div>
          {sunData && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
              <span className="text-lg">{sunData.emoji}</span>
              <span className="text-purple-300 font-medium">{isKo ? `겉모습: ${sunData.ko}` : `Outer: ${sunData.en}`}</span>
            </div>
          )}
          {moonData && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
              <span className="text-lg">🌙</span>
              <span className="text-blue-300 font-medium">{isKo ? `속마음: ${moonData.ko}` : `Inner: ${moonData.en}`}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: elementTraits[data.strongest[0]]?.bgColor, border: `1px solid ${elementTraits[data.strongest[0]]?.color}` }}>
            <span className="text-lg">{elementTraits[data.strongest[0]]?.emoji}</span>
            <span className="font-medium" style={{ color: elementTraits[data.strongest[0]]?.color }}>
              {isKo ? `많은 쪽: ${elementTraits[data.strongest[0]]?.ko}` : `Strong: ${elementTraits[data.strongest[0]]?.en}`}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: elementTraits[data.weakest[0]]?.bgColor, border: `1px solid ${elementTraits[data.weakest[0]]?.color}` }}>
            <span className="text-lg">{elementTraits[data.weakest[0]]?.emoji}</span>
            <span className="font-medium" style={{ color: elementTraits[data.weakest[0]]?.color }}>
              {isKo ? `부족한 쪽: ${elementTraits[data.weakest[0]]?.ko}` : `Weak: ${elementTraits[data.weakest[0]]?.en}`}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 탭 네비게이션 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-slate-700/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/30 border border-purple-500/50 text-purple-200'
                  : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:text-gray-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 탭 컨텐츠 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'personality' && (
        <PersonalityTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
          combinedLifeTheme={combinedLifeTheme}
        />
      )}

      {activeTab === 'love' && (
        <LoveTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'career' && (
        <CareerTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'fortune' && (
        <FortuneTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'health' && (
        <HealthTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'karma' && (
        <KarmaTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'timing' && (
        <TimingTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {activeTab === 'hidden' && (
        <HiddenSelfTab
          saju={saju}
          astro={astro}
          lang={lang}
          isKo={isKo}
          data={tabData}
          destinyNarrative={destinyNarrative}
        />
      )}

      {/* 푸터 */}
      <p className="text-center text-xs text-gray-500 mt-6">
        {isKo ? "동양+서양 운세 시스템 통합 분석" : "Eastern + Western fortune analysis combined"}
      </p>
    </div>
  );
});

export default FunInsights;
