/**
 * monthViewModel — v9.2 Monthly 탭 화면 데이터. 디자인 샘플 모양(_v9Month)으로 규칙을 본다:
 * 카운트 11/4/4/11(verdict · Calm), 지난 날 d < 19 · 오늘 19, BEST 24, 축 눈금, 그리드·범례,
 * 큰 날(마크 라벨), 섹션 제목, 해 볼 것(avoid-first), 오늘·사다리 출처, 미성년, 결정론.
 * MonthTier 의 동작 가드(톤 권위 #2·#3·#11 → 마크 라벨, 최고의 날 덧붙임, 재탭 줌인)를 이식한다.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildMonthViewModel,
  pickAxisTicks,
  gridTapIntent,
} from '@/lib/calendar-view/monthViewModel'
import { toLadderRows } from '@/lib/calendar-view/dayViewModel'
import { makeV9Month, makeV9Day, dayRungs, TODAY } from './_v9Month'

const HANGUL = /[ㄱ-ㆎ가-힣]/

describe('buildMonthViewModel — 카운트·히어로·읽기', () => {
  it('카운트 = verdict(좋음 11 · 조심 4 · 피함 4 · 잔잔 11), 엔진의 중립 단어는 Calm', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.counts).toEqual({ good: 11, caution: 4, avoid: 4, calm: 11 })
    expect(vm.legend.find((l) => l.key === 'calm')?.label).toBe('Calm')
    expect(vm.hero.countsLine).toBe('11 days flow · 8 to ease off')
  })

  it("한 달 읽기 = 톤 단어 + ' · toward ' + 월운 십신 영역", () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.hero.tone).toBe('volatile')
    expect(vm.read.line).toBe('A mixed month · toward duty & standing')
    const ko = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'ko' })
    expect(ko.read.line).toBe('기복 있는 달 · 일·책임 쪽으로')
    expect(ko.hero.countsLine).toBe('일이 잘 풀리는 날 11일 · 한 박자 쉬어갈 날 8일')
  })

  it('히어로 후크 = monthShareHook(verdict.shareTone, 시드, 월) — 비어 있지 않은 헤드라인', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.hero.headline.length).toBeGreaterThan(0)
    expect(vm.monthLabel).toBe('November 2026')
  })
})

describe('buildMonthViewModel — 막대·그리드·범례', () => {
  it('막대: 지난 날 = d < 19, 오늘 = 19 하나, 큰 날 5·9·14·17·24·29, 19일 포커스 마크는 calm', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.bars).toHaveLength(30)
    expect(vm.bars.filter((b) => b.past).map((b) => b.d)).toEqual(
      Array.from({ length: TODAY - 1 }, (_, i) => i + 1)
    )
    expect(vm.bars.filter((b) => b.isToday).map((b) => b.d)).toEqual([19])
    expect(vm.bars.filter((b) => b.keyDay).map((b) => b.d)).toEqual([5, 9, 14, 17, 24, 29])
    expect(vm.bars[18].mark).toBe('calm')
    expect(vm.bars[23].mark).toBe('best')
    expect(vm.bars[23].height).toBeCloseTo(57 / 72)
  })

  it('BEST 표지는 24, 축 눈금 1 · 8 · 15 · 오늘 19 · 최고 24 · 마지막 30', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.bestAnnotation).toEqual({ d: 24, label: 'BEST · 24' })
    expect(vm.axisTicks).toEqual([
      { d: 1, today: false, best: false },
      { d: 8, today: false, best: false },
      { d: 15, today: false, best: false },
      { d: 19, today: true, best: false },
      { d: 24, today: false, best: true },
      { d: 30, today: false, best: false },
    ])
  })

  it('축 눈금은 이웃 칸(하루 차이)에 두 개를 두지 않는다 — 오늘 > 최고 > 1·8·15·끝(QA VC-6)', () => {
    // 오늘 25 · 최고 24 — 최고 눈금은 빠진다('BEST · 24' 상자가 이름한다).
    expect(pickAxisTicks({ lastDay: 30, today: 25, best: 24 })).toEqual([1, 8, 15, 25, 30])
    // 오늘 2 → 1 이 빠진다. 오늘 14 → 15 가 빠진다. 오늘 29 → 30 이 빠진다.
    expect(pickAxisTicks({ lastDay: 30, today: 2, best: 24 })).toEqual([2, 8, 15, 24, 30])
    expect(pickAxisTicks({ lastDay: 30, today: 14, best: 24 })).toEqual([1, 8, 14, 24, 30])
    expect(pickAxisTicks({ lastDay: 30, today: 29, best: 24 })).toEqual([1, 8, 15, 24, 29])
    // 최고 16 → 15 가 빠진다(최고가 1·8·15 보다 앞선다).
    expect(pickAxisTicks({ lastDay: 30, today: 0, best: 16 })).toEqual([1, 8, 16, 30])
    // Nov 2026(최고 24)에서 오늘이 어느 날이든 이웃 눈금이 없다.
    for (let t = 1; t <= 30; t++) {
      const ticks = pickAxisTicks({ lastDay: 30, today: t, best: 24 })
      expect(ticks).toContain(t)
      for (let i = 1; i < ticks.length; i++) expect(ticks[i] - ticks[i - 1]).toBeGreaterThan(1)
    }
  })

  it('그리드: 1일 앞 빈칸(2026-11-01 일요일 = 0), 요일 머리, 최고의 날 표지', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.grid.offset).toBe(0)
    expect(vm.grid.weekdays).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
    expect(vm.grid.cells.filter((c) => c.best).map((c) => c.d)).toEqual([24])
    const ko = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'ko' })
    expect(ko.grid.weekdays[0]).toBe('일')
  })

  it('범례 8개 — Good · Best · Caution · Avoid · Calm · Key day · Today · Past', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.legend.map((l) => l.label)).toEqual([
      'Good',
      'Best',
      'Caution',
      'Avoid',
      'Calm',
      'Key day',
      'Today',
      'Past',
    ])
  })
})

describe('buildMonthViewModel — 큰 날·제목·해 볼 것', () => {
  it('큰 날 = 마크 라벨(톤 권위 가드 재지정): 17 그리드 avoid → Avoid, 19 이전만 past', () => {
    const month = makeV9Month()
    // 화해 톤이 마크와 반대여도(#2·#3) 라벨은 그리드 마크.
    month.calendar[16].tone = 'positive'
    month.calendar[8].tone = 'caution'
    const vm = buildMonthViewModel(month, makeV9Day(), { lang: 'en' })
    expect(vm.keyDays.map((k) => `${k.d} ${k.verdict}`)).toEqual([
      '5 Calm day',
      '9 Good day',
      '14 Caution',
      '17 Avoid',
      '24 Best day',
      '29 Avoid',
    ])
    expect(vm.keyDays.filter((k) => k.past).map((k) => k.d)).toEqual([5, 9, 14, 17])
  })

  it('#11 — EN 큰 날 행에 서버(ko) meaning 이 새지 않는다', () => {
    const month = makeV9Month({
      keyDays: [
        {
          date: '11-09',
          meaning: '먼저 움직이면 이기는 날',
          tone: 'positive',
          astro: [],
          saju: [],
          bothSystems: true,
        },
      ],
    })
    const vm = buildMonthViewModel(month, makeV9Day(), { lang: 'en' })
    for (const k of vm.keyDays) expect(HANGUL.test(`${k.verdict} ${k.meaning}`)).toBe(false)
  })

  it('최고의 날이 수렴 큰 날에 없으면 덧붙인다 — 제목은 "Six key days. The 24th is the best."', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.keyDays.some((k) => k.ds === '11-24' && k.verdict === 'Best day')).toBe(true)
    expect(vm.h2).toEqual({ lead: 'Six key days.', best: 'The 24th is the best.' })
    const ko = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'ko' })
    expect(ko.h2).toEqual({ lead: '큰 날 6일.', best: '24일이 가장 좋아요.' })
  })

  it('최고의 날이 없으면 둘째 절을 숨긴다', () => {
    const month = makeV9Month({ bestDay: { date: '', score: 0 } })
    const vm = buildMonthViewModel(month, makeV9Day(), { lang: 'en' })
    expect(vm.h2.best).toBe('')
    expect(vm.bestAnnotation).toBeNull()
    expect(vm.h2.lead).toBe('Five key days.')
  })

  it("큰 날이 하나도 없는 달은 머리말이 비어 있다 — 'Zero key days.' 아님(QA CODE-8)", () => {
    const month = makeV9Month({ keyDays: [], bestDay: { date: '', score: 0 } })
    for (const lang of ['en', 'ko'] as const) {
      const vm = buildMonthViewModel(month, makeV9Day(), { lang })
      expect(vm.keyDays).toEqual([])
      expect(vm.h2).toEqual({ lead: '', best: '' })
    }
  })

  it('해 볼 것 — PUSH 24(최고의 날), HOLD 29(avoid-first, 지난 날 제외)', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.tryThis.push).toEqual({
      ds: '11-24',
      label: 'Nov 24',
      note: 'Push waiting tasks around your best day.',
    })
    expect(vm.tryThis.hold).toEqual({
      ds: '11-29',
      label: 'Nov 29',
      note: 'Hold big decisions and moves near this day.',
    })
    expect(vm.cta.question).toBe('What should I push on Nov 24, and what should I watch on Nov 29?')
  })
})

describe('buildMonthViewModel — 오늘·사다리', () => {
  it('이번 달 + 오늘의 일 티어 → 오늘 단면과 4칸 사다리(focusDayCell)', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.ladderSource).toBe('day')
    expect(vm.ladder).toEqual(toLadderRows(dayRungs('en'), 'en'))
    expect(vm.ladder[0].range).toBe('2021–2030')
    expect(vm.today).toMatchObject({
      iso: '2026-11-19',
      label: 'Today · Thursday',
      dateLabel: '2026.11.19',
      toneWord: 'A steady day',
      reason: { saju: { hanja: '正官', text: 'Direct Officer' }, mark: 'up' },
    })
    expect(vm.ladderCaption).toMatch(/^Each scale has its own driver/)
  })

  it('다른 달(오늘 없음) → month.evidenceLadder(15일 대표 셀), 오늘 단면 없음, 지난/오늘 없음', () => {
    const month = makeV9Month({ todayDay: undefined })
    month.calendar = month.calendar.map(({ isToday: _t, past: _p, ...c }) => c)
    const vm = buildMonthViewModel(month, null, { lang: 'en' })
    expect(vm.ladderSource).toBe('month')
    expect(vm.ladder.map((r) => r.scale)).toEqual(['monthly'])
    expect(vm.today).toBeNull()
    expect(vm.bars.some((b) => b.isToday)).toBe(false)
    expect(vm.bars.some((b) => b.past)).toBe(false)
  })

  it('구 캐시(표지 없음) — nowIso 가 이 달이면 그 날을 기준일로', () => {
    const month = makeV9Month({ todayDay: undefined })
    month.calendar = month.calendar.map(({ isToday: _t, past: _p, ...c }) => c)
    const vm = buildMonthViewModel(month, makeV9Day(), {
      lang: 'en',
      nowIso: '2026-11-19T03:00:00.000Z',
    })
    expect(vm.bars.filter((b) => b.isToday).map((b) => b.d)).toEqual([19])
    expect(vm.bars.filter((b) => b.past)).toHaveLength(18)
    expect(vm.ladderSource).toBe('day')
  })

  it('일 티어가 오늘이 아닌 날이면 4칸 사다리를 쓰지 않는다', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day({ date: '2026-11-24' }), { lang: 'en' })
    expect(vm.ladderSource).toBe('month')
    expect(vm.today).toBeNull()
  })
})

describe('buildMonthViewModel — 미성년·로케일·결정론', () => {
  it('미성년 — 화면 문구 정화(오늘 근거의 성인 도메인 → 연령 적합)', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day({ isMinor: true }), { lang: 'en' })
    expect(vm.today?.reason?.note).toBe(
      'Good for recognition from teachers and grown-ups, and the stage'
    )
    const adult = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en', isMinor: false })
    expect(adult.today?.reason?.note).toMatch(/promotion/)
  })

  it('EN 뷰모델에 한글이 없다', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(HANGUL.test(JSON.stringify(vm))).toBe(false)
  })

  describe('결정론', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('같은 입력·같은 nowIso → 깊은 동일, 시스템 시계를 바꿔도 같다', () => {
      const nowIso = '2026-11-19T03:00:00.000Z'
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2031-01-01T00:00:00Z'))
      const a = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en', nowIso })
      vi.setSystemTime(new Date('2019-06-30T12:00:00Z'))
      const b = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en', nowIso })
      expect(a).toEqual(b)
    })

    it('grep 가드 — src/lib/calendar-view 에 시계 읽기(new Date() · Date.now())가 없다', () => {
      const dir = path.resolve(__dirname, '../../../src/lib/calendar-view')
      const offenders: string[] = []
      for (const f of readdirSync(dir)) {
        if (!/\.tsx?$/.test(f)) continue
        const src = readFileSync(path.join(dir, f), 'utf-8')
        if (/new Date\(\s*\)|Date\.now\(\s*\)/.test(src)) offenders.push(f)
      }
      expect(offenders).toEqual([])
    })
  })
})

describe('gridTapIntent — 재탭 줌인(MonthTier 동작 이식)', () => {
  it('이미 선택된 날을 다시 누르면 dive, 다른 날은 select', () => {
    expect(gridTapIntent(20, 20)).toBe('dive')
    expect(gridTapIntent(19, 20)).toBe('select')
  })
})

describe('buildMonthViewModel — 고른 날 읽기 · 큰 날 라벨 · 공유 재료 (A7)', () => {
  it('그리드 칸의 읽기 = 큰 날 행과 같은 말(그리드 마크 판정 · 엔진 한 줄 · 왜 행)', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    for (const k of vm.keyDays) {
      const cell = vm.grid.cells.find((c) => c.ds === k.ds)
      expect(cell?.read.verdict, k.ds).toBe(k.verdict)
      expect(cell?.read.meaning, k.ds).toBe(k.meaning)
      expect(cell?.read.why, k.ds).toEqual(k.why)
    }
    const c17 = vm.grid.cells.find((c) => c.d === 17)
    expect(c17?.read.label).toBe('Nov 17 · Tue')
    expect(c17?.read.why?.mark).toBe('down')
    // 근거가 없는 날은 왜 행 없음, 오늘(포커스 마크)은 잔잔.
    expect(vm.grid.cells.find((c) => c.d === 3)?.read.why).toBeNull()
    expect(vm.grid.cells.find((c) => c.d === 19)?.read.verdict).toBe('Calm day')
    const ko = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'ko' })
    expect(ko.grid.cells.find((c) => c.d === 17)?.read.label).toBe('11월 17일 · 화')
  })

  it("큰 날 행 날짜 라벨 — 'Nov 5' / '11월 5일'", () => {
    const en = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(en.keyDays.map((k) => k.label)).toEqual([
      'Nov 5',
      'Nov 9',
      'Nov 14',
      'Nov 17',
      'Nov 24',
      'Nov 29',
    ])
    const ko = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'ko' })
    expect(ko.keyDays[0].label).toBe('11월 5일')
  })

  it('공유 재료 — 이달 라벨 · 후크 · 큰 날 최대 5줄 · 곡선 0..100 · 오늘 자리', () => {
    const vm = buildMonthViewModel(makeV9Month(), makeV9Day(), { lang: 'en' })
    expect(vm.share.periodLabel).toBe('November 2026')
    expect(vm.share.headline).toBe(vm.hero.headline)
    expect(vm.share.highlights).toEqual([
      'Nov 5 · Calm day',
      'Nov 9 · Good day',
      'Nov 14 · Caution',
      'Nov 17 · Avoid',
      'Nov 24 · Best day',
    ])
    expect(vm.share.curve).toHaveLength(30)
    expect(vm.share.curve[23]).toBe(Math.round((57 / 72) * 100))
    expect(vm.share.markerIndex).toBe(18)
    // 다른 달 — 오늘 자리 없음.
    const other = buildMonthViewModel(
      makeV9Month({
        todayDay: undefined,
        calendar: makeV9Month().calendar.map(({ isToday: _i, past: _p, ...c }) => c),
      }),
      null,
      { lang: 'en', nowIso: '2026-12-02T03:00:00.000Z' }
    )
    expect(other.share.markerIndex).toBeUndefined()
  })
})
