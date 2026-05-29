// 프로토타입 v5 — 최종 튜닝: 넓힌 N 스윕 vs 순위감쇠(rank-decay, N불요) 비교
//   5개 차트 한 번에 → 어느 솎기 방식이 차트 무관하게 안정적인가.
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = {
  transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1,
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5,
  'planetary-hour': 0.15, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15, 'void-of-course': 0.15,
}
const rankKey = (s: Sig) => s.weight * (TIER[s.kind] ?? 0.5)

function topNPerLayer(sigs: Sig[], n: number): Sig[] {
  const m = new Map<string, Sig[]>()
  for (const s of sigs) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) }
  const out: Sig[] = []
  for (const arr of m.values()) { arr.sort((a, b) => rankKey(b) - rankKey(a)); out.push(...arr.slice(0, n)) }
  return out
}
// 순위감쇠: layer별 rankKey 내림차순 → weight *= d^순위 (하드컷 없음, 자동적응)
function decay(sigs: Sig[], d: number): Sig[] {
  const m = new Map<string, Sig[]>()
  for (const s of sigs) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) }
  const out: Sig[] = []
  for (const arr of m.values()) {
    arr.sort((a, b) => rankKey(b) - rankKey(a))
    arr.forEach((s, i) => out.push({ ...s, weight: s.weight * Math.pow(d, i) }))
  }
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
function calibrate(gs: (number | null)[]) {
  const v = gs.filter((x): x is number => x != null); const st = stats(v); const sc = st.sd > 0.01 ? 12 / st.sd : 16
  return gs.map((g) => g == null ? 50 : Math.max(0, Math.min(100, Math.round(50 + (g - st.mean) * sc))))
}
const agree = (a: number, b: number) => { const g = Math.abs(a - b); return g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed' }
function metrics(saju: number[], astroGs: (number | null)[], days: any[]) {
  const ax = calibrate(astroGs)
  const ag: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
  let conv = 0
  days.forEach((_, i) => {
    const a = agree(saju[i], ax[i]); ag[a]++
    if (a !== 'opposed' && ((saju[i] >= 60 && ax[i] >= 60) || (saju[i] <= 40 && ax[i] <= 40))) conv++
  })
  const rawSd = stats(astroGs.filter((x): x is number => x != null)).sd
  return { rawSd: +rawSd.toFixed(3), opposed: +(ag.opposed / days.length).toFixed(2), conv, alive: rawSd >= 0.03 }
}

// 단일 차트 실행 → 적응형 top-N(5~16) + 지표 + verdict
async function runChart(input: any, start: string, end: string) {
  const natal = await buildNatalContext(input)
  const cells = await buildCalendar(natal, { start, end, granularity: 'day' }, { includeEvidence: true })
  const days = cells.map((x) => ({ sigs: (x.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind })) as Sig[] }))
  const pickS = (d: any) => d.sigs.filter((s: Sig) => s.source === 'saju')
  const pickA = (d: any) => d.sigs.filter((s: Sig) => s.source === 'astro')
  const sajuGs = days.map((d) => grandAvg(pickS(d)))
  const sajuSd = stats(sajuGs.filter((x): x is number => x != null)).sd
  const sajuAxis = calibrate(sajuGs)
  // 적응형 N: 점성 raw sd가 사주 sd에 가장 근접한 N
  let bestN = 0, bestDiff = 9, bestSd = 0
  for (const n of [5, 8, 12, 16]) {
    const sd = stats(days.map((d) => grandAvg(topNPerLayer(pickA(d), n))).filter((x): x is number => x != null)).sd
    if (Math.abs(sd - sajuSd) < bestDiff) { bestDiff = Math.abs(sd - sajuSd); bestN = n; bestSd = sd }
  }
  const m = metrics(sajuAxis, days.map((d) => grandAvg(topNPerLayer(pickA(d), bestN))), days)
  const astroPinned = m.rawSd < 0.03
  const verdict = astroPinned ? 'FAIL(점성축고착)' : m.opposed > 0.5 ? 'FAIL(opposed과다)' : !natal ? 'FAIL' : 'OK'
  return {
    birth: input.birthDate, time: input.birthTime, win: `${start.slice(0, 10)}~${end.slice(0, 10)}`, nDays: days.length,
    strength: natal.saju.strength, sect: natal.astro.sect, sajuSd: +sajuSd.toFixed(3),
    chosenN: bestN, hitEdge: bestN === 16, astroSd: bestSd, opposedRatio: m.opposed, convDays: m.conv, alive: m.alive, verdict,
  }
}

