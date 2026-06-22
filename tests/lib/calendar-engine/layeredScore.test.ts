/**
 * deriveLayeredScores — 층별(일/월) signed-surprise 점수 단위 테스트.
 *
 * 순수 함수 (입력 CalendarCell[] → LayeredScores). 네트워크/DB 무사용.
 * surprise.ts 의 base-rate · importance 수식을 손으로 따라 기대값을 계산해 단언한다.
 *
 *   importance = (−log P) × |polarity| × weight   (단, 정적 본명 kind 또는 P≥1 → 0)
 *   signedSurprise = top-k 의 sign(pol)·importance 합
 *   linearMapper: 0~100 = round(50 + z·K),  K = clamp(min24/zmax, min24/-zmin, [16,40])
 */
import { describe, it, expect } from 'vitest'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { computeBaseRates, signalImportance } from '@/lib/calendar-engine/derivers/surprise'
import { scoreToGrade } from '@/lib/calendar-engine/derivers/grade'
import type {
  ActiveSignal,
  CalendarCell,
  SignalLayer,
  SignalKind,
  Polarity,
} from '@/lib/calendar-engine/types'

// ── fixture builders ──────────────────────────────────────────────
let __sigSeq = 0
function sig(opts: {
  id?: string
  name?: string
  korean?: string
  layer: SignalLayer
  polarity: Polarity
  weight?: number
  kind?: SignalKind
}): ActiveSignal {
  const id = opts.id ?? `sig.${__sigSeq++}`
  return {
    id,
    source: 'saju',
    kind: opts.kind ?? 'pillar-sibsin',
    name: opts.name ?? id,
    korean: opts.korean,
    polarity: opts.polarity,
    layer: opts.layer,
    active: {
      start: '2026-01-01T00:00:00.000Z',
      peak: '2026-01-01T12:00:00.000Z',
      end: '2026-01-01T23:59:59.999Z',
    },
    weight: opts.weight ?? 1,
    evidence: { module: 'test', detail: {} },
  }
}

function cell(datetime: string, signals: ActiveSignal[]): CalendarCell {
  return {
    datetime,
    signals,
    derivedScore: 50,
    salience: 0,
    matchedPatterns: [],
    topReasons: [],
    cautions: [],
  }
}

function dayISO(month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `2026-${mm}-${dd}T00:00:00.000Z`
}

