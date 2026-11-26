/**
 * 캘린더 시진 — 서머타임 전환일 (재감사 TP-9) + 실제 시계 창 (재감사 TP-8).
 *
 * 시진 경계는 평균태양시(UT + 경도×4분)가 홀수 정시를 지나는 *절대 instant* 이고, 창 문자열은
 * 그 instant 의 *그 순간* offset 으로 옮긴 벽시계다(CONVENTIONS §1). 예전엔 UTC 자정의 offset
 * 하나를 하루 전체에 써서, 전환일엔 전환 한쪽의 창이 10~11시간 동안 60분 밀렸다
 * (LA 2026-03-08 03:00 PDT → 己丑 이어야 하는데 庚寅).
 *
 * 기대값은 엔진 없이 만든다: 벽시계 분 → instant 는 이 파일의 Intl 해석기(RFC 5545 — 겹침은
 * 첫 번째, 공백 분은 비교에서 뺀다), 평균태양시 = UT + round(경도×4), 지지 = 子 23:00–01:00,
 * 時干 = 그 민용일 일간(JDN 순환, 2000-01-01 = 戊午)에서 五鼠遁.
 */
import { describe, it, expect } from 'vitest'
import sajuHourExtractor, {
  hourSegmentsForCivilDay,
  hourSegmentsForLocalDay,
} from '@/lib/calendar-engine/extractors/saju-hour'
import { solarTimeCorrectionMinutes } from '@/lib/saju/timezone'
import { calculateSajuData } from '@/lib/saju/saju'

const STEMS = '甲乙丙丁戊己庚辛壬癸'
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

type Sig = {
  id: string
  weight: number
  active: { start: string; peak: string; end: string }
  evidence: { pillars: string[]; detail: Record<string, unknown> }
}

/** 기신이 오행 전부라 모든 시진 조각이 신호로 나오는 가짜 본명(경계만 본다). */
function extractAll(dayIso: string, longitude: number, timeZone: string): Sig[] {
  const natal = {
    saju: {
      pillars: { day: { heavenlyStem: { name: '甲' } } },
      yongsin: { primary: 'none', avoid: ['목', '화', '토', '금', '수'] },
    },
    astro: { location: { latitude: 0, longitude, timeZone } },
  }
  return sajuHourExtractor.extract({
    natal,
    range: { start: `${dayIso}T00:00:00.000Z`, end: `${dayIso}T00:00:00.000Z`, granularity: 'day' },
    cache: { get: () => undefined, set: () => {} },
  } as never) as unknown as Sig[]
}

// ── 독립 기준 ────────────────────────────────────────────────────────────────
const dtf = new Map<string, Intl.DateTimeFormat>()
function wallOf(ms: number, tz: string): number {
  let f = dtf.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    dtf.set(tz, f)
  }
  const p: Record<string, string> = {}
  for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
}
/** 벽시계 → 첫 번째 instant, 없는 벽시계(공백)면 null. */
function firstInstant(wallMs: number, tz: string): number | null {
  const offs = new Set<number>()
  for (const h of [-26, -12, 0, 12, 26])
    offs.add(wallOf(wallMs + h * 3600_000, tz) - (wallMs + h * 3600_000))
  const valid = [...offs].map((o) => wallMs - o).filter((t) => wallOf(t, tz) === wallMs)
  return valid.length ? Math.min(...valid) : null
}
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  )
}
/** 그 벽시계 분의 時柱 — 공백 분이면 null. */
function expectedPillar(dayIso: string, wallMin: number, tz: string, lon: number): string | null {
  const [y, m, d] = dayIso.split('-').map(Number)
  const t = firstInstant(Date.UTC(y, m - 1, d) + wallMin * 60_000, tz)
  if (t === null) return null
  const utMin = Math.floor((((t % 86_400_000) + 86_400_000) % 86_400_000) / 60_000)
  const solar = (((utMin + Math.round(lon * 4)) % 1440) + 1440) % 1440
  const b = Math.floor(((solar + 60) % 1440) / 120)
  const dayStem = (((jdn(y, m, d) - 2451545 + 54) % 60) + 60) % 10
  return STEMS[((dayStem % 5) * 2 + b) % 10] + BRANCHES[b]
}

