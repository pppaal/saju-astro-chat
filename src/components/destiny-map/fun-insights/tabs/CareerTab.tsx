"use client";

import { memo } from 'react';
import type { TabProps } from './types';
import { getCareerMatrixAnalysis, type CareerMatrixResult } from '../analyzers';
import { getCareerAdvancedAnalysis } from '../analyzers/matrixAnalyzer';
import type { CareerAdvancedResult } from '../analyzers/matrixAnalyzer';
import { PremiumReportCTA } from '../components';

interface GeokgukInfo {
  name?: string;
  type?: string;
}

// SajuData와 별도로 정의 (확장이 아닌 독립 타입으로 캐스팅에 사용)
interface SajuWithGeokguk {
  advancedAnalysis?: {
    geokguk?: GeokgukInfo;
  };
}

interface CareerAnalysis {
  workStyle: string;
  strengths: string[];
  idealEnvironment: string;
  avoidEnvironment: string;
  growthTip?: string;
  suggestedFields: string[];
  publicImage?: string;
  careerPath?: string;
  currentPhase?: string;
  sibsinCareer?: string;
  leadershipStyle?: string;
  jupiterBlessings?: string;
  saturnMcAspect?: string;
  sunSaturnAspect?: string;
  // 새로 추가된 필드들
  overseasFortune?: string;
  wealthStyle?: string;
  successTiming?: string;
  wealthScore?: number;
  mcSign?: string;
  decisionStyle?: string;
  teamworkStyle?: string;
}

