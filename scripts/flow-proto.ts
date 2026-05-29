// 프로토타입 v7 — "무슨 타이밍인가": 수렴한 날의 테마 분해
//   강한 수렴일이 love/money/career/health/growth 중 무엇이 끌고 있는지 → 타이밍의 "종류".
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string; themes: AstroThemeKey[]; tw?: Partial<Record<AstroThemeKey, number>>; name: string }
const THEMES: AstroThemeKey[] = ['love', 'money', 'career', 'health', 'growth']
const KO: Record<AstroThemeKey, string> = { love: '연애', money: '돈', career: '일', health: '건강', growth: '성장' }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = {
  transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1,
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5,
  'planetary-hour': 0.15, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15, 'void-of-course': 0.15,
}
const rankKey = (s: Sig) => s.weight * (TIER[s.kind] ?? 0.5)
function topN(sigs: Sig[], n: number): Sig[] {
  const m = new Map<string, Sig[]>(); for (const s of sigs) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) }
  const out: Sig[] = []; for (const arr of m.values()) { arr.sort((a, b) => rankKey(b) - rankKey(a)); out.push(...arr.slice(0, n)) } return out
}
function grandAvg(sigs: Sig[]): number | null {
  if (!sigs.length) return null
  const m = new Map<string, { s: number; w: number }>()
  for (const s of sigs) { const a = m.get(s.layer) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; m.set(s.layer, a) }
  let ws = 0, tw = 0; for (const [l, a] of m) { if (!a.w) continue; ws += (a.s / a.w) * (LW[l] ?? 0.5); tw += LW[l] ?? 0.5 } return tw ? ws / tw : null
}
const stats = (xs: number[]) => { const mean = xs.reduce((a, b) => a + b, 0) / xs.length; return { mean, sd: Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) } }
const pickS = (s: Sig[]) => s.filter((x) => x.source === 'saju')
const pickA = (s: Sig[]) => s.filter((x) => x.source === 'astro')
type DayRec = { day: string; sigs: Sig[] }
async function sigDays(natal: NatalContext, start: string, end: string): Promise<DayRec[]> {
  const cells = await buildCalendar(natal, { start, end, granularity: 'day' }, { includeEvidence: true })
  return cells.map((c) => ({ day: c.datetime.slice(0, 10), sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind, themes: s.themes ?? [], tw: s.themeWeights, name: s.korean ?? s.name ?? s.kind })) as Sig[] }))
}
const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))

// 테마별 방향(+길/−흉) 기여 — 그날 신호를 테마로 분해
function themeDir(sigs: Sig[]): Record<AstroThemeKey, number> {
  const t: Record<AstroThemeKey, number> = { love: 0, money: 0, career: 0, health: 0, growth: 0 }
  for (const s of sigs) for (const k of s.themes) t[k] += s.polarity * s.weight * (s.tw?.[k] ?? 1)
  return t
}

async function main() {
  const natal = await buildNatalContext({ birthDate: '1993-08-15', birthTime: '14:30', gender: 'male', latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' })
  // 고정 기준창 1회 빌드 + 보정
  const refDays = await sigDays(natal, '2026-03-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')
  const sSt = stats(refDays.map((d) => grandAvg(pickS(d.sigs))).filter((x): x is number => x != null))
  let N = 8, best = 9; for (const n of [5, 8, 12, 16]) { const sd = stats(refDays.map((d) => grandAvg(topN(pickA(d.sigs), n))).filter((x): x is number => x != null)).sd; if (Math.abs(sd - sSt.sd) < best) { best = Math.abs(sd - sSt.sd); N = n } }
  const aSt = stats(refDays.map((d) => grandAvg(topN(pickA(d.sigs), N))).filter((x): x is number => x != null))
  const cal = { sB: sSt.mean, sS: sSt.sd > 0.01 ? 12 / sSt.sd : 16, aB: aSt.mean, aS: aSt.sd > 0.01 ? 12 / aSt.sd : 16, N }
  const score = (sigs: Sig[]) => {
    const sg = grandAvg(pickS(sigs)), ag = grandAvg(topN(pickA(sigs), N))
    return { sa: sg == null ? 50 : clamp(50 + (sg - cal.sB) * cal.sS), aa: ag == null ? 50 : clamp(50 + (ag - cal.aB) * cal.aS) }
  }

  // 5월을 고정빌드에서 슬라이스 → 수렴일 찾고 → 테마 분해
  // ── 테마별 기준선(이 사람 평소) — 고정창에서 1회 ──
  const base: Record<AstroThemeKey, { mean: number; sd: number }> = {} as any
  for (const k of THEMES) { const xs = refDays.map((d) => themeDir(d.sigs)[k]); base[k] = stats(xs) }
  const Z = 1.0 // 기준선에서 이만큼(sd) 벗어나야 "그 테마 타이밍"으로 인정

  // 그날 핵심 신호 설명 (테마 안 잡힐 때)
  const describe = (sigs: Sig[]) => {
    const seen = new Set<string>(); const top: Sig[] = []
    for (const s of [...sigs].sort((a, b) => rankKey(b) - rankKey(a))) { if (seen.has(s.name)) continue; seen.add(s.name); top.push(s); if (top.length >= 3) break }
    return top.map((s) => `${s.name}(${s.polarity >= 0 ? '+' : ''}${s.polarity})`).join(', ')
  }

  const may = refDays.filter((d) => d.day.startsWith('2026-05'))
  console.log('데이터로 "무슨 타이밍" 판정 — 테마 기준선 이탈(z≥' + Z + ')이면 테마, 아니면 설명 (N=' + N + ')\n')
  console.log('날짜       사주 점성 | 판정')
  for (const d of may) {
    const { sa, aa } = score(d.sigs); const td = themeDir(d.sigs)
    const zs = THEMES.map((k) => ({ k, z: base[k].sd > 0.01 ? (td[k] - base[k].mean) / base[k].sd : 0, v: td[k] }))
      .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    const hit = zs.filter((x) => Math.abs(x.z) >= Z)
    let verdict: string
    if (hit.length) verdict = `🎯 ${hit.slice(0, 2).map((x) => `${KO[x.k]} ${x.v >= 0 ? '기회' : '주의'}(z${x.z >= 0 ? '+' : ''}${x.z.toFixed(1)})`).join(' · ')}`
    else verdict = `… 특정 테마 약함 → 설명: ${describe(d.sigs)}`
    console.log(`${d.day}  ${String(sa).padStart(3)} ${String(aa).padStart(4)} | ${verdict}`)
  }
  console.log('\n핵심: 테마가 평소보다 유난히 튀면(z≥1) "그 테마 타이밍", 아무것도 안 튀면')
  console.log('     억지 라벨 대신 그날 핵심 신호로 설명 — "데이터가 가리키면 테마, 아니면 설명".')
}
main().catch((e) => { console.error(e); process.exit(1) })
