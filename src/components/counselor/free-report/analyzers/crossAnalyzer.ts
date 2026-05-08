import { elementTraits, dayMasterData, zodiacData, elementKeyMap, tianGanMap, elementRelations, astroToSaju } from '../data';
import { findPlanetSign } from '../utils';
import type { SajuData, AstroData } from '../types';
import { getMatrixAnalysis } from './matrixAnalyzer';

export function getCrossAnalysis(saju: SajuData | undefined, astro: AstroData | undefined, lang: string): { title: string; insight: string; emoji: string; summary?: string }[] {
  const insights: { title: string; insight: string; emoji: string; summary?: string }[] = [];
  const isKo = lang === "ko";

  const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem;
  const dayMasterName = rawDayMasterName ? (tianGanMap[rawDayMasterName] || rawDayMasterName) : null;
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null;
  const dayElement = dayMasterInfo?.element || (saju?.dayMaster?.element ? elementKeyMap[saju.dayMaster.element] : null);

  const sunSign = findPlanetSign(astro, "sun");
  const moonSign = findPlanetSign(astro, "moon");
  const sunData = sunSign ? zodiacData[sunSign] : null;
  const moonData = moonSign ? zodiacData[moonSign] : null;

  // 사주 일간 × 태양 사인 - 외적 성격 조합
  if (dayMasterInfo && sunData && dayElement) {
    const astroEl = astroToSaju[sunData.element] || sunData.element;
    const isHarmony = dayElement === astroEl ||
      elementRelations.generates[dayElement] === astroEl ||
      elementRelations.supportedBy[dayElement] === astroEl;

    insights.push({
      emoji: isHarmony ? "✨" : "🔄",
      title: isKo ? `기본 성격과 겉모습` : `Inner Nature & Outer Self`,
      summary: isKo
        ? `${dayMasterInfo.ko} + ${sunData.ko}`
        : `${dayMasterInfo.en} + ${sunData.en}`,
      insight: isKo
        ? `【기본】 ${dayMasterInfo.personality.ko}\n【겉모습】 ${sunData.trait.ko} 느낌\n【조합】 ${isHarmony ? "두 성향이 자연스럽게 어울려요." : "상황에 따라 다른 모습을 보여줘요."}`
        : `【Base】 ${dayMasterInfo.personality.en}\n【Outer】 ${sunData.trait.en} vibe\n【Mix】 ${isHarmony ? "Both blend naturally." : "You show different sides in different situations."}`
    });
  }

  // 오행 × 달 사인 (감정/내면)
  if (saju?.fiveElements && moonData) {
    const sorted = Object.entries(saju.fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));
    const strongestEl = sorted[0][0];
    const strongestInfo = elementTraits[strongestEl];

    // 오행별 감정 특성
    const elementEmotions: Record<string, { ko: string; en: string }> = {
      wood: { ko: "추진력 있고 성장 지향적인", en: "driven and growth-oriented" },
      fire: { ko: "열정적이고 표현력 강한", en: "passionate and expressive" },
      earth: { ko: "안정적이고 신뢰감 있는", en: "stable and trustworthy" },
      metal: { ko: "결단력 있고 분명한", en: "decisive and clear" },
      water: { ko: "유연하고 직관적인", en: "flexible and intuitive" },
    };

    insights.push({
      emoji: "🌙",
      title: isKo ? `속마음과 감정` : `Inner Feelings & Emotions`,
      summary: isKo
        ? `${strongestInfo?.ko || strongestEl} + ${moonData.ko}`
        : `${strongestInfo?.en || strongestEl} + ${moonData.en}`,
      insight: isKo
        ? `【기본】 ${elementEmotions[strongestEl]?.ko} 성향\n【감정】 ${moonData.trait.ko} 느낌\n【조합】 속마음은 이 두 가지가 섞여 있어요.`
        : `【Base】 ${elementEmotions[strongestEl]?.en} tendency\n【Emotion】 ${moonData.trait.en} feelings\n【Mix】 Your inner self is a blend of both.`
    });
  }

  // Destiny Fusion Matrix™ 시너지 분석 추가
  const matrixAnalysis = getMatrixAnalysis(saju, astro, lang);
  if (matrixAnalysis && matrixAnalysis.synergy) {
    const { synergy } = matrixAnalysis;
    const topFusions = matrixAnalysis.elementFusions
      .filter(f => f.fusion.score >= 7)
      .slice(0, 2);

    if (topFusions.length > 0) {
      const fusionTexts = topFusions.map(f =>
        isKo
          ? `${f.sajuElement} × ${f.westElement}: ${f.fusion.keyword.ko}`
          : `${f.sajuElement} × ${f.westElement}: ${f.fusion.keyword.en}`
      ).join('\n');

      const topStrength = synergy.topStrengths[0];
      const emoji = topStrength?.icon || "🔮";

      insights.push({
        emoji,
        title: isKo ? '운명 융합 시너지' : 'Destiny Fusion Synergy',
        summary: isKo ? synergy.dominantEnergy.ko : synergy.dominantEnergy.en,
        insight: isKo
          ? `【에너지】 ${synergy.dominantEnergy.ko}\n【핵심 융합】\n${fusionTexts}\n【종합점수】 ${synergy.overallScore}점`
          : `【Energy】 ${synergy.dominantEnergy.en}\n【Key Fusions】\n${fusionTexts}\n【Overall Score】 ${synergy.overallScore}`
      });
    }
  }

  return insights;
}
