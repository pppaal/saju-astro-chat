import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'

/**
 * buildNatalContext — 본명 컨텍스트 빌드 (사주 + 점성 + 헬레니즘).
 * 실데이터 파이프라인. preComputed 재사용 분기 / mapStrength / dayJijanggan /
 * geokguk 분기를 덮는다. (Swiss Ephemeris 실행 — report.real 테스트와 동일 방식.)
 */

const BASE = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('buildNatalContext — 기본 경로', () => {
  it('사주·점성·용신·강약·대운·지장간을 모두 채운다', async () => {
    const ctx = await buildNatalContext(BASE)

    // 사주 핵심
    expect(ctx.saju.pillars.day.heavenlyStem.name).toBeTruthy()
    expect(ctx.saju.dayMaster.name).toBe(ctx.saju.pillars.day.heavenlyStem.name)
    expect(ctx.saju.yongsin.primary).toBeTruthy()
    expect(Array.isArray(ctx.saju.yongsin.avoid)).toBe(true)
    expect(['strong', 'medium', 'weak']).toContain(ctx.saju.strength)
    expect(ctx.saju.daeun.length).toBeGreaterThan(0)
    expect(ctx.saju.analyses).toBeTruthy()

    // 본명 일지 지장간 3층 — 정기 항상 존재.
    expect(ctx.saju.dayJijanggan.jeonggi).toBeTruthy()

    // 오행 분포 합 > 0
    const sum = Object.values(ctx.saju.fiveElements).reduce((a, b) => a + b, 0)
    expect(sum).toBeGreaterThan(0)

    // 점성
    expect(ctx.astro.chart).toBeTruthy()
    expect(Array.isArray(ctx.astro.chart.planets)).toBe(true)
    expect(['day', 'night']).toContain(ctx.astro.sect)
    expect(ctx.astro.location.latitude).toBe(BASE.latitude)
    expect(Array.isArray(ctx.astro.natalAspects)).toBe(true)
    expect(ctx.astro.zodiacalReleasing).toBeTruthy()

    // 대운 startYear = 출생연도 + startAge
    for (const d of ctx.saju.daeun) {
      expect(d.startYear).toBe(1990 + d.startAge)
    }
  })

  it('input 이 입력 birthDate/Time 을 파싱해 채운다', async () => {
    const ctx = await buildNatalContext(BASE)
    expect(ctx.input.year).toBe(1990)
    expect(ctx.input.month).toBe(5)
    expect(ctx.input.date).toBe(15)
    expect(ctx.input.hour).toBe(14)
    expect(ctx.input.minute).toBe(30)
  })

  it('AM/PM 표기 birthTime 도 24h 로 정규화', async () => {
    const ctx = await buildNatalContext({ ...BASE, birthTime: '02:30 PM' })
    expect(ctx.input.hour).toBe(14)
    expect(ctx.input.minute).toBe(30)
  })

  it('geokguk 은 미정이 아니면 채워지고, 빈 값은 노출하지 않는다', async () => {
    const ctx = await buildNatalContext(BASE)
    // 정의돼 있으면 '미정' 이 아니어야 한다 (미정/예외 시 undefined).
    if (ctx.saju.geokguk !== undefined) {
      expect(ctx.saju.geokguk).not.toBe('미정')
      expect(typeof ctx.saju.geokguk).toBe('string')
    }
  })
})

describe('buildNatalContext — preComputed 재사용 분기', () => {
  it('preComputed.saju 를 넣으면 그 결과를 재사용한다', async () => {
    const saju = collectSajuFacts({
      birthDate: BASE.birthDate,
      birthTime: BASE.birthTime,
      gender: BASE.gender,
      timezone: BASE.timeZone,
      longitude: BASE.longitude,
    })._raw

    const fresh = await buildNatalContext(BASE)
    const reused = await buildNatalContext(BASE, { saju })

    // 같은 입력이므로 pillars 가 동일해야 한다 (재사용 경로 정합성).
    expect(reused.saju.pillars.day.heavenlyStem.name).toBe(fresh.saju.pillars.day.heavenlyStem.name)
    expect(reused.saju.pillars.year.earthlyBranch.name).toBe(
      fresh.saju.pillars.year.earthlyBranch.name
    )
  })

  it('preComputed.astroChart(이미 toChart 된 Chart)를 그대로 재사용', async () => {
    const fresh = await buildNatalContext(BASE)
    // fresh.astro.chart 는 planets[].sign 가 있는 Chart → 변환 없이 그대로 채택되는 분기.
    const reused = await buildNatalContext(BASE, { astroChart: fresh.astro.chart })
    expect(reused.astro.chart.planets.length).toBe(fresh.astro.chart.planets.length)
    // 동일 chart 객체를 채택 (planets[0].sign 존재 분기 통과).
    expect(reused.astro.chart.planets[0].sign).toBe(fresh.astro.chart.planets[0].sign)
  })
})

describe('buildNatalContext — 결정론', () => {
  it('같은 입력은 같은 일주 / 용신 / 강약을 낸다', async () => {
    const a = await buildNatalContext(BASE)
    const b = await buildNatalContext(BASE)
    expect(a.saju.pillars.day.heavenlyStem.name).toBe(b.saju.pillars.day.heavenlyStem.name)
    expect(a.saju.yongsin.primary).toBe(b.saju.yongsin.primary)
    expect(a.saju.strength).toBe(b.saju.strength)
  })
})
