"use client";

import type { TabProps } from '../types';

export function FusionTab({ data, isKo }: TabProps) {
  const cross = data.crossSystemAnalysis;
  const name1 = data.persons?.[0]?.name || (isKo ? '첫째' : 'Person 1');
  const name2 = data.persons?.[1]?.name || (isKo ? '둘째' : 'Person 2');

  if (!cross) {
    return (
      <div className="text-center py-8 text-gray-400">
        {isKo
          ? '사주와 점성술 데이터가 모두 필요합니다.'
          : 'Both Saju and Astrology data are required.'}
      </div>
    );
  }

  // Generate continuous flowing analysis text
  const analysisLines: string[] = [];
  if (isKo) {
    analysisLines.push(`${name1}님과 ${name2}님의 동서양 융합 궁합 분석 결과입니다.`);
    analysisLines.push(`동서융합 궁합 점수: ${cross.crossSystemScore}점/100 — 사주(동양)와 점성술(서양)을 교차 분석한 종합 점수입니다.`);
    if (cross.dayMasterSunAnalysis?.person1?.description) {
      analysisLines.push(`${name1}님의 일간-태양 분석: ${cross.dayMasterSunAnalysis.person1.description}`);
    }
    if (cross.dayMasterSunAnalysis?.person2?.description) {
      analysisLines.push(`${name2}님의 일간-태양 분석: ${cross.dayMasterSunAnalysis.person2.description}`);
    }
    if (cross.dayMasterSunAnalysis?.crossHarmony?.interpretation) {
      analysisLines.push(`교차 조화 해석: ${cross.dayMasterSunAnalysis.crossHarmony.interpretation}`);
    }
    const emotionalRes = cross.monthBranchMoonAnalysis?.emotionalResonance || 0;
    if (emotionalRes > 0) {
      analysisLines.push(`월지-달 별자리 감정적 공명도: ${emotionalRes}% — ${emotionalRes >= 70 ? '감정적으로 깊이 공명하여 서로를 직관적으로 이해합니다.' : '감정적 교류를 의식적으로 노력하면 더 깊어질 수 있습니다.'}`);
    }
    if (cross.monthBranchMoonAnalysis?.interpretation?.length > 0) {
      analysisLines.push(...cross.monthBranchMoonAnalysis.interpretation.slice(0, 2));
    }
    const completionScore = cross.elementFusionAnalysis?.mutualCompletion?.completionScore || 0;
    if (completionScore > 0) {
      analysisLines.push(`오행-행성원소 상호 보완 점수: ${completionScore}% — ${completionScore >= 70 ? '서로에게 필요한 에너지를 채워줄 수 있는 이상적인 조합입니다.' : '일부 에너지를 서로 보완하며 균형을 잡을 수 있습니다.'}`);
    }
    if (cross.elementFusionAnalysis?.interpretation?.length > 0) {
      analysisLines.push(...cross.elementFusionAnalysis.interpretation.slice(0, 2));
    }
    if (cross.pillarPlanetCorrespondence?.fusionReading) {
      analysisLines.push(cross.pillarPlanetCorrespondence.fusionReading);
    }
    if (cross.fusionInsights?.length > 0) {
      analysisLines.push(...cross.fusionInsights.slice(0, 3));
    }
  } else {
    analysisLines.push(`East-West fusion analysis for ${name1} and ${name2}.`);
    analysisLines.push(`Fusion score: ${cross.crossSystemScore}/100 — combining Saju (Eastern) and Astrology (Western).`);
    if (cross.dayMasterSunAnalysis?.crossHarmony?.interpretation) {
      analysisLines.push(`Cross harmony: ${cross.dayMasterSunAnalysis.crossHarmony.interpretation}`);
    }
    const emotionalRes = cross.monthBranchMoonAnalysis?.emotionalResonance || 0;
    if (emotionalRes > 0) {
      analysisLines.push(`Emotional resonance: ${emotionalRes}% — ${emotionalRes >= 70 ? 'deep intuitive understanding.' : 'intentional effort deepens the connection.'}`);
    }
    const completionScore = cross.elementFusionAnalysis?.mutualCompletion?.completionScore || 0;
    if (completionScore > 0) {
      analysisLines.push(`Mutual completion: ${completionScore}% — ${completionScore >= 70 ? 'ideal combination fulfilling each other\'s needs.' : 'partial complementarity with room to grow.'}`);
    }
    if (cross.pillarPlanetCorrespondence?.fusionReading) {
      analysisLines.push(cross.pillarPlanetCorrespondence.fusionReading);
    }
    if (cross.fusionInsights?.length > 0) {
      analysisLines.push(...cross.fusionInsights.slice(0, 3));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
          {isKo ? '🔮 동서양 융합 궁합' : '🔮 East-West Fusion'}
        </h3>
        <p className="text-sm text-gray-400">
          {isKo
            ? '사주(동양)와 점성술(서양)을 교차 분석한 결과'
            : 'Cross-analysis of Saju (Eastern) and Astrology (Western)'}
        </p>
      </div>

      {/* Continuous Analysis Text */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          {isKo ? '동서융합 상세 분석' : 'Detailed Fusion Analysis'}
        </h3>
        <div className="space-y-3">
          {analysisLines.map((line, idx) => (
            <p key={idx} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Cross Score */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-300">
            {isKo ? '동서융합 궁합 점수' : 'Fusion Score'}
          </span>
          <span className="text-3xl font-bold text-purple-300">
            {cross.crossSystemScore}
            <span className="text-lg text-gray-400">/100</span>
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full transition-all duration-1000"
            style={{ width: `${cross.crossSystemScore}%` }}
          />
        </div>
      </div>

      {/* Day Master × Sun Sign */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-purple-300 mb-4">
          {isKo ? '☀️ 일간 × 태양 별자리' : '☀️ Day Master × Sun Sign'}
        </h4>

        {/* Individual Analyses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm text-gray-300">{cross.dayMasterSunAnalysis.person1.description}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm text-gray-300">{cross.dayMasterSunAnalysis.person2.description}</p>
          </div>
        </div>

        {/* Cross Harmony */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 border border-purple-500/20">
          <p className="text-gray-200 leading-relaxed">
            {cross.dayMasterSunAnalysis.crossHarmony.interpretation}
          </p>
        </div>
      </div>

      {/* Month Branch × Moon Sign */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-blue-300 mb-4">
          {isKo ? '🌙 월지 × 달 별자리' : '🌙 Month Branch × Moon Sign'}
        </h4>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <div className="text-center px-3 py-2 bg-slate-900/50 rounded-lg">
            <span className="text-xl">{cross.monthBranchMoonAnalysis.person1MonthBranch}</span>
            <p className="text-xs text-gray-500">{name1} {isKo ? '월지' : 'Month'}</p>
          </div>
          <span className="text-gray-500">↔</span>
          <div className="text-center px-3 py-2 bg-slate-900/50 rounded-lg">
            <span className="text-xl capitalize">{cross.monthBranchMoonAnalysis.person2MoonSign}</span>
            <p className="text-xs text-gray-500">{name2} {isKo ? '달' : 'Moon'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-400">
            {isKo ? '감정적 공명도' : 'Emotional Resonance'}
          </span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              style={{ width: `${cross.monthBranchMoonAnalysis.emotionalResonance}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-blue-300">
            {cross.monthBranchMoonAnalysis.emotionalResonance}%
          </span>
        </div>

        {cross.monthBranchMoonAnalysis.interpretation.map((text, i) => (
          <p key={i} className="text-gray-300 text-sm mb-2 leading-relaxed">{text}</p>
        ))}
      </div>

      {/* Element Fusion */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-green-300 mb-4">
          {isKo ? '🧩 오행 × 행성원소 융합' : '🧩 Five Elements × Planetary Elements'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-300 mb-2">{name1}</p>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-green-400">{isKo ? '강한 기운:' : 'Strong:'}</span>{' '}
                {cross.elementFusionAnalysis.person1.sajuDominant.join(', ') || '-'}
              </p>
              <p>
                <span className="text-red-400">{isKo ? '약한 기운:' : 'Weak:'}</span>{' '}
                {cross.elementFusionAnalysis.person1.sajuWeak.join(', ') || '-'}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-300 mb-2">{name2}</p>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-green-400">{isKo ? '강한 기운:' : 'Strong:'}</span>{' '}
                {cross.elementFusionAnalysis.person2.sajuDominant.join(', ') || '-'}
              </p>
              <p>
                <span className="text-red-400">{isKo ? '약한 기운:' : 'Weak:'}</span>{' '}
                {cross.elementFusionAnalysis.person2.sajuWeak.join(', ') || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Mutual Completion */}
        <div className="bg-gradient-to-r from-green-900/20 to-teal-900/20 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {isKo ? '상호 보완 점수' : 'Mutual Completion'}
            </span>
            <span className="font-semibold text-green-300">
              {cross.elementFusionAnalysis.mutualCompletion.completionScore}%
            </span>
          </div>

          {(cross.elementFusionAnalysis.mutualCompletion.p1NeedsFromP2.length > 0 ||
            cross.elementFusionAnalysis.mutualCompletion.p2NeedsFromP1.length > 0) && (
            <p className="text-xs text-gray-400 mb-3">
              {isKo ? '서로에게 필요한 에너지를 채워줄 수 있어요' : 'You can fulfill each other\'s needs'}
            </p>
          )}

          {cross.elementFusionAnalysis.interpretation.map((text, i) => (
            <p key={i} className="text-gray-200 text-sm mb-2 leading-relaxed">{text}</p>
          ))}
        </div>
      </div>

      {/* Pillar-Planet Correspondence */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-orange-300 mb-4">
          {isKo ? '🌌 기둥 × 행성 대응' : '🌌 Pillar × Planet Correspondence'}
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {/* Year-Jupiter */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🪐</div>
            <p className="text-xs text-gray-400">{isKo ? '년주 × 목성' : 'Year × Jupiter'}</p>
            <p className="text-sm font-semibold text-yellow-300">
              {Math.round(cross.pillarPlanetCorrespondence.yearPillarJupiter.harmony)}%
            </p>
          </div>

          {/* Month-Moon */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🌙</div>
            <p className="text-xs text-gray-400">{isKo ? '월주 × 달' : 'Month × Moon'}</p>
            <p className="text-sm font-semibold text-blue-300">
              {Math.round(cross.pillarPlanetCorrespondence.monthPillarMoon.harmony)}%
            </p>
          </div>

          {/* Day-Sun */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">☀️</div>
            <p className="text-xs text-gray-400">{isKo ? '일주 × 태양' : 'Day × Sun'}</p>
            <p className="text-sm font-semibold text-orange-300">
              {Math.round(cross.pillarPlanetCorrespondence.dayPillarSun.harmony)}%
            </p>
          </div>

          {/* Time-Mercury */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">☿️</div>
            <p className="text-xs text-gray-400">{isKo ? '시주 × 수성' : 'Time × Mercury'}</p>
            <p className="text-sm font-semibold text-cyan-300">
              {Math.round(cross.pillarPlanetCorrespondence.timePillarMercury.harmony)}%
            </p>
          </div>

          {/* Venus */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">💕</div>
            <p className="text-xs text-gray-400">{isKo ? '금성 (연애)' : 'Venus (Love)'}</p>
            <p className="text-sm font-semibold text-pink-300">
              {Math.round(cross.pillarPlanetCorrespondence.venusRelationship.harmony)}%
            </p>
          </div>

          {/* Mars */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🔥</div>
            <p className="text-xs text-gray-400">{isKo ? '화성 (열정)' : 'Mars (Passion)'}</p>
            <p className="text-sm font-semibold text-red-300">
              {Math.round(cross.pillarPlanetCorrespondence.marsEnergy.harmony)}%
            </p>
          </div>
        </div>

        {/* Venus & Mars Details */}
        <div className="space-y-2 text-sm">
          <p className="text-gray-300">💕 {cross.pillarPlanetCorrespondence.venusRelationship.description}</p>
          <p className="text-gray-300">🔥 {cross.pillarPlanetCorrespondence.marsEnergy.description}</p>
        </div>

        {/* Overall Reading */}
        <div className="mt-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-lg p-4 border border-orange-500/20">
          <p className="text-gray-200 leading-relaxed">
            {cross.pillarPlanetCorrespondence.fusionReading}
          </p>
        </div>
      </div>

      {/* Fusion Insights Summary */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-xl p-5 border border-indigo-500/30">
        <h4 className="text-lg font-semibold text-indigo-300 mb-4">
          {isKo ? '✨ 동서융합 핵심 인사이트' : '✨ Key Fusion Insights'}
        </h4>
        <div className="space-y-3">
          {cross.fusionInsights.map((insight, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-indigo-400 shrink-0">•</span>
              <p className="text-gray-200 text-sm leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FusionTab;
