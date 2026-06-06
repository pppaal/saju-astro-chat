/* eslint-disable no-console */
/**
 * ① 일 고원 해결 — 정확각 일시(active.peak) 근접도로 2030-05 창에서 진짜 정점 1일.
 * ② 시 — 그 날을 hour 로 빌드해 12시진 길흉.
 * 실행: npx tsx scripts/run-refine-hour.ts
 */
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildCalendar } from '@/lib/calendar-engine'
import { computeBaseRates, signalImportance, cellSurprise } from '@/lib/calendar-engine/derivers/surprise'

const BIRTH = {
  birthDate: '1995-02-09', birthTime: '06:40', gender: 'male' as const,
  latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul', calendarType: 'solar' as const,
}
const dayNum = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000)

async function main() {
  const natal = await buildNatalContext(BIRTH)
  const rates = computeBaseRates(
    await buildCalendar(natal, { start: '2026-01-01', end: '2026-12-31', granularity: 'day' })
  )

  // ── ① 정점일 타이브레이크 ──
  const WIN_START = '2030-04-20', WIN_END = '2030-06-15'
  const cells = await buildCalendar(natal, { start: WIN_START, end: WIN_END, granularity: 'day' })

  const SIGMA = 2.5 // 일. peak 에서 며칠 벗어나면 기여가 급감하는 폭
  const refined = cells.map((c) => {
    const di = dayNum(c.datetime)
    let score = 0
    const contribs: Array<{ name: string; src: string; imp: number; pol: number; dPeak: number; eff: number }> = []
    for (const s of c.signals) {
      const imp = signalImportance(s, rates)
      if (imp <= 0) continue
      const pk = s.active?.peak ?? s.active?.start ?? c.datetime
      const delta = Math.abs(di - dayNum(pk)) // 그 날이 신호 정확피크에서 며칠?
      const eff = imp * Math.exp(-((delta / SIGMA) ** 2)) // 근접 가중
      score += eff
      contribs.push({ name: (s.korean ?? s.name ?? '').trim(), src: s.source, imp, pol: s.polarity, dPeak: delta, eff })
    }
    contribs.sort((a, b) => b.eff - a.eff)
    return { iso: c.datetime.slice(0, 10), plateau: cellSurprise(c, rates, 6).total, refined: Math.round(score * 100) / 100, contribs }
  })

  const ranked = [...refined].sort((a, b) => b.refined - a.refined)
  console.log('━'.repeat(72))
  console.log('① 일 고원 해결 — 정확각 근접 가중(σ=2.5일)으로 진짜 정점일')
  console.log('   (plateau=옛 surprise 동점값 / refined=피크근접 가중 → 변별 생김)')
  console.log('━'.repeat(72))
  console.log('   날짜          plateau   refined')
  for (const r of ranked.slice(0, 10)) {
    const mark = r === ranked[0] ? '  ◀ 정점' : ''
    console.log(`   ${r.iso}    ${String(r.plateau).padStart(6)}   ${String(r.refined).padStart(7)}${mark}`)
  }
  const peakDay = ranked[0].iso
  console.log(`\n   ▶ ${peakDay} 의 정확피크 기여 신호:`)
  for (const c of ranked[0].contribs.slice(0, 6))
    console.log(`     · ${c.name} (${c.src}, pol ${c.pol > 0 ? '+' : ''}${c.pol}, 피크에서 ${c.dPeak}일, 유효기여 ${c.eff.toFixed(2)})`)

  // ── ② 시진 ── (엔진 fix 후 date-only 단일일이 00~23시로 펼쳐짐)
  console.log('\n' + '━'.repeat(72))
  console.log(`② 시 — ${peakDay} 의 12시진 (시주 時柱 + 행성시)`)
  console.log('━'.repeat(72))
  const hourCells = await buildCalendar(
    natal,
    { start: peakDay, end: peakDay, granularity: 'hour' },
    { enabledExtractors: ['pillar-sibsin', 'planetary-hour'] as any }
  )
  const SIJIN = ['자(23-01)', '축(01-03)', '인(03-05)', '묘(05-07)', '진(07-09)', '사(09-11)',
    '오(11-13)', '미(13-15)', '신(15-17)', '유(17-19)', '술(19-21)', '해(21-23)']
  const rows = hourCells
    .filter((c) => c.datetime.slice(0, 10) === peakDay)
    .map((c) => {
      const hh = Number(c.datetime.slice(11, 13))
      // hh → 시진 index (자시 23/0 → 0, 01-02 → 축…)
      const idx = hh === 23 || hh === 0 ? 0 : Math.floor((hh + 1) / 2)
      const sj = c.signals.find((s) => /시진/.test(s.name))
      const ph = c.signals.find((s) => s.kind === 'planetary-hour')
      return { hh, idx, fav: c.derivedScore, sijin: sj ? (sj.korean ?? sj.name) : '', sjPol: sj?.polarity ?? 0, planet: ph ? (ph.korean ?? ph.name) : '' }
    })
    .sort((a, b) => a.hh - b.hh)
  console.log('   시진            시주(時柱)              길흉   행성시')
  for (const r of rows) {
    const sjShort = String(r.sijin).replace(' 시진', '')
    const mark = r.sjPol >= 2 ? '◎ 길' : r.sjPol === 1 ? '○' : r.sjPol <= -2 ? '✕ 흉' : r.sjPol === -1 ? '△' : '·'
    console.log(`   ${SIJIN[r.idx].padEnd(12)} ${sjShort.padEnd(20)} ${mark.padEnd(4)}  ${r.planet}`)
  }
  console.log('\n' + '━'.repeat(72))
}

main().catch((e) => { console.error('실패:', e); process.exit(1) })
