import { describe, it, expect } from 'vitest'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { calculateSajuData } from '@/lib/saju/saju'
import { determineYongsin } from '@/lib/saju/yongsin'
import { determineGeokguk, evaluateHwagiGeokguk } from '@/lib/saju/geokguk'
import { analyzeRelations } from '@/lib/saju/relations'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/saju/shinsal'
import { calculateElementScores } from '@/lib/saju/strengthScore'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar, isPlaceDependentSignal } from '@/lib/calendar-engine'
import { buildReportContext } from '@/lib/report/buildReportContext'
import { natalToReportData } from '@/lib/report/integratedAdapter'
import { buildDestinyContext } from '@/lib/destiny/counselorContext'
import type { ActiveSignal } from '@/lib/calendar-engine/types'
import type { SajuPillars, PillarData } from '@/lib/saju/types'

/**
 * 시간 미상 = 삼주(년·월·일) 분석 — CONVENTIONS §5, OD-5, 엔진 감사 E7
 * (SAJU-4 · SD-10 · F15 · NatalAstroContext.placeUnreliable 미할당).
 *
 * 정오 앵커는 년·월·일주를 절입일에 고정하는 데만 쓴다. 강약·용신·격국·관계·신살·
 * 오행은 시주 없이 판정하므로, 미상 사용자가 보는 판정은 어떤 앵커 시각에도 같다.
 */

const NOW = new Date('2026-11-24T03:00:00Z')
const SEOUL = { timezone: 'Asia/Seoul', longitude: 126.978 }

function factsAt(birthTime: string, birthTimeUnknown: boolean) {
  return collectSajuFacts({
    birthDate: '1997-03-21',
    birthTime,
    birthTimeUnknown,
    gender: 'female',
    ...SEOUL,
    now: NOW,
  })
}

describe('collectSajuFacts — 시간 미상이면 삼주 판정 (SAJU-4, SD-10)', () => {
  const ANCHORS = ['00:30', '04:00', '12:00', '16:00', '20:00']

  it('pillars.time 은 null, timeUnknown=true, 오행 합은 6글자', () => {
    const f = factsAt('12:00', true)
    expect(f.timeUnknown).toBe(true)
    expect(f.pillars.time).toBeNull()
    const fe = f.fiveElements
    expect(fe.wood + fe.fire + fe.earth + fe.metal + fe.water).toBe(6)
    // 년·월·일주는 그대로 계산된다(1997-03-21 = 丁丑 癸卯 壬戌).
    expect(`${f.pillars.year.stem}${f.pillars.year.branch}`).toBe('丁丑')
    expect(`${f.pillars.month.stem}${f.pillars.month.branch}`).toBe('癸卯')
    expect(`${f.pillars.day.stem}${f.pillars.day.branch}`).toBe('壬戌')
  })

  it('강약·용신·격국·관계·오행·관살혼잡·통근은 앵커 시각과 무관 (00:30·04:00·12:00·16:00·20:00)', () => {
    const all = ANCHORS.map((t) => factsAt(t, true))
    const sig = (f: ReturnType<typeof factsAt>) =>
      JSON.stringify({
        strength: f.strength,
        yongsin: f.yongsin,
        geokguk: f.geokguk,
        relations: f.relations,
        fiveElements: f.fiveElements,
        gwansalHonjap: f.gwansalHonjap,
        rooted: f.dayMaster.rooted,
        gongmang: f.gongmang,
      })
    for (const f of all) expect(sig(f)).toBe(sig(all[0]))
  })

  it('시각을 알면 예전처럼 4주 — 시주가 판정을 바꿀 수 있다(대조군)', () => {
    const known = ANCHORS.map((t) => factsAt(t, false))
    for (const f of known) {
      expect(f.timeUnknown).toBe(false)
      expect(f.pillars.time).not.toBeNull()
      const fe = f.fiveElements
      expect(fe.wood + fe.fire + fe.earth + fe.metal + fe.water).toBe(8)
    }
    // 감사 재현: 같은 날이라도 시주에 따라 강약/용신이 갈린다 — 그래서 미상엔 시주를 뺀다.
    const verdicts = new Set(known.map((f) => `${f.strength}|${f.yongsin?.primaryYongsin}`))
    expect(verdicts.size).toBeGreaterThan(1)
  })

  it('관계·신살 hit 에 시주(time)가 나오지 않는다', () => {
    const f = factsAt('12:00', true)
    for (const r of f.relations) expect(r.pillars ?? []).not.toContain('time')
  })
})

