"use client";

import type { TabProps } from './types';
import type { KarmaAnalysisResult } from '../analyzers/karmaAnalyzer';
import type { SajuDataExtended, PlanetData } from './data';
import { getKarmaMatrixAnalysis } from '../analyzers/matrixAnalyzer';
import {
  dayMasterSimple,
  fiveElementsSimple,
  shinsalSimple,
  northNodeSimple,
  saturnSimple,
  findPlanetHouse,
  analyzeElements,
} from './data';
import { PremiumReportCTA } from '../components';

export default function KarmaTab({ saju, astro, isKo, data }: TabProps) {
  const karmaAnalysis = (data as Record<string, unknown>).karmaAnalysis as KarmaAnalysisResult | null;

  // 매트릭스 분석 호출
  const matrixKarma = getKarmaMatrixAnalysis(saju || undefined, astro || undefined, isKo ? 'ko' : 'en');

  // 데이터 추출
  const sajuExt = saju as SajuDataExtended | undefined;
  const dayMaster = sajuExt?.dayMaster?.name ?? sajuExt?.dayMaster?.heavenlyStem ?? sajuExt?.fourPillars?.day?.heavenlyStem ?? "";
  const sinsal = sajuExt?.advancedAnalysis?.sinsal ?? {};
  const luckyList = sinsal?.luckyList ?? [];
  const unluckyList = sinsal?.unluckyList ?? [];
  const elementAnalysis = analyzeElements(sajuExt);

  // 점성술 데이터
  const planets = astro?.planets as PlanetData[] | undefined;
  const northNodeHouse = findPlanetHouse(planets, 'north node') ?? findPlanetHouse(planets, 'northnode');
  const saturnHouse = findPlanetHouse(planets, 'saturn');
  const southNodeHouse = northNodeHouse ? (northNodeHouse > 6 ? northNodeHouse - 6 : northNodeHouse + 6) : null;

  if (!karmaAnalysis && !dayMaster && !northNodeHouse && !matrixKarma) {
    return (
      <div className="p-6 text-center text-gray-400">
        <span className="text-4xl mb-4 block">🔮</span>
        {isKo ? "카르마 분석을 위한 데이터가 충분하지 않습니다." : "Not enough data for karma analysis."}
      </div>
    );
  }

  const dayMasterInfo = dayMaster ? dayMasterSimple[dayMaster] : null;
  const northNodeInfo = northNodeHouse ? northNodeSimple[northNodeHouse] : null;
  const saturnInfo = saturnHouse ? saturnSimple[saturnHouse] : null;

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. 카르마 점수 (신규 - 매트릭스 기반) */}
      {/* ============================================================ */}
      {matrixKarma && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/30 border border-violet-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌌</span>
              <h3 className="text-lg font-bold text-violet-300">
                {isKo ? "카르마 탐색 지수" : "Karma Exploration Index"}
              </h3>
            </div>
            <div className="text-3xl font-bold text-violet-400">
              {matrixKarma.karmaScore}<span className="text-lg text-violet-500">/100</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500 rounded-full"
                style={{ width: `${matrixKarma.karmaScore}%` }}
              />
            </div>
          </div>

          <p className="text-gray-300 text-sm">
            {matrixKarma.karmaScore >= 80
              ? (isKo ? "🌟 아주 깊은 영혼의 여정이 드러났어요!" : "🌟 Very deep soul journey revealed!")
              : matrixKarma.karmaScore >= 60
              ? (isKo ? "✨ 카르마 패턴이 선명하게 보여요." : "✨ Karma patterns showing clearly.")
              : matrixKarma.karmaScore >= 40
              ? (isKo ? "💫 기본적인 영혼 패턴을 볼 수 있어요." : "💫 Basic soul patterns visible.")
              : (isKo ? "🌙 더 많은 정보로 깊이 탐색할 수 있어요." : "🌙 More info enables deeper exploration.")}
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. 영혼 패턴 매트릭스 (신규 - L7 기반) */}
      {/* ============================================================ */}
      {matrixKarma?.soulPattern && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-2 border-indigo-400/50 p-6">
          <div className="text-center mb-4">
            <span className="text-4xl block mb-2">{matrixKarma.soulPattern.fusion.icon}</span>
            <h3 className="text-xl font-bold text-indigo-200">
              {isKo ? "영혼의 패턴" : "Soul Pattern"}
            </h3>
            <p className="text-indigo-400 text-sm mt-1">
              {isKo ? `${matrixKarma.soulPattern.geokguk} × 드라코닉 분석` : `${matrixKarma.soulPattern.geokguk} × Draconic Analysis`}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-xl font-bold text-center text-white mb-2">
              {isKo ? matrixKarma.soulPattern.soulTheme.ko : matrixKarma.soulPattern.soulTheme.en}
            </p>
            <p className="text-indigo-200 text-center text-sm">
              {isKo ? matrixKarma.soulPattern.fusion.keyword.ko : matrixKarma.soulPattern.fusion.keyword.en}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full ${
              matrixKarma.soulPattern.fusion.score >= 7 ? 'bg-green-500/30 text-green-300' :
              matrixKarma.soulPattern.fusion.score >= 4 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'
            }`}>
              {matrixKarma.soulPattern.fusion.level} · {matrixKarma.soulPattern.fusion.score}/10
            </span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. 노드 축 심층 분석 (보강 - L10 기반) */}
      {/* ============================================================ */}
      {matrixKarma?.nodeAxis && (
        <div className="rounded-2xl bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-2 border-teal-400/50 p-6">
          <div className="text-center mb-4">
            <span className="text-4xl block mb-2">☊</span>
            <h3 className="text-xl font-bold text-teal-200">
              {isKo ? "영혼의 방향 (노드 축)" : "Soul Direction (Node Axis)"}
            </h3>
          </div>

          {/* 과거 → 미래 시각적 흐름 */}
          <div className="flex items-stretch justify-center gap-2 mb-6">
            {/* 사우스노드 (과거) */}
            <div className="flex-1 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
              <p className="text-rose-400 text-xs mb-1 font-bold">☋ {isKo ? "사우스노드" : "South Node"}</p>
              <p className="text-2xl mb-2">{matrixKarma.nodeAxis.southNode.fusion.icon}</p>
              <p className="text-rose-300 font-bold text-sm">{isKo ? "전생의 패턴" : "Past Pattern"}</p>
              <p className="text-rose-200/70 text-xs mt-1">
                {isKo ? matrixKarma.nodeAxis.southNode.pastPattern.ko : matrixKarma.nodeAxis.southNode.pastPattern.en}
              </p>
            </div>

            {/* 화살표 */}
            <div className="flex items-center justify-center px-2">
              <div className="text-3xl text-gray-500">→</div>
            </div>

            {/* 노스노드 (미래) */}
            <div className="flex-1 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center">
              <p className="text-teal-400 text-xs mb-1 font-bold">☊ {isKo ? "노스노드" : "North Node"}</p>
              <p className="text-2xl mb-2">{matrixKarma.nodeAxis.northNode.fusion.icon}</p>
              <p className="text-teal-300 font-bold text-sm">{isKo ? "이번 생 방향" : "This Life's Direction"}</p>
              <p className="text-teal-200/70 text-xs mt-1">
                {isKo ? matrixKarma.nodeAxis.northNode.direction.ko : matrixKarma.nodeAxis.northNode.direction.en}
              </p>
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-rose-400 font-bold text-sm mb-1">🔻 {isKo ? "내려놓을 것" : "To Release"}</p>
              <p className="text-rose-200 text-sm">
                {isKo ? matrixKarma.nodeAxis.southNode.release.ko : matrixKarma.nodeAxis.southNode.release.en}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
              <p className="text-teal-400 font-bold text-sm mb-1">📚 {isKo ? "배울 것" : "To Learn"}</p>
              <p className="text-teal-200 text-sm">
                {isKo ? matrixKarma.nodeAxis.northNode.lesson.ko : matrixKarma.nodeAxis.northNode.lesson.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. 카르마적 관계 패턴 (신규 - L5 기반) */}
      {/* ============================================================ */}
      {matrixKarma && matrixKarma.karmicRelations.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💫</span>
            <h3 className="text-lg font-bold text-pink-300">
              {isKo ? "카르마적 관계 패턴" : "Karmic Relationship Patterns"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "전생부터 이어진 관계의 패턴이에요. 특정 사람들과 강한 끌림이나 갈등을 느낀다면 이 패턴 때문일 수 있어요!"
              : "Relationship patterns from past lives. Strong attraction or conflict with certain people may be due to these patterns!"}
          </p>

          <div className="space-y-3">
            {matrixKarma.karmicRelations.map((rel, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{rel.fusion.icon}</span>
                  <span className="font-bold text-pink-300">{rel.relation}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{rel.aspect}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    rel.fusion.score >= 7 ? 'bg-green-500/30 text-green-300' :
                    rel.fusion.score >= 4 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'
                  }`}>
                    {rel.fusion.level}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? rel.meaning.ko : rel.meaning.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. 전생 힌트 매트릭스 (신규 - L8 기반) */}
      {/* ============================================================ */}
      {matrixKarma && matrixKarma.pastLifeHints.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h3 className="text-lg font-bold text-purple-300">
              {isKo ? "전생 힌트 매트릭스" : "Past Life Hints Matrix"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "신살 × 명왕성 조합으로 본 전생의 에너지예요. 신비로운 영역이라 참고만 해주세요!"
              : "Past life energy seen through Shinsal × Pluto. This is mystical - take it as inspiration!"}
          </p>

          <div className="space-y-3">
            {matrixKarma.pastLifeHints.map((hint, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{hint.fusion.icon}</span>
                  <span className="font-bold text-purple-300">{hint.shinsal}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{hint.planet}</span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? hint.hint.ko : hint.hint.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. 나는 누구? - 일간 (기존) */}
      {/* ============================================================ */}
      {dayMasterInfo && (
        <div className="rounded-2xl bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-2 border-purple-400/50 p-6 shadow-lg shadow-purple-500/10">
          <div className="text-center mb-4">
            <span className="text-5xl block mb-2">{dayMasterInfo.emoji}</span>
            <h3 className="text-2xl font-bold text-purple-200">
              {isKo ? "나는 누구?" : "Who Am I?"}
            </h3>
            <p className="text-purple-400 text-sm mt-1">
              {isKo ? "일간(日干) - 내 영혼의 정체성" : "Day Master - My Soul Identity"}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-xl font-bold text-center text-white mb-2">
              {dayMasterInfo.emoji} {isKo ? dayMasterInfo.simpleKo : dayMasterInfo.simpleEn}
            </p>
            <p className="text-purple-200 text-center text-sm leading-relaxed">
              {isKo ? dayMasterInfo.metaphorKo : dayMasterInfo.metaphorEn}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 font-bold text-sm mb-1">💪 {isKo ? "나의 강점" : "My Strength"}</p>
              <p className="text-green-200 text-sm">{isKo ? dayMasterInfo.strengthKo : dayMasterInfo.strengthEn}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 font-bold text-sm mb-1">⚠️ {isKo ? "조심할 점" : "Watch Out"}</p>
              <p className="text-amber-200 text-sm">{isKo ? dayMasterInfo.watchOutKo : dayMasterInfo.watchOutEn}</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
            <p className="text-purple-300 text-sm">
              {isKo ? dayMasterInfo.luckyColorKo : dayMasterInfo.luckyColorEn}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. 오행 에너지 밸런스 (기존) */}
      {/* ============================================================ */}
      {elementAnalysis && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/30 border border-emerald-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚖️</span>
            <h3 className="text-lg font-bold text-emerald-300">
              {isKo ? "내 안의 다섯 가지 에너지" : "Five Energies Inside Me"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "모든 사람은 나무🌳, 불🔥, 흙🏔️, 쇠⚔️, 물💧 다섯 가지 에너지를 가지고 있어요."
              : "Everyone has five energies: Wood🌳, Fire🔥, Earth🏔️, Metal⚔️, Water💧."}
          </p>

          <div className="space-y-3 mb-4">
            {Object.entries(elementAnalysis.balance).map(([element, value]) => {
              const info = fiveElementsSimple[element];
              if (!info) return null;
              const percentage = Math.min(100, Math.max(5, (value as number) * 20));
              const colors: Record<string, string> = {
                wood: 'from-green-500 to-green-400',
                fire: 'from-red-500 to-orange-400',
                earth: 'from-yellow-600 to-yellow-400',
                metal: 'from-gray-400 to-white',
                water: 'from-blue-600 to-blue-400'
              };

              return (
                <div key={element}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">
                      {info.emoji} {isKo ? info.nameKo : info.nameEn}
                    </span>
                    <span className="text-xs text-gray-400">{value}</span>
                  </div>
                  <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors[element]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 font-bold text-xs mb-1">
                🌟 {isKo ? "가장 강한 에너지" : "Strongest Energy"}
              </p>
              <p className="text-green-300 text-sm">
                {fiveElementsSimple[elementAnalysis.strongest]?.emoji} {isKo ? fiveElementsSimple[elementAnalysis.strongest]?.nameKo : fiveElementsSimple[elementAnalysis.strongest]?.nameEn}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <p className="text-rose-400 font-bold text-xs mb-1">
                💫 {isKo ? "보충하면 좋은 에너지" : "Energy to Boost"}
              </p>
              <p className="text-rose-300 text-sm">
                {fiveElementsSimple[elementAnalysis.weakest]?.emoji} {isKo ? fiveElementsSimple[elementAnalysis.weakest]?.nameKo : fiveElementsSimple[elementAnalysis.weakest]?.nameEn}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. 이번 생의 방향 - 노스노드 (기존) */}
      {/* ============================================================ */}
      {northNodeInfo && !matrixKarma?.nodeAxis && (
        <div className="rounded-2xl bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-2 border-teal-400/50 p-6">
          <div className="text-center mb-4">
            <span className="text-4xl block mb-2">{northNodeInfo.emoji}</span>
            <h3 className="text-xl font-bold text-teal-200">
              {isKo ? northNodeInfo.titleKo : northNodeInfo.titleEn}
            </h3>
            <p className="text-teal-400 text-sm mt-1">
              {isKo ? `노스노드 ${northNodeHouse}하우스` : `North Node ${northNodeHouse}H`}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-teal-200 text-center leading-relaxed">
              {isKo ? northNodeInfo.simpleKo : northNodeInfo.simpleEn}
            </p>
          </div>

          {southNodeHouse && (
            <div className="flex items-center justify-center gap-4 mb-4 p-3 rounded-xl bg-white/5">
              <div className="text-center">
                <p className="text-rose-400 text-xs mb-1">{isKo ? "전생의 패턴" : "Past Life"}</p>
                <p className="text-rose-300 font-bold">← {southNodeHouse}H</p>
              </div>
              <div className="text-2xl text-gray-600">→</div>
              <div className="text-center">
                <p className="text-teal-400 text-xs mb-1">{isKo ? "이번 생" : "This Life"}</p>
                <p className="text-teal-300 font-bold">{northNodeHouse}H →</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
              <p className="text-teal-400 font-bold text-sm mb-1">📚 {isKo ? "배워야 할 것" : "To Learn"}</p>
              <p className="text-teal-200 text-sm">{isKo ? northNodeInfo.lessonKo : northNodeInfo.lessonEn}</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-cyan-400 font-bold text-sm mb-1">💡 {isKo ? "실천 팁" : "Action Tip"}</p>
              <p className="text-cyan-200 text-sm">{isKo ? northNodeInfo.tipKo : northNodeInfo.tipEn}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. 토성의 수업 (기존) */}
      {/* ============================================================ */}
      {saturnInfo && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🪐</span>
            <h3 className="text-lg font-bold text-amber-300">
              {isKo ? "토성 선생님의 수업" : "Saturn Teacher's Lesson"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              {saturnHouse}H
            </span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "토성은 엄격한 선생님처럼, 힘들지만 꼭 배워야 할 것을 가르쳐요."
              : "Saturn teaches like a strict teacher. Hard lessons, but big rewards!"}
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 font-bold text-sm mb-1">📖 {isKo ? "배울 것" : "To Learn"}</p>
              <p className="text-amber-200 text-sm">{isKo ? saturnInfo.lessonKo : saturnInfo.lessonEn}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 font-bold text-sm mb-1">😓 {isKo ? "힘든 점" : "Challenge"}</p>
              <p className="text-red-200 text-sm">{isKo ? saturnInfo.challengeKo : saturnInfo.challengeEn}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 font-bold text-sm mb-1">🏆 {isKo ? "졸업 보상" : "Reward"}</p>
              <p className="text-green-200 text-sm">{isKo ? saturnInfo.rewardKo : saturnInfo.rewardEn}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. 신살 - 타고난 별들 (기존) */}
      {/* ============================================================ */}
      {(luckyList.length > 0 || unluckyList.length > 0) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/30 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⭐</span>
            <h3 className="text-lg font-bold text-violet-300">
              {isKo ? "내가 타고난 별들" : "Stars I Was Born With"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "태어날 때 특별한 별들이 당신에게 선물을 줬어요!"
              : "Special stars gave you gifts when you were born!"}
          </p>

          {luckyList.length > 0 && (
            <div className="mb-4">
              <p className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                ✨ {isKo ? "축복의 별" : "Blessing Stars"}
              </p>
              <div className="space-y-3">
                {luckyList.slice(0, 3).map((item, i: number) => {
                  const name = typeof item === 'string' ? item : (item as { name?: string; shinsal?: string })?.name ?? (item as { name?: string; shinsal?: string })?.shinsal ?? '';
                  const info = shinsalSimple[name];
                  if (!name) return null;

                  return (
                    <div key={i} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{info?.emoji || '⭐'}</span>
                        <span className="font-bold text-green-300">{name}</span>
                      </div>
                      {info && (
                        <p className="text-green-100 text-sm">{isKo ? info.simpleKo : info.simpleEn}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {unluckyList.length > 0 && (
            <div>
              <p className="text-rose-400 font-bold text-sm mb-3 flex items-center gap-2">
                🌟 {isKo ? "도전의 별 (극복하면 강해져요!)" : "Challenge Stars (Grow by overcoming!)"}
              </p>
              <div className="space-y-3">
                {unluckyList.slice(0, 3).map((item, i: number) => {
                  const name = typeof item === 'string' ? item : (item as { name?: string; shinsal?: string })?.name ?? (item as { name?: string; shinsal?: string })?.shinsal ?? '';
                  const info = shinsalSimple[name];
                  if (!name) return null;

                  return (
                    <div key={i} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{info?.emoji || '⚡'}</span>
                        <span className="font-bold text-rose-300">{name}</span>
                      </div>
                      {info && (
                        <p className="text-rose-100 text-sm">{isKo ? info.simpleKo : info.simpleEn}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 11. 영혼 유형 (karmaAnalysis - 기존) */}
      {/* ============================================================ */}
      {karmaAnalysis?.soulType && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-purple-900/40 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{karmaAnalysis.soulType.emoji}</span>
            <div>
              <h3 className="text-lg font-bold text-violet-300">{isKo ? "나의 영혼 타입" : "My Soul Type"}</h3>
              <p className="text-xl font-bold text-purple-200">{karmaAnalysis.soulType.title}</p>
            </div>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed mb-4">{karmaAnalysis.soulType.description}</p>
          {karmaAnalysis.soulType.traits && karmaAnalysis.soulType.traits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {karmaAnalysis.soulType.traits.map((trait, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm">
                  {trait}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 12. 영혼의 사명 (기존) */}
      {/* ============================================================ */}
      {karmaAnalysis?.soulMission && (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌟</span>
            <h3 className="text-lg font-bold text-indigo-300">
              {isKo ? "이번 생에서 할 일" : "What to Do This Life"}
            </h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-indigo-300 font-bold text-sm mb-2">🎯 {isKo ? "핵심 사명" : "Core Mission"}</p>
              <p className="text-gray-200 text-sm leading-relaxed">{karmaAnalysis.soulMission.core}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-300 font-bold text-sm mb-1">💫 {isKo ? "표현 방식" : "Expression"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.soulMission.expression}</p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-cyan-300 font-bold text-sm mb-1">✨ {isKo ? "성취의 순간" : "Fulfillment"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.soulMission.fulfillment}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 13. 치유해야 할 상처 (기존) */}
      {/* ============================================================ */}
      {karmaAnalysis?.woundToHeal && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-900/30 to-pink-900/30 border border-rose-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💝</span>
            <h3 className="text-lg font-bold text-rose-300">
              {isKo ? "치유해야 할 마음" : "Heart to Heal"}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-rose-300 font-bold text-sm mb-1">💔 {isKo ? "아픈 곳" : "The Wound"}</p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.woundToHeal.wound}</p>
            </div>
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <p className="text-pink-300 font-bold text-sm mb-1">🩹 {isKo ? "치유의 길" : "Healing Path"}</p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.woundToHeal.healingPath}</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-purple-500/10 border border-rose-500/20">
              <p className="text-purple-300 font-bold text-sm mb-1">🎁 {isKo ? "치유 후 선물" : "Gift After Healing"}</p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.woundToHeal.gift}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 14. 전생의 힌트 (기존) */}
      {/* ============================================================ */}
      {karmaAnalysis?.pastLifeTheme && (
        <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h3 className="text-lg font-bold text-purple-300">
              {isKo ? "전생의 힌트" : "Past Life Hints"}
            </h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "영감을 줄 수 있는 신비로운 이야기예요!"
              : "Mystical stories that may inspire you!"}
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 font-bold text-sm mb-1">🌀 {isKo ? "전생의 모습" : "Past Life"}</p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.likely}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-300 font-bold text-sm mb-1">✨ {isKo ? "가져온 재능" : "Talents"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.talents}</p>
              </div>
              <div className="p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                <p className="text-fuchsia-300 font-bold text-sm mb-1">📖 {isKo ? "이번 생 숙제" : "Homework"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.lessons}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="karma"
        matrixData={{ matrixKarma }}
      />
    </div>
  );
}