/** 엔진 신호 → 벽시계 분별 時柱 (창 문자열은 떠 있는 현지 벽시계). */
function engineByMinute(dayIso: string, sigs: Sig[]): string[] {
  const base = Date.parse(`${dayIso}T00:00:00.000Z`)
  const out = new Array<string>(1440).fill('')
  for (const s of sigs) {
    const a = Math.round((Date.parse(s.active.start) - base) / 60_000)
    const e = s.active.end.endsWith('T23:59:59.999Z')
      ? 1440
      : Math.round((Date.parse(s.active.end) - base) / 60_000)
    for (let k = a; k < e; k++) out[k] += s.evidence.pillars[0]
  }
  return out
}

const CASES: Array<{ tz: string; lon: number; days: string[] }> = [
  { tz: 'America/New_York', lon: -74.006, days: ['2026-03-08', '2026-11-01'] },
  { tz: 'Europe/Madrid', lon: -3.7038, days: ['2026-03-29', '2026-10-25'] },
  { tz: 'Australia/Sydney', lon: 151.2093, days: ['2026-10-04', '2026-04-05'] },
  { tz: 'America/Los_Angeles', lon: -118.24, days: ['2026-03-08', '2026-11-01'] },
  // 자정에 바뀌는 존 — 토요일(해제)·일요일(시작)이 전환일.
  { tz: 'America/Santiago', lon: -70.6693, days: ['2026-04-04', '2026-09-06'] },
]

describe('saju-hour 서머타임 전환일 — 시진 경계 = 절대 instant (TP-9)', () => {
  for (const { tz, lon, days } of CASES) {
    for (const day of days) {
      it(`${tz} ${day}: 모든 벽시계 분의 시진 = 평균태양시 기준(공백 분 제외)`, () => {
        const sigs = extractAll(day, lon, tz)
        const eng = engineByMinute(day, sigs)
        const wrong: string[] = []
        let gap = 0
        for (let k = 0; k < 1440; k++) {
          const exp = expectedPillar(day, k, tz, lon)
          if (exp === null) {
            gap++
            continue
          }
          if (eng[k] !== exp && wrong.length < 5)
            wrong.push(`${Math.floor(k / 60)}:${String(k % 60).padStart(2, '0')} ${eng[k]}≠${exp}`)
        }
        expect(wrong, wrong.join(', ')).toEqual([])
        expect(gap).toBeLessThanOrEqual(60)
        // 조각은 하루 [00:00, 24:00) 를 빈틈·겹침 없이 덮는다(공백 시간대도 이웃 조각이 덮음).
        expect(eng.every((p) => p.length === 2)).toBe(true)
      })
    }
  }

  it('감사 예시 — LA 2026-03-08 03:00 PDT(10:00Z, 평균태양시 02:07) = 己丑, 본명 시주와 같다', () => {
    const eng = engineByMinute(
      '2026-03-08',
      extractAll('2026-03-08', -118.24, 'America/Los_Angeles')
    )
    expect(eng[180]).toBe('己丑')
    const natal = calculateSajuData(
      '2026-03-08',
      '03:00',
      'male',
      'solar',
      'America/Los_Angeles',
      false,
      -118.24
    )
    expect(`${natal.timePillar.heavenlyStem.name}${natal.timePillar.earthlyBranch.name}`).toBe(
      '己丑'
    )
  })

  it('속성: 전환일 임의 벽시계 시각의 캘린더 時柱 = calculateSajuData 의 시주', () => {
    let seed = 20261126
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    for (const { tz, lon, days } of CASES) {
      for (const day of days) {
        const eng = engineByMinute(day, extractAll(day, lon, tz))
        for (let i = 0; i < 6; i++) {
          const k = Math.floor(rnd() * 1440)
          if (expectedPillar(day, k, tz, lon) === null) continue // 없는 벽시계
          const hh = String(Math.floor(k / 60)).padStart(2, '0')
          const mm = String(k % 60).padStart(2, '0')
          const natal = calculateSajuData(day, `${hh}:${mm}`, 'male', 'solar', tz, false, lon)
          const want = `${natal.timePillar.heavenlyStem.name}${natal.timePillar.earthlyBranch.name}`
          expect(eng[k], `${tz} ${day} ${hh}:${mm}`).toBe(want)
        }
      }
    }
  })

  it('봄 전환일 창은 공백을 걸쳐도 실제 2시간 — 뉴욕 丑 00:56–03:56, 마드리드 子 00:15–03:15, 시드니 丑 00:55–03:55', () => {
    const win = (day: string, lon: number, tz: string, branch: string) => {
      const s = extractAll(day, lon, tz).find((x) => x.evidence.detail.hourBranch === branch)!
      return {
        clock: `${s.evidence.detail.clockStart}–${s.evidence.detail.clockEnd}`,
        active: `${s.active.start.slice(11, 16)}–${s.active.end.slice(11, 16)}`,
        weight: s.weight,
      }
    }
    expect(win('2026-03-08', -74.006, 'America/New_York', '丑')).toEqual({
      clock: '00:56–03:56',
      active: '00:56–03:56',
      weight: 0.4,
    })
    expect(win('2026-03-29', -3.7038, 'Europe/Madrid', '子').clock).toBe('00:15–03:15')
    expect(win('2026-10-04', 151.2093, 'Australia/Sydney', '丑').clock).toBe('00:55–03:55')
    // 가을 전환일 — 뉴욕 丑 은 01:56 EDT 에 시작해 02:56 EST 에 끝난다(실제 2시간).
    expect(win('2026-11-01', -74.006, 'America/New_York', '丑')).toEqual({
      clock: '01:56–02:56',
      active: '01:56–02:56',
      weight: 0.4,
    })
  })

  it('같은 時柱 조각들의 weight 합은 시진 하나(0.4)를 넘지 않는다 — 25시간 날의 子 도', () => {
    for (const { tz, lon, days } of CASES) {
      for (const day of days) {
        const byPillar = new Map<string, number>()
        for (const s of extractAll(day, lon, tz)) {
          const k = s.evidence.pillars[0]
          byPillar.set(k, (byPillar.get(k) ?? 0) + s.weight)
        }
        for (const [k, w] of byPillar)
          expect(w, `${tz} ${day} ${k}`).toBeLessThanOrEqual(0.4 + 1e-9)
      }
    }
  })
})