const CHARTS = [
  { tag: '서울♂medium/day', i: { birthDate: '1993-08-15', birthTime: '14:30', gender: 'male' as const, latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }, s: '2026-05-01T00:00:00.000Z', e: '2026-05-31T23:59:59.999Z' },
  { tag: '서울♀night겨울', i: { birthDate: '1988-01-20', birthTime: '04:30', gender: 'female' as const, latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }, s: '2025-11-01T00:00:00.000Z', e: '2025-11-30T23:59:59.999Z' },
  { tag: '시드니♂strong남반구', i: { birthDate: '1975-07-10', birthTime: '12:00', gender: 'male' as const, latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' }, s: '2027-02-01T00:00:00.000Z', e: '2027-02-28T23:59:59.999Z' },
  { tag: '뉴욕♀night저녁', i: { birthDate: '2001-11-05', birthTime: '21:15', gender: 'female' as const, latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }, s: '2026-08-01T00:00:00.000Z', e: '2026-08-31T23:59:59.999Z' },
  { tag: '런던♂weak오전', i: { birthDate: '1969-03-30', birthTime: '09:45', gender: 'male' as const, latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' }, s: '2026-12-01T00:00:00.000Z', e: '2026-12-31T23:59:59.999Z' },
]
const NS = [3, 5, 8, 12, 16, 20, 28]

async function main() {
  const E = process.env
  // 단일 차트 모드 (env) — 에이전트 스트레스 테스트용
  if (E.FP_BIRTHDATE) {
    const r = await runChart(
      { birthDate: E.FP_BIRTHDATE, birthTime: E.FP_BIRTHTIME ?? '12:00', gender: (E.FP_GENDER as any) ?? 'male', latitude: Number(E.FP_LAT ?? 37.5665), longitude: Number(E.FP_LON ?? 126.978), timeZone: E.FP_TZ ?? 'Asia/Seoul' },
      E.FP_START ?? '2026-05-01T00:00:00.000Z', E.FP_END ?? '2026-05-31T23:59:59.999Z',
    )
    console.log('==== SUMMARY(JSON) ====')
    console.log(JSON.stringify(r))
    return
  }
  console.log('차트                    강약   sect | 사주sd | [넓힌 N스윕] 채택N(점성sd) | [순위감쇠 d=0.6] 점성sd opp conv alive')
  console.log('-'.repeat(118))
  for (const c of CHARTS) {
    const natal = await buildNatalContext(c.i)
    const cells = await buildCalendar(natal, { start: c.s, end: c.e, granularity: 'day' }, { includeEvidence: true })
    const days = cells.map((x) => ({ sigs: (x.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind })) as Sig[] }))
    const pickS = (d: any) => d.sigs.filter((s: Sig) => s.source === 'saju')
    const pickA = (d: any) => d.sigs.filter((s: Sig) => s.source === 'astro')
    const sajuGs = days.map((d) => grandAvg(pickS(d)))
    const sajuSd = stats(sajuGs.filter((x): x is number => x != null)).sd
    const sajuAxis = calibrate(sajuGs)

    // 넓힌 N 스윕: 사주sd에 가장 근접한 N
    let bestN = 0, bestDiff = 9, bestSd = 0
    for (const n of NS) {
      const sd = stats(days.map((d) => grandAvg(topNPerLayer(pickA(d), n))).filter((x): x is number => x != null)).sd
      const diff = Math.abs(sd - sajuSd)
      if (diff < bestDiff) { bestDiff = diff; bestN = n; bestSd = sd }
    }
    const hitCeil = bestN === NS[NS.length - 1] ? '⚠천장' : ''

    // 순위감쇠 d=0.6 (N 불요)
    const dm = metrics(sajuAxis, days.map((d) => grandAvg(decay(pickA(d), 0.6))), days)

    console.log(
      `${c.tag.padEnd(22)} ${natal.saju.strength.padEnd(6)} ${natal.astro.sect.padEnd(5)}| ${sajuSd.toFixed(3)} | ` +
      `N=${String(bestN).padStart(2)}(sd ${bestSd.toFixed(3)})${hitCeil.padEnd(4)} | ` +
      `sd ${dm.rawSd.toFixed(3)}  ${String(Math.round(dm.opposed * 100)).padStart(2)}%  ${String(dm.conv).padStart(2)}  ${dm.alive ? 'OK' : 'DEAD'}`,
    )
  }
  console.log('\n해석: 순위감쇠가 차트 무관하게 점성sd 건강(≥0.03)+opp 낮음+conv 적정이면 → N튜닝 불요한 안정 방식')
}
main().catch((e) => { console.error(e); process.exit(1) })
