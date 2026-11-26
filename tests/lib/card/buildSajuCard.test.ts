/**
 * buildSajuCardData — 사주 카드 데이터 빌더(리포트와 같은 길, now 주입).
 *
 *  - 샘플 1997-03-21 14:30 여 서울(now 2026-11-19): 기둥 · 읽기 · 일간 · 빅 쓰리 · 사주 타입 ·
 *    인생 모양 · 정체성 판정 · 합의 줄(= tallyCrossRows 같음 + 서로 도움 / 전체). 시주는 데이터에
 *    없다(카드는 숨김 칸).
 *  - 출생시각 미상 · 출생지 미상: ASC = null(교차 행과 같은 가림 규칙).
 *  - 미성년: 연애 · 재물 축이 빠져 전체 수가 줄어든다(고정 15 · 16 이 아니다).
 *  - 결정론: 같은 now 두 번 = 깊은 동일. lib/card 안에 시계 읽기가 없다(grep 가드).
 *
 * 실제 Swiss Ephemeris(node 환경, swisseph unmock) — native swisseph 가 없으면 로컬에선 skip,
 * CI 에선 실패한다(tests/helpers/realEphemeris.ts).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const { describeRealEphemeris } = await import('../../helpers/realEphemeris')
const { buildSajuCardData, buildSajuCardReading, toTraitRow } =
  await import('@/lib/card/buildSajuCard')
const { tallyCrossRows } = await import('@/lib/report/natalCross')
const { buildReportContext } = await import('@/lib/report/buildReportContext')
const { lifeShapeFor } = await import('@/lib/calendar-view/lifeShape')

const NOW = new Date('2026-11-19T03:00:00.000Z')
const SEOUL = { timeZone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 }
const SAMPLE = { date: '1997-03-21', time: '14:30', gender: 'female' as const, ...SEOUL }

describeRealEphemeris('buildSajuCardData (real ephemeris)', () => {
  it('샘플 1997-03-21 14:30 여 서울 — 기둥 · 빅 쓰리 · 타입 · 정체성 · 합의 줄', async () => {
    const { card, crossRows } = await buildSajuCardReading({ birth: SAMPLE, now: NOW })

    // 기둥 — 시주는 데이터에 없다(숨김 칸).
    expect(card.pillars.hour).toBeNull()
    expect(card.hourHidden).toBe(true)
    const gz = (k: 'year' | 'month' | 'day') => card.pillars[k].stem + card.pillars[k].branch
    expect([gz('year'), gz('month'), gz('day')]).toEqual(['丁丑', '癸卯', '壬戌'])
    expect([card.pillars.year.roman, card.pillars.month.roman, card.pillars.day.roman]).toEqual([
      'Jeongchuk',
      'Gyemyo',
      'Imsul',
    ])
    expect([card.pillars.year.hangul, card.pillars.month.hangul, card.pillars.day.hangul]).toEqual([
      '정축',
      '계묘',
      '임술',
    ])
    expect(card.pillars.day.element).toEqual({ stem: 'water', branch: 'earth' })
    expect(card.dayMaster).toEqual({ stem: '壬', element: 'water' })

    expect(card.bigThree).toEqual({
      sun: { ko: '양자리', en: 'Aries' },
      moon: { ko: '사자자리', en: 'Leo' },
      asc: { ko: '사자자리', en: 'Leo' },
    })
    // 사주 타입 — 주도 십성 정재(2) + 일간 壬(결정 2: 사주만으로 계산).
    expect(card.typeName).toEqual({ ko: '착실히 쌓는 자유인', en: 'steady-building Free Spirit' })

    // 인생 모양 — /destiny 와 같은 곡선 파이프라인(lifeShapeFor). 엔진 E4(신약 · 용신 金) 이후
    // 이 샘플의 곡선은 굴곡형이다(계획 당시의 '대기만성형'은 엔진 수정 전 값).
    expect(card.lifeShape).toEqual({ ko: '굴곡형', en: 'Ups and downs' })
    const natal = await buildReportContext({
      birthDate: SAMPLE.date,
      birthTime: SAMPLE.time,
      gender: SAMPLE.gender,
      latitude: SAMPLE.latitude,
      longitude: SAMPLE.longitude,
      timeZone: SAMPLE.timeZone,
      now: NOW,
    })
    const shape = await lifeShapeFor(natal, NOW)
    expect(card.lifeShape).toEqual({ ko: shape?.ko, en: shape?.en })

    // 정체성 — 壬 수 × 양자리 화 → 두 결(리포트 '정체성' 행과 같은 판정).
    expect(card.identity).toEqual({ saju: 'water', astro: 'fire', verdictKey: 'tension' })
    expect(crossRows.en.find((r) => r.key === 'identity')?.tone).toBe('tension')

    // 합의 줄 = tallyCrossRows(같음 + 서로 도움) / 전체 — 언어와 무관.
    const tally = tallyCrossRows(crossRows.en)
    expect(tallyCrossRows(crossRows.ko)).toEqual(tally)
    expect(card.agree).toEqual({ lineUp: tally.same + tally.supportive, total: tally.total })
    expect(card.agree).toEqual({ lineUp: 13, total: 16 })

    // 개인정보 — 생년월일 · 시각 · 출생 연도는 데이터에 없다.
    const json = JSON.stringify(card)
    for (const leak of ['1997', '03-21', '14:30', '2026']) expect(json).not.toContain(leak)
    expect(card.backYear).toBeUndefined()
  }, 120_000)

  it('출생시각 미상 — ASC 없음 · 시주 없음, 년 · 월 · 일주는 그대로', async () => {
    const card = await buildSajuCardData({
      birth: { ...SAMPLE, time: '', timeUnknown: true },
      now: NOW,
    })
    expect(card.bigThree.asc).toBeNull()
    expect(card.pillars.hour).toBeNull()
    expect(card.pillars.day.stem + card.pillars.day.branch).toBe('壬戌')
    expect(card.bigThree.sun).toEqual({ ko: '양자리', en: 'Aries' })
    expect(card.agree && card.agree.total).toBeGreaterThan(0)
  }, 120_000)

  it('출생지 미상(좌표 없음) — ASC 없음', async () => {
    const card = await buildSajuCardData({
      birth: { ...SAMPLE, latitude: null, longitude: null },
      now: NOW,
    })
    expect(card.bigThree.asc).toBeNull()
    expect(card.bigThree.moon).toEqual({ ko: '사자자리', en: 'Leo' })
  }, 120_000)

  it('미성년 — 연애 · 재물 축이 빠지고 전체 수는 실제 행 수', async () => {
    const minor = { date: '2014-08-15', time: '10:00', gender: 'male' as const, ...SEOUL }
    const { card, crossRows } = await buildSajuCardReading({ birth: minor, now: NOW })
    const keys = crossRows.en.map((r) => r.key)
    expect(keys).not.toContain('romance')
    expect(keys).not.toContain('wealth')
    const tally = tallyCrossRows(crossRows.en)
    expect(card.agree).toEqual({ lineUp: tally.same + tally.supportive, total: tally.total })
    // 같은 사람이 성인이 된 뒤(now +10년)에는 두 축이 돌아온다 — 전체 수가 고정값이 아니다.
    const adult = await buildSajuCardReading({
      birth: minor,
      now: new Date('2036-11-19T03:00:00.000Z'),
    })
    const adultKeys = adult.crossRows.en.map((r) => r.key)
    expect(adultKeys).toContain('romance')
    expect(adultKeys).toContain('wealth')
    expect(adult.card.agree!.total).toBe(tallyCrossRows(adult.crossRows.en).total)
    expect(adult.card.agree!.total).toBeGreaterThan(card.agree!.total)
  }, 180_000)

  it('결정론 — 같은 now 두 번 = 깊은 동일', async () => {
    const a = await buildSajuCardData({ birth: SAMPLE, now: NOW })
    const b = await buildSajuCardData({ birth: SAMPLE, now: new Date(NOW.getTime()) })
    expect(b).toEqual(a)
  }, 120_000)
})

describe('toTraitRow', () => {
  it("'오행 · 결' 칸을 값과 둘째 줄로 나눈다", () => {
    expect(
      toTraitRow({
        key: 'identity',
        category: 'Identity',
        tone: 'tension',
        reason: '…',
        left: 'Water · fluid and permeating',
        right: 'Fire · expressive and fiery',
      })
    ).toEqual({
      key: 'identity',
      axis: 'Identity',
      verdict: 'tension',
      saju: { text: 'Water', w: 'fluid and permeating' },
      stars: { text: 'Fire', w: 'expressive and fiery' },
    })
  })

  it('칸이 없는 행은 축 이름 · 판정만', () => {
    expect(
      toTraitRow({ key: 'drive', category: '추진력', tone: 'complement', reason: '…' })
    ).toEqual({ key: 'drive', axis: '추진력', verdict: 'complement' })
  })
})

describe('lib/card 시계 가드', () => {
  it('lib/card 안에 Date.now() · new Date() 가 없다(now 는 주입)', () => {
    const dir = path.resolve(__dirname, '../../../src/lib/card')
    const offenders: string[] = []
    for (const f of readdirSync(dir)) {
      if (!/\.tsx?$/.test(f)) continue
      const src = readFileSync(path.join(dir, f), 'utf8')
      if (/\bDate\.now\s*\(|\bnew\s+Date\s*\(/.test(src)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })
})
