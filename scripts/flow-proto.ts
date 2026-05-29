// 프로토타입 v3 — 점성 신호 "중요도 등급(tier)" 무게 차등 (삭제 아님)
//   tier1 ×1.0(메이저) / tier2 ×0.5(중간) / tier3 ×0.15(잔결)
//   → 점성 축이 살아나는지 + 솎기(top-N) 대비 어떤지.
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { SignalLayer } from '@/lib/calendar-engine/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string }

const LAYER_WEIGHT: Record<string, number> = {
  decadal: 1.0, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5,
}

// 점성 kind → 중요도 등급 배수
const TIER: Record<string, number> = {
  // tier1 메이저
  transit: 1.0, eclipse: 1.0, lifecycle: 1.0, 'solar-return': 1.0, 'lunar-return': 1.0,
  'progressed-moon': 1.0, 'angle-contact': 1.0,
  // tier2 중간
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5,
  'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5,
  // tier3 잔결
  'planetary-hour': 0.15, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15,
  'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15, 'void-of-course': 0.15,
}
const tierMul = (kind: string) => TIER[kind] ?? 0.5

function grandAvg(sigs: Sig[], wOf: (s: Sig) => number): number | null {
  if (sigs.length === 0) return null
  const byLayer = new Map<string, { sum: number; weight: number }>()
  for (const s of sigs) {
    const w = wOf(s)
    const a = byLayer.get(s.layer) ?? { sum: 0, weight: 0 }
    a.sum += s.polarity * w; a.weight += w
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
function agree(a: number, b: number) { const g = Math.abs(a - b); return g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed' }

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

  // 등급별 신호 수 (잔결이 정말 홍수인지) — 라벨 키로(String(1.0)==="1" 버그 회피)
  const astroAll = days.flatMap((d) => d.sigs.filter((s) => s.source === 'astro'))
  const tierOf = (s: Sig) => { const m = tierMul(s.kind); return m >= 1 ? 'tier1' : m >= 0.4 ? 'tier2' : 'tier3' }
  const tierCount: Record<string, number> = { tier1: 0, tier2: 0, tier3: 0 }
  const tier1Kinds: Record<string, number> = {}
  for (const s of astroAll) {
    tierCount[tierOf(s)]++
    if (tierOf(s) === 'tier1') tier1Kinds[s.kind] = (tier1Kinds[s.kind] || 0) + 1
  }
  console.log('강약', natal.saju.strength, '/ sect', natal.astro.sect)
  console.log('\n[등급별 점성 신호 수(한달)]  tier1 ×1.0:', tierCount.tier1, '/ tier2 ×0.5:', tierCount.tier2, '/ tier3 ×0.15:', tierCount.tier3)
  console.log('  tier1 내역:', tier1Kinds)

  // 변동성 비교: FULL(균등) vs tier가중 vs top3솎기
  const pickAstro = (d: any) => d.sigs.filter((s: Sig) => s.source === 'astro')
  const pickSaju = (d: any) => d.sigs.filter((s: Sig) => s.source === 'saju')
  // tier3를 더 가파르게 (×0.03) — 잔결 강하게 억제
  const tierMul2 = (kind: string) => { const m = tierMul(kind); return m < 0.4 ? 0.03 : m }
  const cmp = [
    { name: 'astro FULL(균등)',     gs: days.map((d) => grandAvg(pickAstro(d), (s) => s.weight)) },
    { name: 'TIER ×0.15',          gs: days.map((d) => grandAvg(pickAstro(d), (s) => s.weight * tierMul(s.kind))) },
    { name: 'TIER 가파르게 ×0.03',  gs: days.map((d) => grandAvg(pickAstro(d), (s) => s.weight * tierMul2(s.kind))) },
    { name: 'TIER + top5/layer',   gs: days.map((d) => grandAvg(thinPerLayer(pickAstro(d), 5), (s) => s.weight * tierMul(s.kind))) },
    { name: 'top3/layer(등급무시)', gs: days.map((d) => grandAvg(thinPerLayer(pickAstro(d), 3), (s) => s.weight)) },
    { name: 'saju FULL',           gs: days.map((d) => grandAvg(pickSaju(d), (s) => s.weight)) },
  ]
  console.log('\n[변동성] raw grandAvg(-3~+3) 한달 — sd 클수록 축이 살아있음')
  for (const c of cmp) {
    const v = c.gs.filter((x): x is number => x != null); const st = stats(v)
    console.log(`   ${c.name.padEnd(18)} mean ${st.mean.toFixed(3)}  sd ${st.sd.toFixed(3)}  range [${st.min.toFixed(2)}, ${st.max.toFixed(2)}]`)
  }

  // 출처별 자동보정 (bias=월평균, scale=12/sd)
  function calibrate(gs: (number | null)[]) {
    const v = gs.filter((x): x is number => x != null); const st = stats(v)
    const scale = st.sd > 0.01 ? 12 / st.sd : 16
    return gs.map((g) => g == null ? 50 : Math.max(0, Math.min(100, Math.round(50 + (g - st.mean) * scale))))
  }
  const sajuAxis = calibrate(days.map((d) => grandAvg(pickSaju(d), (s) => s.weight)))
  // 최선 후보: TIER가중 + top5/layer (등급 의미 유지 + 개수 익사 차단)
  const astroAxisTier = calibrate(days.map((d) => grandAvg(thinPerLayer(pickAstro(d), 5), (s) => s.weight * tierMul(s.kind))))

  const ag: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
  console.log('\n[TIER+top5 + 출처별보정 후]  날짜       사주축  점성축  헤드라인  일치')
  days.forEach((d, i) => {
    const a = agree(sajuAxis[i], astroAxisTier[i]); ag[a]++
    const head = Math.round((sajuAxis[i] + astroAxisTier[i]) / 2)
    console.log(`  ${d.day}   ${String(sajuAxis[i]).padStart(4)}   ${String(astroAxisTier[i]).padStart(4)}     ${String(head).padStart(4)}    ${a}`)
  })
  console.log('\n[일치 분포] TIER가중:', ag)
  console.log('비교 — 보정전 균등: opposed 24/31  /  top3솎기: opposed 4/31')
  console.log('\n[확인] 이색 요소(tier3)는 삭제 안 됨 —', tierCount.tier3, '개 그대로 신호풀에 존재(상세/테마용), 점수 무게만 ×0.15')
}
main().catch((e) => { console.error(e); process.exit(1) })
