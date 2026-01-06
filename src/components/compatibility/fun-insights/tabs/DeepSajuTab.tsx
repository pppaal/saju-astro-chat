"use client";

import type { TabProps } from '../types';
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard';

export default function DeepSajuTab({ data, isKo }: TabProps) {
  const { persons, yongsin, seun, gongmang, ganHap, gyeokguk, twelveStates } = data;

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1');
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2');

  return (
    <div className="space-y-6">
      {/* Deep Saju Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-amber-900/30 to-slate-900 border border-amber-500/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <span className="text-5xl mb-4 block">🏛️</span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">
            {isKo ? '심화 사주 분석' : 'Deep Saju Analysis'}
          </h2>
          <p className="text-amber-300">
            {isKo ? '더 깊은 에너지 궁합 분석' : 'Deeper Energy Compatibility'}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {isKo ? '각 항목 💡에 쉬운 설명이 있어요!' : 'Look for 💡 for easy explanations!'}
          </p>
        </div>
      </div>

      {/* 용신/희신 분석 */}
      <InsightCard emoji="⚡" title={isKo ? "용신/희신 궁합" : "Needed Energy Match"} colorTheme="amber">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '💡 용신 = 나에게 부족해서 꼭 필요한 에너지, 희신 = 있으면 좋은 보조 에너지' : 'Yongsin = Energy you need most, Huisin = Helpful supporting energy'}
        </p>

        {yongsin ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InsightContent colorTheme="amber">
                <p className="text-amber-300 font-bold mb-1">{person1Name}</p>
                <p className="text-gray-300 text-sm">
                  {isKo ? '용신' : 'Yongsin'}: <Badge text={yongsin.person1Yongsin} colorTheme="amber" size="sm" />
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  {isKo ? '희신' : 'Huisin'}: <Badge text={yongsin.person1Huisin} colorTheme="emerald" size="sm" />
                </p>
              </InsightContent>

              <InsightContent colorTheme="amber">
                <p className="text-amber-300 font-bold mb-1">{person2Name}</p>
                <p className="text-gray-300 text-sm">
                  {isKo ? '용신' : 'Yongsin'}: <Badge text={yongsin.person2Yongsin} colorTheme="amber" size="sm" />
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  {isKo ? '희신' : 'Huisin'}: <Badge text={yongsin.person2Huisin} colorTheme="emerald" size="sm" />
                </p>
              </InsightContent>
            </div>

            <ScoreBar
              label={isKo ? "용신 보완도" : "Yongsin Compatibility"}
              score={yongsin.compatibility}
              colorTheme="amber"
            />

            {yongsin.mutualSupport && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 mt-4">
                <p className="text-emerald-300 text-sm font-medium">
                  ✨ {isKo ? '서로의 용신을 채워주는 최상의 궁합!' : 'You provide each other\'s Yongsin - Excellent match!'}
                </p>
              </div>
            )}

            <div className="space-y-2 mt-4">
              {yongsin.interpretation.map((text, idx) => (
                <InsightContent key={idx} colorTheme="amber">
                  <p className="text-gray-200 text-sm">{text}</p>
                </InsightContent>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            {isKo ? '용신 분석 데이터를 불러오는 중...' : 'Loading Yongsin analysis...'}
          </p>
        )}
      </InsightCard>

      {/* 천간합 분석 */}
      <InsightCard emoji="🔗" title={isKo ? "천간합 - 끌림의 화학작용" : "Heavenly Stem Chemistry"} colorTheme="purple">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '💡 천간합 = 두 글자가 만나 새 에너지 생성. 갑+기=토, 을+경=금 등 특별한 끌림!' : 'When two stems meet, they create new energy - a special attraction!'}
        </p>

        {ganHap && ganHap.combinations.length > 0 ? (
          <>
            <div className="space-y-3">
              {ganHap.combinations.map((combo, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge text={combo.stem1} colorTheme="purple" />
                    <span className="text-purple-400">+</span>
                    <Badge text={combo.stem2} colorTheme="purple" />
                    <span className="text-purple-400">=</span>
                    <Badge text={combo.resultElement} colorTheme="emerald" />
                  </div>
                  <p className="text-gray-300 text-sm">{combo.description}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {combo.pillar1} ↔ {combo.pillar2}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 text-sm">{ganHap.significance}</p>
            </div>
          </>
        ) : (
          <InsightContent colorTheme="purple">
            <p className="text-gray-300 text-sm text-center">
              {isKo ? '천간합이 없습니다. 다른 방식으로 조화를 이룹니다.' : 'No stem combinations found. Harmony comes from other aspects.'}
            </p>
          </InsightContent>
        )}
      </InsightCard>

      {/* 격국 분석 */}
      <InsightCard emoji="👑" title={isKo ? "격국 - 인생 유형 매칭" : "Life Pattern Match"} colorTheme="indigo">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '💡 격국 = 사주의 기본 틀. 식신격(예술가), 편관격(리더) 등 각자의 인생 스타일' : 'Your life pattern type - artist, leader, scholar, etc.'}
        </p>

        {gyeokguk ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InsightContent colorTheme="indigo">
                <p className="text-indigo-300 font-bold mb-1">{person1Name}</p>
                <Badge text={gyeokguk.person1Gyeokguk} colorTheme="indigo" />
              </InsightContent>

              <InsightContent colorTheme="indigo">
                <p className="text-indigo-300 font-bold mb-1">{person2Name}</p>
                <Badge text={gyeokguk.person2Gyeokguk} colorTheme="indigo" />
              </InsightContent>
            </div>

            <InsightContent colorTheme="indigo" className="mb-4">
              <p className="text-indigo-300 font-medium mb-1">{isKo ? '조화도' : 'Compatibility'}</p>
              <Badge text={gyeokguk.compatibility} colorTheme={
                gyeokguk.compatibility === 'excellent' ? 'emerald' :
                gyeokguk.compatibility === 'good' ? 'sky' :
                gyeokguk.compatibility === 'neutral' ? 'amber' : 'rose'
              } />
            </InsightContent>

            <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-gray-200 text-sm leading-relaxed">{gyeokguk.dynamics}</p>
            </div>

            {gyeokguk.strengths.length > 0 && (
              <div className="mt-3">
                <p className="text-emerald-300 text-xs font-medium mb-2">{isKo ? '강점' : 'Strengths'}</p>
                <div className="flex flex-wrap gap-2">
                  {gyeokguk.strengths.map((s: string, i: number) => (
                    <Badge key={i} text={s} colorTheme="emerald" size="sm" />
                  ))}
                </div>
              </div>
            )}

            {gyeokguk.challenges.length > 0 && (
              <div className="mt-3">
                <p className="text-rose-300 text-xs font-medium mb-2">{isKo ? '도전' : 'Challenges'}</p>
                <div className="flex flex-wrap gap-2">
                  {gyeokguk.challenges.map((c: string, i: number) => (
                    <Badge key={i} text={c} colorTheme="rose" size="sm" />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            {isKo ? '격국 분석 중...' : 'Analyzing Gyeokguk...'}
          </p>
        )}
      </InsightCard>

      {/* 12운성 분석 */}
      <InsightCard emoji="🌀" title={isKo ? "12운성 - 에너지 상태" : "Energy Life Cycle"} colorTheme="cyan">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '💡 장생(시작)→건록(전성기)→사(쇠퇴)→묘(잠복) 등 12단계 에너지 흐름' : 'Birth→Peak→Decline→Rest - 12 stages of energy cycle'}
        </p>

        {twelveStates ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InsightContent colorTheme="cyan">
                <p className="text-cyan-300 font-bold mb-2">{person1Name}</p>
                <div className="space-y-1">
                  {twelveStates.person1States.map((state, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{state.pillar}</span>
                      <Badge text={state.state} colorTheme="cyan" size="sm" />
                    </div>
                  ))}
                </div>
              </InsightContent>

              <InsightContent colorTheme="cyan">
                <p className="text-cyan-300 font-bold mb-2">{person2Name}</p>
                <div className="space-y-1">
                  {twelveStates.person2States.map((state, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{state.pillar}</span>
                      <Badge text={state.state} colorTheme="cyan" size="sm" />
                    </div>
                  ))}
                </div>
              </InsightContent>
            </div>

            <div className="space-y-2">
              {twelveStates.interpretation.map((text, idx) => (
                <InsightContent key={idx} colorTheme="cyan">
                  <p className="text-gray-200 text-sm">{text}</p>
                </InsightContent>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            {isKo ? '12운성 분석 중...' : 'Analyzing Twelve States...'}
          </p>
        )}
      </InsightCard>

      {/* 공망 분석 */}
      <InsightCard emoji="🕳️" title={isKo ? "공망 - 인연의 빈틈" : "Destiny Gaps"} colorTheme="rose">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '💡 공망 = 사주에서 비어있는 글자. 상대가 내 공망이면 "잊기 쉬운" 인연일 수 있음' : 'Empty spots in your chart - may indicate easily forgotten connections'}
        </p>

        {gongmang ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InsightContent colorTheme="rose">
                <p className="text-rose-300 font-bold mb-1">{person1Name} {isKo ? '공망' : 'Empty'}</p>
                <div className="flex gap-2">
                  {gongmang.person1Gongmang.map((g, idx) => (
                    <Badge key={idx} text={g} colorTheme="rose" size="sm" />
                  ))}
                </div>
              </InsightContent>

              <InsightContent colorTheme="rose">
                <p className="text-rose-300 font-bold mb-1">{person2Name} {isKo ? '공망' : 'Empty'}</p>
                <div className="flex gap-2">
                  {gongmang.person2Gongmang.map((g, idx) => (
                    <Badge key={idx} text={g} colorTheme="rose" size="sm" />
                  ))}
                </div>
              </InsightContent>
            </div>

            <div className={`p-4 rounded-xl border ${
              gongmang.impact === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20' :
              gongmang.impact === 'negative' ? 'bg-rose-500/10 border-rose-500/20' :
              'bg-gray-500/10 border-gray-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">
                  {gongmang.impact === 'positive' ? '✅' :
                   gongmang.impact === 'negative' ? '⚠️' : '➖'}
                </span>
                <span className={`font-bold ${
                  gongmang.impact === 'positive' ? 'text-emerald-300' :
                  gongmang.impact === 'negative' ? 'text-rose-300' : 'text-gray-300'
                }`}>
                  {gongmang.impact === 'positive' ? (isKo ? '안정적 인연' : 'Stable Bond') :
                   gongmang.impact === 'negative' ? (isKo ? '주의 필요' : 'Needs Attention') :
                   (isKo ? '보통' : 'Neutral')}
                </span>
              </div>
              {gongmang.interpretation.map((text, idx) => (
                <p key={idx} className="text-gray-200 text-sm">{text}</p>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            {isKo ? '공망 분석 중...' : 'Analyzing Empty Branches...'}
          </p>
        )}
      </InsightCard>

      {/* 올해 세운 */}
      <InsightCard emoji="📅" title={isKo ? `${new Date().getFullYear()}년 올해의 운` : `${new Date().getFullYear()} This Year's Fortune`} colorTheme="green">
        <p className="text-gray-400 text-sm mb-4">
          {isKo ? '💡 세운 = 올해 지구를 감싸는 에너지. 각자에게 어떤 영향을 주는지 분석' : 'This year\'s energy affecting your relationship'}
        </p>

        {seun ? (
          <>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
                <span className="text-2xl">{seun.yearStem}{seun.yearBranch}</span>
                <Badge text={seun.yearElement} colorTheme="green" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <InsightContent colorTheme="green">
                <p className="text-green-300 font-bold mb-1">{person1Name}</p>
                <Badge
                  text={seun.person1Impact === 'very_favorable' ? (isKo ? '매우 좋음' : 'Excellent') :
                        seun.person1Impact === 'favorable' ? (isKo ? '좋음' : 'Good') :
                        seun.person1Impact === 'neutral' ? (isKo ? '보통' : 'Neutral') :
                        seun.person1Impact === 'challenging' ? (isKo ? '주의' : 'Caution') :
                        (isKo ? '어려움' : 'Challenging')}
                  colorTheme={seun.person1Impact.includes('favorable') ? 'emerald' : seun.person1Impact === 'neutral' ? 'blue' : 'orange'}
                />
              </InsightContent>

              <InsightContent colorTheme="green">
                <p className="text-green-300 font-bold mb-1">{person2Name}</p>
                <Badge
                  text={seun.person2Impact === 'very_favorable' ? (isKo ? '매우 좋음' : 'Excellent') :
                        seun.person2Impact === 'favorable' ? (isKo ? '좋음' : 'Good') :
                        seun.person2Impact === 'neutral' ? (isKo ? '보통' : 'Neutral') :
                        seun.person2Impact === 'challenging' ? (isKo ? '주의' : 'Caution') :
                        (isKo ? '어려움' : 'Challenging')}
                  colorTheme={seun.person2Impact.includes('favorable') ? 'emerald' : seun.person2Impact === 'neutral' ? 'blue' : 'orange'}
                />
              </InsightContent>
            </div>

            <InsightContent colorTheme="green">
              <p className="text-gray-200 text-sm leading-relaxed">{seun.combinedOutlook}</p>
            </InsightContent>

            {seun.advice.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-green-300 font-medium text-sm">{isKo ? '💡 올해 조언' : '💡 This Year\'s Advice'}</p>
                {seun.advice.map((advice, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10">
                    <span className="text-green-400 text-sm">{idx + 1}.</span>
                    <p className="text-gray-300 text-sm">{advice}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">
            {isKo ? '세운 분석 중...' : 'Analyzing annual fortune...'}
          </p>
        )}
      </InsightCard>
    </div>
  );
}
