/**
 * clusterAnalysis.ts - K-Means 군집 분석
 */

import type { SajuResult, ClusterAnalysis } from '../../types/statistics'
import { getStemElement, getBranchElement } from '../helpers/elementHelpers'

/**
 * K-Means 스타일 군집 분석 (간략화)
 */
export function performClusterAnalysis(sajuList: SajuResult[], k: number = 5): ClusterAnalysis[] {
  if (sajuList.length === 0) {
    return []
  }

  // 특성 벡터 생성
  const features = sajuList.map((saju) => extractFeatureVector(saju))

  // 초기 중심점 (첫 k개 또는 랜덤)
  const centroids = features.slice(0, Math.min(k, features.length))

  // 클러스터 할당
  const assignments: number[] = new Array(sajuList.length).fill(0)

  // 간단한 반복 (실제로는 더 정교한 알고리즘 필요)
  for (let iter = 0; iter < 10; iter++) {
    // 각 포인트를 가장 가까운 중심점에 할당
    for (let i = 0; i < features.length; i++) {
      let minDist = Infinity
      let minCluster = 0

      for (let j = 0; j < centroids.length; j++) {
        const dist = euclideanDistance(features[i], centroids[j])
        if (dist < minDist) {
          minDist = dist
          minCluster = j
        }
      }
      assignments[i] = minCluster
    }

    // 중심점 업데이트
    for (let j = 0; j < centroids.length; j++) {
      const clusterPoints = features.filter((_, i) => assignments[i] === j)
      if (clusterPoints.length > 0) {
        centroids[j] = calculateCentroid(clusterPoints)
      }
    }
  }

  // 결과 구성
  const clusters: ClusterAnalysis[] = []
  for (let j = 0; j < centroids.length; j++) {
    const members = sajuList.filter((_, i) => assignments[i] === j)
    const centroidObj: Record<string, number> = {}
    ;['목', '화', '토', '금', '수'].forEach((el, idx) => {
      centroidObj[el] = centroids[j][idx]
    })

    clusters.push({
      clusterId: j,
      centroid: centroidObj,
      members,
      characteristics: generateClusterCharacteristics(centroidObj),
      size: members.length,
      percentage: (members.length / sajuList.length) * 100,
    })
  }

  return clusters.filter((c) => c.size > 0)
}

function extractFeatureVector(saju: SajuResult): number[] {
  const pillars = saju.fourPillars
  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem]
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch,
  ]

  for (const stem of stems) {
    const el = getStemElement(stem)
    if (el in elements) {
      ;(elements as Record<string, number>)[el]++
    }
  }
  for (const branch of branches) {
    const el = getBranchElement(branch)
    if (el in elements) {
      ;(elements as Record<string, number>)[el]++
    }
  }

  return [elements.목, elements.화, elements.토, elements.금, elements.수]
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0))
}

function calculateCentroid(points: number[][]): number[] {
  if (points.length === 0) {
    return []
  }
  const dims = points[0].length
  const centroid = new Array(dims).fill(0)

  for (const point of points) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += point[i]
    }
  }

  return centroid.map((v) => v / points.length)
}

function generateClusterCharacteristics(centroid: Record<string, number>): string[] {
  const characteristics: string[] = []
  const sorted = Object.entries(centroid).sort((a, b) => b[1] - a[1])

  if (sorted[0][1] > 3) {
    characteristics.push(`${sorted[0][0]} 우세형`)
  }
  if (sorted[sorted.length - 1][1] < 1) {
    characteristics.push(`${sorted[sorted.length - 1][0]} 부족형`)
  }

  const total = Object.values(centroid).reduce((sum, v) => sum + v, 0)
  const balanced = Object.values(centroid).every((v) => Math.abs(v - total / 5) < 1)
  if (balanced) {
    characteristics.push('균형형')
  }

  return characteristics.length > 0 ? characteristics : ['일반형']
}
