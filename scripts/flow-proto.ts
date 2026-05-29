// 프로토타입 v12 — 시간(時) 스케일: 같은 두 축 방식을 하루 24시간에
//   사주 시주(時柱) vs 점성 행성시 → 시간별 두 축 + best/worst 시간 + 수렴(택시).
//   ref=3일 hour빌드로 보정, 타겟일 24시간 채점.   실행: npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string; name: string }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = { transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1, progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5, 'planetary-hour': 1, 'void-of-course': 0.5, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15 }
const rankKey = (s: Sig) => s.weight * (TIER[s.kind] ?? 0.5)
const topN = (sigs: Sig[], n: number) => { const m = new Map<string, Sig[]>(); for (const s of sigs) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) } const o: Sig[] = []; for (const a of m.values()) { a.sort((x, y) => rankKey(y) - rankKey(x)); o.push(...a.slice(0, n)) } return o }
function grandAvg(sigs: Sig[]): number | null {
  if (!sigs.length) return null
  const m = new Map<string, { s: number; w: number }>()
  for (const s of sigs) { const a = m.get(s.layer) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; m.set(s.layer, a) }
  let ws = 0, tw = 0; for (const [l, a] of m) { if (!a.w) continue; ws += (a.s / a.w) * (LW[l] ?? 0.5); tw += LW[l] ?? 0.5 } return tw ? ws / tw : null
}
const stats = (xs: number[]) => { const mean = xs.reduce((a, b) => a + b, 0) / xs.length; return { mean, sd: Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) } }
const pickS = (s: Sig[]) => s.filter((x) => x.source === 'saju')
const pickA = (s: Sig[]) => s.filter((x) => x.source === 'astro')
const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))
type HourRec = { iso: string; hour: number; sigs: Sig[] }
async function hourCells(natal: NatalContext, start: string, end: string): Promise<HourRec[]> {
  const cells = await buildCalendar(natal, { start, end, granularity: 'hour' }, { includeEvidence: true })
  return cells.map((c) => ({ iso: c.datetime, hour: new Date(c.datetime).getUTCHours(), sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind, name: s.korean ?? s.name ?? s.kind })) as Sig[] }))
}

async function main() {
  const E = process.env
  const input = { birthDate: E.FP_BIRTHDATE ?? '1993-08-15', birthTime: E.FP_BIRTHTIME ?? '14:30', gender: (E.FP_GENDER as 'male' | 'female') ?? 'male', latitude: Number(E.FP_LAT ?? 37.5665), longitude: Number(E.FP_LON ?? 126.978), timeZone: E.FP_TZ ?? 'Asia/Seoul' }
  const natal = await buildNatalContext(input)
  console.log(`=== 시간(時) 스케일 — ${input.birthDate} 일간 ${natal.saju.dayMaster.name}${natal.saju.dayMaster.element} ===`)

  // ref: 5/10~5/12 (3일) hour빌드로 시간축 보정
  const t0 = Date.now()
  const ref = await hourCells(natal, '2026-05-10T00:00:00.000Z', '2026-05-12T23:59:59.999Z')
  // 시간 스케일은 hourly/instant + daily 일부만 — 점성 솎기 N은 작게(시간은 신호 적음)
  const sStat = stats(ref.map((h) => grandAvg(pickS(h.sigs))).filter((x): x is number => x != null))
  let N = 5, bd = 9; for (const n of [3, 5, 8]) { const sd = stats(ref.map((h) => grandAvg(topN(pickA(h.sigs), n))).filter((x): x is number => x != null)).sd; if (Math.abs(sd - sStat.sd) < bd) { bd = Math.abs(sd - sStat.sd); N = n } }
  const aStat = stats(ref.map((h) => grandAvg(topN(pickA(h.sigs), N))).filter((x): x is number => x != null))
  const cal = { sB: sStat.mean, sS: sStat.sd > 0.01 ? 12 / sStat.sd : 16, aB: aStat.mean, aS: aStat.sd > 0.01 ? 12 / aStat.sd : 16 }
  const score = (sigs: Sig[]) => { const sg = grandAvg(pickS(sigs)), ag = grandAvg(topN(pickA(sigs), N)); return { sa: sg == null ? 50 : clamp(50 + (sg - cal.sB) * cal.sS), aa: ag == null ? 50 : clamp(50 + (ag - cal.aB) * cal.aS) } }
  console.log(`[보정] ref 3일 ${ref.length}시간 ${Date.now() - t0}ms / 사주 sd ${sStat.sd.toFixed(3)} / 점성 sd ${aStat.sd.toFixed(3)} N=${N} → 사주축 ${sStat.sd >= 0.02 ? '살아있음✅' : 'DEAD❌'} 점성축 ${aStat.sd >= 0.02 ? '살아있음✅' : 'DEAD❌'}`)

  // 타겟일 5/11 24시간 채점
  const target = ref.filter((h) => h.iso.startsWith('2026-05-11'))
  console.log('\n[5/11 24시간] 시  사주 점성 헤드  수렴')
  const rows: { hour: number; sa: number; aa: number; head: number }[] = []
  const ag: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
  for (const h of target) {
    const { sa, aa } = score(h.sigs); const g = Math.abs(sa - aa); const head = Math.round((sa + aa) / 2)
    ag[g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed']++
    let mark = ''
    if (g <= 16 && sa >= 56 && aa >= 56) mark = '★ 길시(둘다 좋음)'
    else if (g <= 16 && sa <= 44 && aa <= 44) mark = '▼ 흉시'
    rows.push({ hour: h.hour, sa, aa, head })
    console.log(`    ${String(h.hour).padStart(2)}시 ${String(sa).padStart(4)} ${String(aa).padStart(4)} ${String(head).padStart(4)}  ${mark}`)
  }
  const best = [...rows].sort((a, b) => b.head - a.head)[0]
  const worst = [...rows].sort((a, b) => a.head - b.head)[0]
  const span = Math.max(...rows.map((r) => r.head)) - Math.min(...rows.map((r) => r.head))
  console.log(`\n[택시] best ${best.hour}시(${best.head}) / worst ${worst.hour}시(${worst.head}) / 하루 변동폭 ${span}`)

  const alive = aStat.sd >= 0.02 && sStat.sd >= 0.02
  console.log('\n==== SUMMARY(JSON) ====')
  console.log(JSON.stringify({ birth: input.birthDate, scale: 'hour', sajuSd: +sStat.sd.toFixed(3), astroSd: +aStat.sd.toFixed(3), N, alive, agreement: ag, bestHour: best.hour, worstHour: worst.hour, daySpan: span, verdict: alive && span >= 5 ? 'OK (시간축 살아있고 시간별 변별)' : 'WEAK' }))
}
main().catch((e) => { console.error(e); process.exit(1) })
