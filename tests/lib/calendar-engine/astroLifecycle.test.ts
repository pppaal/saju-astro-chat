import { describe, it, expect } from 'vitest'
import {
  buildLifecycleTiming,
  firstSentence,
  lifecycleEventDef,
  typicalLifecycleAges,
  type AstroLifecycleEventKind,
  type LifecycleMilestoneOverride,
} from '@/lib/calendar-engine/lifecycle/astroLifecycle'

/**
 * buildLifecycleTiming — 실측 마디(calculateOuterPlanetMilestones) → 생애 마디 항목.
 * 날짜·나이는 실측 순간에서만 온다: 실측이 없는 kind 는 빠지고 평균 나이표로 채우지
 * 않는다(G6 · 재감사 AC-1/AC-5). 결정론: now 를 주입해 과거/현재/예정 분류를 고정 검증한다.
 */

const KINDS: AstroLifecycleEventKind[] = [
  'jupiter_return_1',
  'jupiter_return_2',
  'progressed_lunar_1',
  'saturn_return_1',
  'jupiter_return_3',
  'pluto_square_pluto',
  'uranus_opposition',
  'neptune_square',
  'chiron_return',
  'saturn_return_2',
  'jupiter_return_5',
  'uranus_return',
]

const NOW = new Date('2026-06-21T00:00:00.000Z') // currentYear = 2026

// 1990 출생 가상 실측 — 순서를 일부러 섞어 넣어도 결과는 테이블 순서.
const EXACT: LifecycleMilestoneOverride[] = [
  { kind: 'saturn_return_1', startYear: 2019, age: 29, exactDateISO: '2019-03-02' },
  { kind: 'jupiter_return_1', startYear: 2001, age: 11, exactDateISO: '2001-09-14' },
  { kind: 'pluto_square_pluto', startYear: 2026, age: 36, exactDateISO: '2026-02-10' },
  { kind: 'uranus_opposition', startYear: 2032, age: 42, exactDateISO: '2032-05-01' },
]

describe('buildLifecycleTiming — 실측 마디만', () => {
  it('실측이 있는 kind 만, 테이블 순서대로', () => {
    const { events } = buildLifecycleTiming(EXACT, { endYear: 2100, now: NOW })
    expect(events.map((e) => e.event)).toEqual([
      'jupiter_return_1',
      'saturn_return_1',
      'pluto_square_pluto',
      'uranus_opposition',
    ])
  })

  it('실측이 없으면(undefined·빈 배열) 아무 마디도 싣지 않는다 — 평균 나이표 폴백 없음', () => {
    expect(buildLifecycleTiming(undefined, { endYear: 2100, now: NOW }).events).toEqual([])
    expect(buildLifecycleTiming([], { endYear: 2100, now: NOW }).events).toEqual([])
  })

  it('startYear/age 중 하나라도 null 이면 그 kind 는 빠진다(표로 채우지 않음)', () => {
    const { events } = buildLifecycleTiming(
      [
        { kind: 'saturn_return_1', startYear: 2019, age: null },
        { kind: 'jupiter_return_1', startYear: null, age: 12 },
        { kind: 'jupiter_return_2', startYear: 2014, age: 23 },
      ],
      { endYear: 2100, now: NOW }
    )
    expect(events.map((e) => e.event)).toEqual(['jupiter_return_2'])
  })

  it('startYear·age 는 실측 그대로, ageRange 는 단일 만 나이(ko "N세" / en "age N")', () => {
    const ko = buildLifecycleTiming(EXACT, { endYear: 2100, now: NOW }).events
    const en = buildLifecycleTiming(EXACT, { endYear: 2100, isKo: false, now: NOW }).events
    const sat = ko.find((e) => e.event === 'saturn_return_1')!
    expect(sat.startYear).toBe(2019)
    expect(sat.age).toBe(29)
    expect(sat.ageRange).toBe('29세')
    expect(en.find((e) => e.event === 'saturn_return_1')!.ageRange).toBe('age 29')
  })

  it('한글 라벨/의미/조언(isKo 기본 true), isKo=false 면 영문', () => {
    const ko = buildLifecycleTiming(EXACT, { endYear: 2100, now: NOW }).events
    for (const e of ko) {
      expect(e.label).toBeTruthy()
      expect(e.meaning).toBeTruthy()
      expect(e.advice).toBeTruthy()
    }
    expect(ko[0].label).toContain('목성 회귀')
    const en = buildLifecycleTiming(EXACT, { endYear: 2100, isKo: false, now: NOW }).events
    expect(en[0].label).toBe('First Jupiter return')
    expect(en[0].meaning).toContain('worldview')
    expect(en[0].advice).toContain('curiosity')
    for (const e of en) expect(`${e.label} ${e.meaning} ${e.advice}`).not.toMatch(/[가-힣]/)
  })
})

