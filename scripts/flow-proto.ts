// 프로토타입 v14 — 종류별 묶음 집계(per-kind) vs top-N 맞대결
//   per-kind: 레이어 안에서 "종류(kind)"별로 먼저 평균 → 종류들을 중요도(tier)로 합침.
//   → 600 소행성 = 1표(0.15), 10 트랜짓 = 1표(1.0). 개수 무관. 임의 N 컷 없음.
//   실행: FP_BATCH=30 npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type El = '목' | '화' | '토' | '금' | '수'
type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = { transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1, progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5, 'planetary-hour': 1, 'void-of-course': 0.5, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15 }
const tier = (k: string) => TIER[k] ?? 0.5
const rankKey = (s: Sig) => s.weight * tier(s.kind)
const topN = (g: Sig[], n: number) => { const m = new Map<string, Sig[]>(); for (const s of g) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) } const o: Sig[] = []; for (const a of m.values()) { a.sort((x, y) => rankKey(y) - rankKey(x)); o.push(...a.slice(0, n)) } return o }

// 방식1: top-N (레이어 평균)
function grandAvg(g: Sig[]): number | null {
  if (!g.length) return null
  const m = new Map<string, { s: number; w: number }>()
  for (const s of g) { const a = m.get(s.layer) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; m.set(s.layer, a) }
  let ws = 0, tw = 0; for (const [l, a] of m) { if (!a.w) continue; ws += (a.s / a.w) * (LW[l] ?? 0.5); tw += LW[l] ?? 0.5 } return tw ? ws / tw : null
}
// 방식2: per-kind (레이어 안에서 종류별 평균 → 종류를 tier로 합침)
function grandAvgKind(g: Sig[]): number | null {
  if (!g.length) return null
  const byLayer = new Map<string, Sig[]>()
  for (const s of g) { const a = byLayer.get(s.layer) ?? []; a.push(s); byLayer.set(s.layer, a) }
  let ws = 0, tw = 0
  for (const [layer, arr] of byLayer) {
    const byKind = new Map<string, { s: number; w: number }>()
    for (const s of arr) { const a = byKind.get(s.kind) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; byKind.set(s.kind, a) }
    let kws = 0, ktw = 0
    for (const [kind, a] of byKind) { if (!a.w) continue; const kw = tier(kind); kws += (a.s / a.w) * kw; ktw += kw }  // 종류별 평균 × 종류 중요도
    if (!ktw) continue
    const layerAvg = kws / ktw
    ws += layerAvg * (LW[layer] ?? 0.5); tw += LW[layer] ?? 0.5
  }
  return tw ? ws / tw : null
}
const stats = (xs: number[]) => { const mean = xs.reduce((a, b) => a + b, 0) / xs.length; return { mean, sd: Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) } }
const pickS = (s: Sig[]) => s.filter((x) => x.source === 'saju'); const pickA = (s: Sig[]) => s.filter((x) => x.source === 'astro')
const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))
type Rec = { day: string; sigs: Sig[] }
async function build(n: NatalContext, start: string, end: string, gran: 'day' | 'hour'): Promise<Rec[]> {
  return (await buildCalendar(n, { start, end, granularity: gran }, { includeEvidence: true })).map((c: any) => ({ day: c.datetime, sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind })) }))
}

