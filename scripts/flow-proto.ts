// 프로토타입 v13 — 최종 전체 검증: 시간 + 일/월 + 인생 올스케일, 한 스크립트.
//   같은 "사주+점성 두 축" 방식이 時→日→月→인생 전부에서 작동하는지 자기검증.
//   실행(단일): FP_BIRTHDATE=.. npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'

type El = '목' | '화' | '토' | '금' | '수'
type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string; themes: AstroThemeKey[]; tw?: Partial<Record<AstroThemeKey, number>> }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = { transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1, progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5, 'planetary-hour': 1, 'void-of-course': 0.5, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15 }
const THEMES: AstroThemeKey[] = ['love', 'money', 'career', 'health', 'growth']
const rankKey = (s: Sig) => s.weight * (TIER[s.kind] ?? 0.5)
const topN = (g: Sig[], n: number) => { const m = new Map<string, Sig[]>(); for (const s of g) { const a = m.get(s.layer) ?? []; a.push(s); m.set(s.layer, a) } const o: Sig[] = []; for (const a of m.values()) { a.sort((x, y) => rankKey(y) - rankKey(x)); o.push(...a.slice(0, n)) } return o }
function grandAvg(g: Sig[]): number | null { if (!g.length) return null; const m = new Map<string, { s: number; w: number }>(); for (const s of g) { const a = m.get(s.layer) ?? { s: 0, w: 0 }; a.s += s.polarity * s.weight; a.w += s.weight; m.set(s.layer, a) } let ws = 0, tw = 0; for (const [l, a] of m) { if (!a.w) continue; ws += (a.s / a.w) * (LW[l] ?? 0.5); tw += LW[l] ?? 0.5 } return tw ? ws / tw : null }
const stats = (xs: number[]) => { const mean = xs.reduce((a, b) => a + b, 0) / xs.length; return { mean, sd: Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) } }
const pickS = (s: Sig[]) => s.filter((x) => x.source === 'saju'); const pickA = (s: Sig[]) => s.filter((x) => x.source === 'astro')
const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))
const themeDir = (g: Sig[]) => { const t: Record<AstroThemeKey, number> = { love: 0, money: 0, career: 0, health: 0, growth: 0 }; for (const s of g) for (const k of s.themes) t[k] += s.polarity * s.weight * (s.tw?.[k] ?? 1); return t }
type Rec = { day: string; sigs: Sig[] }
const toSig = (c: any): Rec => ({ day: c.datetime, sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind, themes: s.themes ?? [], tw: s.themeWeights })) })
async function build(n: NatalContext, start: string, end: string, gran: 'day' | 'hour') { return (await buildCalendar(n, { start, end, granularity: gran }, { includeEvidence: true })).map(toSig) }
const STEM_EL: Record<string, El> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_EL: Record<string, El> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const GEN: Record<El, El> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; const CTRL: Record<El, El> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const sibsin = (d: El, e: El) => e === d ? '비겁' : GEN[e] === d ? '인성' : GEN[d] === e ? '식상' : CTRL[d] === e ? '재성' : '관성'
function calib(days: Rec[], Ns: number[]) { const sSt = stats(days.map((d) => grandAvg(pickS(d.sigs))).filter((x): x is number => x != null)); let N = Ns[0], bd = 9; for (const n of Ns) { const sd = stats(days.map((d) => grandAvg(topN(pickA(d.sigs), n))).filter((x): x is number => x != null)).sd; if (Math.abs(sd - sSt.sd) < bd) { bd = Math.abs(sd - sSt.sd); N = n } } const aSt = stats(days.map((d) => grandAvg(topN(pickA(d.sigs), N))).filter((x): x is number => x != null)); return { N, sSt, aSt, sB: sSt.mean, sS: sSt.sd > 0.01 ? 12 / sSt.sd : 16, aB: aSt.mean, aS: aSt.sd > 0.01 ? 12 / aSt.sd : 16 } }

