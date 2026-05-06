"use client";

import type { TabProps } from '../types';
import { InsightCard, InsightContent, Badge } from '../InsightCard';

export default function HarmonyTab({ data, isKo }: TabProps) {
  const { harmonies, conflicts, persons } = data;

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1');
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2');

  // Generate continuous flowing analysis text
  const analysisLines: string[] = [];
  if (isKo) {
    analysisLines.push(`${person1Name}님과 ${person2Name}님의 합(合)과 충(沖) 관계를 분석했습니다.`);
    const score = harmonies?.score || 50;
    analysisLines.push(`합 관계 점수는 ${score}점입니다. ${score >= 70 ? '지지 간의 결합이 매우 강하여 자연스러운 유대감이 형성됩니다.' : score >= 50 ? '기본적인 합 관계가 있어 서로 조화를 이룰 수 있습니다.' : '합 관계가 약한 편이지만, 다른 요소로 보완이 가능합니다.'}`);
    if (harmonies?.description) {
      analysisLines.push(harmonies.description);
    }
    const yukhapCount = harmonies?.yukhap?.length || 0;
    const samhapCount = harmonies?.samhap?.length || 0;
    const banghapCount = harmonies?.banghap?.length || 0;
    if (yukhapCount > 0) {
      analysisLines.push(`육합(六合) ${yukhapCount}개 발견 — 지지 간의 자연스러운 결합으로 서로에 대한 끌림과 지지를 나타냅니다. ${harmonies!.yukhap!.slice(0, 2).join(', ')}`);
    } else {
      analysisLines.push('육합 관계가 없지만, 다른 합 관계나 긍정적 요소가 이를 보완할 수 있습니다.');
    }
    if (samhapCount > 0) {
      analysisLines.push(`삼합(三合) ${samhapCount}개 발견 — 세 지지가 모여 강력한 오행 에너지를 형성하여 관계에 안정감을 줍니다. ${harmonies!.samhap!.slice(0, 2).join(', ')}`);
    }
    if (banghapCount > 0) {
      analysisLines.push(`방합(方合) ${banghapCount}개 발견 — 같은 방향의 지지가 모여 계절의 에너지를 공유합니다.`);
    }
    const totalConflicts = conflicts?.totalConflicts || 0;
    const severity = conflicts?.severity || 'minimal';
    analysisLines.push(`충형파해 분석: 총 ${totalConflicts}개의 충돌이 발견되었으며, 심각도는 '${severity === 'minimal' ? '최소' : severity === 'mild' ? '약함' : severity === 'moderate' ? '보통' : '강함'}'입니다.`);
    if (conflicts?.chung && conflicts.chung.length > 0) {
      analysisLines.push(`충(沖) ${conflicts.chung.length}개 — 정반대 위치의 지지가 부딪혀 갈등을 만듭니다. ${conflicts.chung[0]}`);
    }
    if (conflicts?.hyeong && conflicts.hyeong.length > 0) {
      analysisLines.push(`형(刑) ${conflicts.hyeong.length}개 — 세 지지가 모여 시련과 성장의 기회를 줍니다. ${conflicts.hyeong[0]}`);
    }
    if (conflicts?.pa && conflicts.pa.length > 0) {
      analysisLines.push(`파(破) ${conflicts.pa.length}개 — 깨뜨리는 관계로 신뢰에 주의가 필요합니다.`);
    }
    if (conflicts?.hae && conflicts.hae.length > 0) {
      analysisLines.push(`해(害) ${conflicts.hae.length}개 — 서로의 발전을 방해할 수 있으므로 의식적인 배려가 필요합니다.`);
    }
    if (conflicts?.mitigationAdvice && conflicts.mitigationAdvice.length > 0) {
      analysisLines.push(`극복 조언: ${conflicts.mitigationAdvice[0]}`);
    }
  } else {
    analysisLines.push(`Harmony and conflict analysis for ${person1Name} and ${person2Name}.`);
    const score = harmonies?.score || 50;
    analysisLines.push(`Harmony score: ${score}. ${score >= 70 ? 'Strong bonding between branches creates natural affinity.' : score >= 50 ? 'Basic harmony exists for mutual support.' : 'Harmony is on the weaker side but can be compensated.'}`);
    if (harmonies?.description) {
      analysisLines.push(harmonies.description);
    }
    const yukhapCount = harmonies?.yukhap?.length || 0;
    if (yukhapCount > 0) {
      analysisLines.push(`${yukhapCount} Six Harmony pair(s) found — natural bonding and attraction between branches.`);
    }
    const samhapCount = harmonies?.samhap?.length || 0;
    if (samhapCount > 0) {
      analysisLines.push(`${samhapCount} Three Harmony group(s) — powerful elemental energy providing stability.`);
    }
    const totalConflicts = conflicts?.totalConflicts || 0;
    const severity = conflicts?.severity || 'minimal';
    analysisLines.push(`Conflict analysis: ${totalConflicts} conflict(s), severity: ${severity}.`);
    if (conflicts?.chung && conflicts.chung.length > 0) {
      analysisLines.push(`${conflicts.chung.length} Clash(es) — opposing branches create tension. ${conflicts.chung[0]}`);
    }
    if (conflicts?.hyeong && conflicts.hyeong.length > 0) {
      analysisLines.push(`${conflicts.hyeong.length} Punishment(s) — challenging dynamics that spur growth.`);
    }
    if (conflicts?.mitigationAdvice && conflicts.mitigationAdvice.length > 0) {
      analysisLines.push(`Advice: ${conflicts.mitigationAdvice[0]}`);
    }
  }

  // Severity color mapping
  const severityColors: Record<string, { bg: string; border: string; text: string }> = {
    minimal: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300' },
    mild: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-300' },
    moderate: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-300' },
    severe: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300' },
  };

  const severity = conflicts?.severity || 'minimal';
  const severityStyle = severityColors[severity];

  return (
    <div className="space-y-6">
      {/* Harmony Score Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900/30 to-slate-900 border border-emerald-500/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 mb-4">
            <span className="text-4xl font-bold text-emerald-300">{harmonies?.score || 50}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">
            {isKo ? '합(合) 관계 점수' : 'Harmony Score'}
          </h2>
          <p className="text-emerald-300">
            {harmonies?.description || (isKo ? '분석 중...' : 'Analyzing...')}
          </p>
        </div>
      </div>

      {/* Continuous Analysis Text */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          {isKo ? '합/충 상세 분석' : 'Detailed Harmony Analysis'}
        </h3>
        <div className="space-y-3">
          {analysisLines.map((line, idx) => (
            <p key={idx} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* 육합 (Six Harmonies) */}
      <InsightCard emoji="🔗" title={isKo ? "육합 (六合) 관계" : "Six Harmonies"} colorTheme="cyan">
        <InsightContent colorTheme="cyan">
          <p className="text-cyan-300 font-medium mb-3">
            {isKo ? '지지(地支) 간의 자연스러운 결합' : 'Natural bonding between Earthly Branches'}
          </p>
          {harmonies?.yukhap && harmonies.yukhap.length > 0 ? (
            <div className="space-y-2">
              {harmonies.yukhap.map((yh, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-cyan-400">✓</span>
                  <span className="text-gray-200 text-sm">{yh}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{isKo ? '육합 관계가 없습니다' : 'No Six Harmonies found'}</p>
          )}
        </InsightContent>
        <p className="text-gray-400 text-xs mt-3">
          {isKo
            ? '육합은 子-丑, 寅-亥, 卯-戌, 辰-酉, 巳-申, 午-未의 6가지 조합입니다.'
            : 'Six Harmonies are 6 pairings that naturally attract and support each other.'}
        </p>
      </InsightCard>

      {/* 삼합 (Three Harmonies) */}
      <InsightCard emoji="🔺" title={isKo ? "삼합 (三合) 관계" : "Three Harmonies"} colorTheme="indigo">
        <InsightContent colorTheme="indigo">
          <p className="text-indigo-300 font-medium mb-3">
            {isKo ? '세 지지가 모여 강력한 오행을 형성' : 'Three branches forming powerful element'}
          </p>
          {harmonies?.samhap && harmonies.samhap.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {harmonies.samhap.map((sh, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-indigo-400">★</span>
                  <span className="text-gray-200 text-sm">{sh}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{isKo ? '삼합 관계가 없습니다' : 'No Three Harmonies found'}</p>
          )}
        </InsightContent>
        <p className="text-gray-400 text-xs mt-3">
          {isKo
            ? '삼합: 申子辰(水), 寅午戌(火), 巳酉丑(金), 亥卯未(木) - 3개가 모이면 강력한 에너지'
            : 'Three Harmonies create powerful elemental energy when all three are present.'}
        </p>
      </InsightCard>

      {/* 방합 (Directional Harmonies) */}
      <InsightCard emoji="🧭" title={isKo ? "방합 (方合) 관계" : "Directional Harmonies"} colorTheme="blue">
        <InsightContent colorTheme="blue">
          <p className="text-blue-300 font-medium mb-3">
            {isKo ? '같은 방향의 지지가 모여 계절 에너지 형성' : 'Branches from same direction forming seasonal energy'}
          </p>
          {harmonies?.banghap && harmonies.banghap.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {harmonies.banghap.map((bh, idx) => (
                <Badge key={idx} text={bh} colorTheme="blue" />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{isKo ? '방합 관계가 없습니다' : 'No Directional Harmonies found'}</p>
          )}
        </InsightContent>
      </InsightCard>

      {/* Divider */}
      <div className="flex items-center gap-4 py-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
        <span className="text-orange-400 font-medium">{isKo ? '충형파해 분석' : 'Conflict Analysis'}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      </div>

      {/* Conflict Severity */}
      <div className={`p-4 rounded-2xl ${severityStyle.bg} border ${severityStyle.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {severity === 'minimal' ? '✅' :
               severity === 'mild' ? '💙' :
               severity === 'moderate' ? '⚠️' : '🔥'}
            </span>
            <div>
              <p className={`font-bold ${severityStyle.text}`}>
                {severity === 'minimal' ? (isKo ? '충돌 최소' : 'Minimal Conflicts') :
                 severity === 'mild' ? (isKo ? '약한 충돌' : 'Mild Conflicts') :
                 severity === 'moderate' ? (isKo ? '중간 충돌' : 'Moderate Conflicts') :
                 (isKo ? '강한 충돌' : 'Severe Conflicts')}
              </p>
              <p className="text-gray-400 text-sm">
                {isKo ? `총 ${conflicts?.totalConflicts || 0}개의 충형파해` : `${conflicts?.totalConflicts || 0} total conflicts`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 충 (Clash) */}
      {conflicts?.chung && conflicts.chung.length > 0 && (
        <InsightCard emoji="💥" title={isKo ? "충 (沖) 관계" : "Clash Relations"} colorTheme="red">
          <p className="text-gray-400 text-sm mb-3">
            {isKo ? '정반대 위치의 지지가 충돌하여 갈등을 일으킵니다' : 'Opposing branches create tension and conflict'}
          </p>
          <div className="space-y-2">
            {conflicts.chung.map((c, idx) => (
              <InsightContent key={idx} colorTheme="red">
                <p className="text-gray-200 text-sm">{c}</p>
              </InsightContent>
            ))}
          </div>
        </InsightCard>
      )}

      {/* 형 (Punishment) */}
      {conflicts?.hyeong && conflicts.hyeong.length > 0 && (
        <InsightCard emoji="⚡" title={isKo ? "형 (刑) 관계" : "Punishment Relations"} colorTheme="orange">
          <p className="text-gray-400 text-sm mb-3">
            {isKo ? '세 지지가 모여 형벌과 같은 어려움을 만듭니다' : 'Three branches together create challenging dynamics'}
          </p>
          <div className="space-y-2">
            {conflicts.hyeong.map((h, idx) => (
              <InsightContent key={idx} colorTheme="orange">
                <p className="text-gray-200 text-sm">{h}</p>
              </InsightContent>
            ))}
          </div>
        </InsightCard>
      )}

      {/* 파 (Break) */}
      {conflicts?.pa && conflicts.pa.length > 0 && (
        <InsightCard emoji="💔" title={isKo ? "파 (破) 관계" : "Break Relations"} colorTheme="yellow">
          <p className="text-gray-400 text-sm mb-3">
            {isKo ? '서로를 깨뜨리는 관계로 신뢰에 주의가 필요합니다' : 'Relations that break each other - trust needs attention'}
          </p>
          <div className="space-y-2">
            {conflicts.pa.map((p, idx) => (
              <InsightContent key={idx} colorTheme="yellow">
                <p className="text-gray-200 text-sm">{p}</p>
              </InsightContent>
            ))}
          </div>
        </InsightCard>
      )}

      {/* 해 (Harm) */}
      {conflicts?.hae && conflicts.hae.length > 0 && (
        <InsightCard emoji="🔗" title={isKo ? "해 (害) 관계" : "Harm Relations"} colorTheme="amber">
          <p className="text-gray-400 text-sm mb-3">
            {isKo ? '서로의 발전을 방해할 수 있는 관계입니다' : 'Relations that may hinder each other\'s growth'}
          </p>
          <div className="space-y-2">
            {conflicts.hae.map((h, idx) => (
              <InsightContent key={idx} colorTheme="amber">
                <p className="text-gray-200 text-sm">{h}</p>
              </InsightContent>
            ))}
          </div>
        </InsightCard>
      )}

      {/* Mitigation Advice */}
      {conflicts?.mitigationAdvice && conflicts.mitigationAdvice.length > 0 && (
        <InsightCard emoji="💡" title={isKo ? "극복 조언" : "How to Overcome"} colorTheme="emerald">
          <div className="space-y-3">
            {conflicts.mitigationAdvice.map((advice, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-400 mt-0.5">{idx + 1}.</span>
                <p className="text-gray-200 text-sm leading-relaxed">{advice}</p>
              </div>
            ))}
          </div>
        </InsightCard>
      )}
    </div>
  );
}
