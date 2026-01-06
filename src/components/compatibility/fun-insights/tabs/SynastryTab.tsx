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
