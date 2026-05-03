 
/**
 * Narration tone smoke test
 *
 * 본명 narration / 시기 narration / 시나리오 / 궁합 / personality 등
 * 핵심 텍스트 생성 함수들을 실제로 호출해 출력 한국어 텍스트를
 * 정합성 측면에서 검수.
 *
 * 검사 항목:
 *  - literal 조사 leakage: '이(가)' '을(를)' '와(과)' '은(는)'
 *  - register mix: 같은 출력 안에 '입니다' + '이에요/예요' 동시 출현
 *  - bare-noun period: '흐름.' / '결.' / '기운.' / '톤.' 단독 종결
 *  - 단어 반복: '흐름' 4번 이상 / '결' 4번 이상 / '분이에요' 2번
 *  - 영어 enum leak: 단어 단위로 'fire'/'water'/'wood' 등이 한국어 안에 노출
 *
 * 같은 입력으로 함수 여러 개 호출해서 카테고리별 카운트 출력.
 */

import { synthesizeExpertNarrationKo, buildSajuNarrationKo, buildTimingNarrationKo, buildStoryArcKo } from '@/lib/destiny-matrix/ai-report/sajuNarrationBridge'
import { buildPersonalityNarrationKo } from '@/lib/destiny-matrix/personality'
import { simulateScenario } from '@/lib/destiny-matrix/scenario'
import { analyzeThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'
import { calculateSajuData } from '@/lib/Saju/saju'

type Issue = { kind: string; sample: string; ctx?: string }

function findIssues(text: string, source: string): Issue[] {
  const out: Issue[] = []

  // 1) literal 조사 leakage
  const literalRe = /(이\(가\)|을\(를\)|와\(과\)|은\(는\)|이\/가|을\/를)/g
  let m: RegExpExecArray | null
  while ((m = literalRe.exec(text))) {
    const start = Math.max(0, m.index - 25)
    const end = Math.min(text.length, m.index + 25)
    out.push({ kind: 'literal-particle', sample: m[0], ctx: text.slice(start, end) })
  }

  // 2) register mix — 같은 단락 안에 둘 다
  const hasFormal = /(입니다|합니다|됩니다|있습니다|옵니다)\./g.test(text)
  const hasCasual = /(이에요|예요|돼요|어요|아요|좋아요)\./g.test(text)
  if (hasFormal && hasCasual) {
    out.push({ kind: 'register-mix', sample: '입니다 + 예요 동시 출현', ctx: source })
  }

  // 3) bare-noun period — '흐름.' '결.' '기운.' '톤.' '색.' 등 단독 종결 (한자/한글 직후)
  const bareRe = /[가-힣](흐름|결|기운|톤|색|분위기|구도|구간|구조)\.\s/g
  while ((m = bareRe.exec(text))) {
    const start = Math.max(0, m.index - 20)
    const end = Math.min(text.length, m.index + m[0].length + 20)
    out.push({ kind: 'bare-noun-period', sample: m[0].trim(), ctx: text.slice(start, end) })
  }

  // 4) 단어 반복 — 한 출력 안에 같은 키워드 4번 이상
  const repeatTargets = ['흐름', '결', '분이에요', '운이고', '기운']
  for (const tgt of repeatTargets) {
    const cnt = (text.match(new RegExp(tgt, 'g')) || []).length
    if (cnt >= 4) {
      out.push({ kind: 'word-repeat', sample: `"${tgt}" ${cnt}회`, ctx: source })
    }
  }
  // '분이에요' 2회 이상은 더 강력
  const bunCnt = (text.match(/분이에요/g) || []).length
  if (bunCnt >= 2) {
    out.push({ kind: 'bun-repeat', sample: `"분이에요" ${bunCnt}회`, ctx: source })
  }

  // 5) 영어 element/sign enum leak
  const enumRe = /\b(fire|water|wood|metal|earth|wealth|health|career|relationship|move|spirituality|personality|timing)\b/g
  while ((m = enumRe.exec(text))) {
    const start = Math.max(0, m.index - 20)
    const end = Math.min(text.length, m.index + m[0].length + 20)
    out.push({ kind: 'english-enum-leak', sample: m[0], ctx: text.slice(start, end) })
  }

  return out
}

async function main(): Promise<void> {
  const total: Issue[] = []

  // Probe 1: 본명 + 시기 + 시계열 narration
  {
    const fakeInput = {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      timezone: 'Asia/Seoul',
    } as { birthDate: string; birthTime: string; gender: 'male' | 'female'; timezone: string }
    const saju = calculateSajuData(fakeInput.birthDate, fakeInput.birthTime, fakeInput.gender, 'solar', fakeInput.timezone)
    // synthesize는 MatrixCalculationInput을 요구함 — 최소 필드만 채우고 호출
    const matrixInput = {
      sajuSnapshot: saju,
      geokguk: saju.gyeokguk?.primary,
      twelveStages: saju.twelveStages?.distribution,
      sibsinDistribution: saju.sibsin?.distribution,
      shinsalList: saju.shinsalList || [],
      relations: saju.relations || [],
      dayMasterElement: saju.dayMaster?.element,
      currentDaeunElement: saju.daeWoon?.current?.element,
      currentSaeunElement: saju.unse?.current?.element,
      currentWolunElement: saju.unse?.month?.element,
      currentIljinElement: saju.unse?.day?.element,
      planetSigns: {} as Record<string, string>,
      planetHouses: {} as Record<string, number>,
      aspects: [] as unknown[],
      currentDateIso: '2026-04-30',
    }
    const synthText = synthesizeExpertNarrationKo(matrixInput as any) || ''
    total.push(...findIssues(synthText, 'synthesizeExpertNarrationKo').map((i) => ({ ...i, ctx: i.ctx || '' })))
    console.log('--- synthesizeExpertNarrationKo (1995-02-09 0640) ---')
    console.log(synthText)
    console.log()

    const sajuText = buildSajuNarrationKo(matrixInput as any) || ''
    total.push(...findIssues(sajuText, 'buildSajuNarrationKo'))

    const timingText = buildTimingNarrationKo(matrixInput as any) || ''
    total.push(...findIssues(timingText, 'buildTimingNarrationKo'))

    const arcText = buildStoryArcKo(matrixInput as any) || ''
    total.push(...findIssues(arcText, 'buildStoryArcKo'))

    const personalityText = buildPersonalityNarrationKo(matrixInput as any) || ''
    total.push(...findIssues(personalityText, 'buildPersonalityNarrationKo'))
    console.log('--- buildPersonalityNarrationKo ---')
    console.log(personalityText)
    console.log()
  }

  // Probe 2: scenario simulator (10 actions × 3 different birthdates)
  const scenarioBirths = [
    { birthDate: '1995-02-09', birthTime: '06:40', gender: 'male' as const },
    { birthDate: '1988-12-25', birthTime: '14:20', gender: 'female' as const },
    { birthDate: '2000-06-15', birthTime: '23:50', gender: 'male' as const },
  ]
  const actions = ['careerChange', 'startBusiness', 'marriage', 'meetSomeone', 'invest'] as const
  for (const b of scenarioBirths) {
    for (const a of actions) {
      try {
        const r = simulateScenario({
          ...b,
          action: a,
          targetDate: '2026-08-15',
        } as Parameters<typeof simulateScenario>[0])
        const text = (r.summary || '') + ' ' + (r.evidence || []).join(' ')
        total.push(...findIssues(text, `scenario:${a}:${b.birthDate}`))
      } catch (e) {
        console.error(`scenario error ${a} ${b.birthDate}:`, (e as Error).message)
      }
    }
  }

  // Probe 3: 3-layer compat
  try {
    const compat = analyzeThreeLayerCompatibility(
      { birthDate: '1995-02-09', birthTime: '06:40', gender: 'male' },
      { birthDate: '1996-03-15', birthTime: '14:20', gender: 'female' },
    )
    const compatText = JSON.stringify(compat)
    total.push(...findIssues(compatText, 'analyzeThreeLayerCompatibility'))
  } catch (e) {
    console.error('compat error:', (e as Error).message)
  }

  // 집계
  console.log('\n========== ISSUE SUMMARY ==========')
  const byKind: Record<string, number> = {}
  for (const i of total) byKind[i.kind] = (byKind[i.kind] || 0) + 1
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }

  if (total.length === 0) {
    console.log('  (no issues found)')
  } else {
    console.log('\n--- 상위 30개 샘플 ---')
    total.slice(0, 30).forEach((i, idx) => {
      console.log(`${idx + 1}. [${i.kind}] ${i.sample}`)
      if (i.ctx) console.log(`   ctx: …${i.ctx}…`)
    })
  }
  process.exit(total.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
