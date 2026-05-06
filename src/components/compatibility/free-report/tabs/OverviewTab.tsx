'use client'

import { useMemo } from 'react'
import type { TabProps } from '../types'
import { InsightCard, InsightContent, ScoreBar, Badge } from '../InsightCard'

export default function OverviewTab({ data, isKo }: TabProps) {
  const {
    persons,
    sajuAnalysis,
    synastry,
    conflicts,
    harmonies,
    tenGods: _tenGods,
    shinsals: _shinsals,
    overallScore = 75,
  } = data

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1')
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2')

  // Memoize analysis text generation to avoid recalculating on every render
  const analysisLines = useMemo(() => {
    const lines: string[] = []
    if (isKo) {
      lines.push(`${person1Name}님과 ${person2Name}님의 종합 궁합 점수는 ${overallScore}점입니다.`)
      const g = sajuAnalysis?.grade || 'B'
      lines.push(
        `궁합 등급은 ${g} 등급으로, ${g === 'S+' || g === 'S' ? '매우 높은 수준의 조화를 이루고 있습니다.' : g === 'A' ? '좋은 궁합을 가지고 있습니다.' : g === 'B' ? '무난한 궁합이며 노력으로 더 좋아질 수 있습니다.' : '서로의 차이를 이해하고 노력이 필요합니다.'}`
      )
      if (sajuAnalysis?.summary) {
        lines.push(sajuAnalysis.summary)
      }
      const tenGodBalance = sajuAnalysis?.tenGods?.interaction?.balance || 0
      if (tenGodBalance >= 70) {
        lines.push(
          `십성 조화도가 ${tenGodBalance}점으로 높은 편이며, 두 분은 서로를 자연스럽게 보완하는 관계입니다.`
        )
      } else if (tenGodBalance >= 50) {
        lines.push(
          `십성 조화도가 ${tenGodBalance}점으로 보통 수준이며, 일부 영역에서 조율이 필요합니다.`
        )
      } else {
        lines.push(
          `십성 조화도가 ${tenGodBalance}점으로 낮은 편이지만, 서로 다른 점이 오히려 성장의 기회가 됩니다.`
        )
      }
      const harmonyScore = sajuAnalysis?.harmonies?.score || harmonies?.score || 0
      if (harmonyScore > 0) {
        lines.push(
          `합(合) 관계 점수는 ${harmonyScore}점이며, ${harmonyScore >= 70 ? '지지 간의 결합이 강하여 자연스러운 유대감을 형성합니다.' : '기본적인 조화를 이루고 있으나 더 깊은 이해가 필요합니다.'}`
        )
      }
      const totalConflicts =
        conflicts?.totalConflicts || sajuAnalysis?.conflicts?.totalConflicts || 0
      if (totalConflicts > 0) {
        lines.push(
          `충형파해 ${totalConflicts}개가 발견되었으며, ${totalConflicts >= 3 ? '갈등 요소가 다소 많으므로 상호 이해와 양보가 중요합니다.' : '소수의 갈등 요소가 있으나 충분히 극복 가능합니다.'}`
        )
      } else {
        lines.push('충형파해가 발견되지 않아 큰 갈등 없이 평화로운 관계를 유지할 수 있습니다.')
      }
      const emotionalScore = synastry?.emotionalConnection || 0
      const romanticScore = synastry?.romanticConnection || 0
      if (emotionalScore > 0 || romanticScore > 0) {
        lines.push(
          `점성학적으로 감정적 연결은 ${emotionalScore}점, 로맨틱 케미는 ${romanticScore}점입니다.`
        )
        if (emotionalScore >= 75) {
          lines.push('감정적으로 깊은 공감대를 형성하며, 서로의 감정을 직관적으로 이해합니다.')
        }
        if (romanticScore >= 75) {
          lines.push('강한 로맨틱 끌림이 있어 첫 만남부터 특별한 연결을 느꼈을 수 있습니다.')
        }
      }
      if (sajuAnalysis?.detailedInsights && sajuAnalysis.detailedInsights.length > 0) {
        lines.push(...sajuAnalysis.detailedInsights.slice(0, 3))
      }
      if (synastry?.strengths && synastry.strengths.length > 0) {
        lines.push(`관계의 강점: ${synastry.strengths.slice(0, 2).join(', ')}`)
      }
      if (conflicts?.mitigationAdvice && conflicts.mitigationAdvice.length > 0) {
        lines.push(`조언: ${conflicts.mitigationAdvice[0]}`)
      }
    } else {
      lines.push(
        `The overall compatibility score for ${person1Name} and ${person2Name} is ${overallScore} points.`
      )
      const g = sajuAnalysis?.grade || 'B'
      lines.push(
        `The compatibility grade is ${g}, ${g === 'S+' || g === 'S' ? 'showing an exceptionally high level of harmony.' : g === 'A' ? 'indicating good compatibility.' : g === 'B' ? 'a decent match that can improve with effort.' : 'suggesting differences that require understanding and effort.'}`
      )
      if (sajuAnalysis?.summary) {
        lines.push(sajuAnalysis.summary)
      }
      const tenGodBalance = sajuAnalysis?.tenGods?.interaction?.balance || 0
      lines.push(
        `Ten Gods harmony is at ${tenGodBalance} points — ${tenGodBalance >= 70 ? 'you naturally complement each other.' : tenGodBalance >= 50 ? 'some areas need adjustment.' : 'your differences can become growth opportunities.'}`
      )
      const totalConflicts =
        conflicts?.totalConflicts || sajuAnalysis?.conflicts?.totalConflicts || 0
      if (totalConflicts > 0) {
        lines.push(
          `${totalConflicts} conflict(s) detected. ${totalConflicts >= 3 ? 'Mutual understanding and compromise are important.' : 'These are manageable with awareness.'}`
        )
      } else {
        lines.push('No major conflicts found — a peaceful relationship foundation.')
      }
      const emotionalScore = synastry?.emotionalConnection || 0
      const romanticScore = synastry?.romanticConnection || 0
      if (emotionalScore > 0 || romanticScore > 0) {
        lines.push(
          `Astrologically, emotional connection is ${emotionalScore} and romantic chemistry is ${romanticScore}.`
        )
      }
      if (sajuAnalysis?.detailedInsights && sajuAnalysis.detailedInsights.length > 0) {
        lines.push(...sajuAnalysis.detailedInsights.slice(0, 3))
      }
      if (synastry?.strengths && synastry.strengths.length > 0) {
        lines.push(`Strengths: ${synastry.strengths.slice(0, 2).join(', ')}`)
      }
    }
    return lines
  }, [isKo, person1Name, person2Name, overallScore, sajuAnalysis, synastry, conflicts, harmonies])

  // Grade color mapping (module-level constant equivalent via useMemo)
  const grade = sajuAnalysis?.grade || 'B'
  const gradeColor = useMemo(() => {
    const colors: Record<string, string> = {
      'S+': 'from-amber-500 to-yellow-400',
      S: 'from-purple-500 to-pink-400',
      A: 'from-emerald-500 to-green-400',
      B: 'from-blue-500 to-cyan-400',
      C: 'from-orange-500 to-amber-400',
      D: 'from-red-500 to-orange-400',
      F: 'from-gray-500 to-slate-400',
    }
    return colors[grade] || colors['B']
  }, [grade])

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
            <div
              className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center mx-auto shadow-lg`}
            >
              <span className="text-4xl font-black text-white">{grade}</span>
            </div>
            <p className="text-amber-300 mt-2 font-medium">{isKo ? '궁합 등급' : 'Grade'}</p>
          </div>
        </div>

        {/* Quick Summary */}
        {sajuAnalysis?.summary && (
          <div className="relative mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-gray-200 text-center leading-relaxed">{sajuAnalysis.summary}</p>
          </div>
        )}
      </div>

      {/* Continuous Analysis Text */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          {isKo ? '종합 분석' : 'Comprehensive Analysis'}
        </h3>
        <div className="space-y-3">
          {analysisLines.map((line, idx) => (
            <p key={idx} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard
          emoji="☯️"
          title={isKo ? '사주 궁합' : 'Saju Compatibility'}
          colorTheme="amber"
        >
          <ScoreBar
            label={isKo ? '십성 조화' : 'Ten Gods Harmony'}
            score={sajuAnalysis?.tenGods?.interaction?.balance || 65}
            colorTheme="amber"
          />
          <ScoreBar
            label={isKo ? '합 관계' : 'Harmonious Relations'}
            score={sajuAnalysis?.harmonies?.score || 60}
            colorTheme="amber"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {sajuAnalysis?.detailedInsights?.slice(0, 2).map((insight, idx) => (
              <Badge key={idx} text={insight.slice(0, 30) + '...'} colorTheme="amber" size="sm" />
            ))}
          </div>
        </InsightCard>

        <InsightCard
          emoji="✨"
          title={isKo ? '점성 궁합' : 'Astrology Compatibility'}
          colorTheme="purple"
        >
          <ScoreBar
            label={isKo ? '감정적 연결' : 'Emotional Connection'}
            score={synastry?.emotionalConnection || 70}
            colorTheme="purple"
          />
          <ScoreBar
            label={isKo ? '로맨틱 케미' : 'Romantic Chemistry'}
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
      <InsightCard
        emoji="💕"
        title={isKo ? '우리 관계의 키워드' : 'Relationship Keywords'}
        colorTheme="pink"
      >
        <div className="flex flex-wrap gap-3 justify-center">
          {sajuAnalysis?.shinsals?.luckyInteractions?.slice(0, 3).map((interaction, idx) => (
            <div
              key={idx}
              className="px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300"
            >
              {interaction}
            </div>
          ))}
          {synastry?.strengths?.slice(0, 2).map((strength, idx) => (
            <div
              key={idx}
              className="px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300"
            >
              {strength}
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Warning Signs */}
      {((sajuAnalysis?.conflicts?.totalConflicts || 0) > 0 ||
        (synastry?.challenges?.length || 0) > 0) && (
        <InsightCard emoji="⚡" title={isKo ? '주의할 점' : 'Points to Watch'} colorTheme="orange">
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
  )
}