describe('deriveLayeredScores', () => {
  describe('기본 구조', () => {
    it('빈 cells 입력 — daily 비었고 monthly 는 12 슬롯', () => {
      const out = deriveLayeredScores([])
      expect(out.daily.size).toBe(0)
      // monthly 는 1~12 항상 채워진다 (cells 가 없어도 12 슬롯 생성).
      expect(out.monthly.size).toBe(12)
    })

    it('빈 cells 일 때 monthly 12개월 모두 signed 0 · score 50 · grade 2', () => {
      const out = deriveLayeredScores([])
      for (let m = 1; m <= 12; m++) {
        const c = out.monthly.get(m)
        expect(c).toBeDefined()
        expect(c!.signed).toBe(0)
        // n=0 이 아니라 12개 동일값 → sd=0→1, z=0 → 50
        expect(c!.score).toBe(50)
        expect(c!.grade).toBe(2)
      }
    })

    it('각 날짜마다 daily 맵 엔트리를 만든다 (key = YYYY-MM-DD)', () => {
      const cells = [
        cell(dayISO(3, 1), [sig({ layer: 'daily', polarity: 1 })]),
        cell(dayISO(3, 2), [sig({ layer: 'daily', polarity: 1 })]),
      ]
      const out = deriveLayeredScores(cells)
      expect([...out.daily.keys()].sort()).toEqual(['2026-03-01', '2026-03-02'])
    })
  })

  describe('signed=0 (변별 신호 없음) 경로', () => {
    it('모든 셀에 늘 켜진(P=1) 신호만 있으면 signed 0 · score 50', () => {
      // 동일 typeKey 가 모든 셀에 → P=1 → rarity 0 → importance 0.
      const cells = Array.from({ length: 5 }, (_, i) =>
        cell(dayISO(1, i + 1), [sig({ name: '늘켜짐', layer: 'daily', polarity: 2 })])
      )
      const out = deriveLayeredScores(cells)
      for (const v of out.daily.values()) {
        expect(v.signed).toBe(0)
        expect(v.score).toBe(50)
        expect(v.grade).toBe(2)
      }
    })

    it('polarity 0 신호는 importance 0 → signed 에 기여 안 함', () => {
      const cells = [
        cell(dayISO(2, 1), [sig({ name: '무극성', layer: 'daily', polarity: 0 })]),
        cell(dayISO(2, 2), []),
        cell(dayISO(2, 3), []),
      ]
      const out = deriveLayeredScores(cells)
      for (const v of out.daily.values()) expect(v.signed).toBe(0)
    })

    it('STATIC_NATAL_KIND 신호는 rarity 0 → 기여 안 함', () => {
      // saju-pattern 은 STATIC_NATAL_KINDS 에 들어있어 rarity 강제 0.
      const cells = [
        cell(dayISO(4, 1), [
          sig({ name: 'static', kind: 'saju-pattern', layer: 'daily', polarity: 3 }),
        ]),
        cell(dayISO(4, 2), []),
        cell(dayISO(4, 3), []),
      ]
      const out = deriveLayeredScores(cells)
      for (const v of out.daily.values()) expect(v.signed).toBe(0)
    })
  })

  describe('daily — 분포 정규화 + 부호', () => {
    it('드문 길신호가 있는 날이 가장 높은 점수, 빈 날은 낮은 점수', () => {
      // 1일에만 강한 +신호(나머지 9일은 빈 셀) → P=0.1, rarity=−ln0.1 큼.
      const cells: CalendarCell[] = []
      cells.push(
        cell(dayISO(5, 1), [sig({ name: '드문길', layer: 'daily', polarity: 3, weight: 1 })])
      )
      for (let d = 2; d <= 10; d++) cells.push(cell(dayISO(5, d), []))
      const out = deriveLayeredScores(cells)
      const hi = out.daily.get('2026-05-01')!
      const lo = out.daily.get('2026-05-02')!
      expect(hi.signed).toBeGreaterThan(0)
      expect(lo.signed).toBe(0)
      expect(hi.score).toBeGreaterThan(lo.score)
      // 최고일 점수는 0~100 범위 안.
      expect(hi.score).toBeGreaterThanOrEqual(0)
      expect(hi.score).toBeLessThanOrEqual(100)
    })

    it('드문 흉신호 날은 음(−) signed → 평균 이하 점수', () => {
      const cells: CalendarCell[] = []
      cells.push(cell(dayISO(6, 1), [sig({ name: '드문흉', layer: 'daily', polarity: -3 })]))
      for (let d = 2; d <= 10; d++) cells.push(cell(dayISO(6, d), []))
      const out = deriveLayeredScores(cells)
      const bad = out.daily.get('2026-06-01')!
      expect(bad.signed).toBeLessThan(0)
      // 음수 signed → z<0 → 점수 < 50.
      expect(bad.score).toBeLessThan(50)
    })

    it('signed 값은 signedSurprise(직접 계산)와 일치한다', () => {
      const cells: CalendarCell[] = []
      const target = sig({ name: '검증신호', layer: 'daily', polarity: 2, weight: 0.5 })
      cells.push(cell(dayISO(7, 1), [target]))
      for (let d = 2; d <= 5; d++) cells.push(cell(dayISO(7, d), []))
      const out = deriveLayeredScores(cells)
      const rates = computeBaseRates(cells)
      const expectedImp = signalImportance(target, rates)
      // 단일 +신호 → signedSurprise = +imp.
      expect(out.daily.get('2026-07-01')!.signed).toBeCloseTo(expectedImp, 10)
      expect(expectedImp).toBeGreaterThan(0)
    })

    it('일진/시진/instant 층만 daily 에 들어가고 monthly 층은 daily 에서 제외', () => {
      // 한 셀에 daily + monthly 동시 — daily 점수엔 monthly 가 안 섞임.
      const cells: CalendarCell[] = []
      cells.push(cell(dayISO(8, 1), [sig({ name: '월운만', layer: 'monthly', polarity: 3 })]))
      for (let d = 2; d <= 5; d++) cells.push(cell(dayISO(8, d), []))
      const out = deriveLayeredScores(cells)
      // daily 층 신호가 0개라 모든 날 signed 0.
      for (const v of out.daily.values()) expect(v.signed).toBe(0)
    })

    it('hourly·instant 층도 daily 점수에 반영된다', () => {
      const cells: CalendarCell[] = []
      cells.push(cell(dayISO(9, 1), [sig({ name: '시진', layer: 'hourly', polarity: 2 })]))
      cells.push(cell(dayISO(9, 2), [sig({ name: '정점', layer: 'instant', polarity: 2 })]))
      for (let d = 3; d <= 6; d++) cells.push(cell(dayISO(9, d), []))
      const out = deriveLayeredScores(cells)
      expect(out.daily.get('2026-09-01')!.signed).toBeGreaterThan(0)
      expect(out.daily.get('2026-09-02')!.signed).toBeGreaterThan(0)
    })

    it('같은 날짜에 여러 셀(시간대)이면 같은 date 키로 여러 엔트리가 들어가 마지막 값이 남는다', () => {
      // dailySigned 는 셀마다 push 하지만 Map.set 은 같은 키 덮어쓴다.
      const cells = [
        cell('2026-10-01T00:00:00.000Z', [sig({ name: 'a', layer: 'daily', polarity: 1 })]),
        cell('2026-10-01T12:00:00.000Z', []),
      ]
      const out = deriveLayeredScores(cells)
      // 같은 날짜 → 1개 엔트리.
      expect([...out.daily.keys()]).toEqual(['2026-10-01'])
    })

    it('score 와 grade 는 scoreToGrade 와 정합한다', () => {
      const cells: CalendarCell[] = []
      cells.push(cell(dayISO(11, 1), [sig({ name: '강길', layer: 'daily', polarity: 3 })]))
      cells.push(cell(dayISO(11, 2), [sig({ name: '강흉', layer: 'daily', polarity: -3 })]))
      for (let d = 3; d <= 10; d++) cells.push(cell(dayISO(11, d), []))
      const out = deriveLayeredScores(cells)
      for (const v of out.daily.values()) {
        expect(v.grade).toBe(scoreToGrade(v.score))
        expect(v.score).toBeGreaterThanOrEqual(0)
        expect(v.score).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('monthly — 12개월 분포 + dedup', () => {
    it('특정 월에만 드문 +신호 → 그 달이 가장 높은 점수', () => {
      const cells: CalendarCell[] = []
      // 3월에 강한 월운 +신호, 다른 달은 빈 셀.
      for (let m = 1; m <= 12; m++) {
        const signals = m === 3 ? [sig({ name: '봄월운', layer: 'monthly', polarity: 3 })] : []
        cells.push(cell(dayISO(m, 15), signals))
      }
      const out = deriveLayeredScores(cells)
      const march = out.monthly.get(3)!
      expect(march.signed).toBeGreaterThan(0)
      const others = [...out.monthly.entries()].filter(([m]) => m !== 3)
      for (const [, v] of others) {
        expect(v.signed).toBe(0)
        expect(march.score).toBeGreaterThan(v.score)
      }
    })

    it('같은 id 월운 신호가 월 안에서 dedup 된다', () => {
      // 같은 달에 같은 id 신호 2번 → dedupById 로 1번만 카운트.
      const dupId = 'dup-monthly'
      const cells: CalendarCell[] = []
      cells.push(
        cell(dayISO(4, 1), [sig({ id: dupId, name: '중복월운', layer: 'monthly', polarity: 2 })])
      )
      cells.push(
        cell(dayISO(4, 2), [sig({ id: dupId, name: '중복월운', layer: 'monthly', polarity: 2 })])
      )
      // 다른 달은 빈.
      for (let m = 5; m <= 12; m++) cells.push(cell(dayISO(m, 1), []))
      const out = deriveLayeredScores(cells)
      // dedup → 4월 signed 는 단일 신호 기여만.
      const rates = computeBaseRates(cells)
      const single = signalImportance(
        sig({ id: dupId, name: '중복월운', layer: 'monthly', polarity: 2 }),
        rates
      )
      expect(out.monthly.get(4)!.signed).toBeCloseTo(single, 8)
    })

    it('월 매칭은 datetime 의 MM 슬라이스로만 — 다른 달 신호는 안 섞인다', () => {
      const cells = [
        cell(dayISO(1, 10), [sig({ name: '1월', layer: 'monthly', polarity: 2 })]),
        cell(dayISO(2, 10), [sig({ name: '2월', layer: 'monthly', polarity: -2 })]),
      ]
      const out = deriveLayeredScores(cells)
      expect(out.monthly.get(1)!.signed).toBeGreaterThan(0)
      expect(out.monthly.get(2)!.signed).toBeLessThan(0)
    })
  })

  describe('top-k 절단 (topK=8)', () => {
    it('9개 이상 daily 신호여도 상위 8개만 합산된다', () => {
      // 한 날에 서로 다른 id 의 +신호 10개 (각각 P 작게 만들기 위해 채움 셀 다수).
      const big = Array.from({ length: 10 }, (_, i) =>
        sig({ id: `many-${i}`, name: `다신호${i}`, layer: 'daily', polarity: 1, weight: 1 })
      )
      const cells: CalendarCell[] = [cell(dayISO(2, 1), big)]
      for (let d = 2; d <= 20; d++) cells.push(cell(dayISO(2, d), []))
      const out = deriveLayeredScores(cells)
      const rates = computeBaseRates(cells)
      // 10개 모두 같은 rarity/importance → 상위 8개만.
      const perImp = signalImportance(big[0], rates)
      expect(out.daily.get('2026-02-01')!.signed).toBeCloseTo(perImp * 8, 6)
    })
  })
})
