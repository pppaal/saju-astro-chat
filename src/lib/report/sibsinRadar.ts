// src/lib/report/sibsinRadar.ts
//
// "타고난 능력치" 레이더 데이터 — 사주 십성(十星) 카테고리 분포에서 정직하게
// 뽑는다. 가짜 점수가 아니라, 원국에 각 십성이 몇 개 있느냐(sibsinAnalysis 의
// categoryCount)를 상대 강도(0~100)로 환산한 것.
//
// 십성 5카테고리 → 능력치 5축 매핑(고전 의미 그대로):
//   재성(財) → 재물운      · 관성(官) → 명예·직장
//   인성(印) → 배움·인복   · 식상(食傷) → 재능·표현
//   비겁(比劫) → 추진력·자립
//
// 순수·결정론: 같은 categoryCount → 같은 결과. 클록/랜덤 없음.

import type { SibsinCategoryCount } from '@/lib/saju/sibsinAnalysis'

export interface RadarAxis {
  /** 십성 카테고리 키(원본). */
  category: keyof SibsinCategoryCount
  labelKo: string
  labelEn: string
  /** 원국 내 개수(원본, 정직성 근거). */
  count: number
  /** 레이더 표시값 0~100 (최강 축 기준 상대 강도). */
  value: number
}

// 축 순서 = 오각형 꼭짓점 순서(재물 위→시계방향). 고정.
const AXES: Array<{ key: keyof SibsinCategoryCount; ko: string; en: string }> = [
  { key: '재성', ko: '재물운', en: 'Wealth' },
  { key: '관성', ko: '명예·직장', en: 'Status' },
  { key: '인성', ko: '배움·인복', en: 'Support' },
  { key: '식상', ko: '재능·표현', en: 'Creativity' },
  { key: '비겁', ko: '추진력·자립', en: 'Drive' },
]

// 빈(0) 축도 중심으로 완전히 붕괴하지 않게 최소 표시값(시각용). 데이터가 0인
// 사실은 유지되되(count=0), 레이더가 점으로 사라지지 않도록 아주 작은 바닥만.
const FLOOR = 8

/**
 * 십성 카테고리 분포 → 능력치 레이더 5축. 최강 축을 100으로 두고 나머지를 상대
 * 강도로 환산한다("이 사람 안에서 무엇이 두드러지나"를 보여주는 능력치 분포).
 * 전부 0(정보 부족)이면 null — 가짜 레이더를 그리지 않는다.
 */
export function buildSibsinRadar(cc: SibsinCategoryCount | null | undefined): RadarAxis[] | null {
  if (!cc) return null
  const counts = AXES.map((a) => Math.max(0, Math.round(cc[a.key] ?? 0)))
  const maxC = Math.max(...counts)
  if (maxC <= 0) return null // 전부 0 → 근거 없음, 그리지 않음
  return AXES.map((a, i) => {
    const count = counts[i]
    const rel = Math.round((count / maxC) * 100)
    return {
      category: a.key,
      labelKo: a.ko,
      labelEn: a.en,
      count,
      value: count > 0 ? Math.max(FLOOR, rel) : FLOOR,
    }
  })
}

/** 가장 두드러진 축(설명 문장용). null 이면 근거 없음. */
export function dominantAxis(axes: RadarAxis[] | null): RadarAxis | null {
  if (!axes || axes.length === 0) return null
  return axes.reduce((a, b) => (b.count > a.count ? b : a))
}