function CareerTab({ saju, astro, lang, isKo, data, destinyNarrative }: TabProps) {
  // TabData.careerAnalysis is Record<string, unknown> | null, cast to local interface
  const careerAnalysis = data.careerAnalysis as CareerAnalysis | null;
  const careerMatrix = getCareerMatrixAnalysis(saju ?? undefined, astro ?? undefined, lang) as CareerMatrixResult | null;
  // 고급 커리어 분석 (L2, L4, L7, L8, L10)
  const advancedCareer = getCareerAdvancedAnalysis(saju ?? undefined, astro ?? undefined, isKo ? 'ko' : 'en') as CareerAdvancedResult | null;

  // 격국 정보 추출
  const sajuWithGeokguk = saju as SajuWithGeokguk | undefined;
  const geokguk = sajuWithGeokguk?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name ?? geokguk?.type ?? "";

  // 격국별 커리어 해석
  const getGeokgukCareer = (name: string): { title: string; desc: string; emoji: string } | null => {
    const n = name.toLowerCase();
    if (n.includes("식신") || n.includes("food")) return {
      title: isKo ? "창작형 커리어" : "Creative Career",
      emoji: "🎨",
      desc: isKo
        ? "당신은 무언가를 '만들어내는' 사람이에요. 요리, 글쓰기, 디자인, 예술... 창작 활동을 할 때 가장 행복해요."
        : "You're someone who 'creates.' Cooking, writing, design, art... you're happiest when creating."
    };
    if (n.includes("상관") || n.includes("hurting")) return {
      title: isKo ? "표현형 커리어" : "Expressive Career",
      emoji: "🎤",
      desc: isKo
        ? "당신은 말과 표현의 천재예요. 강의, 방송, 영업, 마케팅... 소통하는 일에서 두각을 나타내요."
        : "You're a genius of expression. Lectures, broadcasting, sales, marketing... you excel in communication roles."
    };
    if (n.includes("정재") || n.includes("direct wealth")) return {
      title: isKo ? "안정 재물형" : "Steady Wealth",
      emoji: "🏦",
      desc: isKo
        ? "당신은 '차곡차곡' 쌓아가는 타입이에요. 월급, 적금, 부동산... 안정적인 재테크가 잘 맞아요."
        : "You build wealth steadily. Salary, savings, real estate... stable investments suit you."
    };
    if (n.includes("편재") || n.includes("indirect wealth")) return {
      title: isKo ? "사업형 재물" : "Business Wealth",
      emoji: "💰",
      desc: isKo
        ? "당신은 큰 그림을 그리는 타입이에요. 투자, 사업, 부업... 다양한 수입원을 만드는 데 능해요."
        : "You see the big picture. Investment, business, side hustles... you're good at creating multiple income streams."
    };
    if (n.includes("정관") || n.includes("direct officer")) return {
      title: isKo ? "조직형 성공" : "Organizational Success",
      emoji: "👔",
      desc: isKo
        ? "당신은 조직에서 빛나는 타입이에요. 안정적인 커리어 경로에서 차근차근 올라가요."
        : "You shine in organizations. You steadily climb stable career paths."
    };
    if (n.includes("편관") || n.includes("indirect officer")) return {
      title: isKo ? "도전형 성공" : "Challenger Success",
      emoji: "⚔️",
      desc: isKo
        ? "당신은 경쟁에서 강해지는 타입이에요. 어려운 환경에서 오히려 능력이 발휘돼요."
        : "You get stronger in competition. Difficult environments bring out your abilities."
    };
    return null;
  };

  const geokCareer = geokName ? getGeokgukCareer(geokName) : null;

  return (
    <div className="space-y-6">
      {/* 커리어 운명 */}
      {destinyNarrative?.careerDestiny && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💼</span>
            <h3 className="text-lg font-bold text-emerald-300">{isKo ? '커리어에서 나는 이런 사람이에요' : 'Who I Am at Work'}</h3>
          </div>
          <p className="text-gray-200 text-base leading-relaxed mb-3">
            {isKo ? destinyNarrative.careerDestiny.ko : destinyNarrative.careerDestiny.en}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {isKo ? destinyNarrative.careerDestiny.koDetail : destinyNarrative.careerDestiny.enDetail}
          </p>
        </div>
      )}

      {/* 격국 기반 커리어 */}
      {geokCareer && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-blue-900/20 border border-blue-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{geokCareer.emoji}</span>
            <h3 className="text-lg font-bold text-blue-300">{geokCareer.title}</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">{geokCareer.desc}</p>
        </div>
      )}

      {/* 커리어 분석 */}
      {careerAnalysis && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📈</span>
            <h3 className="text-lg font-bold text-emerald-300">{isKo ? "나는 어떤 일에서 빛나나" : "Where I Shine"}</h3>
          </div>

          <div className="space-y-4">
            {/* 강점 & 스타일 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-300 font-bold mb-2 text-sm">💪 {isKo ? "직업적 강점" : "Career Strength"}</p>
                <ul className="text-gray-200 text-sm leading-relaxed space-y-1">
                  {careerAnalysis.strengths?.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <p className="text-teal-300 font-bold mb-2 text-sm">🎯 {isKo ? "일하는 스타일" : "Work Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.workStyle}</p>
              </div>
            </div>

            {/* 이상적인 직업 */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-cyan-300 font-bold mb-2 text-sm">✨ {isKo ? "잘 맞는 일" : "Ideal Work"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.idealEnvironment}</p>
            </div>

            {/* 주의사항 */}
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-orange-300 font-bold mb-2 text-sm">⚠️ {isKo ? "주의할 점" : "Watch Out"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.avoidEnvironment}</p>
            </div>

            {/* 추천 산업 */}
            {careerAnalysis.suggestedFields?.length > 0 && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-indigo-300 font-bold mb-2 text-sm">🏢 {isKo ? "추천 분야" : "Recommended Fields"}</p>
                <div className="flex flex-wrap gap-2">
                  {careerAnalysis.suggestedFields.map((field, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm">{field}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 공식 이미지 & 목성 축복 */}
            {(careerAnalysis.publicImage || careerAnalysis.jupiterBlessings) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {careerAnalysis.publicImage && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-purple-300 font-bold text-sm mb-2">🎯 {isKo ? "공식 이미지" : "Public Image"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.publicImage}</p>
                  </div>
                )}
                {careerAnalysis.jupiterBlessings && (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-300 font-bold text-sm mb-2">🌟 {isKo ? "행운의 분야" : "Lucky Field"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.jupiterBlessings}</p>
                  </div>
                )}
              </div>
            )}

            {/* 십신 커리어 */}
            {careerAnalysis.sibsinCareer && (
              <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                <p className="text-fuchsia-300 font-bold text-sm mb-2">🔮 {isKo ? "에너지 활용법" : "Energy Utilization"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.sibsinCareer}</p>
              </div>
            )}

            {/* 리더십 & 팀워크 스타일 */}
            {(careerAnalysis.leadershipStyle || careerAnalysis.teamworkStyle) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {careerAnalysis.leadershipStyle && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-300 font-bold text-sm mb-2">👑 {isKo ? "리더십 스타일" : "Leadership Style"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.leadershipStyle}</p>
                  </div>
                )}
                {careerAnalysis.teamworkStyle && (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-cyan-300 font-bold text-sm mb-2">🤝 {isKo ? "협업 스타일" : "Teamwork Style"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.teamworkStyle}</p>
                  </div>
                )}
              </div>
            )}

            {/* 커리어 경로 & 현재 단계 */}
            {(careerAnalysis.careerPath || careerAnalysis.currentPhase) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {careerAnalysis.careerPath && (
                  <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-violet-300 font-bold text-sm mb-2">🛤️ {isKo ? "커리어 패스" : "Career Path"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.careerPath}</p>
                  </div>
                )}
                {careerAnalysis.currentPhase && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-rose-300 font-bold text-sm mb-2">📍 {isKo ? "현재 단계" : "Current Phase"}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.currentPhase}</p>
                  </div>
                )}
              </div>
            )}

            {/* 의사결정 스타일 */}
            {careerAnalysis.decisionStyle && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 font-bold text-sm mb-2">🧠 {isKo ? "의사결정 스타일" : "Decision Making Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.decisionStyle}</p>
              </div>
            )}

            {/* 성장 팁 */}
            {careerAnalysis.growthTip && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <span className="text-emerald-200 leading-relaxed">{careerAnalysis.growthTip}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 재물운 & 성공 시기 */}
      {careerAnalysis && (careerAnalysis.wealthScore || careerAnalysis.wealthStyle || careerAnalysis.successTiming) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💰</span>
            <h3 className="text-lg font-bold text-amber-300">{isKo ? "재물운 & 성공 타이밍" : "Wealth & Success Timing"}</h3>
          </div>

          <div className="space-y-4">
            {/* 재물운 점수 */}
            {careerAnalysis.wealthScore && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-amber-300 font-bold text-sm">💎 {isKo ? "재물운 점수" : "Wealth Fortune Score"}</p>
                  <span className="text-2xl font-bold text-amber-400">{careerAnalysis.wealthScore}점</span>
                </div>
                <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                    style={{ width: `${careerAnalysis.wealthScore}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  {isKo
                    ? careerAnalysis.wealthScore >= 80 ? "타고난 재물복이 있어요!"
                      : careerAnalysis.wealthScore >= 60 ? "꾸준한 노력으로 부를 쌓아요."
                      : "전략적인 재테크가 필요해요."
                    : careerAnalysis.wealthScore >= 80 ? "You have natural wealth fortune!"
                      : careerAnalysis.wealthScore >= 60 ? "Build wealth through steady effort."
                      : "Strategic financial planning is key."}
                </p>
              </div>
            )}

            {/* 재물 스타일 */}
            {careerAnalysis.wealthStyle && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-300 font-bold text-sm mb-2">🏦 {isKo ? "재물 스타일" : "Wealth Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.wealthStyle}</p>
              </div>
            )}

            {/* 성공 시기 */}
            {careerAnalysis.successTiming && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 font-bold text-sm mb-2">⏰ {isKo ? "성공 시기" : "Success Timing"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.successTiming}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 해외운 */}
      {careerAnalysis?.overseasFortune && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-sky-900/20 border border-sky-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✈️</span>
            <h3 className="text-lg font-bold text-sky-300">{isKo ? "해외운 & 확장 기회" : "Overseas Fortune & Expansion"}</h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.overseasFortune}</p>
          <p className="text-gray-500 text-xs mt-3">
            {isKo ? "* 9하우스와 역마살 기반 분석" : "* Based on 9th house and travel indicators"}
          </p>
        </div>
      )}

      {/* 동서양 커리어 매트릭스 (Sibsin-House) */}
      {careerMatrix && careerMatrix.sibsinCareer.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-indigo-300">{isKo ? "동서양 커리어 매트릭스" : "East-West Career Matrix"}</h3>
          </div>

          {/* 커리어 점수 & 메시지 */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-indigo-300 font-bold text-sm">{isKo ? "커리어 에너지 점수" : "Career Energy Score"}</p>
              <span className="text-2xl font-bold text-indigo-400">{careerMatrix.careerScore}점</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-700"
                style={{ width: `${careerMatrix.careerScore}%` }}
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? careerMatrix.careerMessage.ko : careerMatrix.careerMessage.en}
            </p>
          </div>

          {/* 커리어 강점 */}
          {careerMatrix.careerStrengths.length > 0 && (
            <div className="mb-4">
              <p className="text-blue-300 font-bold text-sm flex items-center gap-2 mb-3">
                <span>⚡</span>
                {isKo ? "핵심 커리어 강점" : "Core Career Strengths"}
              </p>
              <div className="flex flex-wrap gap-2">
                {careerMatrix.careerStrengths.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm flex items-center gap-2"
                  >
                    <span>{item.icon}</span>
                    <span>{item.area}</span>
                    <span className="text-xs text-blue-400">({item.score}점)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 십신-하우스 매트릭스 그리드 */}
          <div className="space-y-3">
            <p className="text-cyan-300 font-bold text-sm flex items-center gap-2">
              <span>🔮</span>
              {isKo ? "십신 × 하우스 시너지" : "Sibsin × House Synergy"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {careerMatrix.sibsinCareer.slice(0, 9).map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${
                    item.fusion.level === 'extreme'
                      ? 'bg-indigo-500/15 border-indigo-500/30'
                      : item.fusion.level === 'amplify'
                      ? 'bg-blue-500/15 border-blue-500/30'
                      : item.fusion.level === 'conflict'
                      ? 'bg-orange-500/15 border-orange-500/30'
                      : item.fusion.level === 'clash'
                      ? 'bg-red-500/15 border-red-500/30'
                      : 'bg-gray-500/15 border-gray-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.fusion.icon}</span>
                    <span className="text-white font-bold text-sm">{item.sibsin}</span>
                    <span className="text-gray-400">×</span>
                    <span className="text-cyan-300 text-sm">{item.house}H</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed mb-1">
                    {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                  </p>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <span>{isKo ? item.sibsinKeyword.ko : item.sibsinKeyword.en}</span>
                    <span>+</span>
                    <span>{isKo ? item.houseKeyword.ko : item.houseKeyword.en}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-xs mt-4">
            {isKo
              ? "* 동양 십신과 서양 하우스의 융합 분석으로 커리어 에너지를 파악해요."
              : "* Fusion analysis of Eastern Sibsin and Western Houses reveals career energy."}
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 재물 패턴 (L2 기반) */}
      {/* ============================================================ */}
      {advancedCareer?.wealthPattern && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <h3 className="text-lg font-bold text-amber-300">
                {isKo ? "재물 패턴 매트릭스" : "Wealth Pattern Matrix"}
              </h3>
            </div>
            {advancedCareer.wealthPattern.score != null && (
              <div className="text-2xl font-bold text-amber-400">
                {advancedCareer.wealthPattern.score}<span className="text-sm text-amber-500">/10</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? advancedCareer.wealthPattern.style?.ko : advancedCareer.wealthPattern.style?.en}
            </p>
          </div>

          {advancedCareer.wealthPattern.sibsinWealth && advancedCareer.wealthPattern.sibsinWealth.length > 0 && (
            <div className="space-y-3">
              <p className="text-yellow-300 font-bold text-sm">
                🔮 {isKo ? "십신 × 행성 재물 분석" : "Sibsin × Planet Wealth Analysis"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {advancedCareer.wealthPattern.sibsinWealth.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.fusion.icon}</span>
                      <span className="font-bold text-yellow-300">{item.sibsin}</span>
                      <span className="text-gray-400">×</span>
                      <span className="text-gray-300">{item.planet}</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 성공 타이밍 (L4 기반) */}
      {/* ============================================================ */}
      {advancedCareer && advancedCareer.successTiming && advancedCareer.successTiming.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-blue-900/20 border border-blue-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⏰</span>
            <h3 className="text-lg font-bold text-blue-300">
              {isKo ? "성공 타이밍 분석" : "Success Timing Analysis"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "대운과 트랜짓을 조합해 최적의 성공 시기를 분석했어요."
              : "Analyzed optimal success timing by combining Daeun and transits."}
          </p>

          <div className="space-y-3">
            {advancedCareer.successTiming?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.fusion.icon}</span>
                  <span className="font-bold text-blue-300">{item.timing}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{item.transit}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    item.fusion.score >= 7 ? 'bg-green-500/30 text-green-300' :
                    item.fusion.score >= 4 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'
                  }`}>
                    {item.fusion.level}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? item.advice.ko : item.advice.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 커리어 프로그레션 (L7 기반) */}
      {/* ============================================================ */}
      {advancedCareer?.careerProgression && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-violet-300">
              {isKo ? "커리어 프로그레션" : "Career Progression"}
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{advancedCareer.careerProgression.fusion.icon}</span>
              <span className="font-bold text-violet-300">{advancedCareer.careerProgression.geokguk}</span>
              <span className="text-gray-400">×</span>
              <span className="text-gray-300">{advancedCareer.careerProgression.progression}</span>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              {isKo ? advancedCareer.careerProgression.fusion.keyword.ko : advancedCareer.careerProgression.fusion.keyword.en}
            </p>
            <p className="text-violet-200 text-sm font-medium">
              {isKo ? advancedCareer.careerProgression.direction.ko : advancedCareer.careerProgression.direction.en}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 귀인운 (L8 기반) */}
      {/* ============================================================ */}
      {advancedCareer && advancedCareer.nobleHelp && advancedCareer.nobleHelp.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-green-900/20 border border-green-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤝</span>
            <h3 className="text-lg font-bold text-green-300">
              {isKo ? "귀인운 & 도움운" : "Noble Help & Support Fortune"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "당신에게 도움을 주는 귀인의 패턴이에요. 어려울 때 나타나는 도움이에요."
              : "Patterns of noble helpers who support you. Help that appears in difficult times."}
          </p>

          <div className="space-y-3">
            {advancedCareer.nobleHelp?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.fusion.icon}</span>
                  <span className="font-bold text-green-300">{item.shinsal}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{item.planet}</span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? item.blessing.ko : item.blessing.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 행운 포인트 (L10 기반) */}
      {/* ============================================================ */}
      {advancedCareer?.fortunePoint && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-yellow-900/20 border border-yellow-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🍀</span>
            <h3 className="text-lg font-bold text-yellow-300">
              {isKo ? "행운의 포인트" : "Fortune Point"}
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{advancedCareer.fortunePoint.fusion.icon}</span>
              <span className="font-bold text-yellow-300 text-lg">Part of Fortune × {advancedCareer.fortunePoint.element}</span>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              {isKo ? advancedCareer.fortunePoint.fusion.keyword.ko : advancedCareer.fortunePoint.fusion.keyword.en}
            </p>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-200 text-sm">
                ✨ {isKo ? advancedCareer.fortunePoint.luckyArea.ko : advancedCareer.fortunePoint.luckyArea.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="career"
        matrixData={{ careerMatrix, advancedCareer }}
      />
    </div>
  );
}

export default memo(CareerTab);
