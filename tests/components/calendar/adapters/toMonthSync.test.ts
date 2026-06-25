import { describe, it, expect } from 'vitest'
import { toMonth } from '@/components/calendar/adapters/toMonth'
import { scoreToGrade } from '@/lib/calendar-engine/derivers/grade'
import type { CalendarCell } from '@/lib/calendar-engine/types'

/**
 * 월 표면 단일 소스 가드레일.
 *
 * 그리드 색 · 흐름 막대 색 · 좋은/조심/피하는 카운트가 *전부* 한 곳
 * (calendar[].{mark,intensity} ← 일점수)에서 나와야 어긋나지 않는다. 예전엔
 * 막대를 점수로 따로 칠하거나, 큰 날이 색을 덮어 막대와 색이 갈렸다. 이 테스트가
 * 그 단일 소스를 못 깨게 잠근다:
 *   (1) calendar[].mark ⟺ goodDays/cautionDays/avoidDays 버킷 멤버십이 일치
 *   (2) intensity 로 다시 구한 밴드 = mark 밴드 (막대 높이원 == 그리드 색원)
 *   (3) bestDay 는 실제 최고점수 날이고 mark 가 'best'
 */

// toMonth 의 임계값(SSOT) — good≥60 / caution<35 / avoid<22, 그 사이는 무색.
function bandOf(score: number): 'good' | 'caution' | 'avoid' | 'neutral' {
  if (score >= 60) return 'good'
  if (score < 22) return 'avoid'
  if (score < 35) return 'caution'
  return 'neutral'
}

// derivedScore 만 채운 최소 셀(나머지 신호 필드는 표면 단일성과 무관).
function cell(dateIso: string, score: number): CalendarCell {
  return {
    datetime: dateIso,
    signals: [],
    derivedScore: score,
    salience: 0,
    matchedPatterns: [],
    topReasons: [],
    cautions: [],
  }
}

// 6월 30일 — 밴드가 골고루 걸리도록 흩뿌린 점수(경계값 21/22/34/35/59/60 포함).
const SCORES = [
  52, 21, 49, 57, 66, 44, 31, 53, 63, 48, 55, 78, 50, 46, 72, 54, 41, 22, 59, 64, 47, 60, 39, 34,
  18, 51, 67, 43, 35, 15,
]

function build() {
  const cells: CalendarCell[] = SCORES.map((s, i) =>
    cell(`2026-06-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, s)
  )
  const dayScores = new Map(
    SCORES.map((s, i) => [
      `2026-06-${String(i + 1).padStart(2, '0')}`,
      { score: s, grade: scoreToGrade(s) },
    ])
  )
  // focusDay 를 점수와 무관한 날로 둬서(중립일) best/버킷 단언이 focus 중립화에
  // 흔들리지 않게 한다.
  return toMonth({ ym: '2026-06', cells, dayScores, focusDay: 3 })
}

describe('월 표면 단일 소스 (그리드 · 막대 · 카운트)', () => {
  it('calendar[].mark 가 good/caution/avoidDays 버킷과 정확히 일치한다', () => {
    const { month, calendar } = build()
    const good = new Set(month.goodDays)
    const caution = new Set(month.cautionDays)
    const avoid = new Set(month.avoidDays)

    for (const c of calendar) {
      if (c.focus) continue // focusDay 는 mark 가 'focus' 로 중립화(버킷서도 빠짐) — 별도 계약
      const inGood = good.has(c.ds)
      const inCaution = caution.has(c.ds)
      const inAvoid = avoid.has(c.ds)
      if (c.mark === 'good' || c.mark === 'best') {
        expect(inGood, `${c.ds} mark=${c.mark} 인데 goodDays 에 없음`).toBe(true)
        expect(inCaution || inAvoid).toBe(false)
      } else if (c.mark === 'caution') {
        expect(inCaution).toBe(true)
        expect(inGood || inAvoid).toBe(false)
      } else if (c.mark === 'avoid') {
        expect(inAvoid).toBe(true)
        expect(inGood || inCaution).toBe(false)
      } else {
        // 무색/converge — 어느 버킷에도 없어야
        expect(inGood || inCaution || inAvoid, `${c.ds} 무색인데 버킷에 있음`).toBe(false)
      }
    }
  })

  it('intensity 로 다시 구한 밴드 = mark 밴드 (막대 높이원 == 그리드 색원)', () => {
    const { calendar } = build()
    for (const c of calendar) {
      if (c.focus || c.mark === 'converge') continue
      const fromIntensity = bandOf(Math.round(c.intensity * 100))
      const fromMark =
        c.mark === 'best' || c.mark === 'good'
          ? 'good'
          : c.mark === 'caution'
            ? 'caution'
            : c.mark === 'avoid'
              ? 'avoid'
              : 'neutral'
      // best 는 good 밴드(최고점이라 intensity 도 good 구간) — 위에서 good 으로 정규화됨.
      expect(fromIntensity, `${c.ds}: 막대(intensity ${c.intensity}) ≠ 그리드(mark ${c.mark})`).toBe(
        fromMark
      )
    }
  })

  it('카운트(good/caution/avoid 길이) == 실제 mark 집계', () => {
    const { month, calendar } = build()
    const tally = { good: 0, caution: 0, avoid: 0 }
    for (const c of calendar) {
      if (c.mark === 'good' || c.mark === 'best') tally.good++
      else if (c.mark === 'caution') tally.caution++
      else if (c.mark === 'avoid') tally.avoid++
    }
    expect(month.goodDays.length).toBe(tally.good)
    expect(month.cautionDays.length).toBe(tally.caution)
    expect(month.avoidDays.length).toBe(tally.avoid)
  })

  it('bestDay 는 실제 최고점수 날이고 그 셀 mark 가 best', () => {
    const { month, calendar } = build()
    const maxScore = Math.max(...SCORES)
    expect(month.bestDay?.score).toBe(maxScore)
    const bestCell = calendar.find((c) => c.ds === month.bestDay?.date)
    expect(bestCell?.mark).toBe('best')
  })
})
