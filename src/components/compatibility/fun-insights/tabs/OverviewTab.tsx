"use client";

import type { TabProps } from '../types';
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard';

export default function OverviewTab({ data, isKo }: TabProps) {
  const { persons, sajuAnalysis, synastry, overallScore = 75 } = data;

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1');
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2');

  // Grade color mapping
  const gradeColors: Record<string, string> = {
    'S+': 'from-amber-500 to-yellow-400',
    'S': 'from-purple-500 to-pink-400',
    'A': 'from-emerald-500 to-green-400',
    'B': 'from-blue-500 to-cyan-400',
    'C': 'from-orange-500 to-amber-400',
    'D': 'from-red-500 to-orange-400',
    'F': 'from-gray-500 to-slate-400',
  };

  const grade = sajuAnalysis?.grade || 'B';
  const gradeColor = gradeColors[grade] || gradeColors['B'];

  return (
    <div className="space-y-6">
      {/* Hero Score Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-pink-900/40 to-slate-900 border border-pink-500/30 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl" />

        <div className="relative text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-2">
            {person1Name} & {person2Name}
          </h2>
          <p className="text-gray-400">
            {isKo ? '두 분의 운명적 궁합 분석' : 'Cosmic Compatibility Analysis'}
          </p>
        </div>

        <div className="relative flex flex-col md:flex-row items-center justify-center gap-8">
          {/* Overall Score */}
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 100) * 352} 352`}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">{overallScore}</span>
              </div>
            </div>
            <p className="text-pink-300 mt-2 font-medium">
              {isKo ? '종합 궁합 점수' : 'Overall Score'}
            </p>
          </div>

          {/* Grade Badge */}
          <div className="text-center">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center mx-auto shadow-lg`}>
              <span className="text-4xl font-black text-white">{grade}</span>
            </div>
            <p className="text-amber-300 mt-2 font-medium">
              {isKo ? '궁합 등급' : 'Grade'}
            </p>
          </div>
        </div>

        {/* Quick Summary */}
        {sajuAnalysis?.summary && (
          <div className="relative mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-gray-200 text-center leading-relaxed">
              {sajuAnalysis.summary}
            </p>
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard emoji="☯️" title={isKo ? "사주 궁합" : "Saju Compatibility"} colorTheme="amber">
          <ScoreBar
            label={isKo ? "십성 조화" : "Ten Gods Harmony"}
            score={sajuAnalysis?.tenGods?.interaction?.balance || 65}
            colorTheme="amber"
          />
          <ScoreBar
            label={isKo ? "합 관계" : "Harmonious Relations"}
            score={sajuAnalysis?.harmonies?.score || 60}
            colorTheme="amber"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {sajuAnalysis?.detailedInsights?.slice(0, 2).map((insight, idx) => (
              <Badge key={idx} text={insight.slice(0, 30) + '...'} colorTheme="amber" size="sm" />
            ))}
          </div>
        </InsightCard>

        <InsightCard emoji="✨" title={isKo ? "점성 궁합" : "Astrology Compatibility"} colorTheme="purple">
          <ScoreBar
            label={isKo ? "감정적 연결" : "Emotional Connection"}
            score={synastry?.emotionalConnection || 70}
            colorTheme="purple"
          />
          <ScoreBar
            label={isKo ? "로맨틱 케미" : "Romantic Chemistry"}
            score={synastry?.romanticConnection || 65}
            colorTheme="purple"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {synastry?.strengths?.slice(0, 2).map((strength, idx) => (
              <Badge key={idx} text={strength.slice(0, 30) + '...'} colorTheme="purple" size="sm" />
            ))}
          </div>
        </InsightCard>
      </div>

      {/* Relationship Keywords */}
      <InsightCard emoji="💕" title={isKo ? "우리 관계의 키워드" : "Relationship Keywords"} colorTheme="pink">
        <div className="flex flex-wrap gap-3 justify-center">
          {sajuAnalysis?.shinsals?.luckyInteractions?.slice(0, 3).map((interaction, idx) => (
            <div key={idx} className="px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300">
              {interaction}
            </div>
          ))}
          {synastry?.strengths?.slice(0, 2).map((strength, idx) => (
            <div key={idx} className="px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300">
              {strength}
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Warning Signs */}
      {((sajuAnalysis?.conflicts?.totalConflicts || 0) > 0 || (synastry?.challenges?.length || 0) > 0) && (
        <InsightCard emoji="⚡" title={isKo ? "주의할 점" : "Points to Watch"} colorTheme="orange">
          <div className="space-y-3">
            {sajuAnalysis?.conflicts?.mitigationAdvice?.map((advice, idx) => (
              <InsightContent key={idx} colorTheme="orange">
                <p className="text-gray-200 text-sm">{advice}</p>
              </InsightContent>
            ))}
            {synastry?.challenges?.map((challenge, idx) => (
              <InsightContent key={idx} colorTheme="orange">
                <p className="text-gray-200 text-sm">{challenge}</p>
              </InsightContent>
            ))}
          </div>
        </InsightCard>
      )}
    </div>
  );
}