describe('saju-hour 전환 없는 날 — 예전과 같은 한 보정분 경로', () => {
  it('hourSegmentsForLocalDay = hourSegmentsForCivilDay(자정 보정분) (여러 존·날짜)', () => {
    const places = [
      { lon: 126.978, tz: 'Asia/Seoul' },
      { lon: 75.99, tz: 'Asia/Shanghai' },
      { lon: -0.1276, tz: 'Europe/London' },
      { lon: -74.006, tz: 'America/New_York' },
      { lon: 151.2093, tz: 'Australia/Sydney' },
    ]
    // 전환일의 앞뒤 날 포함(예전 코드가 UTC 자정 offset 을 읽어도 맞던 날들).
    const days = [
      '2026-01-15',
      '2026-03-07',
      '2026-03-09',
      '2026-07-15',
      '2026-11-02',
      '2030-04-20',
    ]
    for (const p of places) {
      for (const day of days) {
        const corr = solarTimeCorrectionMinutes(new Date(`${day}T00:00:00.000Z`), p.lon, p.tz)
        const local = hourSegmentsForLocalDay(day, p.lon, p.tz).map((s) => ({
          branchIdx: s.branchIdx,
          startMin: s.startMin,
          endMin: s.endMin,
          part: s.part,
        }))
        expect(local, `${p.tz} ${day}`).toEqual(hourSegmentsForCivilDay(corr))
      }
    }
  })

  it('실제 시계 창 — 서울 子 는 두 조각 모두 23:32–01:32, 한가운데는 그날 00:32 KST', () => {
    const zi = extractAll('2026-11-25', 126.978, 'Asia/Seoul').filter(
      (s) => s.evidence.detail.hourBranch === '子'
    )
    expect(zi).toHaveLength(2)
    for (const s of zi) {
      expect(s.evidence.detail.clockStart).toBe('23:32')
      expect(s.evidence.detail.clockEnd).toBe('01:32')
      expect(s.evidence.detail.centerUtc).toBe('2026-11-24T15:32:00.000Z')
      expect(s.evidence.detail.windowLabel).toBe('23:32–01:32 (자시)')
    }
    // 명목 라벨(startHour·'23-1시')은 더 싣지 않는다.
    for (const s of extractAll('2026-11-25', 126.978, 'Asia/Seoul')) {
      expect(s.evidence.detail).not.toHaveProperty('startHour')
      expect(String(s.evidence.detail.windowLabel)).toMatch(/^\d\d:\d\d–\d\d:\d\d \(.시\)$/)
    }
  })
})