// 한 사주: 두 방식의 점성축 sd + 일치 비교 (日/月 스케일)
async function compare(input: any) {
  const natal = await buildNatalContext(input)
  const dref = await build(natal, '2026-03-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z', 'day')
  const may = dref.filter((d) => d.day.slice(0, 7) === '2026-05')
  const out: any = { birth: input.birthDate, str: natal.saju.strength }

  for (const [tag, gaA, NsweepN] of [['topN', null, true], ['kind', null, false]] as const) {
    const ga = tag === 'kind' ? grandAvgKind : grandAvg
    // top-N은 N 스윕 필요, kind는 불필요
    let N = 0
    const aSdOf = (n: number) => stats(dref.map((d) => grandAvg(topN(pickA(d.sigs), n))).filter((x): x is number => x != null)).sd
    const sSt = stats(dref.map((d) => ga(pickS(d.sigs))).filter((x): x is number => x != null))
    let aSt
    if (tag === 'topN') { let bd = 9; for (const n of [5, 8, 12, 16]) { const sd = aSdOf(n); if (Math.abs(sd - sSt.sd) < bd) { bd = Math.abs(sd - sSt.sd); N = n } } aSt = stats(dref.map((d) => grandAvg(topN(pickA(d.sigs), N))).filter((x): x is number => x != null)) }
    else aSt = stats(dref.map((d) => grandAvgKind(pickA(d.sigs))).filter((x): x is number => x != null))
    const sB = sSt.mean, sS = sSt.sd > 0.01 ? 12 / sSt.sd : 16, aB = aSt.mean, aS = aSt.sd > 0.01 ? 12 / aSt.sd : 16
    const ag = { aligned: 0, mixed: 0, opposed: 0 }
    for (const d of may) {
      const sg = ga(pickS(d.sigs)), agv = tag === 'topN' ? grandAvg(topN(pickA(d.sigs), N)) : grandAvgKind(pickA(d.sigs))
      const sa = sg == null ? 50 : clamp(50 + (sg - sB) * sS), aa = agv == null ? 50 : clamp(50 + (agv - aB) * aS)
      const g = Math.abs(sa - aa); ;(ag as any)[g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed']++
    }
    out[tag] = { astroSd: +aST(aSt).toFixed(3), N: tag === 'topN' ? N : '-', opposed: +(ag.opposed / may.length).toFixed(2), alive: aSt.sd >= 0.03 }
  }
  return out
}
function aST(x: { sd: number }) { return x.sd }

const CITIES = [{ lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' }, { lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' }, { lat: -33.87, lon: 151.21, tz: 'Australia/Sydney' }, { lat: 40.71, lon: -74.01, tz: 'America/New_York' }, { lat: 51.51, lon: -0.13, tz: 'Europe/London' }, { lat: -23.55, lon: -46.63, tz: 'America/Sao_Paulo' }, { lat: 19.07, lon: 72.88, tz: 'Asia/Kolkata' }, { lat: 30.04, lon: 31.24, tz: 'Africa/Cairo' }]
const ri = (n: number) => Math.floor(Math.random() * n)
const randomChart = () => { const c = CITIES[ri(CITIES.length)]; return { birthDate: `${1955 + ri(49)}-${String(1 + ri(12)).padStart(2, '0')}-${String(1 + ri(28)).padStart(2, '0')}`, birthTime: `${String(ri(24)).padStart(2, '0')}:${ri(2) ? '30' : '00'}`, gender: ri(2) ? 'male' : 'female', latitude: c.lat, longitude: c.lon, timeZone: c.tz } }

async function main() {
  const K = Number(process.env.FP_BATCH ?? 30)
  console.log(`=== top-N vs 종류별(kind) 맞대결 — ${K}개 랜덤 (日/月 점성축) ===`)
  console.log('#  생일        강약    | top-N: sd  N opp alive | kind: sd  opp alive')
  const agg = { topNalive: 0, kindAlive: 0, topNsd: [] as number[], kindSd: [] as number[], topNopp: [] as number[], kindOpp: [] as number[] }
  for (let i = 0; i < K; i++) {
    try {
      const r = await compare(randomChart())
      agg.topNalive += r.topN.alive ? 1 : 0; agg.kindAlive += r.kind.alive ? 1 : 0
      agg.topNsd.push(r.topN.astroSd); agg.kindSd.push(r.kind.astroSd); agg.topNopp.push(r.topN.opposed); agg.kindOpp.push(r.kind.opposed)
      console.log(`${String(i + 1).padStart(2)} ${r.birth} ${r.str.padEnd(6)} | ${String(r.topN.astroSd).padStart(5)} ${String(r.topN.N).padStart(2)} ${String(r.topN.opposed).padStart(4)} ${r.topN.alive ? '✅' : '❌'}    | ${String(r.kind.astroSd).padStart(5)} ${String(r.kind.opposed).padStart(4)} ${r.kind.alive ? '✅' : '❌'}`)
    } catch (e) { console.log(`${i + 1} 💥 ${String(e).slice(0, 60)}`) }
  }
  const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3)
  console.log(`\n[결과] 점성축 살아있음(sd≥0.03):  top-N ${agg.topNalive}/${K}   kind ${agg.kindAlive}/${K}`)
  console.log(`  평균 점성 sd:   top-N ${avg(agg.topNsd)}   kind ${avg(agg.kindSd)}`)
  console.log(`  평균 opposed:   top-N ${avg(agg.topNopp)}   kind ${avg(agg.kindOpp)}`)
  console.log(`  kind는 N 튜닝 불필요(임의 컷 없음). top-N은 N 5~16 스윕 필요.`)
}
main().catch((e) => { console.error(String(e).slice(0, 200)); process.exit(1) })
