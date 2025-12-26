"use client";

import type { TabProps } from './types';
import { getStrengthsAndWeaknesses, getMatrixAnalysis } from '../analyzers';
import { getPersonalizedAdvice, getCombinedLifeTheme } from '../generators';
import { elementTraits } from '../data';
import PentagonChart from './PentagonChart';

interface PersonalityAnalysis {
  title: string;
  description: string;
  traits: string[];
  strengths: string[];
  challenges: string[];
  advice: string;
  sibsinProfile?: string;
  lifeStage?: string;
  socialImage?: string;
  sunMoonHarmony?: string;
  thinkingStyle?: string;
  innerConflict?: string;
  communicationStyle?: string;
  decisionMaking?: string;
  stressResponse?: string;
}

export default function PersonalityTab({ saju, astro, lang, isKo, data, destinyNarrative, combinedLifeTheme }: TabProps) {
  const personalityAnalysis = data.personalityAnalysis as PersonalityAnalysis | null;
  const strengthsWeaknesses = getStrengthsAndWeaknesses(saju, astro, lang);
  const personalizedAdvices = getPersonalizedAdvice(saju, astro, lang);
  const matrixAnalysis = getMatrixAnalysis(saju, astro, lang);

  return (
    <div className="space-y-6">
      {/* 조합형 인생 테마 */}
      {combinedLifeTheme && (
        <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-purple-300">{isKo ? '당신의 인생 테마' : 'Your Life Theme'}</h3>
          </div>
          <p className="text-gray-200 text-base leading-relaxed mb-3">
            {isKo ? combinedLifeTheme.ko : combinedLifeTheme.en}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {isKo ? combinedLifeTheme.detail.ko : combinedLifeTheme.detail.en}
          </p>
        </div>
      )}

      {/* 강점과 약점 */}
      {strengthsWeaknesses && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/50 p-6">
          {strengthsWeaknesses.strengths.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">💪</span>
                <h3 className="text-lg font-bold text-green-300">{isKo ? "최고의 강점" : "Top Strengths"}</h3>
              </div>
              <div className="space-y-3">
                {strengthsWeaknesses.strengths.slice(0, 3).map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <p className="text-gray-200 text-sm leading-relaxed">{strength.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {strengthsWeaknesses.weaknesses.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <h3 className="text-lg font-bold text-amber-300">{isKo ? "보완할 점" : "Areas to Improve"}</h3>
              </div>
              <div className="space-y-3">
                {strengthsWeaknesses.weaknesses.slice(0, 2).map((weakness, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-amber-400 mt-0.5">!</span>
                      <p className="text-gray-200 text-sm leading-relaxed">{weakness.text}</p>
                    </div>
                    <div className="ml-6 mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 text-sm">💡</span>
                        <p className="text-gray-300 text-xs leading-relaxed">{weakness.advice}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 성격 분석 */}
      {personalityAnalysis && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌟</span>
            <h3 className="text-lg font-bold text-amber-300">{isKo ? "나는 어떤 사람인가" : "Who Am I"}</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 font-bold mb-3 text-base">{personalityAnalysis.title}</p>
              <p className="text-gray-200 text-sm leading-relaxed mb-3">{personalityAnalysis.description}</p>
              <div className="flex flex-wrap gap-2">
                {personalityAnalysis.traits.map((trait, i) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-300 font-bold text-sm mb-2">✓ {isKo ? "이런 점이 좋아요" : "Your Strengths"}</p>
                <p className="text-gray-300 text-sm">{personalityAnalysis.strengths.join(", ")}</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 font-bold text-sm mb-2">⚡ {isKo ? "조심하면 더 좋아요" : "Watch Out For"}</p>
                <p className="text-gray-300 text-sm">{personalityAnalysis.challenges.join(", ")}</p>
              </div>
            </div>

            {personalityAnalysis.sibsinProfile && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold text-sm mb-2">🔮 {isKo ? "에너지 패턴" : "Energy Pattern"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{personalityAnalysis.sibsinProfile}</p>
              </div>
            )}

            {(personalityAnalysis.lifeStage || personalityAnalysis.socialImage) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {personalityAnalysis.lifeStage && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-300 font-bold text-sm mb-2">🌊 {isKo ? "현재 생명력" : "Current Vitality"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{personalityAnalysis.lifeStage}</p>
                  </div>
                )}
                {personalityAnalysis.socialImage && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-indigo-300 font-bold text-sm mb-2">👤 {isKo ? "첫인상" : "First Impression"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{personalityAnalysis.socialImage}</p>
                  </div>
                )}
              </div>
            )}

            {/* 태양-달 조화 & 사고방식 */}
            {(personalityAnalysis.sunMoonHarmony || personalityAnalysis.thinkingStyle) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {personalityAnalysis.sunMoonHarmony && (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-300 font-bold text-sm mb-2">☀️🌙 {isKo ? "내면과 외면의 조화" : "Inner-Outer Harmony"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{personalityAnalysis.sunMoonHarmony}</p>
                  </div>
                )}
                {personalityAnalysis.thinkingStyle && (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-cyan-300 font-bold text-sm mb-2">🧠 {isKo ? "사고방식" : "Thinking Style"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{personalityAnalysis.thinkingStyle}</p>
                  </div>
                )}
              </div>
            )}

            {/* 내면 갈등 패턴 */}
            {personalityAnalysis.innerConflict && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold text-sm mb-2">💭 {isKo ? "내면 갈등 패턴" : "Inner Conflict Pattern"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{personalityAnalysis.innerConflict}</p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <p className="text-sm flex items-start gap-3">
                <span className="text-xl">💫</span>
                <span className="text-amber-200 leading-relaxed">{personalityAnalysis.advice}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 감정 패턴 */}
      {destinyNarrative?.emotionPattern && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💭</span>
            <h3 className="text-lg font-bold text-cyan-300">{isKo ? "내 마음은 이렇게 움직여요" : "How My Heart Moves"}</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed mb-3">
            {isKo ? destinyNarrative.emotionPattern.ko : destinyNarrative.emotionPattern.en}
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            {isKo ? destinyNarrative.emotionPattern.koDetail : destinyNarrative.emotionPattern.enDetail}
          </p>
        </div>
      )}

      {/* 개인화된 조언 */}
      {personalizedAdvices.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-bold text-indigo-300">{isKo ? '당신만을 위한 조언' : 'Advice Just For You'}</h3>
          </div>

          <div className="space-y-4">
            {personalizedAdvices.slice(0, 3).map((advice, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-indigo-500/5 border border-indigo-500/20">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl flex-shrink-0">{advice.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-indigo-300 font-bold text-base">
                        {isKo ? advice.title.ko : advice.title.en}
                      </p>
                      {advice.source && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
                          {advice.source === 'sibsin' ? (isKo ? '십신' : 'Sibsin') :
                           advice.source === 'element-excess' ? (isKo ? '오행과다' : 'Element+') :
                           advice.source === 'element-deficient' ? (isKo ? '오행부족' : 'Element-') :
                           advice.source === 'sinsal' ? (isKo ? '신살' : 'Sinsal') :
                           advice.source === 'twelve-stage' ? (isKo ? '12운성' : '12 Stage') : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      {isKo ? advice.summary.ko : advice.summary.en}
                    </p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed pl-11">
                  {isKo ? advice.detail.ko : advice.detail.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 내 에너지 균형 - 오행 바 차트 */}
      {data.normalizedElements && data.normalizedElements.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚖️</span>
            <h3 className="text-lg font-bold text-purple-300">{isKo ? "내 에너지 균형" : "My Energy Balance"}</h3>
          </div>

          {/* 오행 바 차트 */}
          <div className="space-y-3 mb-4">
            {data.normalizedElements.map((item: { element: string; value: number }) => {
              const t = elementTraits[item.element];
              const isStrong = item.element === data.strongest[0];
              const isWeak = item.element === data.weakest[0];
              return (
                <div key={item.element} className="flex items-center gap-3">
                  <span className="w-8 text-xl text-center flex-shrink-0">{t?.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isStrong ? 'text-green-400' : isWeak ? 'text-amber-400' : 'text-gray-300'}`}>
                        {isKo ? t?.ko : t?.en}
                        {isStrong && <span className="ml-2 text-xs">{isKo ? "강점" : "strong"}</span>}
                        {isWeak && <span className="ml-2 text-xs">{isKo ? "보완" : "boost"}</span>}
                      </span>
                      <span className="text-sm font-bold" style={{ color: t?.color }}>{item.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: t?.color,
                          boxShadow: `0 0 8px ${t?.color}`
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 보완 팁 */}
          {data.luckyItems && data.luckyItems.length > 0 && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 font-bold mb-2 flex items-center gap-2">
                <span>{elementTraits[data.weakest[0]]?.emoji}</span>
                {isKo ? `이걸로 균형 맞추세요` : `Balance with these`}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {data.luckyItems.slice(0, 3).map((item: { item: string }, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <span className="text-lg">{item.item.split(" ")[0]}</span>
                    <span className="text-gray-300 text-xs">{item.item.replace(/^[^\s]+\s/, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 동서양 융합 매트릭스 */}
      {matrixAnalysis && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? "동서양 융합 시너지" : "East-West Fusion Matrix"}</h3>
          </div>

          {/* 융합 점수 */}
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fuchsia-300 font-bold">{isKo ? "융합 시너지 점수" : "Fusion Synergy Score"}</span>
              <span className="text-2xl font-bold text-fuchsia-400">{matrixAnalysis.synergy.overallScore}/10</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-400 transition-all duration-700"
                style={{ width: `${matrixAnalysis.synergy.overallScore * 10}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {isKo ? matrixAnalysis.synergy.dominantEnergy.ko : matrixAnalysis.synergy.dominantEnergy.en}
            </p>
          </div>

          {/* 융합 분포 */}
          <div className="grid grid-cols-5 gap-2 mb-5">
            <div className="text-center p-2 rounded-lg bg-purple-500/10">
              <div className="text-purple-400 text-lg font-bold">{matrixAnalysis.fusionSummary.extreme}</div>
              <div className="text-gray-500 text-xs">{isKo ? "극강" : "Extreme"}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <div className="text-green-400 text-lg font-bold">{matrixAnalysis.fusionSummary.amplify}</div>
              <div className="text-gray-500 text-xs">{isKo ? "증폭" : "Amplify"}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-500/10">
              <div className="text-blue-400 text-lg font-bold">{matrixAnalysis.fusionSummary.balance}</div>
              <div className="text-gray-500 text-xs">{isKo ? "균형" : "Balance"}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10">
              <div className="text-yellow-400 text-lg font-bold">{matrixAnalysis.fusionSummary.clash}</div>
              <div className="text-gray-500 text-xs">{isKo ? "긴장" : "Clash"}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10">
              <div className="text-red-400 text-lg font-bold">{matrixAnalysis.fusionSummary.conflict}</div>
              <div className="text-gray-500 text-xs">{isKo ? "상충" : "Conflict"}</div>
            </div>
          </div>

          {/* 오행-서양원소 융합 */}
          {matrixAnalysis.elementFusions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                <span>☯️</span> {isKo ? "오행 × 서양원소 융합" : "Five Elements × Western Elements"}
              </p>
              <div className="space-y-2">
                {matrixAnalysis.elementFusions.map((fusion, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: `${fusion.fusion.color}15`, border: `1px solid ${fusion.fusion.color}30` }}
                  >
                    <span className="text-xl">{fusion.fusion.icon}</span>
                    <div className="flex-1">
                      <span className="text-sm" style={{ color: fusion.fusion.color }}>
                        {isKo ? fusion.fusion.description.ko : fusion.fusion.description.en}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: fusion.fusion.color }}>
                      {fusion.fusion.score}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 십신-행성 융합 (주요 시너지만) */}
          {matrixAnalysis.sibsinPlanetFusions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                <span>🌟</span> {isKo ? "십신 × 행성 시너지" : "Sibsin × Planet Synergy"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {matrixAnalysis.sibsinPlanetFusions.slice(0, 6).map((fusion, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ backgroundColor: `${fusion.fusion.color}10`, border: `1px solid ${fusion.fusion.color}20` }}
                  >
                    <span className="text-lg">{fusion.fusion.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">
                        {fusion.sibsin}({isKo ? fusion.sibsinKeyword.ko : fusion.sibsinKeyword.en}) × {fusion.planet}
                      </p>
                      <p className="text-sm font-medium" style={{ color: fusion.fusion.color }}>
                        {isKo ? fusion.fusion.keyword.ko : fusion.fusion.keyword.en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 강점 & 주의점 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matrixAnalysis.synergy.topStrengths.length > 0 && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-300 font-bold text-sm mb-2">💪 {isKo ? "융합 강점" : "Fusion Strengths"}</p>
                <div className="space-y-1">
                  {matrixAnalysis.synergy.topStrengths.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{s.icon}</span>
                      <span className="text-gray-300">{s.area}</span>
                      <span className="text-green-400 text-xs ml-auto">{s.score}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {matrixAnalysis.synergy.topCautions.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 font-bold text-sm mb-2">⚡ {isKo ? "주의 에너지" : "Caution Areas"}</p>
                <div className="space-y-1">
                  {matrixAnalysis.synergy.topCautions.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{c.icon}</span>
                      <span className="text-gray-300">{c.area}</span>
                      <span className="text-amber-400 text-xs ml-auto">{c.score}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 종합 운세 점수 - 오각형 레이더 차트 */}
      <PentagonChart saju={saju} astro={astro} lang={lang} isKo={isKo} data={data} />
    </div>
  );
}
