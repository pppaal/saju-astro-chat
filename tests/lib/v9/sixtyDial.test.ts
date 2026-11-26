// tests/lib/v9/sixtyDial.test.ts
//
// 60갑자 다이얼 모델 — 지금의 세운은 보는 사람 시간대의 민용 날짜(오너 결정 17: 立春 이 든
// 그날부터 새 세운), 태어난 해·인생 전환 색인, gen9.py 배치와 같은 좌표, 결정성(시계 무관).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { dialModel, ganjiIndex60, ganjiIndexOf, DIAL_LABELS } from '@/lib/v9/sixtyDial'
import { cardBackRing, yearRingIndex, DIAL_LABELS as RING_LABELS } from '@/lib/v9/ring'
import { pillarsForLocalDateString } from '@/lib/calendar-engine/periodPillars'
import { yearPillarOfSajuYear } from '@/lib/saju/datePillars'
import { getDateComponentsInTimezone } from '@/lib/datetime/timezone'

const SEOUL = 'Asia/Seoul'
const atSeoulNoon = (d: string) => new Date(`${d}T12:00:00+09:00`)

afterEach(() => {
  vi.useRealTimers()
})

describe('ganjiIndex60', () => {
  it('1997 → 丁丑 idx 13 · 2026 → 丙午 idx 42 · 1984 → 甲子 idx 0', () => {
    expect(ganjiIndex60(1997)).toBe(13)
    expect(ganjiIndex60(2026)).toBe(42)
    expect(ganjiIndex60(1984)).toBe(0)
    expect(yearPillarOfSajuYear(1997)).toEqual({ stem: '丁', branch: '丑' })
  })

  it('엔진 세운 간지와 1900–2100 전 구간에서 같다', () => {
    for (let y = 1900; y <= 2100; y++) {
      const p = yearPillarOfSajuYear(y)
      const n = ganjiIndex60(y)
      expect(n).toBe(ganjiIndexOf(p.stem, p.branch))
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(60)
      expect(ganjiIndex60(y + 60)).toBe(n)
    }
  })

  it('음양이 안 맞는 짝은 -1', () => {
    expect(ganjiIndexOf('甲', '丑')).toBe(-1)
    expect(ganjiIndexOf('?', '子')).toBe(-1)
  })
})

