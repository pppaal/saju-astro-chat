/**
 * 운명력 엔진 (자평력 + 천기력 교차) raw output.
 *
 * Run: npx tsx scripts/inspect-cross-engine.ts
 */
import { runMainSaju } from '../src/lib/saju-engine'
import { runAstroEngine } from '../src/lib/astro-engine'
import { runCrossEngine, THEME_LABEL, HORIZON_LABEL, type ThemeKind, type Horizon } from '../src/lib/cross-engine'

async function main() {
  const saju = runMainSaju({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    timezone: 'Asia/Seoul',
  })
  const astro = await runAstroEngine({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  })
  // 사용자 세그먼트 예시: 직장인 + 미혼
  const cross = runCrossEngine(saju, astro, {
    employment: 'employed',
    maritalStatus: 'single',
    hasChildren: false,
    gender: 'male',
  })

  console.log('='.repeat(72))
  console.log(`  ${cross.engine.name} 엔진 v${cross.engine.version} — ${cross.engine.tagline}`)
  console.log(`  (${cross.engine.tradition} · ${cross.engine.axes}축 · ${cross.engine.themes}테마 × ${cross.engine.horizons}시간축)`)
  console.log('  대상: 1995-02-09 06:40 서울 (남)')
  console.log('='.repeat(72))

  console.log('\n## 1. 5축 분석 (사주 ↔ 점성)')
  for (const [key, axis] of Object.entries(cross.axes)) {
    const tag = axis.agreement === 'aligned' ? '✓' : axis.agreement === 'opposed' ? '✗' : '~'
    console.log(`\n  [${key}] ${tag} ${axis.agreement}`)
    console.log(`    사주: ${axis.sajuSignal}`)
    console.log(`    점성: ${axis.astroSignal}`)
    console.log(`    💡 ${axis.summary}`)
  }

  console.log('\n## 2. 매트릭스 (6 테마 × 5 시간축)')
  const themes: ThemeKind[] = ['career', 'wealth', 'love', 'health', 'growth', 'family']
  const horizons: Horizon[] = ['life', 'daeun', 'seun', 'wolun', 'iljin']

  // 헤더
  const headerCols = horizons.map((h) => HORIZON_LABEL[h].padEnd(14)).join('')
  console.log(`\n  테마             ${headerCols}`)
  console.log(`  ${'─'.repeat(85)}`)
  for (const theme of themes) {
    const row = horizons.map((h) => {
      const cell = cross.matrix.find((c) => c.theme === theme && c.horizon === h)
      const score = cell?.signal.score?.toFixed(1) || '?'
      const grade = cell?.signal.grade || '?'
      return `${score}/${grade}`.padEnd(14)
    }).join('')
    console.log(`  ${THEME_LABEL[theme].padEnd(16)} ${row}`)
  }

  console.log(`\n## 3. 사용자 세그먼트: ${JSON.stringify(cross.segment)}`)

  console.log('\n## 4. 매트릭스 상세 (각 셀별 verdict + 액션)')
  for (const theme of themes) {
    console.log(`\n  ━━━ ${THEME_LABEL[theme]} (대상: ${cross.matrix.find((c) => c.theme === theme)?.signal.audience}) ━━━`)
    for (const h of horizons) {
      const cell = cross.matrix.find((c) => c.theme === theme && c.horizon === h)
      if (!cell) continue
      const s = cell.signal
      console.log(`    [${HORIZON_LABEL[h]}] ${s.score}/10 (${s.grade}) — ${s.verdict}`)
      if (s.sajuPoints.length) console.log(`       사주: ${s.sajuPoints.join(' · ')}`)
      if (s.astroPoints.length) console.log(`       점성: ${s.astroPoints.join(' · ')}`)
      if (s.actions.length) console.log(`       💡 ${s.actions.join(' / ')}`)
    }
  }

  console.log('\n## 5. 테마별 시기 매칭 (인생 정점·저점)')
  for (const theme of themes) {
    const t = cross.themeTimings[theme]
    console.log(`  ${THEME_LABEL[theme]}: ${t.recommendation}`)
  }

  console.log('\n## 6. 하이라이트')
  console.log(`  최강 일치 축: ${cross.highlights.strongestAlignedAxis || '(없음)'}`)
  console.log(`  최강 갈등 축: ${cross.highlights.strongestOpposedAxis || '(없음)'}`)
  console.log(`  지금 최고: ${THEME_LABEL[cross.highlights.bestThemeNow.theme]} (${HORIZON_LABEL[cross.highlights.bestThemeNow.horizon]}, ${cross.highlights.bestThemeNow.score}/10)`)
  console.log(`  지금 최저: ${THEME_LABEL[cross.highlights.worstThemeNow.theme]} (${HORIZON_LABEL[cross.highlights.worstThemeNow.horizon]}, ${cross.highlights.worstThemeNow.score}/10)`)

  console.log('\n' + '='.repeat(72))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
