// 프로토타입 v10 — 전 스케일 완성: 인생 챕터(대운)에 길흉 + 십신(영역) + 점성 길흉
//   대운이 용신에 맞나(길흉) + 무슨 십신운인가(영역) + 그 시기 점성 마일스톤 길흉.
// 실행:  npx tsx scripts/flow-proto.ts
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

type El = '목' | '화' | '토' | '금' | '수'
const STEM_EL: Record<string, El> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_EL: Record<string, El> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const GEN: Record<El, El> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<El, El> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
// 일간 기준 십신 + 인생영역
function sibsin(day: El, el: El): { name: string; domain: string } {
  if (el === day) return { name: '비겁', domain: '자립·경쟁·동료' }
  if (GEN[el] === day) return { name: '인성', domain: '학습·후원·성장' }
  if (GEN[day] === el) return { name: '식상', domain: '표현·재능·활동' }
  if (CTRL[day] === el) return { name: '재성', domain: '재물·연애·현실' }
  return { name: '관성', domain: '직업·명예·책임' } // CTRL[el]===day
}
// 점성 라이프사이클 + 본질 길흉
const CYCLES: { name: string; period: number; offset?: number; pol: number }[] = [
  { name: '목성회귀(확장)', period: 11.862, pol: +2 },
  { name: '토성회귀(시련·성숙)', period: 29.457, pol: -1 },
  { name: '토성스퀘어(압박)', period: 29.457 / 2, pol: -1 },
  { name: '천왕성중년반대(격변)', period: 84.02, offset: 42, pol: -1 },
  { name: '카이런회귀(치유)', period: 50.7, pol: 0 },
  { name: '노드회귀(방향재설정)', period: 18.6, pol: +1 },
]
function milestones(maxAge: number) {
  const out: { age: number; name: string; pol: number }[] = []
  for (const c of CYCLES) {
    if (c.offset) { out.push({ age: c.offset, name: c.name, pol: c.pol }); continue }
    for (let k = 1; k * c.period <= maxAge; k++) out.push({ age: +(k * c.period).toFixed(1), name: c.name, pol: c.pol })
  }
  return out
}

async function main() {
  const input = { birthDate: '1993-08-15', birthTime: '14:30', gender: 'male' as const, latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
  const natal = await buildNatalContext(input)
  const day = natal.saju.dayMaster.element as El
  const good = new Set<El>([natal.saju.yongsin.primary, natal.saju.yongsin.secondary].filter(Boolean) as El[])
  const avoid = new Set<El>(natal.saju.yongsin.avoid as El[])
  const ms = milestones(95)
  console.log(`전 스케일 완성 — 인생 챕터 길흉+영역 (일간 ${natal.saju.dayMaster.name}${day} / 용신 ${[...good].join('·')} / 기신 ${[...avoid].join('·')})\n`)
  console.log('나이      대운    오행   십신(영역)         사주길흉   점성(그 10년)                    → 챕터 판정')
  console.log('-'.repeat(118))

  for (const d of natal.saju.daeun) {
    if (d.startAge > 85) break
    const se = STEM_EL[d.stem], be = BRANCH_EL[d.branch]
    // 길흉: 천간·지지 각각 용신(+1)/기신(−1)
    let kil = 0; for (const e of [se, be]) { if (good.has(e)) kil++; if (avoid.has(e)) kil-- }
    const ss = sibsin(day, se)
    // 점성: 이 10년 안의 마일스톤 길흉 합
    const inDecade = ms.filter((m) => m.age >= d.startAge && m.age < d.startAge + 10)
    const astroPol = inDecade.reduce((a, m) => a + m.pol, 0)
    const combined = kil * 1.0 + astroPol * 0.4
    const verdict = combined >= 1.2 ? '★ 길한 시기' : combined <= -1.2 ? '▼ 시련기' : '· 보통/혼합'
    const astroStr = inDecade.length ? inDecade.map((m) => m.name.replace(/\(.*/, '') + (m.pol >= 0 ? '+' : '−')).join(' ') : '(잔잔)'
    console.log(
      `${String(d.startAge).padStart(2)}~${d.startAge + 9}세 ${d.stem}${d.branch}  ${se}${be}  ${(ss.name + ' ' + ss.domain).padEnd(16)} ` +
      `${(kil >= 0 ? '+' : '') + kil}용신  ${astroStr.padEnd(30)} ${verdict}`,
    )
  }
  console.log('\n핵심: 인생 챕터도 하루단위와 같은 2축 — 사주(대운 용신 길흉) + 점성(마일스톤 길흉) → 길흉,')
  console.log('     영역은 십신(재성=재물·연애기 / 관성=직업기 / 인성=성장기 …). 이제 시간~인생 전 스케일 동일 방식.')
}
main().catch((e) => { console.error(e); process.exit(1) })
