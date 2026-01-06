"use client";

import type { TabProps } from '../types';
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard';

export default function ChemistryTab({ data, isKo }: TabProps) {
  const { persons, tenGods, shinsals, synastry } = data;

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1');
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2');

  // Ten God relationship interpretation
  const tenGodRelationship = tenGods?.relationshipDynamics || (isKo ? '분석 중...' : 'Analyzing...');

  return (
    <div className="space-y-6">
      {/* Chemistry Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-rose-900/30 to-slate-900 border border-rose-500/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <span className="text-6xl mb-4 block">💞</span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">
            {isKo ? '두 분의 케미스트리' : 'Your Chemistry'}
          </h2>
          <p className="text-rose-300 text-lg">
            {tenGodRelationship}
          </p>
        </div>
      </div>

      {/* Ten Gods Analysis */}
      <InsightCard emoji="☯️" title={isKo ? "십성 궁합 분석" : "Ten Gods Compatibility"} colorTheme="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Person 1's Ten Gods */}
          <InsightContent colorTheme="amber">
            <p className="text-amber-300 font-bold mb-2">{person1Name}</p>
            <div className="flex flex-wrap gap-2">
              {tenGods?.person1Primary?.map((tg, idx) => (
                <Badge key={idx} text={tg} colorTheme="amber" />
              )) || <span className="text-gray-400 text-sm">{isKo ? '데이터 분석 중' : 'Analyzing...'}</span>}
            </div>
          </InsightContent>

          {/* Person 2's Ten Gods */}
          <InsightContent colorTheme="amber">
            <p className="text-amber-300 font-bold mb-2">{person2Name}</p>
            <div className="flex flex-wrap gap-2">
              {tenGods?.person2Primary?.map((tg, idx) => (
                <Badge key={idx} text={tg} colorTheme="amber" />
              )) || <span className="text-gray-400 text-sm">{isKo ? '데이터 분석 중' : 'Analyzing...'}</span>}
            </div>
          </InsightContent>
        </div>

        {/* Interaction */}
        <div className="space-y-3">
          {tenGods?.interaction?.supports?.map((support, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <p className="text-gray-200 text-sm">{support}</p>
            </div>
          ))}
          {tenGods?.interaction?.conflicts?.map((conflict, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-orange-400 mt-0.5">!</span>
              <p className="text-gray-200 text-sm">{conflict}</p>
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Shinsal (Special Stars) */}
      <InsightCard emoji="✨" title={isKo ? "신살 상호작용" : "Special Stars Interaction"} colorTheme="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Person 1's Shinsals */}
          <InsightContent colorTheme="purple">
            <p className="text-purple-300 font-bold mb-2">{person1Name}{isKo ? '의 신살' : "'s Stars"}</p>
            <div className="flex flex-wrap gap-2">
              {shinsals?.person1Shinsals?.map((ss, idx) => (
                <Badge key={idx} text={ss} colorTheme="purple" size="sm" />
              )) || <span className="text-gray-400 text-sm">{isKo ? '분석 중' : 'Analyzing'}</span>}
            </div>
          </InsightContent>

          {/* Person 2's Shinsals */}
          <InsightContent colorTheme="purple">
            <p className="text-purple-300 font-bold mb-2">{person2Name}{isKo ? '의 신살' : "'s Stars"}</p>
            <div className="flex flex-wrap gap-2">
              {shinsals?.person2Shinsals?.map((ss, idx) => (
                <Badge key={idx} text={ss} colorTheme="purple" size="sm" />
              )) || <span className="text-gray-400 text-sm">{isKo ? '분석 중' : 'Analyzing'}</span>}
            </div>
          </InsightContent>
        </div>

        {/* Lucky Interactions */}
        {shinsals?.luckyInteractions && shinsals.luckyInteractions.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-emerald-300 font-medium text-sm">{isKo ? '🍀 길한 상호작용' : '🍀 Lucky Interactions'}</p>
            {shinsals.luckyInteractions.map((interaction, idx) => (
              <InsightContent key={idx} colorTheme="emerald">
                <p className="text-gray-200 text-sm">{interaction}</p>
              </InsightContent>
            ))}
          </div>
        )}

        {/* Unlucky Interactions */}
        {shinsals?.unluckyInteractions && shinsals.unluckyInteractions.length > 0 && (
          <div className="space-y-2">
            <p className="text-orange-300 font-medium text-sm">{isKo ? '⚠️ 주의할 상호작용' : '⚠️ Points to Watch'}</p>
            {shinsals.unluckyInteractions.map((interaction, idx) => (
              <InsightContent key={idx} colorTheme="orange">
                <p className="text-gray-200 text-sm">{interaction}</p>
              </InsightContent>
            ))}
          </div>
        )}
      </InsightCard>

      {/* Romantic Chemistry (from Synastry) */}
      <InsightCard emoji="💖" title={isKo ? "로맨틱 케미스트리" : "Romantic Chemistry"} colorTheme="pink">
        <ScoreBar
          label={isKo ? "감정적 연결" : "Emotional Connection"}
          score={synastry?.emotionalConnection || 65}
          colorTheme="pink"
        />
        <ScoreBar
          label={isKo ? "로맨틱 끌림" : "Romantic Attraction"}
          score={synastry?.romanticConnection || 70}
          colorTheme="pink"
        />
        <ScoreBar
          label={isKo ? "지적 교감" : "Intellectual Bond"}
          score={synastry?.intellectualConnection || 60}
          colorTheme="pink"
        />

        <div className="mt-4 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
          <p className="text-gray-200 text-sm leading-relaxed">
            {synastry?.romanticConnection && synastry.romanticConnection >= 75
              ? (isKo ? '강렬한 로맨틱 끌림이 있어 서로에게 매력을 느낍니다. 처음 만났을 때부터 특별한 연결을 느꼈을 수 있습니다.' : 'There is strong romantic chemistry between you. You may have felt a special connection from the very beginning.')
              : synastry?.romanticConnection && synastry.romanticConnection >= 50
              ? (isKo ? '자연스러운 로맨틱 조화가 있습니다. 시간이 지날수록 깊어지는 관계입니다.' : 'There is natural romantic harmony. Your relationship deepens over time.')
              : (isKo ? '로맨틱한 면보다는 우정이나 동반자적 관계에 강합니다.' : 'Your bond is stronger in friendship and companionship than pure romance.')}
          </p>
        </div>
      </InsightCard>

      {/* Overall Chemistry Assessment */}
      <InsightCard emoji="💫" title={isKo ? "케미 종합 평가" : "Chemistry Summary"} colorTheme="rose">
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-rose-500/20 border border-rose-500/30">
            <span className="text-3xl">
              {shinsals?.overallImpact === 'very_positive' ? '🌟' :
               shinsals?.overallImpact === 'positive' ? '✨' :
               shinsals?.overallImpact === 'neutral' ? '💫' : '⚡'}
            </span>
            <span className="text-rose-300 font-bold text-lg">
              {shinsals?.overallImpact === 'very_positive' ? (isKo ? '매우 좋은 케미!' : 'Excellent Chemistry!') :
               shinsals?.overallImpact === 'positive' ? (isKo ? '좋은 케미' : 'Good Chemistry') :
               shinsals?.overallImpact === 'neutral' ? (isKo ? '무난한 케미' : 'Moderate Chemistry') :
               (isKo ? '노력이 필요한 케미' : 'Chemistry Needs Work')}
            </span>
          </div>
        </div>
      </InsightCard>
    </div>
  );
}
