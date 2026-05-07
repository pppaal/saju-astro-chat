/**
 * 운명 통합 엔진 검증 — 자평력+천기력+운명력+매트릭스 한 번에 호출.
 *
 * Run: npx tsx scripts/inspect-unified-engine.ts
 */
import { runUnifiedEngine } from '../src/lib/engine'

async function main() {
  const out = await runUnifiedEngine({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    timezone: 'Asia/Seoul',
    segment: { employment: 'employed', maritalStatus: 'single', gender: 'male' },
  })

  console.log('='.repeat(72))
  console.log(`  ${out.engine.name} v${out.engine.version}`)
  console.log(`  components: ${out.engine.components.join(' + ')}`)
  console.log('='.repeat(72))

  console.log('\n## 1. 자평력 (사주 9차원)')
  if (out.saju) {
    const p = out.saju.pillars
    console.log(`  명식: ${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.time.stem}${p.time.branch}`)
    console.log(`  강약: ${out.saju.advanced.strength.level} / 격국: ${out.saju.advanced.geokguk.type} / 용신: ${out.saju.advanced.yongsin.primary}`)
    console.log(`  대운: ${out.saju.cycles.currentDaeun?.heavenlyStem}${out.saju.cycles.currentDaeun?.earthlyBranch} (${out.saju.cycles.currentDaeun?.age}세~)`)
    console.log(`  점수: 대${out.saju.scores.daeunScore}/8 세${out.saju.scores.seunScore}/10 월${out.saju.scores.wolunScore}/7 일${out.saju.scores.iljinScore}/12`)
  }

  console.log('\n## 2. 천기력 (점성 8차원)')
  if (out.astro) {
    const b = out.astro.bigThree
    console.log(`  태양 ${b.sun.sign} (${b.sun.house}H) / 달 ${b.moon.sign} (${b.moon.house}H)`)
    console.log(`  ASC ${b.ascendant.sign} / MC ${b.mc.sign}`)
    console.log(`  4원소: 불${out.astro.elementBalance.fire}% 흙${out.astro.elementBalance.earth}% 바람${out.astro.elementBalance.air}% 물${out.astro.elementBalance.water}% (우세 ${out.astro.elementBalance.dominant})`)
    console.log(`  3양태 우세: ${out.astro.modalityBalance.dominant}`)
    console.log(`  본명 어스펙트: ${out.astro.natalAspects.length}개 / 트랜짓: ${out.astro.current.transitToNatal.length}개`)
  }

  console.log('\n## 3. 운명력 (교차)')
  if (out.cross) {
    console.log(`  axes 일치 축: ${out.cross.highlights.strongestAlignedAxis || '(없음)'}`)
    console.log(`  axes 갈등 축: ${out.cross.highlights.strongestOpposedAxis || '(없음)'}`)
    console.log(`  매트릭스: ${out.cross.matrix.length} 셀`)
    console.log(`  지금 최고: ${out.cross.highlights.bestThemeNow.theme} (${out.cross.highlights.bestThemeNow.horizon}, ${out.cross.highlights.bestThemeNow.score}/10)`)
    console.log(`  지금 최저: ${out.cross.highlights.worstThemeNow.theme} (${out.cross.highlights.worstThemeNow.horizon}, ${out.cross.highlights.worstThemeNow.score}/10)`)
  }

  console.log('\n## 4. Destiny Matrix (1206 셀)')
  if (out.matrix) {
    const s = out.matrix.summary
    console.log(`  totalScore: ${s.totalScore?.toFixed(1)} / finalScoreAdjusted: ${s.finalScoreAdjusted}`)
    console.log(`  alignmentScore: ${s.alignmentScore?.toFixed(2)} / confidence: ${s.confidenceScore?.toFixed(2)}`)
    if (s.drivers && s.drivers.length) console.log(`  drivers: ${s.drivers.join(', ')}`)
    if (s.cautions && s.cautions.length) console.log(`  cautions: ${s.cautions.join(', ')}`)
    if (s.domainScores) {
      console.log(`  domainScores:`)
      for (const [k, v] of Object.entries(s.domainScores)) {
        console.log(`    ${k}: ${v.finalScoreAdjusted?.toFixed(1)}`)
      }
    }
  }

  console.log('\n## 5. 통합 점수 (Matrix ↔ 운명력 정렬)')
  if (out.unified) {
    console.log(`  ${out.unified.scores.summary}\n`)
    console.log(`  도메인         Matrix   Cross    Blended  Grade   Alignment   Verdict`)
    console.log(`  ${'─'.repeat(110)}`)
    for (const [key, d] of Object.entries(out.unified.scores.domains)) {
      const m = d.matrixScore !== undefined ? d.matrixScore.toFixed(1).padEnd(8) : '-'.padEnd(8)
      const c = d.crossScore !== undefined ? d.crossScore.toFixed(1).padEnd(8) : '-'.padEnd(8)
      const b = d.blendedScore.toFixed(1).padEnd(8)
      const g = d.grade.padEnd(7)
      const a = d.alignment.padEnd(11)
      console.log(`  ${key.padEnd(14)} ${m} ${c} ${b} ${g} ${a} ${d.verdict}`)
    }
  }

  console.log('\n' + '='.repeat(72))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
