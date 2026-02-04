/**
 * @file Comprehensive Astrology Compatibility Analysis
 * 종합 점성학 궁합 분석 (기본 + 확장)
 */

import type { AstrologyProfile } from '../cosmicCompatibility'
import type { AspectAnalysis, SynastryAnalysis } from './types'
import { analyzeAspects, analyzeSynastry } from './basic-analysis'
import {
  analyzeCompositeChart,
  analyzeHouseOverlays,
  type CompositeChartAnalysis,
  type HouseOverlayAnalysis,
} from './composite-house'
import {
  analyzeMercuryAspects,
  analyzeJupiterAspects,
  analyzeSaturnAspects,
  type MercuryAspectAnalysis,
  type JupiterAspectAnalysis,
  type SaturnAspectAnalysis,
} from './planet-analysis'
import { analyzeOuterPlanets, type OuterPlanetAnalysis } from './outer-planets'
import { analyzeNodes, analyzeLilith, type NodeAnalysis, type LilithAnalysis } from './nodes-lilith'
import {
  analyzeDavisonChart,
  analyzeProgressedChart,
  type DavisonChartAnalysis,
  type ProgressedChartAnalysis,
} from './davison-progressed'
import { analyzeDegreeBasedAspects, type DegreeAspectAnalysis } from './degree-aspects'

// ============================================================
// Basic Comprehensive Analysis
// ============================================================

export interface ComprehensiveAstrologyCompatibility {
  aspects: AspectAnalysis
  synastry: SynastryAnalysis
  compositeChart: CompositeChartAnalysis
  houseOverlays: HouseOverlayAnalysis
  overallScore: number
  grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string
  detailedInsights: string[]
}

export function performComprehensiveAstrologyAnalysis(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): ComprehensiveAstrologyCompatibility {
  const [aspects, synastry, compositeChart, houseOverlays] = [
    analyzeAspects(p1, p2),
    analyzeSynastry(p1, p2),
    analyzeCompositeChart(p1, p2),
    analyzeHouseOverlays(p1, p2),
  ]

  // 종합 점수
  const overallScore = Math.round(
    aspects.overallHarmony * 0.3 +
      synastry.compatibilityIndex * 0.4 +
      compositeChart.longevityPotential * 0.3
  )

  let grade: ComprehensiveAstrologyCompatibility['grade']
  if (overallScore >= 95) {
    grade = 'S+'
  } else if (overallScore >= 85) {
    grade = 'S'
  } else if (overallScore >= 75) {
    grade = 'A'
  } else if (overallScore >= 65) {
    grade = 'B'
  } else if (overallScore >= 50) {
    grade = 'C'
  } else if (overallScore >= 35) {
    grade = 'D'
  } else {
    grade = 'F'
  }

  // 요약
  let summary = ''
  if (grade === 'S+' || grade === 'S') {
    summary =
      '점성학적으로 매우 이상적인 궁합입니다. Aspects, Synastry, Composite Chart 모두 조화롭습니다.'
  } else if (grade === 'A' || grade === 'B') {
    summary = '점성학적으로 좋은 궁합입니다. 자연스러운 흐름 속에서 관계가 발전합니다.'
  } else if (grade === 'C') {
    summary = '점성학적으로 보통의 궁합입니다. 노력으로 좋은 관계를 만들 수 있습니다.'
  } else {
    summary = '점성학적으로 도전적인 궁합입니다. 깊은 이해와 조율이 필요합니다.'
  }

  // 상세 인사이트
  const detailedInsights = [
    ...aspects.keyInsights,
    ...synastry.strengths,
    `관계 목적: ${compositeChart.relationshipPurpose}`,
    `핵심 테마: ${compositeChart.coreTheme}`,
  ]

  return {
    aspects,
    synastry,
    compositeChart,
    houseOverlays,
    overallScore,
    grade,
    summary,
    detailedInsights,
  }
}

// ============================================================
// Extended Astrology Profile
// ============================================================