describe('빈 시각 = 정오 앵커 + 미상 (F15)', () => {
  it("calculateSajuData('1988-07-07', '') 의 월주는 '12:00' 과 같은 己未 (예전 00:00 앵커는 戊午)", () => {
    const blank = calculateSajuData(
      '1988-07-07',
      '',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      126.978,
      NOW
    )
    const noon = calculateSajuData(
      '1988-07-07',
      '12:00',
      'male',
      'solar',
      'Asia/Seoul',
      false,
      126.978,
      NOW
    )
    const gz = (p: PillarData) => `${p.heavenlyStem.name}${p.earthlyBranch.name}`
    expect(gz(blank.monthPillar)).toBe('己未')
    expect(gz(blank.monthPillar)).toBe(gz(noon.monthPillar))
    expect(gz(blank.yearPillar)).toBe(gz(noon.yearPillar))
    expect(gz(blank.dayPillar)).toBe(gz(noon.dayPillar))
    // 빈 시각은 미상 — 오행은 6글자, 결과에 timeUnknown 표시.
    expect(blank.timeUnknown).toBe(true)
    expect(noon.timeUnknown).toBeUndefined()
  })

  it("collectSajuFacts({ birthTime: '' }) 의 년·월·일주 = '12:00' 미상과 동일", () => {
    const base = { birthDate: '1988-07-07', gender: 'male' as const, ...SEOUL, now: NOW }
    const blank = collectSajuFacts({ ...base, birthTime: '' })
    const noonUnknown = collectSajuFacts({ ...base, birthTime: '12:00', birthTimeUnknown: true })
    expect(blank.timeUnknown).toBe(true)
    expect(blank.pillars.time).toBeNull()
    expect(blank.pillars.month).toEqual(noonUnknown.pillars.month)
    expect(blank.pillars.year).toEqual(noonUnknown.pillars.year)
    expect(blank.pillars.day).toEqual(noonUnknown.pillars.day)
    expect(blank.pillars.month.stem + blank.pillars.month.branch).toBe('己未')
    expect(blank.strength).toBe(noonUnknown.strength)
    expect(blank.yongsin).toEqual(noonUnknown.yongsin)
  })
})

