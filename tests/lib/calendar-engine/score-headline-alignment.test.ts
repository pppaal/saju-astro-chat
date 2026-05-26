import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET as calendarGet } from '@/app/api/calendar/route'

const asNextRequest = (request: Request) => request as unknown as NextRequest

/**
 * 회귀 가드 — Fix R1/R2/R3가 막은 헤드라인 정합성.
 *
 * R1: yearlyDates의 score(engineScores 주입으로 cell.derivedScore + dailyShiftAdjustment
 *     포함된 final 값)가 displayScore에 그대로 흐른다. augment 블록이 raw cell 값으로
 *     다시 덮으면 dailyShift가 사라져 "narrative는 압박 들어옴 / 숫자는 60+" 모순 재발.
 * R2: override 활성 시 confidence = clamp(score, 20, 99). 좁히면 conservativeWarning
 *     발화 폭이 봉인되고 strong-best path 도 봉인된다.
 * R3: scoreBreakdown에 sajuAxisRaw/astroAxisRaw 가 함께 노출. convergence-heavy derivers가
 *     시프트된 표시값 대신 raw 신호 강도로 판정.
 */
describe('calendar headline alignment (R1/R2/R3 regression guards)', () => {
  const originalToken = process.env.PUBLIC_API_TOKEN

  beforeEach(() => {
    process.env.PUBLIC_API_TOKEN = 'public-token'
  })
  afterEach(() => {
    if (originalToken === undefined) delete process.env.PUBLIC_API_TOKEN
    else process.env.PUBLIC_API_TOKEN = originalToken
  })

  it('score equals displayScore on engine-augmented dates (R1 guard)', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&month=2026-05&locale=ko',
          { headers: { 'x-api-token': 'public-token' } }
        )
      )
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: Array<Record<string, unknown>> }
    const may = (payload.allDates || []).filter((d) => String(d.date).startsWith('2026-05'))
    expect(may.length).toBeGreaterThan(20)

    // augment HIT 경로 가드: engineSignals가 부착된 날(±1달 윈도우)에 score와
    // displayScore는 같아야 한다. 분리되면 R1 회귀 — augment가 displayScore를
    // 다른 모델(v2 raw cell)로 다시 덮어쓰는 것.
    const augmented = may.filter(
      (d) => Array.isArray(d.engineSignals) && (d.engineSignals as unknown[]).length > 0
    )
    expect(augmented.length).toBeGreaterThan(20)
    for (const d of augmented) {
      expect(d.displayScore).toBe(d.score)
    }

    // 점수 모델 통일 가드: 365일 전체 score === displayScore. 한 응답 안에서
    // 두 모델이 섞이지 않는다는 강한 보증 (yearly·monthly·daily 어디서 봐도 같은 숫자).
    const all = (payload.allDates || []).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(String(d.date)))
    expect(all.length).toBeGreaterThan(300)
    for (const d of all) {
      expect(d.displayScore).toBe(d.score)
    }
  })

  it('augment fields (engineSignals/matchedPatterns/themeScores) reach all 12 months (not just ±1)', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&month=2026-05&locale=ko',
          { headers: { 'x-api-token': 'public-token' } }
        )
      )
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: Array<Record<string, unknown>> }
    const all = payload.allDates || []

    // 5월 보는데 1월·12월처럼 ±1달 밖 카드도 engineSignals 부착돼야 한다. 빠지면
    // 점수는 v2지만 narrative는 fallback이라 카드 안 모순(score-narrative drift) 재발.
    const monthsWithSignals = new Set<string>()
    for (const d of all) {
      const signals = d.engineSignals as unknown[] | undefined
      if (Array.isArray(signals) && signals.length > 0) {
        monthsWithSignals.add(String(d.date).slice(0, 7))
      }
    }
    expect(monthsWithSignals.size).toBeGreaterThanOrEqual(12)
  })

  it('override-active dates expose sajuAxisRaw/astroAxisRaw on scoreBreakdown (R3 guard)', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&month=2026-05&locale=ko',
          { headers: { 'x-api-token': 'public-token' } }
        )
      )
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: Array<Record<string, unknown>> }
    const may = (payload.allDates || []).filter((d) => String(d.date).startsWith('2026-05'))

    // 응답엔 raw 필드가 시각/수렴 판정에 필요. 누락되면 isAxisConverged가
    // 시프트값(헤드라인 정렬용)을 그대로 봐 거짓 "양쪽 수렴" 트리거.
    const withBreakdown = may.filter(
      (d) =>
        d.scoreBreakdown && typeof (d.scoreBreakdown as { sajuAxis?: number }).sajuAxis === 'number'
    )
    expect(withBreakdown.length).toBeGreaterThan(20)
    for (const d of withBreakdown) {
      const sb = d.scoreBreakdown as Record<string, unknown>
      expect(typeof sb.sajuAxisRaw).toBe('number')
      expect(typeof sb.astroAxisRaw).toBe('number')
    }
  })

  it('displayGrade equals grade on every date (deep guard against rank-rebalance contradiction)', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&month=2026-05&locale=ko',
          { headers: { 'x-api-token': 'public-token' } }
        )
      )
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: Array<Record<string, unknown>> }
    const all = payload.allDates || []
    expect(all.length).toBeGreaterThan(300)

    // narrative(title/description/warnings/recommendations)는 yearlyDates가 score → grade로
    // 만든다. displayGrade가 다른 분포로 재계산되면 같은 카드 안에서 배지(displayGrade)와
    // 본문 톤(grade) 모순. rank-rebalance를 폐기한 deep fix가 살아 있는지 점검.
    for (const d of all) {
      expect(d.displayGrade).toBe(d.grade)
    }
  })

  it('emits a healthy grade distribution incl. top grade (R2 guard against silent demote)', async () => {
    const response = await calendarGet(
      asNextRequest(
        new Request(
          'http://localhost:3000/api/calendar?birthDate=1995-02-09&birthTime=06:40&birthPlace=Seoul&year=2026&month=2026-05&locale=ko',
          { headers: { 'x-api-token': 'public-token' } }
        )
      )
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { allDates?: Array<Record<string, unknown>> }
    const may = (payload.allDates || []).filter((d) => String(d.date).startsWith('2026-05'))

    // R2가 막은 핵심 회귀: applyEvidenceRegrade의 strongBestSignal path가
    // 영구 봉인되면 진짜 grade-0 (override score >=80) 날이 silent하게 grade 1로
    // demote 된다. confidence cap(과거 92)을 풀어 그 path가 발화 가능해진 게 R2.
    // 한 달 분포에 최소 한 번은 grade-0이 떠야 R2가 살아 있다.
    const grades = may
      .map((d) => (typeof d.grade === 'number' ? (d.grade as number) : null))
      .filter((v): v is number => v !== null)
    expect(grades.length).toBeGreaterThan(20)
    expect(grades.includes(0)).toBe(true)
    // 또한 분포가 한 등급에 묶이지 않아야 한다 (전 등급 silent demote 회귀 회피).
    const uniqueGrades = new Set(grades)
    expect(uniqueGrades.size).toBeGreaterThanOrEqual(3)
  })
})
