"use client";

import type { TabProps } from '../types';
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard';

export default function SynastryTab({ data, isKo }: TabProps) {
  const { persons, aspects, synastry, compositeChart, person1Astro, person2Astro } = data;

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1');
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2');

  // Aspect type colors
  const aspectColors: Record<string, { emoji: string; color: string }> = {
    conjunction: { emoji: '⚪', color: 'purple' },
    sextile: { emoji: '🔵', color: 'blue' },
    trine: { emoji: '🟢', color: 'emerald' },
    square: { emoji: '🟠', color: 'orange' },
    opposition: { emoji: '🔴', color: 'red' },
  };

  // Generate continuous flowing analysis text
  const analysisLines: string[] = [];
  if (isKo) {
    analysisLines.push(`${person1Name}님과 ${person2Name}님의 점성학적 시너지 분석 결과입니다.`);
    const emotional = synastry?.emotionalConnection || 65;
    const romantic = synastry?.romanticConnection || 70;
    const intellectual = synastry?.intellectualConnection || 60;
    analysisLines.push(`감정적 연결 ${emotional}점, 로맨틱 끌림 ${romantic}점, 지적 교감 ${intellectual}점으로 분석되었습니다.`);
    if (emotional >= 75) {
      analysisLines.push('감정적 연결이 매우 강합니다. 서로의 기쁨과 슬픔을 직관적으로 느끼며, 깊은 공감대를 형성합니다.');
    } else if (emotional >= 50) {
      analysisLines.push('감정적으로 안정된 교류가 가능하며, 시간이 지나면서 더 깊은 이해를 쌓아갈 수 있습니다.');
    }
    if (person1Astro?.sun?.sign && person2Astro?.sun?.sign) {
      analysisLines.push(`${person1Name}님의 태양은 ${person1Astro.sun.sign}, ${person2Name}님의 태양은 ${person2Astro.sun.sign}에 위치합니다.`);
    }
    if (person1Astro?.moon?.sign && person2Astro?.moon?.sign) {
      analysisLines.push(`달 별자리를 보면, ${person1Name}님은 ${person1Astro.moon.sign}, ${person2Name}님은 ${person2Astro.moon.sign}으로 감정 표현 방식에 차이가 있을 수 있습니다.`);
    }
    if (person1Astro?.venus?.sign && person2Astro?.venus?.sign) {
      analysisLines.push(`사랑의 행성 금성은 ${person1Name}님이 ${person1Astro.venus.sign}, ${person2Name}님이 ${person2Astro.venus.sign}에 있어 연애 스타일의 특징을 보여줍니다.`);
    }
    const harmoniousCount = aspects?.harmoniousCount || 0;
    const challengingCount = aspects?.challengingCount || 0;
    analysisLines.push(`주요 애스펙트 분석: 조화 ${harmoniousCount}개, 도전 ${challengingCount}개가 발견되었습니다. ${harmoniousCount > challengingCount ? '조화로운 애스펙트가 더 많아 전반적으로 순탄한 관계가 기대됩니다.' : harmoniousCount === challengingCount ? '균형 잡힌 관계로, 조화와 도전이 공존합니다.' : '도전적 애스펙트가 많지만 이를 통해 서로 성장할 수 있습니다.'}`);
    if (aspects?.majorAspects && aspects.majorAspects.length > 0) {
      const firstAspect = aspects.majorAspects[0];
      analysisLines.push(`주요 애스펙트: ${firstAspect.planet1} ↔ ${firstAspect.planet2} (${firstAspect.type}) — ${firstAspect.interpretation || (firstAspect.isHarmonious ? '조화로운 에너지' : '도전적 에너지')}`);
    }
    if (compositeChart?.coreTheme) {
      analysisLines.push(`합성 차트의 핵심 테마: ${compositeChart.coreTheme}`);
    }
    if (compositeChart?.relationshipPurpose) {
      analysisLines.push(compositeChart.relationshipPurpose);
    }
    const longevity = compositeChart?.longevityPotential || 70;
    analysisLines.push(`장기 지속 가능성 점수는 ${longevity}점으로, ${longevity >= 75 ? '오래도록 함께할 수 있는 강한 기반을 가지고 있습니다.' : '노력과 소통으로 관계를 더욱 굳건히 할 수 있습니다.'}`);
    if (synastry?.strengths && synastry.strengths.length > 0) {
      analysisLines.push(`관계의 강점: ${synastry.strengths.slice(0, 3).join(', ')}`);
    }
    if (synastry?.challenges && synastry.challenges.length > 0) {
      analysisLines.push(`주의할 점: ${synastry.challenges.slice(0, 2).join(', ')}`);
    }
  } else {
    analysisLines.push(`Astrological synastry analysis for ${person1Name} and ${person2Name}.`);
    const emotional = synastry?.emotionalConnection || 65;
    const romantic = synastry?.romanticConnection || 70;
    analysisLines.push(`Emotional: ${emotional}, Romantic: ${romantic}, Intellectual: ${synastry?.intellectualConnection || 60}.`);
    if (person1Astro?.sun?.sign && person2Astro?.sun?.sign) {
      analysisLines.push(`${person1Name}'s Sun in ${person1Astro.sun.sign}, ${person2Name}'s Sun in ${person2Astro.sun.sign}.`);
    }
    if (person1Astro?.venus?.sign && person2Astro?.venus?.sign) {
      analysisLines.push(`Venus placements: ${person1Name} in ${person1Astro.venus.sign}, ${person2Name} in ${person2Astro.venus.sign} — shaping love styles.`);
    }
    const harmoniousCount = aspects?.harmoniousCount || 0;
    const challengingCount = aspects?.challengingCount || 0;
    analysisLines.push(`Aspects: ${harmoniousCount} harmonious, ${challengingCount} challenging. ${harmoniousCount > challengingCount ? 'A generally smooth relationship.' : 'Growth through challenges.'}`);
    if (compositeChart?.coreTheme) {
      analysisLines.push(`Composite chart theme: ${compositeChart.coreTheme}`);
    }
    if (synastry?.strengths && synastry.strengths.length > 0) {
      analysisLines.push(`Strengths: ${synastry.strengths.slice(0, 3).join(', ')}`);
    }
    if (synastry?.challenges && synastry.challenges.length > 0) {
      analysisLines.push(`Challenges: ${synastry.challenges.slice(0, 2).join(', ')}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Synastry Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 border border-purple-500/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <span className="text-5xl mb-4 block">✨</span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">
            {isKo ? '점성학적 시너지 분석' : 'Astrological Synastry'}
          </h2>
          <p className="text-purple-300">
            {isKo ? '별들이 말하는 두 분의 연결' : 'What the stars say about your connection'}
          </p>
        </div>

        {/* Connection Scores */}
        <div className="relative grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <div className="text-2xl font-bold text-pink-300">{synastry?.emotionalConnection || 65}</div>
            <div className="text-xs text-gray-400 mt-1">{isKo ? '감정' : 'Emotional'}</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-2xl font-bold text-rose-300">{synastry?.romanticConnection || 70}</div>
            <div className="text-xs text-gray-400 mt-1">{isKo ? '로맨틱' : 'Romantic'}</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-300">{synastry?.intellectualConnection || 60}</div>
            <div className="text-xs text-gray-400 mt-1">{isKo ? '지적' : 'Mental'}</div>
          </div>
        </div>
      </div>

      {/* Continuous Analysis Text */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          {isKo ? '시너지 상세 분석' : 'Detailed Synastry Analysis'}
        </h3>
        <div className="space-y-3">
          {analysisLines.map((line, idx) => (
            <p key={idx} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Planetary Positions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Person 1 Planets */}
        <InsightCard emoji="🌟" title={`${person1Name}${isKo ? '의 행성' : "'s Planets"}`} colorTheme="amber">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-amber-500/10">
              <span className="text-amber-300">☀️ {isKo ? '태양' : 'Sun'}</span>
              <Badge text={person1Astro?.sun?.sign || '?'} colorTheme="amber" size="sm" />
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10">
              <span className="text-blue-300">🌙 {isKo ? '달' : 'Moon'}</span>
              <Badge text={person1Astro?.moon?.sign || '?'} colorTheme="blue" size="sm" />
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-pink-500/10">
              <span className="text-pink-300">💗 {isKo ? '금성' : 'Venus'}</span>
              <Badge text={person1Astro?.venus?.sign || '?'} colorTheme="pink" size="sm" />
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10">
              <span className="text-red-300">🔥 {isKo ? '화성' : 'Mars'}</span>
              <Badge text={person1Astro?.mars?.sign || '?'} colorTheme="red" size="sm" />
            </div>
          </div>
        </InsightCard>

        {/* Person 2 Planets */}
        <InsightCard emoji="🌟" title={`${person2Name}${isKo ? '의 행성' : "'s Planets"}`} colorTheme="purple">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-lg bg-amber-500/10">
              <span className="text-amber-300">☀️ {isKo ? '태양' : 'Sun'}</span>
              <Badge text={person2Astro?.sun?.sign || '?'} colorTheme="amber" size="sm" />
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10">
              <span className="text-blue-300">🌙 {isKo ? '달' : 'Moon'}</span>
              <Badge text={person2Astro?.moon?.sign || '?'} colorTheme="blue" size="sm" />
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-pink-500/10">
              <span className="text-pink-300">💗 {isKo ? '금성' : 'Venus'}</span>
              <Badge text={person2Astro?.venus?.sign || '?'} colorTheme="pink" size="sm" />
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10">
              <span className="text-red-300">🔥 {isKo ? '화성' : 'Mars'}</span>
              <Badge text={person2Astro?.mars?.sign || '?'} colorTheme="red" size="sm" />
            </div>
          </div>
        </InsightCard>
      </div>

      {/* Major Aspects */}
      <InsightCard emoji="🔮" title={isKo ? "주요 행성 애스펙트" : "Major Planetary Aspects"} colorTheme="indigo">
        <div className="grid grid-cols-5 gap-2 mb-4 text-center text-xs">
          {Object.entries(aspectColors).map(([type, { emoji, color }]) => (
            <div key={type} className={`p-2 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
              <span>{emoji}</span>
              <p className={`text-${color}-300 mt-1 capitalize`}>
                {type === 'conjunction' ? (isKo ? '합' : 'Conj') :
                 type === 'sextile' ? (isKo ? '육분' : 'Sext') :
                 type === 'trine' ? (isKo ? '삼분' : 'Trine') :
                 type === 'square' ? (isKo ? '사분' : 'Sqr') :
                 (isKo ? '대립' : 'Opp')}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {aspects?.majorAspects?.slice(0, 6).map((aspect, idx) => {
            const { emoji, color } = aspectColors[aspect.type] || { emoji: '⚪', color: 'gray' };
            return (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                <span className="text-xl">{emoji}</span>
                <div className="flex-1">
                  <p className="text-gray-200 text-sm font-medium">
                    {aspect.planet1} ↔ {aspect.planet2}
                  </p>
                  <p className="text-gray-400 text-xs">{aspect.interpretation}</p>
                </div>
                <Badge
                  text={aspect.isHarmonious ? (isKo ? '조화' : 'Harmony') : (isKo ? '도전' : 'Challenge')}
                  colorTheme={aspect.isHarmonious ? 'emerald' : 'orange'}
                  size="sm"
                />
              </div>
            );
          }) || (
            <p className="text-gray-400 text-sm text-center py-4">
              {isKo ? '애스펙트 분석 중...' : 'Analyzing aspects...'}
            </p>
          )}
        </div>

        {/* Aspect Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-2xl font-bold text-emerald-300">{aspects?.harmoniousCount || 0}</div>
            <div className="text-xs text-gray-400">{isKo ? '조화 애스펙트' : 'Harmonious'}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="text-2xl font-bold text-orange-300">{aspects?.challengingCount || 0}</div>
            <div className="text-xs text-gray-400">{isKo ? '도전 애스펙트' : 'Challenging'}</div>
          </div>
        </div>
      </InsightCard>

      {/* Key Insights */}
      {aspects?.keyInsights && aspects.keyInsights.length > 0 && (
        <InsightCard emoji="💡" title={isKo ? "핵심 인사이트" : "Key Insights"} colorTheme="cyan">
          <div className="space-y-3">
            {aspects.keyInsights.map((insight, idx) => (
              <InsightContent key={idx} colorTheme="cyan">
                <p className="text-gray-200 text-sm leading-relaxed">{insight}</p>
              </InsightContent>
            ))}
          </div>
        </InsightCard>
      )}

      {/* Composite Chart */}
      <InsightCard emoji="🌌" title={isKo ? "합성 차트 분석" : "Composite Chart"} colorTheme="purple">
        <div className="text-center mb-4">
          <p className="text-purple-300 font-medium">
            {compositeChart?.coreTheme || (isKo ? '관계의 핵심 테마' : 'Core Relationship Theme')}
          </p>
        </div>

        <InsightContent colorTheme="purple">
          <p className="text-gray-200 text-sm leading-relaxed mb-4">
            {compositeChart?.relationshipPurpose || (isKo
              ? '두 분이 함께하는 이유와 관계의 목적을 나타냅니다.'
              : 'This represents the purpose and meaning of your relationship.')}
          </p>

          <ScoreBar
            label={isKo ? '장기 지속 가능성' : 'Longevity Potential'}
            score={compositeChart?.longevityPotential || 70}
            colorTheme="purple"
          />
        </InsightContent>

        {/* Strengths & Growth Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {compositeChart?.strengths && compositeChart.strengths.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-300 font-medium mb-2">{isKo ? '💪 강점' : '💪 Strengths'}</p>
              <ul className="space-y-1">
                {compositeChart.strengths.map((s, idx) => (
                  <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {compositeChart?.growthAreas && compositeChart.growthAreas.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 font-medium mb-2">{isKo ? '🌱 성장 영역' : '🌱 Growth Areas'}</p>
              <ul className="space-y-1">
                {compositeChart.growthAreas.map((g, idx) => (
                  <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </InsightCard>

      {/* Synastry Strengths & Challenges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {synastry?.strengths && synastry.strengths.length > 0 && (
          <InsightCard emoji="💖" title={isKo ? "관계의 강점" : "Relationship Strengths"} colorTheme="pink">
            <div className="space-y-2">
              {synastry.strengths.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-pink-500/10">
                  <span className="text-pink-400">✓</span>
                  <p className="text-gray-200 text-sm">{s}</p>
                </div>
              ))}
            </div>
          </InsightCard>
        )}

        {synastry?.challenges && synastry.challenges.length > 0 && (
          <InsightCard emoji="⚡" title={isKo ? "도전 과제" : "Challenges to Overcome"} colorTheme="orange">
            <div className="space-y-2">
              {synastry.challenges.map((c, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10">
                  <span className="text-orange-400">!</span>
                  <p className="text-gray-200 text-sm">{c}</p>
                </div>
              ))}
            </div>
          </InsightCard>
        )}
      </div>
    </div>
  );
}
