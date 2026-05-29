// 프로토타입 v4 — top-N 확정 스윕 + 수렴 타이밍
//   점성: layer별 (weight × tier) 상위 N개만 점수에 (정확+중요 우선, 나머지는 상세/테마용)
//   사주: 전량(홍수 아님)  →  출처별 자동보정  →  N 스윕  →  수렴 타이밍
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string }
const LAYER_WEIGHT: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = {
  transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1,
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5,
  'planetary-hour': 0.15, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15, 'void-of-course': 0.15,
}
const tierMul = (k: string) => TIER[k] ?? 0.5
const rankKey = (s: Sig) => s.weight * tierMul(s.kind) // 정확도(weight) × 중요도(tier)

function topNPerLayer(sigs: Sig[], n: number): Sig[] {
  const byLayer = new Map<string, Sig[]>()
  for (const s of sigs) { const a = byLayer.get(s.layer) ?? []; a.push(s); byLayer.set(s.layer, a) }
  const out: Sig[] = []
  for (const arr of byLayer.values()) { arr.sort((a, b) => rankKey(b) - rankKey(a)); out.push(...arr.slice(0, n)) }
  return out
}
function grandAvg(sigs: Sig[]): number | null {
  if (!sigs.length) return null
  const byLayer = new Map<string, { s: number; w: number }>()
  for (const s of sigs) { const a = byLayer.get(s.layer) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; byLayer.set(s.layer, a) }
  let ws = 0, tw = 0
  for (const [l, a] of byLayer) { if (!a.w) continue; ws += (a.s / a.w) * (LAYER_WEIGHT[l] ?? 0.5); tw += LAYER_WEIGHT[l] ?? 0.5 }
  return tw ? ws / tw : null
}
const stats = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return { mean: m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) } }
function calibrate(gs: (number | null)[]) {
  const v = gs.filter((x): x is number => x != null); const st = stats(v); const scale = st.sd > 0.01 ? 12 / st.sd : 16
  return gs.map((g) => g == null ? 50 : Math.max(0, Math.min(100, Math.round(50 + (g - st.mean) * scale))))
}
const agree = (a: number, b: number) => { const g = Math.abs(a - b); return g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed' }

async function main() {
  const natal = await buildNatalContext({ birthDate: '1993-08-15', birthTime: '14:30', gender: 'male', latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' })
  const cells = await buildCalendar(natal, { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.999Z', granularity: 'day' }, { includeEvidence: true })
  const days = cells.map((c) => ({
    day: c.datetime.slice(0, 10),
    sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind })) as Sig[],
  }))
  const pickS = (d: any) => d.sigs.filter((s: Sig) => s.source === 'saju')
  const pickA = (d: any) => d.sigs.filter((s: Sig) => s.source === 'astro')
  console.log('강약', natal.saju.strength, '/ sect', natal.astro.sect, '/ 목표: 점성 sd ≈ 사주 sd', stats(days.map((d) => grandAvg(pickS(d))).filter((x): x is number => x != null)).sd.toFixed(3))

  // ── N 스윕 ──
  console.log('\n[N 스윕] layer별 (weight×tier) 상위 N개 → 점성 raw sd & 일치분포')
  const sajuAxis = calibrate(days.map((d) => grandAvg(pickS(d))))
  let best = { n: 0, score: -1, astroAxis: [] as number[] }
  for (const n of [3, 5, 8, 12]) {
    const gs = days.map((d) => grandAvg(topNPerLayer(pickA(d), n)))
    const sd = stats(gs.filter((x): x is number => x != null)).sd
    const ax = calibrate(gs)
    const ag: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
    days.forEach((_, i) => ag[agree(sajuAxis[i], ax[i])]++)
    console.log(`   N=${String(n).padStart(2)}  raw sd ${sd.toFixed(3)}   일치 aligned ${ag.aligned} / mixed ${ag.mixed} / opposed ${ag.opposed}`)
    // 목표: sd가 사주(0.095)에 가장 가까운 N (너무 작으면 1신호 독재, 너무 크면 익사)
    const closeness = -Math.abs(sd - 0.095)
    if (closeness > best.score) best = { n, score: closeness, astroAxis: ax }
  }
  const N = best.n
  const astroAxis = best.astroAxis
  console.log(`\n→ 채택 N=${N} (사주 변동성에 가장 근접)`)

  // ── 최종 타임라인 + 수렴 타이밍 ──
  console.log('\n[최종]  날짜       사주 점성 헤드 일치     수렴타이밍')
  const conv: { day: string; head: number; kind: string }[] = []
  days.forEach((d, i) => {
    const sA = sajuAxis[i], aA = astroAxis[i], head = Math.round((sA + aA) / 2), ag = agree(sA, aA)
    let mark = ''
    if (ag !== 'opposed' && sA >= 60 && aA >= 60) { mark = '★ 둘다 길(상승수렴)'; conv.push({ day: d.day, head, kind: '길' }) }
    else if (ag !== 'opposed' && sA <= 40 && aA <= 40) { mark = '▼ 둘다 흉(하강수렴)'; conv.push({ day: d.day, head, kind: '흉' }) }
    console.log(`  ${d.day}  ${String(sA).padStart(3)} ${String(aA).padStart(4)} ${String(head).padStart(4)}  ${ag.padEnd(8)} ${mark}`)
  })
  console.log('\n[수렴 타이밍] 사주·점성이 같은 방향으로 강하게 만나는 날 =', conv.length, '개')
  for (const c of conv) console.log(`   ${c.day}  ${c.kind}  (헤드라인 ${c.head})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
