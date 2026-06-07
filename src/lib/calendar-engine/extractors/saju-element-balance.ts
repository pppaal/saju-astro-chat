import { STEMS, BRANCHES } from '@/lib/saju/constants'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor } from '../types'
import type { FiveElement } from '@/lib/saju/types'

/**
 * 일진 오행 보충 / 과잉 추출기 — 본명 5행 분포 (`natal.saju.fiveElements`) 소비.
 *
 * 본명 8글자의 wood/fire/earth/metal/water 카운트에서
 *  - 가장 부족한 오행 (count ≤ 1) 을 일진의 stem/branch 가 가져오면 +1 ("부족 보충")
 *  - 가장 넘쳐나는 오행 (count ≥ 3) 을 일진이 또 가져오면 -1 ("과잉 강화")
 *  - 그 외엔 신호 안 냄 — 매 셀 노이즈 방지.
 *
 * saju-element-flow 와 차이:
 *  - element-flow 는 본명 일간(day master) 1개 오행을 기준으로 일진과 생/극 관계를 보고
 *  - 이 추출기는 본명 8자 전체 분포의 결손/과잉 축을 보고 일진 오행이 그 균형을 어떻게
 *    움직이는지 본다. 둘은 보완적 — 강·약 두 척도를 따로 발신.
 *
 * 활성 윈도우: 해당 1일.
 */

type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

const ELEMENT_KO_TO_EN: Record<FiveElement, ElementKey> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

const ELEMENT_KO: Record<ElementKey, FiveElement> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const ELEMENT_EN_LABEL: Record<ElementKey, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
}

const WEAK_THRESHOLD = 1 // count ≤ 1 → 부족
const STRONG_THRESHOLD = 3 // count ≥ 3 → 과잉

const sajuElementBalanceExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const fiveElements = natal.saju?.fiveElements
    if (!fiveElements) return []

    // weakest / strongest 결정. tie 가 있으면 모두 본다 — 일진 1개가
    // 여러 결손/과잉 오행을 동시 hit 할 수 없으므로 어차피 한 신호만 emit.
    const entries: Array<[ElementKey, number]> = [
      ['wood', fiveElements.wood],
      ['fire', fiveElements.fire],
      ['earth', fiveElements.earth],
      ['metal', fiveElements.metal],
      ['water', fiveElements.water],
    ]
    const minCount = Math.min(...entries.map(([, c]) => c))
    const maxCount = Math.max(...entries.map(([, c]) => c))
    const weakElements = new Set<ElementKey>(
      entries.filter(([, c]) => c === minCount && c <= WEAK_THRESHOLD).map(([k]) => k)
    )
    const strongElements = new Set<ElementKey>(
      entries.filter(([, c]) => c === maxCount && c >= STRONG_THRESHOLD).map(([k]) => k)
    )

    if (weakElements.size === 0 && strongElements.size === 0) return []

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const stemName = computeDayStem(date)
      const branchName = computeDayBranch(date)
      if (!stemName || !branchName) continue

      const stemInfo = STEMS.find((s) => s.name === stemName)
      const branchInfo = BRANCHES.find((b) => b.name === branchName)
      if (!stemInfo || !branchInfo) continue

      const stemEl = ELEMENT_KO_TO_EN[stemInfo.element as FiveElement]
      const branchEl = ELEMENT_KO_TO_EN[branchInfo.element as FiveElement]

      // 일진 stem + branch 오행 set — 둘이 같으면 한번만 평가.
      const dayElements = new Set<ElementKey>([stemEl, branchEl])

      const dayIso = date.toISOString().slice(0, 10)
      const startIso = `${dayIso}T00:00:00.000Z`
      const peakIso = `${dayIso}T12:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`

      for (const dayEl of dayElements) {
        if (weakElements.has(dayEl)) {
          const elKo = ELEMENT_KO[dayEl]
          const elEn = ELEMENT_EN_LABEL[dayEl]
          signals.push({
            id: `saju.element-balance.replenish.${dayEl}.${dayIso}`,
            source: 'saju',
            kind: 'pillar-sibsin',
            name: `약한 ${elKo} 보강`,
            korean: `오늘 부족한 ${elKo}(${elEn}) 오행이 보충돼요`,
            english: `your deficient ${elEn} element gets replenished today`,
            themes: [],
            polarity: 1,
            layer: 'daily',
            active: { start: startIso, peak: peakIso, end: endIso },
            weight: 0.6,
            evidence: {
              module: 'saju-element-balance',
              element: elKo,
              detail: {
                kind: 'replenish-weak',
                dayElement: dayEl,
                natalCount: fiveElements[dayEl],
                fiveElements: { ...fiveElements },
                sources: {
                  stem: stemEl === dayEl ? stemName : undefined,
                  branch: branchEl === dayEl ? branchName : undefined,
                },
              },
            },
          })
        } else if (strongElements.has(dayEl)) {
          const elKo = ELEMENT_KO[dayEl]
          const elEn = ELEMENT_EN_LABEL[dayEl]
          signals.push({
            id: `saju.element-balance.excess.${dayEl}.${dayIso}`,
            source: 'saju',
            kind: 'pillar-sibsin',
            name: `과한 ${elKo} 증폭`,
            korean: `오늘 과잉인 ${elKo}(${elEn}) 오행이 더 강해져요`,
            english: `your already-excess ${elEn} element grows even stronger today`,
            themes: [],
            polarity: -1,
            layer: 'daily',
            active: { start: startIso, peak: peakIso, end: endIso },
            weight: 0.55,
            evidence: {
              module: 'saju-element-balance',
              element: elKo,
              detail: {
                kind: 'amplify-excess',
                dayElement: dayEl,
                natalCount: fiveElements[dayEl],
                fiveElements: { ...fiveElements },
                sources: {
                  stem: stemEl === dayEl ? stemName : undefined,
                  branch: branchEl === dayEl ? branchName : undefined,
                },
              },
            },
          })
        }
      }
    }

    return signals
  },
}

export default sajuElementBalanceExtractor
