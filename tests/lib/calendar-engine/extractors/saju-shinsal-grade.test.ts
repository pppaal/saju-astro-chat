/**
 * 신살 등급 단일 출처 (엔진 감사 F9, CONVENTIONS §8).
 *
 * 등급표가 세 곳(saju-shinsal SHINSAL_GRADE · saju-shinsal-activation
 * SHINSAL_GRADE_LOCAL · calendar-view CLASSICAL_NOBLE)에 복제돼 있었고, calendar-view
 * 집합은 문창·학당·금여를 4길성으로 넣고 태극귀인을 빠뜨렸다. 이제 saju-shinsal 의
 * gradeOf 하나만 쓴다.
 */
import { describe, it, expect } from 'vitest'
import {
  gradeOf,
  SHINSAL_GRADE,
  SHINSAL_POLARITY,
} from '@/lib/calendar-engine/extractors/saju-shinsal'
import sajuShinsalActivationExtractor from '@/lib/calendar-engine/extractors/saju-shinsal-activation'
import { capShinsalPolarity } from '@/lib/calendar-view/shared'
import type { ExtractorContext } from '@/lib/calendar-engine/types'

describe('신살 등급 — CONVENTIONS §8', () => {
  it('정통 4길성만 classical-noble', () => {
    const noble = Object.entries(SHINSAL_GRADE)
      .filter(([, g]) => g === 'classical-noble')
      .map(([k]) => k)
      .sort()
    expect(noble).toEqual(['월덕귀인', '천덕귀인', '천을귀인', '태극귀인'].sort())
  })
  it('문창·학당·금여성은 rok-ma, 표에 없는 이름은 common', () => {
    expect(gradeOf('문창')).toBe('rok-ma')
    expect(gradeOf('학당귀인')).toBe('rok-ma')
    expect(gradeOf('금여성')).toBe('rok-ma')
    expect(gradeOf('겁살')).toBe('common')
    expect(gradeOf('없는신살')).toBe('common')
  })
})

describe('capShinsalPolarity — cap 은 gradeOf 에서', () => {
  it('SHINSAL_POLARITY 의 모든 이름: cap === (classical-noble ? 3 : 2)', () => {
    for (const name of Object.keys(SHINSAL_POLARITY)) {
      const cap = gradeOf(name) === 'classical-noble' ? 3 : 2
      expect(capShinsalPolarity(name, 3), name).toBe(cap)
      expect(capShinsalPolarity(name, -3), name).toBe(-cap)
      expect(capShinsalPolarity(name, 1), name).toBe(1)
    }
  })
  it('회귀(F9): 태극귀인 cap 3, 문창 cap 2', () => {
    expect(capShinsalPolarity('태극귀인', 3)).toBe(3)
    expect(capShinsalPolarity('문창', 3)).toBe(2)
  })
})

describe('saju-shinsal-activation — 같은 등급표 사용', () => {
  it('evidence.detail.grade === gradeOf(kind)', () => {
    const natalShinsal = [
      { kind: '태극귀인', pillars: ['month'], target: '亥' },
      { kind: '문창', pillars: ['day'], target: '亥' },
      { kind: '도화', pillars: ['year'], target: '亥' },
      { kind: '겁살', pillars: ['time'], target: '亥' },
    ]
    const ctx = {
      natal: { saju: { natalShinsal } },
      // 2026-11-01..12: 亥 일진이 하루 이상 들어가는 범위
      range: { start: '2026-11-01T00:00:00.000Z', end: '2026-11-12T23:59:59.999Z' },
    } as unknown as ExtractorContext
    const signals = sajuShinsalActivationExtractor.extract(ctx)
    expect(signals.length).toBeGreaterThan(0)
    for (const s of signals) {
      const kind = String(s.evidence?.shinsalName)
      expect((s.evidence?.detail as { grade?: string })?.grade, kind).toBe(gradeOf(kind))
    }
  })
})
