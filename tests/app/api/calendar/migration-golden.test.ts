/**
 * Migration baseline golden — /api/calendar (단계 0)
 *
 * 목적: destiny-map/calendar(구) → calendar-engine v2 일원화 마이그레이션의
 * "전(前)" 상태를 고정한다. 점수·등급 백본, augment 커버리지, monthly 구조를
 * 스냅샷으로 박아두고, 이후 additive 단계(1)·라우트 전환(2)에서 의도치 않은
 * 드리프트를 잡는 그물망.
 *
 * 서사 텍스트(title/summary/narrative)는 정당히 변할 수 있으므로 캡처하지 않는다.
 * 캡처 대상은 동등성이 "보존돼야 하는" 숫자/구조 backbone 뿐.
 *
 * 골든 갱신:  UPDATE_CALENDAR_GOLDEN=1 npx vitest run tests/app/api/calendar/migration-golden.test.ts
 *
 * ※ tests/setup.ts 는 swisseph/ephe 를 mock 한다(가짜 행성 위치). 그 mock 하에선
 *   v2 astro extractor 가 throw → buildCalendar 실패 → prescore/augment 가 통째
 *   스킵되어 응답이 구 yearlyDates 경로로만 degrade 한다. 마이그레이션은 v2 를
 *   primary 로 만드는 작업이므로, 이 파일만 mock 을 풀고(@vitest-environment node +
 *   vi.unmock) 진짜 swisseph + public/ephe 로 실제 v2 하이브리드 응답을 캡처한다.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { NextRequest } from 'next/server'

// 전역 setup 의 mock 해제 → 진짜 천체력으로 v2 엔진이 실제 실행되게 한다.
vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

import { GET as calendarGet } from '@/app/api/calendar/route'

const asNextRequest = (request: Request) => request as unknown as NextRequest

const GOLDEN_PATH = join(__dirname, '__golden__', 'migration-baseline.json')
const UPDATE = process.env.UPDATE_CALENDAR_GOLDEN === '1'

type Profile = {
  key: string
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: string
  year: number
  locale: 'ko' | 'en'
}

// 대표 프로필 — 마이그레이션이 깨면 안 되는 입력 다양성:
//  A: repro 케이스(consistency-golden 과 동일 입력) · ko
//  B: 남성 · 순행 대운 · ko
//  C: 여성 · 역행 대운 · en (locale + 대운 방향)
const PROFILES: Profile[] = [
  {
    key: 'A-1995-02-09-ko',
    birthDate: '1995-02-09',
    birthTime: '06:40',
    birthPlace: 'Seoul',
    gender: 'female',
    year: 2026,
    locale: 'ko',
  },
  {
    key: 'B-1990-05-15-ko',
    birthDate: '1990-05-15',
    birthTime: '10:30',
    birthPlace: 'Seoul',
    gender: 'male',
    year: 2026,
    locale: 'ko',
  },
  {
    key: 'C-1988-12-01-en',
    birthDate: '1988-12-01',
    birthTime: '23:45',
    birthPlace: 'Seoul',
    gender: 'female',
    year: 2026,
    locale: 'en',
  },
]

/** 동등성 백본만 추출 — 숫자·등급·카테고리·커버리지·구조. 서사 텍스트 제외. */
function extractBackbone(payload: any) {
  const allDates: any[] = Array.isArray(payload.allDates) ? payload.allDates : []

  // 날짜별 점수/등급 백본 (정렬된 키)
  const dates: Record<string, [number, number, number, number, string]> = {}
  for (const d of allDates) {
    const k = String(d.date).slice(0, 10)
    dates[k] = [
      d.grade ?? -1,
      d.displayScore ?? -1,
      d.score ?? -1,
      d.displayGrade ?? -1,
      (Array.isArray(d.categories) ? [...d.categories].sort() : []).join(','),
    ]
  }

  // augment 커버리지 — 몇 개 날짜에 v2 필드가 붙었나 (회귀 시 0으로 떨어짐)
  const coverage = {
    themeScores: allDates.filter((d) => d.themeScores && Object.keys(d.themeScores).length > 0)
      .length,
    engineSignals: allDates.filter((d) => Array.isArray(d.engineSignals) && d.engineSignals.length > 0)
      .length,
    matchedPatterns: allDates.filter(
      (d) => Array.isArray(d.matchedPatterns) && d.matchedPatterns.length > 0
    ).length,
    dailyGanji: allDates.filter((d) => typeof d.dailyGanjiNarrative === 'string').length,
    evidenceConfidence: allDates.filter((d) => typeof d.evidence?.confidence === 'number').length,
  }

  const mi = payload.monthlyInterpretation
  const monthly = mi
    ? {
        hasNarrative: typeof mi.narrative === 'string' && mi.narrative.length > 0,
        themeScoreKeys: mi.themeScores ? Object.keys(mi.themeScores).sort() : [],
        themeBreakdownKeys: mi.themeBreakdown ? Object.keys(mi.themeBreakdown).sort() : [],
        convergenceKeyDays: Array.isArray(mi.convergence?.keyDays)
          ? mi.convergence.keyDays.length
          : 0,
        yearlyConvergenceKeyDays: Array.isArray(mi.yearlyConvergence?.keyDays)
          ? mi.yearlyConvergence.keyDays.length
          : 0,
      }
    : null

  return {
    year: payload.year,
    type: payload.type,
    allDatesCount: allDates.length,
    astroIdentity: payload.astroIdentity ?? null,
    todayHourlySlots: payload.todayHourlyTimeSlots
      ? {
          best: payload.todayHourlyTimeSlots.best?.length ?? 0,
          worst: payload.todayHourlyTimeSlots.worst?.length ?? 0,
        }
      : null,
    coverage,
    monthly,
    hasMonthSummary: payload.monthSummary != null,
    hasDailyView: payload.calendarDailyView != null,
    hasMonthView: payload.calendarMonthView != null,
    dates,
  }
}

