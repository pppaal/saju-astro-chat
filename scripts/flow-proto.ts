// 프로토타입 v11 — 처음부터 끝까지 통합: 점수 → 작은기간(월/일) → 큰시간(인생)
//   1) 고정창 1회 빌드 + 출처별 보정 + 적응형 top-N (점수 토대)
//   2) 작은 기간: 한 달 일별 두 축 + 수렴 타이밍 + 테마(기준선 z) / 설명 fallback
//   3) 큰 시간: 인생 대운 챕터 길흉(용신) + 십신영역 + 드문 점성 마커
//   끝에 SUMMARY(JSON): 두 스케일 자기검증.
// 실행: FP_BIRTHDATE=.. npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { SignalLayer } from '@/lib/calendar-engine/types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'

type El = '목' | '화' | '토' | '금' | '수'
type Sig = { layer: SignalLayer; polarity: number; weight: number; source: string; kind: string; themes: AstroThemeKey[]; tw?: Partial<Record<AstroThemeKey, number>>; name: string }
const LW: Record<string, number> = { decadal: 1, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5 }
const TIER: Record<string, number> = {
  transit: 1, eclipse: 1, lifecycle: 1, 'solar-return': 1, 'lunar-return': 1, 'progressed-moon': 1, 'angle-contact': 1,
  progression: 0.5, 'solar-arc': 0.5, profection: 0.5, 'zodiacal-releasing': 0.5, 'moon-phase': 0.5, 'house-transit': 0.5, electional: 0.5,
  'planetary-hour': 0.15, asteroid: 0.15, midpoint: 0.15, harmonic: 0.15, 'fixed-star': 0.15, 'arabic-part': 0.15, draconic: 0.15, 'void-of-course': 0.15,
}
const THEMES: AstroThemeKey[] = ['love', 'money', 'career', 'health', 'growth']
const KO: Record<AstroThemeKey, string> = { love: '연애', money: '돈', career: '일', health: '건강', growth: '성장' }
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
const themeDir = (sigs: Sig[]) => { const t: Record<AstroThemeKey, number> = { love: 0, money: 0, career: 0, health: 0, growth: 0 }; for (const s of sigs) for (const k of s.themes) t[k] += s.polarity * s.weight * (s.tw?.[k] ?? 1); return t }
type DayRec = { day: string; sigs: Sig[] }
async function sigDays(natal: NatalContext, start: string, end: string): Promise<DayRec[]> {
  const cells = await buildCalendar(natal, { start, end, granularity: 'day' }, { includeEvidence: true })
  return cells.map((c) => ({ day: c.datetime.slice(0, 10), sigs: (c.signals as any[]).map((s) => ({ layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source, kind: s.kind, themes: s.themes ?? [], tw: s.themeWeights, name: s.korean ?? s.name ?? s.kind })) as Sig[] }))
}
// 명리 십신
const STEM_EL: Record<string, El> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_EL: Record<string, El> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const GEN: Record<El, El> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<El, El> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
function sibsin(day: El, el: El) {
  if (el === day) return '비겁'; if (GEN[el] === day) return '인성'; if (GEN[day] === el) return '식상'; if (CTRL[day] === el) return '재성'; return '관성'
}
const CYC = [{ n: '목성회귀', p: 11.862, pol: 2 }, { n: '토성회귀', p: 29.457, pol: -1 }, { n: '토성스퀘어', p: 14.73, pol: -1 }, { n: '천왕성중년반대', p: 0, off: 42, pol: -1 }, { n: '카이런회귀', p: 50.7, pol: 0 }, { n: '노드회귀', p: 18.6, pol: 1 }]
function milestones(maxAge: number) { const o: { age: number; n: string }[] = []; for (const c of CYC) { if (c.off) { o.push({ age: c.off, n: c.n }); continue } for (let k = 1; k * c.p <= maxAge; k++) o.push({ age: +(k * c.p).toFixed(1), n: c.n }) } return o }

