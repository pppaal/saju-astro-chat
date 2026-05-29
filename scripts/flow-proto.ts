// 프로토타입 v9 — 인생 스케일 타이밍: 대운(사주) × 라이프사이클(점성) 수렴
//   하루 단위가 아니라 "인생 전체"를 연 단위로. 토성회귀·목성회귀·대운전환이
//   겹치는 시기 = 인생 큰 전환점.   실행: npx tsx scripts/flow-proto.ts
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

// 점성 라이프사이클 주기(년) — 표준 천문 주기
const CYCLES: { name: string; period: number; offset?: number }[] = [
  { name: '목성회귀', period: 11.862 },                 // 12,24,36...
  { name: '토성회귀', period: 29.457 },                 // 29.5, 59
  { name: '토성스퀘어/대립', period: 29.457 / 2 },       // ~7,14,22,29...
  { name: '천왕성반대(중년)', period: 84.02, offset: 42 }, // ~42
  { name: '카이런회귀', period: 50.7 },                  // ~50
  { name: '노드회귀', period: 18.6 },                    // 18.6,37,55...
]

function astroMilestones(maxAge: number) {
  const out: { age: number; name: string }[] = []
  for (const c of CYCLES) {
    if (c.offset) { if (c.offset <= maxAge) out.push({ age: c.offset, name: c.name }); continue }
    for (let k = 1; k * c.period <= maxAge; k++) out.push({ age: +(k * c.period).toFixed(1), name: c.name })
  }
  return out.sort((a, b) => a.age - b.age)
}

async function main() {
  const input = { birthDate: '1993-08-15', birthTime: '14:30', gender: 'male' as const, latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }
  const natal = await buildNatalContext(input)
  const birthYear = Number(input.birthDate.slice(0, 4))
  const MAX = 85

  // 사주 대운 전환 (실제 데이터)
  const daeun = natal.saju.daeun.map((d) => ({ age: d.startAge, year: d.startYear, gz: `${d.stem}${d.branch}` }))
  console.log('인생 타이밍 (1993-08-15생) — 사주 대운 전환 × 점성 라이프사이클\n')
  console.log('[사주 대운 전환점]', daeun.map((d) => `${d.age}세(${d.gz})`).join('  '))

  const milestones = astroMilestones(MAX)
  console.log('[점성 마일스톤]   ', milestones.map((m) => `${m.age}세 ${m.name}`).join('  '))

  // 수렴: 대운 전환이 점성 마일스톤과 ±2년 안에 겹치면 = 인생 큰 전환점
  console.log('\n[★ 인생 큰 전환점] 사주·점성이 ±2년 내 겹치는 시기')
  const pivots: { age: number; year: number; saju: string; astro: string[] }[] = []
  for (const d of daeun) {
    const near = milestones.filter((m) => Math.abs(m.age - d.age) <= 2)
    if (near.length) pivots.push({ age: d.age, year: d.year, saju: `대운 ${d.gz}`, astro: near.map((m) => m.name) })
  }
  if (!pivots.length) console.log('  (이 사람 대운 전환이 점성 마일스톤과 안 겹침 — 드물게 그럴 수 있음)')
  for (const p of pivots)
    console.log(`  ${p.age}세 (${p.year}년):  ${p.saju}  +  ${p.astro.join(', ')}  → 사주·점성 동시 전환 ★`)

  // 전 생애 타임라인 (10년 단위 줌) — 각 나이대에 무엇이 작동하나
  console.log('\n[인생 줌아웃 — 나이대별 큰 사건]')
  for (let decade = 0; decade < MAX; decade += 10) {
    const dEvents = daeun.filter((d) => d.age >= decade && d.age < decade + 10).map((d) => `대운→${d.gz}(${d.age}세)`)
    const aEvents = milestones.filter((m) => m.age >= decade && m.age < decade + 10).map((m) => `${m.name}(${m.age}세)`)
    const all = [...dEvents, ...aEvents]
    const now = 2026 - birthYear
    const tag = decade <= now && now < decade + 10 ? ' ← 지금' : ''
    console.log(`  ${decade}~${decade + 9}세:${tag}  ${all.length ? all.join(' · ') : '(큰 사건 없음, 잔잔)'}`)
  }
  console.log('\n핵심: 인생 뷰 = 10년·12년·29년짜리 큰 신호만 모아 연 단위로. 같은 "두 시스템 수렴" 방식.')
  console.log('     (월/일 뷰는 앞서 검증한 그대로, 작은 신호를 일 단위로 — 배율만 다름)')
}
main().catch((e) => { console.error(e); process.exit(1) })
