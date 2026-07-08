import { calculateProfectionTimeline } from '@/lib/astrology/foundation/profections'
import type { ActiveSignal, ExtractorContext, SignalExtractor } from '../types'
import { getHouseRich, type HouseNumber } from '@/lib/chart-dictionary'
import { pointKo } from '../data/astroFlow'
import { ordinalEn } from '../ordinal'

/**
 * 연주술 (Profections) 추출기.
 * 한 해 = 한 하우스 활성. 12세 주기로 1궁부터 순환.
 *
 * 활성 윈도우 = 생일~다음 생일 (1년).
 * polarity는 0 (중립) — Profection은 길흉이 아닌 "어느 영역에 포커스"를 알려줌.
 * Lord of Year의 트랜짓이 그 해의 핵심 사건을 만드는 식이라
 * 실제 길흉은 transit 추출기 + Lord 매칭에서 결정됨.
 */
const astroProfectionExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'profection',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const birth = natal.input
    const startYear = new Date(range.start).getUTCFullYear()
    const endYear = new Date(range.end).getUTCFullYear()
    // 생일 전 구간을 위해 한 해 앞(−1)부터 생성한다(감사). 프로펙션 나이 N 창은
    // [생일+N, 생일+N+1] 이라, 생일 전 달(예 1~10월, 11월 출생자)에 활성인 창은
    // 나이 (달력나이−1) 이다. 옛 `startYear−birth.year` 만 쓰면 그 창이 생성 안 돼
    // 생일 전 ~반년치 셀에 프로펙션(활성 하우스·Lord)이 통째로 비었다. 비-겹침
    // 연도는 groupIntoCells 가 어차피 버리므로 과생성은 무해.
    const fromAge = startYear - birth.year - 1
    const toAge = endYear - birth.year
    if (toAge < 0) return []

    const timeline = calculateProfectionTimeline(natal.astro.chart, Math.max(0, fromAge), toAge)
    const signals: ActiveSignal[] = []

    for (const r of timeline) {
      const yearStartIso = isoFromBirthAge(birth, r.age)
      const yearEndIso = isoFromBirthAge(birth, r.age + 1)
      // peak = 그 해 중간점 (간단화)
      const peakIso = midpointIso(yearStartIso, yearEndIso)

      signals.push({
        id: `astro.profection.age${r.age}`,
        source: 'astro',
        kind: 'profection',
        name: `${r.activatedHouse}궁 활성 — ${r.lordOfYear}`,
        korean: `올해는 ${r.activatedHouse}궁${(() => {
          const dom = getHouseRich(r.activatedHouse as HouseNumber, 'ko')?.domain
          return dom ? `(${dom})` : ''
        })()}이 활성 — 한 해의 초점이 이 영역에 놓이고, 그 주인별 ${pointKo(r.lordOfYear)}의 움직임이 핵심이에요`,
        english: `This year activates the ${ordinalEn(r.activatedHouse)} house${(() => {
          const dom = getHouseRich(r.activatedHouse as HouseNumber, 'en')?.domain
          return dom ? ` (${dom})` : ''
        })()} — the year's focus rests on this area, and its ruler ${r.lordOfYear} is the key mover`,
        polarity: 0,
        layer: 'yearly',
        active: { start: yearStartIso, peak: peakIso, end: yearEndIso },
        weight: 0.5,
        evidence: {
          module: 'astro-profection',
          houses: [r.activatedHouse],
          planets: [r.lordOfYear],
          detail: { age: r.age, activatedSign: r.activatedSign },
        },
      })
    }

    return signals
  },
}

function isoFromBirthAge(
  birth: { year: number; month: number; date: number; hour: number; minute: number },
  age: number
): string {
  const d = new Date(
    Date.UTC(birth.year + age, birth.month - 1, birth.date, birth.hour, birth.minute)
  )
  return d.toISOString()
}

function midpointIso(startIso: string, endIso: string): string {
  const mid = (new Date(startIso).getTime() + new Date(endIso).getTime()) / 2
  return new Date(mid).toISOString()
}

export default astroProfectionExtractor