async function main() {
  const E = process.env
  const input = { birthDate: E.FP_BIRTHDATE ?? '1993-08-15', birthTime: E.FP_BIRTHTIME ?? '14:30', gender: (E.FP_GENDER as 'male' | 'female') ?? 'male', latitude: Number(E.FP_LAT ?? 37.5665), longitude: Number(E.FP_LON ?? 126.978), timeZone: E.FP_TZ ?? 'Asia/Seoul' }
  const natal = await buildNatalContext(input)
  const day = natal.saju.dayMaster.element as El
  console.log(`=== 처음부터 끝까지 (${input.birthDate} ${input.birthTime}) 일간 ${natal.saju.dayMaster.name}${day} / ${natal.saju.strength} / sect ${natal.astro.sect} ===`)

  // ── 1) 점수 토대: 고정창(3~7월) 1회 빌드 + 보정 ──
  const ref = await sigDays(natal, '2026-03-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')
  const sSt = stats(ref.map((d) => grandAvg(pickS(d.sigs))).filter((x): x is number => x != null))
  let N = 8, bd = 9; for (const n of [5, 8, 12, 16]) { const sd = stats(ref.map((d) => grandAvg(topN(pickA(d.sigs), n))).filter((x): x is number => x != null)).sd; if (Math.abs(sd - sSt.sd) < bd) { bd = Math.abs(sd - sSt.sd); N = n } }
  const aSt = stats(ref.map((d) => grandAvg(topN(pickA(d.sigs), N))).filter((x): x is number => x != null))
  const cal = { sB: sSt.mean, sS: sSt.sd > 0.01 ? 12 / sSt.sd : 16, aB: aSt.mean, aS: aSt.sd > 0.01 ? 12 / aSt.sd : 16 }
  const tBase: Record<AstroThemeKey, { mean: number; sd: number }> = {} as any
  for (const k of THEMES) tBase[k] = stats(ref.map((d) => themeDir(d.sigs)[k]))
  const score = (sigs: Sig[]) => { const sg = grandAvg(pickS(sigs)), ag = grandAvg(topN(pickA(sigs), N)); return { sa: sg == null ? 50 : clamp(50 + (sg - cal.sB) * cal.sS), aa: ag == null ? 50 : clamp(50 + (ag - cal.aB) * cal.aS) } }
  console.log(`\n[1) 점수 토대] 적응형 N=${N}, 점성 raw sd ${aSt.sd.toFixed(3)} (사주 ${sSt.sd.toFixed(3)}) → 축 ${aSt.sd >= 0.03 ? '살아있음 ✅' : 'DEAD ❌'}`)

  // ── 2) 작은 기간: 5월 (고정빌드 슬라이스) ──
  const may = ref.filter((d) => d.day.startsWith('2026-05'))
  const ag: Record<string, number> = { aligned: 0, mixed: 0, opposed: 0 }
  const conv: string[] = []
  const themed: string[] = []
  for (const d of may) {
    const { sa, aa } = score(d.sigs); const g = Math.abs(sa - aa)
    ag[g <= 12 ? 'aligned' : g <= 28 ? 'mixed' : 'opposed']++
    if (g <= 16 && ((sa >= 56 && aa >= 56) || (sa <= 44 && aa <= 44))) conv.push(`${d.day}(${sa >= 50 ? '길' : '흉'} 사${sa}/점${aa})`)
    const td = themeDir(d.sigs); const z = THEMES.map((k) => ({ k, z: tBase[k].sd > 0.01 ? (td[k] - tBase[k].mean) / tBase[k].sd : 0, v: td[k] })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0]
    if (Math.abs(z.z) >= 1.3) themed.push(`${d.day}=${KO[z.k]}${z.v >= 0 ? '기회' : '주의'}`)
  }
  console.log(`[2) 작은기간 5월] 일치 ${JSON.stringify(ag)} (opposed ${(ag.opposed / may.length * 100).toFixed(0)}%)`)
  console.log(`   수렴 타이밍(${conv.length}): ${conv.join('  ') || '(없음)'}`)
  console.log(`   강한 테마일: ${themed.slice(0, 8).join('  ') || '(없음)'}`)

  // ── 3) 큰 시간: 인생 대운 챕터 ──
  const good = new Set<El>([natal.saju.yongsin.primary, natal.saju.yongsin.secondary].filter(Boolean) as El[])
  const avoid = new Set<El>(natal.saju.yongsin.avoid as El[])
  const ms = milestones(95)
  console.log(`\n[3) 큰시간 인생] 용신 ${[...good].join('·')} / 기신 ${[...avoid].join('·') || '없음'}`)
  const rows: { kil: number; v: string }[] = []
  for (const d of natal.saju.daeun) {
    if (d.startAge > 85) break
    const se = STEM_EL[d.stem], be = BRANCH_EL[d.branch]; if (!se || !be) continue
    let kil = 0; for (const e of [se, be]) { if (good.has(e)) kil++; if (avoid.has(e)) kil-- }
    const v = kil >= 2 ? '★길한시기' : kil <= -2 ? '▼시련기' : kil >= 1 ? '+다소길' : kil <= -1 ? '-다소흉' : '·보통'
    rows.push({ kil, v })
    const mk = ms.filter((m) => m.age >= d.startAge && m.age < d.startAge + 10 && ['토성회귀', '천왕성중년반대', '카이런회귀'].includes(m.n))
    console.log(`   ${String(d.startAge).padStart(2)}~${d.startAge + 9}세 ${d.stem}${d.branch}(${se}${be}) ${sibsin(day, se).padEnd(2)} ${(kil >= 0 ? '+' : '') + kil} ${v.padEnd(8)} ${mk.map((m) => '🔭' + m.n).join(' ')}`)
  }

  // ── 자기검증 ──
  const small_ok = aSt.sd >= 0.03 && ag.opposed / may.length <= 0.5 && conv.length >= 1
  const distinct = new Set(rows.map((r) => r.v)).size
  const starsOk = rows.filter((r) => r.v.includes('길한')).every((r) => r.kil > 0)
  const large_ok = distinct >= 2 && starsOk
  console.log('\n==== SUMMARY(JSON) ====')
  console.log(JSON.stringify({
    birth: input.birthDate, dayMaster: `${natal.saju.dayMaster.name}${day}`, strength: natal.saju.strength, sect: natal.astro.sect,
    small: { N, astroSd: +aSt.sd.toFixed(3), astroAlive: aSt.sd >= 0.03, opposedPct: +(ag.opposed / may.length).toFixed(2), convergenceDays: conv.length, ok: small_ok },
    large: { chapters: rows.length, distinctVerdicts: distinct, starsHaveYongsin: starsOk, ok: large_ok },
    verdict: small_ok && large_ok ? 'OK (점수~월~인생 전 스케일 정상)' : 'FAIL',
  }))
}
main().catch((e) => { console.error(e); process.exit(1) })
