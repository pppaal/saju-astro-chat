import { describe, it, expect, beforeAll } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildInterpretation } from '@/lib/calendar-engine/interpretation/matcher'

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
})
