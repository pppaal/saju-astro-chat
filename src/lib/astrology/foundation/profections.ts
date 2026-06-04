// astrology/foundation/profections.ts
// Annual Profections — Hellenistic 12년 주기.
// 매년 1개 하우스씩 활성화 (age 0=1궁, age 1=2궁, ..., age 12=1궁 다시).
// 활성 하우스 위 sign의 ruler = "Lord of the Year".

import type { Chart, ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'
import { SIGN_RULERS_BY_SIGN } from './dignities'

// 별자리 지배 행성은 dignities.ts(SSOT)에서 파생. 로컬 복제 금지.
const SIGN_RULERS = SIGN_RULERS_BY_SIGN as Record<ZodiacKo, AstroPlanetName>

export interface ProfectionResult {
  age: number
  activatedHouse: number      // 1-12
  activatedSign: ZodiacKo
  lordOfYear: AstroPlanetName
}

const HOUSE_PROFECTION_THEMES: Record<number, { theme: string; description: string }> = {
  1:  { theme: '자기·신체·정체성',         description: '자기 표현·외형·정체성을 새로 세우는 해. 시작과 자아 정립.' },
  2:  { theme: '재물·자원·가치관',         description: '돈·소유·자원·자기 가치를 다지는 해. 축적과 안정.' },
  3:  { theme: '소통·학습·형제',           description: '단거리 이동·학습·형제·이웃과의 교류 활성화.' },
  4:  { theme: '가정·뿌리·부모',           description: '가정·부모·뿌리·부동산을 다루는 해. 정서적 안식 또는 균열.' },
  5:  { theme: '연애·창조·자녀',           description: '연애·창작·놀이·자녀의 무대. 즐거움과 표현 분출.' },
  6:  { theme: '일상 업무·건강·하인',      description: '루틴·건강·실무·서비스 노동. 디테일 점검의 해.' },
  7:  { theme: '동반자·계약·공식 관계',    description: '결혼·파트너·공식 계약·공개 적의 무대.' },
  8:  { theme: '공동 자원·심층 변환·죽음', description: '타인의 자원·부채·상속·심리 변환·위기 통과.' },
  9:  { theme: '장거리·진리·종교·고등 학문',description: '여행·외국·철학·종교·법·고등 교육의 무대.' },
  10: { theme: '소명·공적 성취·명예',      description: '커리어·사회 위치·공적 성취가 무르익는 해.' },
  11: { theme: '동료·이상·소득',           description: '친구·집단·이상 추구·후원·대규모 이익의 무대.' },
  12: { theme: '내면·고립·잠재·종결',      description: '은둔·잠재·뒷마무리·자선·정신적 정화의 해.' },
}

export function getProfectionInterpretation(result: ProfectionResult): string {
  const theme = HOUSE_PROFECTION_THEMES[result.activatedHouse]
  return `Age ${result.age}: ${result.activatedHouse}궁 (${theme.theme}) 활성. Lord of the Year: ${result.lordOfYear} in ${result.activatedSign}. ${theme.description}`
}

export function calculateProfection(natal: Chart, age: number): ProfectionResult {
  if (age < 0 || !Number.isFinite(age)) {
    throw new Error(`Invalid age: ${age}`)
  }
  const activatedHouse = ((Math.floor(age) % 12) + 12) % 12 + 1
  const house = natal.houses.find((h) => h.index === activatedHouse)
  const activatedSign = (house?.sign ?? 'Aries') as ZodiacKo
  const lordOfYear = SIGN_RULERS[activatedSign]
  return { age: Math.floor(age), activatedHouse, activatedSign, lordOfYear }
}

/**
 * 연속 N년 profections 산출.
 */
export function calculateProfectionTimeline(natal: Chart, fromAge: number, toAge: number): ProfectionResult[] {
  const out: ProfectionResult[] = []
  for (let a = Math.floor(fromAge); a <= Math.floor(toAge); a++) {
    out.push(calculateProfection(natal, a))
  }
  return out
}