async function fetchBackbone(p: Profile) {
  const url =
    `http://localhost:3000/api/calendar?birthDate=${p.birthDate}&birthTime=${p.birthTime}` +
    `&birthPlace=${p.birthPlace}&gender=${p.gender}&year=${p.year}&locale=${p.locale}`
  const res = await calendarGet(
    asNextRequest(new Request(url, { headers: { 'x-api-token': 'public-token' } }))
  )
  expect(res.status).toBe(200)
  const payload = await res.json()
  return extractBackbone(payload)
}

/** 안정 직렬화 — 키 정렬로 diff 노이즈 제거. */
function stableStringify(obj: unknown): string {
  return JSON.stringify(
    obj,
    (_k, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
        : v,
    2
  )
}

describe('calendar migration baseline golden (단계 0)', () => {
  const originalToken = process.env.PUBLIC_API_TOKEN
  beforeEach(() => {
    process.env.PUBLIC_API_TOKEN = 'public-token'
  })
  afterEach(() => {
    if (originalToken === undefined) delete process.env.PUBLIC_API_TOKEN
    else process.env.PUBLIC_API_TOKEN = originalToken
  })

  it(
    'matches committed backbone snapshot for all profiles',
    async () => {
      const actual: Record<string, unknown> = {}
      for (const p of PROFILES) {
        actual[p.key] = await fetchBackbone(p)
      }

      if (UPDATE || !existsSync(GOLDEN_PATH)) {
        mkdirSync(dirname(GOLDEN_PATH), { recursive: true })
        writeFileSync(GOLDEN_PATH, stableStringify(actual) + '\n', 'utf8')
        // 최초 생성/갱신 시엔 통과 — 다음 런부터 비교.
        expect(existsSync(GOLDEN_PATH)).toBe(true)
        return
      }

      const expected = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'))
      // 프로필별로 비교해 diff 가독성 확보.
      for (const p of PROFILES) {
        expect(actual[p.key], `backbone drift for ${p.key}`).toEqual(expected[p.key])
      }
    },
    120000
  )
})