async function main() {
  const E = process.env
  const input = { birthDate: E.FP_BIRTHDATE ?? '1993-08-15', birthTime: E.FP_BIRTHTIME ?? '14:30', gender: (E.FP_GENDER as 'male' | 'female') ?? 'male', latitude: Number(E.FP_LAT ?? 37.5665), longitude: Number(E.FP_LON ?? 126.978), timeZone: E.FP_TZ ?? 'Asia/Seoul' }
  const natal = await buildNatalContext(input); const day = natal.saju.dayMaster.element as El

  // ── 日/月 스케일: 월±2 고정빌드 보정 ──
  const dref = await build(natal, '2026-03-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z', 'day')
  const c = calib(dref, [5, 8, 12, 16])
  const sc = (g: Sig[]) => { const sg = grandAvg(pickS(g)), ag = grandAvg(topN(pickA(g), c.N)); return { sa: sg == null ? 50 : clamp(50 + (sg - c.sB) * c.sS), aa: ag == null ? 50 : clamp(50 + (ag - c.aB) * c.aS) } }
  const tBase: any = {}; for (const k of THEMES) tBase[k] = stats(dref.map((d) => themeDir(d.sigs)[k]))
  const may = dref.filter((d) => d.day.slice(0, 7) === '2026-05'); const dAg = { aligned: 0, mixed: 0, opposed: 0 }; let conv = 0; const themeSet = new Set<string>()
  for (const d of may) { const { sa, aa } = sc(d.sigs); const g = Math.abs(sa - aa); (dAg as any)[g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed']++; if (g <= 16 && ((sa >= 56 && aa >= 56) || (sa <= 44 && aa <= 44))) conv++; const td = themeDir(d.sigs); const z = THEMES.map((k) => ({ k, z: tBase[k].sd > 0.01 ? (td[k] - tBase[k].mean) / tBase[k].sd : 0 })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0]; if (Math.abs(z.z) >= 1.3) themeSet.add(z.k) }
  const dayOk = c.aSt.sd >= 0.03 && dAg.opposed / may.length <= 0.5 && conv >= 1

  // ── 時 스케일: 3일 hour빌드 보정, 타겟일 24h ──
  const href = await build(natal, '2026-05-10T00:00:00.000Z', '2026-05-12T23:59:59.999Z', 'hour')
  const hc = calib(href, [3, 5, 8])
  const hsc = (g: Sig[]) => { const sg = grandAvg(pickS(g)), ag = grandAvg(topN(pickA(g), hc.N)); return { sa: sg == null ? 50 : clamp(50 + (sg - hc.sB) * hc.sS), aa: ag == null ? 50 : clamp(50 + (ag - hc.aB) * hc.aS) } }
  const tgt = href.filter((h) => h.day.startsWith('2026-05-11')).map((h) => { const { sa, aa } = hsc(h.sigs); return Math.round((sa + aa) / 2) })
  const hSpan = tgt.length ? Math.max(...tgt) - Math.min(...tgt) : 0
  const hourOk = hc.sSt.sd >= 0.02 && hc.aSt.sd >= 0.02 && hSpan >= 5

  // ── 인생 스케일: 대운 챕터 ──
  const good = new Set<El>([natal.saju.yongsin.primary, natal.saju.yongsin.secondary].filter(Boolean) as El[]); const avoid = new Set<El>(natal.saju.yongsin.avoid as El[])
  const verds: { kil: number; v: string }[] = []
  for (const d of natal.saju.daeun) { if (d.startAge > 85) break; const se = STEM_EL[d.stem], be = BRANCH_EL[d.branch]; if (!se || !be) continue; let kil = 0; for (const e of [se, be]) { if (good.has(e)) kil++; if (avoid.has(e)) kil-- } verds.push({ kil, v: kil >= 2 ? '★' : kil <= -2 ? '▼' : kil >= 1 ? '+' : kil <= -1 ? '-' : '·' }) }
  const lifeOk = new Set(verds.map((r) => r.v)).size >= 2 && verds.filter((r) => r.v === '★').every((r) => r.kil > 0)

  const all = dayOk && hourOk && lifeOk
  console.log(JSON.stringify({
    birth: input.birthDate, dm: `${natal.saju.dayMaster.name}${day}`, str: natal.saju.strength, sect: natal.astro.sect,
    HOUR: { sajuSd: +hc.sSt.sd.toFixed(3), astroSd: +hc.aSt.sd.toFixed(3), N: hc.N, span: hSpan, ok: hourOk },
    DAY_MONTH: { N: c.N, astroSd: +c.aSt.sd.toFixed(3), opposed: +(dAg.opposed / may.length).toFixed(2), conv, themes: themeSet.size, ok: dayOk },
    LIFE: { chapters: verds.length, distinct: new Set(verds.map((r) => r.v)).size, starsOk: verds.filter((r) => r.v === '★').every((r) => r.kil > 0), ok: lifeOk },
    VERDICT: all ? '✅ ALL OK (時→日→月→인생 전 스케일)' : '❌ FAIL',
  }))
}
main().catch((e) => { console.error(String(e).slice(0, 200)); process.exit(1) })
