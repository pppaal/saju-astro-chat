/**
 * Dump the destiny counselor (/api/counselor/realtime) prompt for a
 * single person, mirroring how route.ts builds it.
 *
 * Run: npx tsx scripts/dumpDestinyPrompt.ts
 *
 * Astro is calculated via swisseph; in dev environments without the
 * native binding the astro half will fail and only the saju half
 * appears (same caveat as dumpCompatPrompt.ts).
 */

import { buildSajuNormalizerInput } from '../src/lib/fusion/adapters/saju'
import {
  formatSajuAsTable,
  formatDestinyTiming,
  formatDestinyAstro,
  formatSajuExtras,
} from '../src/lib/compatibility/sajuTableFormatter'

const birth = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  calendarType: 'solar' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  astroTimezone: 'Asia/Seoul',
}

const SYSTEM_PROMPT_KO = `[Birth Snapshot] 의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다.

규칙:
- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.
- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.
- snapshot에 birthTimeUnknown=true면 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true면 위치 의존 결론 금지.
- AI/모델/상담사 정체 노출 금지.
- 사주·점성 전문 용어(일간, 십성, 대운, 천을귀인, 트랜짓, 어스펙트, 하우스 등)는 최대한 쓰지 말 것. 데이터는 근거로만 읽고, 일상 언어로 자연스럽게 풀어서 답한다. 꼭 필요할 때만 짧은 괄호 설명과 함께 한 번 언급.`

const userQuestion = '올해 흐름 어때?'

async function main() {
  // Now swisseph rebuilt, run the real fortune pipeline.
  const { runFortuneWithRaw } = await import('../src/lib/fusion')
  const { saju, astro, birthTimeUnknown, birthCityUnknown } = await runFortuneWithRaw({
    birth,
    queryDate: new Date(),
  })

  const parts: string[] = ['[Birth Snapshot]']
  if (birthTimeUnknown) parts.push('# 시간 미상.')
  if (birthCityUnknown) parts.push('# 출생지 미상.')
  const ageYears = (saju as { ageYears?: number }).ageYears
  if (typeof ageYears === 'number' && Number.isFinite(ageYears)) {
    parts.push(`# 오늘 기준: 만 ${ageYears}세 (한국 ${ageYears + 1}세)`)
  }
  parts.push('')
  parts.push(formatSajuAsTable(saju.saju, '나'))
  const extrasBlock = formatSajuExtras({
    extras: (saju as { extras?: Parameters<typeof formatSajuExtras>[0]['extras'] }).extras,
    natalRelations: (saju as { natalRelations?: Parameters<typeof formatSajuExtras>[0]['natalRelations'] }).natalRelations,
  })
  if (extrasBlock) {
    parts.push('')
    parts.push(extrasBlock)
  }
  const timingBlock = formatDestinyTiming(saju)
  if (timingBlock) {
    parts.push('')
    parts.push(timingBlock)
  }
  parts.push('')
  parts.push(formatDestinyAstro(astro))

  // ── self-cross 라인 (PR #243 이후 production 추가분) ──────────
  const { formatSajuSelf } = await import('../src/lib/destiny/sajuSelfFormatter')
  const { formatAstroSelf } = await import('../src/lib/destiny/astroSelfFormatter')
  const { calculateNatalChart, toChart } = await import('../src/lib/astrology/foundation/astrologyService')

  try {
    const sajuP = (saju.saju as { pillars?: Record<string, { heavenlyStem?: { name?: string; sibsin?: string }; earthlyBranch?: { name?: string; sibsin?: string } }> }).pillars
    if (sajuP) {
      const toP = (slot?: { heavenlyStem?: { name?: string; sibsin?: string }; earthlyBranch?: { name?: string; sibsin?: string } }) => ({
        stem: slot?.heavenlyStem?.name ?? '',
        branch: slot?.earthlyBranch?.name ?? '',
        stemSibsin: slot?.heavenlyStem?.sibsin,
        branchSibsin: slot?.earthlyBranch?.sibsin,
      })
      const cur = (saju.saju as { daeWoon?: { current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number } | null } }).daeWoon?.current
      const extras = (saju as { extras?: { geokguk?: { primary?: string } | null; yongsin?: { primary?: string; type?: string; dayMasterStrength?: string; kibsin?: string } | null } | null }).extras
      const sajuSelfBlock = formatSajuSelf({
        pillars: [toP(sajuP.year), toP(sajuP.month), toP(sajuP.day), toP(sajuP.time)],
        geokguk: extras?.geokguk?.primary ?? null,
        yongsin: extras?.yongsin ?? null,
        currentDaeun: cur ? { stem: cur.heavenlyStem ?? '', branch: cur.earthlyBranch ?? '', age: cur.age } : null,
      })
      if (sajuSelfBlock) { parts.push(''); parts.push(sajuSelfBlock) }
    }
  } catch (e) { console.error('[sajuSelf]', e) }

  try {
    const [y, m, d] = birth.birthDate.split('-').map(Number)
    const [hh, mm] = birth.birthTime.split(':').map(Number)
    const natal = await calculateNatalChart({
      year: y, month: m, date: d, hour: hh, minute: mm,
      latitude: birth.latitude, longitude: birth.longitude, timeZone: birth.timezone,
    })
    const astroSelfBlock = await formatAstroSelf({
      chart: toChart(natal),
      latitude: birth.latitude, longitude: birth.longitude, timeZone: birth.timezone,
      koreanAge: typeof ageYears === 'number' ? ageYears + 1 : undefined,
      now: new Date(),
    })
    if (astroSelfBlock) { parts.push(''); parts.push(astroSelfBlock) }
  } catch (e) { console.error('[astroSelf]', e) }

  const cachedUserContext = parts.join('\n')

  const userPrompt = `이전 대화:\n(none)\n\n위 birth snapshot을 바탕으로 마지막 질문에 답하세요.\n\n질문: ${userQuestion}`

  console.log('================================================================')
  console.log('SYSTEM PROMPT')
  console.log('================================================================')
  console.log(SYSTEM_PROMPT_KO)
  console.log()
  console.log('================================================================')
  console.log('CACHED USER CONTEXT')
  console.log('================================================================')
  console.log(cachedUserContext)
  console.log()
  console.log('================================================================')
  console.log('USER PROMPT')
  console.log('================================================================')
  console.log(userPrompt)
  console.log()
  console.log('================================================================')
  console.log('STATS')
  console.log('================================================================')
  console.log(`system    : ${SYSTEM_PROMPT_KO.length} chars`)
  console.log(`cached    : ${cachedUserContext.length} chars`)
  console.log(`userPrompt: ${userPrompt.length} chars`)
  console.log(`TOTAL     : ${SYSTEM_PROMPT_KO.length + cachedUserContext.length + userPrompt.length} chars`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