export interface ExtendedAstrologyProfile extends AstrologyProfile {
  mercury?: { sign: string; element: string; degree?: number }
  jupiter?: { sign: string; element: string }
  saturn?: { sign: string; element: string }
  uranus?: { sign: string; element: string }
  neptune?: { sign: string; element: string }
  pluto?: { sign: string; element: string }
  northNode?: { sign: string; element: string }
  southNode?: { sign: string; element: string }
  lilith?: { sign: string; element: string }
}

// ============================================================
// Extended Comprehensive Analysis
// ============================================================

export interface ExtendedAstrologyCompatibility extends ComprehensiveAstrologyCompatibility {
  degreeBasedAspects?: DegreeAspectAnalysis
  mercuryAnalysis?: MercuryAspectAnalysis
  jupiterAnalysis?: JupiterAspectAnalysis
  saturnAnalysis?: SaturnAspectAnalysis
  outerPlanetsAnalysis?: OuterPlanetAnalysis
  nodeAnalysis?: NodeAnalysis
  lilithAnalysis?: LilithAnalysis
  davisonChart?: DavisonChartAnalysis
  progressedChart?: ProgressedChartAnalysis
  extendedScore: number
  extendedGrade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  extendedSummary: string
  extendedInsights: string[]
}

export function performExtendedAstrologyAnalysis(
  p1: ExtendedAstrologyProfile,
  p2: ExtendedAstrologyProfile,
  yearsInRelationship: number = 0
): ExtendedAstrologyCompatibility {
  // 기본 분석
  const baseAnalysis = performComprehensiveAstrologyAnalysis(p1, p2)

  // 확장 분석
  let mercuryAnalysis: MercuryAspectAnalysis | undefined
  let jupiterAnalysis: JupiterAspectAnalysis | undefined
  let saturnAnalysis: SaturnAspectAnalysis | undefined

  const scores: number[] = [baseAnalysis.overallScore]
  const extendedInsights: string[] = [...baseAnalysis.detailedInsights]

  // Degree-based Aspects
  const p1Planets: { name: string; sign: string; degree?: number }[] = [
    { name: 'Sun', sign: p1.sun.sign },
    { name: 'Moon', sign: p1.moon.sign },
    { name: 'Venus', sign: p1.venus.sign },
    { name: 'Mars', sign: p1.mars.sign },
  ]
  const p2Planets: { name: string; sign: string; degree?: number }[] = [
    { name: 'Sun', sign: p2.sun.sign },
    { name: 'Moon', sign: p2.moon.sign },
    { name: 'Venus', sign: p2.venus.sign },
    { name: 'Mars', sign: p2.mars.sign },
  ]

  if (p1.mercury) {
    p1Planets.push({ name: 'Mercury', sign: p1.mercury.sign, degree: p1.mercury.degree })
  }
  if (p2.mercury) {
    p2Planets.push({ name: 'Mercury', sign: p2.mercury.sign, degree: p2.mercury.degree })
  }

  const degreeBasedAspects = analyzeDegreeBasedAspects(p1Planets, p2Planets)
  scores.push(degreeBasedAspects.overallBalance)

  if (degreeBasedAspects.tightestAspect) {
    extendedInsights.push(
      `가장 강한 Aspect: ${degreeBasedAspects.tightestAspect.planet1}-${degreeBasedAspects.tightestAspect.planet2} ${degreeBasedAspects.tightestAspect.aspectType}`
    )
  }

  // Mercury Analysis
  if (p1.mercury && p2.mercury) {
    mercuryAnalysis = analyzeMercuryAspects(p1.mercury, p2.mercury, p1.sun, p2.sun)
    scores.push(mercuryAnalysis.mercuryCompatibility)
    extendedInsights.push(`소통 스타일: ${mercuryAnalysis.communicationStyle}`)
  }

  // Jupiter Analysis
  if (p1.jupiter && p2.jupiter) {
    jupiterAnalysis = analyzeJupiterAspects(p1.jupiter, p2.jupiter, p1.sun, p2.sun)
    scores.push(jupiterAnalysis.expansionCompatibility)
    extendedInsights.push(`공유 신념: ${jupiterAnalysis.sharedBeliefs}`)
  }

  // Saturn Analysis
  if (p1.saturn && p2.saturn) {
    saturnAnalysis = analyzeSaturnAspects(p1.saturn, p2.saturn, p1.sun, p2.sun, p1.moon, p2.moon)
    scores.push(saturnAnalysis.longTermPotential)
    extendedInsights.push(`카르마 교훈: ${saturnAnalysis.karmicLesson}`)
  }

  // Outer Planets Analysis
  const outerPlanetsAnalysis = analyzeOuterPlanets(
    { uranus: p1.uranus, neptune: p1.neptune, pluto: p1.pluto },
    { uranus: p2.uranus, neptune: p2.neptune, pluto: p2.pluto },
    p1.sun,
    p2.sun
  )
  scores.push(outerPlanetsAnalysis.overallTranscendentScore)

  if (outerPlanetsAnalysis.generationalThemes.length > 0) {
    extendedInsights.push(`세대적 테마: ${outerPlanetsAnalysis.generationalThemes[0]}`)
  }

  // Node Analysis
  const nodeAnalysis = analyzeNodes(
    p1.northNode,
    p1.southNode,
    p2.northNode,
    p2.southNode,
    p1.sun,
    p2.sun,
    p1.moon,
    p2.moon
  )
  scores.push(nodeAnalysis.northNodeConnection.compatibility)
  extendedInsights.push(`카르마 관계 유형: ${nodeAnalysis.karmicRelationshipType}`)
  extendedInsights.push(`진화적 목적: ${nodeAnalysis.evolutionaryPurpose}`)

  // Lilith Analysis
  const lilithAnalysis = analyzeLilith(
    p1.lilith,
    p2.lilith,
    p1.sun,
    p2.sun,
    p1.mars,
    p2.mars,
    p1.venus,
    p2.venus
  )
  scores.push(lilithAnalysis.magneticAttraction)

  if (lilithAnalysis.shadowDynamics) {
    extendedInsights.push(`그림자 역학: ${lilithAnalysis.shadowDynamics}`)
  }

  // Davison Chart
  const davisonChart = analyzeDavisonChart(p1, p2)
  extendedInsights.push(`관계 정체성: ${davisonChart.relationshipIdentity}`)
  extendedInsights.push(`관계 목적: ${davisonChart.relationshipPurpose}`)

  // Progressed Chart
  const progressedChart = analyzeProgressedChart(p1, p2, yearsInRelationship)
  extendedInsights.push(`현재 관계 테마: ${progressedChart.currentRelationshipTheme}`)

  // 종합 확장 점수
  const extendedScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  let extendedGrade: ExtendedAstrologyCompatibility['extendedGrade']
  if (extendedScore >= 95) {
    extendedGrade = 'S+'
  } else if (extendedScore >= 85) {
    extendedGrade = 'S'
  } else if (extendedScore >= 75) {
    extendedGrade = 'A'
  } else if (extendedScore >= 65) {
    extendedGrade = 'B'
  } else if (extendedScore >= 50) {
    extendedGrade = 'C'
  } else if (extendedScore >= 35) {
    extendedGrade = 'D'
  } else {
    extendedGrade = 'F'
  }

  // 확장 요약
  let extendedSummary = baseAnalysis.summary
  if (nodeAnalysis.karmicRelationshipType === 'soulmate') {
    extendedSummary += ' 노드 분석에서 소울메이트 연결이 발견되었습니다.'
  } else if (nodeAnalysis.karmicRelationshipType === 'karmic') {
    extendedSummary += ' 전생의 인연이 있을 가능성이 높습니다.'
  }

  if (lilithAnalysis.magneticAttraction >= 80) {
    extendedSummary += ' 강한 자기적 끌림이 존재합니다.'
  }

  if (saturnAnalysis && saturnAnalysis.longTermPotential >= 80) {
    extendedSummary += ' 장기적 안정성이 높은 관계입니다.'
  }

  return {
    ...baseAnalysis,
    degreeBasedAspects,
    mercuryAnalysis,
    jupiterAnalysis,
    saturnAnalysis,
    outerPlanetsAnalysis,
    nodeAnalysis,
    lilithAnalysis,
    davisonChart,
    progressedChart,
    extendedScore,
    extendedGrade,
    extendedSummary,
    extendedInsights,
  }
}
