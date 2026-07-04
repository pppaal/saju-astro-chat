// @vitest-environment node
// Arabic Parts(Lots) — 7대 lot 의 낮/밤 sect 공식을 헬레니즘 표준(Paulus/Valens)
// 대비 검증한다. 합성 차트에 알려진 행성 경도를 넣고 각 lot 경도를 손계산한
// 기대값과 대조 — Courage/Victory 의 낮/밤 반전 회귀(이전엔 sect 가 뒤바뀌어
// 낮 차트에서 틀린 경도를 냈다)를 잠근다.
import { describe, it, expect } from 'vitest'
import { calculateArabicLots } from '@/lib/astrology/foundation/arabicParts'
import type { Chart } from '@/lib/astrology/foundation/types'

// 통제된 경도 — 계산 검산이 쉽도록 단순 정수.
const L = {
  asc: 100,
  Sun: 40,
  Moon: 10,
  Mercury: 20,
  Venus: 30,
  Mars: 50,
  Jupiter: 60,
  Saturn: 70,
}

function chartOf(): Chart {
  const planets = (['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const).map(
    (name) => ({ name, longitude: L[name] })
  )
  return {
    ascendant: { longitude: L.asc },
    planets,
  } as unknown as Chart
}

const lonOf = (lots: ReturnType<typeof calculateArabicLots>, name: string) =>
  lots.find((l) => l.name === name)!.longitude

describe('calculateArabicLots — sect 공식 (Paulus/Valens 표준)', () => {
  it('낮 차트: 7대 lot 이 표준 낮 공식과 일치', () => {
    const lots = calculateArabicLots(chartOf(), true)
    // Fortune 낮 = ASC + Moon − Sun = 100+10−40 = 70
    expect(lonOf(lots, 'Fortune')).toBeCloseTo(70, 6)
    // Spirit 낮 = ASC + Sun − Moon = 130
    expect(lonOf(lots, 'Spirit')).toBeCloseTo(130, 6)
    // Eros 낮 = ASC + Venus − Spirit = 100+30−130 = 0
    expect(lonOf(lots, 'Eros')).toBeCloseTo(0, 6)
    // Necessity 낮 = ASC + Fortune − Mercury = 100+70−20 = 150
    expect(lonOf(lots, 'Necessity')).toBeCloseTo(150, 6)
    // Courage 낮 = ASC + Fortune − Mars = 100+70−50 = 120 (반전 전엔 ASC+Mars−Fortune)
    expect(lonOf(lots, 'Courage')).toBeCloseTo(120, 6)
    // Victory 낮 = ASC + Jupiter − Spirit = 100+60−130 = 30 (반전 전엔 ASC+Spirit−Jupiter)
    expect(lonOf(lots, 'Victory')).toBeCloseTo(30, 6)
    // Nemesis 낮 = ASC + Fortune − Saturn = 100+70−70 = 100
    expect(lonOf(lots, 'Nemesis')).toBeCloseTo(100, 6)
  })

  it('밤 차트: 7대 lot 이 표준 밤 공식과 일치', () => {
    const lots = calculateArabicLots(chartOf(), false)
    // Fortune 밤 = ASC + Sun − Moon = 130
    expect(lonOf(lots, 'Fortune')).toBeCloseTo(130, 6)
    // Spirit 밤 = ASC + Moon − Sun = 70
    expect(lonOf(lots, 'Spirit')).toBeCloseTo(70, 6)
    // Eros 밤 = ASC + Spirit − Venus = 100+70−30 = 140
    expect(lonOf(lots, 'Eros')).toBeCloseTo(140, 6)
    // Necessity 밤 = ASC + Mercury − Fortune = 100+20−130 = 350 (norm)
    expect(lonOf(lots, 'Necessity')).toBeCloseTo(350, 6)
    // Courage 밤 = ASC + Mars − Fortune = 100+50−130 = 20
    expect(lonOf(lots, 'Courage')).toBeCloseTo(20, 6)
    // Victory 밤 = ASC + Spirit − Jupiter = 100+70−60 = 110
    expect(lonOf(lots, 'Victory')).toBeCloseTo(110, 6)
    // Nemesis 밤 = ASC + Saturn − Fortune = 100+70−130 = 40
    expect(lonOf(lots, 'Nemesis')).toBeCloseTo(40, 6)
  })

  it('Courage/Victory 는 낮과 밤이 서로 다르다 (sect 반영 확인)', () => {
    const day = calculateArabicLots(chartOf(), true)
    const night = calculateArabicLots(chartOf(), false)
    expect(lonOf(day, 'Courage')).not.toBeCloseTo(lonOf(night, 'Courage'), 3)
    expect(lonOf(day, 'Victory')).not.toBeCloseTo(lonOf(night, 'Victory'), 3)
  })
})
