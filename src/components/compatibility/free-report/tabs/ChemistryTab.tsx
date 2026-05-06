"use client";

import type { TabProps } from '../types';
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard';

export default function ChemistryTab({ data, isKo }: TabProps) {
  const { persons, tenGods, shinsals, synastry } = data;

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1');
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2');

  // Ten God relationship interpretation
  const tenGodRelationship = tenGods?.relationshipDynamics || (isKo ? '분석 중...' : 'Analyzing...');

  // Generate continuous flowing analysis text
  const analysisLines: string[] = [];
  if (isKo) {
    analysisLines.push(`${person1Name}님과 ${person2Name}님의 케미스트리 분석 결과입니다.`);
    if (tenGodRelationship && tenGodRelationship !== '분석 중...') {
      analysisLines.push(`두 분의 십성 관계: ${tenGodRelationship}`);
    }
    if (tenGods?.person1Primary && tenGods.person1Primary.length > 0) {
      analysisLines.push(`${person1Name}님의 주요 십성은 ${tenGods.person1Primary.join(', ')}이며, 이는 관계에서의 역할과 에너지를 나타냅니다.`);
    }
    if (tenGods?.person2Primary && tenGods.person2Primary.length > 0) {
      analysisLines.push(`${person2Name}님의 주요 십성은 ${tenGods.person2Primary.join(', ')}으로, ${person1Name}님과의 상호작용에서 독특한 역동성을 만들어냅니다.`);
    }
    const supports = tenGods?.interaction?.supports || [];
    const conflictsList = tenGods?.interaction?.conflicts || [];
    if (supports.length > 0) {
      analysisLines.push(`긍정적 상호작용이 ${supports.length}개 발견되었습니다: ${supports.slice(0, 2).join(' ')}`);
    }
    if (conflictsList.length > 0) {
      analysisLines.push(`주의가 필요한 상호작용이 ${conflictsList.length}개 있습니다: ${conflictsList.slice(0, 2).join(' ')}`);
    }
    if (shinsals?.person1Shinsals && shinsals.person1Shinsals.length > 0) {
      analysisLines.push(`${person1Name}님의 신살: ${shinsals.person1Shinsals.join(', ')} — 이 특수한 별의 기운이 관계에 영향을 줍니다.`);
    }
    if (shinsals?.person2Shinsals && shinsals.person2Shinsals.length > 0) {
      analysisLines.push(`${person2Name}님의 신살: ${shinsals.person2Shinsals.join(', ')} — 상대방의 신살과의 상호작용이 중요합니다.`);
    }
    if (shinsals?.luckyInteractions && shinsals.luckyInteractions.length > 0) {
      analysisLines.push(`길한 신살 조합: ${shinsals.luckyInteractions.slice(0, 2).join(', ')}`);
    }
    if (shinsals?.unluckyInteractions && shinsals.unluckyInteractions.length > 0) {
      analysisLines.push(`주의할 신살 조합: ${shinsals.unluckyInteractions.slice(0, 2).join(', ')}`);
    }
    const emotionalScore = synastry?.emotionalConnection || 0;
    const romanticScore = synastry?.romanticConnection || 0;
    const intellectualScore = synastry?.intellectualConnection || 0;
    if (emotionalScore > 0) {
      analysisLines.push(`감정적 연결 ${emotionalScore}점 — ${emotionalScore >= 75 ? '서로의 감정을 깊이 이해하고 공감하는 관계입니다.' : emotionalScore >= 50 ? '감정적 교류가 자연스럽게 이루어집니다.' : '감정 표현 방식에 차이가 있어 소통 노력이 필요합니다.'}`);
    }
    if (romanticScore > 0) {
      analysisLines.push(`로맨틱 끌림 ${romanticScore}점 — ${romanticScore >= 75 ? '강렬한 끌림이 있어 매력적인 관계입니다.' : romanticScore >= 50 ? '자연스러운 로맨스가 시간과 함께 깊어집니다.' : '우정이나 동반자적 관계에 더 강합니다.'}`);
    }
    if (intellectualScore > 0) {
      analysisLines.push(`지적 교감 ${intellectualScore}점 — ${intellectualScore >= 75 ? '대화가 잘 통하고 서로의 생각을 존중합니다.' : '서로 다른 관점을 나누며 시야를 넓힐 수 있습니다.'}`);
    }
    const impact = shinsals?.overallImpact || 'neutral';
    analysisLines.push(`종합 케미 평가: ${impact === 'very_positive' ? '매우 좋은 케미! 함께 있을 때 시너지가 극대화됩니다.' : impact === 'positive' ? '좋은 케미를 가지고 있어 편안한 관계가 가능합니다.' : impact === 'neutral' ? '무난한 케미이며, 서로의 노력으로 더 좋아질 수 있습니다.' : '노력이 필요하지만, 그 과정에서 서로 크게 성장할 수 있습니다.'}`);
  } else {
    analysisLines.push(`Chemistry analysis for ${person1Name} and ${person2Name}.`);
    if (tenGodRelationship && tenGodRelationship !== 'Analyzing...') {
      analysisLines.push(`Ten Gods dynamic: ${tenGodRelationship}`);
    }
    if (tenGods?.person1Primary && tenGods.person1Primary.length > 0) {
      analysisLines.push(`${person1Name}'s primary Ten Gods: ${tenGods.person1Primary.join(', ')}, shaping their role in this relationship.`);
    }
    if (tenGods?.person2Primary && tenGods.person2Primary.length > 0) {
      analysisLines.push(`${person2Name}'s primary Ten Gods: ${tenGods.person2Primary.join(', ')}, creating unique interaction dynamics.`);
    }
    const supports = tenGods?.interaction?.supports || [];
    const conflictsList = tenGods?.interaction?.conflicts || [];
    if (supports.length > 0) {
      analysisLines.push(`${supports.length} positive interaction(s) found: ${supports.slice(0, 2).join(' ')}`);
    }
    if (conflictsList.length > 0) {
      analysisLines.push(`${conflictsList.length} area(s) needing attention: ${conflictsList.slice(0, 2).join(' ')}`);
    }
    if (shinsals?.luckyInteractions && shinsals.luckyInteractions.length > 0) {
      analysisLines.push(`Lucky star combinations: ${shinsals.luckyInteractions.slice(0, 2).join(', ')}`);
    }
    const emotionalScore = synastry?.emotionalConnection || 0;
    const romanticScore = synastry?.romanticConnection || 0;
    if (emotionalScore > 0) {
      analysisLines.push(`Emotional connection: ${emotionalScore} — ${emotionalScore >= 75 ? 'deep empathy and mutual understanding.' : 'room for deeper emotional bonding.'}`);
    }
    if (romanticScore > 0) {
      analysisLines.push(`Romantic chemistry: ${romanticScore} — ${romanticScore >= 75 ? 'strong attraction from the start.' : 'grows deeper with time.'}`);
    }
    const impact = shinsals?.overallImpact || 'neutral';
    analysisLines.push(`Overall chemistry: ${impact === 'very_positive' ? 'Excellent! Maximum synergy together.' : impact === 'positive' ? 'Good chemistry for a comfortable relationship.' : 'Moderate — effort will strengthen the bond.'}`);
  }

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

      {/* Continuous Analysis Text */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          {isKo ? '케미스트리 상세 분석' : 'Detailed Chemistry Analysis'}
        </h3>
        <div className="space-y-3">
          {analysisLines.map((line, idx) => (
            <p key={idx} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ))}
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
