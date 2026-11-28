/**
 * 상담사 '오늘' = 캘린더의 그 날짜 셀 (재감사 G3 · TP-4 · TP-5 · CNS-1, 오너 결정 17).
 *
 * 상담사의 '오늘'은 보는 사람의 현지 민용 날짜 D 다(ensureCounselorContext 가 Date.UTC(D, 12)
 * 에 실어 넘긴다 — 날짜만 싣는 그릇). 그 날짜의 세운·월운은 캘린더 셀과 같은 헬퍼
 * (pillarsForLocalDate, 출생 tz — 節/立春 이 든 그 현지 날이 새 기둥)로, 대운·만 나이는 출생 tz
 * 의 D 정오(counselorDayAnchor)로 정한다. 예전엔 그 UTC 정오를 순간으로 써서
 *   - 節 이 UTC 정오 뒤에 든 날(서울 21–24시, LA 거의 하루 종일)은 캘린더와 월운·세운이 갈렸고,
 *   - UTC+12..+14(오클랜드·키리티마티)에선 그 순간이 이미 다음 현지 날이라 대운이 생일 하루
 *     전에, 월운·세운이 節 하루 전에 바뀌었다.
 *
 * 기대값은 캘린더 셀(같은 사용자·같은 날짜의 buildCalendar 월 빌드 — 운영 경로) 그 자체다.
 * 고정 예시는 재감사 판정의 독립 도출값(astronomy-engine 節 instant + Intl 오프셋)이다.
 */
import { describe, it, expect } from 'vitest'
import {
  buildDestinyContext,
  counselorDayAnchor,
  type DestinyBirth,
} from '@/lib/destiny/counselorContext'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { getSolarTermKST } from '@/lib/saju/constants'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'

const SAJU_ONLY = { saju: true, astro: false }

