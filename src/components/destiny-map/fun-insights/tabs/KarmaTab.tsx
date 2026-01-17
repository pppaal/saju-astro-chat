"use client";

import type { TabProps } from './types';
import type { KarmaAnalysisResult } from '../analyzers/karmaAnalyzer';
import type { SajuDataExtended, PlanetData } from './data';
import {
  dayMasterSimple,
  fiveElementsSimple,
  shinsalSimple,
  northNodeSimple,
  saturnSimple,
  findPlanetHouse,
  analyzeElements,
} from './data';

export default function KarmaTab({ saju, astro, isKo, data }: TabProps) {
  const karmaAnalysis = (data as Record<string, unknown>).karmaAnalysis as KarmaAnalysisResult | null;

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

  if (!karmaAnalysis && !dayMaster && !northNodeHouse) {
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
      {/* 1. 나는 누구? - 일간 (가장 중요!) */}
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
      {/* 2. 오행 에너지 밸런스 */}
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
              ? "모든 사람은 나무🌳, 불🔥, 흙🏔️, 쇠⚔️, 물💧 다섯 가지 에너지를 가지고 있어요. 어떤 것이 많고 적은지가 성격을 만들어요!"
              : "Everyone has five energies: Wood🌳, Fire🔥, Earth🏔️, Metal⚔️, Water💧. How much of each shapes your personality!"}
          </p>

          {/* 에너지 바 차트 */}
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

          {/* 가장 강한/약한 에너지 */}
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

          {/* 약한 에너지 보충 방법 */}
          {fiveElementsSimple[elementAnalysis.weakest] && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <p className="text-indigo-300 font-bold text-sm mb-2">
                💡 {isKo ? "이렇게 보충하세요!" : "How to Boost!"}
              </p>
              <p className="text-indigo-200 text-sm">
                {isKo ? fiveElementsSimple[elementAnalysis.weakest].likeKo : fiveElementsSimple[elementAnalysis.weakest].likeEn}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. 이번 생의 방향 - 노스노드 */}
      {/* ============================================================ */}
      {northNodeInfo && (
        <div className="rounded-2xl bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-2 border-teal-400/50 p-6">
          <div className="text-center mb-4">
            <span className="text-4xl block mb-2">{northNodeInfo.emoji}</span>
            <h3 className="text-xl font-bold text-teal-200">
              {isKo ? northNodeInfo.titleKo : northNodeInfo.titleEn}
            </h3>
            <p className="text-teal-400 text-sm mt-1">
              {isKo ? `노스노드 ${northNodeHouse}하우스 - 이번 생의 성장 방향` : `North Node ${northNodeHouse}H - This Life's Growth Direction`}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-teal-200 text-center leading-relaxed">
              {isKo ? northNodeInfo.simpleKo : northNodeInfo.simpleEn}
            </p>
          </div>

          {/* 과거 → 미래 시각화 */}
          {southNodeHouse && (
            <div className="flex items-center justify-center gap-4 mb-4 p-3 rounded-xl bg-white/5">
              <div className="text-center">
                <p className="text-rose-400 text-xs mb-1">{isKo ? "전생의 패턴" : "Past Life Pattern"}</p>
                <p className="text-rose-300 font-bold">← {southNodeHouse}H</p>
                <p className="text-rose-400/70 text-xs">{isKo ? "(내려놓을 것)" : "(Let Go)"}</p>
              </div>
              <div className="text-2xl text-gray-600">→</div>
              <div className="text-center">
                <p className="text-teal-400 text-xs mb-1">{isKo ? "이번 생의 방향" : "This Life's Direction"}</p>
                <p className="text-teal-300 font-bold">{northNodeHouse}H →</p>
                <p className="text-teal-400/70 text-xs">{isKo ? "(나아갈 곳)" : "(Go Here)"}</p>
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
      {/* 4. 토성의 수업 */}
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
              ? "토성은 엄격한 선생님처럼, 힘들지만 꼭 배워야 할 것을 가르쳐요. 졸업하면 큰 보상이 있어요!"
              : "Saturn teaches like a strict teacher. Hard lessons, but big rewards after graduation!"}
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
              <p className="text-green-400 font-bold text-sm mb-1">🏆 {isKo ? "졸업 보상" : "Graduation Reward"}</p>
              <p className="text-green-200 text-sm">{isKo ? saturnInfo.rewardKo : saturnInfo.rewardEn}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. 신살 - 타고난 별들 */}
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
              ? "태어날 때 특별한 별들이 당신에게 선물을 줬어요. 이 별들이 삶의 패턴을 만들어요!"
              : "Special stars gave you gifts when you were born. These stars create life patterns!"}
          </p>

          {/* 길신 (Lucky Stars) */}
          {luckyList.length > 0 && (
            <div className="mb-4">
              <p className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                ✨ {isKo ? "축복의 별 (길신)" : "Blessing Stars (Lucky)"}
              </p>
              <div className="space-y-3">
                {luckyList.map((item, i: number) => {
                  const name = typeof item === 'string' ? item : (item as { name?: string; shinsal?: string })?.name ?? (item as { name?: string; shinsal?: string })?.shinsal ?? '';
                  const info = shinsalSimple[name];
                  if (!name) return null;

                  return (
                    <div key={i} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{info?.emoji || '⭐'}</span>
                        <span className="font-bold text-green-300">{name}</span>
                        {info && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/30 text-green-200">
                            {isKo ? info.typeKo : info.typeEn}
                          </span>
                        )}
                      </div>
                      {info ? (
                        <>
                          <p className="text-green-100 text-sm font-medium mb-1">
                            {isKo ? info.simpleKo : info.simpleEn}
                          </p>
                          <p className="text-green-200/80 text-sm leading-relaxed mb-2">
                            {isKo ? info.storyKo : info.storyEn}
                          </p>
                          <p className="text-green-400 text-xs">
                            💡 {isKo ? info.adviceKo : info.adviceEn}
                          </p>
                        </>
                      ) : (
                        <p className="text-green-200 text-sm">
                          {isKo ? "특별한 축복을 주는 별이에요!" : "A star that gives special blessings!"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 흉신 (Challenging Stars) */}
          {unluckyList.length > 0 && (
            <div>
              <p className="text-rose-400 font-bold text-sm mb-3 flex items-center gap-2">
                🌟 {isKo ? "도전의 별 (극복하면 강해져요!)" : "Challenge Stars (Overcome to Grow!)"}
              </p>
              <div className="space-y-3">
                {unluckyList.map((item, i: number) => {
                  const name = typeof item === 'string' ? item : (item as { name?: string; shinsal?: string })?.name ?? (item as { name?: string; shinsal?: string })?.shinsal ?? '';
                  const info = shinsalSimple[name];
                  if (!name) return null;

                  return (
                    <div key={i} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{info?.emoji || '⚡'}</span>
                        <span className="font-bold text-rose-300">{name}</span>
                        {info && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200">
                            {isKo ? info.typeKo : info.typeEn}
                          </span>
                        )}
                      </div>
                      {info ? (
                        <>
                          <p className="text-rose-100 text-sm font-medium mb-1">
                            {isKo ? info.simpleKo : info.simpleEn}
                          </p>
                          <p className="text-rose-200/80 text-sm leading-relaxed mb-2">
                            {isKo ? info.storyKo : info.storyEn}
                          </p>
                          <p className="text-rose-400 text-xs">
                            💪 {isKo ? info.adviceKo : info.adviceEn}
                          </p>
                        </>
                      ) : (
                        <p className="text-rose-200 text-sm">
                          {isKo ? "극복하면 강해지는 별이에요!" : "A star that makes you stronger when overcome!"}
                        </p>
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
      {/* 6. 영혼 유형 (karmaAnalysis) */}
      {/* ============================================================ */}
      {karmaAnalysis?.soulType && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-purple-900/40 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{karmaAnalysis.soulType.emoji}</span>
            <div>
              <h3 className="text-lg font-bold text-violet-300">
                {isKo ? "나의 영혼 타입" : "My Soul Type"}
              </h3>
              <p className="text-xl font-bold text-purple-200">{karmaAnalysis.soulType.title}</p>
            </div>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed mb-4">
            {karmaAnalysis.soulType.description}
          </p>
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
      {/* 7. 영혼의 사명 */}
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
      {/* 8. 치유해야 할 상처 */}
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
      {/* 9. 전생의 힌트 */}
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
              ? "당신의 영혼이 전생에서 가져온 이야기예요. 신비로운 이야기라 100% 맞다고 할 순 없지만, 영감을 줄 수 있어요!"
              : "Stories your soul brought from past lives. Can't say it's 100% accurate, but may inspire you!"}
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 font-bold text-sm mb-1">🌀 {isKo ? "전생의 모습" : "Past Life Glimpse"}</p>
              <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.likely}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-300 font-bold text-sm mb-1">✨ {isKo ? "가져온 재능" : "Brought Talents"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.talents}</p>
              </div>
              <div className="p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                <p className="text-fuchsia-300 font-bold text-sm mb-1">📖 {isKo ? "이번 생 숙제" : "This Life's Homework"}</p>
                <p className="text-gray-300 text-sm">{karmaAnalysis.pastLifeTheme.lessons}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. 카르마 인사이트 점수 */}
      {/* ============================================================ */}
      {karmaAnalysis && karmaAnalysis.karmaScore > 30 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📊</span>
            <h3 className="text-lg font-bold text-violet-300">
              {isKo ? "분석 깊이" : "Analysis Depth"}
            </h3>
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">{isKo ? "얼마나 자세히 볼 수 있는지" : "How detailed the analysis is"}</p>
            <span className="text-xl font-bold text-violet-400">{karmaAnalysis.karmaScore}%</span>
          </div>
          <div className="h-4 bg-gray-800/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700"
              style={{ width: `${karmaAnalysis.karmaScore}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {isKo
              ? karmaAnalysis.karmaScore >= 80 ? "🌟 정말 깊은 영혼의 여정이 보여요!"
                : karmaAnalysis.karmaScore >= 60 ? "✨ 카르마 패턴이 잘 드러나고 있어요"
                : karmaAnalysis.karmaScore >= 40 ? "💫 기본적인 패턴을 볼 수 있어요"
                : "🌙 더 많은 정보가 있으면 더 자세히 볼 수 있어요"
              : karmaAnalysis.karmaScore >= 80 ? "🌟 Very deep soul journey revealed!"
                : karmaAnalysis.karmaScore >= 60 ? "✨ Karma patterns showing clearly"
                : karmaAnalysis.karmaScore >= 40 ? "💫 Basic patterns visible"
                : "🌙 More info would enable deeper analysis"}
          </p>
        </div>
      )}
    </div>
  );
}