describe('dialModel — 지금', () => {
  it('2026-11-19 → 丙午, idx 42, 가운데 "2026 · 43 / 60"', () => {
    const m = dialModel({ nowDate: atSeoulNoon('2026-11-19'), timeZone: SEOUL })
    expect(m.centre).toEqual({ ganji: '丙午', sub: '2026 · 43 / 60' })
    expect(m.now).toEqual({ stem: '丙', branch: '午', sajuYear: 2026, index: 42 })
  })

  it('立春 경계: 2027-02-03 은 아직 丙午, 2027-02-05 는 丁未 (서울)', () => {
    expect(dialModel({ nowDate: atSeoulNoon('2027-02-03'), timeZone: SEOUL }).centre.ganji).toBe(
      '丙午'
    )
    const after = dialModel({ nowDate: atSeoulNoon('2027-02-05'), timeZone: SEOUL })
    expect(after.centre).toEqual({ ganji: '丁未', sub: '2027 · 44 / 60' })
  })

  it('결정 17 — 立春 이 든 현지 날 그 자체가 새 세운 (pillarsForLocalDate 와 같다)', () => {
    // 2027-02-04 서울은 立春 일 → 丁未.
    expect(dialModel({ nowDate: '2027-02-04' }).centre.ganji).toBe(
      pillarsForLocalDateString('2027-02-04', SEOUL).year.stem +
        pillarsForLocalDateString('2027-02-04', SEOUL).year.branch
    )
    expect(dialModel({ nowDate: '2027-02-04', timeZone: SEOUL }).centre.ganji).toBe('丁未')
  })

  it('Date 입력은 보는 사람 시간대의 민용 날짜로 읽는다 (서울 · LA · 키리티마티)', () => {
    const instants = [
      '2027-02-03T10:00:00Z',
      '2027-02-03T16:00:00Z',
      '2027-02-03T22:00:00Z',
      '2027-02-04T04:00:00Z',
      '2026-12-31T20:00:00Z',
    ]
    for (const iso of instants) {
      for (const tz of [SEOUL, 'America/Los_Angeles', 'Pacific/Kiritimati']) {
        const at = new Date(iso)
        const c = getDateComponentsInTimezone(at, tz)
        const local = `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`
        const p = pillarsForLocalDateString(local, tz).year
        const m = dialModel({ nowDate: at, timeZone: tz })
        expect(m.now).toMatchObject({ stem: p.stem, branch: p.branch, sajuYear: p.sajuYear })
      }
    }
  })

  // G14 — 보는 사람 시간대가 없거나 깨졌으면 UTC(서울 아님). 2027 立春 = 2027-02-04T01:4xZ 라
  // 2027-02-03T20:00Z 는 서울(02-04 05:00)로는 立春 날이지만 UTC 로는 아직 02-03 — 丙午.
  it('시간대가 없거나 깨졌으면 UTC — 서울 기준 존으로 읽지 않는다', () => {
    const at = new Date('2027-02-03T20:00:00Z')
    expect(dialModel({ nowDate: at, timeZone: SEOUL }).centre.ganji).toBe('丁未')
    for (const tz of [undefined, null, '', 'Not/AZone']) {
      expect(dialModel({ nowDate: at, timeZone: tz }).now).toEqual(
        dialModel({ nowDate: at, timeZone: 'UTC' }).now
      )
      expect(dialModel({ nowDate: at, timeZone: tz }).centre.ganji).toBe('丙午')
    }
    // 'YYYY-MM-DD' 입력도 같은 시간대 규칙으로 節 경계 날짜를 본다.
    expect(dialModel({ nowDate: '2027-02-03', timeZone: 'Not/AZone' }).now).toEqual(
      dialModel({ nowDate: '2027-02-03', timeZone: 'UTC' }).now
    )
  })

  it('시계를 읽지 않는다 — 시스템 시각을 바꿔도 같은 모델', () => {
    const input = { nowDate: atSeoulNoon('2026-11-19'), timeZone: SEOUL, bornYear: 1997 }
    const a = dialModel(input)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('1990-01-01T00:00:00Z'))
    const b = dialModel(input)
    expect(b).toEqual(a)
  })
})

