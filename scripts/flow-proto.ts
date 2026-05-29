// 프로토타입 v6 — 고정 기준 보정(window-invariant)
//   보정(bias·scale·N)을 "보는 창"이 아니라 고정 기준 창에서 1회 계산 →
//   모든 날 점수 = f(그날 신호, 고정보정). 어느 창으로 봐도 같은 날 = 같은 점수.
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = {
  transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1,
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5,
  'planetary-hour': 0.15, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15, 'void-of-course': 0.15,
}
const rankKey = (s: Sig) => s.weight * (TIER[s.kind] ?? 0.5)
function topN(sigs: Sig[], n: number): Sig[] {
  const m = new Map<string, Sig[]>()
  for (const s of sigs) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) }
  const out: Sig[] = []
  for (const arr of m.values()) { arr.sort((a, b) => rankKey(b) - rankKey(a)); out.push(...arr.slice(0, n)) }
  return out
}
function grandAvg(sigs: Sig[]): number | null {
  if (!sigs.length) return null
  const m = new Map<string, { s: number; w: number }>()
  for (const s of sigs) { const a = m.get(s.layer) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; m.set(s.layer, a) }
  let ws = 0, tw = 0
  for (const [l, a] of m) { if (!a.w) continue; ws += (a.s / a.w) * (LW[l] ?? 0.5); tw += LW[l] ?? 0.5 }
  return tw ? ws / tw : null
}
const stats = (xs: number[]) => { const mean = xs.reduce((a, b) => a + b, 0) / xs.length; return { mean, sd: Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) } }
const pickS = (sigs: Sig[]) => sigs.filter((s) => s.source === 'saju')
const pickA = (sigs: Sig[]) => sigs.filter((s) => s.source === 'astro')

type DayRec = { day: string; sigs: Sig[] }
async function sigDays(natal: NatalContext, start: string, end: string): Promise<DayRec[]> {
  const cells = await buildCalendar(natal, { start, end, granularity: 'day' }, { includeEvidence: true })
  return cells.map((c) => ({
    day: c.datetime.slice(0, 10),
    sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind })) as Sig[],
  }))
}

// 고정 기준 창에서 보정 1회 산출
interface Calib { sajuBias: number; sajuScale: number; astroBias: number; astroScale: number; N: number }
function computeCalib(refDays: DayRec[]): Calib {
  const sGs = refDays.map((d) => grandAvg(pickS(d.sigs))).filter((x): x is number => x != null)
  const sSt = stats(sGs)
  let N = 8, best = 9
  for (const n of [5, 8, 12, 16]) {
    const sd = stats(refDays.map((d) => grandAvg(topN(pickA(d.sigs), n))).filter((x): x is number => x != null)).sd
    if (Math.abs(sd - sSt.sd) < best) { best = Math.abs(sd - sSt.sd); N = n }
  }
  const aGs = refDays.map((d) => grandAvg(topN(pickA(d.sigs), N))).filter((x): x is number => x != null)
  const aSt = stats(aGs)
  return {
    sajuBias: sSt.mean, sajuScale: sSt.sd > 0.01 ? 12 / sSt.sd : 16,
    astroBias: aSt.mean, astroScale: aSt.sd > 0.01 ? 12 / aSt.sd : 16, N,
  }
}
const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))
// 고정 보정으로 하루 점수 — 그날 신호 + calib 만 의존 (창 무관)
function scoreDay(sigs: Sig[], c: Calib) {
  const sg = grandAvg(pickS(sigs)), ag = grandAvg(topN(pickA(sigs), c.N))
  const sajuAxis = sg == null ? 50 : clamp(50 + (sg - c.sajuBias) * c.sajuScale)
  const astroAxis = ag == null ? 50 : clamp(50 + (ag - c.astroBias) * c.astroScale)
  return { sajuAxis, astroAxis, head: Math.round((sajuAxis + astroAxis) / 2) }
}

async function main() {
  const natal = await buildNatalContext({ birthDate: '1993-08-15', birthTime: '14:30', gender: 'male', latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' })

  // ── 고정 기준 창 = 타겟 ±2개월 (3~7월). 신호+보정 모두 1회 산출. ──
  const t0 = Date.now()
  const refDays = await sigDays(natal, '2026-03-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')
  const calib = computeCalib(refDays)
  const byDay = new Map(refDays.map((d) => [d.day, d]))
  console.log(`[고정 빌드+보정] 기준창 3~7월(${refDays.length}일) 1회, ${Date.now() - t0}ms`)
  console.log('  사주 bias', calib.sajuBias.toFixed(3), 'scale', calib.sajuScale.toFixed(1), '| 점성 bias', calib.astroBias.toFixed(3), 'scale', calib.astroScale.toFixed(1), '| N', calib.N)

  const wk = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07']

  // ✅ 옳은 방식: 고정 빌드에서 슬라이스만 — 뷰가 뭐든 같은 신호
  console.log('\n[✅ 옳은 방식] 고정창 1회 빌드 → 뷰는 슬라이스. 5/1~5/7:')
  for (const day of wk) { const s = scoreDay(byDay.get(day)!.sigs, calib); console.log(`  ${day}  사주 ${s.sajuAxis} / 점성 ${s.astroAxis} / 헤드 ${s.head}`) }
  console.log('  → 한달뷰든 주뷰든 이 슬라이스를 그대로 읽으므로 점수 100% 동일 (정의상 불변)')

  // ❌ 틀린 방식: 뷰마다 다시 빌드 → 점성 splitConsecutive가 창 경계서 잘려 달라짐
  const monthB = await sigDays(natal, '2026-05-01T00:00:00.000Z', '2026-05-31T23:59:59.999Z')
  const weekB = await sigDays(natal, '2026-05-01T00:00:00.000Z', '2026-05-07T23:59:59.999Z')
  let diff = 0
  for (let i = 0; i < 7; i++) {
    const m = scoreDay(monthB[i].sigs, calib), w = scoreDay(weekB[i].sigs, calib)
    if (m.head !== w.head || m.astroAxis !== w.astroAxis) diff++
  }
  console.log(`\n[❌ 틀린 방식] 뷰마다 재빌드 → 5/1~5/7 중 ${diff}/7 일 점수 다름 (점성 신호가 창 경계서 잘려 무게 변동)`)
  console.log('   ∴ 결론: 보정 고정 + "신호도 고정창서 1회 빌드 후 슬라이스" 둘 다 필요. 재빌드 금지.')
}
main().catch((e) => { console.error(e); process.exit(1) })
