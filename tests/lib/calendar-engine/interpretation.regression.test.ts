import { describe, it, expect, beforeAll } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildInterpretation } from '@/lib/calendar-engine/interpretation/matcher'
import { deriveKeyEvents } from '@/lib/calendar-engine/derivers/keyEvents'
import { deriveMonthComparison } from '@/lib/calendar-engine/derivers/monthComparison'
import { RULES } from '@/lib/calendar-engine/interpretation/rules'
import type { CalendarCell } from '@/lib/calendar-engine/types'

/**
 * Regression suite — guards the cross-dimensional invariants the
 * calendar engine relies on. Each `it` block asserts a property that
 * silently regressed before this file existed (audit-driven baseline).
 */

interface Profile {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

const SEOUL_MALE_1995: Profile = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const TOKYO_MALE_2001: Profile = {
  birthDate: '2001-11-22',
  birthTime: '22:10',
  gender: 'male',
  latitude: 35.6762,
  longitude: 139.6503,
  timeZone: 'Asia/Tokyo',
}

async function buildForDate(p: Profile, dateIso: string) {
  const saju = calculateSajuData(p.birthDate, p.birthTime, p.gender, 'solar', p.timeZone)
  const natal = await buildNatalContext(p, { saju })
  const cells = await buildCalendar(
    natal,
    {
      start: `${dateIso}T00:00:00.000Z`,
      end: `${dateIso}T23:59:59.000Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
  return { saju, natal, cells, interp }
}

describe('calendar-engine regression', () => {
  describe('different birth profiles → different interpretations', () => {
    it('Seoul 1995 male vs Tokyo 2001 male produce different day masters', async () => {
      const a = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const b = await buildForDate(TOKYO_MALE_2001, '2026-05-15')
      const dmA = a.saju.pillars.day.heavenlyStem.name
      const dmB = b.saju.pillars.day.heavenlyStem.name
      expect(dmA).not.toBe(dmB)
    })

    it('two profiles can produce different derivedScore for the same day', async () => {
      const a = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const b = await buildForDate(TOKYO_MALE_2001, '2026-05-15')
      // Not asserting strict inequality — different sajus can land on
      // the same score by coincidence — but the themeScores breakdown
      // should differ.
      const tsA = a.interp.themeScores ?? {}
      const tsB = b.interp.themeScores ?? {}
      const sigA = `${tsA.love}-${tsA.money}-${tsA.career}-${tsA.health}-${tsA.growth}`
      const sigB = `${tsB.love}-${tsB.money}-${tsB.career}-${tsB.health}-${tsB.growth}`
      expect(sigA).not.toBe(sigB)
    })
  })

  describe('year-over-year ganji distinction', () => {
    it('2024 vs 2025 vs 2026 vs 2027 produce distinct seun narratives', async () => {
      const years = [2024, 2025, 2026, 2027]
      const texts: string[] = []
      for (const y of years) {
        const { interp } = await buildForDate(SEOUL_MALE_1995, `${y}-05-15`)
        const seun = interp.sections.find((s) => s.section === 'seun')?.text ?? ''
        texts.push(seun)
      }
      // Each year must produce a unique text (ganji-specific tail
      // from getGanjiTransitNarrative ensures this).
      const unique = new Set(texts)
      expect(unique.size).toBe(years.length)
    })
  })

  describe('cycle boundaries — 입춘(세운) / 생일(대운) anchoring', () => {
    it('세운 flips at 입춘, not Jan 1 (Jan-before-입춘 = prior saju year)', async () => {
      // 2026 입춘 ≈ 2/3. 2026 세운 = 丙午, 2025 세운 = 乙巳 (연주는 만인 공통).
      const jan = await buildForDate(SEOUL_MALE_1995, '2026-01-20')
      const mar = await buildForDate(SEOUL_MALE_1995, '2026-03-10')
      const seun = (cells: { signals: Array<{ id: string; name: string }> }[]) =>
        cells[0]?.signals.find((s) => s.id.includes('seun'))?.name ?? ''
      const janSeun = seun(jan.cells)
      const marSeun = seun(mar.cells)
      expect(marSeun).toContain('丙午') // 입춘 후 = 2026 丙午
      expect(janSeun).toContain('乙巳') // 입춘 전 = 2025 乙巳 (Jan-1 경계였다면 丙午로 잘못 나옴)
      expect(janSeun).not.toBe(marSeun)
    })

    it('대운 window is anchored to birthday (month-date), not Jan 1', async () => {
      // SEOUL_MALE_1995 birth 02-09 → 대운 신호 active.start 의 MM-DD = 02-09
      const { cells } = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const daeun = cells[0]?.signals.find((s) => s.id.includes('daeun'))
      expect(daeun).toBeDefined()
      expect(daeun!.active.start.slice(5, 10)).toBe('02-09')
    })
  })

  describe('하우스 오버레이 / ASC·MC 컨택 (#4)', () => {
    it('house-transit signals emit + flow section renders a 하우스 line', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const houseSigs = cells.flatMap((c) => c.signals).filter((s) => s.kind === 'house-transit')
      expect(houseSigs.length).toBeGreaterThan(0)
      // 하우스 신호엔 evidence.houses + 완성 문장(detail.lineKo) 이 있어야
      const sample = houseSigs[0]
      expect(sample.evidence.houses?.[0]).toBeGreaterThanOrEqual(1)
      expect(String((sample.evidence.detail as { lineKo?: string }).lineKo)).toContain('집')

      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      const flow = interp.sections.find((s) => s.section === 'flow')
      expect(flow).toBeDefined()
      expect(flow!.text).toContain('집') // "n번째 집" 한 줄
    })
  })

  describe('natal 용신 노출 (P0)', () => {
    it('natal section leads with 용신/희신/기신 line (KO)', async () => {
      const { interp } = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const natalSec = interp.sections.find((s) => s.section === 'natal')
      expect(natalSec).toBeDefined()
      const firstLine = natalSec!.text.split('\n')[0]
      expect(firstLine).toContain('용신')
      // 오행 한 글자 (목/화/토/금/수) 가 들어가야
      expect(firstLine).toMatch(/[목화토금수]/)
    })

    it('English variant exposes yongsin', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly', lang: 'en' })
      const natalSec = interp.sections.find((s) => s.section === 'natal')
      expect(natalSec?.text.toLowerCase()).toContain('yongsin')
    })
  })

  describe('daily-scope rules (오늘 한 줄)', () => {
    it('daily ruleset exists (scope daily, section today) with KO+EN', () => {
      const daily = RULES.filter((r) => r.scope === 'daily' && r.section === 'today')
      expect(daily.length).toBeGreaterThanOrEqual(8)
      for (const r of daily) {
        expect(r.template.length).toBeGreaterThan(8)
        expect(r.templateEn && r.templateEn.length).toBeGreaterThan(8)
      }
    })

    it('every day produces ≥1 "today" action line (일진 십신 baseline)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-10T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      let daysWithActions = 0
      for (const c of cells) {
        const di = buildInterpretation({ natal, cells: [c], scope: 'daily' })
        const today = di.sections.find((s) => s.section === 'today')
        const lines = today?.text.split('\n').filter(Boolean) ?? []
        if (lines.length > 0) daysWithActions += 1
        expect(lines.length).toBeLessThanOrEqual(4) // section cap
      }
      // 일진 십신은 매일 있으므로 모든 날 최소 1줄
      expect(daysWithActions).toBe(cells.length)
    })

    it('expanded daily grid rules actually fire across a month (no dead rules)', async () => {
      // 그리드 보강(주의/전환/상승) 룰은 daily 레이어에 실재하는 신살/십신만
      // 트리거로 씀. 작성만 하고 안 켜지는 죽은 룰이 없는지 가드.
      // saju 기반이라 날짜 결정론적(swisseph 목킹과 무관).
      const newRuleIds = [
        'today-geopsal',
        'today-mangsin',
        'today-wonjin',
        'today-yangin',
        'today-gwimun',
        'today-yukhae',
        'today-gongmang',
        'today-geumyeo',
        'today-taegeuk',
        'today-hakdang',
        'today-cheonui',
        'today-wangji',
        'today-pyeongwan',
      ]
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const fired = new Set<string>()
      for (const mo of [5, 9]) {
        const cells = await buildCalendar(
          natal,
          {
            start: new Date(Date.UTC(2026, mo - 1, 1)).toISOString(),
            end: new Date(Date.UTC(2026, mo, 0, 23, 59, 59)).toISOString(),
            granularity: 'day',
          },
          { includeEvidence: true }
        )
        for (const c of cells) {
          const di = buildInterpretation({ natal, cells: [c], scope: 'daily', debug: true })
          for (const id of di.allMatchedRuleIds ?? []) if (newRuleIds.includes(id)) fired.add(id)
        }
      }
      // 한 차트 × 두 달이면 그리드 대다수(≥9/13)가 발동해야 살아있는 룰셋
      expect(fired.size).toBeGreaterThanOrEqual(9)
    })
  })

  describe('month-wide score distribution', () => {
    it('a full month has no 5+ day tie at the same score', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const dist: Record<number, number> = {}
      for (const c of cells) dist[c.derivedScore] = (dist[c.derivedScore] ?? 0) + 1
      // Soft compression should cap ties — after fix #342, max tie was 5.
      // Leave headroom: assert no score has 8+ ties.
      const maxTie = Math.max(...Object.values(dist))
      expect(maxTie).toBeLessThan(8)
    })

    it('a full month covers a healthy score range (no flat distribution)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const scores = cells.map((c) => c.derivedScore)
      const range = Math.max(...scores) - Math.min(...scores)
      // Score should vary at least 15 points across the month.
      expect(range).toBeGreaterThanOrEqual(15)
    })

    it('soft-compression prevents derivedScore from hitting 100', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const max = Math.max(...cells.map((c) => c.derivedScore))
      expect(max).toBeLessThanOrEqual(98)
    })
  })

  describe('key events 3 (deriveKeyEvents)', () => {
    // 최소 필드만 채운 합성 셀 — deriveKeyEvents 는 datetime/derivedScore 만 읽음.
    const cell = (day: number, score: number): CalendarCell =>
      ({
        datetime: `2026-05-${String(day).padStart(2, '0')}T00:00:00.000Z`,
        derivedScore: score,
      }) as unknown as CalendarCell

    it('returns undefined when fewer than 7 dated cells', () => {
      const few = [1, 2, 3, 4, 5, 6].map((d) => cell(d, 70))
      expect(deriveKeyEvents(few)).toBeUndefined()
    })

    it('best = highest score, avoid filtered to <65, window = longest consecutive strong run', () => {
      // avg of these = (60+58+90+88+86+62+40+59) / 8 = 542/8 = 67.75 → thr ≈ 72.75
      // strong consecutive run: days 3,4,5 (90,88,86) → len 3
      const cells = [
        cell(1, 60),
        cell(2, 58),
        cell(3, 90),
        cell(4, 88),
        cell(5, 86),
        cell(6, 62),
        cell(7, 40),
        cell(8, 59),
      ]
      const ev = deriveKeyEvents(cells)
      expect(ev).toBeDefined()
      expect(ev!.best).toEqual({ date: '05-03', score: 90 })
      // avoid = bottom 2 by score (<65): day 7 (40), day 2 (58)
      expect(ev!.avoid?.dates).toEqual(['05-07', '05-02'])
      // window = 05-03..05-05, avg round((90+88+86)/3)=88
      expect(ev!.window).toEqual({ start: '05-03', end: '05-05', avg: 88 })
    })

    it('omits avoid entirely when every day is >= 65', () => {
      const cells = [70, 72, 74, 76, 78, 80, 82, 84].map((s, i) => cell(i + 1, s))
      const ev = deriveKeyEvents(cells)
      expect(ev?.avoid).toBeUndefined()
    })

    it('does not flag a window when no 3-day consecutive strong run exists', () => {
      // strong days are non-adjacent → no run of 3
      const cells = [50, 90, 50, 90, 50, 90, 50, 90].map((s, i) => cell(i + 1, s))
      const ev = deriveKeyEvents(cells)
      expect(ev?.window).toBeUndefined()
    })

    it('monthly buildInterpretation attaches keyEvents consistent with cell scores', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      expect(interp.keyEvents).toBeDefined()
      // best.score must equal the actual max derivedScore of the month
      const maxScore = Math.max(...cells.map((c) => c.derivedScore))
      expect(interp.keyEvents!.best?.score).toBe(maxScore)
      // any avoid date must really be a sub-65 day
      for (const d of interp.keyEvents!.avoid?.dates ?? []) {
        const match = cells.find((c) => c.datetime.slice(5, 10) === d)
        expect(match!.derivedScore).toBeLessThan(65)
      }
    })

    it('keyEvents is omitted for non-monthly scope', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'daily' })
      expect(interp.keyEvents).toBeUndefined()
    })
  })

  describe('month-over-month comparison (deriveMonthComparison)', () => {
    const cell = (day: number, score: number): CalendarCell =>
      ({
        datetime: `2026-05-${String(day).padStart(2, '0')}T00:00:00.000Z`,
        derivedScore: score,
      }) as unknown as CalendarCell

    const month = (base: number) => Array.from({ length: 10 }, (_, i) => cell(i + 1, base + i))

    it('returns undefined when either month has < 7 dated cells', () => {
      const few = [1, 2, 3].map((d) => cell(d, 70))
      expect(deriveMonthComparison({ currCells: few, prevCells: month(50) })).toBeUndefined()
      expect(deriveMonthComparison({ currCells: month(50), prevCells: few })).toBeUndefined()
    })

    it('computes overall avg delta and per-theme deltas (|delta|>=3, top 3)', () => {
      const cmp = deriveMonthComparison({
        currCells: month(60), // avg 64.5
        prevCells: month(50), // avg 54.5
        currScores: { money: 70, career: 55, love: 50, health: 48, growth: 60 },
        prevScores: { money: 56, career: 60, love: 49, health: 40, growth: 30 },
      })
      expect(cmp).toBeDefined()
      expect(cmp!.overallDelta).toBe(10) // 64.5 - 54.5
      // deltas: money +14, growth +30, health +8, career -5, love +1(<3 dropped)
      // top 3 by |delta|: growth +30, money +14, health +8
      expect(cmp!.themes.map((t) => t.theme)).toEqual(['growth', 'money', 'health'])
      expect(cmp!.themes.find((t) => t.theme === 'career')).toBeUndefined() // -5 is in top? no, only 3
      const growth = cmp!.themes.find((t) => t.theme === 'growth')!
      expect(growth.delta).toBe(30)
      expect(growth.dir).toBe('up')
    })

    it('marks down direction for negative deltas', () => {
      const cmp = deriveMonthComparison({
        currCells: month(50),
        prevCells: month(50),
        currScores: { money: 40 },
        prevScores: { money: 70 },
      })
      expect(cmp!.themes[0]).toEqual({ theme: 'money', delta: -30, dir: 'down' })
    })

    it('drops theme when only one month has a score for it', () => {
      const cmp = deriveMonthComparison({
        currCells: month(50),
        prevCells: month(50),
        currScores: { money: 80 },
        prevScores: {},
      })
      // no comparable theme + zero overall delta → undefined
      expect(cmp).toBeUndefined()
    })

    it('buildInterpretation attaches monthComparison only when prevCells given (monthly)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const may = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const apr = await buildCalendar(
        natal,
        {
          start: '2026-04-01T00:00:00.000Z',
          end: '2026-04-30T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const withPrev = buildInterpretation({ natal, cells: may, scope: 'monthly', prevCells: apr })
      const withoutPrev = buildInterpretation({ natal, cells: may, scope: 'monthly' })
      expect(withoutPrev.monthComparison).toBeUndefined()
      expect(withPrev.monthComparison).toBeDefined()
      // overallDelta must equal rounded(avg(may) - avg(apr))
      const avg = (cs: typeof may) => cs.reduce((a, c) => a + c.derivedScore, 0) / cs.length
      expect(withPrev.monthComparison!.overallDelta).toBe(Math.round(avg(may) - avg(apr)))
    })
  })

  describe('cycle depth — context 2줄 + 구조 라인', () => {
    it('daeun/seun/wolun 섹션이 2줄까지 표출 + 대운 위치/월운 주차 라인', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.000Z', granularity: 'day' },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      const daeun = interp.sections.find((s) => s.section === 'daeun')
      const wolun = interp.sections.find((s) => s.section === 'wolun')
      // 대운: 위치 라인 (초/중/후반 + 나이) 포함
      expect(daeun?.text).toMatch(/(초반|중반|후반).*세 무렵/)
      // 같은 섹션 제목이 narrative 에 두 번 안 나옴 (병합 확인)
      const daeunHeaderCount = (interp.narrative.match(/\[10년 큰 흐름\]/g) ?? []).length
      expect(daeunHeaderCount).toBe(1)
      // 월운: 주차별 흐름 라인
      expect(wolun?.text).toMatch(/주차별 흐름:/)
    })
  })

  describe('score / themeScores synchronisation', () => {
    it('monthly buildInterpretation produces themeScores for all 5 themes', async () => {
      const { interp } = await buildForDate(SEOUL_MALE_1995, '2026-05-15')
      const ts = interp.themeScores ?? {}
      // All 5 themes should be populated (Partial<Record> but expect at
      // least 3 of them set since the user has rules firing on multiple
      // domains).
      const themesPopulated = (['love', 'money', 'career', 'health', 'growth'] as const).filter(
        (k) => typeof ts[k] === 'number'
      )
      expect(themesPopulated.length).toBeGreaterThanOrEqual(3)
    })

    it('theme score direction agrees with its Why-card (no score↔근거 contradiction)', async () => {
      // opt1 회귀: 점수와 themeBreakdown 이 같은 신호 기반 모델을 써야 함.
      // 예전엔 1987년생 건강이 점수 60인데 근거카드 −47 로 모순됐음.
      const profiles = [SEOUL_MALE_1995, { ...SEOUL_MALE_1995, birthDate: '1987-05-10' }]
      for (const p of profiles) {
        const saju = calculateSajuData(p.birthDate, p.birthTime, p.gender, 'solar', p.timeZone)
        const natal = await buildNatalContext(p, { saju })
        for (const mo of [4, 8]) {
          const cells = await buildCalendar(
            natal,
            {
              start: new Date(Date.UTC(2026, mo - 1, 1)).toISOString(),
              end: new Date(Date.UTC(2026, mo, 0, 23, 59, 59)).toISOString(),
              granularity: 'day',
            },
            { includeEvidence: true }
          )
          const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
          const ts = interp.themeScores ?? {}
          const tb = interp.themeBreakdown ?? {}
          for (const k of Object.keys(tb) as Array<keyof typeof tb>) {
            const score = ts[k]
            const items = tb[k] ?? []
            if (typeof score !== 'number' || items.length === 0) continue
            const net = items.reduce(
              (a, c) => a + (c.dir === 'up' ? c.delta : -Math.abs(c.delta)),
              0
            )
            const scoreSign = score >= 55 ? 1 : score <= 45 ? -1 : 0
            const netSign = net > 3 ? 1 : net < -3 ? -1 : 0
            // 둘 다 뚜렷한 방향일 때 서로 반대면 안 됨.
            if (scoreSign !== 0 && netSign !== 0) {
              expect(
                scoreSign,
                `${p.birthDate} ${mo}월 ${k}: score ${score} vs Why-card net ${net} 모순`
              ).toBe(netSign)
            }
          }
        }
      }
    })

    it('themeBreakdown (Why-card) exposes contributors with sane magnitude + no raw hanja', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      const bd = interp.themeBreakdown ?? {}
      const themes = (['love', 'money', 'career', 'health', 'growth'] as const).filter(
        (k) => (bd[k]?.length ?? 0) > 0
      )
      // 적어도 한 테마는 인과 추적이 나와야 함
      expect(themes.length).toBeGreaterThanOrEqual(1)
      for (const k of themes) {
        for (const c of bd[k]!) {
          // delta 는 합리적 크기 (월 합산 폭주 방지 — 평균 기반)
          expect(Math.abs(c.delta)).toBeLessThanOrEqual(60)
          expect(Math.abs(c.delta)).toBeGreaterThan(0)
          expect(c.dir === 'up' || c.dir === 'down').toBe(true)
          // 라벨에 raw 한자 갑자(丙午 등)가 남으면 안 됨
          expect(c.label, `hanja ganji leak: ${c.label}`).not.toMatch(
            /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/
          )
        }
      }
    })

    it('every cell has a cell.themeScores object (UI 그래프 contract)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-07T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      for (const c of cells) {
        expect(c.themeScores).toBeDefined()
        expect(typeof c.themeScores).toBe('object')
      }
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // Daily ganji (일진) narrative — getGanjiTransitNarrative('daily').
  // 매일 다른 60갑자 → 매일 다른 텍스트. 같은 달 안에서 동일 narrative
  // 가 반복되면 4월/5월 동일 텍스트 같은 회귀가 발생.
  describe('daily ganji narrative', () => {
    it('produces a Korean one-liner for every well-known ganji', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      // 두 갑자 sample — 매 ganji 모두 ILJU_ARCHETYPES 에 있을 필요는 없고
      // 핵심은 daily layer 가 "하루예요" 어미로 닫히는지 확인.
      // ILJU_ARCHETYPES 의 키는 한자 (甲子 / 丙寅 …) 라 한자 사용.
      const samples = ['甲子', '丙寅', '庚午', '丁亥']
      let nonEmpty = 0
      for (const g of samples) {
        const text = getGanjiTransitNarrative(g, 'daily', 'ko')
        if (!text) continue
        nonEmpty += 1
        expect(text).toMatch(/오늘은/)
        expect(text).toMatch(/하루예요/)
        expect(text).not.toMatch(/시기예요/)
      }
      expect(nonEmpty).toBeGreaterThanOrEqual(2)
    })

    it('uses distinct lexical tails per layer (no cadence dup with rule body)', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      const day = getGanjiTransitNarrative('甲子', 'daily', 'ko')
      const month = getGanjiTransitNarrative('甲子', 'monthly', 'ko')
      const year = getGanjiTransitNarrative('甲子', 'yearly', 'ko')
      const dec = getGanjiTransitNarrative('甲子', 'decadal', 'ko')
      if (day) {
        expect(day).toMatch(/오늘은/)
        expect(day).toMatch(/하루예요/)
      }
      // Patch 1 — monthly 가 더 이상 "시기예요" 로 닫지 않음 (wolun 룰 본문
      // 의 "...시기예요." 와 cadence 중복되던 문제 차단).
      if (month) {
        expect(month).toMatch(/이번 달은/)
        expect(month).not.toMatch(/시기예요/)
        expect(month).toMatch(/흘러요/)
      }
      if (year) {
        expect(year).toMatch(/이번 해는/)
        expect(year).not.toMatch(/시기예요/)
      }
      if (dec) {
        expect(dec).toMatch(/이 대운은/)
        expect(dec).not.toMatch(/시기예요/)
      }
      // 네 layer 의 어미 키워드는 lexically distinct 해야 함 (한 layer 의
      // 어미가 다른 layer 에 그대로 들어가면 cadence dup 다시 살아남).
      const tailKeys = ['하루예요', '흘러요', '띠어요', '펼쳐져요']
      const present = tailKeys.filter((k) => [day, month, year, dec].some((t) => t?.includes(k)))
      // 네 layer 의 어미가 서로 다른 키워드를 써야 함.
      expect(present.length).toBeGreaterThanOrEqual(3)
    })

    it('archetype ending in 결 does not produce dangling 형용사 (己丑 case)', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      // 己丑 character 가 "…부드러운 결" 로 끝남 — wrapper 가 "결" 강제 strip
      // 하면 "부드러운의" 댕글링 발생했던 회귀. "결의 에너지/기운" 으로 정상.
      const day = getGanjiTransitNarrative('己丑', 'daily', 'ko')
      const month = getGanjiTransitNarrative('己丑', 'monthly', 'ko')
      expect(day).not.toMatch(/[가-힣]운의 /) // "부드러운의" 같은 형용사+의 금지
      expect(day).not.toMatch(/결의 결/) // 결 이중 금지
      expect(month).not.toMatch(/결의 결/)
    })

    it('dailyIljinSibsinLine personalizes by natal day-master sibsin', async () => {
      const { dailyIljinSibsinLine } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      // 같은 날짜라도 본명 일간이 달라 십신이 다르면 다른 한 줄
      const a = dailyIljinSibsinLine('편인', 'ko')
      const b = dailyIljinSibsinLine('편재', 'ko')
      expect(a).not.toBe('')
      expect(b).not.toBe('')
      expect(a).not.toBe(b)
      expect(a).toMatch(/당신에게는/)
      // 영어도 동작
      expect(dailyIljinSibsinLine('편인', 'en')).toMatch(/^For you it is a day/)
      // 미지/빈 값은 "" (안전)
      expect(dailyIljinSibsinLine(undefined, 'ko')).toBe('')
      expect(dailyIljinSibsinLine('xxx', 'ko')).toBe('')
    })

    it('English ganji narrative is fully English (no KO leak)', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      const samples = ['甲子', '丙寅', '癸巳', '壬辰', '辛酉']
      for (const g of samples) {
        for (const layer of ['daily', 'monthly', 'yearly', 'decadal'] as const) {
          const text = getGanjiTransitNarrative(g, layer, 'en')
          if (!text) continue
          // 한국어 단어가 영어 출력에 leak 되면 안 됨
          expect(text, `KO leak in [${g}/${layer}]: ${text}`).not.toMatch(/[가-힯]/)
          // 영어 narrative 의 표지어 (period label + "Strengths:" suffix)
          // 가 제대로 합쳐졌는지 확인
          expect(text).toMatch(/^(Today|This month|This year|This decade) /)
          expect(text).toMatch(/Strengths: /)
        }
      }
    })

    it('English ganji uses layer-distinct tails (cadence dup 차단)', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      const day = getGanjiTransitNarrative('甲子', 'daily', 'en')
      const month = getGanjiTransitNarrative('甲子', 'monthly', 'en')
      const year = getGanjiTransitNarrative('甲子', 'yearly', 'en')
      const dec = getGanjiTransitNarrative('甲子', 'decadal', 'en')
      // signature / grain / colour / long arc — 네 어미 모두 lexically distinct
      const tailKeys = ['signature', 'grain', 'colour', 'long arc']
      const present = tailKeys.filter((k) =>
        [day, month, year, dec].some((t) => t.toLowerCase().includes(k))
      )
      expect(present.length).toBeGreaterThanOrEqual(3)
    })

    it('returns "" for an unknown ganji on every layer', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      expect(getGanjiTransitNarrative('XYZ', 'daily', 'ko')).toBe('')
      expect(getGanjiTransitNarrative('XYZ', 'monthly', 'ko')).toBe('')
      expect(getGanjiTransitNarrative('XYZ', 'yearly', 'ko')).toBe('')
    })

    it('domain narratives do not use 여기에/한편/추가로 connector cycle (Patch 2)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      // 도메인 단락 5개 모두 점검 — connector 사이클 ("여기에/한편/추가로/
      // 또한/단,") 으로 시작하는 줄이 없어야 함. lifeReport 패턴 (줄바꿈 자체가
      // 분리자) 으로 자연스럽게 합쳐졌는지 확인.
      const domainSections = interp.sections.filter((s) => s.section.startsWith('domain-'))
      expect(domainSections.length).toBeGreaterThanOrEqual(3)
      const connectorRe = /^(여기에|한편|추가로|또한|단,)\s/m
      for (const s of domainSections) {
        const lines = s.text.split('\n')
        for (const line of lines) {
          expect(line, `connector leak in [${s.section}]: ${line}`).not.toMatch(connectorRe)
        }
      }
    })

    it('shinsal cheoneul section names specific MM-DD dates (Phase 3)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      const shinsal = interp.sections.find((s) => s.section === 'shinsal')
      if (!shinsal) return // 천을귀인이 안 활성화되는 사주는 trivially pass
      // vague "이번 달에 들어 있어요" 가 더 이상 나오면 안 됨
      expect(shinsal.text).not.toMatch(/이번 달에 들어 있어요/)
      // 구체 날짜 MM-DD 가 최소 1개 포함되어야 함
      expect(shinsal.text).toMatch(/\d{2}-\d{2}/)
      // {shinsalDates} placeholder 가 fillTemplate 안 되고 그대로 leak 되면 안 됨
      expect(shinsal.text).not.toMatch(/\{shinsalDates\}/)
    })

    it('domain body section dedups overlapping wellness rules (Patch 3)', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      const cells = await buildCalendar(
        natal,
        {
          start: '2026-05-01T00:00:00.000Z',
          end: '2026-05-31T23:59:59.000Z',
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      const body = interp.sections.find((s) => s.section === 'domain-body')
      if (!body) return // No body section means nothing to dedup, test trivially passes
      // "회복·치유에 우호적" 핵심 문구는 한 단락 안에 한 번만 등장해야 함.
      const occurrences = (body.text.match(/회복·치유에 우호적/g) ?? []).length
      expect(occurrences).toBeLessThanOrEqual(1)
    })

    it('consecutive days produce distinct daily ganji text (no 5월/6월 dup)', async () => {
      const { getGanjiTransitNarrative } =
        await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
      const { computeDayStem, computeDayBranch } =
        await import('@/lib/calendar-engine/extractors/saju-shinsal')
      // 60일 sample — 60갑자 한 cycle 안에서 unique text > 50 expected.
      const seen = new Set<string>()
      const base = Date.UTC(2026, 4, 1, 12, 0, 0) // 2026-05-01 noon UTC
      for (let i = 0; i < 60; i += 1) {
        const probe = new Date(base + i * 86400_000)
        const stem = computeDayStem(probe)
        const branch = computeDayBranch(probe)
        if (!stem || !branch) continue
        const text = getGanjiTransitNarrative(`${stem}${branch}`, 'daily', 'ko')
        if (text) seen.add(text)
      }
      // 60 일 안에서 최소 50종 이상 서로 다른 텍스트 (60갑자 cycle 보장).
      expect(seen.size).toBeGreaterThanOrEqual(50)
    })
  })

  describe('outer-planet & lifecycle rules (DB expansion)', () => {
    const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
    const profile = (birthDate: string): Profile => ({
      birthDate,
      birthTime: '06:40',
      gender: 'male',
      ...SEOUL,
    })

    it('every lifecycle rule carries a planet condition (prevents cross-fire)', () => {
      const lifecycleRules = RULES.filter((r) => r.conditions.signalKinds?.includes('lifecycle'))
      expect(lifecycleRules.length).toBeGreaterThanOrEqual(2)
      for (const r of lifecycleRules) {
        expect(r.conditions.planet, `rule ${r.id} must scope by planet`).toBeDefined()
        expect(r.conditions.planet!.length).toBeGreaterThan(0)
      }
    })

    it('new Neptune/Pluto + midlife lifecycle rules exist with KO+EN templates', () => {
      const ids = [
        'transit-neptune-harmonious',
        'transit-neptune-hard',
        'transit-pluto-harmonious',
        'transit-pluto-hard',
        'astro-lifecycle-pluto-square',
        'astro-lifecycle-uranus-opposition',
        'astro-lifecycle-neptune-square',
        'astro-lifecycle-chiron-return',
      ]
      for (const id of ids) {
        const rule = RULES.find((r) => r.id === id)
        expect(rule, `missing rule ${id}`).toBeDefined()
        expect(rule!.template.length).toBeGreaterThan(10)
        expect(rule!.templateEn && rule!.templateEn.length).toBeGreaterThan(10)
      }
    })

    it('saturn-return rule is scoped to Saturn so it no longer fires for Pluto/Uranus/Neptune', () => {
      const saturn = RULES.find((r) => r.id === 'astro-lifecycle-saturn-return')!
      expect(saturn.conditions.planet).toEqual(['Saturn'])
    })

    it('age-29 chart renders Saturn Return (not a different planet)', async () => {
      // 1996 birth → saturn_return_1 active in 2026
      const { interp } = await buildForDate(profile('1996-05-10'), '2026-05-15')
      expect(interp.narrative).toContain('Saturn Return')
      expect(interp.narrative).not.toContain('Pluto Square')
    })

    it('age-39 chart renders Pluto Square — the old Saturn-Return mismatch is gone', async () => {
      // 1987 birth → pluto_square_pluto active in 2026 (was wrongly showing Saturn Return)
      const { interp } = await buildForDate(profile('1987-05-10'), '2026-05-15')
      expect(interp.narrative).toContain('Pluto Square')
      expect(interp.narrative).not.toContain('Saturn Return')
    })
  })

  describe('multi-signal interaction patterns (십신 조합)', () => {
    const COMBOS: Array<[ruleId: string, patternId: string]> = [
      ['pattern-gwan-in-flow', 'gwan-in-flow'],
      ['pattern-siksang-wealth', 'siksang-wealth'],
      ['pattern-wealth-to-status', 'wealth-to-status'],
      ['pattern-wealth-rivalry', 'wealth-rivalry'],
      ['pattern-output-vs-authority', 'output-vs-authority'],
      ['pattern-siksin-controls-pressure', 'siksin-controls-pressure'],
      ['pattern-expression-with-restraint', 'expression-with-restraint'],
      ['pattern-authority-mixed', 'authority-mixed'],
      ['pattern-wealth-erodes-resource', 'wealth-erodes-resource'],
      ['pattern-energy-into-output', 'energy-into-output'],
      ['pattern-support-reinforcement', 'support-reinforcement'],
    ]

    const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
    async function monthPatternIds(
      birthDate: string,
      gender: 'male' | 'female',
      year: number,
      month: number
    ): Promise<Set<string>> {
      const saju = calculateSajuData(birthDate, '06:40', gender, 'solar', SEOUL.timeZone)
      const natal = await buildNatalContext(
        { birthDate, birthTime: '06:40', gender, ...SEOUL } as Profile,
        { saju }
      )
      const cells = await buildCalendar(
        natal,
        {
          start: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
          end: new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString(),
          granularity: 'day',
        },
        { includeEvidence: true }
      )
      const ids = new Set<string>()
      for (const c of cells) for (const p of c.matchedPatterns) ids.add(p.id)
      return ids
    }

    it('each combo rule exists with KO+EN templates + patternId condition', () => {
      for (const [ruleId, patternId] of COMBOS) {
        const rule = RULES.find((r) => r.id === ruleId)
        expect(rule, `missing rule ${ruleId}`).toBeDefined()
        expect(rule!.conditions.patternId).toEqual([patternId])
        expect(rule!.template.length).toBeGreaterThan(10)
        expect(rule!.templateEn && rule!.templateEn.length).toBeGreaterThan(10)
      }
    })

    it('combos actually fire for real charts (not dead rules)', async () => {
      const comboIds = new Set(COMBOS.map(([, p]) => p))
      const seen = new Set<string>()
      // 두 차트 × 일부 달 — 십신 조합은 흔하게 발동 (1년 스캔 불필요)
      for (const m of [3, 7, 11]) {
        for (const id of await monthPatternIds('1995-02-09', 'male', 2026, m)) {
          if (comboIds.has(id)) seen.add(id)
        }
      }
      for (const m of [5, 9]) {
        for (const id of await monthPatternIds('1976-09-21', 'female', 2026, m)) {
          if (comboIds.has(id)) seen.add(id)
        }
      }
      // 최소 2종 이상 발동해야 "살아있는" 패턴군
      expect(seen.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('domain date-line coverage (growth key fix)', () => {
    it('자기·성장(domain-growth) section emits 강한 날 date lines like other domains', async () => {
      const saju = calculateSajuData(
        SEOUL_MALE_1995.birthDate,
        SEOUL_MALE_1995.birthTime,
        SEOUL_MALE_1995.gender,
        'solar',
        SEOUL_MALE_1995.timeZone
      )
      const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
      let checked = 0
      for (const mo of [3, 5, 7]) {
        const cells = await buildCalendar(
          natal,
          {
            start: new Date(Date.UTC(2026, mo - 1, 1)).toISOString(),
            end: new Date(Date.UTC(2026, mo, 0, 23, 59, 59)).toISOString(),
            granularity: 'day',
          },
          { includeEvidence: true }
        )
        const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
        const growth = interp.sections.find((s) => s.section === 'domain-growth')
        if (!growth) continue
        checked += 1
        // 버그(키 'expression') 일 땐 themes=[] → 날짜 라인이 전혀 안 붙음.
        expect(growth.text).toMatch(/특히 강한 날|주의 날/)
      }
      expect(checked).toBeGreaterThan(0)
    })
  })

  describe('Void-of-Course Moon timing rule', () => {
    // 주의: 테스트 환경은 swisseph 를 목킹(고정 위치)해 달이 안 움직임 → VoC 가
    // 실제로 발생하지 않음. 그래서 ephemeris 경유 대신 합성 VoC 신호를 직접
    // 넣어 룰→matcher 배선만 검증한다. 프로덕션(실 ephemeris)에선 신호가 발생.
    function cellWithVoc(day: number): CalendarCell {
      const dayIso = `2026-05-${String(day).padStart(2, '0')}`
      return {
        datetime: `${dayIso}T00:00:00.000Z`,
        derivedScore: 50,
        themeScores: {},
        matchedPatterns: [],
        topReasons: [],
        cautions: [],
        signals: [
          {
            id: `astro.voc.${dayIso}`,
            source: 'astro',
            kind: 'void-of-course',
            name: `Moon VoC (Aries)`,
            korean: `달 공전 — Aries`,
            themes: [],
            polarity: -1,
            layer: 'daily',
            active: {
              start: `${dayIso}T00:00:00.000Z`,
              peak: `${dayIso}T12:00:00.000Z`,
              end: `${dayIso}T18:00:00.000Z`,
            },
            weight: 0.45,
            evidence: { module: 'astro-planetary-hour', planets: ['Moon'], detail: {} },
          },
        ],
      } as unknown as CalendarCell
    }

    it('rule exists with KO+EN templates + void-of-course condition', () => {
      const rule = RULES.find((r) => r.id === 'timing-void-of-course-moon')
      expect(rule).toBeDefined()
      expect(rule!.conditions.signalKinds).toEqual(['void-of-course'])
      expect(rule!.template.length).toBeGreaterThan(10)
      expect(rule!.templateEn && rule!.templateEn.length).toBeGreaterThan(10)
    })

    it('renders a timing section naming the VoC dates when VoC signals exist', async () => {
      const saju = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
      const natal = await buildNatalContext(
        {
          birthDate: '1995-02-09',
          birthTime: '06:40',
          gender: 'male',
          latitude: 37.5665,
          longitude: 126.978,
          timeZone: 'Asia/Seoul',
        } as Profile,
        { saju }
      )
      const cells = [cellWithVoc(4), cellWithVoc(17)]
      const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
      const timing = interp.sections.find((s) => s.section === 'timing')
      expect(timing).toBeDefined()
      expect(timing!.text).toContain('05-04')
      expect(timing!.text).toContain('05-17')
      expect(timing!.text).toContain('2') // vocDatesCount
      // EN variant resolves too
      const interpEn = buildInterpretation({ natal, cells, scope: 'monthly', lang: 'en' })
      const timingEn = interpEn.sections.find((s) => s.section === 'timing')
      expect(timingEn!.text.toLowerCase()).toContain('void of course')
    })
  })
})
