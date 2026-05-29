// 버리는 프로토타입 — 사주+점성 점수 결합 방식 (A) vs (B) 실측 비교
//   (A) 총합형: deriveScore(전체 신호)  ← 현 엔진 derivedScore
//   (B) 독립형: (deriveScore(사주) + deriveScore(점성)) / 2
// + tension(격렬도) 채널이 "강렬하지만 평범해 보이는 날"을 잡는지 확인.
// 실행:  npx tsx scripts/flow-proto.ts
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { deriveScore, type SignalForScore } from '@/lib/calendar-engine/derivers/score'

type Sig = SignalForScore & { source: string }

function tension(sigs: Sig[]) {
  let posE = 0, negE = 0, totW = 0
  for (const s of sigs) {
    const e = Math.abs(s.polarity) * s.weight
    if (s.polarity > 0) posE += e
    else if (s.polarity < 0) negE += e
    totW += s.weight
  }
  const denom = posE + negE || 1
  return {
    tension: totW ? (posE + negE) / totW : 0,       // 충돌/강도
    direction: (posE - negE) / denom,                // -1~+1 방향
  }
}

function agreement(sajuScore: number, astroScore: number) {
  const gap = Math.abs(sajuScore - astroScore)
  return gap <= 12 ? 'aligned' : gap <= 28 ? 'mixed' : 'opposed'
}

async function main() {
  const input = {
    birthDate: '1993-08-15', birthTime: '14:30', gender: 'male' as const,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  }
  const natal = await buildNatalContext(input)
  const cells = await buildCalendar(
    natal,
    { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: true },
  )

  console.log('생년월일 1993-08-15 14:30 서울 / 강약', natal.saju.strength, '/ sect', natal.astro.sect)
  console.log('='.repeat(96))
  console.log('날짜       사주 점성 |  A(총합)  B(독립)  |gap|  | 사주B 점성B  일치     | tension  dir')
  console.log('-'.repeat(96))

  const rows: any[] = []
  for (const c of cells) {
    const sigs: Sig[] = (c.signals as any[]).map((s) => ({
      layer: s.layer, polarity: s.polarity, weight: s.weight, source: s.source,
    }))
    const saju = sigs.filter((s) => s.source === 'saju')
    const astro = sigs.filter((s) => s.source === 'astro')

    // patterns=[]로 통일 → 순수 "총합 vs 평균" 차이만 분리
    const A = deriveScore(sigs, [])
    const sajuB = deriveScore(saju, [])
    const astroB = deriveScore(astro, [])
    const B = Math.round((sajuB + astroB) / 2)
    const gap = Math.abs(A - B)
    const t = tension(sigs)
    const day = c.datetime.slice(0, 10)

    rows.push({ day, nS: saju.length, nA: astro.length, A, B, gap, sajuB, astroB, agree: agreement(sajuB, astroB), ...t })
    console.log(
      `${day}  ${String(saju.length).padStart(3)} ${String(astro.length).padStart(4)} | ` +
      `${String(A).padStart(6)}  ${String(B).padStart(6)}  ${String(gap).padStart(4)}  | ` +
      `${String(sajuB).padStart(4)} ${String(astroB).padStart(5)}  ${rows[rows.length - 1].agree.padEnd(8)} | ` +
      `${t.tension.toFixed(2).padStart(6)}  ${t.direction.toFixed(2).padStart(5)}`,
    )
  }

  // ── 요약 ──
  const gaps = rows.map((r) => r.gap)
  const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const maxGap = Math.max(...gaps)
  const over3 = gaps.filter((g) => g > 3).length
  // 상관계수 A~B
  const mA = rows.reduce((a, r) => a + r.A, 0) / rows.length
  const mB = rows.reduce((a, r) => a + r.B, 0) / rows.length
  let cov = 0, vA = 0, vB = 0
  for (const r of rows) { cov += (r.A - mA) * (r.B - mB); vA += (r.A - mA) ** 2; vB += (r.B - mB) ** 2 }
  const corr = cov / (Math.sqrt(vA * vB) || 1)

  console.log('='.repeat(96))
  console.log(`[A vs B 차이]  평균 |gap| ${meanGap.toFixed(2)}  /  최대 ${maxGap}  /  gap>3인 날 ${over3}/${rows.length}  /  상관 r=${corr.toFixed(4)}`)
  console.log('\n[gap 큰 날 top5] — 결합 방식이 실제로 갈리는 날')
  for (const r of [...rows].sort((a, b) => b.gap - a.gap).slice(0, 5))
    console.log(`  ${r.day}  A=${r.A} B=${r.B} gap=${r.gap}  (사주B ${r.sajuB} / 점성B ${r.astroB}, ${r.agree})`)

  console.log('\n[tension 높은 날 top5] — "격렬한데 평범(~50)해 보이나?" 확인')
  for (const r of [...rows].sort((a, b) => b.tension - a.tension).slice(0, 5))
    console.log(`  ${r.day}  tension=${r.tension.toFixed(2)} dir=${r.direction.toFixed(2)}  →  헤드라인 A=${r.A} B=${r.B}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
