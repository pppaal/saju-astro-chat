import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildLifecycleTiming } from '@/lib/calendar-engine/lifecycle/astroLifecycle'

/**
 * 타이밍(시점 정확도) 회귀 — 사주·점성 해석이 "맞는 날짜/나이"에 붙는지.
 * 결정적(ephemeris 불필요) 축만 잠근다: 일진 순차·라이프사이클 나이.
 */
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const P = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

async function iljinGanji(natal: Awaited<ReturnType<typeof buildNatalContext>>, date: string) {
  const cells = await buildCalendar(
    natal,
    { start: `${date}T00:00:00.000Z`, end: `${date}T23:59:59.000Z`, granularity: 'day' },
    { includeEvidence: true }
  )
  const sig = cells[0].signals.find((s) => s.layer === 'daily' && s.kind === 'pillar-sibsin')
  // name 예: '丙午 (정관)' → 앞 2글자가 간지
  const m = (sig?.name ?? '').match(/^(.)(.)/)
  return m ? { stem: m[1], branch: m[2], sibsin: sig?.evidence?.sibsin } : null
}

describe('타이밍 회귀', () => {
  it('일진은 연속일마다 60갑자 순서대로 +1 진행 (천간·지지 각각)', async () => {
    const saju = calculateSajuData(P.birthDate, P.birthTime, P.gender, 'solar', P.timeZone)
    const natal = await buildNatalContext(P, { saju })
    const days = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04']
    const ganji = []
    for (const d of days) ganji.push(await iljinGanji(natal, d))
    // 전부 추출돼야
    for (const g of ganji) expect(g).not.toBeNull()
    // 연속일: 천간 +1 mod10, 지지 +1 mod12
    for (let i = 1; i < ganji.length; i++) {
      const prevS = STEMS.indexOf(ganji[i - 1]!.stem)
      const curS = STEMS.indexOf(ganji[i]!.stem)
      const prevB = BRANCHES.indexOf(ganji[i - 1]!.branch)
      const curB = BRANCHES.indexOf(ganji[i]!.branch)
      expect(curS, `${days[i]} 천간`).toBe((prevS + 1) % 10)
      expect(curB, `${days[i]} 지지`).toBe((prevB + 1) % 12)
    }
  })

  it('일진 십신은 그날 천간 × 본명 일간(辛)으로 정확 — 丙=정관, 丁=편관, 戊=정인', async () => {
    const saju = calculateSajuData(P.birthDate, P.birthTime, P.gender, 'solar', P.timeZone)
    const natal = await buildNatalContext(P, { saju })
    const expected: Record<string, string> = { '2026-06-01': '정관', '2026-06-02': '편관', '2026-06-03': '정인' }
    for (const [d, sib] of Object.entries(expected)) {
      const g = await iljinGanji(natal, d)
      expect(g?.sibsin, `${d} 십신`).toBe(sib)
    }
  })

  it('점성 라이프사이클 나이가 표준값 — 토성회귀~28/57, 목성회귀 12배수 근방, 명왕성사각~36', () => {
    const events = buildLifecycleTiming(1995, 1995 + 90, true).events
    const at = (kindKo: string) => events.find((e) => e.label.includes(kindKo))
    // 토성 회귀: 28~30세 (실제 ~29.5y)
    const saturn1 = events.find((e) => e.label.includes('토성 회귀') && e.startYear - 1995 < 40)
    expect(saturn1).toBeDefined()
    expect(saturn1!.startYear - 1995).toBeGreaterThanOrEqual(27)
    expect(saturn1!.startYear - 1995).toBeLessThanOrEqual(31)
    // 명왕성 사각: 35~40세
    const pluto = at('명왕성')
    expect(pluto).toBeDefined()
    expect(pluto!.startYear - 1995).toBeGreaterThanOrEqual(34)
    expect(pluto!.startYear - 1995).toBeLessThanOrEqual(42)
    // 첫 목성 회귀: 11~13세
    const jup = events.find((e) => e.label.includes('목성 회귀'))
    expect(jup).toBeDefined()
    expect(jup!.startYear - 1995).toBeGreaterThanOrEqual(11)
    expect(jup!.startYear - 1995).toBeLessThanOrEqual(13)
  })

  it('세운·월운 십신이 그 해/달 간지로 정확 — 2026=병오(정관), 6월=계사(식상)', async () => {
    const saju = calculateSajuData(P.birthDate, P.birthTime, P.gender, 'solar', P.timeZone)
    const natal = await buildNatalContext(P, { saju })
    const cells = await buildCalendar(
      natal,
      { start: '2026-06-01T00:00:00.000Z', end: '2026-06-30T23:59:59.000Z', granularity: 'day' },
      { includeEvidence: true }
    )
    const sigs = cells.flatMap((c) => c.signals)
    const seun = sigs.find((s) => s.layer === 'yearly' && s.evidence?.sibsin)
    const wolun = sigs.find((s) => s.layer === 'monthly' && s.evidence?.sibsin)
    // 병오 火 = 辛 기준 정관(관성), 계사 水 = 식상
    expect(['정관', '편관']).toContain(seun?.evidence?.sibsin)
    expect(['식신', '상관']).toContain(wolun?.evidence?.sibsin)
  })
})
