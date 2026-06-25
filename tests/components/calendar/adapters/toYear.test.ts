import { describe, it, expect } from 'vitest'
import { toYear } from '@/components/calendar/adapters/toYear'
import { getHouseRich } from '@/lib/chart-dictionary'
import { makeNatal, makeChart, makePlanet, makeSignal, makeCell } from './_fixtures'

function natal(over = {}) {
  return makeNatal({
    dayMasterName: '甲',
    chart: makeChart({
      ascSign: 'Aries',
      planets: [makePlanet('Venus', 'Taurus', 2), makePlanet('Saturn', 'Capricorn', 10)],
    }),
    input: { year: 1990 },
    ...over,
  })
}

describe('toYear — yearly signals → destinypal year', () => {
  describe('세운 / 기본 헤드라인', () => {
    it('연도 → 세운 간지 + 일간 기준 십신 (2026=丙午, 甲 vs 丙=식신)', () => {
      const y = toYear(natal(), { year: 2026 })
      expect(y.year).toBe(2026)
      expect(y.sewoon.gz.hanja).toBe('丙午')
      expect(y.sewoonGz.hanja).toBe('丙午')
      expect(y.sewoonSibsin).toBe('식신')
      expect(y.sewoon.sibsin).toBe('식신')
    })

    it('일간이 한글이면 십신 "—" 폴백', () => {
      const y = toYear(natal({ dayMasterName: '갑' }), { year: 2026 })
      expect(y.sewoonSibsin).toBe('—')
    })

    it('profection 없으면 기본 헤드라인 / astroNote 빈 문자열', () => {
      const y = toYear(natal(), { year: 2026 })
      expect(y.headline).toBe('2026년 — 흐름이 새로 짜이는 해.')
      expect(y.astroNote).toBe('')
      // KO 사주 노트 — 한자 음(병오)로 평이화, 완결 문장. raw 한자 없음.
      expect(y.sajuNote).toContain('병오')
      expect(y.sajuNote).not.toMatch(/[一-鿿]/)
    })

    it('영문 노트/헤드라인이 채워지고 한글·한자 누수가 없다 (no Hangul/Hanja)', () => {
      const y = toYear(natal(), { year: 2026 })
      // 헤드라인 영문 — 한글 없음
      expect(y.headlineEn).toBe('2026 — a year the flow gets re-drawn.')
      expect(y.headlineEn).not.toMatch(/[가-힣]/)
      // 사주 노트 영문 — 로마자 음 + 영문 십신명. raw 한자/한글 누수 없음.
      expect(y.sajuNoteEn).toContain('Byeongo')
      expect(y.sajuNoteEn).toContain('day master')
      expect(y.sajuNoteEn).not.toMatch(/[가-힣一-鿿]/)
      // profection 없으면 astroNoteEn 빈 문자열
      expect(y.astroNoteEn).toBe('')
    })

    it('headline / sajuNote / astroNote (+En) 옵션 직주입', () => {
      const y = toYear(natal(), {
        year: 2026,
        headline: 'H',
        headlineEn: 'HE',
        sajuNote: 'S',
        sajuNoteEn: 'SE',
        astroNote: 'A',
        astroNoteEn: 'AE',
      })
      expect(y.headline).toBe('H')
      expect(y.headlineEn).toBe('HE')
      expect(y.sajuNote).toBe('S')
      expect(y.sajuNoteEn).toBe('SE')
      expect(y.astroNote).toBe('A')
      expect(y.astroNoteEn).toBe('AE')
    })
  })

  describe('profection 추출', () => {
    function profSignal(over = {}) {
      return makeSignal({
        kind: 'profection',
        source: 'astro',
        name: 'Profection',
        layer: 'yearly',
        evidence: {
          module: 'm',
          detail: { activatedHouse: 7, activatedSign: 'Libra', lordOfYear: 'Venus' },
          houses: [7],
          planets: ['Venus'],
        },
        ...over,
      })
    }

    it('house / theme / cusp / ruler / rulerNatal 추출', () => {
      const y = toYear(natal(), { year: 2026, yearlySignals: [profSignal()] })
      expect(y.profection).toBeDefined()
      const p = y.profection!
      expect(p.house).toBe(7)
      expect(p.theme).toBe('관계 · 파트너')
      expect(p.themeEn).toBe('Partnership')
      expect(p.cusp).toBe('천칭자리')
      expect(p.cuspEn).toBe('Libra')
      expect(p.ruler).toBe('금성')
      expect(p.rulerEn).toBe('Venus')
      // 본명 Venus 는 Taurus 2궁 → rulerNatal
      expect(p.rulerNatal).toBe('2궁 (황소자리)')
      expect(p.rulerNatalEn).toBe('2nd house · Taurus')
      expect(p.rulerNatalHouse).toBe(2)
      expect(p.rulerNatalSign).toBe('Taurus')
      // 리치 하우스 풀이가 astro-house-rich.json 에서 surface (가드+폴백).
      expect(p.houseMeaning).toBe(getHouseRich(7, 'ko')!.meaning)
      expect(p.houseMeaning.length).toBeGreaterThan(0)
      expect(p.houseMeaningEn).toBe(getHouseRich(7, 'en')!.meaning)
    })

    it('house 8 profection → 리치 하우스 풀이(공유 자원·빚·친밀감) surface', () => {
      const sig = profSignal({
        evidence: {
          module: 'm',
          detail: { activatedHouse: 8, activatedSign: 'Virgo', lordOfYear: 'Venus' },
          houses: [8],
          planets: ['Venus'],
        },
      })
      const y = toYear(natal(), { year: 2026, yearlySignals: [sig] })
      const p = y.profection!
      expect(p.house).toBe(8)
      // 8하우스 meaning 의 평이한 핵심 문구가 그대로 노출됨.
      expect(p.houseMeaning).toContain('공동 재산, 배우자의 돈, 빚·세금·유산')
      expect(p.houseMeaningEn).toContain("a partner's money")
    })

    it('profection 있으면 헤드라인/astroNote 가 house 를 반영', () => {
      const y = toYear(natal(), { year: 2026, yearlySignals: [profSignal()] })
      expect(y.headline).toContain('7번째 영역')
      expect(y.astroNote).toContain('7하우스')
    })

    it('profection 있으면 영문 헤드라인/astroNote 도 house 반영 + 한글 누수 없음', () => {
      const y = toYear(natal(), { year: 2026, yearlySignals: [profSignal()] })
      expect(y.headlineEn).toBe('This year leans toward your 7th house.')
      expect(y.headlineEn).not.toMatch(/[가-힣]/)
      // ruler Venus / 본명 2nd house · Taurus 가 영문으로
      expect(y.astroNoteEn).toContain('house 7')
      expect(y.astroNoteEn).toContain('Venus')
      expect(y.astroNoteEn).toContain('2nd house · Taurus')
      expect(y.astroNoteEn).not.toMatch(/[가-힣]/)
    })

    it('house 정보가 전혀 없으면 profection undefined', () => {
      const sig = makeSignal({
        kind: 'profection',
        source: 'astro',
        layer: 'yearly',
        evidence: { module: 'm', detail: {} },
      })
      const y = toYear(natal(), { year: 2026, yearlySignals: [sig] })
      expect(y.profection).toBeUndefined()
    })

    it('본명 룰러 행성이 차트에 없으면 rulerNatal 빈, house 0', () => {
      // ruler Jupiter 인데 차트에 없음
      const sig = profSignal({
        evidence: {
          module: 'm',
          detail: { activatedHouse: 9, activatedSign: 'Sagittarius', lordOfYear: 'Jupiter' },
          houses: [9],
          planets: ['Jupiter'],
        },
      })
      const y = toYear(natal(), { year: 2026, yearlySignals: [sig] })
      expect(y.profection!.rulerNatal).toBe('')
      expect(y.profection!.rulerNatalHouse).toBe(0)
      expect(y.profection!.rulerNatalSign).toBe('Aries')
    })
  })

  describe('profectionWheel', () => {
    it('12 슬롯 — Asc(Aries) 부터 whole-sign 순서, 본명 행성 배치', () => {
      const y = toYear(natal(), { year: 2026 })
      expect(y.profectionWheel).toHaveLength(12)
      expect(y.profectionWheel[0].cuspSign).toBe('Aries')
      expect(y.profectionWheel[0].cuspRuler).toBe('Mars')
      // 2궁 = Taurus, 본명 Venus 위치
      expect(y.profectionWheel[1].cuspSign).toBe('Taurus')
      expect(y.profectionWheel[1].natalPlanets).toEqual(['Venus'])
      // 10궁 = Capricorn, 본명 Saturn
      expect(y.profectionWheel[9].cuspSign).toBe('Capricorn')
      expect(y.profectionWheel[9].natalPlanets).toEqual(['Saturn'])
    })

    it('Asc 결손 시 Aries 폴백', () => {
      const chart = makeChart({ ascSign: 'Aries' })
      // ascendant 제거
      // @ts-expect-error 결손 경로
      chart.ascendant = undefined
      const y = toYear(natal({ chart }), { year: 2026 })
      expect(y.profectionWheel[0].cuspSign).toBe('Aries')
    })

    it('활성 house 슬롯만 active=true', () => {
      const sig = makeSignal({
        kind: 'profection',
        source: 'astro',
        layer: 'yearly',
        evidence: { module: 'm', detail: { activatedHouse: 3 }, houses: [3] },
      })
      const y = toYear(natal(), { year: 2026, yearlySignals: [sig] })
      expect(y.profectionWheel.filter((s) => s.active)).toHaveLength(1)
      expect(y.profectionWheel.find((s) => s.active)!.house).toBe(3)
    })
  })

  describe('monthlyScores', () => {
    it('cells 없고 monthlyLayer 없으면 빈 배열', () => {
      expect(toYear(natal(), { year: 2026 }).monthlyScores).toEqual([])
    })

    it('monthlyLayer 가 12 슬롯을 직접 채운다', () => {
      const layer = new Map([
        [1, { score: 70 }],
        [6, { score: 30 }],
      ])
      const y = toYear(natal(), { year: 2026, monthlyLayer: layer })
      expect(y.monthlyScores).toHaveLength(12)
      expect(y.monthlyScores![0]).toMatchObject({ month: 1, score: 70 })
      expect(y.monthlyScores![5]).toMatchObject({ month: 6, score: 30 })
      // 미지정 달은 fallback 50
      expect(y.monthlyScores![1].score).toBe(50)
    })

    it('cells 로 salience peak 정규화 + bestDay', () => {
      const cells = [
        makeCell({ datetime: '2026-03-10T00:00:00.000Z', salience: 10, derivedScore: 40 }),
        makeCell({ datetime: '2026-03-20T00:00:00.000Z', salience: 5, derivedScore: 90 }),
        makeCell({ datetime: '2026-08-05T00:00:00.000Z', salience: 2, derivedScore: 60 }),
      ]
      const y = toYear(natal(), { year: 2026, cells })
      expect(y.monthlyScores).toHaveLength(12)
      const mar = y.monthlyScores!.find((m) => m.month === 3)!
      // peak salience = 10 (max), hi=10 lo=2 → norm(10)=100
      expect(mar.score).toBe(100)
      expect(mar.bestDay).toBe('2026-03-20') // 최고 derivedScore 날
      const aug = y.monthlyScores!.find((m) => m.month === 8)!
      // peak 2 = lo → norm 0
      expect(aug.score).toBe(0)
      // 데이터 없는 달은 fallback 50
      const jan = y.monthlyScores!.find((m) => m.month === 1)!
      expect(jan.score).toBe(50)
    })
  })

  describe('crossings (cells → 월 구간 교차)', () => {
    function crossSignal(over: {
      name: string
      start: string
      end: string
      polarity: number
      layer?: 'yearly' | 'monthly'
      korean?: string
      sajuKey?: string
      astroKey?: string
    }) {
      return makeSignal({
        kind: 'cross-activation',
        source: 'astro',
        name: over.name,
        layer: over.layer ?? 'yearly',
        polarity: over.polarity as never,
        korean: over.korean,
        active: { start: over.start, peak: over.start, end: over.end },
        evidence: { module: 'm', detail: { sajuKey: over.sajuKey, astroKey: over.astroKey } },
      })
    }

    it('cells 없으면 빈 배열', () => {
      expect(toYear(natal(), { year: 2026 }).crossings).toEqual([])
    })

    it('dated 교차 — 월 구간 라벨 + 톤 + 영문 이름', () => {
      const cell = makeCell({
        datetime: '2026-03-15T00:00:00.000Z',
        signals: [
          crossSignal({
            name: '정관 × 토성',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-05-01T00:00:00.000Z',
            polarity: 2,
            korean: '책임 페어',
            sajuKey: '정관',
            astroKey: 'Saturn',
          }),
        ],
      })
      const y = toYear(natal(), { year: 2026, cells: [cell] })
      expect(y.crossings).toHaveLength(1)
      const c = y.crossings[0]
      // 제목은 쉬운말 — '정관 × 토성' → '일·책임 × 책임·인내'
      expect(c.title).toBe('일·책임 × 책임·인내')
      expect(c.when).toBe('3–5월')
      expect(c.whenEn).toBe('Mar–May')
      expect(c.tone).toBe('good')
      expect(c.detail).toBe('책임 페어')
      // 영문 제목도 쉬운말 (한글 누수 없음)
      expect(c.titleEn).toBe('duty & standing × duty & limits')
      expect(c.titleEn).not.toMatch(/[가-힣]/)
    })

    it('polarity 부호 → tone (good/caution/neutral)', () => {
      const mk = (name: string, pol: number) =>
        makeCell({
          datetime: '2026-02-10T00:00:00.000Z',
          signals: [
            crossSignal({
              name,
              start: '2026-02-01T00:00:00.000Z',
              end: '2026-02-28T00:00:00.000Z',
              polarity: pol,
            }),
          ],
        })
      const y = toYear(natal(), { year: 2026, cells: [mk('A', 2), mk('B', -2), mk('C', 0)] })
      const byTitle = Object.fromEntries(y.crossings.map((c) => [c.title, c.tone]))
      expect(byTitle['A']).toBe('good')
      expect(byTitle['B']).toBe('caution')
      // neutral(polarity 0) 은 dated 라 포함됨 (yearLong 만 중립 필터)
      expect(byTitle['C']).toBe('neutral')
    })

    it('같은 이름 교차는 dedup, 활성 창 합쳐 가장 넓은 구간', () => {
      const cells = [
        makeCell({
          datetime: '2026-01-10T00:00:00.000Z',
          signals: [
            crossSignal({
              name: '동일',
              start: '2026-01-01T00:00:00.000Z',
              end: '2026-02-01T00:00:00.000Z',
              polarity: 1,
            }),
          ],
        }),
        makeCell({
          datetime: '2026-06-10T00:00:00.000Z',
          signals: [
            crossSignal({
              name: '동일',
              start: '2026-05-01T00:00:00.000Z',
              end: '2026-07-01T00:00:00.000Z',
              polarity: 3,
            }),
          ],
        }),
      ]
      const y = toYear(natal(), { year: 2026, cells })
      expect(y.crossings).toHaveLength(1)
      // 합쳐진 구간 1월~7월 → '1–7월'
      expect(y.crossings[0].when).toBe('1–7월')
    })

    it('day-layer cross 는 무시 (yearly/monthly 만)', () => {
      const cell = makeCell({
        datetime: '2026-03-15T00:00:00.000Z',
        signals: [
          crossSignal({
            name: '일교차',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-03-02T00:00:00.000Z',
            polarity: 2,
            layer: 'daily' as never,
          }),
        ],
      })
      const y = toYear(natal(), { year: 2026, cells: [cell] })
      expect(y.crossings).toEqual([])
    })

    it('연중(10개월+) 교차 — 중립 제외, 강한 것 최대 5개', () => {
      // 6개 yearLong 교차, 그 중 1개 중립
      const cells = Array.from({ length: 6 }, (_, i) =>
        makeCell({
          datetime: '2026-06-15T00:00:00.000Z',
          signals: [
            crossSignal({
              name: `YL${i}`,
              start: '2026-01-01T00:00:00.000Z',
              end: '2026-12-31T00:00:00.000Z',
              polarity: i === 0 ? 0 : i, // YL0 중립
              astroKey: `Body${i}`,
            }),
          ],
        })
      )
      const y = toYear(natal(), { year: 2026, cells })
      // 중립(YL0) 제외 + 최대 5개
      expect(y.crossings.length).toBeLessThanOrEqual(5)
      expect(y.crossings.find((c) => c.title === 'YL0')).toBeUndefined()
      expect(y.crossings.every((c) => c.when === '연중')).toBe(true)
    })
  })

  describe('ZR Spirit / Fortune 챕터 투영', () => {
    it('periods 없으면 빈 배열', () => {
      const y = toYear(natal(), { year: 2026 })
      expect(y.zrSpiritChapters).toEqual([])
      expect(y.zrFortuneChapters).toEqual([])
    })

    it('현재 해와 겹치는 챕터만 투영 + now 플래그', () => {
      // birthYear 1990. period startYear 30(=2020) endYear 50(=2040) → 2026 겹침
      const zr = {
        spirit: {
          startSign: 'Cancer',
          periods: [
            { startYear: 0, endYear: 30, sign: 'Cancer' }, // 1990~2020 → 제외
            { startYear: 30, endYear: 50, sign: 'Leo' }, // 2020~2040 → 포함, now
            { startYear: 50, endYear: 60, sign: 'Virgo' }, // 2040~ → break
          ],
        },
        fortune: null,
      }
      const y = toYear(natal({ zodiacalReleasing: zr, input: { year: 1990 } }), { year: 2026 })
      expect(y.zrSpiritChapters).toHaveLength(1)
      expect(y.zrSpiritChapters[0]).toMatchObject({
        startLot: 'Spirit',
        calendarStartYear: 2020,
        calendarEndYear: 2040,
        now: true,
      })
      expect(y.zrFortuneChapters).toEqual([])
    })

    it('경계 연도가 걸치면 두 챕터 포함', () => {
      const zr = {
        spirit: {
          startSign: 'Cancer',
          periods: [
            { startYear: 16, endYear: 36, sign: 'Cancer' }, // 2006~2026 → calEnd=2026 <= 2026? 제외
            { startYear: 36, endYear: 50, sign: 'Leo' }, // 2026~2040 → 포함
          ],
        },
        fortune: null,
      }
      const y = toYear(natal({ zodiacalReleasing: zr, input: { year: 1990 } }), { year: 2026 })
      // calEnd <= currentYear 면 제외 → 첫 번째(끝 2026)는 빠지고 두 번째만
      expect(y.zrSpiritChapters.map((c) => c.calendarStartYear)).toEqual([2026])
    })
  })
})
