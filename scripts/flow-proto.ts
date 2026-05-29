// 프로토타입 v2 — 점성 축 고착 원인 진단 + 솎기 + 출처별 자동보정
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string }

const LAYER_WEIGHT: Record<string, number> = {
  decadal: 1.0, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5,
}

// score.ts 의 grandAvg(-3~+3) 부분만 추출 — bias/scale/보너스 제거한 raw 방향
function grandAvg(sigs: Sig[]): number | null {
  if (sigs.length === 0) return null
  const byLayer = new Map<string, { sum: number; weight: number }>()
  for (const s of sigs) {
    const a = byLayer.get(s.layer) ?? { sum: 0, weight: 0 }
    a.sum += s.polarity * s.weight; a.weight += s.weight
    byLayer.set(s.layer, a)
  }
  let ws = 0, tw = 0
  for (const [layer, a] of byLayer) {
    if (!a.weight) continue
    ws += (a.sum / a.weight) * (LAYER_WEIGHT[layer] ?? 0.5)
    tw += LAYER_WEIGHT[layer] ?? 0.5
  }
  return tw ? ws / tw : null
}

// layer별 상위 K개(weight 큰 것)만 — 솎기
function thinPerLayer(sigs: Sig[], k: number): Sig[] {
  const byLayer = new Map<string, Sig[]>()
  for (const s of sigs) { const arr = byLayer.get(s.layer) ?? []; arr.push(s); byLayer.set(s.layer, arr) }
  const out: Sig[] = []
  for (const arr of byLayer.values()) { arr.sort((a, b) => b.weight - a.weight); out.push(...arr.slice(0, k)) }
  return out
}

function stats(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
  return { mean: m, sd, min: Math.min(...xs), max: Math.max(...xs) }
}

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15', birthTime: '14:30', gender: 'male',
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  })
  const cells = await buildCalendar(natal,
    { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: true })

  const days = cells.map((c) => ({
    day: c.datetime.slice(0, 10),
    sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind })) as Sig[],
  }))

  // ── 진단 1: 점성 신호 layer 분포 (왜 150개?) ──
  const astroAll = days.flatMap((d) => d.sigs.filter((s) => s.source === 'astro'))
  const byLayer: Record<string, number> = {}
  const byKind: Record<string, number> = {}
  for (const s of astroAll) { byLayer[s.layer] = (byLayer[s.layer] || 0) + 1; byKind[s.kind] = (byKind[s.kind] || 0) + 1 }
  console.log('강약', natal.saju.strength, '/ sect', natal.astro.sect)
  console.log('\n[진단1] 점성 신호 layer 분포(한달 누적):', byLayer)
  console.log('         점성 신호 kind 분포:', byKind)
  const wq = astroAll.map((s) => s.weight).sort((a, b) => a - b)
  console.log(`         점성 weight 분위: min ${wq[0].toFixed(3)} / p25 ${wq[(wq.length/4)|0].toFixed(3)} / median ${wq[(wq.length/2)|0].toFixed(3)} / p75 ${wq[(wq.length*3/4)|0].toFixed(3)} / max ${wq[wq.length-1].toFixed(3)}`)

  // ── 진단 2: 출처별 raw grandAvg 변동성 (full vs 솎기) ──
  const variants = [
    { name: 'astro FULL',      pick: (d: any) => d.sigs.filter((s: Sig) => s.source === 'astro') },
    { name: 'astro top3/layer', pick: (d: any) => thinPerLayer(d.sigs.filter((s: Sig) => s.source === 'astro'), 3) },
    { name: 'astro top1/layer', pick: (d: any) => thinPerLayer(d.sigs.filter((s: Sig) => s.source === 'astro'), 1) },
    { name: 'saju FULL',       pick: (d: any) => d.sigs.filter((s: Sig) => s.source === 'saju') },
  ]
  console.log('\n[진단2] raw grandAvg(-3~+3) 한달 변동성 — sd 클수록 "축이 살아있다"')
  for (const v of variants) {
    const gs = days.map((d) => grandAvg(v.pick(d))).filter((x): x is number => x != null)
    const st = stats(gs)
    console.log(`   ${v.name.padEnd(18)} mean ${st.mean.toFixed(3)}  sd ${st.sd.toFixed(3)}  range [${st.min.toFixed(2)}, ${st.max.toFixed(2)}]`)
  }

  // ── 출처별 자동보정: bias=월평균, scale=목표sd(12)/raw sd ──
  function calibrate(pick: (d: any) => Sig[]) {
    const gs = days.map((d) => grandAvg(pick(d)))
    const valid = gs.filter((x): x is number => x != null)
    const st = stats(valid)
    const scale = st.sd > 0.01 ? 12 / st.sd : 16
    return gs.map((g) => g == null ? 50 : Math.max(0, Math.min(100, Math.round(50 + (g - st.mean) * scale))))
  }
  const sajuAxis = calibrate((d) => d.sigs.filter((s: Sig) => s.source === 'saju'))
  const astroAxisFull = calibrate((d) => d.sigs.filter((s: Sig) => s.source === 'astro'))
  const astroAxisThin = calibrate((d) => thinPerLayer(d.sigs.filter((s: Sig) => s.source === 'astro'), 3))

  function agree(a: number, b: number) { const g = Math.abs(a - b); return g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed' }

  console.log('\n[보정 후 축] (각 출처 월평균=50, sd≈12 로 자동보정)')
  console.log('날짜        사주축  점성축(full) 일치     | 점성축(top3) 일치')
  const agFull: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
  const agThin: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
  days.forEach((d, i) => {
    const aF = agree(sajuAxis[i], astroAxisFull[i]); agFull[aF]++
    const aT = agree(sajuAxis[i], astroAxisThin[i]); agThin[aT]++
    console.log(`${d.day}   ${String(sajuAxis[i]).padStart(4)}    ${String(astroAxisFull[i]).padStart(5)}    ${aF.padEnd(8)} |  ${String(astroAxisThin[i]).padStart(5)}    ${aT}`)
  })
  console.log('\n[일치 분포]  full:', agFull, '\n             top3:', agThin)
  console.log('\n비교 기준(보정 전): 점성축 16~17 고착 → 24/31 opposed')
}

main().catch((e) => { console.error(e); process.exit(1) })