const ZONES = [
  { tz: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  { tz: 'America/Los_Angeles', lat: 34.05, lon: -118.24 },
  { tz: 'Australia/Sydney', lat: -33.87, lon: 151.21 },
  { tz: 'Pacific/Auckland', lat: -36.85, lon: 174.76 },
  { tz: 'Pacific/Kiritimati', lat: 1.87, lon: -157.4 },
] as const

/** 순간 ms 의 tz 민용 날짜 'YYYY-MM-DD' (Intl — 엔진 코드 밖). */
function localDate(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
/** ensureCounselorContext 가 넘기는 '오늘' 그릇 — 보는 사람 tz 의 날짜 D 의 UTC 정오. */
function carrier(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function birthIn(z: (typeof ZONES)[number], over: Partial<DestinyBirth> = {}): DestinyBirth {
  return {
    birthDate: '1990-05-15',
    birthTime: '10:00',
    gender: 'male',
    timezone: z.tz,
    latitude: z.lat,
    longitude: z.lon,
    ...over,
  }
}

async function natalOf(b: DestinyBirth): Promise<NatalContext> {
  return buildNatalContext({
    birthDate: b.birthDate,
    birthTime: b.birthTime,
    gender: b.gender,
    latitude: b.latitude!,
    longitude: b.longitude!,
    timeZone: b.timezone!,
  })
}

/** 캘린더 셀의 사주 기간 신호 — 연 단위 빌드 한 번(pillar-sibsin 추출기만)을 날짜별로. */
async function calendarYear(natal: NatalContext, year: number) {
  const cells = await buildCalendar(
    natal,
    {
      start: `${year}-01-01T00:00:00.000Z`,
      end: `${year}-12-31T23:59:59.999Z`,
      granularity: 'day',
    },
    { includeEvidence: false, enabledExtractors: ['pillar-sibsin'] }
  )
  const byDate = new Map<string, { year: string[]; month: string[]; daeun: string[] }>()
  for (const c of cells) {
    const sig = c.signals.filter((s) => s.id.startsWith('saju.pillar-sibsin.'))
    byDate.set(c.datetime.slice(0, 10), {
      year: sig.filter((s) => s.layer === 'yearly').map((s) => s.name.split(' ')[0]),
      month: sig.filter((s) => s.layer === 'monthly').map((s) => s.name.split(' ')[0]),
      daeun: sig
        .filter((s) => s.layer === 'decadal')
        .map((s) => s.id.replace('saju.pillar-sibsin.', '')),
    })
  }
  return byDate
}

/** 상담사 타이밍 블록(EN)의 세운·월운 간지와 '현재' 대운 간지. */
async function counselorOn(b: DestinyBirth, date: string) {
  const { daily } = await buildDestinyContext(b, carrier(date), 'en', undefined, SAJU_ONLY)
  expect(daily).toContain(`# Today: ${date}`)
  return {
    year: /^Annual \d+ (\S\S) /m.exec(daily)?.[1] ?? null,
    month: /^Monthly (\S\S) /m.exec(daily)?.[1] ?? null,
    daeunNow: /(\S\S)\(now /.exec(daily)?.[1] ?? null,
  }
}

describe('상담사 세운·월운 = 캘린더 셀 — 2025–2030 의 모든 節 × 5개 존', () => {
  it.each(ZONES)(
    '$tz: 節 이 든 현지 날과 그 전날, 상담사와 캘린더가 같은 세운·월운',
    async (z) => {
      const b = birthIn(z)
      const natal = await natalOf(b)
      const years = new Map<number, Awaited<ReturnType<typeof calendarYear>>>()
      const cell = async (date: string) => {
        const y = Number(date.slice(0, 4))
        if (!years.has(y)) years.set(y, await calendarYear(natal, y))
        return years.get(y)!.get(date)!
      }
      const mismatches: string[] = []
      let rows = 0
      for (let year = 2025; year <= 2030; year++) {
        for (let month = 1; month <= 12; month++) {
          const term = getSolarTermKST(year, month)
          expect(term).not.toBeNull()
          const D = localDate(term!.getTime(), z.tz)
          for (const date of [addDays(D, -1), D]) {
            const c = await cell(date)
            const co = await counselorOn(b, date)
            rows++
            // 캘린더 셀은 날짜마다 세운·월운을 하나씩만 싣는다(오너 결정 17 — 立春 날 이중 세운 없음).
            expect(c.year).toHaveLength(1)
            expect(c.month).toHaveLength(1)
            if (co.year !== c.year[0] || co.month !== c.month[0])
              mismatches.push(
                `${date}: counselor ${co.year}/${co.month} calendar ${c.year[0]}/${c.month[0]}`
              )
          }
        }
      }
      expect(rows).toBe(144)
      expect(mismatches).toEqual([])
    },
    240_000
  )

  // 재감사 판정의 독립 도출값(astronomy-engine + Intl) — 예전 상담사 값은 주석.
  it.each([
    // 立冬 2026-11-07T09:52Z = 서울 18:52 → 서울 11-07 부터 己亥 (예전 상담사 己亥·캘린더 戊戌 → 이제 둘 다 己亥)
    ['Asia/Seoul', '2026-11-06', '丙午', '戊戌'],
    ['Asia/Seoul', '2026-11-07', '丙午', '己亥'],
    // 白露 2026-09-07T14:41Z = 서울 23:41 — 예전 상담사는 UTC 정오라 그날 아직 丙申
    ['Asia/Seoul', '2026-09-07', '丙午', '丁酉'],
    // 立夏 2026-05-05T11:49Z = 키리티마티 05-06 01:49 → 05-05 는 하루 종일 壬辰 (예전 상담사 癸巳)
    ['Pacific/Kiritimati', '2026-05-05', '丙午', '壬辰'],
    ['Pacific/Kiritimati', '2026-05-06', '丙午', '癸巳'],
    // 立春 2025-02-03T14:10Z = LA 06:10 → LA 02-03 부터 乙巳·戊寅 (예전 상담사 甲辰·丁丑)
    ['America/Los_Angeles', '2025-02-02', '甲辰', '丁丑'],
    ['America/Los_Angeles', '2025-02-03', '乙巳', '戊寅'],
  ])('%s %s → 세운 %s · 월운 %s', async (tz, date, year, month) => {
    const z = ZONES.find((x) => x.tz === tz)!
    const co = await counselorOn(birthIn(z), date)
    expect({ year: co.year, month: co.month }).toEqual({ year, month })
  })
})

describe('상담사 현재 대운 — 출생 tz 민용 생일에 바뀐다(하루 일찍 아님)', () => {
  it('오클랜드 1975-07-14 12:00 남: 07-13 은 戊寅@42, 07-14 부터 丁丑@52 — 캘린더 셀과 같다', async () => {
    // 재감사 TP-5 (a): 小暑 1975 = 1975-07-07T17:59Z, 출생 6.25일 뒤 → 대운수 2, 乙년 남 역행.
    // 예전엔 UTC 정오 = 오클랜드 다음 날 00시라 07-13 에 이미 丁丑(now).
    const z = ZONES.find((x) => x.tz === 'Pacific/Auckland')!
    const b = birthIn(z, {
      birthDate: '1975-07-14',
      birthTime: '12:00',
      latitude: -36.8485,
      longitude: 174.7633,
    })
    expect((await counselorOn(b, '2027-07-13')).daeunNow).toBe('戊寅')
    expect((await counselorOn(b, '2027-07-14')).daeunNow).toBe('丁丑')
    const cal = await calendarYear(await natalOf(b), 2027)
    expect(cal.get('2027-07-13')!.daeun).toEqual(['daeun-branch.2017.寅'])
    expect(cal.get('2027-07-14')!.daeun).toEqual(['daeun-stem.2027.丁'])
  }, 60_000)

  it.each(ZONES)(
    '$tz 1990-05-15 생: 다음 대운 생일 전날·당일, 상담사 현재 대운 = 캘린더 셀 대운',
    async (z) => {
      const b = birthIn(z)
      // 대운 목록은 엔진(daeunAge SSOT) 에서 — 2026 이후 첫 교체 나이를 고른다.
      const facts = collectSajuFacts({
        birthDate: b.birthDate,
        birthTime: b.birthTime,
        gender: b.gender,
        timezone: z.tz,
        longitude: z.lon,
        now: new Date(Date.UTC(2026, 0, 1)),
      })
      const list = facts.daeun.list
      const next = list.findIndex((d) => 1990 + d.age >= 2026)
      expect(next).toBeGreaterThan(0)
      const prev = list[next - 1]
      const cur = list[next]
      const boundary = `${1990 + cur.age}-05-15`
      const before = addDays(boundary, -1)
      expect((await counselorOn(b, before)).daeunNow).toBe(
        `${prev.heavenlyStem}${prev.earthlyBranch}`
      )
      expect((await counselorOn(b, boundary)).daeunNow).toBe(
        `${cur.heavenlyStem}${cur.earthlyBranch}`
      )
      const cal = await calendarYear(await natalOf(b), 1990 + cur.age)
      expect(cal.get(before)!.daeun).toEqual([
        `daeun-branch.${1990 + prev.age}.${prev.earthlyBranch}`,
      ])
      expect(cal.get(boundary)!.daeun).toEqual([`daeun-stem.${1990 + cur.age}.${cur.heavenlyStem}`])
    },
    60_000
  )
})

describe('counselorDayAnchor — 그 날짜의 출생 tz 정오(캘린더 셀의 트랜짓 표본과 같은 순간)', () => {
  it.each([
    ['Pacific/Kiritimati', '2026-06-10T22:00:00.000Z'], // UTC+14 — UTC 날짜로는 전날
    ['Pacific/Auckland', '2026-06-11T00:00:00.000Z'], // NZST UTC+12
    ['Asia/Seoul', '2026-06-11T03:00:00.000Z'],
    ['America/Los_Angeles', '2026-06-11T19:00:00.000Z'], // PDT
  ])('%s 2026-06-11 → %s, 그 tz 로 읽으면 같은 날짜', (tz, iso) => {
    const at = counselorDayAnchor({ year: 2026, month: 6, day: 11 }, tz)
    expect(at.toISOString()).toBe(iso)
    expect(localDate(at.getTime(), tz)).toBe('2026-06-11')
  })

  it('예전 UTC 정오 그릇은 UTC+12..+14 에서 다음 현지 날이었다(대조)', () => {
    const utcNoon = carrier('2026-06-11').getTime()
    expect(localDate(utcNoon, 'Pacific/Kiritimati')).toBe('2026-06-12')
    expect(localDate(utcNoon, 'Pacific/Auckland')).toBe('2026-06-12')
  })

  it('프로펙션 나이도 그 날짜로 — 오클랜드 07-13 은 만 51, 07-14 부터 52', async () => {
    const b: DestinyBirth = {
      birthDate: '1975-07-14',
      birthTime: '12:00',
      gender: 'male',
      timezone: 'Pacific/Auckland',
      latitude: -36.8485,
      longitude: 174.7633,
    }
    const astro = { saju: false, astro: true }
    const d13 = await buildDestinyContext(b, carrier('2027-07-13'), 'en', undefined, astro)
    expect(d13.daily).toMatch(/Profection \(age 51 basis\)/)
    const d14 = await buildDestinyContext(b, carrier('2027-07-14'), 'en', undefined, astro)
    expect(d14.daily).toMatch(/Profection \(age 52 basis\)/)
  }, 60_000)
})