describe('엔진 — 시주 null 입력을 삼주로 처리', () => {
  const three = {
    year: { stem: '丁', branch: '丑' },
    month: { stem: '癸', branch: '卯' },
    day: { stem: '壬', branch: '戌' },
    time: null,
  }

  it('용신·격국은 시주 null 이면 어떤 시주와도 무관한 값', () => {
    const y = determineYongsin(three)
    const g = determineGeokguk(three)
    expect(y.primaryYongsin).toBeTruthy()
    expect(g.primary).toBeTruthy()
    // 같은 삼주에 어떤 시주를 붙이든, 시주 null 결과는 하나로 고정된다.
    expect(determineYongsin({ ...three })).toEqual(y)
  })

  it('화기격국 — 시간(時干)이 없으면 인접 합 상대는 월간만 본다', () => {
    // 일간 丁 + 시간 壬 이면 인접 합이지만, 시주 미상이면 시간이 없다.
    const withHour = {
      year: { stem: '甲', branch: '寅' },
      month: { stem: '甲', branch: '寅' },
      day: { stem: '丁', branch: '卯' },
      time: { stem: '壬', branch: '寅' },
    }
    expect(evaluateHwagiGeokguk(withHour).conditions.adjacentPartner).toBe(true)
    expect(evaluateHwagiGeokguk({ ...withHour, time: null }).conditions.hasHap).toBe(false)
  })

  it('관계·신살·12운성은 time 키를 만들지 않는다', () => {
    const rel = analyzeRelations({
      pillars: {
        year: { heavenlyStem: '丁', earthlyBranch: '丑' },
        month: { heavenlyStem: '癸', earthlyBranch: '卯' },
        day: { heavenlyStem: '壬', earthlyBranch: '戌' },
        time: null,
      },
    })
    for (const r of rel) expect(r.pillars).not.toContain('time')

    const el = (n: string) => ({ name: n, element: '목' as const })
    const like = toSajuPillarsLike({
      yearPillar: { heavenlyStem: el('丁'), earthlyBranch: el('丑') },
      monthPillar: { heavenlyStem: el('癸'), earthlyBranch: el('卯') },
      dayPillar: { heavenlyStem: el('壬'), earthlyBranch: el('戌') },
      timePillar: null,
    })
    expect(like.time).toBeNull()
    for (const h of getShinsalHits(like)) expect(h.pillars).not.toContain('time')
    const stages = getTwelveStagesForPillars(like)
    expect(stages.time).toBeUndefined()
    expect(stages.day).toBeTruthy()
  })

  it('오행 점수 위치 가중은 있는 기둥 합(0.80)으로 재정규화된다', () => {
    const pd = (stem: string, branch: string): PillarData =>
      ({
        heavenlyStem: { name: stem, element: '목', yin_yang: '양', sibsin: '' },
        earthlyBranch: { name: branch, element: '목', yin_yang: '양', sibsin: '' },
        jijanggan: {},
      }) as PillarData
    const p = pd('甲', '寅')
    const full: SajuPillars = { year: p, month: p, day: p, time: p }
    // 네 기둥이 같으면 4주 합과 삼주(÷0.80) 합이 같아야 한다 — 가중 합이 둘 다 1.0.
    const a = calculateElementScores(full)
    const b = calculateElementScores({ year: p, month: p, day: p, time: null })
    for (let i = 0; i < 5; i++) {
      expect(b[i].raw).toBeCloseTo(a[i].raw, 9)
      expect(b[i].ratio).toBeCloseTo(a[i].ratio, 9)
    }
  })
})

describe('캘린더 — 시간 미상 본명은 ASC·하우스 의존 신호를 내지 않는다 (placeUnreliable)', () => {
  const INPUT = {
    birthDate: '1997-03-21',
    birthTime: '12:00',
    gender: 'female' as const,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }
  const RANGE = {
    start: '2026-06-01T00:00:00.000Z',
    end: '2026-06-30T23:59:59.000Z',
    granularity: 'day' as const,
  }
  const PLACE_KINDS = ['house-transit', 'angle-contact', 'profection', 'zodiacal-releasing']
  const ANGLES = ['Ascendant', 'ASC', 'MC']
  const flat = (cells: Array<{ signals: ActiveSignal[] }>) => cells.flatMap((c) => c.signals)

  it('미상 본명: 삼주 컨텍스트 + placeUnreliable, 하우스·프로펙션·ZR·앵글 신호 0', async () => {
    const natal = await buildNatalContext({ ...INPUT, birthTimeUnknown: true })
    expect(natal.saju.timeUnknown).toBe(true)
    expect(natal.saju.pillars.time).toBeUndefined()
    const fe = natal.saju.fiveElements
    expect(fe.wood + fe.fire + fe.earth + fe.metal + fe.water).toBe(6)
    expect(natal.astro.placeUnreliable).toBe(true)
    expect(natal.astro.lots).toEqual([])
    expect(natal.astro.zodiacalReleasing).toEqual({ spirit: null, fortune: null })
    for (const h of natal.saju.natalShinsal) expect(h.pillars).not.toContain('time')
    for (const r of natal.saju.natalRelations) expect(r.pillars).not.toContain('time')

    const signals = flat(await buildCalendar(natal, RANGE, { includeEvidence: false }))
    expect(signals.length).toBeGreaterThan(0)
    expect(signals.filter((s) => PLACE_KINDS.includes(s.kind))).toEqual([])
    expect(
      signals.filter((s) => (s.evidence.planets ?? []).some((p) => ANGLES.includes(p)))
    ).toEqual([])
    expect(signals.filter(isPlaceDependentSignal)).toEqual([])
  }, 120_000)

  it('대조군 — 시각을 알면 하우스 통과·프로펙션 신호가 나온다', async () => {
    const natal = await buildNatalContext(INPUT)
    expect(natal.saju.timeUnknown).toBeUndefined()
    expect(natal.astro.placeUnreliable).toBeUndefined()
    const kinds = new Set(
      flat(await buildCalendar(natal, RANGE, { includeEvidence: false })).map((s) => s.kind)
    )
    expect(kinds.has('house-transit')).toBe(true)
    expect(kinds.has('profection')).toBe(true)
  }, 120_000)
})

