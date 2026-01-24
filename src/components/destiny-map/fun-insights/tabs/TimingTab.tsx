"use client";

import type { TabProps } from './types';
import { getTimingMatrixAnalysis } from '../analyzers/matrixAnalyzer';
import type { TimingMatrixResult } from '../analyzers/types/domain.types';
import { PremiumReportCTA } from '../components';

export default function TimingTab({ isKo, saju, astro }: TabProps) {
  const timingMatrix = getTimingMatrixAnalysis(saju ?? undefined, astro ?? undefined, isKo ? 'ko' : 'en') as TimingMatrixResult | null;

  // 현재 날짜 기준 계산
  const currentYear = new Date().getFullYear();

  // Find current period from daeunTimeline array
  const currentPeriod = timingMatrix?.daeunTimeline?.find(item => item.isCurrent);

  return (
    <div className="space-y-6">
      {/* 타이밍 종합 점수 */}
      {timingMatrix && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⏰</span>
            <div>
              <h3 className="text-lg font-bold text-amber-300">{isKo ? '운세 타이밍 매트릭스' : 'Fortune Timing Matrix'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '대운, 트랜짓, 역행 종합 분석' : 'Major luck, transit, retrograde analysis'}</p>
            </div>
          </div>

          {/* 종합 타이밍 점수 */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-amber-300 font-bold text-sm">{isKo ? '현재 타이밍 점수' : 'Current Timing Score'}</p>
              <span className="text-2xl font-bold text-amber-400">{timingMatrix.overallScore}{isKo ? '점' : 'pts'}</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                style={{ width: `${timingMatrix.overallScore}%` }}
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? timingMatrix.overallMessage?.ko : timingMatrix.overallMessage?.en}
            </p>
          </div>
        </div>
      )}

      {/* 대운 타임라인 (L4) */}
      {timingMatrix?.daeunTimeline && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌊</span>
            <div>
              <h3 className="text-lg font-bold text-indigo-300">{isKo ? '대운 타임라인' : 'Major Luck Timeline'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '10년 주기 운세 흐름' : '10-year fortune cycle'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 ml-auto">L4</span>
          </div>

          {/* 현재 대운 */}
          {currentPeriod && (
            <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-500/30 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{currentPeriod.icon}</span>
                <span className="text-indigo-300 font-bold text-sm">{isKo ? '현재 대운' : 'Current Major Luck'}</span>
                <span className="text-white font-bold ml-auto">{currentPeriod.period}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{currentPeriod.element}</span>
                <span className="text-gray-300">{currentPeriod.heavenlyStem}{currentPeriod.earthlyBranch}</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">
                {currentPeriod.description ? (isKo ? currentPeriod.description.ko : currentPeriod.description.en) : ''}
              </p>
              {currentPeriod.advice && (
                <p className="text-indigo-400 text-xs">
                  {isKo ? currentPeriod.advice.ko : currentPeriod.advice.en}
                </p>
              )}
            </div>
          )}

          {/* 대운 흐름 시각화 */}
          {timingMatrix.daeunTimeline && timingMatrix.daeunTimeline.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs mb-2">{isKo ? '대운 흐름' : 'Luck Flow'}</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {timingMatrix.daeunTimeline.map((daeun, idx) => (
                  <div
                    key={idx}
                    className={`flex-shrink-0 p-3 rounded-lg text-center ${
                      daeun.isCurrent
                        ? 'bg-indigo-500/20 border-2 border-indigo-500'
                        : daeun.isPast
                        ? 'bg-gray-800/50 border border-gray-700 opacity-60'
                        : 'bg-gray-800/30 border border-gray-700'
                    }`}
                  >
                    <p className="text-lg mb-1">{daeun.element}</p>
                    <p className="text-white font-bold text-sm">{daeun.stem}{daeun.branch}</p>
                    <p className="text-gray-400 text-xs">{daeun.ageRange}</p>
                    {daeun.isCurrent && (
                      <span className="text-xs text-indigo-400">{isKo ? '현재' : 'Now'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 대운 전환기 알림 */}
          {timingMatrix.overallMessage && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="text-amber-300 font-bold text-sm">{isKo ? '대운 전환기' : 'Luck Transition'}</span>
              </div>
              <p className="text-gray-300 text-xs mt-1">
                {isKo ? timingMatrix.overallMessage.ko : timingMatrix.overallMessage.en}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 중요 트랜짓 알림 (L4) */}
      {timingMatrix?.majorTransits && timingMatrix.majorTransits.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🪐</span>
            <div>
              <h3 className="text-lg font-bold text-purple-300">{isKo ? '중요 트랜짓 알림' : 'Major Transit Alerts'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '토성회귀, 목성회귀, 노드회귀' : 'Saturn, Jupiter, Node Returns'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 ml-auto">L4</span>
          </div>

          <div className="space-y-3">
            {timingMatrix.majorTransits.map((transit, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  transit.isActive
                    ? 'bg-purple-500/15 border-purple-500/30'
                    : transit.isUpcoming
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-gray-800/30 border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{transit.icon}</span>
                    <span className="text-white font-bold text-sm">{transit.name}</span>
                    {transit.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
                        {isKo ? '진행 중' : 'Active'}
                      </span>
                    )}
                    {transit.isUpcoming && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300">
                        {isKo ? '예정' : 'Upcoming'}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">{transit.period}</span>
                </div>
                {transit.description && (
                  <p className="text-gray-300 text-sm leading-relaxed mb-2">
                    {isKo ? transit.description.ko : transit.description.en}
                  </p>
                )}
                {transit.advice && (
                  <p className={`text-xs ${transit.isActive ? 'text-purple-400' : 'text-gray-500'}`}>
                    {isKo ? transit.advice.ko : transit.advice.en}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 역행 캘린더 (L4) */}
      {timingMatrix?.retrogrades && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-orange-900/20 border border-orange-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔄</span>
            <div>
              <h3 className="text-lg font-bold text-orange-300">{isKo ? '역행 캘린더' : 'Retrograde Calendar'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '수성, 금성, 화성 역행 기간' : 'Mercury, Venus, Mars retrograde periods'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 ml-auto">L4</span>
          </div>

          {/* 현재 역행 상태 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {timingMatrix.retrogrades.map((planet, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-center ${
                  planet.isRetrograde
                    ? 'bg-orange-500/15 border border-orange-500/30'
                    : 'bg-green-500/10 border border-green-500/20'
                }`}
              >
                <span className="text-2xl">{planet.icon}</span>
                <p className="text-white font-bold text-sm mt-1">{planet.name}</p>
                <p className={`text-xs ${planet.isRetrograde ? 'text-orange-400' : 'text-green-400'}`}>
                  {planet.isRetrograde ? (isKo ? '역행 중' : 'Rx') : (isKo ? '순행' : 'Direct')}
                </p>
              </div>
            ))}
          </div>

          {/* 역행 기간 목록 */}
          {timingMatrix.retrogrades && timingMatrix.retrogrades.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs mb-2">{isKo ? `${currentYear}년 역행 일정` : `${currentYear} Retrograde Schedule`}</p>
              {timingMatrix.retrogrades.map((retro, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                  <div className="flex items-center gap-2">
                    <span>{retro.icon}</span>
                    <span className="text-gray-300 text-sm">{retro.name}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{retro.period}</span>
                </div>
              ))}
            </div>
          )}

          {/* 역행 주의사항 */}
          <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-300 text-xs leading-relaxed">
              {isKo
                ? '* 역행 기간에는 해당 행성 관련 영역의 재고와 성찰이 필요해요. 새로운 시작보다 마무리에 집중하세요.'
                : '* During retrogrades, reflect on areas related to that planet. Focus on completion rather than new beginnings.'}
            </p>
          </div>
        </div>
      )}

      {/* 세운/월운/일운 분석 (L4) */}
      {(timingMatrix as any)?.periodLuck && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="text-lg font-bold text-cyan-300">{isKo ? '세운/월운/일운 분석' : 'Year/Month/Day Fortune'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '기간별 운세 에너지 분석' : 'Period-based fortune energy'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 ml-auto">L4</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 세운 (올해) */}
            {(timingMatrix as any).periodLuck.year && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{(timingMatrix as any).periodLuck.year.icon}</span>
                  <span className="text-cyan-300 font-bold text-sm">{isKo ? `${currentYear}년 세운` : `${currentYear} Year`}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{(timingMatrix as any).periodLuck.year.element}</span>
                  <span className="text-white font-bold">{(timingMatrix as any).periodLuck.year.stem}{(timingMatrix as any).periodLuck.year.branch}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {isKo ? (timingMatrix as any).periodLuck.year.description.ko : (timingMatrix as any).periodLuck.year.description.en}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{isKo ? '에너지' : 'Energy'}</span>
                  <span className="text-cyan-400 font-bold">{(timingMatrix as any).periodLuck.year.score}%</span>
                </div>
              </div>
            )}

            {/* 월운 (이번 달) */}
            {(timingMatrix as any).periodLuck.month && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{(timingMatrix as any).periodLuck.month.icon}</span>
                  <span className="text-blue-300 font-bold text-sm">{isKo ? '이번 달 월운' : 'This Month'}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{(timingMatrix as any).periodLuck.month.element}</span>
                  <span className="text-white font-bold">{(timingMatrix as any).periodLuck.month.stem}{(timingMatrix as any).periodLuck.month.branch}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {isKo ? (timingMatrix as any).periodLuck.month.description.ko : (timingMatrix as any).periodLuck.month.description.en}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{isKo ? '에너지' : 'Energy'}</span>
                  <span className="text-blue-400 font-bold">{(timingMatrix as any).periodLuck.month.score}%</span>
                </div>
              </div>
            )}

            {/* 일운 (오늘) */}
            {(timingMatrix as any).periodLuck.day && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{(timingMatrix as any).periodLuck.day.icon}</span>
                  <span className="text-violet-300 font-bold text-sm">{isKo ? '오늘 일운' : 'Today'}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{(timingMatrix as any).periodLuck.day.element}</span>
                  <span className="text-white font-bold">{(timingMatrix as any).periodLuck.day.stem}{(timingMatrix as any).periodLuck.day.branch}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {isKo ? (timingMatrix as any).periodLuck.day.description.ko : (timingMatrix as any).periodLuck.day.description.en}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{isKo ? '에너지' : 'Energy'}</span>
                  <span className="text-violet-400 font-bold">{(timingMatrix as any).periodLuck.day.score}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 행운의 시기 예측 (L4 + L7) */}
      {timingMatrix?.luckyPeriods && timingMatrix.luckyPeriods.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-green-900/20 border border-green-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🍀</span>
            <div>
              <h3 className="text-lg font-bold text-green-300">{isKo ? '행운의 시기 예측' : 'Lucky Period Forecast'}</h3>
              <p className="text-gray-500 text-xs">{isKo ? '대운 × 트랜짓 융합 분석' : 'Major luck × transit fusion'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 ml-auto">L4+L7</span>
          </div>

          <div className="space-y-3">
            {(timingMatrix.luckyPeriods as any[]).slice(0, 5).map((period, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  period.strength === 'strong'
                    ? 'bg-green-500/15 border-green-500/30'
                    : period.strength === 'moderate'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-gray-800/30 border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{period.icon}</span>
                    <span className="text-white font-bold text-sm">{period.period}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      period.strength === 'strong'
                        ? 'bg-green-500/30 text-green-300'
                        : period.strength === 'moderate'
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-gray-500/30 text-gray-300'
                    }`}>
                      {period.strength === 'strong' ? (isKo ? '강함' : 'Strong')
                        : period.strength === 'moderate' ? (isKo ? '보통' : 'Moderate')
                        : (isKo ? '약함' : 'Mild')}
                    </span>
                  </div>
                  <span className="text-green-400 font-bold">{period.score}%</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">
                  {isKo ? period.description.ko : period.description.en}
                </p>
                <div className="flex flex-wrap gap-2">
                  {period.goodFor.map((item: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 없을 때 안내 */}
      {!timingMatrix && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6 text-center">
          <span className="text-4xl mb-4 block">⏰</span>
          <h3 className="text-lg font-bold text-gray-300 mb-2">
            {isKo ? '타이밍 분석을 위해 더 많은 정보가 필요해요' : 'More info needed for timing analysis'}
          </h3>
          <p className="text-gray-500 text-sm">
            {isKo
              ? '사주와 점성 정보가 있으면 대운, 트랜짓, 역행 등 상세한 타이밍 분석을 제공해드려요.'
              : 'With saju and astrology data, we can provide detailed timing analysis including major luck, transits, and retrogrades.'}
          </p>
        </div>
      )}

      {/* AI Premium Report CTA */}
      <PremiumReportCTA
        section="timing"
        matrixData={{ timingMatrix }}
      />
    </div>
  );
}
