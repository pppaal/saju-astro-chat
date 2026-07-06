import { describe, it, expect } from 'vitest'
import {
  reconcileMonthTone,
  reconcileDayTone,
  scoreToBand,
  type MonthTone,
} from '@/lib/calendar-engine/derivers/reconcile'
import { deriveMonthSummary } from '@/lib/calendar-engine/derivers/monthSummary'

/**
 * 교차 표면 일치 불변식 — verdict 단일 권위가 실제로 어긋남을 막는지 잠근다.
 *
 * 배경: 예전엔 같은 하루/한 달의 톤을 그리드·카운트·한 줄·히어로·공유카드가 각자
 * 점수에서 다시 계산해, 한 곳만 바뀌면 조용히 모순이 났다(두더지잡기). 이제 톤은
 * reconcileDayTone / reconcileMonthTone 한 곳에서만 나오고 표면은 그걸 *읽기만* 한다.
 * 이 테스트는 그 단일 소스가 지켜지는지 — 즉 verdict 를 먹인 파생물이 verdict 와
 * 절대 반대말을 하지 않는지 — 를 전 조합에서 검증한다. 새 톤축/새 표면이 추가돼도
 * 이 불변식을 깨면 즉시 빨간불.
 */

// ── 월: reconcileMonthTone 이 monthSummary 를 지배한다 ────────────────────────
describe('월 verdict ⟺ 총평 일치 (모든 카운트 조합)', () => {
  // 좋은/조심/피하는 날 수를 넓게 훑어 4분류 전 구간을 커버.
  const COMBOS: Array<[number, number, number]> = []
  for (const g of [0, 1, 2, 4, 8, 12]) {
    for (const c of [0, 1, 3, 6]) {
      for (const a of [0, 2, 5]) {
        COMBOS.push([g, c, a])
      }
    }
  }

  it('총평 여는 문장이 verdict.tone 과 반대말을 하지 않는다', () => {
    for (const [goodN, cautionN, avoidN] of COMBOS) {
      const verdict = reconcileMonthTone({ goodN, cautionN, avoidN, totalN: 30 })
      const ko = deriveMonthSummary({
        goodDays: goodN,
        cautionDays: cautionN,
        avoidDays: avoidN,
        totalDays: 30,
        topReasons: [],
        monthTone: verdict.tone,
        lang: 'ko',
      })
      const tag = `g${goodN}c${cautionN}a${avoidN} tone=${verdict.tone}`

      if (verdict.tone === 'flat') {
        // 평이한 달 — "고르게" 로 열고, 없는 좋은/조심 날을 겨냥한 mixed 문구 금지.
        expect(ko, tag).toContain('고르게 흐르는 달')
        expect(ko, tag).not.toContain('굴곡이 또렷한')
        expect(ko, tag).not.toContain('조심할 날엔 쉬어')
      } else if (verdict.tone === 'good') {
        expect(ko, tag).toContain('순하게')
        expect(ko, tag).not.toContain('고르게 흐르는 달')
      } else if (verdict.tone === 'care') {
        expect(ko, tag).toContain('조심스러운 결')
        expect(ko, tag).not.toContain('고르게 흐르는 달')
      } else {
        // volatile → mixed 문단("굴곡이 또렷한")
        expect(ko, tag).toContain('굴곡이 또렷한')
        expect(ko, tag).not.toContain('고르게 흐르는 달')
      }
    }
  })

  it('careN = cautionN + avoidN, shareTone 은 tone 과 1:1', () => {
    const map: Record<MonthTone, string> = {
      good: 'bright',
      care: 'careful',
      volatile: 'mixed',
      flat: 'steady',
    }
    for (const [goodN, cautionN, avoidN] of COMBOS) {
      const v = reconcileMonthTone({ goodN, cautionN, avoidN, totalN: 30 })
      expect(v.careN).toBe(cautionN + avoidN)
      expect(v.shareTone).toBe(map[v.tone])
    }
  })

  it('flat 은 오직 goodN=0 ∧ careN=0 일 때만 (평이의 정의)', () => {
    for (const [goodN, cautionN, avoidN] of COMBOS) {
      const v = reconcileMonthTone({ goodN, cautionN, avoidN, totalN: 30 })
      expect(v.tone === 'flat').toBe(goodN === 0 && cautionN + avoidN === 0)
    }
  })
})

// ── 일: reconcileDayTone 내부 정합(밴드·flavor·score) ─────────────────────────
describe('일 verdict 내부 정합 (모든 점수×사유 조합)', () => {
  const base = { hasGoodReason: true, hasCautionReason: true }

  it('band=색축(점수) / tone=말축, flavor·score 가 verdict 안에서 일관', () => {
    for (let score = 0; score <= 100; score += 5) {
      for (const reasonNet of [-5, -1, 0, 1, 5]) {
        const v = reconcileDayTone({ score, reasonNet, ...base })
        const tag = `s${score} net${reasonNet} tone=${v.tone}`
        // 색 축(밴드)은 점수의 순수 함수 — 톤과 독립.
        expect(v.band, tag).toBe(scoreToBand(score))
        // 보여주는 점수를 그대로 실어 둔다(후크 72컷·밴드가 한 소스).
        expect(v.score, tag).toBe(score)
        // flavor: tense/bright(=실제 조정)면 volatile, 아니면 flat.
        expect(v.flavor, tag).toBe(v.tense || v.bright ? 'volatile' : 'flat')
        // positive 는 절대 volatile 이 아니다(volatile 은 mixed 의 결일 뿐).
        if (v.tone === 'positive' || v.tone === 'caution') {
          // 순수 낙관/주의 톤은 화해로 뒤집힌 게 아니면 flat.
          if (!v.tense && !v.bright) expect(v.flavor, tag).toBe('flat')
        }
        // 화해로 조정된 날은 반드시 mixed 톤(positive/caution 이 mixed 로 강등/승격).
        if (v.tense || v.bright) expect(v.tone, tag).toBe('mixed')
      }
    }
  })
})
