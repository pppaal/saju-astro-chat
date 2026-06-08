/**
 * 60갑자 일주 특성 사전 — chart-dictionary/ilju-60.json 파생 어댑터.
 *
 * 과거엔 여기에 60갑자 archetype 을 따로 하드코딩해 ilju-60.json 과 내용이 두
 * 벌(드리프트 위험)이었다. 2026-06: ilju-60.json(더 풍부 — character/strength/
 * weakness/career/love, ko·en)을 단일 데이터 소스(SSOT)로 삼고, 레거시 소비처
 * (saju-ilju-archetype · ganjiTransitNarrative · local-report-generator)가 쓰던
 * `{character, strengths[], *_en}` 모양은 이 모듈이 ilju-60.json 에서 *파생*해
 * 제공한다. 데이터는 한 곳, 인터페이스는 그대로.
 */

import iljuData from '@/lib/chart-dictionary/ilju-60.json'

export interface IljuArchetype {
  character: string
  character_en: string
  strengths: string[]
  strengths_en: string[]
  weaknesses: string[]
  weaknesses_en: string[]
  career: string[]
  career_en: string[]
  relationship: string
  relationship_en: string
}

interface Ilju60Lang {
  character: string
  strength: string
  weakness: string
  career: string
  love: string
}
const data = iljuData as unknown as Record<string, { ko: Ilju60Lang; en: Ilju60Lang }>

export const ILJU_ARCHETYPES: Record<string, IljuArchetype> = Object.fromEntries(
  Object.entries(data).map(([ganji, e]) => [
    ganji,
    {
      character: e.ko.character,
      character_en: e.en.character,
      strengths: [e.ko.strength],
      strengths_en: [e.en.strength],
      weaknesses: [e.ko.weakness],
      weaknesses_en: [e.en.weakness],
      career: [e.ko.career],
      career_en: [e.en.career],
      relationship: e.ko.love,
      relationship_en: e.en.love,
    },
  ])
)

export function getIljuArchetype(stem: string, branch: string): IljuArchetype | null {
  return ILJU_ARCHETYPES[stem + branch] || null
}
