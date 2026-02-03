// src/lib/prediction/life-prediction/analysis/multi-year-trend.ts
// Multi-Year Trend Analysis Module

import {
  calculateYearlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  analyzeBranchInteractions,
} from '../../advancedTimingEngine'
import { normalizeScore } from '../../utils/scoring-utils'
import { scoreToGrade } from '../../index'
import { SIBSIN_SCORES, SCORING_WEIGHTS } from '../../constants/scoring'
import { STEM_ELEMENT } from '../../engine/constants'
import { analyzeLifeCycles } from '../lifecycle/analyzer'
import { generateTrendSummary } from '../formatters/text-generators'

import type {
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
} from '../../life-prediction-types'

export function analyzeMultiYearTrend(
  input: LifePredictionInput,
  startYear: number,
  endYear: number
): MultiYearTrend {
  const currentYear = new Date().getFullYear()
  const yearlyScores: YearlyScore[] = []
  const daeunTransitions: DaeunTransitionPoint[] = []

  const daeunList = input.daeunList || []

  for (let year = startYear; year <= endYear; year++) {
    const age = year - input.birthYear
    if (age < 0) {
      continue
    }

    const yearGanji = calculateYearlyGanji(year)
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch)
    const sibsin = calculateSibsin(input.dayStem, yearGanji.stem)
    const allBranches = [input.dayBranch, input.monthBranch, input.yearBranch, yearGanji.branch]
    const branchInteractions = analyzeBranchInteractions(allBranches)
    const daeun = daeunList.find((d) => age >= d.startAge && age <= d.endAge)

    let score = twelveStage.score
    score += SIBSIN_SCORES[sibsin as keyof typeof SIBSIN_SCORES] || 0

    for (const inter of branchInteractions) {
      score += inter.score * SCORING_WEIGHTS.BRANCH_INTERACTION
    }

    if (daeun) {
      const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch)
      score += (daeunStage.score - SCORING_WEIGHTS.BASE_SCORE) * SCORING_WEIGHTS.DAEUN_MODIFIER
    }

    const yearElement = STEM_ELEMENT[yearGanji.stem]
    if (input.yongsin?.includes(yearElement)) {
      score += SCORING_WEIGHTS.YONGSIN_BONUS
    }
    if (input.kisin?.includes(yearElement)) {
      score -= SCORING_WEIGHTS.KISIN_PENALTY
    }

    score = normalizeScore(score)
    const grade = scoreToGrade(score)

    const themes: string[] = []
    const opportunities: string[] = []
    const challenges: string[] = []

    if (twelveStage.energy === 'peak') {
      themes.push('전성기')
      opportunities.push('중요한 결정과 도전의 최적기')
    } else if (twelveStage.energy === 'rising') {
      themes.push('상승기')
      opportunities.push('새로운 시작과 성장')
    } else if (twelveStage.energy === 'declining') {
      themes.push('안정기')
      challenges.push('무리한 확장 자제')
    } else {
      themes.push('준비기')
      challenges.push('내면 성찰과 재충전 필요')
    }

    if (['정관', '정재', '정인'].includes(sibsin)) {
      opportunities.push(`${sibsin}운 - 안정적 발전`)
    } else if (['겁재', '상관'].includes(sibsin)) {
      challenges.push(`${sibsin}운 - 경쟁과 갈등 주의`)
    }

    yearlyScores.push({
      year,
      age,
      score,
      grade,
      yearGanji,
      twelveStage,
      sibsin,
      branchInteractions,
      daeun,
      themes,
      opportunities,
      challenges,
    })

    if (daeun && age === daeun.startAge && daeunList.indexOf(daeun) > 0) {
      const prevDaeun = daeunList[daeunList.indexOf(daeun) - 1]
      const prevStage = calculatePreciseTwelveStage(input.dayStem, prevDaeun.branch)
      const currStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch)

      let impact: DaeunTransitionPoint['impact']
      const scoreDiff = currStage.score - prevStage.score
      if (scoreDiff >= 30) {
        impact = 'major_positive'
      } else if (scoreDiff >= 10) {
        impact = 'positive'
      } else if (scoreDiff <= -30) {
        impact = 'major_challenging'
      } else if (scoreDiff <= -10) {
        impact = 'challenging'
      } else {
        impact = 'neutral'
      }

      daeunTransitions.push({
        year,
        age,
        fromDaeun: prevDaeun,
        toDaeun: daeun,
        impact,
        description: `${prevDaeun.stem}${prevDaeun.branch} → ${daeun.stem}${daeun.branch} 대운 전환`,
      })
    }
  }

  const scores = yearlyScores.map((y) => y.score)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const firstHalfAvg =
    scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
    Math.floor(scores.length / 2)
  const secondHalfAvg =
    scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
    (scores.length - Math.floor(scores.length / 2))

  let overallTrend: MultiYearTrend['overallTrend']
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length

  if (variance > 400) {
    overallTrend = 'volatile'
  } else if (secondHalfAvg - firstHalfAvg > 10) {
    overallTrend = 'ascending'
  } else if (firstHalfAvg - secondHalfAvg > 10) {
    overallTrend = 'descending'
  } else {
    overallTrend = 'stable'
  }

  const sortedByScore = [...yearlyScores].sort((a, b) => b.score - a.score)
  const peakYears = sortedByScore.slice(0, 3).map((y) => y.year)
  const lowYears = sortedByScore.slice(-3).map((y) => y.year)

  const lifeCycles = analyzeLifeCycles(yearlyScores, daeunList)
  const summary = generateTrendSummary(
    overallTrend,
    peakYears,
    lowYears,
    daeunTransitions,
    currentYear
  )

  return {
    startYear,
    endYear,
    yearlyScores,
    overallTrend,
    peakYears,
    lowYears,
    daeunTransitions,
    lifeCycles,
    summary,
  }
}
