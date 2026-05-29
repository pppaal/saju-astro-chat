// 프로토타입 v7 — "무슨 타이밍인가": 수렴한 날의 테마 분해
//   강한 수렴일이 love/money/career/health/growth 중 무엇이 끌고 있는지 → 타이밍의 "종류".
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'

type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string; themes: AstroThemeKey[]; tw?: Partial<Record<AstroThemeKey, number>> }
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
  return cells.map((c) => ({ day: c.datetime.slice(0, 10), sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind, themes: s.themes ?? [], tw: s.themeWeights })) as Sig[] }))
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
  const may = refDays.filter((d) => d.day.startsWith('2026-05')).map((d) => {
    const { sa, aa } = score(d.sigs); const td = themeDir(d.sigs)
    const top = THEMES.map((k) => [k, td[k]] as const).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]
    return { day: d.day, sa, aa, both: Math.min(sa, aa), conv: Math.abs(sa - aa) <= 16, td, top }
  })
  console.log('"쌘 날"이 무슨 타이밍인가 — 매일 대표테마 + 수렴 (기준사주, N=' + N + ')')
  console.log('날짜       사주 점성  대표테마(방향)        수렴?')
  for (const d of may)
    console.log(`${d.day}  ${String(d.sa).padStart(3)} ${String(d.aa).padStart(4)}  ${(KO[d.top[0]] + (d.top[1] >= 0 ? ' 기회' : ' 주의')).padEnd(8)} ${d.td[d.top[0]].toFixed(1).padStart(6)}   ${d.conv ? '✔' : ''}`)

  // 가장 강한 길/흉 수렴일 + 그 테마
  const convDays = may.filter((d) => d.conv)
  const bestUp = [...convDays].sort((a, b) => (b.sa + b.aa) - (a.sa + a.aa))[0]
  const bestDn = [...convDays].sort((a, b) => (a.sa + a.aa) - (b.sa + b.aa))[0]
  const fmt = (d: any) => { const s = THEMES.map((k) => [k, d.td[k]] as const).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); return `"${KO[s[0][0]]}" 중심(${s[0][1] >= 0 ? '기회' : '주의'}) · 다음 "${KO[s[1][0]]}"` }
  console.log(`\n[가장 강한 길 수렴] ${bestUp.day} 사주${bestUp.sa}/점성${bestUp.aa} → ${fmt(bestUp)}`)
  console.log(`[가장 강한 흉 수렴] ${bestDn.day} 사주${bestDn.sa}/점성${bestDn.aa} → ${fmt(bestDn)}`)
  console.log('\n핵심: 같은 "쌘 날"도 테마로 분해 → 어떤 날은 "일" 타이밍, 어떤 날은 "연애" 타이밍.')
  console.log('     점수=언제·얼마나·길흉 / 테마=무엇 → 둘을 합쳐야 "무슨 타이밍"이 나온다.')
}
main().catch((e) => { console.error(e); process.exit(1) })