describe('dialModel — 표시와 기하 (gen9.py dial)', () => {
  const sample = () =>
    dialModel({
      nowDate: atSeoulNoon('2026-11-19'),
      timeZone: SEOUL,
      bornYear: 1997,
      turn: { year: 2032 },
    })

  it('태어난 해 1997 = 丁丑 idx 13, 인생 전환 2032 = idx 48', () => {
    const m = sample()
    expect(m.born?.n).toBe(13)
    expect(m.turn?.n).toBe(48)
    expect(m.labels.map((l) => l.text)).toEqual(['NOW', '2032', 'LIFE TURN', 'BORN · 丁丑 1997'])
  })

  it('지금·인생 전환 자리는 눈금에서 빠지고 甲년만 긴 눈금 (58개, major 6개)', () => {
    const m = sample()
    expect(m.ticks).toHaveLength(58)
    expect(m.ticks.some((t) => t.n === 42 || t.n === 48)).toBe(false)
    expect(m.ticks.filter((t) => t.major).map((t) => t.n)).toEqual([0, 10, 20, 30, 40, 50])
  })

  it('좌표가 디자인 원본과 같다 — 바늘 12시, 표시·라벨 자리', () => {
    const m = sample()
    expect(m.viewBox).toBe('0 0 300 300')
    expect(m.needle.line).toEqual({ x1: '150.0', y1: '82.0', x2: '150.0', y2: '42.0' })
    expect(m.needle.led).toEqual({ cx: '150.0', cy: '31.0', r: 3.6 })
    expect(m.born).toEqual({ n: 13, cx: '137.7', cy: '267.4', r: 3.6 })
    expect(m.turn?.rect).toEqual({ x: '216.4', y: '51.5', size: 6 })
    // gen9: 인생 전환 라벨 = (xn + 9, yn − 8) start 두 줄(줄 간격 14), 태어난 해 = (xb, yb + 20) middle.
    expect(m.labels[1]).toMatchObject({ x: '228.4', y: '46.5', anchor: 'start' })
    expect(m.labels[2]).toMatchObject({ x: '228.4', y: '60.5', anchor: 'start' })
    expect(m.labels[3]).toMatchObject({ x: '137.7', y: '287.4', anchor: 'middle' })
  })

  it('라벨은 viewBox 안에 머문다 (어느 해에 태어나도)', () => {
    for (let born = 1940; born <= 2025; born += 3) {
      const m = dialModel({ nowDate: '2026-11-19', bornYear: born, turn: { year: 2030 } })
      for (const l of m.labels) {
        const x = Number(l.x)
        const y = Number(l.y)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(300)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThanOrEqual(300)
      }
    }
  })

  it('bornYear·turn 이 없으면 표시도 라벨도 없다', () => {
    const m = dialModel({ nowDate: '2026-11-19' })
    expect(m.born).toBeNull()
    expect(m.turn).toBeNull()
    expect(m.ticks).toHaveLength(59)
    expect(m.labels.map((l) => l.text)).toEqual(['NOW'])
  })

  it('ko 라벨과 접근성 이름', () => {
    const m = dialModel({
      nowDate: '2026-11-19',
      bornYear: 1997,
      turn: { year: 2032 },
      locale: 'ko',
    })
    expect(m.labels.map((l) => l.text)).toEqual([
      '지금',
      '2032',
      '인생 전환',
      '태어난 해 · 丁丑 1997',
    ])
    expect(m.ariaLabel).toBe(
      '60년 주기: 지금 丙午 2026 (60 중 43번째) · 태어난 해 · 丁丑 1997 · 인생 전환 2032'
    )
    const en = dialModel({ nowDate: '2026-11-19', bornYear: 1997, turn: { year: 2032 } })
    expect(en.ariaLabel).toBe(
      '60-year cycle: NOW 丙午 2026 (43 of 60) · BORN · 丁丑 1997 · LIFE TURN 2032'
    )
  })

  it('영어 라벨에 한글이 없다', () => {
    for (const bi of Object.values(DIAL_LABELS)) expect(bi.en).not.toMatch(/[가-힯]/)
  })
})

describe('lib/v9/ring — 가벼운 잎 모듈', () => {
  it('yearRingIndex 산술 = 엔진 간지 색인 (1900–2100)', () => {
    for (let y = 1900; y <= 2100; y++) expect(yearRingIndex(y)).toBe(ganjiIndex60(y))
  })

  it('DIAL_LABELS 는 한 출처 (sixtyDial 이 다시 내보낸다)', () => {
    expect(DIAL_LABELS).toBe(RING_LABELS)
  })

  it('카드 뒷면 고리 — 눈금 60(양간 30) · 子년 점 5 · 12시 = 지정 색인 · 결정적', () => {
    const r = cardBackRing(42)
    expect(r.viewBox).toBe('0 0 320 344')
    expect(r.ticks).toHaveLength(60)
    expect(r.ticks.filter((t) => t.yang)).toHaveLength(30)
    expect(r.dots).toHaveLength(5)
    const top = r.ticks.find((t) => t.n === 42)!
    expect(top.x2).toBe('160.0')
    expect(top.y2).toBe('50.0')
    expect(cardBackRing(42)).toEqual(r)
  })
})