describe('통합 리포트 — 시간 미상이면 삼주 ctx + 시주 칸 "?"', () => {
  it('ctx.saju 에 시주가 없고 오행 6글자, 신살·관계에 time 없음, 리포트 時 칸은 ?', async () => {
    const ctx = (await buildReportContext({
      birthDate: '1997-03-21',
      birthTime: '12:00',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
      birthTimeUnknown: true,
    })) as unknown as {
      saju: {
        pillars: Record<string, unknown>
        fiveElements: Record<string, number>
        natalShinsal: Array<{ pillars: string[] }>
        natalRelations: Array<{ pillars: string[] }>
        twelveStages: Record<string, string>
      }
      astro: { placeUnreliable?: boolean }
      input: Record<string, unknown>
    }
    expect(ctx.saju.pillars.time).toBeUndefined()
    expect(Object.values(ctx.saju.fiveElements).reduce((a, b) => a + b, 0)).toBe(6)
    for (const h of ctx.saju.natalShinsal) expect(h.pillars).not.toContain('time')
    for (const r of ctx.saju.natalRelations) expect(r.pillars).not.toContain('time')
    expect(ctx.saju.twelveStages.time).toBeUndefined()
    expect(ctx.astro.placeUnreliable).toBe(true)

    ctx.input = { ...ctx.input, birthTimeUnknown: true }
    const rd = natalToReportData(ctx as never)
    expect(rd.saju.pillars.hour.stem).toBe('?')
    expect(rd.saju.pillars.hour.branch).toBe('?')
    expect(rd.saju.pillars.day.stem).toBe('壬')
  }, 60_000)
})

describe('운명상담사 컨텍스트 — 시간 미상이면 시주를 쓰지 않는다', () => {
  const BIRTH = {
    birthDate: '1997-03-21',
    birthTime: '12:00',
    gender: 'female' as const,
    timezone: 'Asia/Seoul',
    latitude: 37.5665,
    longitude: 126.978,
  }
  const SAJU_ONLY = { saju: true, astro: false }

  it('기둥 목록에 시 미상 표시, 정오 앵커 시주(丙午)와 시 12운성이 없다', async () => {
    const { stable } = await buildDestinyContext(
      { ...BIRTH, birthTimeUnknown: true },
      NOW,
      'ko',
      undefined,
      SAJU_ONLY
    )
    expect(stable).toContain('시 미상 (삼주 분석)')
    // 정오 앵커 시주(丙午)를 기둥으로 싣지 않는다 (2026 세운 丙午 와 구분해 기둥 줄만 본다).
    expect(stable).not.toMatch(/^\s+시 丙午/m)
    expect(stable).toMatch(/오행: 木\d 火\d 土\d 金\d 水\d/)
    const fe = stable.match(/오행: 木(\d) 火(\d) 土(\d) 金(\d) 水(\d)/)!
    expect(fe.slice(1).reduce((a, b) => a + Number(b), 0)).toBe(6)
    const stagesLine = stable.split('\n').find((l) => l.startsWith('12운성')) ?? ''
    expect(stagesLine).not.toMatch(/·시/)
  })

  it('EN 도 같은 규칙 — hour pillar marked unknown', async () => {
    const { stable } = await buildDestinyContext(
      { ...BIRTH, birthTimeUnknown: true },
      NOW,
      'en',
      undefined,
      SAJU_ONLY
    )
    expect(stable).toContain('H unknown (three-pillar reading)')
    expect(stable).not.toMatch(/^\s+H 丙午/m)
  })
})
