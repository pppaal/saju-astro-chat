'use client'

import type { TabProps } from '../types'
import { InsightCard, InsightContent } from '../InsightCard'

export default function FutureTab({ data, isKo }: TabProps) {
  const { persons, sajuAnalysis, compositeChart, synastry } = data

  const person1Name = persons[0]?.name || (isKo ? '사람 1' : 'Person 1')
  const person2Name = persons[1]?.name || (isKo ? '사람 2' : 'Person 2')

  // Generate future outlook based on analysis
  const longevityScore = compositeChart?.longevityPotential || 70
  const overallScore = sajuAnalysis?.overallScore || 65
  const averageScore = Math.round((longevityScore + overallScore) / 2)

  // Future phases based on scores
  const futurePhases = [
    {
      period: isKo ? '초기 (1-2년)' : 'Early (1-2 years)',
      emoji: '🌱',
      description: isKo
        ? '새로운 관계의 시작, 서로를 알아가는 시간입니다. 차이점을 발견하고 조율하는 시기입니다.'
        : 'Beginning of a new relationship, time to know each other. Period of discovering differences and adjusting.',
      advice: isKo
        ? '서로의 차이를 인정하고 열린 대화를 유지하세요.'
        : 'Accept differences and maintain open communication.',
      color: 'emerald',
    },
    {
      period: isKo ? '중기 (3-5년)' : 'Middle (3-5 years)',
      emoji: '🌳',
      description: isKo
        ? '관계가 깊어지고 안정화되는 시기입니다. 공동의 목표와 계획을 세울 수 있습니다.'
        : 'Relationship deepens and stabilizes. Time to set shared goals and plans.',
      advice: isKo
        ? '함께하는 목표를 설정하고 성취감을 나누세요.'
        : 'Set goals together and share achievements.',
      color: 'blue',
    },
    {
      period: isKo ? '장기 (5년 이상)' : 'Long-term (5+ years)',
      emoji: '🌲',
      description: isKo
        ? '성숙한 관계로 발전할 수 있습니다. 서로의 성장을 지지하며 동반자로 함께합니다.'
        : "Can develop into a mature relationship. Supporting each other's growth as companions.",
      advice: isKo
        ? '개인의 성장과 관계의 발전을 균형있게 유지하세요.'
        : 'Balance individual growth with relationship development.',
      color: 'purple',
    },
  ]

  // Potential challenges by phase
  const potentialChallenges = sajuAnalysis?.conflicts?.totalConflicts || 0
  const strengthCount =
    (synastry?.strengths?.length || 0) + (sajuAnalysis?.detailedInsights?.length || 0)

  // Generate continuous flowing analysis text
  const analysisLines: string[] = []
  if (isKo) {
    analysisLines.push(`${person1Name}님과 ${person2Name}님의 미래 전망을 분석합니다.`)
    analysisLines.push(
      `장기 잠재력 점수는 ${averageScore}%로, ${averageScore >= 80 ? '매우 밝은 미래가 기대됩니다.' : averageScore >= 60 ? '꾸준한 노력으로 좋은 관계를 유지할 수 있습니다.' : '도전이 있지만 함께 극복하면 더 강해질 수 있습니다.'}`
    )
    analysisLines.push(
      `현재 궁합 점수 ${overallScore}%를 기반으로, 서로의 이해와 노력을 통해 최대 ${Math.min(overallScore + 20, 100)}%까지 성장할 수 있습니다.`
    )
    analysisLines.push(
      `관계의 강점이 ${strengthCount}개, 도전 요소가 ${potentialChallenges}개 발견되었습니다. ${strengthCount > potentialChallenges ? '강점이 도전을 넘어서므로 긍정적인 관계 발전이 기대됩니다.' : '도전 요소를 함께 극복하면서 성장하는 관계입니다.'}`
    )
    analysisLines.push(
      '초기 1-2년은 서로를 알아가는 시간으로, 차이점을 발견하고 조율하는 중요한 시기입니다.'
    )
    analysisLines.push('중기 3-5년에는 관계가 깊어지고 안정화되며, 공동의 목표를 세울 수 있습니다.')
    analysisLines.push(
      '장기적으로는 서로의 성장을 지지하는 성숙한 동반자 관계로 발전할 수 있습니다.'
    )
    if (sajuAnalysis?.detailedInsights && sajuAnalysis.detailedInsights.length > 0) {
      analysisLines.push(`핵심 인사이트: ${sajuAnalysis.detailedInsights[0]}`)
    }
    if (synastry?.strengths && synastry.strengths.length > 0) {
      analysisLines.push(`미래를 밝히는 강점: ${synastry.strengths.slice(0, 2).join(', ')}`)
    }
    analysisLines.push(
      '서로의 차이를 장점으로 활용하고, 정기적인 소통과 감정 공유를 통해 관계를 더욱 발전시켜 나가세요.'
    )
  } else {
    analysisLines.push(`Future outlook for ${person1Name} and ${person2Name}.`)
    analysisLines.push(
      `Long-term potential: ${averageScore}%. ${averageScore >= 80 ? 'A very bright future ahead.' : averageScore >= 60 ? 'Steady effort will maintain a good relationship.' : 'Challenges ahead but overcoming them together strengthens the bond.'}`
    )
    analysisLines.push(
      `Current compatibility of ${overallScore}% can grow to ${Math.min(overallScore + 20, 100)}% through mutual understanding.`
    )
    analysisLines.push(
      `${strengthCount} strengths vs ${potentialChallenges} challenges. ${strengthCount > potentialChallenges ? 'Strengths outweigh challenges — positive growth expected.' : 'Together you can turn challenges into growth.'}`
    )
    analysisLines.push(
      'Early phase (1-2 years): discovering differences and building understanding.'
    )
    analysisLines.push('Middle phase (3-5 years): deepening bonds and setting shared goals.')
    analysisLines.push(
      "Long-term (5+ years): developing into mature companions supporting each other's growth."
    )
    if (sajuAnalysis?.detailedInsights && sajuAnalysis.detailedInsights.length > 0) {
      analysisLines.push(`Key insight: ${sajuAnalysis.detailedInsights[0]}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Future Outlook Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900/30 to-slate-900 border border-indigo-500/30 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <span className="text-5xl mb-4 block">🔮</span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-2">
            {isKo ? '미래 전망' : 'Future Outlook'}
          </h2>
          <p className="text-indigo-300 mb-4">
            {person1Name} & {person2Name}
          </p>

          {/* Longevity Meter */}
          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{isKo ? '장기 잠재력' : 'Long-term Potential'}</span>
              <span className="text-indigo-300 font-bold">{averageScore}%</span>
            </div>
            <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${averageScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Continuous Analysis Text */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 md:p-6">
        <h3 className="text-lg font-bold text-gray-100 mb-4">
          {isKo ? '미래 전망 상세 분석' : 'Detailed Future Analysis'}
        </h3>
        <div className="space-y-3">
          {analysisLines.map((line, idx) => (
            <p key={idx} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Relationship Timeline */}
      <InsightCard
        emoji="📅"
        title={isKo ? '관계 타임라인' : 'Relationship Timeline'}
        colorTheme="indigo"
      >
        <div className="space-y-4">
          {futurePhases.map((phase, idx) => (
            <div
              key={idx}
              className={`relative p-4 rounded-xl bg-${phase.color}-500/10 border border-${phase.color}-500/20`}
            >
              {/* Timeline connector */}
              {idx < futurePhases.length - 1 && (
                <div className="absolute left-7 top-full w-0.5 h-4 bg-gradient-to-b from-current to-transparent opacity-30" />
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full bg-${phase.color}-500/20 border border-${phase.color}-500/30 flex items-center justify-center text-xl`}
                >
                  {phase.emoji}
                </div>
                <div className="flex-1">
                  <h4 className={`text-${phase.color}-300 font-bold mb-1`}>{phase.period}</h4>
                  <p className="text-gray-300 text-sm mb-2">{phase.description}</p>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${phase.color}-500/20 text-${phase.color}-300 text-xs`}
                  >
                    💡 {phase.advice}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Balance Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard
          emoji="⚖️"
          title={isKo ? '관계 균형' : 'Relationship Balance'}
          colorTheme="cyan"
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{isKo ? '강점' : 'Strengths'}</span>
                <span className="text-emerald-300">{strengthCount}</span>
              </div>
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(strengthCount * 15, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{isKo ? '도전' : 'Challenges'}</span>
                <span className="text-orange-300">{potentialChallenges}</span>
              </div>
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${Math.min(potentialChallenges * 20, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-gray-300 text-sm">
              {strengthCount > potentialChallenges
                ? isKo
                  ? '강점이 많아 긍정적인 관계 발전이 기대됩니다.'
                  : 'More strengths suggest positive relationship growth.'
                : isKo
                  ? '도전 과제가 있지만 함께 극복하며 성장할 수 있습니다.'
                  : 'Challenges exist but can be overcome together for growth.'}
            </p>
          </div>
        </InsightCard>

        <InsightCard
          emoji="🎯"
          title={isKo ? '관계 목표' : 'Relationship Goals'}
          colorTheme="amber"
        >
          <div className="space-y-3">
            <InsightContent colorTheme="amber">
              <div className="flex items-start gap-3">
                <span className="text-amber-400">1</span>
                <p className="text-gray-200 text-sm">
                  {isKo ? '서로의 차이점을 장점으로 활용하기' : 'Turn differences into strengths'}
                </p>
              </div>
            </InsightContent>
            <InsightContent colorTheme="amber">
              <div className="flex items-start gap-3">
                <span className="text-amber-400">2</span>
                <p className="text-gray-200 text-sm">
                  {isKo
                    ? '정기적인 소통과 감정 공유 시간 갖기'
                    : 'Regular communication and emotional sharing time'}
                </p>
              </div>
            </InsightContent>
            <InsightContent colorTheme="amber">
              <div className="flex items-start gap-3">
                <span className="text-amber-400">3</span>
                <p className="text-gray-200 text-sm">
                  {isKo
                    ? '함께 성장할 수 있는 공동 프로젝트 만들기'
                    : 'Create shared projects for mutual growth'}
                </p>
              </div>
            </InsightContent>
          </div>
        </InsightCard>
      </div>

      {/* Compatibility Growth Path */}
      <InsightCard emoji="🌈" title={isKo ? '성장 경로' : 'Growth Path'} colorTheme="purple">
        <div className="relative">
          {/* Path visualization */}
          <div className="flex items-center justify-between mb-6">
            {[
              { label: isKo ? '현재' : 'Now', icon: '🌱', score: overallScore },
              {
                label: isKo ? '발전' : 'Growth',
                icon: '🌿',
                score: Math.min(overallScore + 10, 100),
              },
              {
                label: isKo ? '성숙' : 'Mature',
                icon: '🌳',
                score: Math.min(overallScore + 15, 100),
              },
              {
                label: isKo ? '완성' : 'Complete',
                icon: '🌲',
                score: Math.min(overallScore + 20, 100),
              },
            ].map((stage, idx) => (
              <div key={idx} className="text-center flex-1">
                <div
                  className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl
                  ${idx === 0 ? 'bg-purple-500/30 border-2 border-purple-500' : 'bg-slate-700/50 border border-slate-600'}`}
                >
                  {stage.icon}
                </div>
                <p className="text-gray-400 text-xs mt-2">{stage.label}</p>
                <p
                  className={`text-sm font-bold ${idx === 0 ? 'text-purple-300' : 'text-gray-500'}`}
                >
                  {stage.score}%
                </p>
              </div>
            ))}
          </div>

          {/* Progress line */}
          <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-700 -z-10">
            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 w-1/4" />
          </div>
        </div>

        <InsightContent colorTheme="purple">
          <p className="text-gray-200 text-sm leading-relaxed">
            {isKo
              ? `현재 ${overallScore}%의 궁합을 가진 두 분은 서로의 노력과 이해를 통해 더 높은 수준의 관계로 발전할 수 있습니다. 사주와 점성학적 분석에 따르면, 두 분의 관계는 시간이 지날수록 더욱 깊어질 잠재력을 가지고 있습니다.`
              : `With a current compatibility of ${overallScore}%, you both can develop a higher level of relationship through mutual effort and understanding. According to Saju and astrological analysis, your relationship has the potential to deepen over time.`}
          </p>
        </InsightContent>
      </InsightCard>

      {/* Advice for the Future */}
      <InsightCard
        emoji="💡"
        title={isKo ? '미래를 위한 조언' : 'Advice for the Future'}
        colorTheme="emerald"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sajuAnalysis?.detailedInsights?.slice(0, 4).map((insight, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">{idx + 1}</span>
                <p className="text-gray-200 text-sm leading-relaxed">{insight}</p>
              </div>
            </div>
          )) || (
            <>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-gray-200 text-sm">
                  {isKo
                    ? '서로의 장점을 인정하고 칭찬하세요'
                    : "Recognize and praise each other's strengths"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-gray-200 text-sm">
                  {isKo
                    ? '갈등이 생기면 빠르게 대화로 해결하세요'
                    : 'Resolve conflicts quickly through dialogue'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-gray-200 text-sm">
                  {isKo ? '함께하는 추억을 많이 만드세요' : 'Create many memories together'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-gray-200 text-sm">
                  {isKo ? '개인의 시간도 존중하세요' : "Respect each other's personal time"}
                </p>
              </div>
            </>
          )}
        </div>
      </InsightCard>

      {/* Final Message */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
          <span className="text-2xl">💕</span>
          <span className="text-pink-300 font-medium">
            {isKo
              ? '두 분의 밝은 미래를 응원합니다!'
              : 'Wishing you both a bright future together!'}
          </span>
        </div>
      </div>
    </div>
  )
}