describe('buildLifecycleTiming — past/current/upcoming 분류(now 주입)', () => {
  const at = (kind: AstroLifecycleEventKind, endYear = 2100) =>
    buildLifecycleTiming(EXACT, { endYear, now: NOW }).events.find((e) => e.event === kind)!

  it('실측 연도 < now 연도 → 과거', () => {
    const sat1 = at('saturn_return_1')
    expect([sat1.isPast, sat1.isCurrent, sat1.isUpcoming]).toEqual([true, false, false])
  })

  it('실측 연도 = now 연도 → 현재', () => {
    const pluto = at('pluto_square_pluto')
    expect([pluto.isPast, pluto.isCurrent, pluto.isUpcoming]).toEqual([false, true, false])
  })

  it('미래이면서 endYear 안 → 예정, endYear 밖이면 예정 플래그 없음', () => {
    const ur = at('uranus_opposition')
    expect([ur.isPast, ur.isCurrent, ur.isUpcoming]).toEqual([false, false, true])
    expect(at('uranus_opposition', 2027).isUpcoming).toBe(false)
  })

  it('now 미지정이어도 동작한다(기본 new Date())', () => {
    expect(buildLifecycleTiming(EXACT, { endYear: 2100 }).events).toHaveLength(4)
  })
})

describe('lifecycleEventDef / typicalLifecycleAges', () => {
  it('12 kind 모두 정의(ko/en 라벨·의미·조언)가 있다', () => {
    for (const k of KINDS) {
      const d = lifecycleEventDef(k)
      expect(d.kind).toBe(k)
      expect(
        d.labelKo && d.labelEn && d.meaningKo && d.meaningEn && d.adviceKo && d.adviceEn
      ).toBeTruthy()
    }
  })

  it('평균 나이표는 씨앗으로만 노출된다(kind·나이 범위만 — 날짜 없음)', () => {
    const seeds = typicalLifecycleAges()
    expect(seeds.map((s) => s.kind)).toEqual(KINDS)
    for (const s of seeds) {
      expect(Object.keys(s).sort()).toEqual(['ageEnd', 'ageStart', 'kind'])
      expect(s.ageEnd).toBeGreaterThanOrEqual(s.ageStart)
    }
  })
})

describe('meaningCore — 의미의 첫 문장(A4)', () => {
  it('항목마다 마디 정의 의미의 첫 문장(ko/en)', () => {
    const ko = buildLifecycleTiming(EXACT, { endYear: 2100, now: NOW }).events
    const en = buildLifecycleTiming(EXACT, { endYear: 2100, isKo: false, now: NOW }).events
    for (const e of [...ko, ...en]) {
      expect(e.meaningCore).toBe(firstSentence(e.meaning))
      expect(e.meaning.startsWith(e.meaningCore)).toBe(true)
    }
    const j3 = buildLifecycleTiming([{ kind: 'jupiter_return_3', startYear: 2033, age: 35 }], {
      endYear: 2100,
      isKo: false,
      now: NOW,
    }).events[0]
    expect(j3.meaningCore).toBe('The last expansion window before midlife.')
  })

  it('firstSentence — 첫 문장 끝(. ! ? 。 + 공백/끝)까지, 없으면 전체', () => {
    expect(firstSentence('A one. Two.')).toBe('A one.')
    expect(firstSentence('하나예요. 둘이에요.')).toBe('하나예요.')
    expect(firstSentence('v1.2 works? yes.')).toBe('v1.2 works?')
    expect(firstSentence('  no end  ')).toBe('no end')
  })
})
